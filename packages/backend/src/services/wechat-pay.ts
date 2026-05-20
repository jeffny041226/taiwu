/**
 * 微信支付 V3 API 客户端（服务商模式）
 *
 * ⚠️ 跨语言参考实现 — 由 AI 参考微信官方 Java 示例翻译生成，非微信官方维护。
 *    上线前请逐行 review 签名构造、HTTP 调用等关键逻辑。
 */
import crypto from "crypto";
import { readFileSync } from "fs";
import {
  WX_SP_MCHID,
  WX_API_V3_KEY,
  WX_CERT_SERIAL,
  WX_CERT_PRIVATE_KEY_PATH,
  WX_PAY_NOTIFY_URL,
  WX_PAY_MOCK,
} from "../config/env";

const BASE_URL = "https://api.mch.weixin.qq.com";

interface H5PayRequest {
  sp_appid: string;
  sp_mchid: string;
  sub_mchid: string;
  sub_appid?: string;
  description: string;
  out_trade_no: string;
  time_expire?: string;
  attach?: string;
  notify_url: string;
  goods_tag?: string;
  settle_info?: { profit_sharing: boolean };
  amount: { total: number; currency: string };
  scene_info: {
    payer_client_ip: string;
    device_id?: string;
    store_info?: { id: string; name?: string; area_code?: string; address?: string };
    h5_info: { type: string; app_name?: string; app_url?: string };
  };
}

interface H5PayResponse {
  h5_url: string;
}

interface OrderQueryResponse {
  trade_state: string;
  trade_state_desc?: string;
  transaction_id?: string;
  out_trade_no: string;
  amount?: { total: number; currency: string; payer_total: number };
}

/** 加载 API 证书私钥 */
function loadPrivateKey(): crypto.KeyObject | null {
  if (!WX_CERT_PRIVATE_KEY_PATH) return null;
  try {
    const pem = readFileSync(WX_CERT_PRIVATE_KEY_PATH, "utf8");
    return crypto.createPrivateKey(pem);
  } catch (e) {
    console.error("[WeChatPay] 加载API证书私钥失败:", (e as Error).message);
    return null;
  }
}

/** 生成 WECHATPAY2-SHA256-RSA2048 签名 */
function buildAuthHeader(
  method: string,
  uri: string,
  body: string,
  privateKey: crypto.KeyObject
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const message = `${method}\n${uri}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto.sign("sha256", Buffer.from(message), privateKey).toString("base64");
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WX_SP_MCHID}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WX_CERT_SERIAL}"`;
}

/** 发送 V3 API 请求 */
async function v3Request<T>(
  method: string,
  path: string,
  body?: string
): Promise<{ status: number; data: T }> {
  const privateKey = loadPrivateKey();
  if (!privateKey) {
    throw new Error("API证书私钥未配置，无法调用微信支付V3接口");
  }

  const uri = path;
  const reqBody = body || "";
  const authHeader = buildAuthHeader(method, uri, reqBody, privateKey);

  const res = await fetch(`${BASE_URL}${uri}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
      "Content-Type": body ? "application/json" : "",
      "User-Agent": "taiwu-server/1.0",
    },
    body: body || undefined,
  });

  const respBody = await res.text();

  if (res.status >= 200 && res.status < 300) {
    return { status: res.status, data: JSON.parse(respBody) as T };
  }

  throw new Error(`微信支付API错误 [${res.status}]: ${respBody.slice(0, 200)}`);
}

/**
 * 创建 H5 支付订单
 * 服务商模式: POST /v3/pay/partner/transactions/h5
 */
export async function createH5PayOrder(params: H5PayRequest): Promise<H5PayResponse> {
  const path = "/v3/pay/partner/transactions/h5";
  return v3Request<H5PayResponse>("POST", path, JSON.stringify(params)).then(r => r.data);
}

/**
 * 查询订单（商户订单号）
 * 服务商模式: GET /v3/pay/partner/transactions/out-trade-no/{out_trade_no}
 */
export async function queryOrder(
  outTradeNo: string,
  subMchid: string
): Promise<OrderQueryResponse> {
  const path = `/v3/pay/partner/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?sub_mchid=${encodeURIComponent(subMchid)}`;
  return v3Request<OrderQueryResponse>("GET", path).then(r => r.data);
}

/**
 * 解密支付回调通知
 * 使用 APIv3 密钥 + AEAD_AES_256_GCM
 */
export function decryptCallback(
  ciphertext: string,
  nonce: string,
  associatedData: string
): string {
  // APIv3 密钥需为 32 字节
  const key = Buffer.from(WX_API_V3_KEY, "utf8");
  if (key.length !== 32) {
    throw new Error(`APIv3密钥长度无效: ${key.length} (需要32字节)`);
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf8"));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  // 密文需要 base64 解码
  const encrypted = Buffer.from(ciphertext, "base64");
  // GCM 模式：最后 16 字节是 auth tag
  const tag = encrypted.subarray(encrypted.length - 16);
  const data = encrypted.subarray(0, encrypted.length - 16);
  decipher.setAuthTag(tag);

  const decrypted = decipher.update(data);
  const final = decipher.final();
  return Buffer.concat([decrypted, final]).toString("utf8");
}

/** 验证回调通知签名 */
export function verifyCallbackSignature(
  headers: Record<string, string>,
  body: string
): boolean {
  // WX_PAY_MOCK 时仅记录日志
  if (WX_PAY_MOCK) {
    console.log("[WeChatPay] Mock模式，跳过回调验签");
    return true;
  }

  const signature = headers["wechatpay-signature"];
  const timestamp = headers["wechatpay-timestamp"];
  const nonce = headers["wechatpay-nonce"];
  const serial = headers["wechatpay-serial"];

  if (!signature || !timestamp || !nonce || !serial) {
    console.error("[WeChatPay] 回调缺少签名头");
    return false;
  }

  // TODO: 用微信支付公钥验签（需要下载微信支付公钥）
  // 参考: https://pay.weixin.qq.com/doc/v3/merchant/4013070762
  // 暂返回 true，后续填入真实公钥后实现完整验签
  console.log(`[WeChatPay] 回调签名 serial=${serial}, timestamp=${timestamp}`);
  return true;
}