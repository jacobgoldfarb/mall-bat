import type { SpotId } from './layout';

export type BuildId =
  | 'deck'
  | 'sleeping_bag'
  | 'crate'
  | 'cooler'
  | 'splice'
  | 'lamp'
  | 'hot_plate'
  | 'futon'
  | 'fridge'
  | 'foam'
  | 'fan'
  | 'tv'
  | 'rope'
  | 'lava_lamp'
  | 'workbench'
  | 'pc'
  | 'raccoon'
  | 'periscope'
  | 'bunk'
  | 'xmas'
  | 'heater'
  | 'scanner'
  | 'battery'
  | 'pod'
  | 'hammock'
  | 'arcade'
  | 'throne';

export type BuildCategory = 'structure' | 'living' | 'power' | 'stealth' | 'leisure' | 'work';

export interface BuildDef {
  id: BuildId;
  name: string;
  category: BuildCategory;
  cost: number;
  rank: number;
  desc: string;
  flavor: string;
  power?: number;
  supply?: number;
  radius?: number;
  offGrid?: boolean;
  noise?: number;
  noiseWhen?: 'always' | 'use';
  smell?: number;
  comfort?: number;
  seasonalComfort?: boolean;
  beds?: number;
  foodCap?: number;
  partsCap?: number;
  goodsCap?: number;
  insulation?: number;
  insulationRadius?: number;
  fanRadius?: number;
  light?: number;
  lightColor?: string;
  unique?: boolean;
  decoy?: boolean;
  drop?: boolean;
  periscope?: boolean;
}

