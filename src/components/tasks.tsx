"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, Download, ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProxyStatus } from "@/lib/proxy-price";
import { clashConfig, type Action, type MaxPlan, type ProxyTool, type PublicState, type SubTask } from "@/lib/session";
import { STATIC_EXPORT } from "@/lib/static-api";
import { JP_NUMBER, JP_NUMBER_PLANS, JPY_PER_USD } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Act = (action: Action) => Promise<Record<string, unknown> | null>;

export function useSession(sessionId: string) {
  const [state, setState] = useState<PublicState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { state?: PublicState }) => {
        if (data.state) setState(data.state);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [sessionId]);

  const act: Act = useCallback(
    async (action) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action }),
        });
        const data = (await response.json()) as {
          state?: PublicState;
          extra?: Record<string, unknown>;
          error?: string;
        };
        if (!response.ok || !data.state) throw new Error(data.error || "操作没有完成。");
        setState(data.state);
        return data.extra ?? {};
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作没有完成。");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  return { state, act, busy, error };
}

const money = (n: number) => `$${n.toFixed(2)}`;

function CopyValue({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-foreground/25"
    >
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className={cn("block truncate text-[14px]", mono && "font-mono tracking-tight")}>{value}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
        {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
        {copied ? "已复制" : "复制"}
      </span>
    </button>
  );
}

function Primary({
  children,
  onClick,
  disabled,
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Button className="h-10 w-fit rounded-full px-5" disabled={disabled || busy} onClick={onClick}>
      {busy ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "brand" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warn" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export type TaskDef = { key: SubTask; title: string; doneText: (s: PublicState) => string };

export function TaskFlow({
  tasks,
  state,
  render,
  error,
  gate,
}: {
  tasks: TaskDef[];
  state: PublicState;
  render: (key: SubTask) => ReactNode;
  error: string;
  gate?: string;
}) {
  const firstOpen = tasks.find((t) => !state.done.includes(t.key))?.key;
  const [openKey, setOpenKey] = useState<SubTask | undefined>(firstOpen);
  const [seenFirstOpen, setSeenFirstOpen] = useState(firstOpen);
  if (seenFirstOpen !== firstOpen) {
    setSeenFirstOpen(firstOpen);
    setOpenKey(firstOpen);
  }
  const active = openKey;
  const doneCount = tasks.filter((t) => state.done.includes(t.key)).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-3.5 sm:px-7">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">跟着做，一项一项完成</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {doneCount}/{tasks.length}
        </p>
      </div>
      <ol>
        {tasks.map((task, index) => {
          const done = state.done.includes(task.key);
          const isOpen = active === task.key;
          const waiting = !done && (Boolean(gate) || task.key !== firstOpen);
          const blocker = tasks.find((t) => !state.done.includes(t.key));
          return (
            <li key={task.key} className={cn(index > 0 && "border-t border-border")}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenKey(isOpen ? undefined : task.key)}
                className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-muted/40 sm:px-7"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums",
                    done
                      ? "bg-foreground text-background"
                      : isOpen || (task.key === firstOpen && !gate)
                        ? "bg-brand text-white"
                        : "border border-foreground/25 text-foreground/70",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px]", isOpen && "font-semibold")}>{task.title}</span>
                  {done && !isOpen ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.doneText(state)}</span>
                  ) : null}
                </span>
                {done ? (
                  <Pill tone="brand">已完成</Pill>
                ) : task.key === firstOpen && !gate ? (
                  <Pill tone="brand">当前</Pill>
                ) : (
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                )}
              </button>
              {isOpen ? (
                <div className="px-6 pb-6 sm:px-7 sm:pl-16">
                  {waiting && (gate || blocker) ? (
                    <p className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand">
                      先看一遍没问题。做完「{gate ?? blocker?.title}」后，这里的按钮就能点。
                    </p>
                  ) : null}
                  <fieldset disabled={waiting} className="min-w-0">
                    {render(task.key)}
                  </fieldset>
                  {error ? (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Rate = { cny: number; source: string; updatedAt: string };

function useRate() {
  const [rate, setRate] = useState<Rate | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/rate", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Rate>) : Promise.reject(new Error())))
        .then((next) => {
          if (!alive) return;
          setRate(next);
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
    void load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  return { rate, failed };
}

function ipPriceNote(state: PublicState) {
  if (state.ipLocked) return "已按充值时的价格算进卡里";
  if (state.ip.live) return `实时价 · ${timeOf(state.ip.updatedAt)} 更新`;
  return state.ip.provider === "ipfoxy" ? "参考价 · 本地配好 API 后自动拉实时价" : "标价";
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });

export function PathSwitch({ state, act, busy }: { state: PublicState; act: Act; busy: boolean }) {
  const locked = state.done.includes("1b") || Boolean(state.tunapayEmail);
  if (locked) return null;
  const existing = state.path === "existing";
  return (
    <p className="-mt-3 text-sm text-muted-foreground">
      {existing ? "还没有 TunaPay 卡？" : "已经有 TunaPay 卡？"}
      <button
        type="button"
        disabled={busy}
        onClick={() => void act({ type: "choosePath", path: existing ? "single" : "existing" })}
        className="ml-1 font-medium text-brand underline-offset-4 hover:underline disabled:opacity-50"
      >
        {existing ? "改回单张开卡 $9.9" : "用开卡邮箱验证，不用再开"}
      </button>
    </p>
  );
}

export function Bill({ state, act, busy }: { state: PublicState; act: Act; busy: boolean }) {
  const q = state.quote;
  const { rate, failed } = useRate();
  const locked = state.done.includes("1c");
  const member = q.path === "member";
  const existing = q.path === "existing";
  const headline = existing ? q.cardTopup : q.total;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-sm text-muted-foreground">{existing ? "你的卡里至少要有" : "全程一共要准备"}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-brand tabular-nums">{money(headline)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {rate ? (
              <>
                约 ¥{Math.round(headline * rate.cny)} · 实时汇率 1 USDT = ¥{rate.cny.toFixed(2)}
                <span title={rate.source}>（{timeOf(rate.updatedAt)} 更新）</span>
              </>
            ) : failed ? (
              "实时汇率暂时取不到 · 用 USDT 支付"
            ) : (
              "正在取实时汇率… · 用 USDT 支付"
            )}
          </p>
        </div>
        <div className="flex shrink-0 self-start rounded-full border border-border bg-background p-1 text-sm whitespace-nowrap sm:self-end">
          {(["max5", "max20"] as MaxPlan[]).map((plan) => (
            <button
              key={plan}
              type="button"
              disabled={locked || busy}
              onClick={() => void act({ type: "setPlan", plan })}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors disabled:cursor-not-allowed",
                state.plan === plan ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {plan === "max5" ? "Max 5x" : "Max 20x"}
            </button>
          ))}
        </div>
      </div>
      <dl className="border-t border-border px-6 py-4 text-sm sm:px-7">
        {existing ? null : (
          <>
            <Line
              label={member ? "TunaPay 终身会员（含开卡）" : "开卡费（TunaPay 单张 AI 卡）"}
              value={money(q.cardFee)}
              strong
            />
            <div className="my-2 border-t border-dashed border-border" />
          </>
        )}
        {q.items.map((item) => (
          <Line
            key={item.label}
            label={item.label}
            hint={item.source}
            value={item.usd === 0 ? "$0.00" : money(item.usd)}
          />
        ))}
        {member ? <Line label="日本手机号（+81）" hint="会员已含" value="$0.00" /> : null}
        <Line label={existing ? "卡里要有（以上合计）" : "给卡充值（以上合计）"} value={money(q.cardTopup)} strong />
        {existing ? null : (
          <>
            <Line label="卡充值手续费 2%" hint={member ? "会员已含" : undefined} value={money(q.topupFee)} />
            <div className="my-2 border-t border-border" />
            <Line label="合计" value={money(q.total)} strong />
          </>
        )}
      </dl>
      <p className="border-t border-border bg-muted/50 px-6 py-3 text-xs text-muted-foreground sm:px-7">
        {member
          ? "会员一次付清、终身有效。用剩的余额可随时提回 USDT，每笔手续费 $3。"
          : existing
            ? `不够就先在 TunaPay 给卡充值（收 2%，约 ${money(q.topupFee)}）。另需：${JP_NUMBER.label}（${JP_NUMBER.priceNote}，${JP_NUMBER.note}）。`
            : `另需：${JP_NUMBER.label}（${JP_NUMBER.priceNote}，${JP_NUMBER.note}）。用剩的余额可随时提回 USDT，每笔手续费 $3。`}
      </p>
    </div>
  );
}

function Line({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className={cn("flex items-center gap-2", !strong && "text-muted-foreground")}>
        {label}
        {hint ? <Pill>{hint}</Pill> : null}
      </dt>
      <dd className={cn("tabular-nums", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}

const STEP1_EXISTING: TaskDef[] = [
  { key: "1a", title: "用开卡邮箱验证你的卡", doneText: (s) => `已验证 ${s.tunapayEmail ?? ""}` },
];

const STEP1_MEMBER_1B: TaskDef = {
  key: "1b",
  title: "开通会员并开 AI 卡",
  doneText: (s) => `会员已开通 · 卡号尾号 ${s.card?.number.slice(-4) ?? ""}`,
};

export function step1Tasks(state: PublicState): TaskDef[] {
  if (!state.path) return [];
  if (state.path === "existing") return STEP1_EXISTING;
  if (state.path === "member") return STEP1_TASKS.map((t) => (t.key === "1b" ? STEP1_MEMBER_1B : t));
  return STEP1_TASKS;
}

export const STEP1_TASKS: TaskDef[] = [
  { key: "1a", title: "登录", doneText: (s) => `已用 ${s.login === "google" ? "Google" : "Telegram"} 登录` },
  { key: "1b", title: "开 AI 卡（卡段已选好）", doneText: (s) => `卡号尾号 ${s.card?.number.slice(-4) ?? ""}` },
  { key: "1c", title: "充值", doneText: (s) => `卡内余额 ${money(s.balance)}` },
  { key: "1d", title: "绑卡：支付页逐格填", doneText: () => "卡号、有效期、安全码已对照" },
  { key: "1e", title: "账单地址", doneText: (s) => `${s.card?.billing.city ?? ""}, ${s.card?.billing.state ?? ""}` },
];

const PENDING = "开卡后自动生成";
const PREVIEW_CARD = {
  number: PENDING,
  expiry: PENDING,
  cvc: PENDING,
  holder: PENDING,
  billing: { line1: PENDING, city: PENDING, state: PENDING, zip: PENDING, country: PENDING },
};

const TUNAPAY_LOGIN = "https://tunapay.ai/login";

function openBeside(url: string, name = "tunapay") {
  const width = 520;
  const left = Math.max(0, window.screen.availWidth - width - 24);
  window.open(url, name, `popup,width=${width},height=800,left=${left},top=48`);
}

const LOGIN_OPTIONS = [
  { provider: "telegram", label: "Telegram 一键登录", mark: "TG", tone: "bg-[#2AABEE] text-white" },
  { provider: "google", label: "Google 一键登录", mark: "G", tone: "bg-white text-[#4285F4] ring-1 ring-border" },
] as const;

export function Step1Task({ task, state, act, busy }: { task: SubTask; state: PublicState; act: Act; busy: boolean }) {
  const [email, setEmail] = useState("");
  const member = state.path === "member";

  if (task === "1a" && state.path === "existing") {
    return state.tunapayEmail ? (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-[14px] font-medium">
          <ShieldCheck className="size-4 text-brand" />
          已找到 {state.tunapayEmail} 名下的 TunaPay 卡，尾号 {state.card?.number.slice(-4)}
        </p>
        <p className="text-xs text-muted-foreground">
          卡里至少留 {money(state.quote.cardTopup)}，后面买 IP、开 Max 都从这张卡扣。点右下角进入第 2 步。
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="你开 TunaPay 卡时用的邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-full bg-background px-4"
          />
          <Primary busy={busy} disabled={!email} onClick={() => void act({ type: "verifyCard", email })}>
            验证
          </Primary>
        </div>
        <p className="text-xs text-muted-foreground">只用来查你名下有没有 TunaPay 卡，不需要密码，也不会发验证码。</p>
      </div>
    );
  }

  if (task === "1a") {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {LOGIN_OPTIONS.map((o) => (
            <button
              key={o.provider}
              type="button"
              disabled={busy}
              onClick={() => {
                openBeside(TUNAPAY_LOGIN);
                void act({ type: "login", provider: o.provider });
              }}
              className={cn(
                "flex h-12 items-center justify-center gap-3 rounded-full border border-border bg-background text-[15px] font-medium transition-colors hover:border-foreground/30 disabled:opacity-60",
                state.login === o.provider && "border-brand",
              )}
            >
              <span className={cn("grid size-7 place-items-center rounded-full text-[11px] font-bold", o.tone)}>{o.mark}</span>
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          TunaPay 只支持这两种登录，不用注册、不用填邮箱。点了会在旁边弹出 TunaPay 登录窗口，这个页面不会关。
        </p>
      </div>
    );
  }

  if (task === "1b") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3">
          <div>
            <p className="text-[15px] font-semibold">AI 卡 · VISA · 美元</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {member
                ? "会员专属卡段 · Claude 实测可扣款 · 占用 5 个卡位中的 1 个"
                : "卡段 4242 42 · Claude 实测可扣款 · 每人限 1 张"}
            </p>
          </div>
          <Pill tone="brand">已选好</Pill>
        </div>
        {state.card ? (
          <>
            <VirtualCard state={state} />
            <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "1b" })}>
              卡已开好，去充值
            </Primary>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Primary busy={busy} onClick={() => void act({ type: "openCard" })}>
              {member ? "支付 $100 开通会员并开卡" : "支付 $9.90 开卡"}
            </Primary>
            <span className="text-xs text-muted-foreground">开卡后卡号、有效期、安全码当场生成</span>
          </div>
        )}
      </div>
    );
  }

  if (task === "1c") {
    const q = state.quote;
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <CopyValue
            label={
              q.topupFee === 0
                ? `充值金额 USDT = 卡内 ${money(q.cardTopup)}（会员免手续费）`
                : `充值金额 USDT = 卡内 ${money(q.cardTopup)} + 手续费 ${money(q.topupFee)}`
            }
            value={q.depositUsdt.toFixed(2)}
          />
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span>
              <span className="block text-[11px] text-muted-foreground">钱到哪里</span>
              <span className="block text-[14px] font-medium">你自己的 TunaPay 钱包 → 再转进卡</span>
            </span>
          </div>
        </div>
        <ul className="grid gap-1 rounded-lg bg-muted px-3 py-2 text-[13px] leading-6 text-muted-foreground">
          <li>· 收款地址是 TunaPay 给你这个账户的充值地址，钱进你自己的 TunaPay 钱包，再从钱包转进卡。真实地址以 TunaPay 充值页显示的为准。</li>
          <li>· 支持三条链：TRC20（T 开头）、ERC20 和 BEP20（0x 开头）。交易所提币时选的网络必须和你复制的地址那条链一致，选错钱到不了。</li>
          <li>· 手续费参考：TRC20 约 $1、BEP20 很低、ERC20 最贵（以太坊 Gas，可能几美元）。</li>
          <li>· 到账金额要和上面一分不差；交易所提币手续费另扣，按「到账金额」填。</li>
        </ul>
        {state.deposit && "addresses" in state.deposit ? (
          <>
            <div className="flex rounded-full border border-border bg-background p-1 text-sm self-start">
              {(
                [
                  ["trc20", "TRC20 · 波场"],
                  ["erc20", "ERC20 · 以太坊"],
                  ["bep20", "BEP20 · BSC"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  aria-pressed={state.deposit?.network === key}
                  onClick={() => void act({ type: "setDepositNetwork", network: key })}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors",
                    state.deposit?.network === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <CopyValue
              label={`收款地址（${{ trc20: "TRC20 网络", erc20: "ERC20 网络", bep20: "BEP20 网络" }[state.deposit.network]}）· 演示地址，不要真的转账`}
              value={state.deposit.addresses[state.deposit.network]}
            />
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              这是演示模式随机生成的地址，没有人能收到。真实充值请到 TunaPay 充值页复制你自己账户的地址。
            </p>
            <div className="flex items-center gap-3">
              <Primary busy={busy} onClick={() => void act({ type: "confirmDeposit" })}>
                我已转账，确认到账
              </Primary>
              <span className="text-xs text-muted-foreground">到账后自动转入卡内 {money(q.cardTopup)}</span>
            </div>
          </>
        ) : (
          <Primary busy={busy} onClick={() => void act({ type: "createDeposit" })}>
            生成我的充值地址
          </Primary>
        )}
      </div>
    );
  }

  if (task === "1d") {
    const c = state.card ?? PREVIEW_CARD;
    return (
      <div className="flex flex-col gap-4">
        <MockForm
          title="付款页长这样，照着填"
          rows={[
            { field: "Card number / 卡号", value: c.number.replace(/(\d{4})/g, "$1 ").trim() },
            { field: "Expiration (MM/YY) / 有效期", value: c.expiry },
            { field: "CVC / 安全码", value: c.cvc },
            { field: "Name on card / 持卡人", value: c.holder },
          ]}
        />
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "1d" })}>
          我已对照好，下一项
        </Primary>
      </div>
    );
  }

  if (task === "1e") {
    const b = (state.card ?? PREVIEW_CARD).billing;
    return (
      <div className="flex flex-col gap-4">
        <MockForm
          title="账单地址一栏一栏填，和卡上登记的一致"
          rows={[
            { field: "Country / 国家", value: b.country },
            { field: "Address line 1 / 地址", value: b.line1 },
            { field: "City / 城市", value: b.city },
            { field: "State / 州", value: b.state },
            { field: "ZIP / 邮编", value: b.zip },
          ]}
        />
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "1e" })}>
          我已对照好，完成第 1 步
        </Primary>
      </div>
    );
  }

  return null;
}

function VirtualCard({ state }: { state: PublicState }) {
  const c = state.card!;
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_1fr]">
      <div className="flex aspect-[1.586] flex-col justify-between rounded-2xl bg-[oklch(0.3_0.03_45)] p-5 text-[oklch(0.97_0.01_80)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tracking-wide">TUNA PAY · AI</span>
          <span className="font-semibold italic">VISA</span>
        </div>
        <div>
          <p className="font-mono text-lg tracking-widest">{c.number.replace(/(\d{4})/g, "$1 ").trim()}</p>
          <div className="mt-2 flex justify-between text-[11px] opacity-80">
            <span>{c.holder}</span>
            <span>{c.expiry}</span>
          </div>
        </div>
      </div>
      <div className="grid content-start gap-2">
        <CopyValue label="卡号" value={c.number} />
        <div className="grid grid-cols-2 gap-2">
          <CopyValue label="有效期" value={c.expiry} />
          <CopyValue label="安全码" value={c.cvc} />
        </div>
      </div>
    </div>
  );
}

function MockForm({ title, rows }: { title: string; rows: { field: string; value: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="mb-3 text-xs text-muted-foreground">{title}</p>
      <div className="grid gap-2">
        {rows.map((r) => (
          <CopyValue key={r.field} label={r.field} value={r.value} />
        ))}
      </div>
    </div>
  );
}

export const STEP2_TASKS: TaskDef[] = [
  { key: "2a", title: "用 IPFoxy 余额买日本静态 IP（已选好）", doneText: (s) => `${s.ip.vendor} · IP ${s.proxy?.ip ?? ""}` },
  { key: "2b", title: "选连接工具并安装", doneText: () => "Clash Verge 已安装" },
  { key: "2c", title: "一键导入配置", doneText: (s) => (s.chainSubscription ? "已导入（含前置线路）" : "已导入") },
  { key: "2d", title: "打开代理", doneText: () => "系统代理已开，Claude 走日本 IP" },
  { key: "2e", title: "自动检测出口 IP", doneText: () => "出口 IP 已确认" },
];

const STEP2_BITBROWSER: Partial<Record<SubTask, Pick<TaskDef, "title" | "doneText">>> = {
  "2b": { title: "选连接工具并安装", doneText: () => "BitBrowser 已安装" },
  "2c": { title: "新建窗口，填日本 IP", doneText: () => "窗口代理已检测为日本" },
  "2d": { title: "在这个窗口里打开 Claude", doneText: () => "网页端走日本 IP" },
  "2e": { title: "核对出口 IP", doneText: () => "出口 IP 已确认" },
};

function step2Tasks(state: PublicState): TaskDef[] {
  return STEP2_TASKS.map((t) => {
    if (state.path === "member" && t.key === "2a") return { ...t, title: "领取会员日本静态 IP（已选好）" };
    const alt = state.proxyTool === "bitbrowser" ? STEP2_BITBROWSER[t.key] : undefined;
    return alt ? { ...t, ...alt } : t;
  });
}

function detectOs() {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return "mac";
  return "windows";
}

const CLASH_RELEASES = "https://github.com/clash-verge-rev/clash-verge-rev/releases/latest";
const BITBROWSER = "https://www.bitbrowser.cn/";
const ENV_CHECK = "https://fuck-claude.vercel.app/zh/";

function EnvCheck({ bit }: { bit: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-medium">可选：本机环境自检</p>
        <Pill>第三方开源工具 · 结果不上传</Pill>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        出口 IP 是日本了，但浏览器和系统还会露出时区、语言、中文字体和 WebRTC 真实 IP。
        {bit ? "在 BitBrowser 的这个窗口里" : "在你平时用的浏览器里"}
        打开下面的检测页，看这些设置和日本 IP 是否一致；分数高就按页面上的清单逐项自查。分数是第三方估计，不是 Claude 的判定。
      </p>
      <div className="mt-3">
        <OpenButton href={ENV_CHECK}>打开环境自检</OpenButton>
      </div>
    </div>
  );
}

function useProxyStatus(enabled: boolean) {
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fetchStatus = useCallback(
    () =>
      fetch("/api/proxy/status", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<ProxyStatus>) : Promise.reject(new Error())))
        .then(setStatus)
        .catch(() => setStatus(null))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    if (enabled) void fetchStatus();
  }, [enabled, fetchStatus]);
  const reload = () => {
    setLoading(true);
    void fetchStatus();
  };
  return { status, loading, reload };
}

const TOOLS: { key: ProxyTool; label: string; note: string }[] = [
  { key: "clash", label: "Clash Verge", note: "推荐 · 网页和 Claude Desktop 都走日本 IP" },
  { key: "bitbrowser", label: "BitBrowser", note: "已在用指纹浏览器 · 只管网页端" },
];

function ToolSwitch({ state, act, busy }: { state: PublicState; act: Act; busy: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="用哪个工具连日本 IP">
      {TOOLS.map((t) => {
        const on = state.proxyTool === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={busy}
            onClick={() => (on ? undefined : void act({ type: "setProxyTool", tool: t.key }))}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              on ? "border-2 border-brand bg-brand-soft/60" : "border-border bg-background hover:border-foreground/25",
            )}
          >
            <span className="block text-[14px] font-semibold">{t.label}</span>
            <span className="block text-xs text-muted-foreground">{t.note}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Step2Task({ task, state, act, busy }: { task: SubTask; state: PublicState; act: Act; busy: boolean }) {
  const [os, setOs] = useState(detectOs);
  const [chainOn, setChainOn] = useState(true);
  const [sub, setSub] = useState(state.chainSubscription ?? "");
  const [check, setCheck] = useState<{ ip: string; country: string; match?: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [manualIp, setManualIp] = useState("");
  const proxyStatus = useProxyStatus(task === "2a" && !state.proxy && state.path !== "member");
  const bit = state.proxyTool === "bitbrowser";

  if (task === "2a") {
    const st = proxyStatus.status;
    const short = st?.configured && st.balance !== null && st.enough === false;
    return (
      <div className="flex flex-col gap-4">
        <a
          href={state.ip.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3 transition-colors hover:bg-brand-soft"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] font-semibold">日本 · 东京 · 静态住宅 ISP · 独享</p>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand">
              去 {state.ip.vendor} 购买
              <ExternalLink className="size-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            SOCKS5 · 30 天 · {state.ip.vendor} · {money(state.ip.usd)}（{ipPriceNote(state)}）· 售出不退不换
          </p>
          {state.ip.provider === "ipfoxy" ? (
            <p className="mt-1.5 text-xs text-brand">
              点开是 IPFoxy「独享静态住宅（Dedicated Residential）」页：Regions 选 Japan，套餐选 30day，Number 填 1。
            </p>
          ) : null}
        </a>
        {state.proxy ? null : (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-[13px]">
            <p className="font-medium">{state.ip.vendor} 只从账户余额扣款，下单页不能直接刷卡</p>
            <Steps
              items={[
                <>
                  打开 {state.ip.vendor} 登录 → 充值，用 U 卡付至少 <b>{money(state.ip.usd)}</b>（建议多留 $1–2，防价格浮动）
                </>,
                <>回到这里，余额够了再点「用 IPFoxy 余额购买」</>,
              ]}
            />
          </div>
        )}
        {state.proxy ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <CopyValue label="IP" value={state.proxy.ip} />
            <CopyValue label="端口" value={String(state.proxy.port)} />
            <CopyValue label="用户名" value={state.proxy.username} />
            <CopyValue label="密码" value={state.proxy.password} />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px]",
                short ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
              )}
              role="status"
            >
              <span>
                {proxyStatus.loading && !st
                  ? "正在查 IPFoxy 账户余额…"
                  : !st
                    ? "查不到余额状态，可以点右边刷新。"
                    : !st.configured
                      ? "演示模式：本机没配 IPFoxy API，查不到真实余额；点购买只生成演示 IP，不会真的下单。"
                      : st.balance === null
                        ? `${st.error ?? "暂时查不到 IPFoxy 余额"}，稍后刷新。`
                        : short
                          ? `IPFoxy 余额 ${money(st.balance)}，还差 ${money(st.price - st.balance)}。先充值至少 ${money(st.price)}，再回来购买。`
                          : `IPFoxy 余额 ${money(st.balance)}，够买这个 IP。`}
              </span>
              <button
                type="button"
                onClick={proxyStatus.reload}
                className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                <RefreshCw className={cn("size-3.5", proxyStatus.loading && "animate-spin")} />
                {short ? "充好了，刷新余额" : "刷新余额"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={state.ip.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
              >
                去 {state.ip.vendor} 充值 / 购买
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
              <Primary busy={busy} disabled={Boolean(short)} onClick={() => void act({ type: "buyProxy" })}>
                用 IPFoxy 余额购买 {money(state.ip.usd)}
              </Primary>
            </div>
          </>
        )}
      </div>
    );
  }

  if (task === "2b" && bit) {
    return (
      <div className="flex flex-col gap-4">
        <ToolSwitch state={state} act={act} busy={busy} />
        <Steps
          items={[
            "去 BitBrowser 官网下载 Windows / macOS 客户端并安装",
            "注册登录（免费额度够用这一个窗口）",
            "已经在用 BitBrowser 的，直接点「已安装」",
          ]}
        />
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          BitBrowser 只让浏览器窗口走日本 IP。第 4 步的 Claude Desktop 不走它；要用 Desktop 时，仍需装 Clash Verge 并打开 TUN。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <OpenButton href={BITBROWSER}>下载 BitBrowser</OpenButton>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "2b" })}>
            已安装并登录
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "2b") {
    return (
      <div className="flex flex-col gap-4">
        <ToolSwitch state={state} act={act} busy={busy} />
        <div className="flex rounded-full border border-border bg-background p-1 text-sm self-start">
          {[
            { key: "windows", label: "Windows" },
            { key: "mac", label: "macOS" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOs(o.key)}
              className={cn(
                "rounded-full px-4 py-1.5",
                os === o.key ? "bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <ol className="grid gap-2 text-[14px]">
          {(os === "windows"
            ? ["下载文件名以 _x64-setup.exe 结尾的安装包", "双击安装，一路「下一步」", "装完打开 Clash Verge"]
            : ["Apple 芯片下载 _aarch64.dmg，Intel 下载 _x64.dmg", "拖进「应用程序」", "首次打开如提示「无法验证开发者」：系统设置 → 隐私与安全性 → 仍要打开"]
          ).map((line, i) => (
            <li key={line} className="flex gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          以前装过 Clash for Windows（CFW）？它已经停更，快捷方式打不开很正常。直接装 Clash Verge Rev，装前先退出 CFW，免得抢 7890 端口。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={CLASH_RELEASES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            <Download className="size-4" />
            下载 Clash Verge（{os === "windows" ? "Windows" : "macOS"}）
          </a>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "2b" })}>
            已安装并打开
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "2c" && bit) {
    const p = state.proxy;
    return (
      <div className="flex flex-col gap-4">
        <Steps
          items={[
            "BitBrowser →「浏览器窗口」→「创建窗口」",
            "代理方式选「自定义」，代理类型选 Socks5",
            "把下面四项依次粘贴进去",
            "点「检测代理」，结果显示 JP / 日本 再点「确定」保存",
          ]}
        />
        {p ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <CopyValue label="代理主机" value={p.ip} />
            <CopyValue label="代理端口" value={String(p.port)} />
            <CopyValue label="代理账号" value={p.username} />
            <CopyValue label="代理密码" value={p.password} />
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">先完成 2a，买好后这里自动出现 IP、端口、账号、密码。</p>
        )}
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          检测不通？大陆直连日本 IP 常被干扰。BitBrowser 窗口没法再套一层机场中转，这种情况改用 Clash Verge（回到上一项切换），它能先借你的机场连过去。
        </p>
        <Primary busy={busy} onClick={() => void act({ type: "markImported" })}>
          检测显示日本，已保存窗口
        </Primary>
      </div>
    );
  }

  if (task === "2c") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const configUrl = STATIC_EXPORT
      ? `data:text/yaml;charset=utf-8,${encodeURIComponent(clashConfig(state) ?? "")}`
      : `${origin}/api/clash/${state.sessionId}`;
    const importUrl = `clash://install-config?url=${encodeURIComponent(configUrl)}&name=${encodeURIComponent("Claude 日本静态IP")}`;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-muted-foreground">这份配置的出口 = 你在 2a 刚买的日本 IP</p>
            <Pill tone="brand">已自动填好</Pill>
          </div>
          <p className="mt-1 font-mono text-[16px] font-semibold">
            {state.proxy ? `${state.proxy.ip}:${state.proxy.port}` : "先完成 2a，买好后这里自动出现"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">日本 · 东京 · 静态住宅 · SOCKS5，账号密码也已写进配置，不用你手动输</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">你的电脑</span>→
          {chainOn ? <span className="rounded-full bg-muted px-2.5 py-1">你现有的机场（只当中转）</span> : null}
          {chainOn ? "→" : null}
          <span className="rounded-full bg-brand-soft px-2.5 py-1 font-medium text-foreground">日本静态 IP</span>→
          <span className="rounded-full bg-muted px-2.5 py-1">Claude</span>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
          <input
            type="checkbox"
            checked={chainOn}
            onChange={(e) => setChainOn(e.target.checked)}
            className="mt-1 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-[14px] font-medium">我在中国大陆，要加一段中转</span>
            <span className="block text-xs text-muted-foreground">
              大陆直连日本 IP 常被干扰断线，所以先借你现有的机场连过去。机场只负责“连到日本 IP”，Claude 看到的始终是上面这个日本 IP。不在大陆就取消勾选。
            </span>
          </span>
        </label>
        {chainOn ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="中转用：粘贴你现在用的机场订阅链接"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              className="h-10 rounded-full bg-background px-4"
            />
            <Button
              variant="outline"
              className="h-10 rounded-full px-4"
              disabled={busy || !sub}
              onClick={() => void act({ type: "setChain", subscription: sub })}
            >
              {state.chainSubscription ? "已保存" : "保存"}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {STATIC_EXPORT ? null : <a
            href={importUrl}
            aria-disabled={chainOn && !state.chainSubscription}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/85",
              chainOn && !state.chainSubscription && "pointer-events-none opacity-50",
            )}
          >
            <ExternalLink className="size-4" />
            一键导入 Clash Verge
          </a>}
          <a href={configUrl} download="claude-jp.yaml" className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm hover:bg-muted">
            <Download className="size-4" />
            下载配置文件
          </a>
        </div>
        <p className="text-[13px] text-muted-foreground">
          点「一键导入」没反应：说明 Clash Verge 没装或没打开，先打开它再点；还不行就复制下面的订阅地址，在 Clash Verge →「订阅」里粘贴导入。
        </p>
        <CopyValue label="订阅地址（里面就是上面的日本 IP）" value={configUrl} />
        <Button
          variant="outline"
          className="h-10 self-start rounded-full px-4"
          disabled={busy || (chainOn && !state.chainSubscription)}
          onClick={() => void act({ type: "markImported" })}
        >
          已在 Clash 里看到「Claude 日本静态IP」
        </Button>
      </div>
    );
  }

  if (task === "2d" && bit) {
    return (
      <div className="flex flex-col gap-4">
        <Steps
          items={[
            "在 BitBrowser 里打开刚建的窗口",
            "在这个窗口里访问 claude.ai。之后注册、登录、付款都在这个窗口里做",
            "别在本机其他浏览器里登录这个 Claude 账号",
          ]}
        />
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          第 4 步要装 Claude Desktop 的话，Desktop 不走 BitBrowser，需要 Clash Verge 打开 TUN。只用网页版可以跳过第 4 步的安装，直接在窗口里测试对话。
        </p>
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "2d" })}>
          已在窗口里打开 Claude
        </Primary>
      </div>
    );
  }

  if (task === "2d") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { where: "订阅", what: "点选「Claude 日本静态IP」使其高亮" },
            { where: "设置", what: "打开「系统代理」" },
            { where: "设置", what: "打开「虚拟网卡模式（TUN）」，让 Claude Desktop 也走代理" },
          ].map((s, i) => (
            <div key={s.what} className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">
                {i + 1} · Clash Verge 左栏「{s.where}」
              </p>
              <p className="mt-1 text-[14px]">{s.what}</p>
            </div>
          ))}
        </div>
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "2d" })}>
          三个都打开了
        </Primary>
      </div>
    );
  }

  if (task === "2e" && bit) {
    const verify = async () => {
      const ip = manualIp.trim();
      const extra = await act({ type: "ipCheck", ip, country: "" });
      if (extra) setCheck({ ip, country: "", match: Boolean(extra.match) });
    };
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px]">
          在 BitBrowser 窗口里打开 <span className="font-mono">ipapi.co/json</span>，把显示的 <span className="font-mono">ip</span> 粘到下面。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="窗口里看到的出口 IP"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            className="h-10 rounded-full bg-background px-4 font-mono"
          />
          <Primary busy={busy} disabled={!manualIp.trim()} onClick={() => void verify()}>
            <ShieldCheck />
            核对
          </Primary>
        </div>
        {check ? (
          check.match ? (
            <Pill tone="brand">和买到的 IP 一致</Pill>
          ) : (
            <p className="text-sm text-destructive">
              不是 {state.proxy?.ip}。回到上一项，确认是在 BitBrowser 新建的窗口里打开的。
            </p>
          )
        ) : null}
        {state.mode === "demo" ? (
          <Button variant="ghost" className="h-10 w-fit rounded-full px-4 text-muted-foreground" onClick={() => void act({ type: "skipIpCheck" })}>
            演示模式：跳过检测
          </Button>
        ) : null}
        <EnvCheck bit />
      </div>
    );
  }

  if (task === "2e") {
    const run = async () => {
      setChecking(true);
      setCheckError("");
      try {
        const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        const data = (await r.json()) as { ip?: string; country_code?: string; country_name?: string };
        if (!data.ip) throw new Error();
        const result = { ip: data.ip, country: data.country_code ?? "" };
        const extra = await act({ type: "ipCheck", ip: result.ip, country: result.country });
        setCheck({ ...result, match: Boolean(extra?.match) });
      } catch {
        setCheckError("检测服务没连上。确认 Clash 已开，再点一次。");
      } finally {
        setChecking(false);
      }
    };
    return (
      <div className="flex flex-col gap-4">
        {check ? (
          <div
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
              check.match ? "border-brand bg-brand-soft/60" : "border-destructive/40 bg-destructive/5",
            )}
          >
            <div>
              <p className="text-[11px] text-muted-foreground">当前出口 IP</p>
              <p className="font-mono text-[15px]">
                {check.ip} · {check.country || "未知"}
              </p>
            </div>
            {check.match ? (
              <Pill tone="brand">和买到的 IP 一致</Pill>
            ) : (
              <Pill tone="warn">不是 {state.proxy?.ip}</Pill>
            )}
          </div>
        ) : null}
        {check && !check.match ? (
          <p className="text-xs text-muted-foreground">回到上一项，确认选中「日本静态IP」并打开了系统代理，然后重新检测。</p>
        ) : null}
        {checkError ? <p className="text-sm text-destructive">{checkError}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Primary busy={checking || busy} onClick={() => void run()}>
            <ShieldCheck />
            开始检测
          </Primary>
          {state.mode === "demo" ? (
            <Button variant="ghost" className="h-10 rounded-full px-4 text-muted-foreground" onClick={() => void act({ type: "skipIpCheck" })}>
              演示模式：跳过检测
            </Button>
          ) : null}
        </div>
        <EnvCheck bit={false} />
      </div>
    );
  }

  return null;
}

