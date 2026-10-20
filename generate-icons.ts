import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createDistinctRedLogo(width: number, height: number, isMaskable = false): Buffer {
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  // If maskable, safe zone is inner 75-80%; otherwise standard 88%
  const radius = width * (isMaskable ? 0.38 : 0.44);
  const tailBaseX = cx - radius * 0.45;
  const tailBaseY = cy + radius * 0.75;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if point is inside speech bubble circle
      const inCircle = dist <= radius;

      // Check if point is inside speech bubble bottom-left tail
      const tailDx = x - tailBaseX;
      const tailDy = y - tailBaseY;
      const inTail = (!isMaskable) && (
        x >= cx - radius * 0.95 &&
        x <= cx - radius * 0.25 &&
        y >= cy + radius * 0.4 &&
        y <= cy + radius * 1.15 &&
        (tailDy > 0) &&
        (tailDy - tailDx * 0.7 < radius * 0.45)
      );

      const inBubble = inCircle || inTail;

      if (inBubble) {
        // Red gradient from top-left (#ff3b30) to bottom-right (#b91c1c)
        const gradFactor = ((x - (cx - radius)) + (y - (cy - radius))) / (radius * 4);
        const r = Math.round(255 - gradFactor * 70);
        const g = Math.round(59 - gradFactor * 40);
        const b = Math.round(48 - gradFactor * 35);

        // Normalized coordinates relative to center of bubble [-1, 1]
        const nx = dx / (radius * 0.65);
        const ny = dy / (radius * 0.65);

        let isGlyph = false;

        // Draw distinct bold 'K' emblem with central gap and right wings
        // Vertical stem of K:
        if (nx >= -0.65 && nx <= -0.32 && ny >= -0.68 && ny <= 0.68) {
          isGlyph = true;
        }

        // Upper diagonal arm of K:
        const d1 = (ny - (-0.7)) - (nx - 0.6) * (-1.0);
        if (nx >= -0.32 && nx <= 0.65 && Math.abs(d1) < 0.25 && ny <= 0.15) {
          isGlyph = true;
        }

        // Lower diagonal arm of K:
        const d2 = (ny - 0.68) - (nx - 0.65) * 1.05;
        if (nx >= -0.32 && nx <= 0.68 && Math.abs(d2) < 0.25 && ny >= -0.15) {
          isGlyph = true;
        }

        // Verification pulse checkmark dot at upper right of K
        const dotDist = Math.sqrt((nx - 0.55) * (nx - 0.55) + (ny - (-0.55)) * (ny - (-0.55)));
        if (dotDist <= 0.2) {
          isGlyph = true;
        }

        if (isGlyph) {
          // White symbol with subtle embossed tone
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = Math.max(0, Math.min(255, r));
          rawData[pixelOffset + 1] = Math.max(0, Math.min(255, g));
          rawData[pixelOffset + 2] = Math.max(0, Math.min(255, b));
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Outside bubble: Deep sleek black canvas for real mobile home screen app icon
        rawData[pixelOffset] = 10;
        rawData[pixelOffset + 1] = 10;
        rawData[pixelOffset + 2] = 12;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  // PNG Signature & chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcTarget), 8 + len);
  return chunk;
}

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate real distinct red home screen icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createDistinctRedLogo(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createDistinctRedLogo(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createDistinctRedLogo(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createDistinctRedLogo(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createDistinctRedLogo(64, 64, false));

console.log('Successfully generated distinct red home screen app icons in /public');
