import { readJson, writeJson } from "@/lib/kv";
import { getIpOffer, getIpfoxyBalance, type IpOffer } from "@/lib/proxy-price";

export const AI_CARD = {
  name: "AI 卡",
  network: "VISA",
  bin: "424242",
  note: "Claude 实测可扣款卡段",
} as const;

export const CARD_FEE_USD = 9.9;
export const MEMBER_FEE_USD = 100;

export type CardPath = "single" | "member" | "existing";
export const CARD_TOPUP_RATE = 0.02;

export const WITHDRAW_FEE_USD = 3;

export const MAX_PLANS = {
  max5: { label: "Claude Max 5x · 首月", usd: 100 },
  max20: { label: "Claude Max 20x · 首月", usd: 200 },
} as const;

export type MaxPlan = keyof typeof MAX_PLANS;

export const BUFFER_USD = 5;

export const PROXY_PLAN = {
  region: "日本 · 东京",
  type: "静态住宅 ISP · 独享",
  protocol: "SOCKS5",
  months: 1,
} as const;

export type SubTask =
  | "1a"
  | "1b"
  | "1c"
  | "1d"
  | "1e"
  | "2a"
  | "2b"
  | "2c"
  | "2d"
  | "2e"
  | "3a"
  | "3b"
  | "3c"
  | "3d"
  | "4a"
  | "4b"
  | "4c"
  | "5a"
  | "5b"
  | "5c";

