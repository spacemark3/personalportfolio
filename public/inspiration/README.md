# The inspiration page's background

This folder holds what SHIPS: `collage.webp`, and nothing else.

Don't hand-place a file here. Assemble the collage in an image editor from the
originals in `inspiration-src/`, then run

    npm run inspiration-bg -- path/to/your-export.png

which writes `collage.webp` here at a quality that fits the page's weight
budget, and prints the line for `content/content.ts`. See
`inspiration-src/README.md` for how to compose one.

## Doing it entirely by hand

The page doesn't care where the image came from. `people` in
`content/content.ts` takes two shapes:

- **one entry** — a collage, however it was made, filling the screen. This is
  the layout the page was drawn against, and what ships today.
- **several entries** — the browser tiles them into a square mosaic instead.
  Simpler, but it reads as a contact sheet, and it costs roughly 4x the bytes
  because every tile ships at 2x its own size.

If you skip the script, aim for ~2000px wide and keep it under ~400KB as WebP.
It sits behind a 74%-opaque mask, so quality well below what you'd accept for a
hero image is undetectable here.

## Budget

Whatever is in this folder is the inspiration page's entire first-paint weight,
the way `public/work/sketchbook/` is the home page's. Nothing is optimized at
build time — GitHub Pages has no image optimizer and `next.config.mjs` sets
`images: { unoptimized: true }` — so the file you commit is the file that
ships. That is the whole reason the script exists: a raw editor export runs
several megabytes.
