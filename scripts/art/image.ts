import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PNG } from 'pngjs';

export interface Img {
  width: number;
  height: number;
  data: Uint8Array;
}

export type RGB = [number, number, number];

export function decode(buf: Buffer): Img {
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

export function encode(img: Img): Buffer {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  return PNG.sync.write(png);
}

export const readImg = (path: string) => decode(readFileSync(path));

export function writeImg(path: string, img: Img) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encode(img));
}

export function blank(width: number, height: number): Img {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

export function loadPalette(path = 'art/palette.hex'): RGB[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^#[0-9a-f]{6}$/i.test(l))
    .map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
}

export function paletteSwatch(palette: RGB[], cell = 4, cols = 8): Buffer {
  const rows = Math.ceil(palette.length / cols);
  const img = blank(cols * cell, rows * cell);
  palette.forEach(([r, g, b], i) => {
    const cx = (i % cols) * cell;
    const cy = Math.floor(i / cols) * cell;
    for (let y = cy; y < cy + cell; y++)
      for (let x = cx; x < cx + cell; x++) {
        const o = (y * img.width + x) * 4;
        img.data.set([r, g, b, 255], o);
      }
  });
  return encode(img);
}

function distance(a: RGB, r: number, g: number, b: number) {
  const rm = (a[0] + r) / 2;
  const dr = a[0] - r;
  const dg = a[1] - g;
  const db = a[2] - b;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

export function snapToPalette(img: Img, palette: RGB[]): Img {
  const out = { ...img, data: new Uint8Array(img.data) };
  const cache = new Map<number, RGB>();
  for (let o = 0; o < out.data.length; o += 4) {
    if (out.data[o + 3] === 0) continue;
    const key = (out.data[o] << 16) | (out.data[o + 1] << 8) | out.data[o + 2];
    let best = cache.get(key);
    if (!best) {
      best = palette.reduce((a, c) => (distance(c, out.data[o], out.data[o + 1], out.data[o + 2]) < distance(a, out.data[o], out.data[o + 1], out.data[o + 2]) ? c : a));
      cache.set(key, best);
    }
    out.data.set(best, o);
  }
  return out;
}

export function hardenAlpha(img: Img, threshold = 128): Img {
  const out = { ...img, data: new Uint8Array(img.data) };
  for (let o = 3; o < out.data.length; o += 4) out.data[o] = out.data[o] >= threshold ? 255 : 0;
  return out;
}

export function despeckle(img: Img, minPixels = 6): Img {
  const { width, height } = img;
  const out = { ...img, data: new Uint8Array(img.data) };
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || out.data[start * 4 + 3] === 0) continue;
    const component: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      component.push(p);
      const x = p % width;
      const y = Math.floor(p / width);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (seen[q] || out.data[q * 4 + 3] === 0) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    if (component.length < minPixels) for (const p of component) out.data[p * 4 + 3] = 0;
  }
  return out;
}

export function bounds(img: Img) {
  let x0 = img.width;
  let y0 = img.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function crop(img: Img, x: number, y: number, w: number, h: number): Img {
  const out = blank(w, h);
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx;
      const sy = y + yy;
      if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
      const si = (sy * img.width + sx) * 4;
      out.data.set(img.data.subarray(si, si + 4), (yy * w + xx) * 4);
    }
  return out;
}

export function trim(img: Img): Img {
  const b = bounds(img);
  return b ? crop(img, b.x, b.y, b.w, b.h) : blank(1, 1);
}

export function scaleNearest(img: Img, w: number, h: number): Img {
  const out = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor(((x + 0.5) * img.width) / w));
      const sy = Math.min(img.height - 1, Math.floor(((y + 0.5) * img.height) / h));
      const si = (sy * img.width + sx) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * w + x) * 4);
    }
  return out;
}

export function flipX(img: Img): Img {
  const out = blank(img.width, img.height);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const si = (y * img.width + x) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * img.width + (img.width - 1 - x)) * 4);
    }
  return out;
}

export function blit(dst: Img, src: Img, dx: number, dy: number) {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const si = (y * src.width + x) * 4;
      if (src.data[si + 3] === 0) continue;
      dst.data.set(src.data.subarray(si, si + 4), (ty * dst.width + tx) * 4);
    }
}

export function opaqueFraction(img: Img) {
  let n = 0;
  for (let o = 3; o < img.data.length; o += 4) if (img.data[o]) n++;
  return n / (img.width * img.height);
}
