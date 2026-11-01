import { ARCHETYPES, FIRST_NAMES, JOB, RANKS, type JobId, type Stat } from './defs';
import { LAYOUT, N, W, idx } from './layout';
import { earn, log, rand, rankOf, raiseAlert, sfx, unlock } from './ops';
import type { Agent, Candidate, Crew, GameState, Look } from './state';
import { dayOf, phaseAt, seasonFactor, hourCurve, minuteOfDay, md } from './time';
import { ACCESS_CREW, cameraWatching, findPath, getDerived, lineOfSight, nodeOf } from './world';

const SKINS = ['#f2d0b1', '#e0b08a', '#c68e62', '#a06a42', '#7a4e2e', '#5a3820', '#f7dcc5'];
const BOTTOMS = ['#2f4a7a', '#3a5a8a', '#22304a', '#5a5a5a', '#c8b48a', '#1a1a1a', '#6a7a9a'];
const SHOES = ['#eee', '#222', '#6a4a2a', '#c84b3a', '#3a3a3a'];

export function makeLook(arch: (typeof ARCHETYPES)[number] | null): Look {
  const top = arch ? rand.pick(arch.look.top) : rand.pick(['#ff8fb8', '#8fd0ff', '#b0ff8f', '#ffe08a', '#c84b3a', '#3a6ac8', '#eeeeee', '#222', '#a24bff', '#2aa6a0', '#ff9e1b']);
  const hair = arch ? rand.pick(arch.look.hair) : rand.pick(['#3a2a1a', '#e8c87a', '#111', '#7a4a2a', '#b03a1a', '#ddd', '#5a4a3a']);
  const hat = arch ? arch.look.hat : rand.chance(0.2) ? rand.pick(['trucker', 'cap', 'beanie', 'visor']) : undefined;
  return {
    skin: rand.pick(SKINS),
    hair,
    hairStyle: rand.int(0, 4),
    top,
    bottom: rand.pick(BOTTOMS),
    shoes: rand.pick(SHOES),
    hat,
    hatColor: rand.pick(['#c84b3a', '#222', '#3a6ac8', '#e8e8e8', '#2aa6a0', '#ff4fa3']),
    build: rand.range(0.9, 1.1),
  };
}

export function makeCandidate(s: GameState, archetypeId?: string): Candidate {
  const pool = ARCHETYPES.filter((a) => !['drifter', 'santa', 'gary', 'grandma'].includes(a.id));
  const arch = archetypeId ? ARCHETYPES.find((a) => a.id === archetypeId)! : rand.pick(pool);
  const used = new Set(s.crew.map((c) => c.name));
  let name = rand.pick(FIRST_NAMES);
  for (let i = 0; i < 10 && used.has(name); i++) name = rand.pick(FIRST_NAMES);
  if (arch.id === 'grandma') name = rand.pick(['Doris', 'Mildred', 'Bev', 'Lorraine']);
  if (arch.id === 'santa') name = 'Big Lou';
  if (arch.id === 'gary') name = 'Gary';
  const jitter = (v: number) => Math.max(1, Math.min(5, v + (archetypeId ? 0 : rand.int(-1, 1))));
  return {
    name,
    archetype: arch.id,
    stealth: jitter(arch.stealth),
    charm: jitter(arch.charm),
    handy: jitter(arch.handy),
    traits: [...arch.traits],
    bio: rand.pick(arch.bios),
    look: makeLook(arch),
  };
}

export function addCrew(s: GameState, c: Candidate, at?: { x: number; y: number; layer: 0 | 1 }): Crew {
  const arch = ARCHETYPES.find((a) => a.id === c.archetype)!;
  const pos = at ?? { x: LAYOUT.hatch.x, y: LAYOUT.hatch.y, layer: 1 as const };
  const crew: Crew = {
    id: s.nextId++,
    x: pos.x + 0.5,
    y: pos.y + 0.5,
    layer: pos.layer,
    path: [],
    pathI: 0,
    goal: -1,
    facing: 0,
    look: c.look,
    moving: false,
    climb: 0,
    name: c.name,
    archetype: c.archetype,
    title: arch.title,
    bio: c.bio,
    stealth: c.stealth,
    charm: c.charm,
    handy: c.handy,
    traits: c.traits,
    energy: 75,
    hunger: 70,
    morale: 60,
    familiarity: 0,
    dayJob: 'rest',
    nightJob: 'rest',
    state: 'idle',
    timer: 0,
    workTimer: 0,
    useObj: -1,
    carrying: { cash: 0, food: 0, parts: 0, goods: 0 },
    detect: 0,
    bedId: -1,
    bannedUntil: 0,
    awayUntil: 0,
    miserable: 0,
    joinedDay: dayOf(s.time),
    earned: 0,
    thought: 'Settling in',
    hotMeal: false,
    spottedBy: -1,
    waitUntil: 0,
    recall: false,
    hiding: false,
    camWait: 0,
  };
  s.crew.push(crew);
  s.stats.peakCrew = Math.max(s.stats.peakCrew, s.crew.length);
  if (s.crew.length >= 8) unlock(s, 'FULL_HOUSE');
  return crew;
}

