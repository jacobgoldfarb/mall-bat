import { app, focusTile, refresh, selectBuild, SPEEDS, toast } from '../app';
import { audio } from '../audio/audio';
import { currentJob, jobBlocked, recallCrew } from '../game/crew';
import { ALERT_LEVELS, BUILD, BUILDS, JOB, JOBS, RANKS, TRAITS, type BuildCategory, type JobId } from '../game/defs';
import { resolveModal } from '../game/events';
import { LAYOUT, C_DUCT, C_AC, C_SKYLIGHT, C_NONE, idx, inBounds } from '../game/layout';
import { OBJECTIVES, objectiveProgress } from '../game/objectives';
import { ACHIEVEMENTS, alertLevel, auctionBid, rankOf } from '../game/ops';
import { FOOD_PRICE, KIOSK_COST, POPUP_COST, POWER_MULT, buyFood, demolishAt, leaseKiosk, noiseField, openPopup, popupName } from '../game/sim';
import type { Crew, GameState } from '../game/state';
import { AUCTION_DAY, dayOf, formatClock, formatDate, phaseAt, phaseLabel } from '../game/time';
import { boundariesSignal, getDerived } from '../game/world';
import { crewSprite } from '../render/renderer';
import { Icon } from './icons';
import { Bar, BuildIcon, Dots, Portrait } from './widgets';

const money = (n: number) => `$${Math.floor(n).toLocaleString()}`;

export function TopBar({ s }: { s: GameState }) {
  const day = dayOf(s.time);
  const phase = phaseAt(s.time);
  const d = getDerived(s);
  const rank = rankOf(s);
  const next = RANKS[rank + 1];
  const lvl = alertLevel(s.alert);
  const bid = auctionBid(s);
  const daysLeft = AUCTION_DAY - day;
  const gap = s.cash - bid;
  return (
    <div class="topbar panel">
      <div class="logo" onClick={() => ((app.menu = 'pause'), refresh())}>
        DROP<span>CEILING</span>
      </div>
      <div class="clock">
        <div class="clock-top">
          <span class="date">{formatDate(day)}</span>
          <span class={`phase phase-${phase}`}>{phaseLabel(phase, day)}</span>
        </div>
        <div class="time">{formatClock(s.time)}</div>
      </div>
      <div class="speeds">
        <button class={`btn ${app.paused ? 'on' : 'ghost'}`} onClick={() => ((app.paused = !app.paused), refresh())} title="Pause (Space)">
          <i class="glyph-pause" />
        </button>
        {SPEEDS.map((sp, i) => (
          <button class={`btn ${!app.paused && app.speed === sp ? 'on' : 'ghost'}`} onClick={() => ((app.speed = sp), (app.paused = false), refresh())} title={`Speed ${sp}x (${i + 1})`}>
            {SPEEDS.slice(0, i + 1).map(() => (
              <i class="glyph-play" />
            ))}
          </button>
        ))}
      </div>
      <div class="divider" />
      <div class="stats">
        <div class="stat cash" title="Cash. You need more than the developer bid on Dec 31.">
          <Icon name="cash" />
          <div>
            <b>{money(s.cash)}</b>
            <small>{s.todayIncome > 0 ? `+${money(s.todayIncome)} TODAY` : 'CASH'}</small>
          </div>
        </div>
        <Resource vital icon="food" label="Food" value={s.food} cap={d.foodCap} title={d.fridge ? 'Fridge keeps it fresh.' : 'Spoils 8%/day without a powered Mini-Fridge.'} />
        <Resource icon="parts" label="Parts" value={s.parts} cap={d.partsCap} title="Tinker 2 parts into 1 good." />
        <Resource icon="goods" label="Goods" value={s.goods} cap={d.goodsCap} title="Sell on eBay, at the kiosk, the pop-up, or return them at Searz." />
      </div>
      <div class="divider" />
      <div class="meter rank" title={next ? `Next rank at ${money(next.earned)} total earned` : 'Max rank'}>
        <Icon name="rank" />
        <div style={{ flex: 1 }}>
          <div class="meter-head">
            <b>{RANKS[rank].name}</b>
          </div>
          {next ? <Bar value={((s.totalEarned - RANKS[rank].earned) / (next.earned - RANKS[rank].earned)) * 100} color="#dc348c" /> : <span class="label">MAX RANK</span>}
          {next && <span class="label">NEXT · {next.name.toUpperCase()}</span>}
        </div>
      </div>
      <div class={`meter alert lvl${lvl}`} title={`${ALERT_LEVELS[lvl].name}: ${ALERT_LEVELS[lvl].desc}\nAt 100%, they sweep the ceiling and you're evicted.`}>
        <Icon name="alert" />
        <div style={{ flex: 1 }}>
          <div class="meter-head">
            <span class="label">ALERT</span>
            <b>
              {ALERT_LEVELS[lvl].name} {Math.round(s.alert)}%
            </b>
          </div>
          <div class="alert-track">
            {ALERT_LEVELS.slice(1).map((l) => (
              <i style={{ left: `${l.at}%` }} />
            ))}
            <div class="alert-fill" style={{ width: `${s.alert}%` }} />
          </div>
        </div>
      </div>
      <div class="meter auction" title="The mall goes to auction at noon on New Year's Eve. Every store that closes lowers the developer's bid.">
        <Icon name="auction" />
        <div>
          <span class="label">{s.flags.auctionKnown ? `AUCTION · ${daysLeft > 0 ? `${daysLeft} DAYS` : 'TODAY'}` : 'RUMOR · DEC 31'}</span>
          <div class="meter-head">
            <b>{money(bid)}</b>
          </div>
          <span class={`verdict ${gap > 0 ? 'ahead' : ''}`}>{gap > 0 ? `AHEAD BY ${money(gap)}` : `SHORT ${money(-gap)}`}</span>
        </div>
      </div>
      <button class="btn small ghost menu-btn" onClick={() => ((app.menu = 'pause'), refresh())} title="Menu (Esc)">
        Menu<kbd>Esc</kbd>
      </button>
    </div>
  );
}

