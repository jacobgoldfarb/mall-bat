import { BUILD } from './defs';
import { earn, levelOf, log, sfx } from './ops';
import type { GameState } from './state';

export interface Objective {
  text: string;
  hint: string;
  reward: number;
  done: (s: GameState) => boolean;
}

const deckCount = (s: GameState) => s.deck.reduce((a, b) => a + b, 0);

export const OBJECTIVES: Objective[] = [
  { text: 'Lay 6 plywood decks', hint: 'Build menu (B), Plywood Deck. Drag out from the hatch.', reward: 10, done: (s) => deckCount(s) >= 6 },
  { text: 'Put down a Sleeping Bag', hint: 'Beds go on decks. Sleeping on bare plywood is miserable.', reward: 5, done: (s) => s.objects.some((o) => BUILD[o.type].beds) },
  {
    text: 'Work a night job and bring home the haul',
    hint: "Open the Job Board (J) and send someone Fountain Fishing. Stay out of Gary's flashlight.",
    reward: 10,
    done: (s) => !!s.flags.firstHaul,
  },
  {
    text: 'Power a Clip Lamp with a Power Splice',
    hint: 'Splices steal power from the store below. That store gets the bill.',
    reward: 10,
    done: (s) => s.objects.some((o) => o.type === 'lamp' && o.powered),
  },
  { text: 'Recruit a second Bat', hint: 'Someone always finds the ladder. Have a spare bed and 3 food ready.', reward: 15, done: (s) => s.crew.length >= 2 },
  {
    text: 'Reach Level 3',
    hint: 'Keep the money coming in.',
    reward: 20,
    done: (s) => levelOf(s) >= 3,
  },
];

export function checkObjectives(s: GameState) {
  while (s.objective < OBJECTIVES.length && OBJECTIVES[s.objective].done(s)) {
    const o = OBJECTIVES[s.objective];
    if (o.reward) earn(s, o.reward);
    log(s, `Goal complete: ${o.text}${o.reward ? ` (+$${o.reward})` : ''}`, 'good');
    sfx('good');
    s.objective++;
  }
}

export function objectiveProgress(s: GameState): string {
  return s.objective === 0 ? `${Math.min(6, deckCount(s))}/6` : '';
}