export const BUILDS: BuildDef[] = [
  { id: 'deck', name: 'Plywood Deck', category: 'structure', cost: 6, rank: 0, desc: 'Foundation for everything. Must connect to your hatch or another deck. Drag to lay many.', flavor: 'Ceiling tiles hold four pounds. Plywood holds you.' },
  { id: 'sleeping_bag', name: 'Sleeping Bag', category: 'living', cost: 15, rank: 0, beds: 1, comfort: 1, desc: '1 bed. Every rat needs somewhere to crash.', flavor: 'Smells like a sleepover from 1997.' },
  { id: 'crate', name: 'Milk Crate Stash', category: 'living', cost: 12, rank: 0, partsCap: 15, goodsCap: 8, desc: '+15 parts, +8 goods storage.', flavor: 'Property of Galleria Dairy. Allegedly.' },
  { id: 'cooler', name: 'Igloo Cooler', category: 'living', cost: 18, rank: 0, foodCap: 20, desc: '+20 food storage. Food without a fridge spoils slowly.', flavor: 'Refilled nightly with food court ice.' },
  { id: 'splice', name: 'Power Splice', category: 'power', cost: 25, rank: 0, supply: 120, radius: 5, desc: 'Taps the store below. Powers 120W within 5 tiles. That store pays the bill and might notice at the weekly review.', flavor: 'A wire nut and a prayer.' },
  { id: 'lamp', name: 'Clip Lamp', category: 'leisure', cost: 10, rank: 0, power: 5, comfort: 1, light: 3.2, lightColor: '255,214,150', desc: '+1 comfort. Light makes the dark less dark.', flavor: 'Clamped to a sprinkler pipe. Probably fine.' },
  { id: 'hot_plate', name: 'Hot Plate', category: 'living', cost: 35, rank: 0, power: 40, smell: 5, noiseWhen: 'use', desc: 'Hot meals give morale. Cooking creates smell. Build it above something smelly.', flavor: 'Ramen tonight. Ramen every night.' },

  { id: 'futon', name: 'Futon', category: 'living', cost: 70, rank: 1, beds: 1, comfort: 3, desc: '1 bed, +3 comfort.', flavor: 'Liberated from a dorm room clearance.' },
  { id: 'fridge', name: 'Mini-Fridge', category: 'living', cost: 85, rank: 1, power: 20, foodCap: 60, desc: '+60 food storage. Stops food from spoiling.', flavor: 'Still has a Dave Matthews Band sticker.' },
  { id: 'foam', name: 'Egg-Crate Foam', category: 'stealth', cost: 16, rank: 0, insulation: 0.5, insulationRadius: 1, desc: 'Cuts noise by 50% on this tile and the 8 around it.', flavor: 'The secret to every garage band and every squatter.' },
  { id: 'fan', name: 'Box Fan', category: 'stealth', cost: 22, rank: 1, power: 8, noise: 0.4, noiseWhen: 'always', fanRadius: 2, desc: 'Clears smell within 2 tiles. A little noisy.', flavor: 'Blows the evidence toward the Cinnabomb.' },
  { id: 'tv', name: 'CRT TV + PS2', category: 'leisure', cost: 120, rank: 1, power: 35, comfort: 6, noise: 2.6, noiseWhen: 'use', light: 2.4, lightColor: '120,170,255', desc: '+6 comfort. Loud while crew hang out. Put it over a loud store.', flavor: 'Vice City, volume down. Mostly.' },
  { id: 'rope', name: 'Rope Drop', category: 'structure', cost: 30, rank: 1, drop: true, desc: 'A loose ceiling tile and a rope. A shortcut into the store below. Staff notice loose tiles.', flavor: 'Mind the gap.' },
  { id: 'lava_lamp', name: 'Lava Lamp', category: 'leisure', cost: 30, rank: 1, power: 4, comfort: 2, light: 2.2, lightColor: '255,90,200', desc: '+2 comfort.', flavor: "Spenceley's floor model. It wasn't going to buy itself." },

  { id: 'workbench', name: 'Workbench', category: 'work', cost: 150, rank: 2, power: 30, noise: 3.4, noiseWhen: 'use', light: 2, lightColor: '255,240,200', desc: 'Unlocks the Tinker job: 2 parts become 1 sellable good. Power tools are loud.', flavor: 'Refurbished means it worked once.' },
  { id: 'pc', name: 'Beige Box PC', category: 'work', cost: 260, rank: 2, power: 50, unique: true, light: 1.6, lightColor: '140,255,190', desc: 'Sells goods on eBay automatically. Needs Wi-Fi: build within 10 tiles of Boundaries Books.', flavor: 'Leeching the T-Mobile HotSpot. 56k would be faster.' },
  { id: 'raccoon', name: 'Decoy Raccoon', category: 'stealth', cost: 45, rank: 2, decoy: true, desc: 'If an inspection covers this tile, they find the raccoon and stop looking. Used up when found.', flavor: '"It was raccoons." The oldest excuse in the book.' },
  { id: 'periscope', name: 'Periscope', category: 'stealth', cost: 90, rank: 2, periscope: true, desc: 'Crew within 6 tiles below are 30% harder to spot at night.', flavor: 'Two mirrors and a paper towel tube.' },
  { id: 'bunk', name: 'Bunk Bed', category: 'living', cost: 140, rank: 2, beds: 2, comfort: 2, desc: '2 beds, +2 comfort.', flavor: 'Top bunk is a privilege.' },
  { id: 'xmas', name: 'String Lights', category: 'leisure', cost: 25, rank: 2, power: 6, comfort: 2, light: 2.8, lightColor: '255,120,120', desc: '+2 comfort. Festive.', flavor: 'Ceiling-core.' },

  { id: 'heater', name: 'Space Heater', category: 'living', cost: 50, rank: 3, power: 45, comfort: 5, seasonalComfort: true, light: 1.6, lightColor: '255,110,40', desc: '+5 comfort once it gets cold (December).', flavor: 'The ducts get cold in winter.' },
  { id: 'scanner', name: 'Police Scanner', category: 'stealth', cost: 220, rank: 3, power: 10, unique: true, desc: 'Shows the exact spot of every scheduled inspection. Alert rises 15% slower.', flavor: '"Unit 4, check the ceiling in Hot Spot." Copy that, Unit 4.' },
  { id: 'battery', name: 'Car Battery Bank', category: 'power', cost: 320, rank: 3, supply: 200, radius: 6, offGrid: true, desc: 'Powers 200W within 6 tiles. Off-grid: no store pays the bill.', flavor: 'Six Die-Hards and an inverter from RadioHut.' },
  { id: 'pod', name: 'Soundproof Pod', category: 'stealth', cost: 340, rank: 3, insulation: 0.85, insulationRadius: 2, desc: 'Cuts noise by 85% on every tile within 2.', flavor: 'Moving blankets. Lots of moving blankets.' },

  { id: 'hammock', name: 'Duct Hammock', category: 'living', cost: 95, rank: 4, beds: 1, comfort: 4, desc: '1 bed, +4 comfort.', flavor: 'Strung between two ducts like a king.' },
  { id: 'arcade', name: 'Arcade Cabinet', category: 'leisure', cost: 450, rank: 4, power: 60, comfort: 9, noise: 3, noiseWhen: 'use', light: 2.6, lightColor: '255,60,220', desc: '+9 comfort. Loud while played.', flavor: 'Fun Zone "lost" a Galaga.' },
  { id: 'throne', name: 'The Throne', category: 'leisure', cost: 1200, rank: 4, power: 30, comfort: 16, unique: true, light: 3, lightColor: '255,215,90', desc: '+16 comfort. Every kingdom needs one.', flavor: 'A Sharper Idea massage chair. It hums.' },
];

