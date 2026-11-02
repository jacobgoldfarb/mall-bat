import { BUILD, type BuildId } from '../game/defs';
import { LAYOUT, type Fixture } from '../game/layout';
import { hash2 } from '../game/rng';
import { box, centeredBox, diamondPath, ellipse, faceQuad, isoText, rectBox, type Ctx } from './draw';
import { isoX, isoY, rgba, shade } from './iso';
import { drawPropSprite, hasProp } from './sprites';

function cx(x: number, y: number) {
  return isoX(x + 0.5, y + 0.5);
}
function cy(x: number, y: number, z = 0) {
  return isoY(x + 0.5, y + 0.5, z);
}

function glowScreen(ctx: Ctx, x: number, y: number, z0: number, z1: number, inset: number, color: string, t: number, flicker = true) {
  const a = flicker ? 0.75 + Math.sin(t * 0.9 + x * 3 + y) * 0.15 : 0.9;
  ctx.save();
  ctx.globalAlpha = a;
  faceQuad(ctx, x + inset, y + 1 - 0.02, x + 1 - inset, y + 1 - 0.02, z0, z1, color);
  ctx.restore();
}

const KIOSK_SPRITES: Record<string, string> = {
  'CELL-U-LAR': 'fixture.kiosk.cellular',
  'SHADES HUT': 'fixture.kiosk.shades',
  'PHONE CHARMZ': 'fixture.kiosk.charmz',
};

function fixtureSprite(f: Fixture): string | null {
  const room = f.room >= 0 ? LAYOUT.rooms[f.room] : null;
  const options =
    f.kind === 'kiosk'
      ? [KIOSK_SPRITES[f.label ?? ''], 'fixture.kiosk.charmz']
      : f.kind === 'counter'
        ? [room?.kind === 'food' && `fixture.counter.${room.id}`, f.w > 1 ? 'fixture.counter.wide' : 'fixture.counter']
        : [room && `fixture.${f.kind}.${room.id}`, `fixture.${f.kind}`];
  return options.find((id): id is string => !!id && hasProp(id)) ?? null;
}

