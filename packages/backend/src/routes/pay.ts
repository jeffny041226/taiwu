import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import { memoryGetGachaChances, memoryAddGachaChances } from "../lib/memory-store";
import { WX_APP_ID, WX_MCH_ID, WX_API_KEY, WX_NOTIFY_URL, WX_PAY_MOCK } from "../config/env";

export const payRouter = Router();

// 商品定义
const PRODUCTS: Record<string, { label: string; amount: number; chances: number }> = {
  "gacha_1":  { label: "抽一笼",  amount: 1,  chances: 1 },
  "gacha_5":  { label: "抽五笼",  amount: 5,  chances: 5 },
  "gacha_10": { label: "抽十笼",  amount: 10, chances: 10 },
};

// 模拟订单存储 (生产环境应存 DB)
const mockOrders = new Map<string, { uid: string; product: string; chances: number; paid: boolean }>();

/**
 * POST /api/pay/create — 创建微信 H5 支付订单
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
    // 占位模式 — 直接成功
    mockOrders.set(orderId, { uid, product, chances: prod.chances, paid: false });

    res.json({
      success: true,
      order_id: orderId,
      mock: true,
      mweb_url: null, // 前端根据 mock 字段跳过支付
    });
    return;
  }

  // TODO: 真实微信 H5 支付 — 调用统一下单 API
  // const prepay = await wxUnifiedOrder({
  //   appid: WX_APP_ID,
  //   mch_id: WX_MCH_ID,
  //   nonce_str: ...,
  //   body: prod.label,
  //   out_trade_no: orderId,
  //   total_fee: prod.amount * 100, // 单位：分
  //   spbill_create_ip: req.ip,
  //   notify_url: WX_NOTIFY_URL,
  //   trade_type: "MWEB",
  //   scene_info: JSON.stringify({ h5_info: { type: "Wap" } }),
  // });
  // const sign = md5Sign(prepay, WX_API_KEY);

  // 占位 — 真实接入时返回 mweb_url
  res.json({
    success: true,
    order_id: orderId,
    mock: false,
    mweb_url: null, // 真实 H5 支付 URL
  });
});

/**
 * POST /api/pay/confirm — 支付确认（mock 模式专用）
 * 前端在 mock 模式下调用此接口模拟支付成功
 */
payRouter.post("/confirm", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { order_id } = req.body as { order_id: string };

  if (!WX_PAY_MOCK) {
    res.status(400).json({ error: "非 mock 模式" });
    return;
  }

  const order = mockOrders.get(order_id);
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

  // 增加抽奖次数
  const newChances = await addGachaChances(uid, order.chances);
  order.paid = true;

  console.log(`[Pay] Mock 支付确认 uid=${uid} product=${order.product} +${order.chances}次`);

  res.json({ success: true, chances: newChances });
});

/**
 * POST /api/pay/notify — 微信支付结果回调
 */
payRouter.post("/notify", (req: Request, res: Response) => {
  const xml = req.body;
  console.log(`[Pay] 微信回调:`, typeof xml === "string" ? xml.slice(0, 200) : JSON.stringify(xml).slice(0, 200));

  // TODO: 解析 XML → 验签 → 更新订单 → 增加次数

  res.set("Content-Type", "application/xml");
  res.send(`<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`);
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
    const order = mockOrders.get(order_id);
    if (!order) { res.status(404).json({ error: "订单不存在" }); return; }
    res.json({ paid: order.paid, chances: order.paid ? order.chances : 0 });
    return;
  }

  // TODO: 查询微信订单状态
  res.json({ paid: false, chances: 0 });
});

/**
 * GET /api/pay/chances — 获取当前抽奖次数
 */
payRouter.get("/chances", authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("users").select("gacha_chances").eq("uid", uid).single();
    res.json({ chances: data?.gacha_chances || 0 });
    return;
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

    if (error || !data) return 0;

    const updated = (data.gacha_chances || 0) + delta;
    await sb.from("users").update({ gacha_chances: updated }).eq("uid", uid);
    return updated;
  }

  return memoryAddGachaChances(uid, delta);
}
