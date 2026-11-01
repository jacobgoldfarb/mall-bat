import { ARCHETYPES, TRAITS } from './defs';
import { addCrew, bedCapacity, makeCandidate } from './crew';
import { scheduleNear } from './inspect';
import { LAYOUT } from './layout';
import { auctionBid, earn, log, pa, phone, pushModal, rand, raiseAlert, sfx, unlock } from './ops';
import type { Candidate, GameState } from './state';
import { AUCTION_DAY, dayOf, formatDate } from './time';
import { markDirty } from './world';

export function offerCandidate(s: GameState, c: Candidate, intro: string) {
  s.candidate = c;
  const arch = ARCHETYPES.find((a) => a.id === c.archetype)!;
  const traits = c.traits.map((t) => `${TRAITS[t].name}: ${TRAITS[t].desc}`).join('\n');
  const full = s.crew.length >= bedCapacity(s) + 1;
  const short = Math.max(0, 3 - s.food);
  const foodLabel = short ? `3 food: buy ${short} for $${short * 4}` : '3 food';
  pushModal(s, {
    title: `${c.name}, ${arch.title}`,
    art: 'recruit',
    body: `${intro}\n\n"${c.bio}"\n\nStealth ${'●'.repeat(c.stealth)}${'○'.repeat(5 - c.stealth)}   Charm ${'●'.repeat(c.charm)}${'○'.repeat(5 - c.charm)}   Handy ${'●'.repeat(c.handy)}${'○'.repeat(5 - c.handy)}${traits ? `\n\n${traits}` : ''}`,
    choices: [
      { label: `Welcome to the ceiling (${foodLabel})`, action: 'recruit', disabled: full ? 'Build another bed first' : s.cash < short * 4 ? 'Needs 3 food' : undefined },
      { label: 'Not right now', action: 'decline' },
    ],
  });
  sfx('phone');
}

const RECRUIT_INTROS = [
  'You spot someone sleeping in the photo booth by the arcade. Again.',
  'A kid keeps "losing" their ride home at closing time. Every night this week.',
  'Someone left a note taped to your ladder: "I know you\'re up there. Can I come up too?"',
  'Earl the janitor mentions a nephew who "needs a place to be for a while, no questions."',
  'You find someone hiding in the Searz dressing rooms at closing. They look at you. You look at them.',
];

export function closeStore(s: GameState, id: string) {
  const ri = LAYOUT.roomIndex[id];
  const rs = s.rooms[ri];
  if (rs.vacant) return;
  rs.vacant = true;
  rs.complaint = 0;
  s.mallHealth = Math.max(0.1, s.mallHealth - 0.045);
  s.stats.storesClosed++;
  markDirty();
  const r = LAYOUT.rooms[ri];
  pa(s, r.closingLine ?? `${r.name} has closed its doors.`);
  log(s, `${r.name} is now vacant: nobody is down there to hear you, but the power is cut. The auction bid drops to $${auctionBid(s).toLocaleString()}.`, 'warn', { x: Math.floor((r.x0 + r.x1) / 2), y: Math.floor((r.y0 + r.y1) / 2), layer: 1 });
}

interface Scripted {
  day: number;
  hour: number;
  key: string;
  run: (s: GameState) => void;
}

