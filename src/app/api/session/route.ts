import { NextResponse } from "next/server";

import {
  ActionError,
  CONFIRM_TASKS,
  DEPOSIT_NETWORKS,
  PROXY_TOOLS,
  applyAction,
  type DepositNetwork,
  type ProxyTool,
  readSession,
  type Action,
  type ConfirmTask,
} from "@/lib/session";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NO_STORE = { "Cache-Control": "no-store" };

const ACTIONS = new Set([
  "choosePath",
  "verifyCard",
  "login",
  "setPlan",
  "openCard",
  "createDeposit",
  "setDepositNetwork",
  "confirmDeposit",
  "confirm",
  "buyProxy",
  "setProxyTool",
  "setChain",
  "markImported",
  "ipCheck",
  "skipIpCheck",
  "setSms",
  "payMax",
  "reset",
]);

const CONFIRMABLE = new Set<string>(CONFIRM_TASKS);

function parseAction(raw: unknown): Action | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== "string" || !ACTIONS.has(a.type)) return null;
  switch (a.type) {
    case "choosePath":
      return a.path === "single" || a.path === "existing"
        ? { type: "choosePath", path: a.path }
        : null;
    case "verifyCard":
      return typeof a.email === "string" && a.email.length <= 254 ? { type: "verifyCard", email: a.email } : null;
    case "login":
      return a.provider === "telegram" || a.provider === "google"
        ? { type: "login", provider: a.provider }
        : null;
    case "setPlan":
      return a.plan === "max5" || a.plan === "max20" ? { type: "setPlan", plan: a.plan } : null;
    case "confirm":
      return typeof a.task === "string" && CONFIRMABLE.has(a.task)
        ? { type: "confirm", task: a.task as ConfirmTask }
        : null;
    case "setDepositNetwork":
      return typeof a.network === "string" && (DEPOSIT_NETWORKS as readonly string[]).includes(a.network)
        ? { type: "setDepositNetwork", network: a.network as DepositNetwork }
        : null;
    case "setProxyTool":
      return typeof a.tool === "string" && (PROXY_TOOLS as readonly string[]).includes(a.tool)
        ? { type: "setProxyTool", tool: a.tool as ProxyTool }
        : null;
    case "setSms":
      return typeof a.number === "string" ? { type: "setSms", number: a.number } : null;
    case "setChain":
      return typeof a.subscription === "string"
        ? { type: "setChain", subscription: a.subscription }
        : null;
    case "ipCheck":
      return typeof a.ip === "string" && typeof a.country === "string"
        ? { type: "ipCheck", ip: a.ip, country: a.country }
        : null;
    default:
      return { type: a.type } as Action;
  }
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: "缺少有效的会话编号。" }, { status: 400, headers: NO_STORE });
  }
  try {
    return NextResponse.json({ state: await readSession(sessionId) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "暂时读不到进度。" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效的 JSON。" }, { status: 400, headers: NO_STORE });
  }
  const { sessionId, action } = (body ?? {}) as { sessionId?: unknown; action?: unknown };
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: "会话编号无效。" }, { status: 400, headers: NO_STORE });
  }
  const parsed = parseAction(action);
  if (!parsed) {
    return NextResponse.json({ error: "操作无效。" }, { status: 400, headers: NO_STORE });
  }
  try {
    const result = await applyAction(sessionId, parsed);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof ActionError ? error.message : "操作没有完成，请重试。";
    return NextResponse.json({ error: message }, { status: error instanceof ActionError ? 409 : 500, headers: NO_STORE });
  }
}
