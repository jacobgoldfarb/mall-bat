import { BUILD } from './defs';
import { LAYOUT, N, W, idx, inBounds } from './layout';
import { log, notify, pa, rand, raiseAlert, sfx, unlock } from './ops';
import type { GameState, Inspection, InspectionKind } from './state';
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
  notify(`⚠ Inspection scheduled above ${r.name}. Clear the red zone or plant a raccoon.`, { x, y, layer: 1 }, true);
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

export function revealInspection(s: GameState, ins: Inspection) {
  ins.state = 'done';
  s.stats.inspections++;
  const inZone = (x: number, y: number) => Math.max(Math.abs(x - ins.x), Math.abs(y - ins.y)) <= ins.radius;
  const room = LAYOUT.rooms[ins.room];
  const rs = s.rooms[ins.room];
  const focus = { x: ins.x, y: ins.y, layer: 1 as const };

  const decoy = s.objects.find((o) => BUILD[o.type].decoy && inZone(o.x, o.y));
  if (decoy) {
    s.objects = s.objects.filter((o) => o !== decoy);
    markDirty();
    rs.complaint = 0;
    s.stats.raccoons++;
    raiseAlert(s, -3, 'raccoon');
    unlock(s, 'RACCOONS');
    sfx('squeak');
    pa(s, `Maintenance update: the noises in ${room.name} were a RACCOON. Pest control has been notified. Carry on, shoppers.`);
    log(s, `"IT WAS RACCOONS." The decoy did its job above ${room.name}.`, 'good', focus);
    return;
  }

  const found = s.objects.filter((o) => inZone(o.x, o.y));
  let decks = 0;
  const hatch = idx(LAYOUT.hatch.x, LAYOUT.hatch.y);
  for (let y = ins.y - ins.radius; y <= ins.y + ins.radius; y++) {
    for (let x = ins.x - ins.radius; x <= ins.x + ins.radius; x++) {
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (s.deck[i] && i !== hatch) {
        s.deck[i] = 0;
        decks++;
      }
    }
  }
  const caught = s.crew.filter((c) => c.layer === 1 && c.state !== 'away' && inZone(Math.floor(c.x), Math.floor(c.y)));
  if (found.length || decks) {
    s.objects = s.objects.filter((o) => !found.includes(o));
    markDirty();
    const value = found.reduce((a, o) => a + BUILD[o.type].cost, 0) + decks * BUILD.deck.cost;
    raiseAlert(s, Math.min(13, 4 + found.length * 1.1 + decks * 0.08), `Squatter camp found above ${room.name}`);
    rs.complaint = 0;
    sfx('bad');
    pa(s, `Attention staff: evidence of trespassers found in the ceiling above ${room.name}. Security has been notified.`);
    const names = [...new Set(found.map((o) => BUILD[o.type].name))].slice(0, 4).join(', ');
    log(s, `Discovered! They tore out ${decks} decks${found.length ? ` and confiscated ${found.length} items (${names})` : ''}, worth about $${value}.`, 'bad', focus);
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
      const w = field[i] + smell[i] * 0.05 + (getDerived(s).drops.has(i) ? 0.5 : 0);
      if (w > rs.hotW) {
        rs.hotW = w;
        rs.hotX = i % W;
        rs.hotY = Math.floor(i / W);
      }
    }
  }
}
