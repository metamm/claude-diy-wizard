export type StepId = 1 | 2 | 3 | 4 | 5;

export const DISCLAIMER_SENTENCE =
  "这是一份从办 U 卡、买静态 IP、注册、装桌面版到开 Max 的手把手攻略；能不能开成，官方和你的环境说了算，我们不打包票。";

export const HONEST_TALK =
  "说句大实话：没有「百分百不封号」的秘方，风控遥控器在 Anthropic 手里，说改就改。大陆、港澳都不在官方支持地区，照着做也可能秒封——当成一次冒险，别当包过套餐。";

export const SUCCESS_RATE_NOTE =
  "按我们的经验，照着走完大概四个里成三个，剩下的看风控心情，不保证百分百开号成功。";

export const STEP_PEP: Record<StepId, string> = {
  1: "第一步最关键，迈出去就赢了一半。今天就把卡办下来！",
  2: "节奏很好，卡都有了，IP 不过是顺手的事。",
  3: "已经过半了，你比大多数只会收藏不动手的人强太多。",
  4: "胜利在望，装好它，Claude 就在你桌面上等你。",
  5: "最后一脚油门，Max 马上就是你的了。",
};

export const REGIONS_POLICY_URL = "https://www.anthropic.com/supported-countries";

export const DISCLAIMER_POINTS = [
  "支持哪些地区以 Anthropic 官方 Supported Regions 为准；大陆、港澳不在里面，「从不支持的地区注册」是官方写明的封号理由。",
  "注册要满 18 岁、信息真实；手机号得来自支持地区、能收短信，不能是 VoIP / 虚拟号。共享账号、封了再开小号、脚本滥用，都会被封。",
  "真被封了，用原账号走官方申诉，别开新号硬刚。",
  "注册、激活、续费、长期能用，都不打包票。",
  "我们不替你注册，账号和邮箱都是你自己的。",
  "不承诺绕过或「突破」Anthropic 服务条款。",
  "U 卡 / IP / 手机号那边出问题（风控、拒付、退款），按各家自己的规矩来。",
  "不卖「成品号」，这就是个 DIY 攻略。",
  "Clash / BitBrowser / Desktop 哪个环境都不保证一定能开成。",
] as const;

export const FEE_SCOPE =
  "第 1 步 TunaPay 单张开卡 $9.9（之后静态 IP、Max 都用这张卡自己付，日本手机号在 JB Voice / Mobal 官网自办）；已有 TunaPay 卡则用开卡邮箱验证后直接进第 2 步。";

export const JP_NUMBER = {
  label: "日本正规手机号 · JB Voice / Mobal",
  priceNote: "约 $32 起",
  note: "护照实名，按官网日元结算；不在上面合计里",
  vendors: [
    { name: "JB Voice", url: "https://jbmobile.jp/product/jbvoicesimauto/" },
    { name: "Mobal", url: "https://www.mobal.com/japan-sim-card/prices/" },
  ],
} as const;

export const JPY_PER_USD = 157;

export const JP_NUMBER_PLANS = [
  {
    name: "JB Voice",
    tag: "便宜，但最少用 3 个月",
    total: "首月约 $32 起 · 前三个月约 $48 起",
    lines: [
      "一次性手续费 ¥3,850（约 $25）",
      "月费 1GB ¥1,210（约 $8）～ 50GB ¥4,730（约 $30），只收码选 1GB 就够",
      "首月合计 ¥5,060（约 $32）起；最短 3 个月，前三月合计 ¥7,480（约 $48）起",
      "3 个月内退约要再交 ¥3,850",
      "人在国外也能打电话、收短信（没有流量）",
      "⚠️ 三星、iPhone 17e / Air / iPhone 18 系列在国外收不了验证码，换台手机再插卡",
      "护照 + 地址证明在线核验，海外走 EMS 寄卡",
    ],
  },
  {
    name: "Mobal",
    tag: "随时能退，但漫游另收钱",
    total: "人在国内用，一开通约 $79",
    lines: [
      "开卡 ¥4,950（约 $32）",
      "月费 ¥1,430（约 $9），首月按天算，没有最短期限",
      "人在国内收短信要开漫游：每开一次 ¥5,995（约 $38），关了再开还要再交",
      "开卡 + 首月 + 漫游，合计约 ¥12,375（约 $79）",
      "只有新版 5G 卡支持漫游（实体卡 2026-07-21 后买、eSIM 2026-03-18 后买）",
      "漫游只能打电话、收短信，没有流量",
    ],
  },
] as const;

