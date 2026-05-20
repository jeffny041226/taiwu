import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import { memoryGetGachaChances, memoryAddGachaChances } from "../lib/memory-store";
import {
  WX_APP_ID, WX_MCH_ID, WX_PAY_MOCK,
  WX_SP_APPID, WX_SP_MCHID, WX_SUB_MCHID, WX_SUB_APPID,
  WX_PAY_NOTIFY_URL, WX_API_V3_KEY,
} from "../config/env";
import { createH5PayOrder, queryOrder, decryptCallback, verifyCallbackSignature } from "../services/wechat-pay";

export const payRouter = Router();

// 商品定义
const PRODUCTS: Record<string, { label: string; amount: number; chances: number }> = {
  "gacha_1":  { label: "抽一笼",  amount: 1,  chances: 1 },
  "gacha_5":  { label: "抽五笼",  amount: 5,  chances: 5 },
  "gacha_10": { label: "抽十笼",  amount: 10, chances: 10 },
};

// 订单存储 (生产环境应存 DB)
const orders = new Map<string, { uid: string; product: string; chances: number; paid: boolean }>();

/**
 * POST /api/pay/create — 创建微信 H5 支付订单
 * Mock 模式：直接返回 mock 订单
 * 真实模式：调用微信支付统一下单 API
 */
