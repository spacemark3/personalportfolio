// Builds the flipbook's spreads out of whatever you scanned or photographed,
// and re-compresses the ones already shipped.
//
// There are two ways in, chosen by the filename:
//
//   MOUNT  `kimono - right.jpg`   a flat scan of ONE page, mounted into
//                                 scripts/book-template.png so it reads as a
//                                 drawing in an actual sketchbook
//   PHOTO  `kimono.jpg`           a photo of an OPEN book, background cut out
//
// Suffixes are `- left`, `- right` and `- spread`; a left and a right sharing
// the same base name become one spread. Anything unsuffixed takes the photo
// path, so both workflows coexist.
//
// The flipbook (components/Sketchbook.tsx + the .sb-* block in globals.css)
// makes three demands that this script exists to satisfy automatically:
//
//   1. every spread is 16:9 — .sb-book takes its aspect-ratio from pages[0]
//      alone, so sizes may differ but the RATIO may not
//   2. the spine sits on the canvas midpoint — .sb-half is width:50% and
//      .sb-flap folds around that line, so an off-centre spine folds THROUGH
//      the drawing. The template's pages are asymmetric (649 vs 674), so
//      mounted spreads align the SPINE, never the bounding box
//   3. the margins stay transparent — the green hero name shows through them,
//      and .sb-book::before hardcodes the shadow to the book's footprint
//
// And one from next.config.mjs: `images: { unoptimized: true }` (static export
// to GitHub Pages) means next/image ships these files untouched, while
// .sb-preload fetches EVERY one of them with `priority` on first paint. The
// folder's total size is the homepage's first-paint weight, so every spread
// gets quantised to a 128-colour palette — line art on cream paper loses
// nothing visible, and it beats WebP on this material.
//
//   node scripts/sketchbook.mjs                process sketchbook-src/ -> public/
//   node scripts/sketchbook.mjs --existing     re-compress what's already shipped
//   node scripts/sketchbook.mjs --all          both
//   node scripts/sketchbook.mjs --check        measure only, write nothing
//   node scripts/sketchbook.mjs --white 230    lift a duller scan's paper to white
//   node scripts/sketchbook.mjs --fit contain  letterbox scans instead of cropping
//   node scripts/sketchbook.mjs --paste        don't multiply; paste the scan flat
//   node scripts/sketchbook.mjs --tolerance 45 photo path: looser background match
//   node scripts/sketchbook.mjs --key          photo path: force the cut-out
//   node scripts/sketchbook.mjs --no-key       photo path: never cut out

import sharp from "sharp";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "sketchbook-src");
const OUT = path.join(root, "public", "work", "sketchbook");
const TEMPLATE = path.join(root, "scripts", "book-template.png");

// ---- the output frame -------------------------------------------------
// All of these are quoted against a 1280-wide canvas and scaled from there,
// so a bigger canvas keeps the book at the same share of the frame.
const BASE_W = 1280;
// Footprint to fit the book into, measured off the nine original spreads
// (their bounding boxes run 772-841 wide by 629-664 tall). Staying inside this
// keeps the hardcoded .sb-book::before shadow hugging the book.
const FIT_W = 810;
const FIT_H = 645;
const CENTRE_X = 640; // the spine — must be the canvas midpoint, see (2) above
const CENTRE_Y = 347; // matches the originals' vertical placement
const BUDGET_KB = 250;

/** Everything the output canvas needs, scaled from the 1280-wide reference. */
function frame(canvasW) {
  const k = canvasW / BASE_W;
  return {
    W: canvasW,
    H: Math.round((canvasW * 9) / 16),
    fitW: FIT_W * k,
    fitH: FIT_H * k,
    cx: CENTRE_X * k,
    cy: CENTRE_Y * k,
    budget: BUDGET_KB * k * k, // the budget is per-pixel, so it scales by area
  };
}

