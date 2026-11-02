# Mall Bats Backlog

Lift estimates assume implementation by a flagship LLM with repository access:

- **S** — focused copy, UI, or logic change
- **M** — several connected files or a modest new mechanic
- **L** — cross-cutting system, substantial UI, or new art pipeline work
- **XL** — foundational redesign with broad testing and content needs

Impact describes the expected improvement to player experience: **Critical**, **High**, **Medium**, or **Low**.

## P0 — Fix First

- [x] **Fix black floor textures and the associated slowdown** — **Lift: M · Impact: Critical**
      Add the missing `floor.black` art selection, then stop store-state changes from rebaking the entire isometric map when only a limited area changed.

- [x] **Freeze all character and effect animation while paused** — **Lift: S · Impact: High**
      Pause the render animation clock as well as simulation time so Bats and NPCs do not appear to keep moving.

- [x] **Rename the game to Mall Bats and the mall to Northgate** — **Lift: S · Impact: High**
      Update player-facing titles, packaging metadata, dialogue, help, achievements, and mall signage. Preserve save compatibility and stable internal identifiers.

- [x] **Rename the human crew from “rats” to “the Bats”** — **Lift: S · Impact: High**
      Apply the nickname consistently across UI, dialogue, tutorials, difficulty text, and flavor copy without changing the cast into literal bats.

## P1 — Core Gameplay

- [x] **Make security flashlight cones respect physical cover** — **Lift: M · Impact: High**
      Clip rendered cones against walls, closed doors, and tall fixtures, and ensure detection uses the same visibility result so shadows are dependable cover.

- [x] **Turn job assignment into a strategic per-shift priority system** — **Lift: L · Impact: High**
      Let each Bat queue 2–3 Day and Night jobs. When the first choice is blocked, unsafe, depleted, or unavailable, automatically try the next. Show estimated yield per hour, risk, governing stat, requirements, travel time, and the reason a job is blocked. Existing Stealth, Charm, and Handy stats determine performance; do not add job XP.

- [x] **Replace individual Food and Mood with collective base resources** — **Lift: L · Impact: High**
      Keep Energy per Bat because rest is individually assigned. Make Food and Mood shared, actionable pressures with clear sources, sinks, thresholds, and consequences. Remove or migrate individual hunger and morale behavior without making the crew feel interchangeable.

- [x] **Replace raccoon micromanagement with reusable inspection countermeasures** — **Lift: L · Impact: High**
      Add a prepared countermeasure loadout such as cleanup, decoys, false access signs, and concealed storage. Resolve inspections automatically from preparation, evidence, and suspicion instead of repeatedly placing disposable raccoons.

- [x] ~~**Add concealed compartments built from cinderblock walls and steel doors**~~ — removed after playtest; walls and doors are gone.

- [x] **Make progression and stealth consequences legible in the HUD** — **Lift: S · Impact: High**
      Explain that Rank increases from lifetime earnings, global Alert cools each day and faster after a clean night, and 100% Alert causes eviction. Clearly distinguish global Alert from a Bat’s mall-cop familiarity and resulting three-day Day-job ban.

## P2 — Strong Improvements

- [x] **Rotate player-placed furniture and buildables** — **Lift: M · Impact: High**
      Add orientation to placed objects, placement controls, footprints, save migration, and interaction directions. Limit the first pass to player furniture and use visual rotation only where suitable sprite variants exist.

- [x] **Add a risky passive-income racket** — **Lift: M · Impact: Medium**
      Add a covert mall racket such as a vending skim, arcade siphon, or Wi-Fi resale device. It should earn unattended cash while creating a visible detection, complaint, power, or maintenance tradeoff. Differentiate it from the existing PC, which passively sells supplied goods, and the existing pop-up income.

- [x] **Make PA & Pager history scrollable** — **Lift: S · Impact: Medium**
      Expose the stored log history in a bounded, scrollable panel, retain the compact collapsed view, and keep new messages easy to find.

- [x] **Replace the rotated standing pose with dedicated sleeping art** — **Lift: M · Impact: Medium**
      Add a readable sleeping sprite or occupied-bed presentation that matches each bed type and the isometric camera.

- [x] **Explain object capacity and route utility at the point of use** — **Lift: S · Impact: Medium**
      State that each powered Workbench supports one simultaneous Tinker worker, so additional benches increase parallel throughput. Explain that Rope Drops are alternate floor/ceiling routes that speed jobs and escapes but increase complaints and inspection risk.

- [x] **Make low-food consequences explicit during the collective-needs redesign** — **Lift: S · Impact: Medium**
      Surface consumption rate, days remaining, automatic emergency food spending, and the productivity or Energy consequences of running out.

## P3 — World, Tone, and Polish

- [ ] **Use the secret-mall-apartment story as tonal and narrative inspiration** — **Lift: M · Impact: High**
      Emphasize covert domesticity, improvised architecture, found family, and escalating discovery risk through events, environmental storytelling, and progression. Keep Northgate fictional rather than directly adapting real people.

- [ ] **Fill out sparse stores with store-specific fixtures and clutter** — **Lift: M · Impact: Medium**
      Give bare stores distinct displays, back-room details, signage, and period-appropriate merchandise while preserving navigable stealth routes. Maybe one of the end stores should be a roller rink?

- [ ] **Add ambient decor and effect sprites** — **Lift: M · Impact: Medium**
      Prioritize effects that communicate simulation state: flickering fluorescents, dust, leaking pipes, humming equipment, smell/noise cues, security activity, and seasonal mall decor.

- [x] **Satisfying effect when getting resources** - **Lift: S • Impact: Small**
      When resources are added or spent (money, food, parts, goods, mood) there should be a little effect in the menu bar that shows the incremental increase, then sort of fades away. You can imagine what I'm talking about -- it's a common pattern.

- [x] **Investigate: posting bail, but bat still remains in county** — bail now returns the Bat in 8 hours

## Playtest feedback (Nov 1)

- [x] Stretched graphic in the selected-item panel
- [x] Parts are a build cost for electrical and work gear (Tinker turns leftovers into goods)
- [x] Remove the cinderblock wall and steel door
- [x] Replace Silkscreen with VT323 for labels (8 and 2 were hard to read)
- [x] Selecting a power item shows the power view
- [x] Noise and smell are heat maps with a legend; complaints view removed
- [x] One job per shift, higher daily limits, per-Bat rest/fill-in fallback, stats on the Job Board
- [x] Day shift tab first
- [x] Decoy raccoons are single use

## Keep As-Is

- Objectives can remain specific and linear for now.

## Deferred

- [ ] **Manual walking mode for Gary** — **Lift: L · Impact: Low**
- [ ] **Direct control of a Bat and custom path drawing** — **Lift: XL · Impact: Low**

These conflict with the tycoon-scale assignment loop and should only be reconsidered after the autonomous job and stealth systems are proven.
