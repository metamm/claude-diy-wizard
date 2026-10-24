import { NextResponse } from "next/server";

import { getProxyStatus } from "@/lib/proxy-price";

export async function GET() {
  return NextResponse.json(await getProxyStatus(), { headers: { "Cache-Control": "no-store" } });
}