export const has = (c: Crew, t: string) => c.traits.includes(t as never);

export function statMult(c: Crew, stat: Stat): number {
  const v = c[stat];
  return (0.6 + 0.2 * v) * (c.morale < 30 ? 0.7 : 1);
}

export function crewSpeed(c: Crew): number {
  return 0.34 * (has(c, 'quick') ? 1.25 : 1) * (c.energy < 15 ? 0.75 : 1);
}

export function bedCapacity(s: GameState): number {
  return getDerived(s).beds.reduce((a, b) => a + b.slots, 0);
}

export function moveAgent(a: Agent, speed: number, dt: number): boolean {
  let remaining = dt;
  a.moving = false;
  if (a.climb > 0) {
    a.climb -= remaining;
    return false;
  }
  while (remaining > 0 && a.pathI < a.path.length) {
    const node = a.path[a.pathI];
    const layer = node >= N ? 1 : 0;
    const i = node % N;
    const tx = (i % W) + 0.5;
    const ty = Math.floor(i / W) + 0.5;
    if (layer !== a.layer) {
      a.layer = layer as 0 | 1;
      a.x = tx;
      a.y = ty;
      a.pathI++;
      a.climb = 3;
      return false;
    }
    const dx = tx - a.x;
    const dy = ty - a.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * remaining;
    a.moving = true;
    if (dist > 0.001) a.facing = Math.atan2(dy, dx);
    if (step >= dist) {
      a.x = tx;
      a.y = ty;
      remaining -= dist / speed;
      a.pathI++;
    } else {
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      remaining = 0;
    }
  }
  return a.pathI >= a.path.length;
}

export const agentNode = (a: Agent) => nodeOf(a.layer, Math.floor(a.x), Math.floor(a.y));

export function goTo(s: GameState, a: Agent, goals: number[] | ((n: number) => boolean), access = ACCESS_CREW): boolean {
  const path = findPath(s, agentNode(a), goals, access);
  if (!path) return false;
  a.path = path;
  a.pathI = 1;
  a.goal = path[path.length - 1];
  return true;
}

function shiftNow(s: GameState): 'day' | 'night' | null {
  const p = phaseAt(s.time);
  return p === 'open' ? 'day' : p === 'night' ? 'night' : null;
}

export function currentJob(s: GameState, c: Crew): JobId {
  const sh = shiftNow(s);
  const job = sh === 'day' ? c.dayJob : sh === 'night' ? c.nightJob : 'rest';
  if (job === 'tinker') return job;
  if (JOB[job].shift !== 'both' && JOB[job].shift !== sh) return 'rest';
  return job;
}

export function jobBlocked(s: GameState, c: Crew, job: JobId): string | null {
  const def = JOB[job];
  if (rankOf(s) < def.rank) return `Requires rank: ${RANKS[def.rank].name}`;
  if (def.shift === 'day' && c.bannedUntil > s.time) return 'Banned from day jobs for now';
  const d = getDerived(s);
  switch (job) {
    case 'kiosk':
      if (!s.business.kiosk) return 'Lease the kiosk first (Business tab)';
      if (s.goods < 1) return 'No goods to sell';
      break;
    case 'popup':
      if (s.business.popupRoom < 0) return 'Open a pop-up first (Business tab)';
      if (s.goods < 1) return 'No goods to sell';
      break;
    case 'returns':
      if (s.goods < 1) return 'No goods to return';
      break;
    case 'tinker':
      if (!d.workbenches.length) return 'Needs a powered Workbench';
      if (s.parts < 2) return 'Needs 2 parts';
      if (s.goods >= d.goodsCap) return 'Goods storage full';
      break;
    case 'gary':
      if (s.gary.recruited) return 'Gary is one of us now';
      if (s.food < 2) return 'Needs 2 food';
      if (s.flags.garyGiftDay === nightKey(s)) return 'Already left a gift tonight';
      break;
    case 'radiohut':
      if (s.rooms[LAYOUT.roomIndex['radiohut']].vacant) return 'RadioHut has closed';
      break;
  }
  const pool = POOL_OF[job];
  if (pool && (s.pools[pool] ?? 0) <= 0) return 'Picked clean for today';
  return null;
}

export const POOL_OF: Partial<Record<JobId, string>> = {
  fountain: 'fountain',
  dumpster: 'dumpster',
  vending: 'vending',
  arcade: 'arcade',
  radiohut: 'radiohut',
  pallets: 'pallets',
  lostfound: 'lostfound',
  samples: 'samples',
  stockroom: 'stockroom',
};

const nightKey = (s: GameState) => dayOf(s.time - 360);

