import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { ASSETS, type CharacterSpec, type FloorSpec, type IconSpec, type PropSpec } from '../../art/assets';
import { DIRECTIONS } from './pixellab';
import { blank, blit, bounds, despeckle, encode, flipX, hardenAlpha, loadPalette, readImg, scaleNearest, snapToPalette, trim, type Img, type RGB } from './image';

const OUT = 'src/assets/sprites';
const ICONS = 'src/assets/icons';
const palette = loadPalette();
const selections: Record<string, number | number[] | { pick: number | number[]; flip?: boolean }> = existsSync('art/selections.json') ? JSON.parse(readFileSync('art/selections.json', 'utf8')) : {};

export interface PropEntry {
  file: string;
  w: number;
  h: number;
  base: number;
}

export interface FloorEntry {
  file: string;
  size: number;
  tint: boolean;
  avg: [number, number, number];
}

export interface CharacterEntry {
  file: string;
  frame: number;
  dirs: string[];
  walk: number;
  sneak: number;
  footY: number;
}

const manifest: { props: Record<string, PropEntry[]>; floors: Record<string, FloorEntry>; characters: Record<string, CharacterEntry> } = { props: {}, floors: {}, characters: {} };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const clean = (img: Img) => snapToPalette(despeckle(hardenAlpha(img), 8), palette);

function selection(id: string) {
  const s = selections[id];
  if (s === undefined) return null;
  if (typeof s === 'number' || Array.isArray(s)) return { picks: [s].flat(), flip: false };
  return { picks: [s.pick].flat(), flip: !!s.flip };
}

function buildProp(spec: PropSpec) {
  const sel = selection(spec.id);
  if (!sel) return;
  manifest.props[spec.id] = sel.picks.map((pick, v) => {
    let img = trim(clean(readImg(`art/raw/${spec.id}/${pick}.png`)));
    if (sel.flip) img = flipX(img);
    const ratio = spec.width / img.width;
    if (ratio < 0.75) img = trim(scaleNearest(img, Math.round(img.width * ratio), Math.round(img.height * ratio)));
    const file = `${spec.id}${v ? `.${v}` : ''}.png`;
    writeFileSync(`${OUT}/${file}`, encode(img));
    return { file, w: img.width, h: img.height, base: Math.round(spec.base ? (spec.base * img.width) / spec.width : img.width) };
  });
}

function buildFloor(spec: FloorSpec) {
  const sel = selection(spec.id);
  if (!sel) return;
  const img = snapToPalette(readImg(`art/raw/${spec.id}/${sel.picks[0]}.png`), palette);
  for (let o = 3; o < img.data.length; o += 4) img.data[o] = 255;
  const sum = [0, 0, 0];
  for (let o = 0; o < img.data.length; o += 4) for (let c = 0; c < 3; c++) sum[c] += img.data[o + c];
  const px = img.width * img.height;
  const file = `${spec.id}.png`;
  writeFileSync(`${OUT}/${file}`, encode(img));
  manifest.floors[spec.id] = { file, size: img.width, tint: !!spec.tint, avg: sum.map((v) => Math.round(v / px)) as [number, number, number] };
}

function colorsOf(imgs: Img[]): RGB[] {
  const seen = new Map<number, RGB>();
  for (const img of imgs)
    for (let o = 0; o < img.data.length; o += 4) if (img.data[o + 3]) seen.set((img.data[o] << 16) | (img.data[o + 1] << 8) | img.data[o + 2], [img.data[o], img.data[o + 1], img.data[o + 2]]);
  return [...seen.values()];
}

function frames(dir: string, anim: string, direction: string, colors: RGB[]) {
  const path = `${dir}/${anim}/${direction}`;
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith('.png'))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((f) => snapToPalette(clean(readImg(`${path}/${f}`)), colors));
}

function buildCharacter(spec: CharacterSpec) {
  const sel = selection(spec.id) ?? (existsSync(`art/raw/${spec.id}/0/rotations`) ? { picks: [0], flip: false } : null);
  if (!sel) return;
  const dir = `art/raw/${spec.id}/${sel.picks[0]}`;
  const rotations = DIRECTIONS.map((d) => clean(readImg(`${dir}/rotations/${d}.png`)));
  const colors = colorsOf(rotations);
  const rows = DIRECTIONS.map((d, i) => ({
    rotation: rotations[i],
    walk: frames(dir, existsSync(`${dir}/walk-6-frames`) ? 'walk-6-frames' : 'walking-6-frames', d, colors),
    sneak: frames(dir, 'sneaking', d, colors),
  }));
  const frame = Math.max(...rows.flatMap((r) => [r.rotation, ...r.walk, ...r.sneak]).map((i) => Math.max(i.width, i.height)));
  const walk = Math.min(...rows.map((r) => r.walk.length));
  const sneak = Math.min(...rows.map((r) => r.sneak.length));
  const sheet = blank(frame * (1 + walk + sneak), frame * DIRECTIONS.length);
  const place = (img: Img, col: number, row: number) => blit(sheet, img, col * frame + Math.floor((frame - img.width) / 2), row * frame + (frame - img.height));
  rows.forEach((r, row) => {
    place(r.rotation, 0, row);
    r.walk.slice(0, walk).forEach((f, i) => place(f, 1 + i, row));
    r.sneak.slice(0, sneak).forEach((f, i) => place(f, 1 + walk + i, row));
  });
  const south = bounds(rows[0].rotation)!;
  const file = `${spec.id}.png`;
  writeFileSync(`${OUT}/${file}`, encode(sheet));
  manifest.characters[spec.id] = { file, frame, dirs: DIRECTIONS, walk, sneak, footY: frame - rows[0].rotation.height + south.y + south.h };
}

function buildIcon(spec: IconSpec) {
  const sel = selection(spec.id);
  if (!sel) return;
  let img = trim(clean(readImg(`art/raw/${spec.id}/${sel.picks[0]}.png`)));
  if (sel.flip) img = flipX(img);
  const square = blank(spec.size, spec.size);
  blit(square, img, Math.floor((spec.size - img.width) / 2), Math.floor((spec.size - img.height) / 2));
  writeFileSync(`${ICONS}/${spec.id.slice('icon.'.length)}.png`, encode(square));
}

rmSync(ICONS, { recursive: true, force: true });
mkdirSync(ICONS, { recursive: true });

for (const spec of ASSETS) {
  if (spec.category === 'prop' || spec.category === 'ceiling') buildProp(spec);
  else if (spec.category === 'floor') buildFloor(spec);
  else if (spec.category === 'icon') buildIcon(spec);
  else buildCharacter(spec);
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(`Built ${Object.keys(manifest.props).length} props, ${Object.keys(manifest.floors).length} floors, ${Object.keys(manifest.characters).length} characters -> ${OUT}`);
