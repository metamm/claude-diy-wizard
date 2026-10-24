import { clashConfig, getSession } from "@/lib/session";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!SESSION_ID.test(sessionId)) return new Response("会话编号无效。", { status: 400 });
  const config = clashConfig(await getSession(sessionId));
  if (!config) return new Response("还没有购买静态 IP。", { status: 404 });
  return new Response(config, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="claude-jp.yaml"',
      "Cache-Control": "no-store",
      "profile-update-interval": "24",
    },
  });
}