function jobTarget(s: GameState, c: Crew, job: JobId): number[] | null {
  const def = JOB[job];
  if (job === 'tinker') {
    const benches = getDerived(s).workbenches.filter((b) => !s.crew.some((o) => o !== c && o.useObj === b.id && o.state === 'working'));
    return benches.length ? benches.map((b) => nodeOf(1, b.x, b.y)) : null;
  }
  if (job === 'popup') {
    const r = LAYOUT.rooms[s.business.popupRoom];
    return [nodeOf(0, Math.floor((r.x0 + r.x1) / 2), Math.floor((r.y0 + r.y1) / 2))];
  }
  const spot = LAYOUT.spots[def.spot!];
  return [nodeOf(0, spot.x, spot.y)];
}

export function crowdNow(s: GameState): number {
  if (phaseAt(s.time) !== 'open') return 0;
  return seasonFactor(dayOf(s.time)) * hourCurve(minuteOfDay(s.time)) * (0.5 + 0.6 * s.mallHealth);
}

function setThought(c: Crew, t: string) {
  c.thought = t;
}

function deposit(s: GameState, c: Crew) {
  const d = getDerived(s);
  const k = c.carrying;
  if (!k.cash && !k.food && !k.parts && !k.goods) return;
  const parts: string[] = [];
  if (k.cash) {
    earn(s, k.cash);
    c.earned += k.cash;
    parts.push(`$${k.cash.toFixed(0)}`);
  }
  const room = (cur: number, cap: number, add: number) => Math.max(0, Math.min(add, cap - cur));
  const food = room(s.food, d.foodCap, k.food);
  const partsIn = room(s.parts, d.partsCap, k.parts);
  const goods = room(s.goods, d.goodsCap, k.goods);
  s.food += food;
  s.parts += partsIn;
  s.goods += goods;
  if (k.food) parts.push(`${k.food} food`);
  if (k.parts) parts.push(`${k.parts} parts`);
  if (k.goods) parts.push(`${k.goods} goods`);
  const lost = k.food - food + (k.parts - partsIn) + (k.goods - goods);
  log(s, `${c.name} brought home ${parts.join(', ')}${lost ? ` (${lost} wasted: stash full)` : ''}.`, 'good', { x: Math.floor(c.x), y: Math.floor(c.y), layer: 1 });
  sfx(k.cash ? 'cash' : 'coin');
  c.carrying = { cash: 0, food: 0, parts: 0, goods: 0 };
  s.flags.firstHaul = 1;
  unlock(s, 'FIRST_NIGHT');
}

