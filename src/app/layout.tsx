import type { Metadata } from "next";

import { DISCLAIMER_SENTENCE } from "@/lib/catalog";

import "./globals.css";

export const metadata: Metadata = {
  title: "Claude DIY 账号向导",
  description: DISCLAIMER_SENTENCE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
