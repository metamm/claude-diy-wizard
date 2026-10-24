import { ChevronDown, ShieldAlert } from "lucide-react";

import { DISCLAIMER_POINTS, DISCLAIMER_SENTENCE, FEE_SCOPE, HONEST_TALK, REGIONS_POLICY_URL, SUCCESS_RATE_NOTE } from "@/lib/catalog";

export function Disclaimer() {
  return (
    <section aria-label="免责说明" className="mt-12 border-t border-border pt-6">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[13px] leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">不担保开号。</span>
            {DISCLAIMER_SENTENCE}
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{HONEST_TALK}</p>
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">成功率约 75%。</span>
            {SUCCESS_RATE_NOTE}
          </p>
          <details className="group mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              完整条款
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-3 grid gap-1.5 text-xs leading-5 text-muted-foreground">
              {DISCLAIMER_POINTS.map((point) => (
                <li key={point}>· {point}</li>
              ))}
              <li className="mt-1">{FEE_SCOPE}</li>
              <li>
                官方地区政策：
                <a href={REGIONS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  Anthropic Supported Regions
                </a>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}