function doCycle(s: GameState, c: Crew, job: JobId): boolean {
  const k = c.carrying;
  const take = (pool: string, want: number) => {
    const got = Math.min(s.pools[pool] ?? 0, want);
    s.pools[pool] = (s.pools[pool] ?? 0) - got;
    return got;
  };
  const stealthy = 1.3 - c.stealth * 0.15;
  const shrinkage = (roomId: string, amt: number) => raiseAlert(s, amt * stealthy, `${LAYOUT.rooms[LAYOUT.roomIndex[roomId]].name} reported missing stock`);
  const crowd = crowdNow(s);
  const [m, d] = md(dayOf(s.time));
  const blackFriday = m === 11 && d === 26;
  const boxingDay = m === 12 && d === 26;
  switch (job) {
    case 'fountain': {
      const got = Math.round(take('fountain', (2.5 + c.handy * 1.2) * rand.range(0.7, 1.3) * (c.morale < 30 ? 0.7 : 1)));
      k.cash += got;
      s.stats.fountainCash += got;
      if (s.stats.fountainCash >= 100) unlock(s, 'WISHING_WELL');
      if (got) c.bubble = { text: `+$${got}`, until: s.time + 8, tone: 'happy' };
      sfx('coin');
      return got > 0;
    }
    case 'dumpster': {
      const got = take('dumpster', rand.int(1, 2));
      k.food += got;
      if (rand.chance(0.12)) k.parts += 1;
      return got > 0;
    }
    case 'vending': {
      k.food += take('vending', 1);
      k.cash += rand.int(0, 3);
      return (s.pools.vending ?? 0) > 0;
    }
    case 'arcade': {
      const got = Math.round(take('arcade', (3 + c.handy * 1.6) * rand.range(0.8, 1.2)));
      k.cash += got;
      shrinkage('funzone', 0.15);
      if (got) c.bubble = { text: `+$${got}`, until: s.time + 8, tone: 'happy' };
      sfx('coin');
      return got > 0;
    }
    case 'radiohut': {
      const got = take('radiohut', c.handy >= 4 ? 2 : 1);
      k.parts += got;
      shrinkage('radiohut', 0.35 * got);
      return got > 0;
    }
    case 'pallets': {
      k.parts += take('pallets', rand.int(1, 2));
      return (s.pools.pallets ?? 0) > 0;
    }
    case 'stockroom': {
      const got = take('stockroom', 1);
      if (rand.chance(0.2)) k.goods += got;
      else k.parts += got;
      if (got) raiseAlert(s, 0.12 * stealthy, 'Stockroom counts are off');
      return (s.pools.stockroom ?? 0) > 0;
    }
    case 'lostfound': {
      take('lostfound', 1);
      const r = rand.next();
      if (r < 0.4) k.goods += 1;
      else if (r < 0.7) k.cash += rand.int(20, 90);
      else if (r < 0.85) k.parts += 2;
      raiseAlert(s, 0.8, 'Lost & Found items missing');
      return (s.pools.lostfound ?? 0) > 0;
    }
    case 'gary': {
      if (s.food < 2) return false;
      s.food -= 2;
      s.gary.affinity = Math.min(100, s.gary.affinity + 6 + c.charm * 2);
      s.gary.gifts++;
      s.flags.garyGiftDay = nightKey(s);
      log(s, `${c.name} left a warm Cinnabomb outside the Security Office. Gary's goodwill: ${s.gary.affinity.toFixed(0)}/100.`, 'good');
      return false;
    }
    case 'busk': {
      const got = Math.round((1 + c.charm) * Math.min(1.6, crowd) * (has(c, 'performer') ? 1.6 : 1) * rand.range(0.6, 1.4));
      k.cash += got;
      if (got) c.bubble = { text: `+$${got}`, until: s.time + 8, tone: 'happy' };
      return true;
    }
    case 'samples': {
      const got = take('samples', 1);
      k.food += got;
      return got > 0;
    }
    case 'boundaries': {
      c.morale = Math.min(100, c.morale + 5);
      return true;
    }
    case 'returns': {
      if (s.goods < 1) return false;
      s.goods -= 1;
      const pro = has(c, 'returnspro');
      const got = Math.round(rand.range(50, 80) * (pro ? 1.4 : 1) * (boxingDay ? 1.8 : 1));
      k.cash += got;
      c.familiarity += pro ? 6 : 12;
      raiseAlert(s, 0.6, 'Searz loss prevention flagged a return');
      c.bubble = { text: `+$${got}`, until: s.time + 8, tone: 'happy' };
      return s.goods > 0;
    }
    case 'kiosk':
    case 'popup': {
      if (s.goods < 1) return false;
      const chance = (job === 'kiosk' ? 0.3 : 0.42) + c.charm * 0.08;
      const attempts = job === 'popup' ? 2 : 1;
      for (let i = 0; i < attempts && s.goods > 0; i++) {
        if (rand.chance(Math.min(0.95, chance * Math.min(1.5, crowd) * (has(c, 'salesman') ? 1.5 : 1)))) {
          s.goods -= 1;
          const price = Math.round((job === 'kiosk' ? rand.range(40, 60) : rand.range(58, 84)) * (blackFriday ? 1.3 : 1));
          k.cash += price;
          c.bubble = { text: `SOLD $${price}`, until: s.time + 8, tone: 'happy' };
          sfx('cash');
        }
      }
      c.familiarity = Math.max(0, c.familiarity - 3);
      return s.goods > 0;
    }
    case 'tinker': {
      const d2 = getDerived(s);
      if (s.parts < 2 || s.goods >= d2.goodsCap) return false;
      s.parts -= 2;
      s.goods += 1;
      s.stats.goodsCrafted++;
      c.bubble = { text: '+1 good', until: s.time + 8, tone: 'happy' };
      return s.parts >= 2 && s.goods < d2.goodsCap;
    }
  }
  return false;
}

function cycleLength(c: Crew, job: JobId): number {
  const def = JOB[job];
  let len = def.cycle;
  if (job === 'tinker') len = len / (0.6 + c.handy * 0.2) / (has(c, 'gearhead') ? 1.5 : 1);
  return len * rand.range(0.85, 1.15);
}

let zoneState: GameState | null = null;

export function escapeGoals(n: number) {
  return n >= N && !(zoneState && inActiveZone(zoneState, (n - N) % W, Math.floor((n - N) / W)));
}

function startHome(s: GameState, c: Crew, thought = 'Heading home') {
  if (c.layer === 1) {
    c.state = 'idle';
    return;
  }
  zoneState = s;
  if (goTo(s, c, escapeGoals) || goTo(s, c, (n: number) => n >= N)) {
    c.state = 'toHome';
    setThought(c, thought);
  } else {
    c.state = 'idle';
  }
}

function pickBed(s: GameState, c: Crew): number | null {
  const d = getDerived(s);
  const taken = new Map<number, number>();
  for (const o of s.crew) if (o !== c && o.bedId >= 0) taken.set(o.bedId, (taken.get(o.bedId) ?? 0) + 1);
  if (c.bedId >= 0 && d.beds.some((b) => b.obj.id === c.bedId)) {
    const b = d.beds.find((b) => b.obj.id === c.bedId)!;
    return nodeOf(1, b.obj.x, b.obj.y);
  }
  for (const b of d.beds) {
    if ((taken.get(b.obj.id) ?? 0) < b.slots) {
      c.bedId = b.obj.id;
      return nodeOf(1, b.obj.x, b.obj.y);
    }
  }
  c.bedId = -1;
  return null;
}

