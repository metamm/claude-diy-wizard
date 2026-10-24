export type ProxyProvider = "ipfoxy" | "onesproxy";

export type IpOffer = {
  provider: ProxyProvider;
  vendor: string;
  usd: number;
  live: boolean;
  source: string;
  updatedAt: string;
  buyUrl: string;
};

export const IPFOXY_REFERENCE_USD = 12.99;
export const ONESPROXY_USD = 4.8;

const IPFOXY_API = "https://apis.ipfoxy.com";
const TTL_MS = 10 * 60 * 1000;
let cached: { offer: IpOffer; at: number } | null = null;

export function proxyProvider(): ProxyProvider {
  return process.env.PROXY_PROVIDER?.toLowerCase() === "onesproxy" ? "onesproxy" : "ipfoxy";
}

function fallback(provider: ProxyProvider): IpOffer {
  const now = new Date().toISOString();
  return provider === "onesproxy"
    ? { provider, vendor: "OnesProxy", usd: ONESPROXY_USD, live: false, source: "OnesProxy 标价", updatedAt: now, buyUrl: "https://onesproxy.com" }
    : { provider, vendor: "IPFoxy", usd: IPFOXY_REFERENCE_USD, live: false, source: "IPFoxy 参考价", updatedAt: now, buyUrl: "https://www.ipfoxy.com/pricing/residential/" };
}

export function fallbackIpOffer() {
  return fallback(proxyProvider());
}

type Area = { id: string; ip_type: string; status: string; country_code: string; retail_price: string };

async function ipfoxyGet<T>(path: string, token: string, id: string): Promise<T> {
  const response = await fetch(`${IPFOXY_API}${path}`, {
    headers: { "api-token": token, "api-id": id },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  const body = (await response.json()) as { code?: number; data?: T };
  if (!response.ok || body.code !== 0 || body.data === undefined) throw new Error(`ipfoxy ${path}`);
  return body.data;
}

async function ipfoxyLive(token: string, id: string): Promise<IpOffer> {
  const areas = await ipfoxyGet<Area[]>("/ip/open-api/area-list", token, id);
  const jp = areas
    .filter((a) => a.country_code === "JP" && a.status === "true" && a.ip_type.startsWith("STATIC_ISP"))
    .sort((a, b) => Number(a.retail_price) - Number(b.retail_price))[0];
  if (!jp) throw new Error("ipfoxy: no JP static ISP on sale");
  const price = await ipfoxyGet<Record<string, string>>(
    `/ip/open-api/order-price?order_type=BUY&days=30&num=1&area_id=${encodeURIComponent(jp.id)}`,
    token,
    id,
  );
  const usd = Number(price["order price"] ?? price.order_price ?? jp.retail_price);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("ipfoxy: bad price");
  return {
    provider: "ipfoxy",
    vendor: "IPFoxy",
    usd,
    live: true,
    source: "IPFoxy 实时价",
    updatedAt: new Date().toISOString(),
    buyUrl: "https://www.ipfoxy.com/pricing/residential/",
  };
}

export type ProxyStatus = {
  provider: ProxyProvider;
  vendor: string;
  price: number;
  live: boolean;
  configured: boolean;
  balance: number | null;
  enough: boolean | null;
  error?: string;
};

function ipfoxyCreds() {
  const token = process.env.IPFOXY_API_TOKEN;
  const id = process.env.IPFOXY_API_ID;
  return token && id ? { token, id } : null;
}

export async function getIpfoxyBalance(): Promise<number | null> {
  const creds = ipfoxyCreds();
  if (!creds) return null;
  const info = await ipfoxyGet<Record<string, unknown>>("/ip/open-api/account-info", creds.token, creds.id);
  const balance = Number(info.total_balance ?? info.balance);
  if (!Number.isFinite(balance)) throw new Error("ipfoxy: bad balance");
  return balance;
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  const offer = await getIpOffer();
  const configured = offer.provider === "ipfoxy" && Boolean(ipfoxyCreds());
  const base = { provider: offer.provider, vendor: offer.vendor, price: offer.usd, live: offer.live, configured };
  if (!configured) return { ...base, balance: null, enough: null };
  try {
    const balance = await getIpfoxyBalance();
    return { ...base, balance, enough: balance !== null && balance >= offer.usd };
  } catch {
    return { ...base, balance: null, enough: null, error: "暂时查不到 IPFoxy 余额" };
  }
}

export async function getIpOffer(): Promise<IpOffer> {
  const provider = proxyProvider();
  if (provider === "onesproxy") return fallback(provider);
  const token = process.env.IPFOXY_API_TOKEN;
  const id = process.env.IPFOXY_API_ID;
  if (!token || !id) return fallback(provider);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.offer;
  try {
    const offer = await ipfoxyLive(token, id);
    cached = { offer, at: Date.now() };
    return offer;
  } catch {
    return cached?.offer ?? fallback(provider);
  }
}
