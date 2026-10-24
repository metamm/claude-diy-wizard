import { NextResponse } from "next/server";

type Rate = { cny: number; source: string; updatedAt: string };

const TTL_MS = 10 * 60 * 1000;
let cached: { rate: Rate; at: number } | null = null;

async function fromCoinGecko(): Promise<Rate> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cny&include_last_updated_at=true",
    { cache: "no-store", signal: AbortSignal.timeout(6000) },
  );
  const data = (await response.json()) as { tether?: { cny?: number; last_updated_at?: number } };
  const cny = data.tether?.cny;
  if (!response.ok || typeof cny !== "number") throw new Error("coingecko");
  const at = data.tether?.last_updated_at;
  return {
    cny,
    source: "CoinGecko USDT/CNY",
    updatedAt: at ? new Date(at * 1000).toISOString() : new Date().toISOString(),
  };
}

async function fromExchangeRate(): Promise<Rate> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  const data = (await response.json()) as { rates?: { CNY?: number }; time_last_update_unix?: number };
  const cny = data.rates?.CNY;
  if (!response.ok || typeof cny !== "number") throw new Error("er-api");
  return {
    cny,
    source: "USD/CNY 汇率",
    updatedAt: new Date((data.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.rate, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const rate = await fromCoinGecko().catch(fromExchangeRate);
    cached = { rate, at: Date.now() };
    return NextResponse.json(rate, { headers: { "Cache-Control": "no-store" } });
  } catch {
    if (cached) return NextResponse.json(cached.rate, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "汇率暂时取不到。" }, { status: 503 });
  }
}