export type Card = {
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
  billing: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export type Proxy = {
  ip: string;
  port: number;
  username: string;
  password: string;
  protocol: "socks5";
  expiresAt: string;
};

export type LoginProvider = "telegram" | "google";

export const PROXY_TOOLS = ["clash", "bitbrowser"] as const;
export type ProxyTool = (typeof PROXY_TOOLS)[number];

export const DEPOSIT_NETWORKS = ["trc20", "erc20", "bep20"] as const;
export type DepositNetwork = (typeof DEPOSIT_NETWORKS)[number];

export type SessionState = {
  sessionId: string;
  mode: "demo";
  path?: CardPath;
  login?: LoginProvider;
  tunapayEmail?: string;
  card?: Card;
  balance: number;
  deposit?: { addresses: Record<DepositNetwork, string>; network: DepositNetwork; amount: number };
  plan: MaxPlan;
  cardFeePaid?: boolean;
  proxy?: Proxy;
  chainSubscription?: string;
  sms?: { number: string };
  maxPaid?: boolean;
  ipOffer?: IpOffer;
  proxyTool?: ProxyTool;
  done: SubTask[];
};

function randomInt(min: number, max: number) {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return min + (buf[0] % (max - min));
}

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAll(): Promise<Record<string, SessionState>> {
  const parsed = await readJson<unknown>("sessions", {});
  return parsed && typeof parsed === "object" ? (parsed as Record<string, SessionState>) : {};
}

async function writeAll(all: Record<string, SessionState>) {
  await writeJson("sessions", all);
}

function blank(sessionId: string): SessionState {
  return { sessionId, mode: "demo", balance: 0, plan: "max5", done: [] };
}

export function publicState(state: SessionState, live: IpOffer) {
  const { tunapayEmail, ipOffer, ...rest } = state;
  const ip = ipOffer ?? live;
  return {
    ...rest,
    plan: state.plan ?? "max5",
    tunapayEmail: tunapayEmail ? maskEmail(tunapayEmail) : undefined,
    path: state.path ?? "single",
    proxyTool: state.proxyTool ?? "clash",
    ip,
    ipLocked: Boolean(ipOffer),
    quote: quote(state.plan ?? "max5", state.path ?? "single", ip),
  };
}

export async function readSession(sessionId: string) {
  const [state, live] = await Promise.all([getSession(sessionId), getIpOffer()]);
  return publicState(state, live);
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export function getSession(sessionId: string) {
  return enqueue(async () => (await readAll())[sessionId] ?? blank(sessionId));
}

export class ActionError extends Error {}

export const CONFIRM_TASKS = ["1b", "1d", "1e", "2b", "2d", "3b", "3c", "3d", "4a", "4b", "4c", "5a", "5b"] as const;
export type ConfirmTask = (typeof CONFIRM_TASKS)[number];

const ORDER: SubTask[] = [
  "1a", "1b", "1c", "1d", "1e",
  "2a", "2b", "2c", "2d", "2e",
  "3a", "3b", "3c", "3d",
  "4a", "4b", "4c",
  "5a", "5b", "5c",
];

function requireDone(state: SessionState, task: SubTask) {
  const prior = ORDER.slice(0, ORDER.indexOf(task));
  const missing = prior.find((t) => !state.done.includes(t));
  if (missing) throw new ActionError(`请先完成前面的步骤（${missing}）。`);
}

function debit(state: SessionState, usd: number) {
  if (state.balance < usd) throw new ActionError("U 卡余额不足，请回到第 1 步充值。");
  state.balance = cents(state.balance - usd);
}

function mark(state: SessionState, task: SubTask) {
  if (!state.done.includes(task)) state.done.push(task);
}

function luhnComplete(partial: string) {
  const digits = partial.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = digits[digits.length - 1 - i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return partial + String((10 - (sum % 10)) % 10);
}

function digits(n: number) {
  return Array.from({ length: n }, () => randomInt(0, 10)).join("");
}

function token(n: number, alphabet = "abcdefghjkmnpqrstuvwxyz23456789") {
  return Array.from({ length: n }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

const cents = (n: number) => Math.round(n * 100) / 100;

function mockCard(): Card {
  const now = new Date();
  const exp = new Date(now.getFullYear() + 3, now.getMonth(), 1);
  return {
    number: luhnComplete(AI_CARD.bin + digits(9)),
    expiry: `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear()).slice(2)}`,
    cvc: digits(3),
    holder: "CARD HOLDER",
    billing: {
      line1: "1000 Demo Avenue",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
      country: "United States",
    },
  };
}

export function quote(plan: MaxPlan, path: CardPath, ip: IpOffer) {
  const member = path === "member";
  const items = [
    {
      label: `${PROXY_PLAN.region}静态 IP · 首月`,
      usd: member ? 0 : ip.usd,
      source: member ? "会员已含" : ip.source,
    },
    { label: MAX_PLANS[plan].label, usd: MAX_PLANS[plan].usd, source: "Claude 官方价" },
    { label: "余量（扣款预授权、价格浮动）", usd: BUFFER_USD, source: "建议" },
  ];
  const cardTopup = cents(items.reduce((sum, i) => sum + i.usd, 0));
  const topupFee = member ? 0 : cents(Math.ceil(cardTopup * CARD_TOPUP_RATE * 100) / 100);
  const cardFee = member ? MEMBER_FEE_USD : path === "existing" ? 0 : CARD_FEE_USD;
  const total = cents(cardFee + cardTopup + topupFee);
  return {
    plan,
    path,
    items,
    cardFee,
    cardTopup,
    topupFee,
    depositUsdt: cents(cardTopup + topupFee),
    total,
  };
}

type Action =
  | { type: "choosePath"; path: CardPath }
  | { type: "verifyCard"; email: string }
  | { type: "login"; provider: LoginProvider }
  | { type: "setPlan"; plan: MaxPlan }
  | { type: "openCard" }
  | { type: "createDeposit" }
  | { type: "setDepositNetwork"; network: DepositNetwork }
  | { type: "confirmDeposit" }
  | { type: "confirm"; task: ConfirmTask }
  | { type: "buyProxy" }
  | { type: "setProxyTool"; tool: ProxyTool }
  | { type: "setChain"; subscription: string }
  | { type: "markImported" }
  | { type: "ipCheck"; ip: string; country: string }
  | { type: "skipIpCheck" }
  | { type: "setSms"; number: string }
  | { type: "payMax" }
  | { type: "reset" };

export async function applyAction(sessionId: string, action: Action) {
  const live = await getIpOffer();
  return enqueue(async () => {
    const all = await readAll();
    const state = all[sessionId] ?? blank(sessionId);
    const extra: Record<string, unknown> = {};
    const ipNow = () => state.ipOffer ?? live;
    const lockIp = () => {
      state.ipOffer ??= live;
    };

    switch (action.type) {
      case "choosePath": {
        if (state.path === action.path) break;
        if (state.done.includes("1b") || state.tunapayEmail) throw new ActionError("卡已经开好或验证过了，不能再换方式。");
        state.path = action.path;
        delete state.deposit;
        delete state.ipOffer;
        break;
      }
      case "verifyCard": {
        if (state.path !== "existing") throw new ActionError("先选「我已经有 TunaPay 卡」。");
        const email = action.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError("邮箱格式不对，再检查一下。");
        state.tunapayEmail = email;
        state.card ??= mockCard();
        lockIp();
        state.balance = quote(state.plan, "existing", ipNow()).cardTopup;
        for (const t of ["1a", "1b", "1c", "1d", "1e"] as SubTask[]) mark(state, t);
        break;
      }
      case "login": {
        state.login = action.provider;
        mark(state, "1a");
        break;
      }
      case "setPlan": {
        if (state.done.includes("1c")) throw new ActionError("已经充值，不能再改档位。");
        state.plan = action.plan;
        delete state.deposit;
        delete state.ipOffer;
        break;
      }
      case "openCard": {
        requireDone(state, "1b");
        state.cardFeePaid = true;
        state.card ??= mockCard();
        break;
      }
      case "createDeposit": {
        requireDone(state, "1c");
        if (!state.deposit || !("addresses" in state.deposit)) {
          lockIp();
          const evm = `0x${token(40, "0123456789abcdef")}`;
          state.deposit = {
            addresses: {
              trc20: `T${token(33, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789")}`,
              erc20: evm,
              bep20: evm,
            },
            network: "trc20",
            amount: quote(state.plan, state.path ?? "single", ipNow()).depositUsdt,
          };
        }
        break;
      }
      case "setDepositNetwork": {
        if (!state.deposit || !("addresses" in state.deposit)) throw new ActionError("请先生成充值地址。");
        if (state.done.includes("1c")) throw new ActionError("已经到账，不用再换网络。");
        state.deposit.network = action.network;
        break;
      }
      case "confirmDeposit": {
        requireDone(state, "1c");
        if (!state.deposit) throw new ActionError("请先生成充值地址。");
        if (!state.done.includes("1c")) state.balance = quote(state.plan, state.path ?? "single", ipNow()).cardTopup;
        mark(state, "1c");
        break;
      }
      case "confirm": {
        requireDone(state, action.task);
        if (action.task === "1b" && !state.card) throw new ActionError("请先开卡。");
        mark(state, action.task);
        break;
      }
      case "buyProxy": {
        requireDone(state, "2a");
        if (!state.proxy) {
          const price = ipNow().usd;
          if (state.path !== "member" && ipNow().provider === "ipfoxy") {
            let balance: number | null = null;
            try {
              balance = await getIpfoxyBalance();
            } catch {
              throw new ActionError("暂时查不到 IPFoxy 账户余额，稍后再试。");
            }
            if (balance !== null && balance < price) {
              throw new ActionError(
                `IPFoxy 账户余额 $${balance.toFixed(2)}，不够买 $${price.toFixed(2)}。先去 IPFoxy 充值至少 $${price.toFixed(2)}（建议多留 $1–2），再回来点购买。`,
              );
            }
          }
          debit(state, state.path === "member" ? 0 : price);
          const expires = new Date();
          expires.setMonth(expires.getMonth() + PROXY_PLAN.months);
          state.proxy = {
            ip: `203.0.113.${randomInt(10, 250)}`,
            port: 10000 + randomInt(0, 50000),
            username: `jp_${token(8)}`,
            password: token(16),
            protocol: "socks5",
            expiresAt: expires.toISOString(),
          };
        }
        mark(state, "2a");
        break;
      }
      case "setProxyTool": {
        if (state.done.includes("2e")) throw new ActionError("出口 IP 已确认，不用再换工具。");
        if (state.proxyTool !== action.tool) {
          state.proxyTool = action.tool;
          state.done = state.done.filter((t) => t !== "2b" && t !== "2c" && t !== "2d");
        }
        break;
      }
      case "setChain": {
        const value = action.subscription.trim();
        if (value && !/^https?:\/\/\S+$/i.test(value)) throw new ActionError("订阅链接要以 http:// 或 https:// 开头。");
        state.chainSubscription = value || undefined;
        break;
      }
      case "markImported": {
        requireDone(state, "2c");
        mark(state, "2c");
        break;
      }
      case "ipCheck": {
        requireDone(state, "2e");
        if (!state.proxy) throw new ActionError("还没有买 IP。");
        const ok = action.ip === state.proxy.ip;
        extra.match = ok;
        if (ok) mark(state, "2e");
        break;
      }
      case "skipIpCheck": {
        requireDone(state, "2e");
        mark(state, "2e");
        break;
      }
      case "setSms": {
        requireDone(state, "3a");
        const number = action.number.replace(/[\s-]/g, "");
        if (!/^\+\d{8,15}$/.test(number)) throw new ActionError("号码要带国家区号，比如 +81 开头。");
        state.sms = { number };
        mark(state, "3a");
        break;
      }
      case "payMax": {
        requireDone(state, "5c");
        if (!state.maxPaid) {
          debit(state, MAX_PLANS[state.plan].usd);
          state.maxPaid = true;
        }
        mark(state, "5c");
        break;
      }
      case "reset": {
        all[sessionId] = blank(sessionId);
        await writeAll(all);
        return { state: publicState(all[sessionId], live), extra };
      }
    }

    all[sessionId] = state;
    await writeAll(all);
    return { state: publicState(state, live), extra };
  });
}

export type PublicState = ReturnType<typeof publicState>;
export type { Action };

export function clashConfig(state: Pick<SessionState, "proxy" | "chainSubscription">) {
  const p = state.proxy;
  if (!p) return null;
  const chain = state.chainSubscription;
  const lines = [
    "# Claude DIY 向导自动生成",
    "mixed-port: 7890",
    "allow-lan: false",
    "mode: rule",
    "log-level: info",
    "ipv6: false",
    "dns:",
    "  enable: true",
    "  enhanced-mode: fake-ip",
    "  nameserver:",
    "    - https://1.1.1.1/dns-query",
    "    - https://8.8.8.8/dns-query",
  ];
  if (chain) {
    lines.push(
      "proxy-providers:",
      "  前置机场:",
      "    type: http",
      `    url: "${chain}"`,
      "    interval: 86400",
      "    path: ./providers/front.yaml",
      "    health-check:",
      "      enable: true",
      "      url: https://www.gstatic.com/generate_204",
      "      interval: 300",
    );
  }
  lines.push(
    "proxies:",
    "  - name: 日本静态IP",
    "    type: socks5",
    `    server: ${p.ip}`,
    `    port: ${p.port}`,
    `    username: ${p.username}`,
    `    password: ${p.password}`,
    "    udp: true",
  );
  if (chain) lines.push("    dialer-proxy: 前置线路");
  lines.push("proxy-groups:");
  if (chain) {
    lines.push(
      "  - name: 前置线路",
      "    type: url-test",
      "    use:",
      "      - 前置机场",
      "    url: https://www.gstatic.com/generate_204",
      "    interval: 300",
    );
  }
  lines.push(
    "  - name: Claude",
    "    type: select",
    "    proxies:",
    "      - 日本静态IP",
    "rules:",
    "  - DOMAIN-SUFFIX,claude.ai,Claude",
    "  - DOMAIN-SUFFIX,claude.com,Claude",
    "  - DOMAIN-SUFFIX,anthropic.com,Claude",
    "  - DOMAIN-SUFFIX,claudeusercontent.com,Claude",
    "  - DOMAIN-SUFFIX,clau.de,Claude",
    "  - DOMAIN-SUFFIX,sentry.io,Claude",
    "  - DOMAIN-SUFFIX,statsig.com,Claude",
    "  - DOMAIN-SUFFIX,intercom.io,Claude",
    "  - DOMAIN-SUFFIX,stripe.com,Claude",
    "  - DOMAIN-SUFFIX,stripe.network,Claude",
    "  - DOMAIN-SUFFIX,ipify.org,Claude",
    "  - DOMAIN-SUFFIX,ipapi.co,Claude",
    chain ? "  - MATCH,前置线路" : "  - MATCH,DIRECT",
    "",
  );
  return lines.join("\n");
}
