import { ALERT_LEVELS, RANKS } from './defs';
import { Rng } from './rng';
import type { GameState, LogKind, Modal } from './state';
import { getDerived } from './world';

export const rand = new Rng(1);

export type Sfx =
  | 'chime'
  | 'coin'
  | 'cash'
  | 'build'
  | 'demolish'
  | 'alert'
  | 'spotted'
  | 'caught'
  | 'escape'
  | 'click'
  | 'phone'
  | 'squeak'
  | 'bad'
  | 'good'
  | 'climb'
  | 'huh';

export const sfxQueue: Sfx[] = [];
export const sfx = (name: Sfx) => {
  if (sfxQueue.length < 12) sfxQueue.push(name);
};

export const achievementQueue: string[] = [];

export interface Notice {
  text: string;
  focus?: { x: number; y: number; layer: 0 | 1 };
  pause: boolean;
}

export const noticeQueue: Notice[] = [];

export function notify(text: string, focus?: Notice['focus'], pause = false) {
  if (noticeQueue.length < 6) noticeQueue.push({ text, focus, pause });
}

export function log(s: GameState, text: string, kind: LogKind = 'info', focus?: { x: number; y: number; layer: 0 | 1 }, from?: string) {
  s.log.push({ id: s.nextId++, t: s.time, text, kind, focus, from });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

export function pa(s: GameState, text: string) {
  log(s, text, 'pa');
  sfx('chime');
}

export function phone(s: GameState, from: string, text: string) {
  log(s, text, 'phone', undefined, from);
  sfx('phone');
}

export function pushModal(s: GameState, m: Omit<Modal, 'id'>) {
  s.modals.push({ ...m, id: s.nextId++ });
}

export function earn(s: GameState, amount: number) {
  if (amount <= 0) return;
  s.cash += amount;
  s.totalEarned += amount;
  s.todayIncome += amount;
}

export function rankOf(s: GameState): number {
  let r = 0;
  RANKS.forEach((rank, i) => {
    if (s.totalEarned >= rank.earned) r = i;
  });
  return r;
}

export function alertLevel(alert: number): number {
  let lvl = 0;
  ALERT_LEVELS.forEach((l, i) => {
    if (alert >= l.at) lvl = i;
  });
  return lvl;
}

const BASE_ALERT_DECAY = { easy: 4, normal: 2.6, hard: 1.6 };
export const CLEAN_NIGHT_DECAY = 1.5;

export function alertDecay(s: GameState, cleanNight: boolean): number {
  return BASE_ALERT_DECAY[s.difficulty] + (cleanNight ? CLEAN_NIGHT_DECAY : 0) + s.alert * 0.05;
}

const DIFF_ALERT = { easy: 0.7, normal: 1, hard: 1.3 };

export function raiseAlert(s: GameState, amount: number, reason: string) {
  const before = alertLevel(s.alert);
  let a = amount;
  if (a > 0) {
    a *= DIFF_ALERT[s.difficulty];
    if (getDerived(s).scanner) a *= 0.85;
    if (s.gary.insider) a *= 0.85;
  }
  s.alert = Math.max(0, Math.min(100, s.alert + a));
  if (a >= 2) log(s, `Alert +${a.toFixed(0)}: ${reason}`, 'bad');
  const after = alertLevel(s.alert);
  if (after > before) {
    sfx('alert');
    const lvl = ALERT_LEVELS[after];
    pa(s, `Security memo: alert level raised to ${lvl.name.toUpperCase()}. ${lvl.desc}`);
    updateCameras(s);
  }
}

export function updateCameras(s: GameState) {
  const lvl = alertLevel(s.alert);
  const count = [2, 4, 5, 7, 8][lvl];
  s.cameras.forEach((c, i) => (c.active = i < count));
}

export function unlock(s: GameState, id: string) {
  if (s.achievements.includes(id)) return;
  s.achievements.push(id);
  achievementQueue.push(id);
}

export const ACHIEVEMENTS: Record<string, { name: string; desc: string }> = {
  FIRST_NIGHT: { name: 'Home Sweet Plenum', desc: 'Bring home your first haul.' },
  WISHING_WELL: { name: 'Every Wish Has a Price', desc: 'Fish $100 out of the fountain.' },
  RACCOONS: { name: 'It Was Raccoons', desc: 'Have an inspector blame your decoy raccoon.' },
  GARY: { name: "Gary's Friend", desc: "Earn Gary's trust." },
  POWERSELLER: { name: 'eBay Power Seller', desc: 'Sell 50 goods on eBay.' },
  BLACK_FRIDAY: { name: 'Doorbuster', desc: 'Earn $1,000 on Black Friday.' },
  GHOST: { name: 'Ghost of Northgate', desc: 'Go 10 nights in a row without being spotted.' },
  FULL_HOUSE: { name: 'Full House', desc: 'Have 8 Bats in your crew.' },
  KING: { name: 'King of Northgate', desc: 'Win the auction.' },
  EVICTED: { name: 'Trespassed', desc: 'Get evicted.' },
  NOTHING: { name: 'Must Be the Pipes', desc: 'Have an inspection find nothing.' },
};

export function auctionBid(s: GameState): number {
  const mult = { easy: 0.75, normal: 1, hard: 1.25 }[s.difficulty];
  return Math.round(((18000 + 30000 * s.mallHealth) * mult) / 100) * 100;
}