const SCRIPT: Scripted[] = [
  { day: 1, hour: 10, key: 'welcome', run: (s) => pa(s, 'Good morning, shoppers! Welcome to Galleria Pointe, where the fun never ends.') },
  {
    day: 2,
    hour: 11,
    key: 'firstRecruit',
    run: (s) => {
      phone(s, '555-0142', 'heard ur living in the mall lol. my friend needs a place to crash. theyre cool i swear');
      offerCandidate(s, makeCandidate(s, 'mallrat'), 'A text from an unknown number. Then, at the food court, someone in a trucker hat waves at you.');
    },
  },
  {
    day: 4,
    hour: 9,
    key: 'auction',
    run: (s) => {
      s.flags.auctionKnown = 1;
      pushModal(s, {
        title: 'GALLERIA POINTE IN FORECLOSURE',
        art: 'news',
        body: `The Daily Ledger, page B4:\n\n"The owners of Galleria Pointe have defaulted on the mortgage. The property goes to public auction on Friday, December 31. Prestige Lifestyle Developers is expected to bid around $${auctionBid(s).toLocaleString()}. They plan to bulldoze it for luxury condos."\n\nYou read it twice. You look up at the ceiling.\n\nIf you have more cash than the developer on New Year's Eve, the mall is yours. Every store that closes before then drops their bid.`,
        choices: [{ label: "Then I'm buying a mall.", action: 'ok' }],
      });
    },
  },
  {
    day: 6,
    hour: 23,
    key: 'garyIntro',
    run: (s) => log(s, 'Tip: the night guard eats dinner alone in the Security Office. His name tag says GARY. He looks like a man who could use a Cinnabomb. (Night job: Leave Gary a Cinnabomb.)', 'info'),
  },
  { day: 9, hour: 15, key: 'recruit2', run: (s) => offerCandidate(s, makeCandidate(s), rand.pick(RECRUIT_INTROS)) },
  { day: 12, hour: 9, key: 'closeSam', run: (s) => closeStore(s, 'samgroovy') },
  { day: 16, hour: 20, key: 'recruit3', run: (s) => offerCandidate(s, makeCandidate(s), rand.pick(RECRUIT_INTROS)) },
  { day: 21, hour: 7, key: 'grandma', run: (s) => offerCandidate(s, makeCandidate(s, 'grandma'), 'The Galleria Mallwalkers Club laps the concourse at 7 AM. One of them catches your eye, winks, and keeps walking. Later, she knocks on your ladder.') },
  {
    day: 30,
    hour: 9,
    key: 'halloween',
    run: (s) => {
      s.flags.costumeDay = 30;
      s.crew.forEach((c) => (c.familiarity = 0));
      s.food += 12;
      pa(s, 'Happy Halloween, Galleria Pointe! Costumes welcome all day. Trick-or-treating at participating stores 4 to 7 PM!');
      log(s, 'Halloween: everyone is in costume. Nobody recognizes anybody today. Your crew grabbed 12 food in candy.', 'good');
    },
  },
  { day: 34, hour: 13, key: 'recruit4', run: (s) => offerCandidate(s, makeCandidate(s), rand.pick(RECRUIT_INTROS)) },
  { day: 38, hour: 9, key: 'closeBlock', run: (s) => closeStore(s, 'blockbusted') },
  {
    day: 40,
    hour: 21,
    key: 'trainee',
    run: (s) => {
      s.flags.traineeNight = 40;
      pa(s, 'Security note: Trainee Kyle shadows the night shift tonight. Welcome aboard, Kyle!');
    },
  },
  { day: 45, hour: 15, key: 'fire', run: (s) => scheduleNear(s, 'fire', 'Annual fire code inspection.', 2) },
  { day: 48, hour: 12, key: 'santa', run: (s) => offerCandidate(s, makeCandidate(s, 'santa'), 'The new Mall Santa started today. The OLD Mall Santa is sitting in the food court, still in the suit, eating a pretzel and staring into the middle distance.') },
  { day: 52, hour: 18, key: 'recruit5', run: (s) => offerCandidate(s, makeCandidate(s), rand.pick(RECRUIT_INTROS)) },
  {
    day: 55,
    hour: 12,
    key: 'thanksgiving',
    run: (s) =>
      pushModal(s, {
        title: 'Thanksgiving in the Ceiling',
        art: 'feast',
        body: "The mall is closed for Thanksgiving. The building is silent, except for Gary's radio playing the Lions game.\n\nThe crew is talking about family. Some have one. Some don't.",
        choices: [
          { label: 'Throw a feast (10 food, big morale boost)', action: 'feast', disabled: s.food < 10 ? 'Needs 10 food' : undefined },
          { label: 'Ramen as usual', action: 'ok' },
        ],
      }),
  },
  {
    day: 56,
    hour: 5,
    key: 'blackfriday',
    run: (s) => {
      pa(s, 'BLACK FRIDAY! Doors are OPEN! Doorbusters at Dillman\'s and Searz! Please do not trample your fellow shoppers!');
      log(s, 'Black Friday: triple crowds, packed fountains, massive noise cover. Make money.', 'good');
    },
  },
  { day: 60, hour: 9, key: 'closeClaire', run: (s) => closeStore(s, 'claire') },
  { day: 61, hour: 8, key: 'cold', run: (s) => log(s, "December. The ducts are freezing at night. Crew morale drops without a Space Heater.", 'warn') },
  { day: 64, hour: 14, key: 'recruit6', run: (s) => offerCandidate(s, makeCandidate(s), rand.pick(RECRUIT_INTROS)) },
  {
    day: 70,
    hour: 9,
    key: 'closeKB',
    run: (s) => {
      closeStore(s, 'kbtoyz');
      scheduleNear(s, 'pest', 'Holiday pest control sweep.', 3);
    },
  },
  {
    day: 75,
    hour: 22,
    key: 'blackout',
    run: (s) => {
      s.flags.blackoutUntil = s.time + 8 * 60;
      pa(s, 'Attention: rolling blackout. Emergency lighting only. Cameras are offline until morning.');
      log(s, 'BLACKOUT: cameras are down tonight. Your splices are dead too. Perfect night for a heist.', 'good');
    },
  },
  { day: 80, hour: 9, key: 'closeRadio', run: (s) => closeStore(s, 'radiohut') },
  { day: 84, hour: 9, key: 'xmasEve', run: (s) => pa(s, 'Merry Christmas Eve from Galleria Pointe! We close at 6 PM. Get home safe, everyone.') },
  {
    day: 85,
    hour: 19,
    key: 'xmasGary',
    run: (s) => {
      if (s.gary.recruited || s.gary.replaced) return;
      pushModal(s, {
        title: 'Gary, Alone on Christmas',
        art: 'gary',
        body: "The mall is closed for Christmas. Through a loose ceiling tile you can see Gary in the Security Office, eating a microwave turkey dinner and watching A Christmas Story on a 9-inch TV.\n\nHe raises his fork to nobody. \"Merry Christmas.\"",
        choices: [
          { label: 'Leave him a real Christmas dinner (5 food)', action: 'xmasgary', disabled: s.food < 5 ? 'Needs 5 food' : undefined },
          { label: "Leave him be", action: 'ok' },
        ],
      });
    },
  },
  { day: 86, hour: 8, key: 'boxing', run: (s) => pa(s, 'Happy Boxing Day! Our Returns & Exchanges desks are open early!') },
  { day: 88, hour: 9, key: 'final', run: (s) => log(s, `Three days until the auction. Developer bid: $${auctionBid(s).toLocaleString()}. Your cash: $${Math.floor(s.cash).toLocaleString()}.`, 'warn') },
  { day: AUCTION_DAY, hour: 12, key: 'auctionDay', run: (s) => resolveAuction(s) },
];