export const UCARD_PRICE = "$9.9" as const;
export const UCARD_SELF_PAY = "用 U 卡支付" as const;
export const IP_PRICE = "IPFoxy 约 $12.99" as const;
export const FREE_STEP_PRICE = "免费" as const;
export const OFFICIAL_DIRECT_PRICE = "官网刷 U 卡" as const;
export const SMS_PRICE = "JB Voice / Mobal 官网价" as const;

export type StepPrice =
  | typeof UCARD_PRICE
  | typeof UCARD_SELF_PAY
  | typeof IP_PRICE
  | typeof FREE_STEP_PRICE
  | typeof OFFICIAL_DIRECT_PRICE
  | typeof SMS_PRICE;

export const FINAL_OUTCOME = [
  { text: "归你本人的 U 卡", step: 1 },
  { text: "专属日本静态 IP", step: 2 },
  { text: "自己邮箱注册的 Claude 账号", step: 3 },
  { text: "走日本 IP 的 Claude Desktop", step: 4 },
  { text: "已开通 Claude Max", step: 5 },
] as const;

export const ACCEPTANCE_CHECKS = [
  "Claude 订阅页显示 Max",
  "IP 检测显示日本静态 IP，不是本地 IP",
  "Claude Desktop 能登录并正常对话",
  "邮箱已开启两步验证",
  "卡号、IP 凭证、邮箱密码只在自己手里，没告诉过任何人",
] as const;

export type OrderStatus = "占位已记录";

export type Order = {
  id: string;
  sessionId: string;
  createdAt: string;
  step: StepId;
  stepTitle: string;
  serviceFee: StepPrice;
  vendorPayable: string;
  status: OrderStatus;
};

export type StepLink = {
  href: string;
  label: string;
  placeholder?: boolean;
};

export type StepDef = {
  id: StepId;
  rail: string;
  title: string;
  summary: string;
  priceLabel: string;
  priceAmount: StepPrice;
  priceNote: string;
  vendorPayable: string;
  actionButton: string;
  links: StepLink[];
  guide: string[];
};

