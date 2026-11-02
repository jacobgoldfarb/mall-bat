import { POOL_OF, baseCycle, crewSpeed, has, jobTarget, jobUnavailable } from './crew';
import { JOB, type JobDef, type JobId } from './defs';
import { LAYOUT } from './layout';
import type { Crew, GameState } from './state';
import { dayOf, md, seasonFactor } from './time';
import { ACCESS_CREW, findPath, getDerived, nodeOf, type Derived } from './world';

export interface JobEstimate {
  yields: string;
  limit: string | null;
  risk: JobDef['risk'];
  stat: { name: string; value: number };
  walk: number | null;
  blocked: string | null;
}

const walkCache = new WeakMap<Derived, Map<string, number>>();

function walkTiles(s: GameState, c: Crew, job: JobId): number | null {
  if (job === 'rest') return 0;
  const d = getDerived(s);
  let cache = walkCache.get(d);
  if (!cache) walkCache.set(d, (cache = new Map()));
  const key = `${job}:${job === 'popup' ? s.business.popupRoom : ''}`;
  if (!cache.has(key)) {
    const targets = jobTarget(s, c, job);
    const path = targets && findPath(s, nodeOf(1, LAYOUT.hatch.x, LAYOUT.hatch.y), targets, ACCESS_CREW);
    cache.set(key, path ? path.length : -1);
  }
  const tiles = cache.get(key)!;
  return tiles < 0 ? null : tiles;
}

const range = (lo: number, hi: number, unit: (n: number) => string) => {
  const a = Math.round(lo);
  const b = Math.round(hi);
  return a === b ? unit(a) : `${unit(a)}–${unit(b).replace(/^\$/, '')}`;
};
const cash = (n: number) => `$${n}`;
const per = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

function typicalCrowd(s: GameState): number {
  return Math.min(1.6, seasonFactor(dayOf(s.time)) * 0.85 * (0.5 + 0.6 * s.mallHealth));
}

function yieldText(s: GameState, c: Crew, job: JobId, cyclesPerHour: number): string {
  const [m, d] = md(dayOf(s.time));
  const n = cyclesPerHour;
  const crowd = typicalCrowd(s);
  switch (job) {
    case 'rest':
      return 'Energy back, hangs out';
    case 'fountain':
      return `${range((2.5 + c.handy * 1.2) * 0.7 * n, (2.5 + c.handy * 1.2) * 1.3 * n, cash)}/hr`;
    case 'arcade':
      return `${range((3 + c.handy * 1.6) * 0.8 * n, (3 + c.handy * 1.6) * 1.2 * n, cash)}/hr`;
    case 'busk': {
      const base = (1 + c.charm) * crowd * (has(c, 'performer') ? 1.6 : 1) * n;
      return `${range(base * 0.6, base * 1.4, cash)}/hr`;
    }
    case 'dumpster':
      return `${per(1.5 * n)} food/hr`;
    case 'vending':
      return `${per(n)} food + $${per(1.5 * n)}/hr`;
    case 'samples':
      return `${per(n)} food/hr`;
    case 'radiohut':
      return `${per((c.handy >= 4 ? 2 : 1) * n)} parts/hr`;
    case 'pallets':
      return `${per(1.5 * n)} parts/hr`;
    case 'stockroom':
      return `${per(0.8 * n)} parts + ${per(0.2 * n)} goods/hr`;
    case 'lostfound':
      return `$${per(22 * n)} + ${per(0.4 * n)} goods/hr`;
    case 'gary':
      return `+${6 + c.charm * 2} goodwill (once a night)`;
    case 'boundaries':
      return `+${per((5 * n) / Math.max(1, s.crew.length))} mood/hr`;
    case 'returns': {
      const mult = (has(c, 'returnspro') ? 1.4 : 1) * (m === 12 && d === 26 ? 1.8 : 1);
      return `${range(50 * mult * n, 80 * mult * n, cash)}/hr, ${per(n)} goods/hr`;
    }
    case 'kiosk':
    case 'popup': {
      const kiosk = job === 'kiosk';
      const chance = Math.min(0.95, ((kiosk ? 0.3 : 0.42) + c.charm * 0.08) * crowd * (has(c, 'salesman') ? 1.5 : 1));
      const sales = chance * (kiosk ? 1 : 2) * n;
      const price = kiosk ? 50 : 71;
      return `$${Math.round(sales * price)}/hr, ${per(sales)} goods/hr`;
    }
    case 'tinker':
      return `${per(n)} goods/hr from ${per(2 * n)} parts`;
  }
}

function limitText(s: GameState, job: JobId): string | null {
  const pool = POOL_OF[job];
  if (pool) {
    const left = Math.max(0, Math.floor(s.pools[pool] ?? 0));
    return job === 'fountain' || job === 'arcade' ? `$${left} left today` : `${left} left today`;
  }
  if (job === 'returns' || job === 'kiosk' || job === 'popup') return `${Math.floor(s.goods)} goods in stash`;
  if (job === 'tinker') return `${Math.floor(s.parts)} parts in stash`;
  return null;
}

export function jobEstimate(s: GameState, c: Crew, job: JobId): JobEstimate {
  const def = JOB[job];
  const tiles = walkTiles(s, c, job);
  return {
    yields: yieldText(s, c, job, 60 / baseCycle(s, c, job)),
    limit: limitText(s, job),
    risk: def.risk,
    stat: { name: def.stat.toUpperCase(), value: c[def.stat] },
    walk: tiles === null ? null : Math.round(tiles / crewSpeed(c) + (def.spot || job === 'popup' ? 3 : 0)),
    blocked: job === 'rest' ? null : jobUnavailable(s, c, job),
  };
}