export function runScript(s: GameState, day: number, hour: number) {
  for (const e of SCRIPT) {
    if (e.day !== day || e.hour !== hour) continue;
    const key = `ev_${e.key}`;
    if (s.flags[key]) continue;
    s.flags[key] = 1;
    e.run(s);
  }
}

export function resolveAuction(s: GameState) {
  const bid = auctionBid(s);
  if (s.cash > bid) {
    unlock(s, 'KING');
    s.over = {
      won: true,
      title: 'KING OF THE GALLERIA',
      text: `The auctioneer squints at the shoebox full of fountain quarters, Cinnabomb receipts, and eBay PayPal printouts.\n\n"Sold, for $${Math.floor(s.cash).toLocaleString()}, to... the ceiling people?"\n\nPrestige Lifestyle Developers bid $${bid.toLocaleString()}. You beat them by $${Math.floor(s.cash - bid).toLocaleString()}.\n\nGalleria Pointe is yours. Your crew climbs down the ladder for the last time, and walks out the front doors in broad daylight.`,
    };
  } else {
    s.over = {
      won: false,
      title: 'SOLD TO THE DEVELOPER',
      text: `Prestige Lifestyle Developers bought Galleria Pointe for $${bid.toLocaleString()}. You had $${Math.floor(s.cash).toLocaleString()}.\n\nThe bulldozers come in March. On the last night, your crew sits on the plywood, listening to the muzak one more time. It sounds slower than it used to.`,
    };
  }
}