// Photo spreads stay at the size their source actually is. Mounted spreads go
// bigger: at 1280 each page is only ~397px wide and pencil turns to mush; at
// 1920 it's ~596px and the template still scales DOWN (0.92x), so the book
// frame stays crisp. Anything larger upscales the template and softens it.
const PHOTO_CANVAS_W = 1280;
const MOUNT_CANVAS_W = 1920;

// ---- book-template.png ------------------------------------------------
// Measured off the file. Between y=150 and y=1000 its page edges move less
// than 8px, so plain rectangles are enough — no perspective warp.
const TPL = {
  spine: 685,
  book: { x0: 36, y0: 30, x1: 1358, y1: 1076 },
  pages: {
    left: { x0: 37, y0: 30, x1: 680, y1: 1076 },
    right: { x0: 690, y0: 30, x1: 1357, y1: 1076 },
    spread: { x0: 37, y0: 30, x1: 1357, y1: 1076 },
  },
  // Brightness barely separates the backdrop (231,232,236) from the paper
  // (240,236,230) — about 8 levels. Hue separates them cleanly: b-r is
  // bimodal, paper at -17..-9 and backdrop at +2..+7 with nothing between.
  hueCut: -4,
};

// A scan's paper rarely reads as pure 255; lift it so multiply drops it out
// completely instead of tinting the whole page.
const SCAN_WHITE = 242;

// ---- photo path -------------------------------------------------------
const ALPHA_FLOOR = 8; // a pixel is "book" above this alpha
const KEY_MAX_EDGE = 1600; // key on a downscaled copy; 12 MP buys only time
const KEY_TOLERANCE = 30; // neighbour-to-neighbour RGB drift still counted as background

const PNG_OPTS = { palette: true, colours: 128, compressionLevel: 9, effort: 10 };
const INPUT_EXT = new Set([".png", ".webp", ".jpg", ".jpeg", ".heic", ".heif", ".tif", ".tiff"]);

const kb = (n) => `${Math.round(n / 1024)} KB`;
const pad = (s, n) => String(s).padEnd(n);
const pct = (n) => `${Math.round(n * 100)}%`;

const ESC = String.fromCharCode(27) + "[";
const c = {
  dim: (s) => `${ESC}2m${s}${ESC}0m`,
  red: (s) => `${ESC}31m${s}${ESC}0m`,
  yellow: (s) => `${ESC}33m${s}${ESC}0m`,
  green: (s) => `${ESC}32m${s}${ESC}0m`,
  bold: (s) => `${ESC}1m${s}${ESC}0m`,
};

// =======================================================================
//  naming
// =======================================================================

/** Filenames follow the shipped convention: lowercase, spaces kept, and any
 *  character Windows won't allow in a path swapped for "_" (see the
 *  `abandoned car _ taipei street` note in content/content.ts). */
