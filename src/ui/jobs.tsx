import { useState } from 'preact/hooks';
import { app, refresh } from '../app';
import { audio } from '../audio/audio';
import { currentJob, jobBlocked, shiftNow } from '../game/crew';
import { JOB, JOBS, RANKS, type JobDef, type JobId } from '../game/defs';
import { jobEstimate } from '../game/jobs';
import { rankOf } from '../game/ops';
import type { Crew, GameState } from '../game/state';
import { CLOSING_SPAN, dayOf, formatClock, mallHours } from '../game/time';
import { crewSprite } from '../render/renderer';
import { Bar, Dots, Portrait } from './widgets';

type Shift = 'day' | 'night';

const RISK_TEXT: Record<JobDef['risk'], string> = { none: 'Safe', low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
const STAT_COLOR = { stealth: '#5ccfc2', charm: '#ff6db3', handy: '#ffc93e' };
const STATS = ['stealth', 'charm', 'handy'] as const;

let draggedCrew: number | null = null;

const jobOf = (c: Crew, shift: Shift) => (shift === 'day' ? c.dayJob : c.nightJob);

function setJob(c: Crew, shift: Shift, job: JobId) {
  if (shift === 'day') c.dayJob = job;
  else c.nightJob = job;
  c.waitUntil = 0;
  c.jobCooldown = {};
  audio.play('click');
  refresh();
}

function setFillIn(crew: Crew[], fillIn: boolean) {
  for (const c of crew) c.fillIn = fillIn;
  audio.play('click');
  refresh();
}

export function openJobs(crewId: number | null, shift?: Shift) {
  app.jobsCrew = crewId;
  if (shift) app.jobsShift = shift;
  app.menu = 'jobs';
  refresh();
}

function shiftHours(s: GameState, shift: Shift): string {
  const hours = mallHours(dayOf(s.time));
  if (!hours) return 'Mall closed today: night rules all day';
  return shift === 'day' ? `While the mall is open · ${formatClock(hours.open)}–${formatClock(hours.close)}` : `After closing · ${formatClock(hours.close + CLOSING_SPAN)}–6:00 AM`;
}

function shiftJobs(shift: Shift): JobDef[] {
  return JOBS.filter((j) => j.id !== 'rest' && (j.shift === shift || j.shift === 'both'));
}

export function JobsMenu({ s }: { s: GameState }) {
  const crew = s.crew.filter((c) => c.state !== 'away');
  const selected = crew.find((x) => x.id === app.jobsCrew) ?? null;
  const shift = app.jobsShift;
  const rank = rankOf(s);
  const jobs = shiftJobs(shift);
  const open = jobs.filter((j) => rank >= j.rank);
  const locked = jobs.filter((j) => rank < j.rank);
  const close = () => ((app.menu = 'none'), (draggedCrew = null), refresh());
  return (
    <div class="modal-wrap" onClick={close}>
      <div class="modal panel jobs-menu" onClick={(e) => e.stopPropagation()}>
        <div class="jobs-title">
          <h2>Job Board</h2>
          <div class="shift-tabs">
            {(['day', 'night'] as const).map((sh) => (
              <button class={`shift-tab ${sh} ${shift === sh ? 'on' : ''}`} onClick={() => ((app.jobsShift = sh), audio.play('click'), refresh())}>
                <b>{sh === 'day' ? 'Day shift' : 'Night shift'}</b>
                <small>{shiftHours(s, sh)}</small>
              </button>
            ))}
          </div>
          <button class="btn small ghost" onClick={close}>
            Done<kbd>J</kbd>
          </button>
        </div>
        <p class="jobs-explain">
          <b>Drag a Bat onto a job</b>, or click a Bat and then a job. Each Bat works one job per shift. If their job runs dry or they get spotted, they either <b>rest</b> or <b>fill in</b> on a safe job (only ceiling work at night), your call. Click a Bat on a job to send them back to rest.
        </p>
        <CrewTray s={s} crew={crew} selected={selected} shift={shift} />
        <div class="staff-grid">
          {open.map((def) => (
            <StaffCard s={s} def={def} crew={crew} selected={selected} shift={shift} />
          ))}
        </div>
        {locked.length > 0 && (
          <div class="locked-row">
            {locked.map((def) => (
              <span title={def.desc}>
                {def.name} <i>· {RANKS[def.rank].name}</i>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CrewTray({ s, crew, selected, shift }: { s: GameState; crew: Crew[]; selected: Crew | null; shift: Shift }) {
  const resting = crew.filter((c) => jobOf(c, shift) === 'rest').length;
  return (
    <div class="crew-tray">
      <div class="tray-head">
        <span class="tray-label">{resting ? `THE BATS · ${resting} RESTING` : 'THE BATS'}</span>
        <span class="tray-label">WHEN A JOB IS UNAVAILABLE, EVERYONE:</span>
        <button class={`btn small ${crew.every((c) => !c.fillIn) ? 'on' : 'ghost'}`} onClick={() => setFillIn(crew, false)}>
          Rests
        </button>
        <button class={`btn small ${crew.every((c) => c.fillIn) ? 'on' : 'ghost'}`} onClick={() => setFillIn(crew, true)}>
          Fills in
        </button>
      </div>
      <div class="tray-chips">
        {crew.map((c) => {
          const job = jobOf(c, shift);
          const live = shiftNow(s) === shift ? currentJob(s, c) : null;
          return (
            <div
              class={`bat-chip ${selected === c ? 'on' : ''} ${job === 'rest' ? 'idle' : ''}`}
              draggable
              onDragStart={(e) => {
                draggedCrew = c.id;
                e.dataTransfer?.setData('text/plain', String(c.id));
              }}
              onDragEnd={() => ((draggedCrew = null), refresh())}
              onClick={() => ((app.jobsCrew = selected === c ? null : c.id), audio.play('click'), refresh())}
            >
              <Portrait look={c.look} sprite={crewSprite(c.archetype)} size={32} bg={c.layer === 0 ? '#3a1a2a' : '#1a2040'} />
              <div class="chip-body">
                <b>{c.name}</b>
                <small>
                  {JOB[job].name}
                  {live && live !== job && live !== 'rest' && <span class="now"> → {JOB[live].name}</span>}
                </small>
                <div class="chip-stats">
                  {STATS.map((st) => (
                    <span title={st}>
                      {st[0].toUpperCase()}
                      <Dots n={c[st]} color={STAT_COLOR[st]} />
                    </span>
                  ))}
                </div>
                <Bar value={c.energy} color={c.energy < 25 ? '#ec5b3c' : '#5ccfc2'} />
              </div>
              <button
                class={`fill-toggle ${c.fillIn ? 'on' : ''}`}
                title={c.fillIn ? 'If their job is unavailable, they take the best safe job. Click to make them rest instead.' : 'If their job is unavailable, they rest. Click to let them fill in on the best safe job.'}
                onClick={(e) => (e.stopPropagation(), setFillIn([c], !c.fillIn))}
              >
                {c.fillIn ? 'Fills in' : 'Rests'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaffCard({ s, def, crew, selected, shift }: { s: GameState; def: JobDef; crew: Crew[]; selected: Crew | null; shift: Shift }) {
  const [over, setOver] = useState(false);
  const staff = crew.filter((c) => jobOf(c, shift) === def.id);
  const preview = selected ?? staff[0] ?? crew[0];
  const e = preview ? jobEstimate(s, preview, def.id) : null;
  const blocked = preview ? jobBlocked(s, preview, def.id) : null;
  const canAdd = selected && jobOf(selected, shift) !== def.id;
  return (
    <div
      class={`staff-card risk-${def.risk} ${over ? 'over' : ''} ${blocked ? 'blocked' : ''} ${canAdd ? 'can-add' : ''}`}
      onDragOver={(ev) => (ev.preventDefault(), over || setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setOver(false);
        const c = crew.find((x) => x.id === draggedCrew);
        if (c) setJob(c, shift, def.id);
        draggedCrew = null;
      }}
      onClick={() => selected && canAdd && setJob(selected, shift, def.id)}
      title={def.desc}
    >
      <div class="jc-head">
        <b>{def.name}</b>
        <i class={`risk ${def.risk}`}>{RISK_TEXT[def.risk]}</i>
      </div>
      {preview && e && (
        <div class="jc-yield">
          {e.yields}
          {selected && <small> with {selected.name}</small>}
        </div>
      )}
      <div class="jc-meta">
        <span>
          USES {def.stat.toUpperCase()} {preview && <Dots n={preview[def.stat]} color={STAT_COLOR[def.stat]} />}
        </span>
        <span>{e?.walk === null ? 'No route yet' : `${e?.walk} min walk`}</span>
      </div>
      {e?.limit && <div class="jc-limit">{e.limit}</div>}
      {blocked && <div class="jc-blocked">Right now: {blocked}</div>}
      <div class="slots">
        {staff.map((c) => (
          <button
            class="slot-chip"
            draggable
            onDragStart={(ev) => {
              ev.stopPropagation();
              draggedCrew = c.id;
              ev.dataTransfer?.setData('text/plain', String(c.id));
            }}
            onDragEnd={() => ((draggedCrew = null), refresh())}
            onClick={(ev) => (ev.stopPropagation(), setJob(c, shift, 'rest'))}
            title={`Click to send ${c.name} back to rest.`}
          >
            <Portrait look={c.look} sprite={crewSprite(c.archetype)} size={22} />
            <span>{c.name}</span>
          </button>
        ))}
        {staff.length === 0 && <span class="slot-empty">{selected ? `Click to assign ${selected.name}` : 'Drop a Bat here'}</span>}
        {staff.length > 0 && canAdd && <span class="slot-empty">+ {selected!.name}</span>}
      </div>
    </div>
  );
}
