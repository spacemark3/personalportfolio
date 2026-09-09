// Fits a finished collage to the inspiration page's first-paint budget.
//
//   node scripts/inspiration-bg.mjs <file>       write public/inspiration/collage.webp
//   node scripts/inspiration-bg.mjs <file> --check   measure only, write nothing
//
//   --budget 400      KB ceiling; quality steps down until the file fits
//   --quality 62      starting WebP quality
//   --min-quality 20  how far the ladder is allowed to fall
//   --max-width 2400  downscale anything wider. Never upscales, ever
//   --bg #060608      what transparency is flattened onto
//
// ---- what this does and does not do ----
//
// It does NOT arrange anything. The collage is assembled by hand — Photopea,
// Canva, whatever — because the arrangement is a composition: which faces are
// large, what sits next to what, how the colour groups across the canvas. Two
// generations of packer lived here and neither got close; they are in the git
// history if anyone wants to see why not.
//
// What it does is the one part that is not a design decision: getting the
// export under the page's weight budget without anybody having to remember
// how. That matters more here than on a normal page, because this image IS
// the inspiration page's first paint — the way public/work/sketchbook/ is the
// home page's. A raw Photopea PNG runs about 3.8 MB, roughly ten times the
// budget for the entire page.
//
// Three things it handles that are easy to get wrong by hand:
//
//   WEIGHT.  Quality steps down until the file fits --budget. Dense
//            photographic collages compress badly, so the starting quality is
//            deliberately low — under the page's 74% mask it is undetectable.
//   ALPHA.   A PNG exported with transparency is flattened onto the page's own
//            ground first. Left alone it composites against white in some
//            decoders, and WebP's alpha channel costs bytes for a transparency
//            the mask would hide anyway.
//   SCALE.   It never upscales. Stretching a 1920px collage to some larger
//            round number spends bytes on pixels that were never in the file.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "public", "inspiration");
const OUT = path.join(OUT_DIR, "collage.webp");

// ---- options ----
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

// the source is the one positional argument — the first thing that is not a
// flag and not a flag's value
const flagValues = new Set();
for (const name of ["budget", "quality", "min-quality", "max-width", "bg"]) {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1]) flagValues.add(argv[i + 1]);
}
const SRC = argv.find((a) => !a.startsWith("--") && !flagValues.has(a));

const BUDGET = Number(opt("budget", 400)) * 1024;
const Q_START = Number(opt("quality", 62));
const Q_FLOOR = Number(opt("min-quality", 20));
const MAX_W = Number(opt("max-width", 2400));
const BG = opt("bg", "#060608"); // the dark page's own ground
const CHECK = flag("check");

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function main() {
  if (!SRC) {
    console.error(`\n  usage: node scripts/inspiration-bg.mjs <file> [--check]\n`);
    process.exit(1);
  }
  if (!existsSync(SRC)) {
    console.error(`\n  no such file: ${SRC}\n`);
    process.exit(1);
  }

  const src = sharp(SRC).rotate(); // apply EXIF orientation for real
  const m = await src.metadata();
  const target = Math.min(m.width, MAX_W); // never up, only down

  console.log(
    `\n  ${path.basename(SRC)} — ${m.width}x${m.height} ${m.format} ` +
      `(${(m.width / m.height).toFixed(2)}:1)`
  );
  if (target !== m.width) console.log(`  downscaled to ${target}px wide`);

  const sized = target === m.width ? src : src.resize(target);
  const buf = await sized.flatten({ background: BG }).toBuffer();

  if (CHECK) {
    console.log("\n  --check: nothing written\n");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  // Step quality down until it fits. `used` tracks the quality the file on
  // disk was actually written at — the loop variable has already been
  // decremented past the floor by the time it exits, and reporting that would
  // name a quality that was never encoded.
  let used = Q_START;
  let bytes = Infinity;
  for (let quality = Q_START; quality >= Q_FLOOR; quality -= 6) {
    await sharp(buf).webp({ quality, effort: 6 }).toFile(OUT);
    used = quality;
    bytes = statSync(OUT).size;
    if (bytes <= BUDGET) break;
  }

  console.log(`\n  wrote ${path.relative(root, OUT)} — ${kb(bytes)} at quality ${used}`);
  if (bytes > BUDGET) {
    console.log(`  ! over the ${kb(BUDGET)} budget even at quality ${used};`);
    console.log(`    export a smaller collage, or raise --budget if you mean it`);
  }

  console.log(`\n  content/content.ts should read:\n`);
  console.log(`    export const people: Person[] = [`);
  console.log(`      person("collage.webp", "the people who supported me"),`);
  console.log(`    ];\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
