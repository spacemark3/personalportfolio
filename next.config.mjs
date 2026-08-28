import { fileURLToPath } from "url";
import { dirname } from "path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves this repo from https://spacemark3.github.io/personalportfolio/,
// so every route and asset lives under that prefix.
const basePath = "/personalportfolio";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // static HTML export — GitHub Pages is a plain file host, no Node server
  output: "export",
  basePath,
  // project-page URLs need the prefix on hand-written public/ references too
  // (next/link and next/font add it themselves; next/image does not once
  // images are unoptimized) — see lib/asset.ts
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // every page exports to <route>/index.html, so Pages resolves directory
  // URLs without relying on its .html fallback
  trailingSlash: true,
  // pin tracing to THIS project — a stray ~/package-lock.json otherwise makes
  // Next infer the home dir as the workspace root (breaks dev HMR + deploys)
  outputFileTracingRoot: projectRoot,
  // no image optimization server on GitHub Pages: ship the source files as-is
  images: { unoptimized: true },
};

export default nextConfig;
