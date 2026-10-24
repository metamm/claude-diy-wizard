import Link from "next/link";
import type { ReactNode } from "react";
import { Asterisk } from "lucide-react";

import { cn } from "@/lib/utils";

export function SiteHeader({ active, children }: { active?: "wizard" | "other"; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-brand text-white">
              <Asterisk className="size-4" strokeWidth={2.5} />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">Claude DIY 向导</span>
          </Link>
          <nav aria-label="主菜单" className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                active === "wizard" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              开号向导
            </Link>
            <Link
              href="/other-ways"
              className={cn(
                "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors",
                active === "other" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">其他方式</span>
              <span className="hidden sm:inline">用其他方式使用 Claude</span>
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}
