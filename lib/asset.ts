// Prefix for files served straight out of public/. next/link, next/font and
// the /_next/* bundles pick up `basePath` on their own, but a URL written by
// hand — a CSS mask, an unoptimized next/image src — does not, so it has to
// go through here. Empty string when the site is served from the root.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${basePath}${path}`;
