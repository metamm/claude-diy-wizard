import type { StepId } from "@/lib/catalog";
import { listOrders, recordOrder } from "@/lib/orders";
import { fallbackIpOffer } from "@/lib/proxy-price";
import { ActionError, applyAction, readSession, type Action } from "@/lib/session";

export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function usdCny() {
  try {
    const r = await fetchRaw("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    const d = (await r.json()) as { rates?: { CNY?: number }; time_last_update_unix?: number };
    if (typeof d.rates?.CNY !== "number") throw new Error("rate");
    return json({
      cny: d.rates.CNY,
      source: "USD/CNY 汇率",
      updatedAt: new Date((d.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString(),
    });
  } catch {
    return json({ error: "汇率暂时取不到。" }, 503);
  }
}

async function handle(url: URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const sessionId = url.searchParams.get("sessionId") ?? String(body.sessionId ?? "");

  if (url.pathname.endsWith("/api/session")) {
    if (method === "GET") return json({ state: await readSession(sessionId) });
    try {
      return json(await applyAction(sessionId, body.action as Action));
    } catch (error) {
      return json({ error: error instanceof ActionError ? error.message : "操作没有完成，请重试。" }, 409);
    }
  }
  if (url.pathname.endsWith("/api/orders")) {
    if (method === "GET") return json({ orders: await listOrders(sessionId), mode: "占位" });
    return json({ order: await recordOrder(sessionId, body.step as StepId), mode: "占位" }, 201);
  }
  if (url.pathname.endsWith("/api/rate")) return usdCny();
  if (url.pathname.endsWith("/api/proxy/status")) {
    const offer = fallbackIpOffer();
    return json({ provider: offer.provider, vendor: offer.vendor, price: offer.usd, live: false, configured: false, balance: null, enough: null });
  }
  return json({ error: "静态演示版不支持这个接口。" }, 404);
}

let fetchRaw: typeof fetch = (...args) => fetch(...args);

if (STATIC_EXPORT && typeof window !== "undefined") {
  const original = window.fetch.bind(window);
  fetchRaw = original;
  window.fetch = (input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.origin === window.location.origin && url.pathname.includes("/api/")) return handle(url, init);
    return original(input, init);
  };
}
