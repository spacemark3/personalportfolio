# The people who supported me

The background of `/[locale]/inspiration/`, behind the closing line, lit by the
flashlight cursor. Drop image files here, then add one
`person("file.webp", "who they are")` line each to `people` in
`content/content.ts` — the list is explicit, not globbed, the same way the
sketchbook's is.

The file name is only a key. Nothing on the page ever shows it, and no caption
is drawn: this is a crowd, not a gallery.

## Two shapes

**One entry** is a collage you assembled yourself in an image editor. It covers
the screen edge to edge (`object-fit: cover`), which is the layout the page was
drawn against. Want ~2000px wide, and it can afford ~300KB.

**Several entries** tile into a square mosaic and the browser assembles the
collage for you. Tiles cap at about 190px on screen, so ~600px on the long edge
and ~40KB each — that keeps a 24-photo wall near 1MB. They are square-cropped
by CSS, so faces want to be near the middle of the frame.

## Budget

Either way, this folder is the inspiration page's entire first-paint weight,
the way `public/work/sketchbook/` is the home page's. Nothing here is optimized
at build time: GitHub Pages has no image optimizer and `next.config.mjs` sets
`images: { unoptimized: true }`, so the file you commit is the file that ships.
WebP, and check the size before committing.
