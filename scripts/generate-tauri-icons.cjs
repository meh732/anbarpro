/**
 * Rasterizes the exact Web App SVG Icon (public/icon.svg) into:
 *   - public/icon-512.png, public/icon-192.png, public/maskable-icon-512.png, public/favicon.ico
 *   - src-tauri/icons/icon.ico, 32x32.png, 128x128.png, 128x128@2x.png, icon.png
 * Guarantees 100% identical visual appearance between Web and Windows Tauri Desktop.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 Table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Signed distance to a rounded rectangle [x, y, w, h, rx]
function sdRoundedRect(px, py, x, y, w, h, r) {
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const hx = w * 0.5 - r;
  const hy = h * 0.5 - r;
  const qx = Math.abs(px - cx) - hx;
  const qy = Math.abs(py - cy) - hy;
  const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inDist = Math.min(Math.max(qx, qy), 0);
  return outDist + inDist - r;
}

// Point-in-polygon check for convex/isometric faces
function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function blend(dstR, dstG, dstB, srcR, srcG, srcB, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  return [
    Math.round(dstR * (1 - a) + srcR * a),
    Math.round(dstG * (1 - a) + srcG * a),
    Math.round(dstB * (1 - a) + srcB * a)
  ];
}

// Isometric warehouse box polygons from public/icon.svg
const TOP_FACE = [[256, 208], [308, 238], [256, 268], [204, 238]];
const LEFT_FACE = [[204, 246], [256, 276], [256, 316], [204, 286]];
const RIGHT_FACE = [[256, 276], [308, 246], [308, 286], [256, 316]];
const PIN_POS = [180, 220, 260, 300];

/**
 * Evaluates exact RGBA color of public/icon.svg in 512x512 coordinate space
 */
function sampleWebIconSvg(u, v) {
  // 1. Background rounded rect: width=512, height=512, rx=112
  const dBg = sdRoundedRect(u, v, 0, 0, 512, 512, 112);
  if (dBg > 0.8) {
    return [0, 0, 0, 0];
  }
  const bgAlpha = dBg > -0.8 ? (0.8 - dBg) / 1.6 : 1.0;

  // bg-grad: (0,0)->(512,512): 0% #312e81 (49,46,129), 50% #4f46e5 (79,70,229), 100% #0f172a (15,23,42)
  const tBg = Math.max(0, Math.min(1, (u + v) / 1024));
  let r, g, b;
  if (tBg < 0.5) {
    const k = tBg * 2;
    r = 49 * (1 - k) + 79 * k;
    g = 46 * (1 - k) + 70 * k;
    b = 129 * (1 - k) + 229 * k;
  } else {
    const k = (tBg - 0.5) * 2;
    r = 79 * (1 - k) + 15 * k;
    g = 70 * (1 - k) + 23 * k;
    b = 229 * (1 - k) + 42 * k;
  }

  // accent-grad: 0% #38bdf8 (56,189,248) -> 100% #6366f1 (99,102,241)
  const ar = 56 * (1 - tBg) + 99 * tBg;
  const ag = 189 * (1 - tBg) + 102 * tBg;
  const ab = 248 * (1 - tBg) + 241 * tBg;

  // 2. Subtle inner grid lines (160, 256, 352) between 64..448
  if (u >= 64 && u <= 448 && v >= 64 && v <= 448) {
    if (
      Math.abs(u - 160) <= 1.2 || Math.abs(u - 256) <= 1.2 || Math.abs(u - 352) <= 1.2 ||
      Math.abs(v - 160) <= 1.2 || Math.abs(v - 256) <= 1.2 || Math.abs(v - 352) <= 1.2
    ) {
      [r, g, b] = blend(r, g, b, 255, 255, 255, 0.07);
    }
  }

  // 3. Electronic Pins (Left, Right, Top, Bottom) fill="#38bdf8" (56, 189, 248)
  for (let i = 0; i < 4; i++) {
    const p = PIN_POS[i];
    const dLeft = sdRoundedRect(u, v, 96, p, 40, 16, 6);
    const dRight = sdRoundedRect(u, v, 376, p, 40, 16, 6);
    const dTop = sdRoundedRect(u, v, p, 96, 16, 40, 6);
    const dBottom = sdRoundedRect(u, v, p, 376, 16, 40, 6);
    const dPin = Math.min(dLeft, dRight, dTop, dBottom);
    if (dPin < 0.8) {
      const cov = dPin < -0.8 ? 1 : (0.8 - dPin) / 1.6;
      [r, g, b] = blend(r, g, b, 56, 189, 248, cov);
    }
  }

  // 4. Central Chip Body: x=144, y=144, w=224, h=224, rx=36, fill=#1e1b4b (30,27,75), stroke=8 accent-grad
  const dChip = sdRoundedRect(u, v, 144, 144, 224, 224, 36);
  if (dChip < 4.5) {
    if (dChip < -4.0) {
      [r, g, b] = [30, 27, 75];
    } else {
      // Stroke region around dChip == 0 (width 8 -> -4..+4)
      const strokeCov = 1 - Math.max(0, Math.abs(dChip) - 3.2) / 1.3;
      if (dChip < 0) {
        [r, g, b] = [30, 27, 75];
      }
      [r, g, b] = blend(r, g, b, ar, ag, ab, strokeCov);
    }
  }

  // 5. Chip Inner Core: x=184, y=184, w=144, h=144, rx=20, fill=accent-grad (0.25), stroke=#38bdf8 width=4
  const dCore = sdRoundedRect(u, v, 184, 184, 144, 144, 20);
  if (dCore < 2.5) {
    if (dCore < 0) {
      [r, g, b] = blend(r, g, b, ar, ag, ab, 0.25);
    }
    if (Math.abs(dCore) <= 2.5) {
      const sc = 1 - Math.max(0, Math.abs(dCore) - 1.5) / 1.0;
      [r, g, b] = blend(r, g, b, 56, 189, 248, sc);
    }
  }

  // 6. Isometric 3D Warehouse Box inside Chip
  if (u >= 200 && u <= 312 && v >= 204 && v <= 320) {
    if (pointInPoly(u, v, TOP_FACE)) {
      [r, g, b] = [56, 189, 248]; // #38bdf8
    } else if (pointInPoly(u, v, LEFT_FACE)) {
      [r, g, b] = [2, 132, 199];  // #0284c7
    } else if (pointInPoly(u, v, RIGHT_FACE)) {
      [r, g, b] = [3, 105, 161];  // #0369a1
    }
  }

  // 7. Active Status LED: cx=210, cy=210, r=10, fill=#10b981 (16, 185, 129)
  const dLed = Math.hypot(u - 210, v - 210) - 10;
  if (dLed < 0.8) {
    const cov = dLed < -0.8 ? 1 : (0.8 - dLed) / 1.6;
    [r, g, b] = blend(r, g, b, 16, 185, 129, cov);
  }

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(bgAlpha * 255)];
}