payRouter.post("/create", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { product } = req.body as { product: string };

  const prod = PRODUCTS[product];
  if (!prod) {
    res.status(400).json({ error: "无效的商品" });
    return;
  }

  const orderId = `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (WX_PAY_MOCK) {
    // Mock 模式 — 创建内存订单，返回 mock 标记
    orders.set(orderId, { uid, product, chances: prod.chances, paid: false });
    console.log(`[Pay] Mock 创建订单: ${orderId}, product=${product}, uid=${uid}`);
    res.json({
      success: true,
      order_id: orderId,
      mock: true,
      mweb_url: null,
    });
    return;
  }

  // 真实模式 — 调用微信统一下单
  try {
    const clientIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
    const notifyUrl = WX_PAY_NOTIFY_URL;

    const wxResult = await createH5PayOrder({
      sp_appid: WX_SP_APPID,
      sp_mchid: WX_SP_MCHID,
      sub_mchid: WX_SUB_MCHID,
      sub_appid: WX_SUB_APPID || undefined,
      description: prod.label,
      out_trade_no: orderId,
      notify_url: notifyUrl,
      amount: { total: prod.amount * 100, currency: "CNY" },
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: { type: "Wap", app_name: "斗蛐蛐", app_url: "https://taiwu.example.com" },
      },
    });

    // 保存订单
    orders.set(orderId, { uid, product, chances: prod.chances, paid: false });
    console.log(`[Pay] 微信H5下单成功: ${orderId}, h5_url=${wxResult.h5_url.slice(0, 60)}...`);

    res.json({
      success: true,
      order_id: orderId,
      mock: false,
      mweb_url: wxResult.h5_url,
    });
  } catch (e: any) {
    console.error("[Pay] 微信下单失败:", e.message);
    res.status(500).json({ error: "支付服务暂不可用" });
  }
});

/**
 * POST /api/pay/confirm — 支付确认（mock 模式专用）
 */
payRouter.post("/confirm", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { order_id } = req.body as { order_id: string };

  if (!WX_PAY_MOCK) {
    res.status(400).json({ error: "非 mock 模式" });
    return;
  }

  const order = orders.get(order_id);
  if (!order) {
    res.status(404).json({ error: "订单不存在" });
    return;
  }

  if (order.uid !== uid) {
    res.status(403).json({ error: "订单不属于你" });
    return;
  }

  if (order.paid) {
    res.json({ success: true, chances: order.chances, dup: true });
    return;
  }

  const newChances = await addGachaChances(uid, order.chances);
  order.paid = true;

  console.log(`[Pay] Mock 支付确认 uid=${uid} product=${order.product} +${order.chances}次`);

  res.json({ success: true, chances: newChances });
});

/**
 * POST /api/pay/notify — 微信支付结果回调
 * Mock 模式：仅记录日志
 * 真实模式：验签 → 解密 → 更新订单
 */
payRouter.post("/notify", async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  console.log(`[Pay] 微信回调:`, rawBody.slice(0, 300));

  if (WX_PAY_MOCK) {
    res.set("Content-Type", "application/json");
    res.json({ code: "SUCCESS", message: "成功" });
    return;
  }

  // 真实模式：验签 + 解密
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
  }

  if (!verifyCallbackSignature(headers, rawBody)) {
    res.status(401).json({ code: "FAIL", message: "签名验证失败" });
    return;
  }

  try {
    const body = req.body as {
      resource?: { ciphertext: string; nonce: string; associated_data: string };
    };
    const resource = body?.resource;
    if (!resource) {
      res.status(400).json({ code: "FAIL", message: "无效的回调数据" });
      return;
    }

    const plaintext = decryptCallback(resource.ciphertext, resource.nonce, resource.associated_data);
    const payResult = JSON.parse(plaintext);
    const outTradeNo = payResult.out_trade_no;

    if (outTradeNo && payResult.trade_state === "SUCCESS") {
      const order = orders.get(outTradeNo);
      if (order && !order.paid) {
        const newChances = await addGachaChances(order.uid, order.chances);
        order.paid = true;
        console.log(`[Pay] 回调确认支付成功: ${outTradeNo}, uid=${order.uid}, +${order.chances}次, total=${newChances}`);
      }
    }
  } catch (e: any) {
    console.error("[Pay] 回调处理失败:", e.message);
  }

  res.set("Content-Type", "application/json");
  res.json({ code: "SUCCESS", message: "成功" });
});

/**
 * GET /api/pay/status?order_id=xxx — 查询支付状态
 */
payRouter.get("/status", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { order_id } = req.query as { order_id?: string };

  if (!order_id) {
    res.status(400).json({ error: "缺少 order_id" });
    return;
  }

  if (WX_PAY_MOCK) {
    const order = orders.get(order_id);
    if (!order) { res.status(404).json({ error: "订单不存在" }); return; }
    res.json({ paid: order.paid, chances: order.paid ? order.chances : 0 });
    return;
  }

  // 真实模式 — 查微信订单状态
  try {
    const wxOrder = await queryOrder(order_id, WX_SUB_MCHID || WX_MCH_ID);
    const isPaid = wxOrder.trade_state === "SUCCESS";

    if (isPaid) {
      // 首次查到已支付 → 加次数
      const order = orders.get(order_id);
      if (order && !order.paid && order.uid === uid) {
        const newChances = await addGachaChances(uid, order.chances);
        order.paid = true;
        console.log(`[Pay] 查单确认支付成功: ${order_id}, +${order.chances}次`);
        res.json({ paid: true, chances: newChances });
        return;
      }
      res.json({ paid: true, chances: order?.chances || 0 });
    } else {
      res.json({ paid: false, chances: 0 });
    }
  } catch (e: any) {
    console.error("[Pay] 查单失败:", e.message);
    res.json({ paid: false, chances: 0 });
  }
});

/**
 * GET /api/pay/chances — 获取当前抽奖次数
 */
payRouter.get("/chances", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("users").select("gacha_chances").eq("uid", uid).single();
    if (data) {
      res.json({ chances: data.gacha_chances || 0 });
      return;
    }
    // Supabase 用户不存在 → 回退到内存
  }
  res.json({ chances: memoryGetGachaChances(uid) });
});

// ── 辅助 ──

async function addGachaChances(uid: string, delta: number): Promise<number> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("users")
      .select("gacha_chances")
      .eq("uid", uid)
      .single();

    if (error || !data) {
      // Supabase 用户不存在 → 回退到内存存储
      return memoryAddGachaChances(uid, delta);
    }

    const updated = (data.gacha_chances || 0) + delta;
    await sb.from("users").update({ gacha_chances: updated }).eq("uid", uid);
    return updated;
  }

  return memoryAddGachaChances(uid, delta);
}