function Resource({ icon, label, value, cap, title, vital }: { icon: string; label: string; value: number; cap: number; title: string; vital?: boolean }) {
  const state = value >= cap ? 'full' : vital && value <= 0 ? 'empty' : '';
  return (
    <div class={`stat ${state}`} title={`${label} (cap ${cap}). ${title}`}>
      <Icon name={icon} />
      <div>
        <b>{Math.floor(value)}</b>
        <small>
          {state === 'full' ? 'FULL' : label.toUpperCase()} /{cap}
        </small>
      </div>
    </div>
  );
}

const CATS: { id: BuildCategory | 'business'; label: string; short: string }[] = [
  { id: 'structure', label: 'Structure', short: 'Base' },
  { id: 'living', label: 'Living', short: 'Live' },
  { id: 'power', label: 'Power', short: 'Power' },
  { id: 'stealth', label: 'Stealth', short: 'Hide' },
  { id: 'leisure', label: 'Leisure', short: 'Fun' },
  { id: 'work', label: 'Work', short: 'Work' },
  { id: 'business', label: 'Business', short: 'Biz' },
];

export function BuildPanel({ s }: { s: GameState }) {
  const rank = rankOf(s);
  if (!app.buildOpen) {
    return (
      <div class="buildpanel panel collapsed">
        <button class="btn" onClick={() => ((app.buildOpen = true), refresh())} title="Open build menu (B)">
          <Icon name="structure" size={16} /> Build<kbd>B</kbd>
        </button>
      </div>
    );
  }
  const items = BUILDS.filter((b) => b.category === app.buildCategory);
  return (
    <div class="buildpanel panel">
      <div class="panel-head">
        <span>
          Build <kbd>B</kbd>
        </span>
        <div class="tools">
          <button class={`btn small ${app.view.demolish ? 'danger' : 'ghost'}`} onClick={() => ((app.view.demolish = !app.view.demolish), (app.view.build = null), (app.view.layer = 1), refresh())} title="Demolish (X): 60% refund">
            Remove<kbd>X</kbd>
          </button>
          <button class="btn small ghost icon-btn" onClick={() => ((app.buildOpen = false), refresh())} title="Collapse (B)">
            –
          </button>
        </div>
      </div>
      <div class="cats">
        {CATS.map((c) => (
          <button class={`cat ${app.buildCategory === c.id ? 'on' : ''}`} onClick={() => ((app.buildCategory = c.id), audio.play('click'), refresh())} title={c.label}>
            <Icon name={c.id} />
            <small>{c.short}</small>
          </button>
        ))}
      </div>
      {app.buildCategory === 'business' ? (
        <BusinessPanel s={s} />
      ) : (
        <div class="items">
          {items.map((b) => {
            const locked = rank < b.rank;
            const cant = s.cash < b.cost;
            const on = app.view.build === b.id;
            return (
              <button
                class={`item ${on ? 'on' : ''} ${locked ? 'locked' : ''} ${cant ? 'cant' : ''}`}
                disabled={locked}
                onClick={() => {
                  audio.play('click');
                  selectBuild(on ? null : b.id);
                }}
              >
                <BuildIcon type={b.id} />
                <div class="item-body">
                  <div class="item-name">
                    {b.name} <b class={cant ? 'bad' : ''}>${b.cost}</b>
                  </div>
                  <div class="item-desc">{locked ? `Locked · unlocks at rank ${RANKS[b.rank].name}` : b.desc}</div>
                  {!locked && (
                    <div class="item-tags">
                      {b.power ? <i class="tag power">USES {b.power}W</i> : null}
                      {b.supply ? <i class="tag supply">GIVES {b.supply}W</i> : null}
                      {b.noise ? <i class="tag noise">NOISE {b.noise}</i> : null}
                      {b.smell ? <i class="tag smell">SMELL {b.smell}</i> : null}
                      {b.comfort ? <i class="tag comfort">COMFY {b.comfort}</i> : null}
                      {b.beds ? <i class="tag beds">BEDS {b.beds}</i> : null}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {app.view.build && <div class="flavor">"{BUILD[app.view.build].flavor}"</div>}
    </div>
  );
}

function BusinessPanel({ s }: { s: GameState }) {
  const rank = rankOf(s);
  const vacant = s.rooms.map((r, i) => ({ r, i })).filter(({ r, i }) => r.vacant && !r.popup && LAYOUT.rooms[i].kind === 'store');
  const d = getDerived(s);
  return (
    <div class="items business">
      <div class="biz">
        <h4>
          <Icon name="food" /> Buy Food
        </h4>
        <p>Grab slices and pretzels at the food court like a normal customer. ${FOOD_PRICE} each.</p>
        <div class="row">
          {[5, 10, 25].map((n) => (
            <button class="btn small" disabled={s.food >= d.foodCap} onClick={() => {
              const err = buyFood(s, n);
              if (err) toast(err, 'bad');
              else audio.play('cash');
              refresh();
            }}>
              +{n} (${n * FOOD_PRICE})
            </button>
          ))}
        </div>
      </div>
      <div class="biz">
        <h4>
          <Icon name="business" /> Phone Charmz Kiosk
        </h4>
        <p>Lease a concourse kiosk under a fake LLC. Unlocks the Work the Kiosk day job: sells goods, and looking legit lowers recognition. ${KIOSK_COST} + $20/day rent.</p>
        {s.business.kiosk ? (
          <div class="ok-line">✓ Leased</div>
        ) : (
          <button class="btn" disabled={rank < 2 || s.cash < KIOSK_COST} onClick={() => {
            const err = leaseKiosk(s);
            if (err) toast(err, 'bad');
            refresh();
          }}>
            {rank < 2 ? `Locked · ${RANKS[2].name}` : `Lease for $${KIOSK_COST}`}
          </button>
        )}
      </div>
      <div class="biz">
        <h4>
          <Icon name="goods" /> Seasonal Pop-Up
        </h4>
        <p>Lease a vacant storefront and sell goods at holiday markups. Earns passive income while open. Nobody complains about their own store's ceiling. ${POPUP_COST} + $90/day.</p>
        {s.business.popupRoom >= 0 ? (
          <div class="ok-line">✓ {popupName(s)} in the old {LAYOUT.rooms[s.business.popupRoom].name}</div>
        ) : rank < 3 ? (
          <button class="btn" disabled>Locked · {RANKS[3].name}</button>
        ) : vacant.length === 0 ? (
          <div class="muted">No vacant stores yet. Give it time. This mall is dying.</div>
        ) : (
          vacant.map(({ i }) => (
            <button class="btn" disabled={s.cash < POPUP_COST} onClick={() => {
              const err = openPopup(s, i);
              if (err) toast(err, 'bad');
              refresh();
            }}>
              Open in old {LAYOUT.rooms[i].name} (${POPUP_COST})
            </button>
          ))
        )}
      </div>
      <div class="biz">
        <h4>
          <Icon name="art.gary" /> Gary
        </h4>
        <p>{s.gary.recruited ? 'Gary is one of us.' : s.gary.insider ? 'Gary is your man on the inside.' : `Goodwill ${Math.round(s.gary.affinity)}/100. Leave him Cinnabombs at night.`}</p>
        {!s.gary.recruited && !s.gary.insider && <Bar value={s.gary.affinity} color="linear-gradient(90deg,#ffb000,#ff4fa3)" />}
      </div>
    </div>
  );
}

const JOB_GROUPS = (shift: 'day' | 'night') => JOBS.filter((j) => j.id === 'rest' || j.shift === shift || j.shift === 'both');

export function CrewPanel({ s }: { s: GameState }) {
  const beds = getDerived(s).beds.reduce((a, b) => a + b.slots, 0);
  const shortBeds = s.crew.length > beds;
  return (
    <div class="crewpanel panel">
      <div class="panel-head">
        <span>The Rats · {s.crew.length}</span>
        <small class={shortBeds ? 'warn' : ''} title={shortBeds ? 'Not enough beds for everyone. Build more in the Living tab.' : undefined}>
          {beds} {beds === 1 ? 'BED' : 'BEDS'}
          {shortBeds ? ' · NEED MORE' : ''}
        </small>
      </div>
      <div class="crew-list">
        {s.crew.map((c) => (
          <CrewCard s={s} c={c} expanded={app.crewExpanded === c.id} />
        ))}
      </div>
    </div>
  );
}

function JobSelect({ s, c, shift }: { s: GameState; c: Crew; shift: 'day' | 'night' }) {
  const value = shift === 'day' ? c.dayJob : c.nightJob;
  const rank = rankOf(s);
  const blocked = value !== 'rest' ? jobBlocked(s, c, value) : null;
  return (
    <label class={`jobsel ${shift}`}>
      <span>{shift === 'day' ? 'DAY JOB' : 'NIGHT JOB'}</span>
      <select
        value={value}
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value as JobId;
          if (shift === 'day') c.dayJob = v;
          else c.nightJob = v;
          c.waitUntil = 0;
          audio.play('click');
          refresh();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {JOB_GROUPS(shift).map((j) => (
          <option value={j.id} disabled={rank < j.rank}>
            {j.name}
            {rank < j.rank ? ` (locked: ${RANKS[j.rank].name})` : j.risk !== 'none' ? ` · ${j.risk} risk` : ''}
          </option>
        ))}
      </select>
      {blocked && <em class="warn">{blocked}</em>}
    </label>
  );
}

function CrewCard({ s, c, expanded }: { s: GameState; c: Crew; expanded: boolean }) {
  const away = c.state === 'away';
  const where = away ? (c.awayUntil === Infinity ? 'In custody' : `In county until ${formatDate(dayOf(c.awayUntil))}`) : c.layer === 0 ? 'In the mall' : 'In the ceiling';
  const job = currentJob(s, c);
  const selected = app.view.selectedCrew === c.id;
  return (
    <div
      class={`crew ${selected ? 'sel' : ''} ${away ? 'away' : ''} ${c.state === 'fleeing' ? 'fleeing' : ''}`}
      onClick={() => {
        app.view.selectedCrew = c.id;
        app.crewExpanded = expanded ? null : c.id;
        refresh();
      }}
    >
      <div class="crew-top">
        <Portrait look={c.look} sprite={crewSprite(c.archetype)} size={40} bg={c.layer === 0 ? '#3a1a2a' : '#1a2040'} />
        <div class="crew-id">
          <div class="crew-name">
            {c.name} <small>{c.title}</small>
          </div>
          <div class="crew-thought">
            <span class={c.layer === 0 ? 'in-mall' : ''}>{where}</span> · {c.thought}
          </div>
          <div class="crew-bars">
            <Bar value={c.energy} color={c.energy < 25 ? '#ec5b3c' : '#5ccfc2'} label="NRG" title={`Energy ${Math.round(c.energy)}`} />
            <Bar value={c.hunger} color={c.hunger < 25 ? '#ec5b3c' : '#ffc93e'} label="FED" title={`Fed ${Math.round(c.hunger)}`} />
            <Bar value={c.morale} color={c.morale < 25 ? '#ec5b3c' : '#ff6db3'} label="MOOD" title={`Morale ${Math.round(c.morale)}`} />
          </div>
        </div>
        {c.detect > 0.05 && c.layer === 0 && <div class="detect" style={{ '--d': `${Math.min(1, c.detect) * 360}deg` } as Record<string, string>} />}
      </div>
      {!away && (
        <div class="crew-jobs" onClick={(e) => e.stopPropagation()}>
          <JobSelect s={s} c={c} shift="day" />
          <JobSelect s={s} c={c} shift="night" />
        </div>
      )}
      {expanded && !away && (
        <div class="crew-detail" onClick={(e) => e.stopPropagation()}>
          <div class="statline">
            <span>
              STEALTH <Dots n={c.stealth} color="#5ccfc2" />
            </span>
            <span>
              CHARM <Dots n={c.charm} color="#ff6db3" />
            </span>
            <span>
              HANDY <Dots n={c.handy} color="#ffc93e" />
            </span>
          </div>
          {c.traits.length > 0 && (
            <div class="traits">
              {c.traits.map((t) => (
                <i class={`trait ${TRAITS[t].good ? 'good' : 'bad'}`} title={TRAITS[t].desc}>
                  {TRAITS[t].name}
                </i>
              ))}
            </div>
          )}
          <div class="bio">"{c.bio}"</div>
          <Bar value={c.familiarity} color="#ff2d55" label="Recognized by mall cop" title="Day jobs build recognition with Officer Dana. At 100% they get banned from day jobs for 3 days." />
          {c.bannedUntil > s.time && <div class="warn">Laying low from day jobs until {formatDate(dayOf(c.bannedUntil))}</div>}
          <div class="row">
            <button class="btn small" onClick={() => ((app.view.layer = c.layer), app.renderer?.centerOn(c.x, c.y), refresh())}>
              Find<kbd>F</kbd>
            </button>
            {c.layer === 0 && (
              <button class="btn small danger" onClick={() => (recallCrew(s, c), refresh())} title="Send them back up the ladder">
                Recall
              </button>
            )}
            <span class="muted">Job: {JOB[job].name} · earned {money(c.earned)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LogPanel({ s }: { s: GameState }) {
  const entries = s.log.slice(-(app.logOpen ? 9 : 2)).reverse();
  return (
    <div class={`logpanel panel ${app.logOpen ? '' : 'mini'}`}>
      <div class="panel-head" onClick={() => ((app.logOpen = !app.logOpen), refresh())} title={app.logOpen ? 'Show less' : 'Show more'}>
        <span>
          <Icon name="pager" size={16} /> PA & Pager
        </span>
        <small>{app.logOpen ? 'LESS ▴' : 'MORE ▾'}</small>
      </div>
      <div class="log">
        {entries.map((l) => (
          <div
            class={`entry ${l.kind} ${l.focus ? 'has-focus' : ''}`}
            title={l.focus ? 'Click to look' : undefined}
            onClick={() => {
              if (l.focus) focusTile(l.focus.x, l.focus.y, l.focus.layer);
              refresh();
            }}
          >
            <time>{formatClock(l.t)}</time>
            {l.kind === 'pa' && <b class="pa">PA</b>}
            {l.kind === 'phone' && <b class="phone">{l.from}</b>}
            <span>{l.text}</span>
            {l.focus && <i class="go">LOOK</i>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ObjectiveCard({ s }: { s: GameState }) {
  const o = OBJECTIVES[s.objective];
  if (!o) return null;
  const prog = objectiveProgress(s);
  const open = app.objectiveOpen;
  return (
    <div class={`objective ${open ? '' : 'min'}`} onClick={() => ((app.objectiveOpen = !open), refresh())} title={open ? 'Click to minimize' : 'Click for details'}>
      <div class="obj-label">
        <span>
          TO-DO · {s.objective + 1}/{OBJECTIVES.length}
        </span>
        <span>{open ? 'HIDE ▴' : 'HINT ▾'}</span>
      </div>
      <div class="obj-text">
        <i class="obj-check" /> {o.text} {prog && <b>{prog}</b>}
      </div>
      {open && <div class="obj-hint">{o.hint}</div>}
    </div>
  );
}

export function BottomBar({ s }: { s: GameState }) {
  const overlays = [
    { id: 'none', label: 'Plain' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'noise', label: 'Noise' },
    { id: 'smell', label: 'Smell' },
    { id: 'power', label: 'Power' },
  ] as const;
  const night = phaseAt(s.time) === 'night';
  const inMall = s.crew.filter((c) => c.layer === 0 && c.state !== 'away').length;
  return (
    <div class="bottombar panel">
      <div class="layer-switch" title="Switch view (Tab)">
        <button class={`btn ${app.view.layer === 1 ? 'on' : 'ghost'}`} onClick={() => ((app.view.layer = 1), audio.play('climb'), refresh())}>
          Ceiling
        </button>
        <button class={`btn ${app.view.layer === 0 ? 'on' : 'ghost'}`} onClick={() => ((app.view.layer = 0), audio.play('climb'), refresh())}>
          Mall {inMall > 0 && <i class="badge" title={`${inMall} rat${inMall === 1 ? '' : 's'} down in the mall`}>{inMall}</i>}
        </button>
      </div>
      <div class="overlays" title="Cycle overlays (O)">
        <span class="label">
          VIEW<kbd>O</kbd>
        </span>
        {overlays.map((o) => (
          <button
            class={`chip ${app.view.overlay === o.id ? 'on' : ''}`}
            onClick={() => {
              app.view.overlay = o.id;
              if (o.id !== 'none') app.view.layer = 1;
              refresh();
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {app.view.build ? (
        <div class="hint active">
          Placing {BUILD[app.view.build].name}. {app.view.build === 'deck' || app.view.build === 'foam' ? 'Drag to lay many. ' : ''}
          <span>
            <kbd>RMB</kbd>/<kbd>Esc</kbd> stop
          </span>
        </div>
      ) : app.view.demolish ? (
        <div class="hint active">
          Click or drag to remove (60% refund).
          <span>
            <kbd>RMB</kbd>/<kbd>Esc</kbd> stop
          </span>
        </div>
      ) : (
        <div class="hint">
          <span>
            <kbd>Tab</kbd>view
          </span>
          <span>
            <kbd>RMB</kbd>pan
          </span>
          <span>
            <kbd>Alt</kbd>x-ray
          </span>
          <span>
            <kbd>H</kbd>hatch
          </span>
          {night && <span class="warn">Night: watch the flashlights</span>}
        </div>
      )}
    </div>
  );
}

export function Tooltip({ s }: { s: GameState }) {
  const h = app.view.hover;
  const sc = app.hoverScreen;
  if (!h || !sc || !inBounds(h.x, h.y) || app.view.dragStart) return null;
  const ri = LAYOUT.roomAt[idx(h.x, h.y)];
  if (ri < 0) return null;
  const r = LAYOUT.rooms[ri];
  const rs = s.rooms[ri];
  const d = getDerived(s);
  const obj = d.objAt.get(idx(h.x, h.y));
  const ck = LAYOUT.ceilingKind[idx(h.x, h.y)];
  const lines: string[] = [];
  if (app.view.layer === 1) {
    if (ck === C_DUCT) lines.push('HVAC duct: cannot build');
    else if (ck === C_AC) lines.push('Rooftop AC unit: cannot build');
    else if (ck === C_SKYLIGHT) lines.push('Skylight: everyone below would see you');
    else if (ck === C_NONE) lines.push(r.kind === 'anchor' ? 'Anchor store firewall: no access' : 'No ceiling access');
  }
  const cap = r.powerCap * POWER_MULT[s.difficulty];
  return (
    <div class="tooltip" style={{ left: (sc.x + 18) / app.uiScale, top: (sc.y + 18) / app.uiScale }}>
      <div class="tt-head">
        {app.view.layer === 1 ? 'Above ' : ''}
        <b>{rs.popup ? popupName(s) : r.name}</b>
        {rs.vacant && !rs.popup && <i class="muted"> · vacant</i>}
      </div>
      {r.blurb && <div class="tt-blurb">{r.blurb}</div>}
      {r.ceiling && !rs.vacant && (
        <div class="tt-grid">
          <span>Noise cover</span>
          <b>{Math.round(r.noiseMask * 100)}%</b>
          <span>Smell cover</span>
          <b>{Math.round(r.smellMask * 100)}%</b>
          <span>Staff sensitivity</span>
          <b>{r.sensitivity >= 1.3 ? 'Very high' : r.sensitivity >= 0.9 ? 'High' : r.sensitivity >= 0.55 ? 'Normal' : 'Low'}</b>
          <span>Complaints</span>
          <b class={rs.complaint > 60 ? 'bad' : ''}>{Math.round(rs.complaint)}%</b>
          <span>Power bill (week)</span>
          <b class={rs.power > cap ? 'bad' : ''}>
            {rs.power.toFixed(1)} / {cap.toFixed(0)} kWh
          </b>
        </div>
      )}
      {app.view.layer === 1 && noiseField[idx(h.x, h.y)] > 0.05 && (
        <div class="tt-line">
          <i class="tag noise">NOISE</i> {noiseField[idx(h.x, h.y)].toFixed(1)} here
        </div>
      )}
      {app.view.layer === 1 && s.smell[idx(h.x, h.y)] > 1 && (
        <div class="tt-line">
          <i class="tag smell">SMELL</i> {s.smell[idx(h.x, h.y)].toFixed(0)} here
        </div>
      )}
      {lines.map((l) => (
        <div class="tt-line warn">{l}</div>
      ))}
      {obj && app.view.layer === 1 && (
        <div class="tt-line">
          <b>{BUILD[obj.type].name}</b> {BUILD[obj.type].power ? obj.powered ? <span class="good">· powered</span> : <span class="bad">· no power</span> : ''}
          {BUILD[obj.type].supply ? ` · ${obj.supplyLoad}/${BUILD[obj.type].supply}W` : ''}
          {obj.type === 'pc' ? ` · Wi-Fi ${Math.round(boundariesSignal(obj.x, obj.y) * 100)}%` : ''}
        </div>
      )}
    </div>
  );
}

export function SelectedObject({ s }: { s: GameState }) {
  if (app.selectedObj === null) return null;
  const o = s.objects.find((x) => x.id === app.selectedObj);
  if (!o) return null;
  const def = BUILD[o.type];
  const room = LAYOUT.rooms[LAYOUT.roomAt[idx(o.x, o.y)]];
  return (
    <div class="selobj panel">
      <div class="panel-head">
        <span>{def.name}</span>
        <button class="btn small ghost icon-btn" onClick={() => ((app.selectedObj = null), refresh())} title="Close (Esc)">
          ×
        </button>
      </div>
      <div class="selobj-body">
        <BuildIcon type={o.type} size={56} />
        <div>
          <div>{def.desc}</div>
          <div class="muted">Above {room.name}</div>
          {def.power && <div class={o.powered ? 'good' : 'bad'}>{o.powered ? 'Powered' : 'Unpowered: build a Power Splice within range'}</div>}
          {def.supply && <div>Load: {o.supplyLoad}/{def.supply}W {def.offGrid ? '(off-grid)' : `· billed to ${o.tapRoom >= 0 ? LAYOUT.rooms[o.tapRoom].name : 'nobody (dead)'}`}</div>}
          <div class="flavor">"{def.flavor}"</div>
          <button
            class="btn small danger"
            onClick={() => {
              demolishAt(s, o.x, o.y);
              app.selectedObj = null;
              audio.play('demolish');
              refresh();
            }}
          >
            Remove (+${Math.floor(def.cost * 0.6)})
          </button>
        </div>
      </div>
    </div>
  );
}

const ART = new Set(['intro', 'news', 'caught', 'gary', 'feast', 'wallet']);

export function ModalView({ s }: { s: GameState }) {
  const m = s.modals[0];
  if (!m) return null;
  return (
    <div class="modal-wrap">
      <div class="modal panel">
        <div class={`modal-art art-${m.art ?? 'none'}`}>
          {m.art === 'recruit' && s.candidate ? <Portrait look={s.candidate.look} sprite={crewSprite(s.candidate.archetype)} size={96} bg="#48298a" /> : <Icon name={`art.${ART.has(m.art ?? '') ? m.art : 'pager'}`} size={128} />}
        </div>
        <h2>{m.title}</h2>
        <div class="modal-body">
          {m.body.split('\n').map((p) => (p ? <p>{p}</p> : <br />))}
        </div>
        <div class="modal-choices">
          {m.choices.map((c) => (
            <button
              class="btn big"
              disabled={!!c.disabled}
              title={c.disabled ?? c.hint}
              onClick={() => {
                audio.start();
                audio.play('click');
                resolveModal(s, m.id, c.action);
                refresh();
              }}
            >
              {c.label}
              {c.disabled && <small>{c.disabled}</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const now = performance.now();
  app.toasts = app.toasts.filter((t) => t.until > now);
  return (
    <div class="toasts">
      {app.toasts.map((t) => (
        <div class={`toast ${t.tone}`} key={t.id}>
          {t.tone === 'achievement' && <Icon name="trophy" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function GameOver({ s, onMenu, onNew }: { s: GameState; onMenu: () => void; onNew: () => void }) {
  const o = s.over!;
  const max = Math.max(50, ...s.dailyIncome);
  return (
    <div class="modal-wrap over">
      <div class={`modal panel gameover ${o.won ? 'won' : 'lost'}`}>
        <h1>{o.title}</h1>
        <div class="modal-body">
          {o.text.split('\n').map((p) => (p ? <p>{p}</p> : <br />))}
        </div>
        <div class="chart">
          {s.dailyIncome.map((v) => (
            <i style={{ height: `${(v / max) * 100}%` }} title={`$${v}`} />
          ))}
        </div>
        <div class="stats-grid">
          <span>Days survived</span>
          <b>{dayOf(s.time) + 1}</b>
          <span>Total earned</span>
          <b>{money(s.totalEarned)}</b>
          <span>Peak crew</span>
          <b>{s.stats.peakCrew}</b>
          <span>Fountain wishes fished</span>
          <b>{money(s.stats.fountainCash)}</b>
          <span>Goods crafted / eBay sold</span>
          <b>
            {s.stats.goodsCrafted} / {s.stats.ebaySold}
          </b>
          <span>Inspections survived</span>
          <b>{s.stats.inspections}</b>
          <span>Raccoons blamed</span>
          <b>{s.stats.raccoons}</b>
          <span>Times spotted / caught</span>
          <b>
            {s.stats.spotted} / {s.stats.caught}
          </b>
          <span>Stores that closed</span>
          <b>{s.stats.storesClosed}</b>
        </div>
        {s.achievements.length > 0 && (
          <div class="achievements">
            {s.achievements.map((a) => (
              <i title={ACHIEVEMENTS[a]?.desc}>
                <Icon name="trophy" size={16} /> {ACHIEVEMENTS[a]?.name}
              </i>
            ))}
          </div>
        )}
        <div class="modal-choices">
          <button class="btn big" onClick={onNew}>
            New Game
          </button>
          <button class="btn big" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
