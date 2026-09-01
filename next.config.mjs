import { fileURLToPath } from "url";
import { dirname } from "path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves this repo from https://spacemark3.github.io/personalportfolio/,
// so every route and asset lives under that prefix in production. Dev stays
// at the bare root so `next dev` is reachable at plain localhost:3000.
const basePath = "/personalportfolio";
const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // static HTML export — GitHub Pages is a plain file host, no Node server
  output: "export",
  basePath: isDev ? undefined : basePath,
  // project-page URLs need the prefix on hand-written public/ references too
  // (next/link and next/font add it themselves; next/image does not once
  // images are unoptimized) — see lib/asset.ts
  env: { NEXT_PUBLIC_BASE_PATH: isDev ? "" : basePath },
  // every page exports to <route>/index.html, so Pages resolves directory
  // URLs without relying on its .html fallback
  trailingSlash: true,
  // pin tracing to THIS project — a stray ~/package-lock.json otherwise makes
  // Next infer the home dir as the workspace root (breaks dev HMR + deploys)
  outputFileTracingRoot: projectRoot,
  // no image optimization server on GitHub Pages: ship the source files as-is
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    if (dev) {
      // Webpack's on-disk cache reads each .pack.gz back as ONE contiguous
      // Uint8Array. Those packs had grown past 20 MB apiece (dev and prod
      // caches share .next/cache/webpack), and on a memory-tight machine the
      // allocation eventually fails — "RangeError: Array buffer allocation
      // failed", which kills the dev server. In-memory cache never serializes,
      // so nothing large is ever allocated at once; the only cost is a full
      // recompile on a cold start, which is cheap on a project this size.
      config.cache = { type: "memory" };
      // don't watch build output: `out/` is a full copy of the exported site
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/out/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
