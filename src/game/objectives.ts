import { BUILD } from './defs';
import { LAYOUT, idx } from './layout';
import { auctionBid, earn, log, rankOf, sfx } from './ops';
import type { GameState } from './state';

export interface Objective {
  text: string;
  hint: string;
  reward: number;
  done: (s: GameState) => boolean;
}

const deckCount = (s: GameState) => s.deck.reduce((a, b) => a + b, 0);

export const OBJECTIVES: Objective[] = [
  { text: 'Lay 6 plywood decks', hint: 'Open the Build menu (B) and pick Plywood Deck. Click and drag out from the ladder hatch in the Service Corridor.', reward: 10, done: (s) => deckCount(s) >= 6 },
  { text: 'Put down a Sleeping Bag', hint: 'Beds go on decks. Sleeping on bare plywood is miserable.', reward: 5, done: (s) => s.objects.some((o) => BUILD[o.type].beds) },
  { text: 'Work a night job and bring home the haul', hint: 'In the Crew panel, set a Night Job: Fountain Fishing is safe money. Avoid Gary\'s flashlight.', reward: 10, done: (s) => !!s.flags.firstHaul },
  { text: 'Power a Clip Lamp with a Power Splice', hint: 'Splices steal power from the store below. That store gets the bill.', reward: 10, done: (s) => s.objects.some((o) => o.type === 'lamp' && o.powered) },
  { text: 'Recruit a second Bat', hint: 'Recruits show up over time. You need a spare bed and 3 food.', reward: 15, done: (s) => s.crew.length >= 2 },
  { text: 'Reach the rank of Mall Bat', hint: 'Rank rises with lifetime earnings, not cash on hand, so spending never costs you rank. New items unlock with each rank.', reward: 20, done: (s) => rankOf(s) >= 1 },
  { text: 'Build a CRT TV over a loud store', hint: 'Some stores are loud enough to cover it during the day.', reward: 30, done: (s) => s.objects.some((o) => o.type === 'tv' && LAYOUT.rooms[LAYOUT.roomAt[idx(o.x, o.y)]].noiseMask >= 0.7) },
  { text: 'Survive an inspection', hint: 'When complaints hit 100%, maintenance checks that ceiling the next morning.', reward: 40, done: (s) => s.stats.inspections >= 1 },
  { text: 'Build a Workbench', hint: 'Ceiling Baron rank. Tinkering turns parts (RadioHut Salvage, Dock Pallets) into goods.', reward: 50, done: (s) => s.objects.some((o) => o.type === 'workbench') },
  { text: 'Sell goods on eBay', hint: 'A Beige Box PC near Boundaries Books leeches their Wi-Fi and sells goods automatically.', reward: 60, done: (s) => s.stats.ebaySold >= 1 },
  { text: 'Lease the kiosk', hint: 'Business panel. A kiosk makes your crew look legit and sells goods during the day.', reward: 80, done: (s) => s.business.kiosk },
  { text: 'Grow your crew to 5', hint: 'More Bats, more jobs. Every Bat needs a bed and eats from the shared food stash.', reward: 100, done: (s) => s.crew.length >= 5 },
  { text: 'Open a seasonal pop-up', hint: 'Duct Duke rank. Lease a vacant storefront. Holiday shoppers pay top dollar.', reward: 150, done: (s) => s.business.popupRoom >= 0 },
  { text: 'Save $10,000 in cash', hint: 'The auction needs cold, hard cash. Spending lowers your bid.', reward: 0, done: (s) => s.cash >= 10000 },
  { text: 'Outbid the developer on Dec 31', hint: 'Have more cash than the developer bid at noon on New Year\'s Eve.', reward: 0, done: (s) => !!s.over?.won },
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
  switch (s.objective) {
    case 0:
      return `${Math.min(6, deckCount(s))}/6`;
    case 11:
      return `${s.crew.length}/5`;
    case 13:
      return `$${Math.floor(s.cash).toLocaleString()} / $10,000`;
    case 14:
      return `$${Math.floor(s.cash).toLocaleString()} / $${auctionBid(s).toLocaleString()}`;
  }
  return '';
}
