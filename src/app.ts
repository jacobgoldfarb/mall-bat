import type { BuildCategory, BuildId } from './game/defs';
import type { GameState } from './game/state';
import type { Renderer, ViewState } from './render/renderer';

export type Screen = 'title' | 'game';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'bad' | 'good' | 'achievement';
  until: number;
}

export interface AppState {
  screen: Screen;
  state: GameState | null;
  demo: GameState | null;
  view: ViewState;
  speed: number;
  paused: boolean;
  menu: 'none' | 'pause' | 'settings' | 'help' | 'newgame';
  buildCategory: BuildCategory | 'business';
  buildOpen: boolean;
  selectedObj: number | null;
  hoverScreen: { x: number; y: number } | null;
  toasts: Toast[];
  renderer: Renderer | null;
  tick: number;
  logOpen: boolean;
  crewExpanded: number | null;
  autoPause: boolean;
  uiScale: number;
}

export const app: AppState = {
  screen: 'title',
  state: null,
  demo: null,
  view: {
    layer: 1,
    overlay: 'none',
    hover: null,
    build: null,
    demolish: false,
    dragStart: null,
    selectedCrew: null,
    xray: false,
  },
  speed: 1,
  paused: false,
  menu: 'none',
  buildCategory: 'structure',
  buildOpen: true,
  selectedObj: null,
  hoverScreen: null,
  toasts: [],
  renderer: null,
  tick: 0,
  logOpen: true,
  crewExpanded: null,
  autoPause: localStorage.getItem('dropceiling.autopause') !== '0',
  uiScale: 1,
};

let toastId = 1;
const listeners = new Set<() => void>();

export function refresh() {
  app.tick++;
  for (const l of listeners) l();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toast(text: string, tone: Toast['tone'] = 'info', ms = 2600) {
  app.toasts.push({ id: toastId++, text, tone, until: performance.now() + ms });
  if (app.toasts.length > 4) app.toasts.shift();
  refresh();
}

export function selectBuild(id: BuildId | null) {
  app.view.build = id;
  app.view.demolish = false;
  app.view.dragStart = null;
  if (id) app.view.layer = 1;
  refresh();
}

export function focusTile(x: number, y: number, layer?: 0 | 1) {
  if (layer !== undefined) app.view.layer = layer;
  app.renderer?.centerOn(x + 0.5, y + 0.5);
}

export const SPEEDS = [1, 3, 8];
export const MINUTES_PER_SECOND = 5;

declare global {
  interface Window {
    desktop?: {
      isDesktop: boolean;
      quit: () => void;
      toggleFullscreen: () => void;
      unlockAchievement: (id: string) => void;
    };
  }
}