const outName = (base) =>
  base
    .toLowerCase()
    .replace(/[:*?"<>|\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

const toTitle = (base) =>
  base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** `spring - left` -> { name: "spring", slot: "left" }. No suffix means the
 *  photo path, which is what the script did before mounting existed. */
function parseSlot(base) {
  const m = base.match(/^(.*?)[\s_-]+(left|right|spread)$/i);
  if (!m) return { name: base.trim(), slot: null };
  return { name: m[1].trim(), slot: m[2].toLowerCase() };
}

// =======================================================================
//  shared: place a transparent book onto the output canvas
// =======================================================================

/** Scale a cut-out book into the frame and write it to a transparent canvas
 *  with `spineX` (in book-crop coordinates) landing on the canvas midpoint. */
async function placeOnCanvas(bookPng, crop, spineX, f, nudge = 0) {
  const bw = crop.w;
  const bh = crop.h;
  const scale = Math.min(f.fitW / bw, f.fitH / bh);

  const tw = Math.max(2, Math.round(bw * scale));
  const th = Math.max(1, Math.round(bh * scale));
  // Round the LEFT HALF, then derive the offset from it, so the spine lands on
  // an exact whole pixel at the canvas midpoint — that's the line .sb-flap
  // pivots around, and half a pixel of drift there is visible on a fold.
  const leftHalf = Math.round(spineX * scale);
  const left = Math.round(f.cx) - leftHalf + nudge;
  const top = Math.round(f.cy - th / 2);

  const book = await sharp(bookPng)
    .extract({ left: crop.x, top: crop.y, width: bw, height: bh })
    .resize(tw, th, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();

  const out = await sharp({
    create: { width: f.W, height: f.H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: book, left, top }])
    .png(PNG_OPTS)
    .toBuffer();

  return { out, tw, th, spine: left + leftHalf };
}

// =======================================================================
//  mount path — a flat page scan, dropped into the book template
// =======================================================================

/** BFS over a binary mask; zeroes everything but the biggest blob, so specks
 *  in the backdrop never survive as stray opaque dots. */
function keepLargestBlob(mask, W, H) {
  const seen = new Uint8Array(W * H);
  const q = new Int32Array(W * H);
  let best = null;
  let bestN = 0;

  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    let h = 0;
    let t = 0;
    q[t++] = s;
    seen[s] = 1;
    const blob = [];
    while (h < t) {
      const i = q[h++];
      blob.push(i);
      const x = i % W;
      const y = (i / W) | 0;
      const step = (j) => {
        if (mask[j] && !seen[j]) {
          seen[j] = 1;
          q[t++] = j;
        }
      };
      if (x > 0) step(i - 1);
      if (x < W - 1) step(i + 1);
      if (y > 0) step(i - W);
      if (y < H - 1) step(i + W);
    }
    if (blob.length > bestN) {
      bestN = blob.length;
      best = blob;
    }
  }
  if (!best) return;
  mask.fill(0);
  for (const i of best) mask[i] = 1;
}

/** Flood the OUTSIDE from the frame edge; anything unreached is enclosed by
 *  the book, so it's a hole in the mask and gets filled. Without this, a patch
 *  of paper that reads slightly blue punches a transparent dot in the page. */
function fillHoles(mask, W, H) {
  const outside = new Uint8Array(W * H);
  const q = new Int32Array(W * H);
  let h = 0;
  let t = 0;
  const push = (i) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      q[t++] = i;
    }
  };
  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }
  while (h < t) {
    const i = q[h++];
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  for (let i = 0; i < W * H; i++) if (!mask[i] && !outside[i]) mask[i] = 1;
}

let templateCache = null;
async function loadTemplate() {
  if (templateCache) return templateCache;
  if (!existsSync(TEMPLATE)) {
    throw new Error(`missing ${path.relative(root, TEMPLATE)} — the mount path needs it`);
  }
  const { data, info } = await sharp(TEMPLATE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;

  const paper = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    paper[i] = data[i * C + 2] - data[i * C] <= TPL.hueCut ? 1 : 0;
  }
  keepLargestBlob(paper, W, H);
  fillHoles(paper, W, H);

  templateCache = { rgb: data, paper, W, H };
  return templateCache;
}

/** Composite one or two page scans into the template and return the book as a
 *  transparent PNG at template resolution. */