export const BUILD: Record<BuildId, BuildDef> = Object.fromEntries(BUILDS.map((b) => [b.id, b])) as Record<BuildId, BuildDef>;

export type JobId =
  | 'rest'
  | 'busk'
  | 'samples'
  | 'returns'
  | 'kiosk'
  | 'popup'
  | 'boundaries'
  | 'fountain'
  | 'dumpster'
  | 'vending'
  | 'arcade'
  | 'radiohut'
  | 'pallets'
  | 'lostfound'
  | 'gary'
  | 'stockroom'
  | 'tinker';

export type Stat = 'stealth' | 'charm' | 'handy';

export interface JobDef {
  id: JobId;
  name: string;
  shift: 'day' | 'night' | 'both';
  spot?: SpotId;
  rank: number;
  stat: Stat;
  cycle: number;
  sketch: number;
  desc: string;
  yields: string;
  risk: 'none' | 'low' | 'medium' | 'high';
}

export const JOBS: JobDef[] = [
  { id: 'rest', name: 'Rest', shift: 'both', rank: 0, stat: 'stealth', cycle: 60, sketch: 0, desc: 'Sleep, eat, hang out.', yields: 'Energy', risk: 'none' },
  { id: 'busk', name: 'Busk at Center Court', shift: 'day', spot: 'busk', rank: 0, stat: 'charm', cycle: 30, sketch: 0.15, desc: 'Acoustic covers of "Hey There Delilah"... no wait, that comes out in 2006. Yellowcard, then.', yields: '$ (scales with crowd)', risk: 'low' },
  { id: 'samples', name: 'Sample Hunter', shift: 'day', spot: 'samples', rank: 0, stat: 'charm', cycle: 30, sketch: 0.3, desc: 'Teriyaki Temple hands out chicken on toothpicks. Take one. Take forty.', yields: 'Food', risk: 'low' },
  { id: 'boundaries', name: 'Read at Boundaries', shift: 'day', spot: 'boundaries', rank: 1, stat: 'charm', cycle: 60, sketch: 0.15, desc: 'Sit on the floor and read a whole novel. Nobody minds.', yields: 'Morale', risk: 'none' },
  { id: 'returns', name: 'Searz Returns', shift: 'day', spot: 'returns', rank: 2, stat: 'charm', cycle: 60, sketch: 1.2, desc: '"I lost the receipt." Returns a good for store credit, sold on. Best price, worst heat.', yields: 'Goods → $$', risk: 'medium' },
  { id: 'kiosk', name: 'Work the Kiosk', shift: 'day', spot: 'kiosk', rank: 2, stat: 'charm', cycle: 45, sketch: -0.6, desc: 'Sell goods from your leased kiosk. Looking legit lowers recognition.', yields: 'Goods → $', risk: 'none' },
  { id: 'popup', name: 'Staff the Pop-Up', shift: 'day', rank: 3, stat: 'charm', cycle: 40, sketch: -0.8, desc: 'Sell goods in your seasonal pop-up store at holiday markups.', yields: 'Goods → $$', risk: 'none' },
  { id: 'fountain', name: 'Fountain Fishing', shift: 'night', spot: 'fountain', rank: 0, stat: 'handy', cycle: 15, sketch: 0, desc: 'A magnet on a shoelace. Every wish has a price, and the price is about 11 cents.', yields: '$', risk: 'low' },
  { id: 'dumpster', name: 'Dumpster Dive', shift: 'night', spot: 'dumpster', rank: 0, stat: 'handy', cycle: 20, sketch: 0, desc: 'Food court leftovers hit the dock dumpsters after close.', yields: 'Food, sometimes parts', risk: 'low' },
  { id: 'vending', name: 'Vending Jiggle', shift: 'night', spot: 'vending', rank: 0, stat: 'handy', cycle: 30, sketch: 0, desc: 'The machine in the restroom hall gives up if you rock it right.', yields: 'Food, $', risk: 'low' },
  { id: 'gary', name: "Leave Gary a Cinnabomb", shift: 'night', spot: 'gary', rank: 0, stat: 'charm', cycle: 30, sketch: 0, desc: 'Gary the night guard is lonely. Leave him a treat outside the security office (costs 2 food).', yields: "Gary's goodwill", risk: 'medium' },
  { id: 'arcade', name: 'Token Shake', shift: 'night', spot: 'arcade', rank: 1, stat: 'handy', cycle: 20, sketch: 0, desc: 'The Fun Zone token machine has a loose panel. Fun Zone notices the shortfall (raises Alert a little).', yields: '$$', risk: 'medium' },
  { id: 'radiohut', name: 'RadioHut Salvage', shift: 'night', spot: 'radiohut', rank: 1, stat: 'handy', cycle: 30, sketch: 0, desc: 'The back room is full of returns marked DEFECTIVE. RadioHut notices missing stock (raises Alert a little).', yields: 'Parts', risk: 'medium' },
  { id: 'stockroom', name: 'Stockroom Pilfer', shift: 'night', spot: 'stockroom', rank: 1, stat: 'stealth', cycle: 25, sketch: 0, desc: 'Back-of-house overflow boxes. Busted electronics nobody will miss... much.', yields: 'Parts, sometimes goods', risk: 'low' },
  { id: 'pallets', name: 'Dock Pallets', shift: 'night', spot: 'pallets', rank: 2, stat: 'handy', cycle: 25, sketch: 0, desc: "Return-to-vendor pallets from Dillman's. Nobody inventories broken stuff.", yields: 'Parts', risk: 'low' },
  { id: 'lostfound', name: 'Lost & Found Raid', shift: 'night', spot: 'lostfound', rank: 2, stat: 'stealth', cycle: 45, sketch: 0, desc: 'Inside the Security Office. While Gary is out on patrol.', yields: 'Goods, $, parts', risk: 'high' },
  { id: 'tinker', name: 'Tinker at Workbench', shift: 'both', rank: 2, stat: 'handy', cycle: 90, sketch: 0, desc: 'Turn 2 parts into 1 sellable good. Loud.', yields: 'Parts → Goods', risk: 'none' },
];