function randomDeck(s: GameState, near?: { x: number; y: number }): number | null {
  const tiles: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!s.deck[i]) continue;
    if (near && Math.hypot((i % W) - near.x, Math.floor(i / W) - near.y) > 4) continue;
    tiles.push(i);
  }
  if (!tiles.length) return null;
  return N + rand.pick(tiles);
}

function inActiveZone(s: GameState, x: number, y: number): boolean {
  return s.inspections.some((ins) => (ins.state === 'walking' || ins.state === 'climbing') && Math.max(Math.abs(ins.x - x), Math.abs(ins.y - y)) <= ins.radius);
}

function decide(s: GameState, c: Crew) {
  const job = currentJob(s, c);
  const lyingLow = c.waitUntil > s.time && job !== 'tinker';
  const blocked = job === 'rest' ? 'rest' : lyingLow ? 'lying low' : jobBlocked(s, c, job);
  const canWork = !blocked && c.energy > 15;
  const phase = phaseAt(s.time);

  if (c.hunger < 30 && s.food <= 0 && s.cash >= 4) {
    s.cash -= 4;
    c.hunger = Math.min(100, c.hunger + 45);
    setThought(c, "Bought a slice at Sbarrito's ($4)");
  }

  if (c.layer === 0) {
    if (canWork) startWork(s, c, job);
    else startHome(s, c, blocked && blocked !== 'rest' ? `Heading home (${blocked.toLowerCase()})` : 'Heading home');
    return;
  }
  if (c.hunger < 40 && s.food > 0) return startEat(s, c);
  if (canWork) return startWork(s, c, job);
  const sleepy = c.energy < 40 || (phase === 'night' && c.energy < 92) || (phase !== 'open' && c.energy < 70);
  if (sleepy) return startSleep(s, c);
  startLeisure(s, c);
}

function startWork(s: GameState, c: Crew, job: JobId) {
  const targets = jobTarget(s, c, job);
  if (!targets || !goTo(s, c, targets)) {
    setThought(c, `Can't reach ${JOB[job].name}`);
    c.state = 'idle';
    c.timer = 20;
    return;
  }
  c.state = 'toWork';
  setThought(c, `Off to ${JOB[job].name}`);
}

function startEat(s: GameState, c: Crew) {
  const plates = getDerived(s).hotPlates;
  if (plates.length && goTo(s, c, plates.map((p) => nodeOf(1, p.x, p.y)))) {
    c.state = 'toEat';
    c.hotMeal = true;
    setThought(c, 'Cooking ramen');
    return;
  }
  c.state = 'eating';
  c.hotMeal = false;
  c.timer = 15;
  setThought(c, 'Eating cold leftovers');
}

function startSleep(s: GameState, c: Crew) {
  const bed = pickBed(s, c);
  const target = bed ?? randomDeck(s, LAYOUT.hatch);
  if (target !== null && goTo(s, c, [target])) {
    c.state = 'toBed';
    setThought(c, bed ? 'Going to bed' : 'No bed. Sleeping on plywood');
    return;
  }
  c.state = 'sleeping';
  setThought(c, 'Sleeping');
}

function startLeisure(s: GameState, c: Crew) {
  const d = getDerived(s);
  const options = d.leisure.filter((o) => !s.crew.some((x) => x !== c && x.useObj === o.id && (x.state === 'leisure' || x.state === 'toLeisure')));
  if (options.length && rand.chance(0.75)) {
    const o = rand.pick(options);
    if (goTo(s, c, [nodeOf(1, o.x, o.y)])) {
      c.useObj = o.id;
      c.state = 'toLeisure';
      setThought(c, o.type === 'tv' ? 'Playing Vice City' : o.type === 'arcade' ? 'Going for the Galaga high score' : o.type === 'throne' ? 'Sitting on the throne' : 'Staring at the lava lamp');
      return;
    }
  }
  const t = randomDeck(s);
  if (t !== null && goTo(s, c, [t])) {
    c.useObj = -1;
    c.state = 'toLeisure';
    setThought(c, rand.pick(['Pacing the plywood', 'Writing in a LiveJournal', 'Listening to the muzak below', 'Counting ceiling tiles', 'Playing Snake on a Nokia']));
    return;
  }
  c.state = 'leisure';
  c.timer = 30;
}

