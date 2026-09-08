# Raw photos for the inspiration collage

Drop the photos of the people who supported you in here — any mix of JPEG, PNG,
WebP, AVIF or TIFF, any orientation, straight off a phone is fine. Nothing in
this folder ships; it is the input to

    npm run collage

which packs them into one `public/inspiration/collage.webp` and prints the line
to paste into `content/content.ts`. Everything here except this README is
gitignored, the same way `sketchbook-src/` is.

## What the script needs from you

**Nothing cropped.** The layout keeps every photo's own aspect ratio, so a
portrait stays a portrait. EXIF rotation is applied for you.

**Reasonable resolution.** Anything from ~800px on the long edge up is plenty —
photos end up roughly 200-300px tall in the collage. Bigger sources are fine,
just slower to process.

## The two numbers it reports

**Photo height.** The flashlight's usable beam covers ~650px of collage, so a
photo wants to be ~180-320px tall for the beam to light a *person* rather than
a texture. More photos means smaller photos: the script warns under 150px, and
the fix is `--width 2400` (which costs bytes) or fewer photos.

**Weight.** The collage is this page's entire first-paint weight. Quality steps
down until it fits `--budget` (400KB by default). For reference, 60 photos at
`--width 2000` came out around 375KB — where the same 60 as a CSS mosaic would
have been 1.4MB.

## Adding someone later

Drop the photo in, re-run `npm run collage`. The shuffle is seeded, so the
collage only changes as much as the new photo forces. Pass `--seed 12` (or any
number) if you want a completely different arrangement.