async function mountIntoTemplate(slots, opts) {
  const tpl = await loadTemplate();
  const { W, H } = tpl;

  const layers = [];
  for (const [slot, file] of Object.entries(slots)) {
    const rect = TPL.pages[slot];
    const rw = rect.x1 - rect.x0 + 1;
    const rh = rect.y1 - rect.y0 + 1;

    const scan = await sharp(file)
      .rotate() // bake in EXIF orientation
      .removeAlpha()
      // Lift the scan's paper to pure white. Multiply keeps whatever is darker,
      // so paper left at 242 would tint the entire page a flat grey.
      .linear(255 / opts.white, 0)
      .resize(rw, rh, { fit: opts.fit, position: "centre", kernel: "lanczos3" })
      .png()
      .toBuffer();

    layers.push({
      input: scan,
      left: rect.x0,
      top: rect.y0,
      // multiply: the scan's white drops out and the template's cream paper and
      // texture read through, so it looks drawn in the book rather than pasted on
      blend: opts.paste ? "over" : "multiply",
    });
  }

  const merged = await sharp(tpl.rgb, { raw: { width: W, height: H, channels: 3 } })
    .composite(layers)
    .removeAlpha()
    .raw()
    .toBuffer();

  // The paper mask becomes the alpha, which also clips any scan that overran
  // the page's rounded corners — so the page rectangles above can stay simple.
  const alpha = Buffer.allocUnsafe(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = tpl.paper[i] ? 255 : 0;
  // toColourspace is load-bearing: blur() otherwise widens this 1-channel mask
  // to 3 channels and joinChannel then reads it misaligned.
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
    .blur(0.6)
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  return sharp(merged, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(soft, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();
}

// =======================================================================
//  photo path — a photo of an open book, background cut out
// =======================================================================

/** Flood the background inwards from the frame edge. Each step compares a
 *  pixel to the NEIGHBOUR it spread from, not to a single seed colour, so a
 *  backdrop that shades gradually across the frame still floods in one piece
 *  while the hard edge of the paper stops it. */
function floodBackground(rgb, W, H, tol) {
  const bg = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (!bg[i]) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  };

  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }

  const tol2 = tol * tol;
  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    const y = (i / W) | 0;
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];

    const spread = (j) => {
      if (bg[j]) return;
      const dr = rgb[j * 3] - r;
      const dg = rgb[j * 3 + 1] - g;
      const db = rgb[j * 3 + 2] - b;
      if (dr * dr + dg * dg + db * db <= tol2) push(j);
    };

    if (x > 0) spread(i - 1);
    if (x < W - 1) spread(i + 1);
    if (y > 0) spread(i - W);
    if (y < H - 1) spread(i + W);
  }
  return bg;
}

/** Does this image already carry a real cut-out, or is its alpha (if any)
 *  just a fully-opaque rectangle? */
async function hasUsableAlpha(input, meta) {
  if (!meta.hasAlpha) return false;
  const stats = await sharp(input).stats();
  const alpha = stats.channels[stats.channels.length - 1];
  return alpha.min < 250;
}

/** Normalise any source into an RGBA PNG buffer with the background gone. */
async function cutOut(src, { key, noKey, tolerance }) {
  const oriented = await sharp(src).rotate().png().toBuffer();
  const meta = await sharp(oriented).metadata();
  const already = await hasUsableAlpha(oriented, meta);

  if (noKey || (already && !key)) return { png: oriented, keyed: false };

  const scale = Math.min(1, KEY_MAX_EDGE / Math.max(meta.width, meta.height));
  const W = Math.max(1, Math.round(meta.width * scale));
  const H = Math.max(1, Math.round(meta.height * scale));

  const rgb = await sharp(oriented).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const bg = floodBackground(rgb, W, H, tolerance);

  let removed = 0;
  const alpha = Buffer.allocUnsafe(W * H);
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) removed++;
    alpha[i] = bg[i] ? 0 : 255;
  }

  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
    .blur(0.8)
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  const png = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(soft, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();

  return { png, keyed: true, removed: removed / (W * H) };
}

/** Opaque bounding box, scanned over the alpha channel alone so a big source
 *  costs one byte per pixel instead of four. */
async function opaqueBox(input) {
  const img = sharp(input);
  const meta = await img.metadata();
  const { width: W, height: H } = meta;
  if (!meta.hasAlpha) return { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };

  const alpha = await img.extractChannel("alpha").raw().toBuffer();
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      if (alpha[row + x] > ALPHA_FLOOR) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("nothing left after the cut-out — try a lower --tolerance");
  return { x0, y0, x1, y1 };
}

// =======================================================================
//  driver
// =======================================================================

async function loadSpineNudges() {
  const f = path.join(SRC, "spine.json");
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(await readFile(f, "utf8"));
  } catch (e) {
    console.log(c.yellow(`  ! spine.json is not valid JSON (${e.message}) — ignoring it`));
    return {};
  }
}