export const STEPS: readonly StepDef[] = [
  {
    id: 1,
    rail: "买 U 卡",
    title: "开一张 TunaPay U 卡",
    summary: "账已经替你算好：下面这个数就是全程要准备的钱。跟着 5 个小步骤做完，卡就开好、充好、能刷了。",
    priceLabel: "TunaPay 单张开卡",
    priceAmount: UCARD_PRICE,
    priceNote: "不用入会 · 每人限 1 张",
    vendorPayable: "TunaPay 单张开卡 $9.9",
    actionButton: "卡已就绪，下一步",
    links: [{ href: "https://tunapay.ai", label: "去 TunaPay 开卡" }],
    guide: [
      "选「单张开卡」，卡种选标注 Claude 可用的「AI 卡」",
      "用 USDT 充进钱包（免手续费），再从钱包给卡充值（收 2%）",
      "卡号、有效期、安全码只存在自己手里",
    ],
  },
  {
    id: 2,
    rail: "买静态 IP",
    title: "用 IPFoxy 余额买日本静态 IP",
    summary: "套餐已替你选好（IPFoxy · 日本静态住宅 · 约 $12.99 / 30 天，按实时价）。IPFoxy 只从账户余额扣款：先用 U 卡给 IPFoxy 充值，再用余额买。买完接进 Clash Verge 或 BitBrowser，检测出口是日本，才能进下一步。",
    priceLabel: "日本静态 IP（IPFoxy）",
    priceAmount: IP_PRICE,
    priceNote: "IPFoxy 实时价，账户余额扣款",
    vendorPayable: "日本静态 IP（IPFoxy 账户余额，U 卡充值）",
    actionButton: "已买好 IP，下一步",
    links: [{ href: "https://www.ipfoxy.com/pricing/residential/", label: "去 IPFoxy 购买" }],
    guide: [
      "选日本静态住宅 / ISP IP，要独享，不要共享池",
      "保存地址、端口、账号、密码",
      "写进 Clash Verge（或 BitBrowser 窗口代理），让流量走日本",
    ],
  },
  {
    id: 3,
    rail: "手机验证码",
    title: "办日本正规手机号，用自己的邮箱注册",
    summary: "手机号在 JB Voice 或 Mobal 官网办，护照实名，人在国内约 $32 起就能收日本验证码，两家怎么选、要花多少钱，下面列清楚了。其余每一格该填什么，也都给好了。",
    priceLabel: "日本手机号（JB Voice / Mobal）",
    priceAmount: SMS_PRICE,
    priceNote: "按官网标价；Claude 注册本身免费",
    vendorPayable: "日本正规手机号（JB Voice / Mobal 官网）",
    actionButton: "已注册，下一步",
    links: [
      { href: "https://jbmobile.jp/product/jbvoicesimauto/", label: "去 JB Voice 办日本号" },
      { href: "https://www.mobal.com/japan-sim-card/prices/", label: "去 Mobal 办日本号" },
      { href: "https://claude.ai", label: "打开 Claude 官网" },
    ],
    guide: [
      "确认 Clash 连着日本静态 IP",
      "在 JB Voice 或 Mobal 办日本号（护照实名，实体 SIM 或能收短信的 eSIM）",
      "用自己的邮箱注册，验证码自己填回页面",
      "注册完给邮箱开两步验证（在邮箱官网自己操作）",
    ],
  },
  {
    id: 4,
    rail: "装桌面版",
    title: "安装 Claude Desktop",
    summary: "下载、登录、发一句话测试，三项做完就算装好。",
    priceLabel: "Claude Desktop",
    priceAmount: FREE_STEP_PRICE,
    priceNote: "官方安装包",
    vendorPayable: "Claude Desktop（免费）",
    actionButton: "已装好，下一步",
    links: [{ href: "https://claude.ai/download", label: "下载 Claude Desktop" }],
    guide: [
      "从官方页面下载安装",
      "打开 Clash 系统代理或 TUN，确认走日本 IP",
      "用刚注册的邮箱登录；网页端想用 BitBrowser 可自选，非必须",
    ],
  },
  {
    id: 5,
    rail: "开通 Max",
    title: "用同一张 U 卡开通 Max",
    summary: "档位按第 1 步选的来，卡号和账单地址照着填，卡里的钱已经够。",
    priceLabel: "Claude Max 官方订阅",
    priceAmount: OFFICIAL_DIRECT_PRICE,
    priceNote: "在 Claude 官网直接付款",
    vendorPayable: "Claude Max（官网刷 U 卡）",
    actionButton: "已开通，去验收",
    links: [{ href: "https://claude.ai/upgrade", label: "打开 Claude 订阅页" }],
    guide: [
      "打开 Claude 的 Upgrade 页面，选 Max 档位",
      "填第 1 步那张 U 卡的卡号、有效期、安全码和账单地址",
      "扣款在 Anthropic 和发卡方之间完成",
    ],
  },
];

export function stepById(id: StepId): StepDef {
  const step = STEPS.find((item) => item.id === id);
  if (!step) {
    throw new Error(`未知步骤 ${id}`);
  }
  return step;
}
