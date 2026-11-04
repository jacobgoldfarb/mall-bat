import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ASSETS, type AssetSpec } from '../art/assets';

type Pick = number | number[];
type Selections = Record<string, Pick>;

const SCALE = 3;
const DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
const CATEGORIES = ['all', 'prop', 'ceiling', 'floor', 'character', 'icon'] as const;

const api = {
  get: (path: string) => fetch(`/__art/${path}`).then((r) => r.json()),
  post: (path: string, body: unknown) => fetch(`/__art/${path}`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json()),
};

const picksOf = (p: Pick | undefined) => (p === undefined ? [] : [p].flat());
const backdrop = (spec: AssetSpec) =>
  spec.category === 'ceiling' ? 'repeating-conic-gradient(#c49a68 0 25%, #b88d5c 0 50%) 0 0 / 24px 24px' : 'repeating-conic-gradient(#ded3c2 0 25%, #d2c6b2 0 50%) 0 0 / 24px 24px';

function touchesEdge(img: HTMLImageElement) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const opaque = (x: number, y: number) => data[(y * width + x) * 4 + 3] > 0;
  for (let x = 0; x < width; x++) if (opaque(x, 0) || opaque(x, height - 1)) return true;
  for (let y = 0; y < height; y++) if (opaque(0, y) || opaque(width - 1, y)) return true;
  return false;
}

function Candidate({ spec, file, selected, onClick, tick }: { spec: AssetSpec; file: string; selected: boolean; onClick: () => void; tick: number }) {
  const [clipped, setClipped] = useState(false);
  const base = `/art/raw/${spec.id}/${file}`;
  let body;
  if (spec.category === 'character') {
    body = (
      <div class="char">
        {DIRS.map((d) => (
          <img src={`${base}/rotations/${d}.png`} style={{ height: `${48 * SCALE}px` }} />
        ))}
        <img src={`${base}/walking-6-frames/south/${tick % 6}.png`} style={{ height: `${48 * SCALE}px` }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
      </div>
    );
  } else if (spec.category === 'floor') {
    const px = spec.size * SCALE;
    body = <div style={{ width: `${px * 3}px`, height: `${px * 3}px`, background: `url(${base}) 0 0 / ${px}px ${px}px`, imageRendering: 'pixelated' }} />;
  } else if (spec.category === 'icon') {
    body = <img src={base} style={{ height: `${spec.size * SCALE}px`, background: '#1b1d3a', imageRendering: 'pixelated' }} />;
  } else {
    body = <img src={base} style={{ height: `${spec.canvas[1] * SCALE}px`, background: backdrop(spec) }} onLoad={(e) => setClipped(touchesEdge(e.currentTarget))} />;
  }
  return (
    <figure class={selected ? 'selected' : ''} onClick={onClick}>
      {body}
      <figcaption>
        #{parseInt(file)} {clipped && <b class="clipped">clipped</b>}
      </figcaption>
    </figure>
  );
}

function Review() {
  const [candidates, setCandidates] = useState<Record<string, string[]>>({});
  const [selections, setSelections] = useState<Selections>({});
  const [jobs, setJobs] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = async () => {
    setCandidates(await api.get('candidates'));
    setJobs(await api.get('jobs'));
  };

  useEffect(() => {
    refresh();
    api.get('selections').then(setSelections);
    const poll = setInterval(refresh, 4000);
    const anim = setInterval(() => setTick((t) => t + 1), 140);
    return () => {
      clearInterval(poll);
      clearInterval(anim);
    };
  }, []);

  const toggle = (spec: AssetSpec, index: number) => {
    const max = 'variants' in spec ? (spec.variants ?? 1) : 1;
    const current = picksOf(selections[spec.id]);
    const next = current.includes(index) ? current.filter((i) => i !== index) : max === 1 ? [index] : [...current, index].slice(-max);
    const updated = { ...selections };
    if (!next.length) delete updated[spec.id];
    else updated[spec.id] = next.length === 1 ? next[0] : next;
    setSelections(updated);
    api.post('selections', updated);
  };

  const visible = ASSETS.filter((a) => (category === 'all' || a.category === category) && (!pendingOnly || !(a.id in selections)));
  const picked = ASSETS.filter((a) => a.id in selections).length;

  return (
    <main>
      <header>
        <h1>Mall Bats · Art Review</h1>
        <span>
          {picked}/{ASSETS.length} picked
        </span>
        {CATEGORIES.map((c) => (
          <button class={c === category ? 'on' : ''} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
        <label>
          <input type="checkbox" checked={pendingOnly} onChange={() => setPendingOnly(!pendingOnly)} /> unpicked only
        </label>
        <button class="build" onClick={() => api.post('build', {}).then(refresh)}>
          Build sprites {jobs.build ? `(${jobs.build})` : ''}
        </button>
      </header>
      {visible.map((spec) => {
        const files = candidates[spec.id] ?? [];
        const picks = picksOf(selections[spec.id]);
        return (
          <section>
            <h2>
              {spec.id}
              {'variants' in spec && spec.variants ? <small> pick {spec.variants}</small> : null}
              <button onClick={() => api.post('generate', { id: spec.id, n: spec.category === 'character' ? 1 : 2 }).then(refresh)}>
                + {spec.category === 'character' ? 1 : 2} {jobs[spec.id] ? `(${jobs[spec.id]})` : ''}
              </button>
            </h2>
            <p>{'quirk' in spec ? `${spec.subject} — ${spec.quirk}` : spec.subject}</p>
            <div class="row">
              {files.length ? files.map((f) => <Candidate spec={spec} file={f} selected={picks.includes(parseInt(f))} onClick={() => toggle(spec, parseInt(f))} tick={tick} />) : <em>no candidates yet</em>}
            </div>
          </section>
        );
      })}
    </main>
  );
}

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; background: #14121e; color: #f4efe6; font: 13px Verdana, sans-serif; }
  header { position: sticky; top: 0; z-index: 1; display: flex; gap: 8px; align-items: center; padding: 10px 16px; background: #1e1a2e; border-bottom: 1px solid #333; }
  h1 { font-size: 16px; margin: 0 12px 0 0; }
  button { background: #2a2540; color: #f4efe6; border: 1px solid #444; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
  button.on, button.build { background: #2aa6a0; color: #06141a; }
  section { padding: 10px 16px; border-bottom: 1px solid #262236; }
  h2 { font-size: 14px; margin: 0; display: flex; gap: 10px; align-items: center; }
  h2 small { color: #ffc93e; }
  p { color: #9a8f8f; margin: 4px 0 8px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
  figure { margin: 0; padding: 4px; border: 3px solid transparent; border-radius: 6px; cursor: pointer; }
  figure.selected { border-color: #ff6db3; background: #2a1830; }
  figure img, figure div { image-rendering: pixelated; display: block; }
  figcaption { text-align: center; color: #9a8f8f; }
  .clipped { color: #ec5b3c; }
  .char { display: flex; gap: 2px; background: #3d4655; }
`;
document.head.appendChild(style);
render(<Review />, document.getElementById('review')!);