/** Group the folder into one job per spread. */
function planJobs(files) {
  const mounts = new Map();
  const photos = [];

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const { name, slot } = parseSlot(base);
    if (!slot) {
      photos.push({ kind: "photo", name, file });
      continue;
    }
    if (!mounts.has(name)) mounts.set(name, { kind: "mount", name, slots: {} });
    const job = mounts.get(name);
    if (job.slots[slot]) {
      console.log(c.yellow(`  ! two files claim "${name} - ${slot}" — keeping ${job.slots[slot]}`));
      continue;
    }
    job.slots[slot] = file;
  }

  for (const job of mounts.values()) {
    if (job.slots.spread && (job.slots.left || job.slots.right)) {
      console.log(
        c.yellow(`  ! "${job.name}" has a spread AND a left/right — the spread wins`)
      );
      job.slots = { spread: job.slots.spread };
    }
  }

  return [...mounts.values(), ...photos].sort((a, b) => a.name.localeCompare(b.name));
}

async function processNew(opts) {
  if (!existsSync(SRC)) {
    console.log(c.dim(`  no ${path.relative(root, SRC)}/ — nothing to import`));
    return [];
  }
  const files = (await readdir(SRC))
    .filter((f) => INPUT_EXT.has(path.extname(f).toLowerCase()))
    .sort();

  if (!files.length) {
    console.log(c.dim(`  ${path.relative(root, SRC)}/ is empty — drop your scans in there`));
    return [];
  }

  const nudges = await loadSpineNudges();
  const jobs = planJobs(files);
  const done = [];

  for (const job of jobs) {
    const name = outName(job.name);
    const dest = path.join(OUT, `${name}.png`);
    const nudge = Number(nudges[job.name] ?? nudges[name] ?? 0) || 0;

    try {
      let placed;
      let sourceBytes = 0;
      let note = null;

      if (job.kind === "mount") {
        const f = frame(MOUNT_CANVAS_W);
        const slots = {};
        for (const [slot, file] of Object.entries(job.slots)) {
          slots[slot] = path.join(SRC, file);
          sourceBytes += (await stat(slots[slot])).size;
        }
        const bookPng = await mountIntoTemplate(slots, opts);
        const b = TPL.book;
        placed = await placeOnCanvas(
          bookPng,
          { x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 },
          TPL.spine - b.x0, // spine, in book-crop coordinates
          f,
          nudge
        );
        placed.f = f;
        note = c.dim(`      mounted ${Object.keys(job.slots).join(" + ")} into the book template`);
      } else {
        const f = frame(PHOTO_CANVAS_W);
        const src = path.join(SRC, job.file);
        sourceBytes = (await stat(src)).size;
        const cut = await cutOut(src, opts);
        const box = await opaqueBox(cut.png);
        const bw = box.x1 - box.x0 + 1;
        const bh = box.y1 - box.y0 + 1;
        placed = await placeOnCanvas(
          cut.png,
          { x: box.x0, y: box.y0, w: bw, h: bh },
          bw / 2, // no known spine on a photo — assume the middle of the book
          f,
          nudge
        );
        placed.f = f;
        if (cut.keyed) {
          const r = cut.removed;
          const line = `      cut out the background for you (removed ${pct(r)} of the frame)`;
          if (r < 0.12) {
            note =
              c.yellow(`${line} — that looks like too little.`) +
              c.dim("\n      The backdrop is too close in colour to the paper. Try --tolerance 45.");
          } else if (r > 0.9) {
            note =
              c.yellow(`${line} — that looks like too much.`) +
              c.dim("\n      The flood leaked across the paper. Try --tolerance 18.");
          } else {
            note = c.dim(line);
          }
        }
      }

      if (!opts.check) await writeFile(dest, placed.out);

      const f = placed.f;
      const over = placed.out.length / 1024 > f.budget;
      console.log(
        `  ${over ? c.yellow("!") : c.green("+")} ${pad(`${name}.png`, 30)} ` +
          `${pad(`${kb(sourceBytes)} -> ${kb(placed.out.length)}`, 20)} ` +
          c.dim(`${f.W}x${f.H}  book ${placed.tw}x${placed.th}  spine x=${placed.spine}`)
      );
      if (note) console.log(note);
      if (over) {
        console.log(
          c.yellow(`      over the ${Math.round(f.budget)} KB budget for this canvas size`)
        );
      }

      done.push({ name, title: toTitle(job.name), kind: job.kind });
    } catch (e) {
      console.log(c.red(`  x ${job.name}: ${e.message}`));
    }
  }
  return done;
}

