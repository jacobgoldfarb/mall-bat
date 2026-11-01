import { useEffect, useState } from 'preact/hooks';
import { app, refresh, subscribe } from '../app';
import { audio } from '../audio/audio';
import { clearSave, hasSave, loadGame, newGame, saveGame } from '../game/create';
import { ACHIEVEMENTS } from '../game/ops';
import type { Difficulty, GameState } from '../game/state';
import { LAYOUT } from '../game/layout';
import { Icon } from './icons';
import { BottomBar, BuildPanel, CrewPanel, GameOver, LogPanel, ModalView, ObjectiveCard, SelectedObject, Toasts, Tooltip, TopBar } from './hud';

export function startGame(s: GameState) {
  app.state = s;
  app.screen = 'game';
  app.menu = 'none';
  app.paused = false;
  app.speed = 1;
  app.view.layer = 1;
  app.view.build = null;
  app.view.demolish = false;
  app.view.selectedCrew = s.crew[0]?.id ?? null;
  app.crewExpanded = s.crew[0]?.id ?? null;
  app.renderer!.cam.zoom = 1.25;
  app.renderer!.centerOn(LAYOUT.hatch.x + 4, LAYOUT.hatch.y + 3);
  refresh();
}

function quitToTitle() {
  if (app.state && !app.state.over) saveGame(app.state);
  app.screen = 'title';
  app.state = null;
  app.menu = 'none';
  refresh();
}

export function App() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const un = subscribe(() => setTick((t) => t + 1));
    const id = setInterval(() => setTick((t) => t + 1), 150);
    return () => {
      un();
      clearInterval(id);
    };
  }, []);

  if (app.screen === 'title') return <Title />;
  const s = app.state!;
  return (
    <div class="hud">
      <TopBar s={s} />
      <div class="center-stack">
        <ObjectiveCard s={s} />
        {app.paused && !s.modals.length && app.menu === 'none' && (
          <div class="paused-banner">
            PAUSED<kbd>Space</kbd>
          </div>
        )}
      </div>
      <BuildPanel s={s} />
      <CrewPanel s={s} />
      <LogPanel s={s} />
      <BottomBar s={s} />
      <SelectedObject s={s} />
      {!app.view.dragStart && app.menu === 'none' && !s.modals.length && <Tooltip s={s} />}
      <Toasts />
      {!s.over && <ModalView s={s} />}
      {s.over && (
        <GameOver
          s={s}
          onMenu={() => {
            clearSave();
            quitToTitle();
          }}
          onNew={() => {
            clearSave();
            app.state = null;
            app.screen = 'title';
            app.menu = 'newgame';
            refresh();
          }}
        />
      )}
      {app.menu === 'pause' && <PauseMenu s={s} />}
      {app.menu === 'settings' && <Settings />}
      {app.menu === 'help' && <Help />}
    </div>
  );
}

function Title() {
  const save = hasSave();
  return (
    <div class="title-screen">
      <div class="vapor-grid" />
      <div class="title-card">
        <div class="title-sub">GALLERIA POINTE · FALL 2004</div>
        <h1 class="title-logo">
          DROP<br />
          CEILING
        </h1>
        <div class="title-tag">A mall squatter tycoon. Build a kingdom in the ceiling. Don't get caught.</div>
        <div class="title-buttons">
          {save && (
            <button
              class="btn big"
              onClick={() => {
                audio.start();
                const s = loadGame();
                if (s) startGame(s);
              }}
            >
              Continue
            </button>
          )}
          <button
            class="btn big"
            onClick={() => {
              audio.start();
              app.menu = 'newgame';
              refresh();
            }}
          >
            New Game
          </button>
          <button class="btn big" onClick={() => ((app.menu = 'help'), refresh())}>
            How to Play
          </button>
          <button class="btn big" onClick={() => ((app.menu = 'settings'), refresh())}>
            Settings
          </button>
          {window.desktop && (
            <button class="btn big" onClick={() => window.desktop!.quit()}>
              Quit
            </button>
          )}
        </div>
        <div class="title-foot">♪ now playing: muzak_final_FINAL(2).mid</div>
      </div>
      {app.menu === 'newgame' && <NewGame />}
      {app.menu === 'settings' && <Settings />}
      {app.menu === 'help' && <Help />}
    </div>
  );
}