function OpenButton({ href, children, beside }: { href: string; children: ReactNode; beside?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!beside) return;
        e.preventDefault();
        openBeside(href, beside);
      }}
      className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
    >
      <ExternalLink className="size-4" />
      {children}
    </a>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="grid gap-2 text-[14px]">
      {items.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
  );
}

export const STEP3_TASKS: TaskDef[] = [
  { key: "3a", title: "办日本正规手机号", doneText: (s) => `号码 ${s.sms?.number ?? ""}` },
  { key: "3b", title: "打开 Claude，用自己的邮箱注册", doneText: () => "已进入 Claude" },
  { key: "3c", title: "手机号验证", doneText: () => "短信验证已通过" },
  { key: "3d", title: "给邮箱开两步验证", doneText: () => "两步验证已开" },
];

const TUNAPAY_AGENT = "https://www.tunapay.ai/";
const AGENT_MESSAGE = "管家你好，我是会员，要一个能收 Claude（Anthropic）短信验证码的日本 +81 手机号，实体 SIM 卡，收到码后麻烦发我。";

export function Step3Task({ task, state, act, busy }: { task: SubTask; state: PublicState; act: Act; busy: boolean }) {
  const [number, setNumber] = useState(state.sms?.number ?? "");
  const member = state.path === "member";

  if (task === "3a" && member) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] font-semibold">日本 +81 · 实体 SIM 卡 · 能收短信</p>
            <Pill tone="brand">会员已含</Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">和你的日本静态 IP 同一个国家 · 由 TunaPay 24 小时 Agent 管家提供，不用自己去买</p>
        </div>
        <OpenButton href={TUNAPAY_AGENT} beside="tunapay">找 Agent 管家要号</OpenButton>
        <CopyValue label="发给管家的话（复制粘贴）" value={AGENT_MESSAGE} mono={false} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            inputMode="tel"
            placeholder="管家给你的号码，带区号，如 +81 90 1234 5678"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="h-10 rounded-full bg-background px-4 font-mono"
          />
          <Primary busy={busy} disabled={!number} onClick={() => void act({ type: "setSms", number })}>
            保存号码
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "3a") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] font-semibold">日本 +81 · 实体 SIM 或能收短信的 eSIM · 正规运营商号</p>
            <Pill tone="brand">{JP_NUMBER.priceNote}</Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">必须和你的日本静态 IP 同一个国家 · 不要 VoIP / 虚拟号 / 接码平台 / 闲鱼接码</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {JP_NUMBER.vendors.map((v) => (
            <OpenButton key={v.url} href={v.url}>
              去 {v.name} 办日本号
            </OpenButton>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {JP_NUMBER_PLANS.map((plan) => (
            <div key={plan.name} className="rounded-xl border border-border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold">{plan.name}</p>
                <Pill>{plan.tag}</Pill>
              </div>
              <p className="mt-1 text-[13px] font-medium text-brand">{plan.total}</p>
              <ul className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted-foreground">
                {plan.lines.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          怎么选：打算用 3 个月以上选 JB Voice 更省；只想先收个码、随时能退选 Mobal。两家都要护照实名，选「带电话号码、能收短信」的套餐，实体 SIM 寄到手里或 eSIM 装到自己手机上。美元按 1 美元 ≈ {JPY_PER_USD} 日元估算，汇率会浮动，结账以官网日元为准。号码开通后填到下面。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            inputMode="tel"
            placeholder="你开通的日本号码，带区号，如 +81 90 1234 5678"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="h-10 rounded-full bg-background px-4 font-mono"
          />
          <Primary busy={busy} disabled={!number} onClick={() => void act({ type: "setSms", number })}>
            保存号码
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "3b") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          先确认 Clash Verge 开着、选中的是「Claude 日本静态IP」，再打开 Claude。
        </p>
        <Steps
          items={[
            <>点下面按钮打开 Claude 登录页</>,
            <>填你自己常用的邮箱（Gmail / Outlook 最稳），点「Continue with email」</>,
            <>去邮箱点 Claude 发来的登录链接，回到 Claude 页面</>,
            <>填名字（英文即可），勾选同意条款</>,
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <OpenButton href="https://claude.ai/login" beside="claude">打开 Claude 注册页</OpenButton>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "3b" })}>
            已进入 Claude
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "3c") {
    return (
      <div className="flex flex-col gap-4">
        <CopyValue label="你的日本号码（在 Claude 的手机号一栏粘贴）" value={state.sms?.number ?? "先完成第 1 项"} />
        <Steps
          items={[
            <>Claude 要求验证手机时，国家选「Japan (+81)」，粘贴上面的号码（去掉 +81）</>,
            member ? <>点「Send code」后，马上跟管家说「已发送，请发验证码」</> : <>点「Send code」，看装了日本 SIM / eSIM 的那部手机的短信</>,
            <>把{member ? "管家发来" : "收到"}的 6 位验证码填进 Claude 的页面</>,
          ]}
        />
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          验证码只填在 Claude 页面上，不用填到这里，我们也不会问你要。
        </p>
        {member ? (
          <CopyValue label="发给管家的话" value="已在 Claude 点了发送验证码，收到后麻烦发我，谢谢。" mono={false} />
        ) : null}
        <p className="text-xs text-muted-foreground">
          {member
            ? "没收到就等 60 秒再点一次；一直收不到，让管家换号，别反复刷。"
            : "没收到就等 60 秒再点一次；一直收不到，先确认 SIM / eSIM 已开通、能收短信（可问 JB Voice / Mobal 客服），别反复刷。"}
        </p>
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "3c" })}>
          验证码已通过
        </Primary>
      </div>
    );
  }

  if (task === "3d") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px]">Claude 每次登录都是往你邮箱发链接，所以邮箱安全就是账号安全。</p>
        <Steps
          items={[
            <>点下面按钮，打开你邮箱的安全设置页</>,
            <>找到「两步验证」并打开，按页面提示用你自己的手机完成设置</>,
            <>密码如果和别的网站一样，顺手改一个只有你自己知道的</>,
          ]}
        />
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          这些都在邮箱官网上自己操作，本页不会让你输入任何密码或验证码。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <OpenButton href="https://myaccount.google.com/security">Gmail 安全设置</OpenButton>
          <OpenButton href="https://account.microsoft.com/security">Outlook 安全设置</OpenButton>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "3d" })}>
            已开好两步验证
          </Primary>
        </div>
      </div>
    );
  }

  return null;
}

