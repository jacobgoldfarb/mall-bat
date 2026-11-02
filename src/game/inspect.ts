import { BUILD } from './defs';
import { LAYOUT, N, W, idx, inBounds } from './layout';
import { log, notify, pa, rand, raiseAlert, sfx, unlock } from './ops';
import type { GameState, Inspection, InspectionKind, Placed } from './state';
import { dayOf, minuteOfDay } from './time';
import { getDerived, markDirty, roomTiles } from './world';

const RADIUS: Record<InspectionKind, number> = { complaint: 3, power: 2, pest: 3, fire: 4, sweep: 5 };

export function nextMorning(s: GameState, hour = 7): number {
  const day = dayOf(s.time);
  const today = day * 1440 + hour * 60;
  return minuteOfDay(s.time) < hour * 60 - 30 ? today : today + 1440;
}

export function scheduleInspection(s: GameState, room: number, kind: InspectionKind, reason: string, at?: { x: number; y: number }): Inspection | null {
  if (s.inspections.some((i) => i.room === room && i.state !== 'done' && i.kind === kind)) return null;
  const r = LAYOUT.rooms[room];
  const rs = s.rooms[room];
  let x = at?.x ?? (rs.hotW > 0 ? rs.hotX : rand.int(r.x0, r.x1));
  let y = at?.y ?? (rs.hotW > 0 ? rs.hotY : rand.int(r.y0, r.y1));
  x = Math.max(r.x0, Math.min(r.x1, x));
  y = Math.max(r.y0, Math.min(r.y1, y));
  const pending = s.inspections.filter((i) => i.state === 'scheduled').length;
  const ins: Inspection = {
    id: s.nextId++,
    room,
    x,
    y,
    radius: RADIUS[kind],
    kind,
    at: nextMorning(s) + pending * 35,
    state: 'scheduled',
    npcId: -1,
    reason,
  };
  s.inspections.push(ins);
  const who = kind === 'fire' ? 'The Fire Marshal' : kind === 'pest' ? 'Pest control' : kind === 'power' ? 'An electrician' : 'Maintenance';
  pa(s, `${who} will check the ceiling in ${r.name} tomorrow morning. ${reason}`);
  notify(`Inspection tomorrow above ${r.name}.`, { x, y, layer: 1 }, true);
  sfx('alert');
  return ins;
}

export function scheduleNear(s: GameState, kind: InspectionKind, reason: string, count: number) {
  const decks: number[] = [];
  for (let i = 0; i < N; i++) if (s.deck[i]) decks.push(i);
  for (let k = 0; k < count; k++) {
    let x: number;
    let y: number;
    if (decks.length) {
      const t = rand.pick(decks);
      x = (t % W) + rand.int(-3, 3);
      y = Math.floor(t / W) + rand.int(-3, 3);
    } else {
      x = rand.int(8, 40);
      y = rand.int(4, 21);
    }
    if (!inBounds(x, y)) continue;
    const room = LAYOUT.roomAt[idx(x, y)];
    if (room < 0 || !LAYOUT.rooms[room].ceiling || LAYOUT.rooms[room].kind === 'court') continue;
    scheduleInspection(s, room, kind, reason, { x, y });
  }
}

const BASE_SUSPICION: Record<InspectionKind, number> = { pest: 0.15, complaint: 0.25, power: 0.35, fire: 0.5, sweep: 0.9 };
const SIGN_LIMIT = 0.6;
const RACCOON_LIMIT = 0.7;
const SIGN_FATIGUE = 0.04;
const RACCOON_FATIGUE = 0.05;
export const FATIGUE_KEPT_PER_DAY = 0.85;

export function inZone(ins: Inspection, x: number, y: number): boolean {
  return Math.max(Math.abs(x - ins.x), Math.abs(y - ins.y)) <= ins.radius;
}

export function suspicion(s: GameState, ins: Inspection): number {
  const d = getDerived(s);
  const tippedOff = d.scanner ? 0.1 : 0;
  return Math.max(0, Math.min(1, BASE_SUSPICION[ins.kind] + s.alert / 250 + s.excuseFatigue - tippedOff));
}

export interface InspectionForecast {
  suspicion: number;
  verdict: 'sign' | 'raccoon' | 'search';
  confiscated: Placed[];
  stashed: Placed[];
  decoy: Placed | null;
  deckTiles: number[];
  crewHome: boolean;
  value: number;
}

