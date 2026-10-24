"use client";

import dynamic from "next/dynamic";

const Wizard = dynamic(
  () => import("@/components/wizard").then((mod) => mod.Wizard),
  {
    ssr: false,
    loading: () => (
      <p className="px-6 py-10 text-sm text-muted-foreground">正在打开向导…</p>
    ),
  },
);

export default function Home() {
  return <Wizard />;
}
