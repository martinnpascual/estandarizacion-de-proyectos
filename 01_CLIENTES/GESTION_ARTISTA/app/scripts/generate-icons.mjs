/**
 * Generates PWA icons (192x192 and 512x512) as valid PNG files.
 * Uses only Node.js built-ins (zlib, fs) — no external deps.
 *
 * Color: #7c3aed (violet-600, matches theme_color in manifest.json)
 * Run: node scripts/generate-icons.mjs
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Create a PNG with a gradient from violet (#7c3aed) to deep purple (#4c1d95).
 * Simple horizontal gradient: left = violet, right = deep purple.
 */
function makePNG(size) {
  const channels = 4; // RGBA
  // Raw image data: one filter byte per row, then RGBA pixels
  const raw = Buffer.alloc(size * (size * channels + 1), 0);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * channels + 1);
    raw[rowStart] = 0; // filter = None

    for (let x = 0; x < size; x++) {
      // Diagonal gradient: top-left violet → bottom-right deep purple
      const t = (x + y) / (2 * (size - 1));

      // violet-600 → indigo-900
      const r = Math.round(124 * (1 - t) + 49 * t);
      const g = Math.round(58 * (1 - t) + 46 * t);
      const b = Math.round(237 * (1 - t) + 129 * t);

      // Add a subtle "music note" area in center (just a lighter circle)
      const cx = size / 2, cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = size * 0.28;
      const glow = dist < radius ? (1 - dist / radius) * 0.25 : 0;

      const off = rowStart + 1 + x * channels;
      raw[off] = Math.min(255, Math.round(r + glow * 80));
      raw[off + 1] = Math.min(255, Math.round(g + glow * 60));
      raw[off + 2] = Math.min(255, Math.round(b + glow * 30));
      raw[off + 3] = 255; // fully opaque
    }
  }

  const compressed = deflateSync(raw, { level: 9 });

  // IHDR: width, height, bit depth (8), color type (6=RGBA), compression, filter, interlace
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

writeFileSync(join(publicDir, "icon-192.png"), makePNG(192));
writeFileSync(join(publicDir, "icon-512.png"), makePNG(512));

console.log("✓ icon-192.png generated");
console.log("✓ icon-512.png generated");
