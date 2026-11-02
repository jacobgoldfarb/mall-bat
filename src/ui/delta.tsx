import { useRef } from 'preact/hooks';

interface Float {
  id: number;
  amount: number;
  born: number;
}

const LIFE_MS = 1400;
const MERGE_MS = 500;
let nextId = 1;

export function Delta({ value, scope, min = 1, format = String }: { value: number; scope: object; min?: number; format?: (n: number) => string }) {
  const prev = useRef<number | null>(null);
  const owner = useRef<object>(scope);
  const floats = useRef<Float[]>([]);
  const now = performance.now();
  const current = Math.floor(value);
  if (prev.current === null || owner.current !== scope) {
    prev.current = current;
    owner.current = scope;
    floats.current = [];
  }
  const diff = current - prev.current;
  if (Math.abs(diff) >= min) {
    const last = floats.current[floats.current.length - 1];
    if (last && now - last.born < MERGE_MS && Math.sign(last.amount) === Math.sign(diff)) last.amount += diff;
    else floats.current.push({ id: nextId++, amount: diff, born: now });
    prev.current = current;
  }
  floats.current = floats.current.filter((f) => now - f.born < LIFE_MS);
  return (
    <span class="deltas">
      {floats.current.map((f) => (
        <i key={f.id} class={f.amount > 0 ? 'up' : 'down'}>
          {f.amount > 0 ? '+' : '−'}
          {format(Math.abs(f.amount))}
        </i>
      ))}
    </span>
  );
}