export function drawFixture(ctx: Ctx, f: Fixture, t: number, night: boolean, vacant: boolean) {
  const { x, y } = f;
  const r = hash2(x, y, f.seed);
  if (vacant && !['ladder', 'car', 'lamppost', 'boxes'].includes(f.kind)) {
    if (r < 0.5 && !drawPropSprite(ctx, 'fixture.vacant', x, y, { seed: f.seed })) rectBox(ctx, x, y, 0.5, 0.5, 6, '#6a645a');
    return;
  }
  const sprite = fixtureSprite(f);
  if (sprite && drawPropSprite(ctx, sprite, x, y, { w: f.w, d: f.d, seed: f.seed })) {
    if (f.kind === 'servicedesk' && f.label) isoText(ctx, f.label, x + f.w / 2, y + 0.4, 46, 'x', 7, '#fff', { glow: f.color });
    return;
  }
  switch (f.kind) {
    case 'fountain': {
      box(ctx, x + 0.05, y + 0.05, 1.9, 1.9, 9, '#cfc6b4', 0, { top: '#b8ae9a' });
      ctx.fillStyle = night ? '#1b5a6a' : '#3cc6d8';
      ctx.beginPath();
      diamondPath(ctx, x + 0.2, y + 0.2, 1.6, 1.6, 9);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.06 + i / 3) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(isoX(x + 1, y + 1), isoY(x + 1, y + 1, 9), 4 + ph * 26, 2 + ph * 13, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let k = 0; k < 14; k++) {
        const h = hash2(k, 7, f.seed);
        ctx.fillStyle = h > 0.5 ? '#e8c84a' : '#c9c9c9';
        ctx.fillRect(isoX(x + 0.4 + h * 1.2, y + 0.4 + hash2(k, 3) * 1.2) - 1, isoY(x + 0.4 + h * 1.2, y + 0.4 + hash2(k, 3) * 1.2, 9) - 0.5, 2, 1);
      }
      box(ctx, x + 0.82, y + 0.82, 0.36, 0.36, 26, '#e8e0cf');
      ellipse(ctx, isoX(x + 1, y + 1), isoY(x + 1, y + 1, 36), 10, 5, '#d8cfbe');
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.05 + i / 10) % 1;
        const ang = (i / 10) * Math.PI * 2;
        const sx = isoX(x + 1, y + 1) + Math.cos(ang) * ph * 16;
        const sy = isoY(x + 1, y + 1, 38) + Math.sin(ang) * ph * 8 - Math.sin(ph * Math.PI) * 14 + ph * 26;
        ctx.fillStyle = `rgba(200,240,255,${0.8 - ph * 0.6})`;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      return;
    }
    case 'palm': {
      box(ctx, x + 0.2, y + 0.2, 0.6, 0.6, 12, '#a88a62');
      ellipse(ctx, cx(x, y), cy(x, y, 12), 10, 5, '#4a3a22');
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx(x, y), cy(x, y, 12));
      ctx.quadraticCurveTo(cx(x, y) + 4, cy(x, y, 40), cx(x, y) + 1, cy(x, y, 60));
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.sin(t * 0.02 + i) * 0.05;
        ctx.strokeStyle = i % 2 ? '#2f8f4e' : '#3aa65c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const ox = cx(x, y) + 1;
        const oy = cy(x, y, 60);
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(ox + Math.cos(a) * 14, oy + Math.sin(a) * 6 - 8, ox + Math.cos(a) * 24, oy + Math.sin(a) * 10 + 6);
        ctx.stroke();
      }
      return;
    }
    case 'bench':
      rectBox(ctx, x, y, 0.85, 0.35, 6, '#555', 0);
      rectBox(ctx, x, y, 0.9, 0.42, 3, f.color, 6);
      return;
    case 'kiosk': {
      box(ctx, x + 0.1, y + 0.1, 0.8, 0.8, 18, f.color, 0, { top: '#f4f0e8' });
      for (const [px, py] of [
        [0.12, 0.12],
        [0.82, 0.12],
        [0.82, 0.82],
        [0.12, 0.82],
      ])
        box(ctx, x + px, y + py, 0.06, 0.06, 22, '#ddd', 18);
      box(ctx, x - 0.02, y - 0.02, 1.04, 1.04, 5, f.color, 40, { top: shade(f.color, 0.2) });
      if (f.label) isoText(ctx, f.label, x + 0.5, y + 1.02, 42.5, 'x', 6.5, '#fff');
      for (let i = 0; i < 5; i++) rectBox(ctx, x - 0.25 + i * 0.12, y, 0.08, 0.08, 4, ['#ff3355', '#2a7fff', '#ffd000', '#2fd17a', '#fff'][i], 18);
      return;
    }
    case 'table':
      rectBox(ctx, x, y, 0.1, 0.1, 10, '#777');
      rectBox(ctx, x, y, 0.7, 0.7, 2, f.color, 10);
      for (const [ox, oy] of [
        [-0.32, 0],
        [0.32, 0],
        [0, 0.32],
        [0, -0.32],
      ])
        box(ctx, x + 0.4 + ox, y + 0.4 + oy, 0.2, 0.2, 6, f.color2);
      return;
    case 'trash':
      rectBox(ctx, x, y, 0.4, 0.4, 14, f.color);
      ellipse(ctx, cx(x, y), cy(x, y, 14), 6, 3, '#222');
      return;
    case 'cabinet': {
      rectBox(ctx, x, y, 0.62, 0.55, 40, f.color);
      glowScreen(ctx, x + 0.05, y - 0.27, 20, 34, 0.25, f.color2, t);
      rectBox(ctx, x, y, 0.66, 0.6, 6, shade(f.color2, -0.2), 40);
      return;
    }
    case 'ddr': {
      box(ctx, x - 0.1, y - 0.1, 1.2, 1.2, 3, '#333');
      const lit = Math.floor(t * 0.4) % 4;
      ['#ff2bd6', '#2bfff0', '#ffe52b', '#7cff2b'].forEach((c, i) => {
        const ox = [0.45, 0.15, 0.75, 0.45][i];
        const oy = [0.15, 0.45, 0.45, 0.75][i];
        box(ctx, x - 0.1 + ox, y - 0.1 + oy, 0.25, 0.25, 1, i === lit ? c : shade(c, -0.6), 3);
      });
      rectBox(ctx, x, y - 0.5, 0.9, 0.2, 44, '#222');
      glowScreen(ctx, x + 0.05, y - 0.68, 26, 40, 0.2, f.color2, t);
      return;
    }
    case 'airhockey':
      rectBox(ctx, x, y, 0.9, 0.6, 14, f.color, 0, { top: '#bfe0ff' });
      ellipse(ctx, cx(x, y) + Math.sin(t * 0.3) * 6, cy(x, y, 14) + Math.cos(t * 0.23) * 3, 2, 1, '#ff2b2b');
      return;
    case 'prize':
      box(ctx, x, y + 0.1, f.w, 0.7, 16, '#3a1a5a', 0, { top: '#c8e8ff' });
      for (let i = 0; i < 8; i++) ellipse(ctx, isoX(x + 0.2 + i * 0.22, y + 0.45), isoY(x + 0.2 + i * 0.22, y + 0.45, 17), 3, 2, ['#ff2bd6', '#ffe52b', '#2bfff0', '#ff8c1a'][i % 4]);
      return;
    case 'tokens':
      rectBox(ctx, x, y, 0.5, 0.45, 34, f.color);
      glowScreen(ctx, x + 0.1, y - 0.22, 22, 30, 0.3, '#fff2a0', t, false);
      return;
    case 'rack': {
      rectBox(ctx, x, y, 0.08, 0.08, 22, '#888');
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(isoX(x + 0.1, y + 0.5), isoY(x + 0.1, y + 0.5, 24));
      ctx.lineTo(isoX(x + 0.9, y + 0.5), isoY(x + 0.9, y + 0.5, 24));
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const gx = x + 0.15 + i * 0.13;
        faceQuad(ctx, gx, y + 0.42, gx + 0.1, y + 0.58, 8, 23, shade(f.color2, (hash2(i, x + y) - 0.5) * 0.5));
      }
      return;
    }
    case 'shelf':
    case 'bookshelf': {
      const h = f.kind === 'bookshelf' ? 34 : 28;
      rectBox(ctx, x, y, 0.8, 0.42, h, f.color);
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 5; i++) {
          const c = hash2(i + row * 7, x * 13 + y, f.seed) > 0.5 ? f.color2 : shade(f.color2, -0.3);
          const gx = x + 0.12 + i * 0.15;
          faceQuad(ctx, gx, y + 0.72, gx + 0.11, y + 0.72, 4 + row * (h / 3.2), 4 + row * (h / 3.2) + h / 4.5, c);
        }
      }
      return;
    }
    case 'counter': {
      box(ctx, x + 0.05, y + 0.15, f.w - 0.1, 0.7, 14, f.color, 0, { top: f.color2 });
      if (f.w > 1) {
        rectBox(ctx, x + 0.2, y, 0.3, 0.3, 7, '#333', 14);
        ctx.fillStyle = '#7fd6ff';
        ctx.fillRect(cx(x + 0.2, y) - 3, cy(x + 0.2, y, 21) - 3, 6, 3);
      }
      return;
    }
    case 'cdbin':
      rectBox(ctx, x, y, 0.75, 0.5, 12, f.color);
      for (let i = 0; i < 6; i++) faceQuad(ctx, x + 0.18 + i * 0.11, y + 0.5, x + 0.26 + i * 0.11, y + 0.5, 12, 17, i % 2 ? f.color2 : '#eee');
      return;
    case 'display':
      rectBox(ctx, x, y, 0.75, 0.75, 10, f.color);
      for (let i = 0; i < 4; i++) rectBox(ctx, x - 0.2 + (i % 2) * 0.4, y - 0.2 + Math.floor(i / 2) * 0.4, 0.22, 0.22, 4 + (i % 3) * 2, i % 2 ? f.color2 : shade(f.color2, 0.3), 10);
      return;
    case 'case':
      rectBox(ctx, x, y, 0.85, 0.5, 14, '#2a2a2a');
      ctx.save();
      ctx.globalAlpha = 0.45;
      rectBox(ctx, x, y, 0.85, 0.5, 8, '#cfefff', 14);
      ctx.restore();
      for (let i = 0; i < 3; i++) ellipse(ctx, isoX(x + 0.3 + i * 0.2, y + 0.5), isoY(x + 0.3 + i * 0.2, y + 0.5, 15), 1.6, 1, '#ffe27a');
      return;
    case 'cage':
      rectBox(ctx, x, y, 0.7, 0.5, 8, '#555');
      ctx.save();
      ctx.globalAlpha = 0.6;
      rectBox(ctx, x, y, 0.7, 0.5, 14, f.color2, 8);
      ctx.restore();
      ellipse(ctx, cx(x, y) + Math.sin(t * 0.2 + x) * 4, cy(x, y, 14), 2.5, 1.5, '#ffeb6a');
      return;
    case 'toybin':
      rectBox(ctx, x, y, 0.8, 0.8, 10, f.color);
      for (let i = 0; i < 6; i++) ellipse(ctx, cx(x, y) + (hash2(i, x) - 0.5) * 22, cy(x, y, 12) + (hash2(i, y) - 0.5) * 8, 3.5, 3, ['#ff3355', '#2a7fff', '#2fd17a', '#ffd000', '#a24bff', '#fff'][i]);
      return;
    case 'desk':
      rectBox(ctx, x, y, 0.85, 0.55, 12, f.color);
      rectBox(ctx, x, y, 0.3, 0.25, 10, '#ddd', 12);
      glowScreen(ctx, x + 0.05, y - 0.12, 15, 21, 0.38, f.color2, t);
      return;
    case 'monitors':
      rectBox(ctx, x, y, 0.85, 0.5, 10, '#333');
      for (let i = 0; i < 4; i++) {
        const ox = (i % 2) * 0.4 - 0.2;
        const oz = Math.floor(i / 2) * 11;
        rectBox(ctx, x + ox, y, 0.36, 0.3, 10, '#222', 10 + oz);
        glowScreen(ctx, x + ox + 0.05, y - 0.08, 12 + oz, 19 + oz, 0.42, '#7fd6ff', t + i * 5);
      }
      return;
    case 'lostfound':
      rectBox(ctx, x, y, 0.75, 0.6, 16, f.color);
      for (let i = 0; i < 4; i++) rectBox(ctx, x - 0.2 + i * 0.13, y - 0.05, 0.18, 0.2, 5 + i, ['#c84b3a', '#ffd000', '#2fd17a', '#fff'][i], 16);
      return;
    case 'dumpster':
      box(ctx, x - 0.2, y + 0.1, 1.4, 0.8, 20, f.color, 0, { top: '#1a2a1a' });
      box(ctx, x - 0.22, y + 0.08, 1.44, 0.4, 2, f.color2, 20);
      return;
    case 'pallet':
      rectBox(ctx, x, y, 0.9, 0.9, 4, f.color);
      for (let i = 0; i < 3; i++) rectBox(ctx, x - 0.2 + i * 0.22, y - 0.1 + (i % 2) * 0.2, 0.35, 0.35, 9 + i * 2, i % 2 ? '#b08b5a' : '#8a6a40', 4);
      return;
    case 'ladder': {
      ctx.strokeStyle = '#c9a23a';
      ctx.lineWidth = 2;
      const bx = isoX(x + 0.5, y + 0.15);
      const by = isoY(x + 0.5, y + 0.15);
      ctx.beginPath();
      ctx.moveTo(bx - 7, by + 6);
      ctx.lineTo(bx - 7, by - 52);
      ctx.moveTo(bx + 7, by + 6);
      ctx.lineTo(bx + 7, by - 52);
      for (let i = 0; i < 8; i++) {
        ctx.moveTo(bx - 7, by - i * 7);
        ctx.lineTo(bx + 7, by - i * 7);
      }
      ctx.stroke();
      return;
    }
    case 'vending':
      rectBox(ctx, x, y, 0.6, 0.55, 40, f.color);
      glowScreen(ctx, x + 0.05, y - 0.22, 12, 36, 0.3, '#f4f4f4', t, false);
      return;
    case 'payphone':
      rectBox(ctx, x, y, 0.35, 0.3, 30, f.color);
      rectBox(ctx, x, y, 0.15, 0.1, 6, '#111', 16);
      return;
    case 'car': {
      box(ctx, x - 0.3, y + 0.1, 1.6, 0.8, 10, f.color, 3, { stroke: true });
      box(ctx, x - 0.05, y + 0.18, 1.0, 0.64, 8, shade(f.color, 0.1), 13, { left: f.color2, right: shade(f.color2, -0.3) });
      for (const [ox, oy] of [
        [-0.2, 0.85],
        [1.0, 0.85],
      ])
        ellipse(ctx, isoX(x + ox, y + oy), isoY(x + ox, y + oy, 3), 3.5, 3, '#111');
      return;
    }
    case 'lamppost':
      rectBox(ctx, x, y, 0.08, 0.08, 70, f.color);
      rectBox(ctx, x, y, 0.35, 0.2, 4, '#333', 70);
      if (night) ellipse(ctx, cx(x, y), cy(x, y, 68), 6, 2.5, f.color2);
      return;
    case 'boxes':
      rectBox(ctx, x - 0.05, y, 0.55, 0.55, 12, f.color);
      rectBox(ctx, x + 0.2, y + 0.15, 0.45, 0.45, 9, f.color2);
      rectBox(ctx, x, y, 0.4, 0.4, 10, shade(f.color, 0.1), 12);
      return;
    case 'oven':
      rectBox(ctx, x, y, 0.85, 0.6, 18, f.color);
      glowScreen(ctx, x + 0.08, y - 0.2, 4, 12, 0.25, '#ff7a1a', t);
      return;
    case 'panel':
      rectBox(ctx, x, y, 0.7, 0.3, 34, f.color);
      for (let i = 0; i < 3; i++) ellipse(ctx, cx(x, y) - 4 + i * 4, cy(x, y, 24) + 2, 1, 1, i === Math.floor(t * 0.1) % 3 ? '#2fd17a' : '#ffd000');
      return;
    case 'boiler':
      rectBox(ctx, x, y, 0.8, 0.8, 34, f.color);
      rectBox(ctx, x, y, 0.2, 0.2, 14, '#666', 34);
      return;
    case 'directory':
      rectBox(ctx, x, y, 0.5, 0.15, 36, f.color);
      faceQuad(ctx, x + 0.28, y + 0.58, x + 0.72, y + 0.58, 10, 34, night ? '#2a4a6a' : f.color2);
      isoText(ctx, 'YOU ARE HERE', x + 0.5, y + 0.6, 30, 'x', 3.5, '#ff2d55');
      return;
    case 'servicedesk':
      box(ctx, x, y + 0.2, f.w, 0.6, 14, f.color, 0, { top: '#eee' });
      if (f.label) isoText(ctx, f.label, x + f.w / 2, y + 0.4, 40, 'x', 7, '#fff', { glow: f.color });
      return;
    case 'mopsink':
      rectBox(ctx, x, y, 0.6, 0.5, 10, f.color);
      rectBox(ctx, x + 0.3, y, 0.25, 0.25, 16, '#6a8aa0');
      return;
  }
}

