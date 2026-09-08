// Builds the inspiration page's background: one collage out of however many
// photos you drop into inspiration-src/.
//
//   node scripts/collage.mjs              build public/inspiration/collage.webp
//   node scripts/collage.mjs --check      measure and report, write nothing
//
//   --width 2000     canvas width; the height is an OUTPUT, see below
//   --ratio 1.6      the width:height the search aims for (16:10, as the
//                    reference collage is)
//   --budget 400     KB ceiling; quality steps down until the file fits
//   --quality 62     starting WebP quality
//   --seed 7         shuffle/jitter seed — same folder, same collage
//   --gap 0          px between photos, if you want them to breathe
//
// ---- why one file and not a grid of <img> ----
//
// The page paints this behind a mask that is 74% opaque everywhere except the
// ~470px the cursor is lighting. A CSS mosaic would ship every photo at 2x its
// tile size, so its cost scales with the number of people. A collage's cost is
// its OUTPUT dimensions: forty faces weigh what ten do. Packing is, in effect,
// compression.
//
// ---- the layout: justified rows ----
//
// The packing a photo gallery uses, and what the reference collage does: fill a
// row left to right at some target height, then scale the finished row so it
// spans the canvas exactly. Rows butt edge to edge, which is what makes it read
// as one surface rather than a contact sheet. Row heights are jittered so big
// photos and small ones mix the way they do in a collage made by hand, and the
// jitter comes from a seeded PRNG so a rebuild is never a surprise diff.
//
// ---- the canvas height is an output, not an input ----
//
// This is the part worth knowing before changing anything here. A row's height
// works out to `W / sum(aspect)` of the photos in it — it depends only on which
// photos landed in that row. So the total heights a given set of photos can
// produce form a coarse, STEPPED set, and a fixed canvas height is usually not
// one of the steps.
//
// Forcing one means stretching the rows to reach it, and that stretch comes
// straight out of every photo as a horizontal crop. An earlier version of this
// script did exactly that and cropped 44% off every photo to fill a 16:10 box.
//
// So --ratio is a target the search AIMS at: the script scans row heights, keeps
// the packing that lands nearest, and then makes the canvas whatever that
// packing actually came to. Every photo keeps its exact aspect ratio and
// nothing is cropped. The page covers the screen with `object-fit: cover`
// regardless, so a few percent off the target ratio costs nothing.
//
// ---- the two numbers to watch ----
//
// FACE SIZE. The beam's bright core is ~230px on screen and its usable light
// ~470px. At a 2000px canvas on a 1440px screen that is ~650px of collage, so a
// photo wants to be roughly 180-320px tall here: smaller and the beam lights a
// texture rather than a person. More photos means smaller photos — the script
// reports the median and says so when it gets thin. The answer is a wider
// canvas, which costs bytes.
//
// WEIGHT. This file is the page's whole first-paint weight, the way
// public/work/sketchbook/ is the home page's. Quality steps down until the
// output fits --budget. Dense photographic collages compress badly, so the
// default quality is deliberately low: under a 74% mask it is not detectable.

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "inspiration-src");
const OUT_DIR = path.join(root, "public", "inspiration");
const OUT = path.join(OUT_DIR, "collage.webp");

// ---- options ----
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const W = Number(opt("width", 2000));
const RATIO = Number(opt("ratio", 1.6));
const AIM_H = Math.round(W / RATIO); // what the search aims at, not a constraint
const BUDGET = Number(opt("budget", 400)) * 1024;
const Q_START = Number(opt("quality", 62));
const Q_FLOOR = Number(opt("min-quality", 20));
const SEED = Number(opt("seed", 7));
const GAP = Number(opt("gap", 0));
const BG = opt("bg", "#060608"); // the dark page's own ground
const CHECK = flag("check");

const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// deterministic shuffle + jitter, so the same folder rebuilds identically
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function readSources() {
  if (!existsSync(SRC)) {
    console.error(`\nNo ${path.relative(root, SRC)}/ — create it and drop the photos in.\n`);
    process.exit(1);
  }
  const names = (await readdir(SRC)).filter((f) => EXT.has(path.extname(f).toLowerCase()));
  if (!names.length) {
    console.error(`\n${path.relative(root, SRC)}/ has no images in it.\n`);
    process.exit(1);
  }

  const items = [];
  for (const name of names) {
    const file = path.join(SRC, name);
    const m = await sharp(file).metadata();
    // EXIF orientation 5-8 means the stored pixels sit a quarter turn from how
    // the photo should read. Phone photos land here constantly, and taking the
    // raw width/height would size a portrait as a landscape.
    const turned = m.orientation >= 5 && m.orientation <= 8;
    const w = turned ? m.height : m.width;
    const h = turned ? m.width : m.height;
    if (!w || !h) {
      console.warn(`  skipped (no dimensions): ${name}`);
      continue;
    }
    items.push({ name, file, aspect: w / h });
  }
  return items;
}

// What a set of photos comes to once justified across the canvas. This is the
// whole geometry of the layout in one line: a row's height is decided by the
// photos in it and nothing else.
const rowHeight = (items, target) => {
  const natural = items.reduce((s, it) => s + target * it.aspect, 0);
  return (target * (W - GAP * (items.length - 1))) / natural;
};