export const JOB: Record<JobId, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<JobId, JobDef>;

export type TraitId =
  | 'quick'
  | 'loud'
  | 'nightowl'
  | 'earlybird'
  | 'returnspro'
  | 'gearhead'
  | 'performer'
  | 'salesman'
  | 'invisible'
  | 'snorer'
  | 'jolly'
  | 'routes'
  | 'lightsleeper'
  | 'glutton'
  | 'neat';

export const TRAITS: Record<TraitId, { name: string; desc: string; good: boolean }> = {
  quick: { name: 'Quick', desc: 'Moves 25% faster.', good: true },
  loud: { name: 'Loud', desc: 'Footsteps make double noise.', good: false },
  nightowl: { name: 'Night Owl', desc: 'Tires 40% slower at night.', good: true },
  earlybird: { name: 'Early Bird', desc: 'Tires 40% slower by day.', good: true },
  returnspro: { name: 'Returns Pro', desc: '+40% from returns, half the recognition.', good: true },
  gearhead: { name: 'Gearhead', desc: 'Tinkers 50% faster.', good: true },
  performer: { name: 'Performer', desc: 'Busking earns 60% more.', good: true },
  salesman: { name: 'Salesman', desc: 'Kiosk and pop-up sales +50%.', good: true },
  invisible: { name: 'Invisible by Day', desc: 'Nobody suspects a mall walker. Recognition barely rises.', good: true },
  snorer: { name: 'Snorer', desc: 'Makes noise while sleeping.', good: false },
  jolly: { name: 'Jolly', desc: '+6 morale for the whole crew.', good: true },
  routes: { name: 'Knows the Routes', desc: 'Whole crew is 15% harder to spot.', good: true },
  lightsleeper: { name: 'Light Sleeper', desc: 'Recovers energy 30% faster.', good: true },
  glutton: { name: 'Glutton', desc: 'Gets hungry 50% faster.', good: false },
  neat: { name: 'Neat Freak', desc: 'Cooking makes half the smell.', good: true },
};

