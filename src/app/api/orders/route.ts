import { NextResponse } from "next/server";

import { listOrders, recordOrder } from "@/lib/orders";
import type { StepId } from "@/lib/catalog";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isStepId(value: unknown): value is StepId {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!SESSION_ID.test(sessionId)) {
    return NextResponse.json(
      { error: "缺少有效的会话编号。" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const orders = await listOrders(sessionId);
    return NextResponse.json(
      { orders, storage: "data/orders.json", mode: "占位" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "暂时读不到占位订单。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效的 JSON。" }, { status: 400 });
  }

  const sessionId =
    body && typeof body === "object" && "sessionId" in body
      ? (body as { sessionId?: unknown }).sessionId
      : undefined;
  const step =
    body && typeof body === "object" && "step" in body
      ? (body as { step?: unknown }).step
      : undefined;

  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: "会话编号无效。" }, { status: 400 });
  }
  if (!isStepId(step)) {
    return NextResponse.json({ error: "步骤编号无效。" }, { status: 400 });
  }

  try {
    const order = await recordOrder(sessionId, step);
    return NextResponse.json(
      {
        order,
        mode: "占位",
        note: "未连接支付机构。此记录只是向导步骤的占位单，不代表 Claude 已开通。",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "占位订单没有写入。" }, { status: 500 });
  }
}