export function updateCrew(s: GameState, c: Crew, dt: number) {
  if (c.state === 'away') {
    if (s.time >= c.awayUntil) {
      c.state = 'idle';
      c.layer = 1;
      c.x = LAYOUT.hatch.x + 0.5;
      c.y = LAYOUT.hatch.y + 0.5;
      c.path = [];
      c.detect = 0;
      log(s, `${c.name} is back from county lockup, climbing up the ladder.`, 'info');
    }
    return;
  }
  const phase = phaseAt(s.time);
  const night = phase === 'night';
  const working = c.state === 'working' || c.state === 'toWork';
  if (c.state === 'sleeping') {
    const bedBonus = c.bedId >= 0 ? 14 : 7;
    c.energy = Math.min(100, c.energy + (bedBonus * (has(c, 'lightsleeper') ? 1.3 : 1) * dt) / 60);
  } else {
    let drain = working ? 6 : 4.2;
    if (night && has(c, 'nightowl')) drain *= 0.6;
    if (!night && has(c, 'earlybird')) drain *= 0.6;
    c.energy = Math.max(0, c.energy - (drain * dt) / 60);
  }
  c.hunger = Math.max(0, c.hunger - (3.4 * (has(c, 'glutton') ? 1.5 : 1) * dt) / 60);
  if (c.hunger <= 0) c.energy = Math.max(0, c.energy - (3 * dt) / 60);

  const prevLayer = c.layer;
  if (c.state === 'fleeing') {
    const arrived = moveAgent(c, 0.58 * (has(c, 'quick') ? 1.2 : 1), dt);
    if (prevLayer === 0 && c.layer === 1) {
      escaped(s, c);
      return;
    }
    if (arrived && c.layer === 0) startFlee(s, c);
    return;
  }

  if (c.layer === 1 && c.state !== 'evacuating' && c.state !== 'toHome' && inActiveZone(s, Math.floor(c.x), Math.floor(c.y))) {
    const safe = (n: number) => n >= N && !inActiveZone(s, (n - N) % W, Math.floor((n - N) / W));
    if (goTo(s, c, safe)) {
      c.state = 'evacuating';
      setThought(c, 'Inspector coming. Clearing out!');
    }
  }

  if (c.layer === 0 && c.climb <= 0) {
    if (c.detect > 0.22) {
      const source = s.npcs.find((n) => n.id === c.spottedBy);
      const close = !!source && Math.hypot(source.x - c.x, source.y - c.y) < 4.5;
      if (close || c.detect > 0.75) {
        c.hiding = false;
        if (c.state !== 'toHome') {
          c.waitUntil = s.time + 50;
          c.useObj = -1;
          c.bubble = { text: '!?', until: s.time + 8, tone: 'alert' };
          startHome(s, c, source ? `${source.name} is coming. Backing off` : 'Too exposed. Backing off');
        }
        moveAgent(c, crewSpeed(c) * 1.3, dt);
        if ((c.layer as number) === 1) {
          deposit(s, c);
          c.state = 'idle';
        }
        return;
      }
      if (!c.hiding) {
        c.hiding = true;
        setThought(c, 'Hiding. Holding breath.');
        c.bubble = { text: '...', until: s.time + 6 };
      }
      c.moving = false;
      return;
    }
    if (c.hiding) {
      if (c.detect > 0.04) {
        c.moving = false;
        return;
      }
      c.hiding = false;
      setThought(c, 'Coast is clear');
    }
  } else c.hiding = false;

  const moving = ['toWork', 'toHome', 'toEat', 'toBed', 'toLeisure', 'evacuating'].includes(c.state);
  if (moving) {
    const next = c.path[c.pathI];
    if (c.layer === 1 && next !== undefined && next < N && c.climb <= 0) {
      const watcher = watcherNear(s, next % W, Math.floor(next / W));
      if (watcher) {
        setThought(c, `Waiting for ${watcher} to pass`);
        c.moving = false;
        if (c.state === 'toWork' && currentJob(s, c) === 'rest') decide(s, c);
        return;
      }
    }
    if (c.layer === 0 && next !== undefined && next < N && phaseAt(s.time) !== 'open' && c.climb <= 0) {
      const nx = (next % W) + 0.5;
      const ny = Math.floor(next / W) + 0.5;
      if (cameraWatching(s, nx, ny) && !cameraWatching(s, c.x, c.y) && c.camWait < 25) {
        c.camWait += dt;
        c.moving = false;
        setThought(c, 'Timing the camera sweep');
        return;
      }
    }
    if (c.camWait > 0 && c.moving !== false) c.camWait = Math.max(0, c.camWait - dt * 0.5);
    const arrived = moveAgent(c, crewSpeed(c), dt);
    if (c.moving) c.camWait = Math.max(0, c.camWait - dt);
    if (prevLayer === 0 && c.layer === 1) deposit(s, c);
    if (!arrived) {
      c.timer += dt;
      if (c.timer > 30) {
        c.timer = 0;
        if (c.state === 'toWork' && currentJob(s, c) === 'rest') return startHome(s, c);
        if (c.goal >= 0 && !goTo(s, c, [c.goal])) {
          c.state = 'idle';
          c.path = [];
        }
      }
      return;
    }
    c.timer = 0;
    switch (c.state) {
      case 'toWork': {
        const job = currentJob(s, c);
        if (job === 'rest' || jobBlocked(s, c, job)) return decide(s, c);
        c.state = 'working';
        c.workTimer = cycleLength(c, job);
        if (job === 'tinker') {
          const bench = getDerived(s).objAt.get(idx(Math.floor(c.x), Math.floor(c.y)));
          c.useObj = bench?.id ?? -1;
        }
        setThought(c, JOB[job].name);
        return;
      }
      case 'toHome':
      case 'evacuating':
        c.state = 'idle';
        return decide(s, c);
      case 'toEat':
        c.state = 'eating';
        c.timer = 20;
        return;
      case 'toBed':
        c.state = 'sleeping';
        setThought(c, c.bedId >= 0 ? 'Sleeping' : 'Sleeping on plywood');
        return;
      case 'toLeisure':
        c.state = 'leisure';
        c.timer = rand.range(40, 90);
        return;
    }
    return;
  }

  switch (c.state) {
    case 'working': {
      const job = currentJob(s, c);
      if (job === 'rest' || c.energy < 10) {
        c.useObj = -1;
        return c.layer === 0 ? startHome(s, c, 'Shift over. Heading home') : decide(s, c);
      }
      c.workTimer -= dt;
      if (job === 'tinker' && c.useObj >= 0) {
        const bench = s.objects.find((o) => o.id === c.useObj);
        if (bench) bench.usedUntil = s.time + 2;
      }
      if (c.workTimer <= 0) {
        const more = doCycle(s, c, job);
        if (!more || jobBlocked(s, c, job)) {
          c.useObj = -1;
          return c.layer === 0 ? startHome(s, c, 'Done for now. Heading home') : decide(s, c);
        }
        c.workTimer = cycleLength(c, job);
      }
      return;
    }
    case 'eating': {
      c.timer -= dt;
      if (c.hotMeal) {
        for (const p of getDerived(s).hotPlates) if (Math.floor(c.x) === p.x && Math.floor(c.y) === p.y) p.usedUntil = s.time + 2;
      }
      if (c.timer <= 0) {
        if (s.food > 0) {
          s.food -= 1;
          c.hunger = Math.min(100, c.hunger + (c.hotMeal ? 62 : 45));
          if (c.hotMeal) c.morale = Math.min(100, c.morale + 4);
        }
        c.state = 'idle';
        decide(s, c);
      }
      return;
    }
    case 'sleeping': {
      const job = currentJob(s, c);
      const wantWork = job !== 'rest' && !jobBlocked(s, c, job) && c.energy > 45;
      if (c.energy >= 99 || wantWork || (c.hunger < 25 && s.food > 0)) {
        c.state = 'idle';
        decide(s, c);
      }
      return;
    }
    case 'leisure': {
      c.timer -= dt;
      if (c.useObj >= 0) {
        const o = s.objects.find((x) => x.id === c.useObj);
        if (o) o.usedUntil = s.time + 2;
      }
      c.morale = Math.min(100, c.morale + (c.useObj >= 0 ? 0.05 : 0.01) * dt);
      const job = currentJob(s, c);
      if (c.timer <= 0 || (job !== 'rest' && !jobBlocked(s, c, job) && c.energy > 20) || c.energy < 30 || (c.hunger < 35 && s.food > 0)) {
        c.useObj = -1;
        c.state = 'idle';
        decide(s, c);
      }
      return;
    }
    case 'idle':
    default: {
      c.timer -= dt;
      if (c.timer <= 0) decide(s, c);
    }
  }
}