export interface Archetype {
  id: string;
  title: string;
  stealth: number;
  charm: number;
  handy: number;
  traits: TraitId[];
  bios: string[];
  look: { hat?: string; top: string[]; hair: string[] };
}

export const ARCHETYPES: Archetype[] = [
  { id: 'drifter', title: 'Evicted Drifter', stealth: 3, charm: 3, handy: 3, traits: [], bios: ['Got evicted on a Tuesday. Found the ladder on a Friday.'], look: { hat: 'beanie', top: ['#3a6ac8'], hair: ['#3a2a1a'] } },
  { id: 'mallrat', title: 'Mall Rat', stealth: 4, charm: 3, handy: 1, traits: ['quick'], bios: ['Has spent every Saturday at Galleria Pointe since 1999.', 'Knows every bench by name.'], look: { hat: 'trucker', top: ['#ff8fb8', '#8fd0ff', '#b0ff8f'], hair: ['#e8c87a', '#3a2a1a', '#7a4a2a'] } },
  { id: 'goth', title: 'Hot Spot Dropout', stealth: 5, charm: 1, handy: 2, traits: ['nightowl'], bios: ['Quit Hot Spot after the manager played Hilary Duff.', 'Wears black. Blends into the dark.'], look: { top: ['#1a1a1a', '#2a0a1a'], hair: ['#111', '#4a0a3a', '#1a1a3a'] } },
  { id: 'searz', title: 'Laid-off Searz Clerk', stealth: 2, charm: 3, handy: 4, traits: ['returnspro'], bios: ['Twenty-two years in Hardware. Downsized by a consultant.', 'Still has the employee discount card.'], look: { top: ['#1c4fa0'], hair: ['#888', '#5a4a3a'] } },
  { id: 'skater', title: 'Skater Punk', stealth: 3, charm: 2, handy: 2, traits: ['quick', 'loud'], bios: ['Banned from the parking lot. Not from the ceiling.', 'Can kickflip. Cannot whisper.'], look: { hat: 'cap', top: ['#c84b3a', '#3a8a5a', '#e8c33a'], hair: ['#3a2a1a', '#e8c87a'] } },
  { id: 'techie', title: 'Ex-RadioHut Tech', stealth: 2, charm: 1, handy: 5, traits: ['gearhead'], bios: ['"You have questions, we have batteries."', 'Can fix anything with a soldering iron and spite.'], look: { top: ['#e8202a', '#555'], hair: ['#3a2a1a', '#111'] } },
  { id: 'theater', title: 'Theater Kid', stealth: 2, charm: 5, handy: 1, traits: ['performer'], bios: ['Was Rizzo in Grease. Never recovered.', 'Will break into song.'], look: { top: ['#a24bff', '#ff5fa8'], hair: ['#b03a1a', '#3a2a1a'] } },
  { id: 'kiosk', title: 'Kiosk Hustler', stealth: 2, charm: 5, handy: 2, traits: ['salesman'], bios: ['"Excuse me miss, can I ask you a question about your nails?"', 'Sold Dead Sea lotion to a man with no hands.'], look: { top: ['#111', '#fff'], hair: ['#111'] } },
  { id: 'grandma', title: 'Mall Walker', stealth: 1, charm: 4, handy: 3, traits: ['invisible', 'earlybird'], bios: ['Laps the concourse at 6 AM. Nobody has ever asked where she lives.', 'Tracksuit. Visor. Walkman. Legend.'], look: { hat: 'visor', top: ['#7a5cff', '#2aa6a0', '#ff4fa3'], hair: ['#ddd', '#bbb'] } },
  { id: 'runaway', title: 'Runaway', stealth: 4, charm: 2, handy: 2, traits: ['lightsleeper'], bios: ['Took the Greyhound as far as $40 would go.', "Doesn't talk about home."], look: { hat: 'hood', top: ['#555', '#3a5a3a', '#5a3a3a'], hair: ['#3a2a1a', '#7a4a2a'] } },
  { id: 'emo', title: 'Emo Kid', stealth: 3, charm: 2, handy: 3, traits: ['nightowl', 'glutton'], bios: ['Side bangs. Dashboard Confessional. Feelings.', 'Writes LiveJournal posts about the ceiling.'], look: { top: ['#1a1a1a', '#2a2a4a'], hair: ['#111'] } },
  { id: 'santa', title: 'Ex-Mall Santa', stealth: 1, charm: 5, handy: 2, traits: ['snorer', 'jolly'], bios: ['Fired for napping on the job. In the chair. During photos.'], look: { top: ['#c8102e'], hair: ['#eee'] } },
  { id: 'gary', title: 'Former Night Guard', stealth: 4, charm: 2, handy: 3, traits: ['routes'], bios: ['Gary knows. Gary has always known. Gary is in.'], look: { hat: 'cap', top: ['#22304a'], hair: ['#5a4a3a'] } },
];

