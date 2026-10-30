#!/usr/bin/env node
'use strict';

// Generates icon-192.png and icon-512.png in public/ using only Node.js built-ins.
// Rasterizes the guestbook SVG icon (viewBox 0 0 32 32) at the target sizes.

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function uint32BE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (~crc) >>> 0;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const crcBuf = uint32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([uint32BE(data.length), tb, data, crcBuf]);
}

function writePNG(width, height, pixels, filePath) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk('IHDR', Buffer.concat([
    uint32BE(width), uint32BE(height), Buffer.from([8, 6, 0, 0, 0])
  ]));
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const idat = makeChunk('IDAT', zlib.deflateSync(Buffer.from(raw), { level: 6 }));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  fs.writeFileSync(filePath, Buffer.concat([sig, ihdr, idat, iend]));
  console.log(`Written: ${filePath}`);
}

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4).fill(255);
  const s = size / 32;
  const [BR, BG, BB] = [15, 20, 25]; // #0f1419

  function setPixel(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  }

  function fillRect(x1, y1, x2, y2, r, g, b) {
    for (let y = Math.floor(y1); y <= Math.ceil(y2); y++)
      for (let x = Math.floor(x1); x <= Math.ceil(x2); x++)
        setPixel(x, y, r, g, b);
  }

  function fillPolygon(pts, r, g, b) {
    const minY = Math.floor(Math.min(...pts.map(p => p.y)));
    const maxY = Math.ceil(Math.max(...pts.map(p => p.y)));
    const n = pts.length;
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
        if (y < y1 || y > y2 || p1.y === p2.y) continue;
        xs.push(p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.floor(xs[k]); x <= Math.ceil(xs[k + 1]); x++)
          setPixel(x, y, r, g, b);
    }
  }

  function drawThickLine(x1, y1, x2, y2, sw) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = (-dy / len) * (sw / 2), ny = (dx / len) * (sw / 2);
    fillPolygon([
      { x: (x1 + nx) * s, y: (y1 + ny) * s },
      { x: (x2 + nx) * s, y: (y2 + ny) * s },
      { x: (x2 - nx) * s, y: (y2 - ny) * s },
      { x: (x1 - nx) * s, y: (y1 - ny) * s },
    ], BR, BG, BB);
  }

  // Horizontal line 1
  fillRect(3.75 * s, (12 - 1.3) * s, 15.25 * s, (12 + 1.3) * s, BR, BG, BB);
  // Horizontal line 2
  fillRect(3.75 * s, (21.5 - 1.3) * s, 10.75 * s, (21.5 + 1.3) * s, BR, BG, BB);
  // Diagonal line
  drawThickLine(14.25, 23, 21.25, 9, 1.8);
  // Filled step polygon: M22.75 13.5 28.25 13.5 28.25 21 21.25 21 21.25 16.5 Z
  fillPolygon([
    { x: 22.75 * s, y: 13.5 * s },
    { x: 28.25 * s, y: 13.5 * s },
    { x: 28.25 * s, y: 21 * s },
    { x: 21.25 * s, y: 21 * s },
    { x: 21.25 * s, y: 16.5 * s },
  ], BR, BG, BB);

  return pixels;
}

const publicDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
  writePNG(size, size, renderIcon(size), path.join(publicDir, `icon-${size}.png`));
}