export const STEP4_TASKS: TaskDef[] = [
  { key: "4a", title: "下载安装 Claude Desktop", doneText: () => "已安装" },
  { key: "4b", title: "用同一个邮箱登录", doneText: () => "已登录" },
  { key: "4c", title: "发一句话测试", doneText: () => "能正常对话" },
];

const TEST_PROMPT = "你好，请用一句话介绍你自己。";

export function Step4Task({ task, act, busy }: { task: SubTask; state: PublicState; act: Act; busy: boolean }) {
  const [os, setOs] = useState(detectOs);

  if (task === "4a") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex self-start rounded-full border border-border bg-background p-1 text-sm">
          {[
            { key: "windows", label: "Windows" },
            { key: "mac", label: "macOS" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOs(o.key)}
              className={cn("rounded-full px-4 py-1.5", os === o.key ? "bg-foreground text-background" : "text-muted-foreground")}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Steps
          items={
            os === "windows"
              ? ["点下面按钮，下载 Windows 版 Claude Setup.exe", "双击安装，装完会自动打开", "先别登录，进下一项"]
              : ["点下面按钮，下载 macOS 版 Claude.dmg", "把 Claude 拖进「应用程序」并打开", "先别登录，进下一项"]
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://claude.ai/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            <Download className="size-4" />
            下载 Claude Desktop（{os === "windows" ? "Windows" : "macOS"}）
          </a>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "4a" })}>
            已安装并打开
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "4b") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          桌面版要靠 Clash 的「虚拟网卡模式（TUN）」才会走日本 IP。登录前确认 TUN 是开着的。
        </p>
        <Steps
          items={[
            "在 Claude Desktop 点「Continue with email」",
            "填第 3 步注册 Claude 用的那个邮箱，去邮箱点登录链接",
            "链接会跳回桌面版，看到对话框就算登录成功",
          ]}
        />
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "4b" })}>
          已登录
        </Primary>
      </div>
    );
  }

  if (task === "4c") {
    return (
      <div className="flex flex-col gap-4">
        <CopyValue label="复制这句话发给 Claude" value={TEST_PROMPT} mono={false} />
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "4c" })}>
          收到回复了
        </Primary>
      </div>
    );
  }

  return null;
}