export const FIRST_NAMES = [
  'Tyler', 'Brittany', 'Kayla', 'Josh', 'Ashley', 'Jordan', 'Brandon', 'Amber', 'Cody', 'Tiffany', 'Dustin', 'Megan', 'Travis',
  'Courtney', 'Kyle', 'Chelsea', 'Justin', 'Crystal', 'Zach', 'Heather', 'Derek', 'Danielle', 'Shane', 'Lindsay', 'Chad', 'Misty',
  'Trevor', 'Jenna', 'Corey', 'Alyssa', 'Devon', 'Raven', 'Marcus', 'Destiny', 'Jared', 'Kelsey',
];

export const RANKS = [
  { name: 'Squatter', earned: 0 },
  { name: 'Mall Rat', earned: 350 },
  { name: 'Ceiling Baron', earned: 1800 },
  { name: 'Duct Duke', earned: 7000 },
  { name: 'Plenum Prince', earned: 18000 },
];

export const ALERT_LEVELS = [
  { at: 0, name: 'Calm', desc: 'One night guard. Two cameras.' },
  { at: 20, name: 'Watchful', desc: 'Extra cameras installed.' },
  { at: 40, name: 'Concerned', desc: 'A second night guard sweeps the stores.' },
  { at: 60, name: 'Alarmed', desc: 'K-9 unit. Guards spot you faster.' },
  { at: 80, name: 'Lockdown', desc: 'Motion sensors in the concourse. One more slip and they sweep the ceiling.' },
];
