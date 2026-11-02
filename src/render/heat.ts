import { H, N, W } from '../game/layout';
import { noiseField } from '../game/sim';
import type { GameState } from '../game/state';
import { TH, TW } from './iso';

export type HeatKind = 'noise' | 'smell';

type Stop = [at: number, r: number, g: number, b: number];

export const HEAT_RAMPS: Record<HeatKind, Stop[]> = {
  noise: [
    [0, 70, 120, 255],
    [0.45, 255, 214, 60],
    [1, 255, 45, 60],
  ],
  smell: [
    [0, 120, 220, 90],
    [0.5, 214, 206, 60],
    [1, 160, 92, 36],
  ],
};

const FULL_SCALE: Record<HeatKind, number> = { noise: 4, smell: 120 };

export function heatAt(s: GameState, kind: HeatKind, i: number): number {
  return Math.min(1, (kind === 'noise' ? noiseField[i] : s.smell[i]) / FULL_SCALE[kind]);
}

export function peakHeat(s: GameState, kind: HeatKind): number {
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, heatAt(s, kind, i));
  return peak;
}

export function rampGradient(kind: HeatKind): string {
  return `linear-gradient(90deg, ${HEAT_RAMPS[kind].map(([at, r, g, b]) => `rgb(${r},${g},${b}) ${at * 100}%`).join(', ')})`;
}

function sample(ramp: Stop[], v: number): [number, number, number] {
  const hi = ramp.findIndex(([at]) => at >= v);
  if (hi <= 0) return [ramp[0][1], ramp[0][2], ramp[0][3]];
  const [a0, r0, g0, b0] = ramp[hi - 1];
  const [a1, r1, g1, b1] = ramp[hi];
  const k = (v - a0) / (a1 - a0);
  return [r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k];
}

const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
const heatCtx = canvas.getContext('2d')!;
const pixels = heatCtx.createImageData(W, H);

export function drawHeatMap(ctx: CanvasRenderingContext2D, s: GameState, kind: HeatKind, z = 0) {
  const ramp = HEAT_RAMPS[kind];
  for (let i = 0; i < N; i++) {
    const v = heatAt(s, kind, i);
    const [r, g, b] = sample(ramp, v);
    const o = i * 4;
    pixels.data[o] = r;
    pixels.data[o + 1] = g;
    pixels.data[o + 2] = b;
    pixels.data[o + 3] = v < 0.02 ? 0 : 70 + v * 110;
  }
  heatCtx.putImageData(pixels, 0, 0);
  ctx.save();
  ctx.transform(TW / 2, TH / 2, -TW / 2, TH / 2, 0, -z);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, 0, 0, W, H);
  ctx.restore();
}
