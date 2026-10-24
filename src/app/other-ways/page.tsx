import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Disclaimer } from "@/components/disclaimer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "用其他方式使用 Claude · Claude DIY 向导",
  description: "不自己开 Claude 账号，也能在 Cursor 等产品里用 Claude 模型。",
};

type Way = {
  name: string;
  tag: string;
  recommended?: boolean;
  fit: string;
  steps: string[];
  billing: string;
  caveat: string;
  links: { href: string; label: string }[];
};

const WAYS: Way[] = [
  {
    name: "Cursor",
    tag: "订阅 + 按用量",
    recommended: true,
    fit: "写代码、做项目，想在编辑器或 Agent 里直接让 Claude 干活。",
    steps: [
      "下载 Cursor，注册登录",
      "订阅 Premium（$30 / 月）或更高档位，用自己能付款的卡充值",
      "在对话框的模型列表里选 Claude（如 Claude Opus 5.5、Sonnet 5.5）",
    ],
    billing: "Claude 等第三方模型按 API 标价单独计用量，不含在月费里；Plus（$8 / 月）只能用 Grok 模型。",
    caveat: "用的是 Cursor 账号，不是 Claude 账号：没有 claude.ai 网页版、Claude Desktop 和 Max 订阅。",
    links: [
      { href: "https://cursor.com/pricing", label: "Cursor 定价" },
      { href: "https://cursor.com/download", label: "下载 Cursor" },
    ],
  },
  {
    name: "GitHub Copilot",
    tag: "订阅",
    fit: "已经在用 GitHub / VS Code，想在 Copilot Chat 里切到 Claude 模型。",
    steps: ["开通 Copilot 订阅", "在 VS Code 等编辑器装 Copilot 扩展并登录 GitHub", "在 Copilot Chat 的模型选择里选 Claude"],
    billing: "按 GitHub 官网标价；可用的 Claude 型号和额度随套餐不同。",
    caveat: "只能在 Copilot 支持的编辑器和 GitHub 网页里用。",
    links: [{ href: "https://github.com/features/copilot", label: "GitHub Copilot" }],
  },
  {
    name: "Amazon Bedrock / Google Vertex AI",
    tag: "按量 API",
    fit: "开发者或公司，要用 API 把 Claude 接进自己的产品。",
    steps: ["开通 AWS 或 Google Cloud 账号并绑卡", "在控制台申请开通 Claude 模型", "用各家 SDK 按模型 ID 调用"],
    billing: "按 token 用量计费，价格以云厂商官网为准。",
    caveat: "要会写代码；没有聊天界面，开通要求和可用区域以云厂商为准。",
    links: [
      { href: "https://aws.amazon.com/bedrock/claude/", label: "Amazon Bedrock" },
      { href: "https://cloud.google.com/vertex-ai", label: "Google Vertex AI" },
    ],
  },
];

export default function OtherWaysPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="other" />
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-16 lg:pt-14">
        <p className="text-sm font-medium text-brand">不开 Claude 账号也能用</p>
        <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]">用其他方式使用 Claude</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          不想自己办 U 卡、日本 IP 和日本手机号？下面这些产品里也能用 Claude 模型。它们用的是各自的账号和计费，能不能开通、在哪些地区可用，以各家官网条款为准。
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {WAYS.map((w) => (
            <section
              key={w.name}
              className={
                w.recommended
                  ? "rounded-2xl border-2 border-brand bg-card px-6 py-5 sm:px-7"
                  : "rounded-2xl border border-border bg-card px-6 py-5 sm:px-7"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[18px] font-semibold tracking-tight">{w.name}</h2>
                <div className="flex items-center gap-1.5">
                  {w.recommended ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-white">最省事</span>
                  ) : null}
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">{w.tag}</span>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">适合：{w.fit}</p>
              <ol className="mt-4 grid gap-2 text-[14px]">
                {w.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid gap-1.5 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">费用：</span>
                  {w.billing}
                </p>
                <p>
                  <span className="font-medium text-foreground">注意：</span>
                  {w.caveat}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {w.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
                  >
                    {l.label}
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          想要自己名下的 Claude 账号、claude.ai 网页版、Claude Desktop 和 Max 订阅，还是走五步开号向导。
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/85"
        >
          <ArrowLeft className="size-4" />
          回到开号向导
        </Link>

        <Disclaimer />
      </main>
    </div>
  );
}
