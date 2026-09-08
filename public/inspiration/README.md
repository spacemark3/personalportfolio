# The inspiration page's background

This folder holds what SHIPS. You don't hand-place anything here — put the raw
photos in `inspiration-src/` and run

    npm run collage

which packs them into `collage.webp` here and prints the line for
`content/content.ts`. See `inspiration-src/README.md` for the details.

## Doing it by hand instead

The page doesn't care where the image came from. `people` in
`content/content.ts` takes two shapes:

- **one entry** — a collage, however it was made, covering the screen edge to
  edge with `object-fit: cover`. This is what the script produces.
- **several entries** — the browser tiles them into a square mosaic instead.
  Simpler, but it reads as a contact sheet, and it costs roughly 4x the bytes
  because every tile ships at 2x its own size.

If you assemble a collage yourself, aim for ~2000px wide and keep it under
~400KB as WebP. It sits behind a 74%-opaque mask, so quality far below what
you'd accept for a hero image is undetectable here.

## Budget

Whatever is in this folder is the inspiration page's entire first-paint weight,
the way `public/work/sketchbook/` is the home page's. Nothing is optimized at
build time — GitHub Pages has no image optimizer and `next.config.mjs` sets
`images: { unoptimized: true }` — so the file you commit is the file that ships.