export function forecastInspection(s: GameState, ins: Inspection): InspectionForecast {
  const d = getDerived(s);
  const sus = suspicion(s, ins);
  const crewHome = s.crew.some((c) => c.layer === 1 && c.state !== 'away');
  const base = { suspicion: sus, confiscated: [], stashed: [], decoy: null, deckTiles: [], crewHome, value: 0 };
  const signs = ins.kind !== 'fire' && ins.kind !== 'sweep' && d.signs.some((o) => Math.max(Math.abs(o.x - ins.x), Math.abs(o.y - ins.y)) <= BUILD[o.type].deterRadius!);
  if (signs && sus < SIGN_LIMIT) return { ...base, verdict: 'sign' };
  const decoy = s.objects.find((o) => BUILD[o.type].decoy && inZone(ins, o.x, o.y));
  if (decoy && sus < RACCOON_LIMIT) return { ...base, verdict: 'raccoon', decoy };

  const confiscated: Placed[] = [];
  const stashed: Placed[] = [];
  const kept = new Set<number>();
  for (const o of s.objects) {
    if (!inZone(ins, o.x, o.y)) continue;
    if (crewHome && BUILD[o.type].portable) {
      stashed.push(o);
      kept.add(idx(o.x, o.y));
    } else confiscated.push(o);
  }
  const hatch = idx(LAYOUT.hatch.x, LAYOUT.hatch.y);
  const deckTiles: number[] = [];
  for (let y = ins.y - ins.radius; y <= ins.y + ins.radius; y++)
    for (let x = ins.x - ins.radius; x <= ins.x + ins.radius; x++) {
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (s.deck[i] && i !== hatch && !kept.has(i)) deckTiles.push(i);
    }
  const value = confiscated.reduce((a, o) => a + BUILD[o.type].cost, 0) + deckTiles.length * BUILD.deck.cost;
  return { ...base, verdict: 'search', confiscated, stashed, deckTiles, value };
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export function forecastLabel(f: InspectionForecast): string {
  if (f.verdict === 'sign') return "They'll see the sign and leave";
  if (f.verdict === 'raccoon') return "They'll blame the raccoon";
  const parts: string[] = [];
  if (f.confiscated.length || f.deckTiles.length) parts.push(`Will find ${count(f.confiscated.length, 'item')} + ${count(f.deckTiles.length, 'deck')} ($${f.value})`);
  else parts.push('Nothing to find');
  if (f.stashed.length) parts.push(`${f.stashed.length} stashed`);
  return parts.join(' · ');
}

export function revealInspection(s: GameState, ins: Inspection) {
  const forecast = forecastInspection(s, ins);
  ins.state = 'done';
  s.stats.inspections++;
  const room = LAYOUT.rooms[ins.room];
  const rs = s.rooms[ins.room];
  const focus = { x: ins.x, y: ins.y, layer: 1 as const };
  const tired = s.excuseFatigue > 0.1;

  if (forecast.verdict === 'sign') {
    s.excuseFatigue += SIGN_FATIGUE;
    rs.complaint = Math.max(0, rs.complaint - 30);
    s.stats.inspectionsFoundNothing++;
    log(s, `Dale shined his flashlight on the ASBESTOS sign above ${room.name}, said "nope," and wrote it up as checked.${tired ? ' He did squint at it longer this time.' : ''}`, 'good', focus);
    sfx('good');
    return;
  }

  if (forecast.verdict === 'raccoon') {
    s.excuseFatigue += RACCOON_FATIGUE;
    rs.complaint = 0;
    s.stats.raccoons++;
    s.objects = s.objects.filter((o) => o !== forecast.decoy);
    markDirty();
    raiseAlert(s, -3, 'raccoon');
    unlock(s, 'RACCOONS');
    sfx('squeak');
    pa(s, `Maintenance update: the noises in ${room.name} were a RACCOON. Pest control has been notified. Carry on, shoppers.`);
    log(s, tired ? `"Another raccoon? Same one?" The decoy above ${room.name} worked, barely.` : `"IT WAS RACCOONS." Pest control hauled the decoy out of the ceiling above ${room.name}. Worth every penny.`, 'good', focus);
    return;
  }

  const { confiscated, stashed, deckTiles, value } = forecast;
  const decks = deckTiles.length;
  const lost = new Set(confiscated);
  for (const i of deckTiles) s.deck[i] = 0;
  const caught = s.crew.filter((c) => c.layer === 1 && c.state !== 'away' && inZone(ins, Math.floor(c.x), Math.floor(c.y)));
  if (stashed.length) log(s, `The Bats scrambled and stashed ${count(stashed.length, 'portable item')} out of the zone before the ladder went up.`, 'info', focus);
  if (confiscated.length || decks) {
    s.objects = s.objects.filter((o) => !lost.has(o));
    markDirty();
    raiseAlert(s, Math.min(13, 4 + confiscated.length * 1.1 + decks * 0.08), `Squatter camp found above ${room.name}`);
    rs.complaint = 0;
    sfx('bad');
    pa(s, `Attention staff: evidence of trespassers found in the ceiling above ${room.name}. Security has been notified.`);
    const names = [...new Set(confiscated.map((o) => BUILD[o.type].name))].slice(0, 4).join(', ');
    log(s, `Discovered! They tore out ${count(decks, 'deck')}${confiscated.length ? ` and confiscated ${count(confiscated.length, 'item')} (${names})` : ''}, worth about $${value}.`, 'bad', focus);
  } else {
    s.stats.inspectionsFoundNothing++;
    rs.complaint = Math.max(0, rs.complaint - 20);
    raiseAlert(s, -2, 'nothing found');
    unlock(s, 'NOTHING');
    log(s, `Dale poked his head into the ceiling above ${room.name}. "Nothing up here but dust. Must be the pipes."`, 'good', focus);
    sfx('good');
  }
  if (caught.length) {
    s.stats.spotted += caught.length;
    raiseAlert(s, 3 * caught.length, 'a face in the ceiling');
    log(s, `${caught.map((c) => c.name).join(' and ')} scrambled off across the plywood as a flashlight swept the ceiling. They saw someone.`, 'bad', focus);
  }
}

export function inspectionHotspotUpdate(s: GameState, field: Float32Array, smell: number[]) {
  for (let ri = 0; ri < LAYOUT.rooms.length; ri++) {
    const r = LAYOUT.rooms[ri];
    if (!r.ceiling) continue;
    const rs = s.rooms[ri];
    rs.hotW *= 0.995;
    for (const i of roomTiles(ri)) {
      const d = getDerived(s);
      const w = field[i] + smell[i] * 0.05 + (d.drops.has(i) ? 0.5 : 0) + (d.objAt.get(i)?.type === 'siphon' ? 0.7 : 0);
      if (w > rs.hotW) {
        rs.hotW = w;
        rs.hotX = i % W;
        rs.hotY = Math.floor(i / W);
      }
    }
  }
}