/** Re-encode what's already shipped. Geometry is untouched — same pixels, same
 *  dimensions — so nothing about the animation changes. */
async function recompressExisting({ check }) {
  const files = (await readdir(OUT)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  let before = 0;
  let after = 0;

  for (const file of files) {
    const p = path.join(OUT, file);
    const orig = await readFile(p);
    const out = await sharp(p).png(PNG_OPTS).toBuffer();
    const keep = out.length < orig.length ? out : orig; // never let it grow
    if (!check && keep !== orig) await writeFile(p, keep);

    before += orig.length;
    after += keep.length;
    const saved = orig.length - keep.length;
    console.log(
      `  ${saved > 0 ? c.green("~") : c.dim("=")} ${pad(file, 30)} ` +
        `${pad(`${kb(orig.length)} -> ${kb(keep.length)}`, 20)} ` +
        c.dim(saved > 0 ? `-${Math.round((saved / orig.length) * 100)}%` : "already minimal")
    );
  }
  return { before, after, count: files.length };
}

async function folderSize() {
  const files = (await readdir(OUT)).filter((f) => f.toLowerCase().endsWith(".png"));
  let total = 0;
  for (const f of files) total += (await stat(path.join(OUT, f))).size;
  return { total, count: files.length };
}

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const arg = (n, fallback) => {
  const i = argv.indexOf(n);
  if (i < 0) return fallback;
  return argv[i + 1] ?? fallback;
};
const numArg = (n, fallback) => {
  const v = Number(arg(n, NaN));
  return Number.isFinite(v) ? v : fallback;
};

const opts = {
  check: flag("--check"),
  key: flag("--key"),
  noKey: flag("--no-key"),
  paste: flag("--paste"),
  tolerance: numArg("--tolerance", KEY_TOLERANCE),
  white: numArg("--white", SCAN_WHITE),
  fit: arg("--fit", "cover") === "contain" ? "contain" : "cover",
};
const wantExisting = flag("--existing") || flag("--all");
const wantNew = flag("--all") || !flag("--existing");

if (opts.check) console.log(c.dim("\n  --check: measuring only, nothing will be written"));

let added = [];
if (wantNew) {
  console.log(c.bold(`\n  importing ${path.relative(root, SRC)}/ -> ${path.relative(root, OUT)}/\n`));
  added = await processNew(opts);
}
if (wantExisting) {
  console.log(c.bold(`\n  re-compressing ${path.relative(root, OUT)}/\n`));
  const r = await recompressExisting(opts);
  console.log(c.dim(`\n  ${r.count} spreads: ${kb(r.before)} -> ${kb(r.after)}`));
}

const { total, count } = await folderSize();
console.log(
  `\n  ${c.bold("homepage first-paint weight:")} ${kb(total)} across ${count} spreads` +
    c.dim("  (every spread is preloaded with priority)")
);

if (added.length) {
  console.log(c.bold("\n  paste into the `sketchbook` array in content/content.ts:\n"));
  for (const { name, title, kind } of added) {
    const fn = kind === "mount" ? "mounted" : "sketch";
    console.log(`    ${fn}(${JSON.stringify(name)}, ${JSON.stringify(title)}),`);
  }
}
console.log(
  c.dim("\n  Open each new spread and check the fold doesn't cut through the drawing.\n") +
    c.dim("  If it does, add a pixel nudge to sketchbook-src/spine.json and re-run.\n")
);
