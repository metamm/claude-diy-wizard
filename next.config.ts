import type { NextConfig } from "next";

const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  ...(staticExport ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  turbopack: {
    resolveAlias: {
      "@/lib/kv": { browser: "./src/lib/kv.browser.ts" },
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