function watcherNear(s: GameState, x: number, y: number): string | null {
  for (const n of s.npcs) {
    if (n.kind !== 'guard' && n.kind !== 'janitor' && n.kind !== 'inspector') continue;
    if (n.state === 'asleep' || n.state === 'gone') continue;
    const d = Math.hypot(n.x - (x + 0.5), n.y - (y + 0.5));
    if (d < (n.kind === 'guard' ? 10 : 6.5) && lineOfSight(n.x, n.y, x + 0.5, y + 0.5)) return n.kind === 'janitor' ? 'the janitor' : n.name;
  }
  return null;
}

export function recallCrew(s: GameState, c: Crew) {
  if (c.state === 'away' || c.state === 'fleeing') return;
  c.waitUntil = s.time + 120;
  c.useObj = -1;
  if (c.layer === 0) startHome(s, c, 'Recalled. Heading home');
  else {
    c.state = 'idle';
    c.timer = 0;
    setThought(c, 'Laying low');
  }
}

export function startFlee(s: GameState, c: Crew) {
  c.state = 'fleeing';
  setThought(c, 'RUN!');
  c.bubble = { text: '!!', until: s.time + 20, tone: 'alert' };
  zoneState = s;
  if (!goTo(s, c, escapeGoals) && !goTo(s, c, (n: number) => n >= N)) c.path = [];
}

function escaped(s: GameState, c: Crew) {
  c.state = 'idle';
  c.detect = 0;
  s.stats.spotted++;
  s.spottedTonight = true;
  deposit(s, c);
  raiseAlert(s, 3, `${c.name} was seen fleeing into the ceiling`);
  log(s, `${c.name} made it back up. That was close.`, 'warn', { x: Math.floor(c.x), y: Math.floor(c.y), layer: 1 });
  sfx('escape');
  for (const n of s.npcs) if (n.chaseId === c.id) n.state = 'search';
}

