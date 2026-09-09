# Source photos for the inspiration background

The originals of the people on the inspiration page. Nothing here ships —
everything except this README is gitignored, the same way `sketchbook-src/` is.

These are the working set you pull from when you assemble the collage. Keep
them here even after a collage is built: the next version of it starts from
this folder, not from the flattened WebP.

## How the collage gets made

**By hand, in an image editor.** Photopea (free, browser, no account) is what
the current one was made in; Canva and Photoshop do the job equally well.

This used to be done by a packing script, and it isn't any more. Arranging a
collage is a composition — which faces are large, what sits beside what, how
the colours group across the canvas — and two generations of packer failed to
get near it. They're in the git history if you're curious why.

Export as PNG or JPG, at roughly **1920–2400px wide**. Aspect ratio is up to
you; see the note about phones below.

## Then fit it to the page

    npm run inspiration-bg -- path/to/your-export.png

That writes `public/inspiration/collage.webp` and prints the line that should
be in `content/content.ts`. It handles the parts that are easy to get wrong:
stepping quality down until the file is under the page's weight budget,
flattening any transparency onto the page's own near-black, and refusing to
upscale. Add `--check` to see the numbers without writing anything.

Re-run it every time you re-export. The WebP in `public/` is what ships, so an
edit that never goes through this command never reaches the site.

## Two things worth knowing before you compose

**Faces want to be big.** The flashlight's usable beam covers roughly 470px of
screen. A face that occupies less than about 150px of the collage gets lit as
texture rather than as a person, which defeats the whole page.

**Phones see a band, not the whole picture.** On a touch device the collage is
fitted rather than cropped — the full width is visible with black above and
below — so on a tall phone a 16:9 collage occupies only the middle ~40% of the
screen. That is deliberate. But the beam is tuned to sweep that band
(`ip-beam-drift-y` in `app/globals.css`), so if you export a much squarer
collage, widen its range to match.

**Don't put the closing line in the image.** *"and the universe said i love you
because you are love"* is live text on the page — translated, in the
accessibility tree, and animated. Baked into the collage you would get it
twice.
