# Raw scans go here

Everything in this folder is gitignored except this file — the originals are
big and stay on your machine. Only the processed spreads under
`public/work/sketchbook/` get committed.

**You never have to resize anything.** Scan at whatever resolution you like;
the script fits each page for you.

## Adding a page

1. **Scan the page.** Flat, the whole page, any resolution. JPEG is fine — so
   are PNG, HEIC, WebP and TIFF.
2. **Name it with the side it goes on**, and the caption you want:
   `kimono - right.jpg` shows the caption "Kimono".
3. **Run** `npm run sketchbook`
4. **Paste** the lines it prints into the `sketchbook` array in
   `content/content.ts`.

## Putting two separate scans on one view

Two different drawings, each its own file, sharing one two-page spread (one on
the left, one on the right):

1. **Drop both files in this folder.** Not `scripts/`, not
   `public/work/sketchbook/` — this folder only.
2. **Give both files the exact same name before the suffix.** That shared name
   becomes the caption, and it's how the script knows they belong together.
3. **Suffix one `- left` and the other `- right`.**

```
sketchbook-src/ocean - left.jpg
sketchbook-src/ocean - right.jpg
```

4. **Run** `npm run sketchbook` — you should see ONE line printed
   (`mounted("ocean", "Ocean")`), not two. Two separate lines means they didn't
   pair up (see below).
5. **Paste** that one line into `content/content.ts`.

**The name before the suffix must match exactly** — same spelling, same
capitalization, same spacing. `Ocean - left.jpg` and `ocean - right.jpg` will
NOT pair (different case), and neither will `fly1 - left.jpg` and
`fly2 - right.jpg` (different word). A mismatch doesn't error — it just quietly
ships as two separate one-sided spreads instead of one combined spread, so it's
easy to miss. Easiest habit: type both filenames in all lowercase.

Two related, simpler cases:

- **One file that already covers the whole spread** (a single wide drawing
  crossing the spine): use `- spread` instead, just the one file —
  `ocean - spread.jpg`.
- **One file with a blank page facing it**: suffix it alone, e.g.
  `ocean - right.jpg` with no matching `ocean - left` file. Ships with the
  other page empty.

## The suffix decides everything

| Filename | What you get |
|---|---|
| `spring - left.jpg` **and** `spring - right.jpg` | one spread "Spring", both pages filled |
| `kimono - right.jpg` | spread "Kimono" on the right page, blank page facing it |
| `duomo - spread.jpg` | one image across both pages, over the spine |
| `whatever.jpg` (no suffix) | treated as a **photo of an open book** — see below |

A `left` and a `right` sharing the same base name become one spread. The
separator is loose: `foo - left`, `foo-left` and `foo_left` all work.

## Two kinds of source

**Scans of a single page** (suffixed) get mounted into
`scripts/book-template.png` — a photo of a real blank sketchbook. Your drawing
is multiplied onto its paper, so the white of your scan drops out and the
book's cream paper and texture read through. It looks drawn in the book rather
than pasted onto it. These come out at 1920x1080 so pencil detail survives.

**Photos of an open sketchbook** (no suffix) keep the original behaviour: the
script cuts the background away and uses the book in your photo. Shoot on a
surface clearly darker than the paper. These come out at 1280x720.

Both can live in the flipbook at once — the sizes differ but both are 16:9,
which is all the animation cares about.

## If something looks wrong

**The page looks flat grey instead of cream.** Your scan's paper is darker than
the script assumed, so multiply tinted the whole page. Lift it:
`npm run sketchbook -- --white 230`

**Your drawing got cropped at the edges.** The scan is fitted to fill the page,
which crops whichever dimension overflows. To letterbox it instead:
`npm run sketchbook -- --fit contain`

**A fold cuts through a drawing.** Mounted spreads put the spine exactly on the
fold line, so this shouldn't happen — but for a photographed book, create
`spine.json` here:

```json
{ "duomo": 14 }
```

The number nudges that book sideways in output pixels; positive moves it right.

**A photo of an open book kept its background** (or lost too much of the book):
`npm run sketchbook -- --tolerance 45` (keeps less) or `--tolerance 18` (keeps
more).

## All the commands

```
npm run sketchbook                    import new scans
npm run sketchbook -- --check         measure everything, write nothing
npm run sketchbook -- --existing      re-compress what's already shipped
npm run sketchbook -- --all           both
npm run sketchbook -- --white 230     lift a duller scan's paper to white
npm run sketchbook -- --fit contain   letterbox scans instead of cropping
npm run sketchbook -- --paste         don't multiply; paste the scan flat
npm run sketchbook -- --tolerance 45  photo path: looser background matching
npm run sketchbook -- --no-key        photo path: use the file exactly as-is
```

## Changing the book

`scripts/book-template.png` is the blank sketchbook everything gets mounted
into. To swap it, the measurements at the top of `scripts/sketchbook.mjs`
(`TPL`) need re-measuring for the new photo: the book's bounding box, the
spine's x position, the two page rectangles, and the hue threshold that
separates paper from backdrop.