// Fill rows left to right at `base * jitter[row]` tall, closing a row once it
// has passed the canvas width.
function pack(items, base, jitter) {
  const rows = [];
  let row = [];
  let wide = 0;
  let target = base * jitter[0];

  for (const it of items) {
    row.push(it);
    wide += target * it.aspect + GAP;
    if (wide >= W) {
      rows.push({ items: row, target });
      row = [];
      wide = 0;
      target = base * jitter[rows.length % jitter.length];
    }
  }

  // The tail row is the one that can go wrong. It holds whatever is left over,
  // and justifying two photos across 2000px makes a row 900px tall — one
  // enormous band under a collage of small ones. So if the leftovers would
  // stand more than ~1.7x the target, they go into the row above instead,
  // which absorbs them by getting slightly shorter.
  if (row.length) {
    if (rows.length && rowHeight(row, target) > base * 1.7) {
      rows[rows.length - 1].items.push(...row);
    } else {
      rows.push({ items: row, target });
    }
  }

  return rows.map((r) => ({ items: r.items, height: rowHeight(r.items, r.target) }));
}

const totalHeight = (rows) =>
  rows.reduce((s, r) => s + r.height, 0) + GAP * Math.max(0, rows.length - 1);

async function main() {
  const items = await readSources();
  const rnd = mulberry32(SEED);

  // shuffle so neighbours aren't whatever order the filesystem returned
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  // A fixed jitter table rather than live rnd() calls, so pack() is a pure
  // function of `base` and the scan below compares like with like.
  const jitter = Array.from({ length: 64 }, () => 0.72 + rnd() * 0.78);

  // Start from the row height the area implies rather than searching blind:
  // give each photo an equal share of W x AIM_H, and a photo of that area at
  // aspect a stands sqrt(area / a) tall. Scanning the whole range instead let
  // the search "win" with degenerate packings — three rows, one of them 1143px
  // tall — because they happened to total the right number.
  const avgAspect = items.reduce((s, it) => s + it.aspect, 0) / items.length;
  const base0 = Math.sqrt((W * AIM_H) / (items.length * avgAspect));

  // then a bounded scan around it for the packing that lands nearest the aimed
  // ratio. Total height only moves when a photo changes rows, so there is
  // nothing to converge on — just take the best candidate.
  let best = null;
  for (let base = base0 * 0.55; base <= base0 * 1.8; base += 1) {
    const rows = pack(items, base, jitter);
    const err = Math.abs(totalHeight(rows) - AIM_H);
    if (!best || err < best.err) best = { rows, err };
  }
  const rows = best.rows;
  const H = Math.round(totalHeight(rows)); // the canvas is what the packing came to

  const parts = [];
  const sizes = [];
  let placed = 0;
  let y = 0;
  for (const row of rows) {
    const rowH = Math.max(1, Math.round(row.height));
    // widths solved against THIS row's rounded height so they close on W
    // exactly; every one is still the photo's own aspect
    const spread = W - GAP * (row.items.length - 1);
    const natural = row.items.reduce((s, it) => s + rowH * it.aspect, 0);
    const fit = spread / natural;

    let x = 0;
    for (const [i, it] of row.items.entries()) {
      const last = i === row.items.length - 1;
      // the last photo absorbs the rounding, so the row ends flush on W
      const w = last ? W - x : Math.round(rowH * it.aspect * fit);
      if (w <= 0) continue;
      sizes.push(rowH);
      placed++;
      parts.push({
        input: await sharp(it.file)
          .rotate() // apply the EXIF orientation for real
          // the width already follows this photo's aspect, so `cover` only
          // ever takes up rounding — a pixel, not a composition
          .resize(w, rowH, { fit: "cover" })
          .toBuffer(),
        left: x,
        top: y,
      });
      x += w + GAP;
    }
    y += rowH + GAP;
  }

  sizes.sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;

  console.log(
    `\n  ${items.length} photos -> ${rows.length} rows, ` +
      `${W}x${H} (${(W / H).toFixed(2)}:1, aimed ${RATIO}:1)`
  );
  console.log(`  photo height: median ${median}px (min ${sizes[0]}, max ${sizes.at(-1)})`);
  if (placed !== items.length) {
    console.log(`  ! placed ${placed} of ${items.length} — that is a bug, not a setting`);
  }
  if (median < 150) {
    console.log(
      `  ! under ~150px the beam lights texture rather than faces —\n` +
        `    raise --width (currently ${W}) or use fewer photos`
    );
  }

  if (CHECK) {
    console.log("\n  --check: nothing written\n");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  // Step quality down until it fits the budget. `used` tracks the quality the
  // file on disk was actually written at — the loop variable has already been
  // decremented past the floor by the time it exits, and reporting that would
  // name a quality that was never encoded.
  let used = Q_START;
  let bytes = Infinity;
  for (let quality = Q_START; quality >= Q_FLOOR; quality -= 6) {
    await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
      .composite(parts)
      .webp({ quality, effort: 6 })
      .toFile(OUT);
    used = quality;
    bytes = statSync(OUT).size;
    if (bytes <= BUDGET) break;
  }

  console.log(`\n  wrote ${path.relative(root, OUT)} — ${kb(bytes)} at quality ${used}`);
  if (bytes > BUDGET) {
    console.log(`  ! over the ${kb(BUDGET)} budget even at quality ${quality};`);
    console.log(`    lower --width, or raise --budget if you mean it`);
  }
  console.log(`\n  content/content.ts:\n`);
  console.log(`    export const people: Person[] = [`);
  console.log(`      person("collage.webp", "the people who supported me"),`);
  console.log(`    ];\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