const RANDOM_EVENTS: { key: string; weight: number; when: (s: GameState, hour: number) => boolean; run: (s: GameState) => void }[] = [
  {
    key: 'wallet',
    weight: 2,
    when: (s) => s.crew.length > 0,
    run: (s) => {
      const c = rand.pick(s.crew);
      pushModal(s, {
        title: 'A Wallet Under the Bench',
        art: 'wallet',
        body: `${c.name} found a velcro wallet under a bench. Inside: $40, a Blockbuster card, and a Polaroid of somebody's dog.`,
        choices: [
          { label: 'Keep the $40', action: 'wallet_keep' },
          { label: 'Turn it in to Lost & Found (Alert -3, morale +)', action: 'wallet_return' },
        ],
      });
    },
  },
  {
    key: 'raccoon',
    weight: 1.5,
    when: () => true,
    run: (s) => {
      s.rooms.forEach((r) => (r.complaint = Math.max(0, r.complaint - 25)));
      pa(s, 'Good news, staff: Pest Control caught a REAL raccoon in the Food Court ceiling. Mystery solved!');
      log(s, 'An actual raccoon took the blame. Every store complaint drops by 25.', 'good');
    },
  },
  {
    key: 'garynap',
    weight: 1.2,
    when: (s, h) => h === 22 && !s.gary.replaced,
    run: (s) => {
      s.flags.garyAsleepUntil = s.time + 4 * 60 + 60 * 2;
      log(s, 'Gary brought a pillow tonight. He will be asleep in the Security Office from about midnight. Fewer patrols until 4 AM.', 'good');
      for (const n of s.npcs) if (n.isGary) n.state = 'asleep';
    },
  },
  {
    key: 'crackdown',
    weight: 1,
    when: (s, h) => h === 10 && s.crew.length > 1,
    run: (s) => {
      s.flags.crackdownUntil = s.time + 3 * 1440;
      pa(s, 'Mall Management reminds guests: our Parental Escort Policy is now in effect. Loitering is prohibited.');
      log(s, 'Loitering crackdown: recognition by the mall cop builds twice as fast for 3 days.', 'warn');
    },
  },
  {
    key: 'clearance',
    weight: 1.2,
    when: (_s, h) => h === 20,
    run: (s) => {
      s.pools.pallets = (s.pools.pallets ?? 0) + 10;
      log(s, "Dillman's is dumping returns on the loading dock tonight. +10 parts available at Dock Pallets.", 'good');
    },
  },
  {
    key: 'looseTile',
    weight: 1,
    when: (s) => s.objects.some((o) => o.type === 'rope'),
    run: (s) => {
      const r = rand.pick(s.objects.filter((o) => o.type === 'rope'));
      const ri = LAYOUT.roomAt[r.y * 48 + r.x];
      s.rooms[ri].complaint += 30;
      log(s, `A kid in ${LAYOUT.rooms[ri].name} pointed at your loose ceiling tile: "Mommy, there's a hole!" Complaints rise.`, 'warn', { x: r.x, y: r.y, layer: 1 });
    },
  },
  {
    key: 'pestRandom',
    weight: 0.8,
    when: (s) => dayOf(s.time) > 14,
    run: (s) => scheduleNear(s, 'pest', 'Routine pest inspection.', 1),
  },
  {
    key: 'tip',
    weight: 1,
    when: (s) => s.crew.length > 0,
    run: (s) => {
      const amt = rand.int(15, 45);
      earn(s, amt);
      log(s, `A tourist at the fountain tossed in a $${amt} wish. You fished it out before the janitor did.`, 'good');
    },
  },
];

export function randomHourly(s: GameState, hour: number) {
  if (dayOf(s.time) < 3 || s.modals.length) return;
  if (!rand.chance(0.03)) return;
  const options = RANDOM_EVENTS.filter((e) => e.when(s, hour) && s.flags[`rnd_${e.key}`] !== dayOf(s.time));
  const total = options.reduce((a, e) => a + e.weight, 0);
  let roll = rand.next() * total;
  for (const e of options) {
    roll -= e.weight;
    if (roll <= 0) {
      s.flags[`rnd_${e.key}`] = dayOf(s.time);
      e.run(s);
      return;
    }
  }
}