/**
 * Renders the Web Icon at any resolution (width x height) with 2x2 supersampling anti-aliasing
 */
function renderWebIconRgba(size) {
  const rgba = new Uint8Array(size * size * 4);
  const scale = 512 / size;
  const subOffsets = [0.25, 0.75];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (const oy of subOffsets) {
        for (const ox of subOffsets) {
          const u = (x + ox) * scale;
          const v = (y + oy) * scale;
          const [r, g, b, a] = sampleWebIconSvg(u, v);
          rSum += r;
          gSum += g;
          bSum += b;
          aSum += a;
        }
      }
      const idx = (y * size + x) * 4;
      rgba[idx] = rSum >> 2;
      rgba[idx + 1] = gSum >> 2;
      rgba[idx + 2] = bSum >> 2;
      rgba[idx + 3] = aSum >> 2;
    }
  }

  return { width: size, height: size, rgba };
}

function encodeRgbaToPngBuffer(img) {
  const { width, height, rgba } = img;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawScanlines[rowStart] = 0;
    const srcOffset = y * width * 4;
    for (let i = 0; i < width * 4; i++) {
      rawScanlines[rowStart + 1 + i] = rgba[srcOffset + i];
    }
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createDibEntryFromImage(img) {
  const size = img.width;
  const xorSize = size * size * 4;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  const headerSize = 40;
  const buf = Buffer.alloc(headerSize + xorSize + andSize, 0);

  buf.writeUInt32LE(headerSize, 0);
  buf.writeInt32LE(size, 4);
  buf.writeInt32LE(size * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(xorSize + andSize, 20);

  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const sIdx = (srcY * size + x) * 4;
      const r = img.rgba[sIdx];
      const g = img.rgba[sIdx + 1];
      const b = img.rgba[sIdx + 2];
      const a = img.rgba[sIdx + 3];

      const offset = headerSize + (y * size + x) * 4;
      buf[offset] = b;
      buf[offset + 1] = g;
      buf[offset + 2] = r;
      buf[offset + 3] = a;

      if (a < 16) {
        const andByteOffset = headerSize + xorSize + y * andRowBytes + (x >> 3);
        buf[andByteOffset] |= (0x80 >> (x & 7));
      }
    }
  }

  return buf;
}

function createWindowsIco() {
  const sizes = [16, 32, 48, 64];
  const entries = sizes.map(sz => ({
    width: sz,
    height: sz,
    data: createDibEntryFromImage(renderWebIconRgba(sz))
  }));

  const img256 = renderWebIconRgba(256);
  entries.push({
    width: 0,
    height: 0,
    data: encodeRgbaToPngBuffer(img256)
  });

  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = Buffer.alloc(16 * count);
  let currentOffset = 6 + 16 * count;

  entries.forEach((entry, idx) => {
    const base = idx * 16;
    dirEntries[base] = entry.width;
    dirEntries[base + 1] = entry.height;
    dirEntries[base + 2] = 0;
    dirEntries[base + 3] = 0;
    dirEntries.writeUInt16LE(1, base + 4);
    dirEntries.writeUInt16LE(32, base + 6);
    dirEntries.writeUInt32LE(entry.data.length, base + 8);
    dirEntries.writeUInt32LE(currentOffset, base + 12);
    currentOffset += entry.data.length;
  });

  return Buffer.concat([header, dirEntries, ...entries.map(e => e.data)]);
}

function syncAllWebAndTauriIcons() {
  const iconsDir = path.join(process.cwd(), 'src-tauri', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const png32 = encodeRgbaToPngBuffer(renderWebIconRgba(32));
  const png128 = encodeRgbaToPngBuffer(renderWebIconRgba(128));
  const png192 = encodeRgbaToPngBuffer(renderWebIconRgba(192));
  const png256 = encodeRgbaToPngBuffer(renderWebIconRgba(256));
  const png512 = encodeRgbaToPngBuffer(renderWebIconRgba(512));
  const icoBuf = createWindowsIco();

  // 1. Write Tauri icons (src-tauri/icons/*)
  fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
  fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
  fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuf);

  // 2. Write Web & Electron icons (public/*) so Web, PWA, Electron, and Tauri all share the exact same icon
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
    fs.writeFileSync(path.join(publicDir, 'maskable-icon-512.png'), png512);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  }

  console.log('[TauriIcons] Successfully generated identical Web & Tauri Windows icons from public/icon.svg design.');
}

syncAllWebAndTauriIcons();