function NewGame() {
  const [name, setName] = useState('Jace');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const diffs: { id: Difficulty; name: string; desc: string }[] = [
    { id: 'easy', name: 'Mall Rat', desc: 'Lazier guards, cheaper auction, forgiving alert.' },
    { id: 'normal', name: 'Squatter', desc: 'The intended experience.' },
    { id: 'hard', name: 'Dead Mall', desc: 'Sharp-eyed guards, stingy power bills, a hungry developer.' },
  ];
  return (
    <div class="modal-wrap">
      <div class="modal panel newgame">
        <h2>Who are you?</h2>
        <label class="field">
          <span>Your name</span>
          <input value={name} maxLength={14} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        </label>
        <div class="diffs">
          {diffs.map((d) => (
            <button class={`diff ${diff === d.id ? 'on' : ''}`} onClick={() => setDiff(d.id)}>
              <b>{d.name}</b>
              <small>{d.desc}</small>
            </button>
          ))}
        </div>
        <div class="modal-choices">
          <button
            class="btn big"
            onClick={() => {
              clearSave();
              startGame(newGame(name.trim() || 'Jace', diff));
            }}
          >
            Find the ladder
          </button>
          <button class="btn big" onClick={() => ((app.menu = 'none'), refresh())}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function PauseMenu({ s }: { s: GameState }) {
  return (
    <div class="modal-wrap">
      <div class="modal panel pause">
        <h2>Paused</h2>
        <div class="title-buttons">
          <button class="btn big" onClick={() => ((app.menu = 'none'), refresh())}>
            Resume
          </button>
          <button
            class="btn big"
            onClick={() => {
              saveGame(s);
              app.menu = 'none';
              app.toasts.push({ id: Date.now(), text: 'Game saved', tone: 'good', until: performance.now() + 2000 });
              refresh();
            }}
          >
            Save
          </button>
          <button class="btn big" onClick={() => ((app.menu = 'help'), refresh())}>
            How to Play
          </button>
          <button class="btn big" onClick={() => ((app.menu = 'settings'), refresh())}>
            Settings
          </button>
          <button class="btn big" onClick={quitToTitle}>
            Save & Quit to Title
          </button>
          {window.desktop && (
            <button
              class="btn big"
              onClick={() => {
                saveGame(s);
                window.desktop!.quit();
              }}
            >
              Save & Quit Game
            </button>
          )}
        </div>
        {s.achievements.length > 0 && (
          <div class="achievements">
            {Object.entries(ACHIEVEMENTS).map(([id, a]) => (
              <i class={s.achievements.includes(id) ? '' : 'locked'} title={a.desc}>
                <Icon name="trophy" size={16} /> {a.name}
              </i>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Settings() {
  const v = audio.volume;
  const slider = (label: string, key: keyof typeof v) => (
    <label class="field">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={v[key]}
        onInput={(e) => {
          v[key] = Number((e.target as HTMLInputElement).value);
          audio.applyVolume();
          localStorage.setItem('dropceiling.audio', JSON.stringify(v));
          refresh();
        }}
      />
    </label>
  );
  return (
    <div class="modal-wrap">
      <div class="modal panel settings">
        <h2>Settings</h2>
        {slider('Master volume', 'master')}
        {slider('Muzak', 'music')}
        {slider('Sound effects', 'sfx')}
        <label class="field check">
          <input
            type="checkbox"
            checked={app.autoPause}
            onChange={(e) => {
              app.autoPause = (e.target as HTMLInputElement).checked;
              localStorage.setItem('dropceiling.autopause', app.autoPause ? '1' : '0');
              refresh();
            }}
          />
          <span>Auto-pause when an inspection is scheduled</span>
        </label>
        {window.desktop && (
          <button class="btn" onClick={() => window.desktop!.toggleFullscreen()}>
            Toggle fullscreen
          </button>
        )}
        <div class="modal-choices">
          <button class="btn big" onClick={() => ((app.menu = app.screen === 'game' ? 'pause' : 'none'), refresh())}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Help() {
  return (
    <div class="modal-wrap">
      <div class="modal panel help">
        <h2>How to Squat a Mall</h2>
        <div class="help-grid">
          <section>
            <h4>
              <Icon name="art.intro" /> The Ceiling
            </h4>
            <p>Your kingdom lives above the drop ceiling. Lay <b>plywood decks</b> out from the ladder hatch in the Service Corridor, then furnish. Press <b>Tab</b> to switch between the Ceiling and the Mall.</p>
          </section>
          <section>
            <h4>
              <Icon name="leisure" /> What's Below Matters
            </h4>
            <p>Every store has <b>noise cover</b> and <b>smell cover</b>. Your TV is fine above the screaming Fun Zone arcade and a disaster above Boundaries Books. Cook above Cinnabomb. Use the <b>Complaints</b>, <b>Noise</b>, and <b>Smell</b> overlays.</p>
          </section>
          <section>
            <h4>
              <Icon name="art.gary" /> Inspections
            </h4>
            <p>When a store's complaints hit 100%, someone checks its ceiling the next morning. The red zone shows where. Clear it out, or plant a <b>Decoy Raccoon</b>. Anything they find raises the Alert.</p>
          </section>
          <section>
            <h4>
              <Icon name="power" /> Power Bills
            </h4>
            <p>Power Splices steal from the store below. Every Monday at 8 AM the bills get reviewed, and a greedy splice gets an electrician. Spread your load. Vacant stores have no power.</p>
          </section>
          <section>
            <h4>
              <Icon name="work" /> Jobs
            </h4>
            <p>Give each rat a <b>Day</b> and <b>Night</b> job. Day jobs blend into the crowd but build recognition with the mall cop. Night jobs pay better but Gary, the cameras, and the janitors are watching. <b>Rope Drops</b> are escape hatches.</p>
          </section>
          <section>
            <h4>
              <Icon name="alert" /> Alert
            </h4>
            <p>Sightings, catches, and discoveries raise the Mall Alert. Higher levels bring more cameras, a second guard, and a dog. At <b>100%</b> they sweep the ceiling and you're evicted. It cools down when you lay low.</p>
          </section>
          <section>
            <h4>
              <Icon name="cash" /> The Goal
            </h4>
            <p>Galleria Pointe goes to auction on <b>Dec 31, 2004</b>. Have more <b>cash</b> than the developer bids. As stores close, the mall dies and the bid drops.</p>
          </section>
          <section>
            <h4>Controls</h4>
            <p>Right-drag or WASD to pan · Wheel to zoom · Space to pause · 1/2/3 for speed · B Build · X Remove · O cycle overlays · Alt for x-ray · H go to the hatch · Esc for the menu</p>
          </section>
        </div>
        <div class="modal-choices">
          <button class="btn big" onClick={() => ((app.menu = app.screen === 'game' ? 'pause' : 'none'), refresh())}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