export function dailyCandidates(s: GameState) {
  if (s.gary.affinity >= 100 && !s.flags.garyOffer && !s.gary.recruited) {
    s.flags.garyOffer = 1;
    unlock(s, 'GARY');
    pushModal(s, {
      title: 'Gary Knows',
      art: 'gary',
      body: `This morning there was a note taped to your ladder, in careful block capitals:\n\n"I KNOW YOU'RE UP THERE. I'VE KNOWN FOR A WHILE. THANKS FOR THE CINNABOMBS. I HATE THIS JOB. CAN I COME UP? — GARY"\n\nIf Gary quits and joins you, he brings his knowledge of every patrol route. A new guard will replace him, one who has never had a Cinnabomb.\n\nOr Gary keeps the job and stays on the inside: he goes easy on you and tips you off.`,
      choices: [
        { label: 'Gary joins the crew', action: 'gary_join' },
        { label: 'Gary stays on the inside', action: 'gary_insider' },
      ],
    });
  }
}

export function resolveModal(s: GameState, modalId: number, action: string) {
  s.modals = s.modals.filter((m) => m.id !== modalId);
  const [verb, a, b] = action.split(':');
  switch (verb) {
    case 'recruit': {
      if (!s.candidate) return;
      const short = Math.max(0, 3 - s.food);
      s.cash -= short * 4;
      s.food = Math.max(0, s.food - 3);
      const c = addCrew(s, s.candidate);
      log(s, `${c.name} climbed the ladder and joined the crew.`, 'good', { x: Math.floor(c.x), y: Math.floor(c.y), layer: 1 });
      sfx('good');
      s.candidate = null;
      return;
    }
    case 'decline':
      s.candidate = null;
      return;
    case 'bail': {
      const c = s.crew.find((x) => x.id === Number(a));
      if (!c) return;
      s.cash -= Number(b);
      c.awayUntil = s.time + 2 * 1440;
      log(s, `You posted bail for ${c.name}. They'll sneak back in two days.`, 'info');
      return;
    }
    case 'wait': {
      const c = s.crew.find((x) => x.id === Number(a));
      if (!c) return;
      c.awayUntil = s.time + 5 * 1440;
      log(s, `${c.name} will sit it out in county. Five days.`, 'info');
      return;
    }
    case 'cut': {
      const c = s.crew.find((x) => x.id === Number(a));
      if (!c) return;
      s.crew = s.crew.filter((x) => x !== c);
      log(s, `${c.name} is gone. Nobody mentions them again.`, 'bad');
      return;
    }
    case 'feast':
      s.food -= 10;
      s.crew.forEach((c) => (c.morale = Math.min(100, c.morale + 25)));
      log(s, 'A Thanksgiving feast of food court leftovers, served on a plywood table. Best night in the ceiling yet.', 'good');
      sfx('good');
      return;
    case 'wallet_keep':
      earn(s, 40);
      sfx('cash');
      return;
    case 'wallet_return':
      raiseAlert(s, -3, 'good deed');
      s.crew.forEach((c) => (c.morale = Math.min(100, c.morale + 4)));
      log(s, 'Turned in the wallet. Gary was touched. Things feel a bit lighter.', 'good');
      return;
    case 'xmasgary':
      s.food -= 5;
      s.gary.affinity = Math.min(100, s.gary.affinity + 40);
      log(s, 'Gary found a Christmas dinner outside his door. He stood there for a long time. Gary goodwill +40.', 'good');
      sfx('good');
      return;
    case 'gary_join': {
      s.gary.recruited = true;
      s.gary.replaced = true;
      const g = addCrew(s, makeCandidate(s, 'gary'));
      for (const n of s.npcs) if (n.isGary) n.state = 'offduty';
      log(s, `${g.name} turned in his badge and climbed the ladder. "So THIS is where the extension cords went."`, 'good');
      pa(s, 'Please welcome Officer Kowalski to the Galleria Pointe night security team.');
      return;
    }
    case 'gary_insider':
      s.gary.insider = true;
      log(s, 'Gary stays on the job. From now on he takes the long way around, whistles before corners, and the alert level rises more slowly.', 'good');
      return;
  }
}

export function auctionSummary(s: GameState) {
  return `${formatDate(AUCTION_DAY)} · Developer bid $${auctionBid(s).toLocaleString()}`;
}