function steam(ctx: Ctx, x: number, y: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.05 + i / 3) % 1;
    ctx.fillStyle = `rgba(230,230,230,${0.5 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(cx(x, y) + Math.sin(ph * 6 + i) * 3, cy(x, y, 14 + ph * 20), 2 + ph * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spliceSparks(ctx: Ctx, x: number, y: number, t: number) {
  if (Math.sin(t * 1.7 + x * 5) <= 0.93) return;
  ctx.fillStyle = '#fff6a0';
  const frame = Math.floor(t) * 8;
  for (let i = 0; i < 4; i++) ctx.fillRect(cx(x, y) + (hash2(x, y, frame + i) - 0.5) * 8, cy(x, y, 8) + (hash2(y, x, frame + i) - 0.5) * 6, 1.5, 1.5);
}

function weldSparks(ctx: Ctx, x: number, y: number, t: number) {
  ctx.fillStyle = '#fff6a0';
  const frame = Math.floor(t) * 8;
  for (let i = 0; i < 6; i++) {
    const a = hash2(x, y, frame + i) * Math.PI * 2;
    const r = hash2(y, x, frame + i);
    ctx.fillRect(cx(x, y) + Math.cos(a) * r * 10, cy(x, y, 16) + Math.sin(a) * r * 6, 1.5, 1.5);
  }
}

type Glow = (color: string, z: number, r?: number) => void;

function buildableEffects(ctx: Ctx, type: BuildId, x: number, y: number, t: number, powered: boolean, inUse: boolean, glow: Glow, alert: boolean) {
  switch (type) {
    case 'siphon':
      if (alert && Math.sin(t * 2.4 + x) > 0) glow('#ff2d55', 18, 5);
      return;
    case 'splice':
      if (powered) spliceSparks(ctx, x, y, t);
      return;
    case 'hot_plate':
      if (powered && inUse) steam(ctx, x, y, t);
      return;
    case 'workbench':
      if (inUse) {
        weldSparks(ctx, x, y, t);
        glow('#fff0b0', 16, 14);
      }
      return;
    case 'tv':
      if (inUse) glow('#7aaaff', 14, 18);
      return;
    case 'lamp':
      return glow('#ffe0a0', 15, 10);
    case 'lava_lamp':
      return glow('#ff4fd0', 13, 12);
    case 'pc':
      return glow('#5aff8a', 8, 12);
    case 'xmas':
      return glow('#ff7a7a', 16, 14);
    case 'heater':
      return glow('#ff6a1a', 8, 12);
    case 'arcade':
      return glow('#ff2bd6', 30, 16);
    case 'throne':
      return glow('#ffd700', 24, 20);
  }
}

export function sleeperSprite(type: BuildId, sleepers: number): string | null {
  const id = sleepers >= 2 && hasProp(`build.${type}.sleeper2`) ? `build.${type}.sleeper2` : `build.${type}.sleeper`;
  return sleepers > 0 && hasProp(id) ? id : null;
}

export function drawFloorSleeper(ctx: Ctx, x: number, y: number) {
  return !!drawPropSprite(ctx, "build.floor_sleeper", x - 0.5, y - 0.5);
}

export function drawBuildable(ctx: Ctx, type: BuildId, x: number, y: number, t: number, opts: { powered: boolean; inUse: boolean; alpha?: number; flip?: boolean; alert?: boolean; sleepers?: number }) {
  if (opts.flip) {
    ctx.save();
    ctx.translate(cx(x, y) * 2, 0);
    ctx.scale(-1, 1);
    drawBuildable(ctx, type, x, y, t, { ...opts, flip: false });
    ctx.restore();
    return;
  }
  const { powered, inUse } = opts;
  const glow: Glow = (c, z, r = 8) => {
    if (!powered) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx(x, y), cy(x, y, z), 0, cx(x, y), cy(x, y, z), r);
    g.addColorStop(0, rgba(c, 0.9));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx(x, y) - r, cy(x, y, z) - r, r * 2, r * 2);
    ctx.restore();
  };
  const sprite = sleeperSprite(type, opts.sleepers ?? 0) ?? `build.${type}`;
  if (type !== 'deck' && drawPropSprite(ctx, sprite, x, y, { seed: Math.floor(hash2(x, y) * 4), dim: !!BUILD[type].power && !powered })) {
    buildableEffects(ctx, type, x, y, t, powered, inUse, glow, !!opts.alert);
    return;
  }
  switch (type) {
    case 'sleeping_bag': {
      const c = ['#3a6ac8', '#c84b3a', '#2f8f4e', '#a24bff'][Math.floor(hash2(x, y) * 4)];
      rectBox(ctx, x, y, 0.85, 0.42, 4, c);
      rectBox(ctx, x - 0.28, y, 0.22, 0.36, 5, '#eee', 0);
      return;
    }
    case 'crate':
      rectBox(ctx, x, y, 0.55, 0.55, 12, hash2(x, y) > 0.5 ? '#e86a1a' : '#2a6ac8');
      rectBox(ctx, x, y, 0.45, 0.45, 4, '#b08b5a', 12);
      return;
    case 'cooler':
      rectBox(ctx, x, y, 0.6, 0.42, 12, '#e84a3a');
      rectBox(ctx, x, y, 0.62, 0.44, 4, '#f4f4f4', 12);
      return;
    case 'splice': {
      rectBox(ctx, x, y, 0.3, 0.3, 6, '#888');
      ctx.strokeStyle = powered ? '#ff9a1a' : '#555';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx(x, y), cy(x, y, 6));
      ctx.bezierCurveTo(cx(x, y) - 10, cy(x, y, 10), cx(x, y) - 14, cy(x, y, -4), cx(x, y) - 22, cy(x, y, 0));
      ctx.moveTo(cx(x, y), cy(x, y, 6));
      ctx.bezierCurveTo(cx(x, y) + 10, cy(x, y, 12), cx(x, y) + 16, cy(x, y, -2), cx(x, y) + 20, cy(x, y, 2));
      ctx.stroke();
      if (powered) spliceSparks(ctx, x, y, t);
      return;
    }
    case 'lamp':
      rectBox(ctx, x, y, 0.08, 0.08, 18, '#444');
      rectBox(ctx, x + 0.08, y, 0.22, 0.22, 6, '#c8c8c8', 16);
      glow('#ffe0a0', 15, 10);
      return;
    case 'hot_plate':
      rectBox(ctx, x, y, 0.5, 0.4, 5, '#444');
      ellipse(ctx, cx(x, y), cy(x, y, 5), 5, 2.5, powered ? (inUse ? '#ff4a1a' : '#6a2a1a') : '#333');
      if (inUse) {
        rectBox(ctx, x, y, 0.28, 0.28, 6, '#bbb', 5);
        steam(ctx, x, y, t);
      }
      return;
    case 'futon':
      rectBox(ctx, x, y, 0.9, 0.5, 5, '#5a3a22');
      rectBox(ctx, x, y, 0.85, 0.45, 4, '#7a5cff', 5);
      return;
    case 'fridge':
      rectBox(ctx, x, y, 0.5, 0.45, 24, '#e8e8e8');
      rectBox(ctx, x + 0.12, y, 0.12, 0.12, 2, '#ff4fa3', 24);
      return;
    case 'foam': {
      ctx.save();
      ctx.globalAlpha = (opts.alpha ?? 1) * 0.92;
      box(ctx, x + 0.04, y + 0.04, 0.92, 0.92, 2.5, '#f2c46a', 0, { top: '#f7d48a' });
      ctx.fillStyle = '#d9a64a';
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const fx = x + 0.17 + i * 0.22;
          const fy = y + 0.17 + j * 0.22;
          ctx.beginPath();
          ctx.ellipse(isoX(fx, fy), isoY(fx, fy, 3), 3, 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      ctx.restore();
      return;
    }
    case 'fan': {
      rectBox(ctx, x, y, 0.5, 0.16, 18, '#ddd');
      ctx.save();
      ctx.translate(isoX(x + 0.5, y + 0.6), isoY(x + 0.5, y + 0.6, 9));
      ctx.rotate(powered ? t * 0.8 : 0);
      ctx.fillStyle = '#9ab';
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(4, 0, 4, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    case 'tv': {
      rectBox(ctx, x, y, 0.32, 0.25, 4, '#222');
      rectBox(ctx, x, y - 0.05, 0.62, 0.5, 18, '#2a2a2a', 4);
      if (powered) {
        const c = inUse ? ['#5a9aff', '#ff5a9a', '#9aff5a', '#fff'][Math.floor(t * 0.15) % 4] : '#1a2a4a';
        faceQuad(ctx, x + 0.26, y + 0.73, x + 0.74, y + 0.73, 7, 19, c);
        if (inUse) glow('#7aaaff', 14, 18);
      }
      return;
    }
    case 'rope': {
      ctx.fillStyle = '#05050a';
      ctx.beginPath();
      diamondPath(ctx, x, y, 1, 1, 0.5, 0.18);
      ctx.fill();
      ctx.strokeStyle = '#c9a46a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx(x, y) + 12, cy(x, y, 2), 5, 2.5, 0, 0, Math.PI * 2);
      ctx.moveTo(cx(x, y) + 8, cy(x, y, 2));
      ctx.lineTo(cx(x, y), cy(x, y, -16));
      ctx.stroke();
      return;
    }
    case 'lava_lamp': {
      rectBox(ctx, x, y, 0.16, 0.16, 6, '#555');
      ctx.fillStyle = powered ? '#ff4fd0' : '#6a2a5a';
      ctx.beginPath();
      ctx.ellipse(cx(x, y), cy(x, y, 13), 3.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (powered) {
        ctx.fillStyle = '#ffd0f0';
        ctx.beginPath();
        ctx.arc(cx(x, y), cy(x, y, 10 + Math.sin(t * 0.08) * 4), 1.8, 0, Math.PI * 2);
        ctx.fill();
        glow('#ff4fd0', 13, 12);
      }
      return;
    }
    case 'workbench': {
      rectBox(ctx, x, y, 0.9, 0.5, 12, '#7a5a3a', 0, { top: '#9a7a5a' });
      rectBox(ctx, x - 0.2, y, 0.25, 0.2, 5, '#c84b3a', 12);
      rectBox(ctx, x + 0.2, y, 0.15, 0.3, 3, '#888', 12);
      if (inUse) {
        weldSparks(ctx, x, y, t);
        glow('#fff0b0', 16, 14);
      }
      return;
    }
    case 'pc': {
      rectBox(ctx, x - 0.25, y, 0.2, 0.4, 16, '#d8d0b8');
      rectBox(ctx, x + 0.12, y, 0.45, 0.4, 14, '#d8d0b8');
      if (powered) {
        faceQuad(ctx, x + 0.42, y + 0.71, x + 0.78, y + 0.71, 3, 12, '#1a3a2a');
        ctx.fillStyle = '#5aff8a';
        for (let i = 0; i < 3; i++) ctx.fillRect(isoX(x + 0.5, y + 0.71) - 2 + i, isoY(x + 0.5, y + 0.71, 10 - i * 2.4), 6 + ((t * 2 + i * 7) % 6), 0.8);
        glow('#5aff8a', 8, 12);
      }
      return;
    }
    case 'raccoon': {
      const px = cx(x, y);
      const py = cy(x, y);
      ellipse(ctx, px, py, 8, 3, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = '#6a6a72';
      ctx.beginPath();
      ctx.ellipse(px, py - 5, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#2a2a2a' : '#9a9aa2';
        ctx.beginPath();
        ctx.ellipse(px - 8 - i * 2.4, py - 6 - i * 1.3, 2.4, 2, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8a8a92';
      ctx.beginPath();
      ctx.arc(px + 6, py - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(px + 3.5, py - 9.5, 5.5, 2.2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + 4.5, py - 9, 1, 1);
      ctx.fillRect(px + 7, py - 9, 1, 1);
      ctx.fillStyle = '#6a6a72';
      ctx.beginPath();
      ctx.moveTo(px + 3, py - 11);
      ctx.lineTo(px + 4, py - 14);
      ctx.lineTo(px + 5.5, py - 11.5);
      ctx.moveTo(px + 7, py - 11.5);
      ctx.lineTo(px + 8.5, py - 14);
      ctx.lineTo(px + 9, py - 10.5);
      ctx.fill();
      return;
    }
    case 'periscope':
      rectBox(ctx, x, y, 0.14, 0.14, 22, '#5a6a5a');
      rectBox(ctx, x + 0.1, y, 0.3, 0.14, 6, '#5a6a5a', 20);
      ctx.fillStyle = '#9fe0ff';
      ctx.fillRect(cx(x, y) + 5, cy(x, y, 24), 3, 2);
      return;
    case 'bunk':
      for (const z of [0, 14]) {
        rectBox(ctx, x, y, 0.9, 0.48, 4, '#5a4a3a', z);
        rectBox(ctx, x, y, 0.82, 0.42, 3, z ? '#c84b3a' : '#3a6ac8', z + 4);
      }
      for (const [ox, oy] of [
        [-0.42, -0.2],
        [0.42, -0.2],
        [-0.42, 0.2],
        [0.42, 0.2],
      ])
        rectBox(ctx, x + ox, y + oy, 0.06, 0.06, 26, '#5a4a3a');
      return;
    case 'xmas': {
      const colors = ['#ff3355', '#2fd17a', '#ffd000', '#2a9aff'];
      for (let i = 0; i < 9; i++) {
        const u = i / 8;
        const px = isoX(x + u, y + 0.1);
        const py = isoY(x + u, y + 0.1, 20 - Math.sin(u * Math.PI) * 8);
        const on = !powered ? false : (Math.floor(t * 0.2) + i) % 3 !== 0;
        ctx.fillStyle = on ? colors[i % 4] : '#333';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      rectBox(ctx, x - 0.42, y - 0.4, 0.05, 0.05, 20, '#555');
      rectBox(ctx, x + 0.42, y - 0.4, 0.05, 0.05, 20, '#555');
      glow('#ff7a7a', 16, 14);
      return;
    }
    case 'heater':
      rectBox(ctx, x, y, 0.4, 0.22, 16, '#777');
      faceQuad(ctx, x + 0.35, y + 0.62, x + 0.65, y + 0.62, 3, 13, powered ? '#ff6a1a' : '#333');
      glow('#ff6a1a', 8, 12);
      return;
    case 'scanner':
      rectBox(ctx, x, y, 0.34, 0.24, 6, '#222');
      rectBox(ctx, x + 0.1, y, 0.04, 0.04, 16, '#444', 6);
      ellipse(ctx, cx(x, y) - 3, cy(x, y, 5), 1, 1, powered && Math.floor(t * 0.5) % 2 ? '#ff2b2b' : '#400');
      return;
    case 'battery':
      for (let i = 0; i < 3; i++) {
        rectBox(ctx, x - 0.3 + i * 0.3, y, 0.25, 0.4, 9, '#1a1a1a');
        ellipse(ctx, cx(x - 0.3 + i * 0.3, y) - 2, cy(x - 0.3 + i * 0.3, y, 9), 1.2, 0.8, '#c84b3a');
      }
      return;
    case 'pod':
      rectBox(ctx, x, y, 0.9, 0.9, 26, '#3a4a6a', 0, { top: '#4a5a7a' });
      for (let i = 0; i < 4; i++) faceQuad(ctx, x + 0.08, y + 0.95, x + 0.92, y + 0.95, 4 + i * 6, 6 + i * 6, '#2a3a5a');
      return;
    case 'hammock': {
      ctx.strokeStyle = '#c9a46a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(isoX(x + 0.05, y + 0.5), isoY(x + 0.05, y + 0.5, 16));
      ctx.quadraticCurveTo(isoX(x + 0.5, y + 0.5), isoY(x + 0.5, y + 0.5, -2), isoX(x + 0.95, y + 0.5), isoY(x + 0.95, y + 0.5, 16));
      ctx.stroke();
      ctx.strokeStyle = '#2aa6a0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(isoX(x + 0.2, y + 0.5), isoY(x + 0.2, y + 0.5, 9));
      ctx.quadraticCurveTo(isoX(x + 0.5, y + 0.5), isoY(x + 0.5, y + 0.5, 1), isoX(x + 0.8, y + 0.5), isoY(x + 0.8, y + 0.5, 9));
      ctx.stroke();
      return;
    }
    case 'arcade':
      rectBox(ctx, x, y, 0.6, 0.5, 34, '#1a1a4a');
      if (powered) faceQuad(ctx, x + 0.28, y + 0.76, x + 0.72, y + 0.76, 18, 28, inUse ? ['#ff2bd6', '#2bfff0', '#ffe52b'][Math.floor(t * 0.2) % 3] : '#2a2a6a');
      rectBox(ctx, x, y, 0.64, 0.54, 6, '#ff2bd6', 34);
      glow('#ff2bd6', 30, 16);
      return;
    case 'throne':
      rectBox(ctx, x, y, 0.8, 0.7, 10, '#3a2a1a');
      rectBox(ctx, x - 0.25, y - 0.1, 0.3, 0.7, 28, '#5a3a22', 10);
      rectBox(ctx, x, y, 0.7, 0.6, 4, '#c9a23a', 10);
      ctx.fillStyle = '#ffd700';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx(x - 0.3, y - 0.1) - 6 + i * 6, cy(x - 0.3, y - 0.1, 40));
        ctx.lineTo(cx(x - 0.3, y - 0.1) - 3 + i * 6, cy(x - 0.3, y - 0.1, 48));
        ctx.lineTo(cx(x - 0.3, y - 0.1) + i * 6, cy(x - 0.3, y - 0.1, 40));
        ctx.fill();
      }
      glow('#ffd700', 24, 20);
      return;
    case 'deck':
      return;
  }
  centeredBox(ctx, x, y, 0.5, 8, '#888');
}
