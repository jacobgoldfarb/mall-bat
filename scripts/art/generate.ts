import { existsSync, mkdirSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { ASSET, ASSETS, type AssetSpec, type CharacterSpec, type FloorSpec, type IconSpec, type PropSpec } from '../../art/assets';
import { loadPalette, paletteSwatch } from './image';
import { DIRECTIONS, animateCharacter, balance, createCharacter, download, getCharacter, pixflux, pool } from './pixellab';
import { STYLE, promptFor } from './prompts';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const only = option('only')?.split(',');
const skip = option('skip')?.split(',') ?? [];
const category = option('category');
const count = option('n') ? Number(option('n')) : undefined;
const concurrency = Number(option('concurrency') ?? 8);

const rawDir = (id: string) => `art/raw/${id}`;
const existing = (id: string) => (existsSync(rawDir(id)) ? readdirSync(rawDir(id)).filter((f) => /^\d+(\.png)?$/.test(f)).length : 0);

const targets = ASSETS.filter(
  (a) => (!only || only.some((o) => a.id === o || a.id.startsWith(`${o}.`))) && !skip.includes(a.id) && (!category || a.category === category) && (!flag('missing') || existing(a.id) === 0),
);

if (!targets.length) {
  console.log('Nothing to generate.');
  process.exit(0);
}

const palette = paletteSwatch(loadPalette());
const log = (line: string) => {
  console.log(line);
  appendFileSync('art/raw/generate.log', `${new Date().toISOString()} ${line}\n`);
};
mkdirSync('art/raw', { recursive: true });

async function generateImage(spec: PropSpec | FloorSpec | IconSpec) {
  const n = count ?? (spec.category === 'floor' ? 3 : spec.category === 'icon' ? 4 : (spec.candidates ?? 4));
  const start = existing(spec.id);
  const prompt = promptFor(spec);
  const [width, height] = spec.category === 'floor' || spec.category === 'icon' ? [spec.size, spec.size] : spec.canvas;
  mkdirSync(rawDir(spec.id), { recursive: true });
  await Promise.all(
    Array.from({ length: n }, async (_, k) => {
      const seed = Math.floor(Math.random() * 1e9);
      const png = await pixflux({ ...STYLE[spec.category], description: prompt, width, height, palette, seed, noBackground: spec.category !== 'floor' });
      writeFileSync(`${rawDir(spec.id)}/${start + k}.png`, png);
      writeFileSync(`${rawDir(spec.id)}/${start + k}.json`, JSON.stringify({ prompt, seed, width, height, style: STYLE[spec.category] }, null, 2));
    }),
  );
  log(`${spec.id}: +${n} candidates`);
}

const walkTemplate = (spec: CharacterSpec) => (spec.template === 'dog' ? 'walk-6-frames' : 'walking-6-frames');

async function generateCharacter(spec: CharacterSpec) {
  const style = STYLE.character;
  const id = await createCharacter({ description: promptFor(spec), size: 48, outline: style.outline!, detail: style.detail!, view: style.view!, template: spec.template });
  log(`${spec.id}: character ${id} created`);
  const templates = [spec.walk && walkTemplate(spec), spec.sneak && 'sneaking'].filter(Boolean) as string[];
  for (const t of templates) {
    await animateCharacter(id, t);
    log(`${spec.id}: ${t} animated`);
  }
  await downloadCharacter(spec.id, id);
}

async function downloadCharacter(assetId: string, id: string) {
  const dir = `${rawDir(assetId)}/${existing(assetId)}`;
  const detail = await getCharacter(id);
  mkdirSync(`${dir}/rotations`, { recursive: true });
  for (const d of DIRECTIONS) writeFileSync(`${dir}/rotations/${d}.png`, await download(detail.rotation_urls![d]));
  for (const anim of detail.animations) {
    for (const { direction, frames } of anim.directions) {
      mkdirSync(`${dir}/${anim.animation_type}/${direction}`, { recursive: true });
      for (const [i, url] of frames.entries()) writeFileSync(`${dir}/${anim.animation_type}/${direction}/${i}.png`, await download(url));
    }
  }
  writeFileSync(`${dir}/character.json`, JSON.stringify({ id, prompt: detail.prompt, animations: detail.animations }, null, 2));
  log(`${assetId}: downloaded ${id} to ${dir}`);
}

const imports = option('import');
const animations = option('animate');
if (imports || animations) {
  for (const pair of (animations ?? imports)!.split(',')) {
    const [assetId, characterId] = pair.split('=');
    while ((await getCharacter(characterId)).status === 'pending') await new Promise((r) => setTimeout(r, 10_000));
    if (animations) await animateCharacter(characterId, walkTemplate(ASSET[assetId] as CharacterSpec));
    await downloadCharacter(assetId, characterId);
  }
  process.exit(0);
}

const before = (await balance()).subscription?.generations;
console.log(`Generating ${targets.length} assets (${before} generations left)`);

await pool(targets, concurrency, async (spec: AssetSpec) => {
  if (flag('missing') && existing(spec.id) > 0) return;
  try {
    if (spec.category === 'character') await generateCharacter(spec);
    else await generateImage(spec);
  } catch (e) {
    log(`${spec.id}: FAILED ${(e as Error).message}`);
  }
});

const after = (await balance()).subscription?.generations;
console.log(`Done. Used ${before !== undefined && after !== undefined ? before - after : '?'} generations, ${after} left.`);