export function crewCaught(s: GameState, c: Crew, byName: string) {
  c.state = 'away';
  c.awayUntil = Infinity;
  c.path = [];
  c.carrying = { cash: 0, food: 0, parts: 0, goods: 0 };
  c.detect = 0;
  c.bedId = -1;
  s.stats.caught++;
  s.spottedTonight = true;
  raiseAlert(s, 8, `${c.name} was caught by ${byName}`);
  sfx('caught');
  const bail = 60 + s.crew.length * 15;
  s.modals.push({
    id: s.nextId++,
    title: `${c.name} got caught`,
    art: 'caught',
    body: `${byName} caught ${c.name} red-handed in the mall after hours. The police were called. ${c.name} didn't say a word about the ceiling.\n\nPost bail and they sneak back in after two days. Or let them sit it out in county for five.`,
    choices: [
      { label: `Post bail ($${bail})`, action: `bail:${c.id}:${bail}`, disabled: s.cash < bail ? 'Not enough cash' : undefined },
      { label: 'Let them sit it out (5 days)', action: `wait:${c.id}` },
      ...(s.crew.length > 1 ? [{ label: 'Cut them loose', action: `cut:${c.id}` }] : []),
    ],
  });
}

export function hourlyCrew(s: GameState) {
  const d = getDerived(s);
  const count = Math.max(1, s.crew.filter((c) => c.state !== 'away').length);
  const comfortPer = Math.min(36, (d.comfort / count) * 4);
  const jolly = s.crew.some((c) => has(c, 'jolly') && c.state !== 'away') ? 6 : 0;
  const cold = new Date(2004, 9, 1 + dayOf(s.time)).getMonth() === 11;
  const heaters = s.objects.some((o) => o.type === 'heater' && o.powered);
  for (const c of s.crew) {
    if (c.state === 'away') continue;
    let target = 38 + comfortPer + jolly;
    if (c.bedId < 0) target -= 14;
    if (c.hunger < 20) target -= 18;
    if (c.energy < 20) target -= 12;
    if (cold && !heaters) target -= 10;
    if (count > bedCapacity(s) + 1) target -= 6;
    target = Math.max(0, Math.min(100, target));
    c.morale += (target - c.morale) * 0.08;
    if (c.morale < 12) c.miserable += 1;
    else c.miserable = Math.max(0, c.miserable - 0.5);
  }
}

export function crewLeaves(s: GameState, c: Crew, reason: string) {
  s.crew = s.crew.filter((x) => x !== c);
  log(s, `${c.name} left the crew. ${reason}`, 'bad');
  sfx('bad');
}

export function familiarityTick(s: GameState, c: Crew, rate: number, dt: number) {
  const mult = has(c, 'invisible') ? 0.1 : 1;
  const crackdown = (s.flags.crackdownUntil ?? 0) > s.time ? 2 : 1;
  const halloween = s.flags.costumeDay === dayOf(s.time) ? 0 : 1;
  c.familiarity = Math.min(100, Math.max(0, c.familiarity + rate * mult * crackdown * halloween * dt));
  if (c.familiarity >= 100) {
    c.familiarity = 50;
    c.bannedUntil = s.time + 3 * 1440;
    raiseAlert(s, 3, `Officer Dana is suspicious of ${c.name}`);
    log(s, `Officer Dana stopped ${c.name}: "You're here every single day. You got a home?" ${c.name} is laying low from day jobs for 3 days.`, 'bad', { x: Math.floor(c.x), y: Math.floor(c.y), layer: 0 });
    startHome(s, c, 'Spooked by the mall cop');
  }
}

export function idleBubble(s: GameState, c: Crew) {
  if (c.layer !== 1 || c.bubble && c.bubble.until > s.time) return;
  if (c.state === 'sleeping' && has(c, 'snorer')) c.bubble = { text: 'ZZZ', until: s.time + 6 };
  else if (c.state === 'sleeping' && rand.chance(0.05)) c.bubble = { text: 'z', until: s.time + 5 };
}

export function noiseFromCrew(s: GameState, field: Float32Array, spread: (f: Float32Array, x: number, y: number, n: number) => void) {
  for (const c of s.crew) {
    if (c.layer !== 1 || c.state === 'away') continue;
    const x = Math.floor(c.x);
    const y = Math.floor(c.y);
    if (c.moving) spread(field, x, y, has(c, 'loud') ? 0.7 : 0.28);
    if (c.state === 'sleeping' && has(c, 'snorer')) spread(field, x, y, 2.2);
  }
}

export function crewAt(s: GameState, layer: 0 | 1, x: number, y: number): Crew | undefined {
  return s.crew.find((c) => c.state !== 'away' && c.layer === layer && Math.floor(c.x) === x && Math.floor(c.y) === y);
}