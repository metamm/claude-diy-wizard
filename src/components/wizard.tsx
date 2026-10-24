"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Flag,
  HeartHandshake,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { Disclaimer } from "@/components/disclaimer";
import { SiteHeader } from "@/components/site-header";
import {
  Bill,
  PathSwitch,
  Step1Task,
  Step2Task,
  Step3Task,
  Step4Task,
  Step5Task,
  TaskFlow,
  flowTasks,
  useSession,
} from "@/components/tasks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ACCEPTANCE_CHECKS,
  FINAL_OUTCOME,
  STEPS,
  STEP_PEP,
  stepById,
  type Order,
  type StepDef,
  type StepId,
} from "@/lib/catalog";
import type { CardPath } from "@/lib/session";
import { cn } from "@/lib/utils";

const SESSION_KEY = "claude-diy-wizard-session";

function readOrCreateSession() {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

type View = StepId | "check";

export function Wizard() {
  const [sessionId, setSessionId] = useState(readOrCreateSession);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<View>(1);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const session = useSession(sessionId);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/orders?sessionId=${encodeURIComponent(sessionId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { orders?: Order[]; error?: string };
        if (!response.ok) throw new Error(data.error || "读取失败");
        const nextOrders = data.orders ?? [];
        setOrders(nextOrders);
        const pending = STEPS.find((s) => !nextOrders.some((o) => o.step === s.id));
        setView(pending ? pending.id : "check");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError("暂时读不到之前的进度，可以从第 1 步继续。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, [sessionId]);

  const done = useMemo(() => new Set(orders.map((order) => order.step)), [orders]);
  const firstOpen = STEPS.find((s) => !done.has(s.id))?.id;

  function go(next: View) {
    setPayError("");
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function advance(step: StepId) {
    const nextView: View = step < 5 ? ((step + 1) as StepId) : "check";
    if (done.has(step)) {
      go(nextView);
      return;
    }
    setPayError("");
    setPaying(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, step }),
      });
      const data = (await response.json()) as { order?: Order; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "没有记下这一步。");
      const order = data.order;
      setOrders((current) =>
        [...current.filter((item) => item.step !== order.step), order].sort(
          (a, b) => a.step - b.step,
        ),
      );
      go(nextView);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const offline = /failed to fetch|network|aborted|load failed/i.test(raw);
      setPayError(offline || !raw ? "网络没连上，这一步还没记下，请重试。" : raw);
    } finally {
      setPaying(false);
    }
  }

  function restart() {
    const next = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, next);
    setSessionId(next);
    setOrders([]);
    setPayError("");
    setLoadError("");
    setView(1);
  }

  const unlocked = (id: View) => (id === "check" ? firstOpen === undefined : done.has(id) || id === firstOpen);

  return (
    <div className="min-h-screen">
      <SiteHeader active="wizard">
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">已完成 {done.size}/5</span>
          <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted md:block">
            <span
              className="block h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(done.size / 5) * 100}%` }}
            />
          </span>
        </div>
      </SiteHeader>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 pt-8 pb-16 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16 lg:pt-14">
        <Stepper view={view} done={done} unlocked={unlocked} onPick={go} path={session.state?.path} />

        <section className="min-w-0 max-w-2xl">
          {!ready ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              正在读取进度…
            </div>
          ) : view === "check" ? (
            <Acceptance
              orders={orders}
              onRestart={restart}
              path={session.state?.path}
              pending={firstOpen}
              onGoPending={() => firstOpen !== undefined && go(firstOpen)}
            />
          ) : (
            <StepView
              key={view}
              stepId={view}
              order={orders.find((item) => item.step === view)}
              paying={paying}
              payError={payError}
              loadError={loadError}
              session={session}
              blockedBy={firstOpen !== undefined && firstOpen < view ? firstOpen : undefined}
              onBack={view > 1 ? () => go((view - 1) as StepId) : undefined}
              onNext={() => advance(view)}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function priceFor(step: StepDef, path?: CardPath): string {
  if (step.id === 1) return path === "member" ? "会员 $100" : path === "existing" ? "已有卡" : step.priceAmount;
  if (path === "member" && (step.id === 2 || step.id === 3)) return "会员已含";
  return step.priceAmount;
}

function Stepper({
  view,
  done,
  unlocked,
  onPick,
  path,
}: {
  path?: CardPath;
  view: View;
  done: Set<StepId>;
  unlocked: (id: View) => boolean;
  onPick: (id: View) => void;
}) {
  const items: { id: View; label: string; sub: string }[] = [
    ...STEPS.map((s) => ({ id: s.id as View, label: s.rail, sub: priceFor(s, path) })),
    { id: "check", label: "验收", sub: unlocked("check") ? "确认已就绪" : "五步做完才能验收" },
  ];
  const current = items.find((item) => item.id === view);
  const currentIndex = items.findIndex((item) => item.id === view);

  return (
    <nav aria-label="向导步骤" className="lg:sticky lg:top-24 lg:self-start">
      <div className="lg:hidden">
        <div className="flex gap-1.5">
          {items.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "h-1 flex-1 rounded-full",
                index <= currentIndex || (item.id !== "check" && done.has(item.id))
                  ? "bg-brand"
                  : "bg-border",
              )}
            />
          ))}
        </div>
        <p className="sr-only">当前：{current?.label}</p>
      </div>

      <ol className="hidden lg:block">
        {items.map((item, index) => {
          const active = item.id === view;
          const finished = item.id !== "check" && done.has(item.id);
          const open = unlocked(item.id);
          const last = index === items.length - 1;
          return (
            <li key={item.id} className="relative pb-6 last:pb-0">
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-8 bottom-1 left-[13.5px] w-px",
                    finished ? "bg-foreground/70" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => onPick(item.id)}
                aria-current={active ? "step" : undefined}
                className="group flex w-full items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                    active
                      ? "bg-brand text-white ring-4 ring-brand-soft"
                      : finished
                        ? "bg-foreground text-background"
                        : "border border-border bg-card text-muted-foreground",
                  )}
                >
                  {finished && !active ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : item.id === "check" ? (
                    <Flag className="size-3.5" />
                  ) : (
                    item.id
                  )}
                </span>
                <span className="pt-0.5">
                  <span
                    className={cn(
                      "block text-sm leading-5",
                      active
                        ? "font-semibold text-foreground"
                        : open
                          ? "text-foreground/80 group-hover:text-foreground"
                          : "text-foreground/65 group-hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type Session = ReturnType<typeof useSession>;

const FLOW_VIEWS = { 1: Step1Task, 2: Step2Task, 3: Step3Task, 4: Step4Task, 5: Step5Task } as const;

function StepView({
  stepId,
  order,
  paying,
  payError,
  loadError,
  session,
  blockedBy,
  onBack,
  onNext,
}: {
  stepId: StepId;
  order?: Order;
  paying: boolean;
  payError: string;
  loadError: string;
  session: Session;
  blockedBy?: StepId;
  onBack?: () => void;
  onNext: () => void;
}) {
  const step = stepById(stepId);
  const { state, act, busy, error } = session;
  const tasks = state ? flowTasks(stepId, state) : [];
  const flowLeft = state ? tasks.filter((t) => !state.done.includes(t.key)).length : 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="text-sm font-medium text-brand">第 {step.id} 步 · 共 5 步</p>
      <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">
        {step.title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{step.summary}</p>
      <p className="mt-2 text-sm font-medium text-brand">{STEP_PEP[step.id]}</p>

      {loadError ? <p className="mt-4 text-sm text-muted-foreground">{loadError}</p> : null}

      {!state ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          正在准备…
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {stepId === 1 ? <Bill state={state} act={act} busy={busy} /> : null}
          {stepId === 1 ? <PathSwitch state={state} act={act} busy={busy} /> : null}
          <TaskFlow
            tasks={tasks}
            state={state}
            error={error}
            gate={blockedBy !== undefined ? `第 ${blockedBy} 步 · ${stepById(blockedBy).rail}` : undefined}
            render={(key) => {
              const View = FLOW_VIEWS[stepId];
              return <View task={key} state={state} act={act} busy={busy} />;
            }}
          />
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="ghost" className="h-11 rounded-full px-4 text-muted-foreground" onClick={onBack}>
            <ArrowLeft />
            上一步
          </Button>
        ) : (
          <span />
        )}
        <Button
          className="h-11 rounded-full px-6 text-[15px]"
          disabled={paying || flowLeft > 0 || blockedBy !== undefined}
          onClick={onNext}
        >
          {paying ? <Loader2 className="animate-spin" /> : null}
          {blockedBy !== undefined
            ? `先完成第 ${blockedBy} 步`
            : flowLeft > 0
              ? `还差 ${flowLeft} 项`
              : order
                ? "下一步"
                : step.actionButton}
          {!paying && flowLeft === 0 && blockedBy === undefined ? <ArrowRight /> : null}
        </Button>
      </div>
      {payError ? (
        <p role="alert" className="mt-3 text-right text-sm text-destructive">
          {payError}
        </p>
      ) : null}

      {step.id === 1 ? (
        <div className="mt-14">
          <p className="text-sm font-semibold">走完五步，你会拿到</p>
          <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FINAL_OUTCOME.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-[15px]">
                <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand tabular-nums">
                  {item.step}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            效果和「成品 Max 号 + 专属静态 IP」一样，区别是每一步你自己做，账号和卡都是你的。
          </p>
        </div>
      ) : null}

      <Disclaimer />
      <p className="mt-3 text-[11px] text-muted-foreground/80">
        {order ? `本步已记录 · 占位单 ${order.id.slice(0, 8)}` : "点按钮只在本机记一条占位记录，不会真实扣款。"}
      </p>
    </div>
  );
}

function Acceptance({
  orders,
  onRestart,
  path,
  pending,
  onGoPending,
}: {
  orders: Order[];
  onRestart: () => void;
  path?: CardPath;
  pending?: StepId;
  onGoPending: () => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const locked = pending !== undefined;
  const all = !locked && checked.length === ACCEPTANCE_CHECKS.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="text-sm font-medium text-brand">最后一步</p>
      <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">
        自己验收一下
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        挨个打勾。全过了，就跟「成品 Max 号 + 专属静态 IP」一个效果，而且号和卡都在你自己手里。
      </p>
      <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
        丑话说在前头：走完全程成功率大概 75%，不保证百分百开号成功。
      </p>

      {locked ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand">
          <span>
            还没走完：第 {pending} 步 · {stepById(pending).rail} 没完成。五步都做完才能勾验收，先预览清单没问题。
          </span>
          <Button size="sm" className="rounded-full" onClick={onGoPending}>
            去第 {pending} 步
            <ArrowRight />
          </Button>
        </div>
      ) : null}

      <div className={cn("rounded-2xl border border-border bg-card", locked ? "mt-4" : "mt-8")}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-7">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">验收清单</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {locked ? 0 : checked.length}/{ACCEPTANCE_CHECKS.length}
          </p>
        </div>
        <ul className="px-4 py-3 sm:px-5">
          {ACCEPTANCE_CHECKS.map((item) => {
            const on = !locked && checked.includes(item);
            return (
              <li key={item}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() =>
                    setChecked((prev) => (on ? prev.filter((x) => x !== item) : [...prev, item]))
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors enabled:hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                      on ? "border-brand bg-brand text-white" : "border-foreground/25",
                    )}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className={cn("text-[15px]", on && "text-muted-foreground")}>{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {all ? (
          <div className="border-t border-border bg-brand-soft px-6 py-4 text-sm font-medium text-brand sm:px-7">
            全过！你的 Claude Max 已经能用了。
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <p className="border-b border-border px-6 py-4 text-xs font-medium tracking-wide text-muted-foreground sm:px-7">
          费用一览
        </p>
        <ul className="divide-y divide-border">
          {STEPS.map((step) => {
            const recorded = orders.some((o) => o.step === step.id);
            return (
              <li key={step.id} className="flex items-center justify-between gap-4 px-6 py-3.5 sm:px-7">
                <span className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-xs text-muted-foreground tabular-nums">{step.id}</span>
                  {step.id === 1 && path === "member"
                    ? "TunaPay 终身会员"
                    : step.id === 1 && path === "existing"
                      ? "TunaPay 卡（已有）"
                      : step.priceLabel}
                  {recorded ? <Check className="size-3.5 text-brand" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    step.id === 1 ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {priceFor(step, path)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-6 py-5 sm:px-7">
        <HeartHandshake className="mt-0.5 size-5 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">别犹豫了，今天就把 Claude Max 拿下</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            能一路看到这儿，你早就不是「随便看看」的人了。卡、IP、手机号这些绕不绕？绕。但别人能搞定的，你一样能搞定。
          </p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            嫌步骤多、不想每步自己掏钱？直接开 TunaPay 会员，VIP 客服陪你一步步配到位，你只管把精力留给真正想用 Claude 做的大事。账号密码和验证码依旧你自己填，主动权一直在你手里。
          </p>
          <p className="mt-1.5 text-sm font-medium leading-6 text-brand">
            别再把「改天」挂嘴边了，想要的，今天就拿下。
          </p>
          <a
            href="https://tunapay.ai"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "mt-4 h-10 rounded-full px-5")}
          >
            现在就开 TunaPay 会员
            <ExternalLink />
          </a>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" className="h-11 rounded-full px-5" onClick={onRestart}>
          <RotateCcw />
          重新开始一套
        </Button>
      </div>

      <Disclaimer />
    </div>
  );
}
