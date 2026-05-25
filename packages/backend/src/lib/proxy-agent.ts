import { ProxyAgent } from "undici";

let cachedAgent: ProxyAgent | null = null;
let cachedUrl: string | null = null;

/** 获取 HTTP(S) 代理 Agent（通过环境变量 PASSPORT_PROXY / HTTP_PROXY / HTTPS_PROXY 配置） */
export function getProxyAgent(): ProxyAgent | undefined {
  const proxyUrl = process.env.PASSPORT_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  if (!proxyUrl) {
    cachedAgent = null;
    cachedUrl = null;
    return undefined;
  }

  if (proxyUrl === cachedUrl && cachedAgent) return cachedAgent;

  cachedUrl = proxyUrl;
  cachedAgent = new ProxyAgent(proxyUrl);

  console.log("[Passport] 使用代理:", proxyUrl.replace(/\/\/.*@/, "//***@"));
  return cachedAgent;
}
