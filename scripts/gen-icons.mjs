// Generates PNG app icons from the CallFin glyph using sharp.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Full-bleed blue square + centered white chart glyph. Square (no rounded
// corners) so it looks right under Android's maskable crop and iOS's own
// rounding. Glyph sits at the center 50% — well inside the maskable safe zone.
const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#3B82F6"/>
  <svg x="16" y="16" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
</svg>`;

const targets = [
  { size: 192, out: "public/icons/icon-192.png" },
  { size: 512, out: "public/icons/icon-512.png" },
  { size: 180, out: "src/app/apple-icon.png" }, // Next serves this as apple-touch-icon
];

await mkdir(join(root, "public/icons"), { recursive: true });

for (const { size, out } of targets) {
  await sharp(Buffer.from(svg(size))).png().toFile(join(root, out));
  console.log(`✓ ${out} (${size}×${size})`);
}