export const STEP5_TASKS: TaskDef[] = [
  { key: "5a", title: "打开订阅页，选档位（已按第 1 步选好）", doneText: (s) => (s.plan === "max20" ? "Max 20x" : "Max 5x") },
  { key: "5b", title: "填卡号和账单地址", doneText: () => "已按 U 卡信息填好" },
  { key: "5c", title: "付款，确认开通", doneText: (s) => `已开通 · 卡内余额 ${money(s.balance)}` },
];

export function Step5Task({ task, state, act, busy }: { task: SubTask; state: PublicState; act: Act; busy: boolean }) {
  const maxItem = state.quote.items.find((i) => i.label.startsWith("Claude Max"));
  const planLabel = state.plan === "max20" ? "Max 20x" : "Max 5x";

  if (task === "5a") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-brand bg-brand-soft/60 px-4 py-3">
          <div>
            <p className="text-[15px] font-semibold">Claude {planLabel} · 按月</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {money(maxItem?.usd ?? 0)} / 月 · 卡内余额 {money(state.balance)}，够付
            </p>
          </div>
          <Pill tone="brand">已选好</Pill>
        </div>
        <Steps items={["在 Claude 里点左下角头像 → Upgrade plan", `选「${planLabel}」，点「Upgrade」进入付款页`]} />
        <div className="flex flex-wrap items-center gap-3">
          <OpenButton href="https://claude.ai/upgrade" beside="claude">打开 Claude 订阅页</OpenButton>
          <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "5a" })}>
            已进入付款页
          </Primary>
        </div>
      </div>
    );
  }

  if (task === "5b") {
    const c = state.card ?? PREVIEW_CARD;
    const b = c.billing;
    return (
      <div className="flex flex-col gap-4">
        <MockForm
          title="付款页从上到下，照着填"
          rows={[
            { field: "Card number / 卡号", value: c.number.replace(/(\d{4})/g, "$1 ").trim() },
            { field: "Expiration / 有效期", value: c.expiry },
            { field: "CVC / 安全码", value: c.cvc },
            { field: "Name on card / 持卡人", value: c.holder },
            { field: "Country / 国家", value: b.country },
            { field: "Address line 1 / 地址", value: b.line1 },
            { field: "City / 城市", value: b.city },
            { field: "State / 州", value: b.state },
            { field: "ZIP / 邮编", value: b.zip },
          ]}
        />
        <Primary busy={busy} onClick={() => void act({ type: "confirm", task: "5b" })}>
          都填好了
        </Primary>
      </div>
    );
  }

  if (task === "5c") {
    return (
      <div className="flex flex-col gap-4">
        <Steps
          items={[
            "点「Subscribe」付款，等页面跳回 Claude",
            `左下角显示「${planLabel}」就是开通了`,
            "付款失败：先确认还走日本 IP、账单地址和卡上登记的一致，再试一次",
          ]}
        />
        <Primary busy={busy} onClick={() => void act({ type: "payMax" })}>
          已显示 {planLabel}，扣款 {money(maxItem?.usd ?? 0)}
        </Primary>
      </div>
    );
  }

  return null;
}

export function flowTasks(step: 1 | 2 | 3 | 4 | 5, state: PublicState): TaskDef[] {
  const member = state.path === "member";
  switch (step) {
    case 1:
      return step1Tasks(state);
    case 2:
      return step2Tasks(state);
    case 3:
      return member
        ? STEP3_TASKS.map((t) => (t.key === "3a" ? { ...t, title: "找 Agent 管家领日本手机号" } : t))
        : STEP3_TASKS;
    case 4:
      return STEP4_TASKS;
    case 5:
      return STEP5_TASKS;
  }
}
