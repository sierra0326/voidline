We are building a single-player PvE space roguelike card game inspired by Slay the Spire and FTL.

This is NOT a PvP TCG.

## Design decisions (locked)

- Tactical turn-based combat with small cycling hand (3–5 cards)
- Cards resolve instantly when played
- Energy is the primary resource
- Hybrid card system (reusable system cards + powerful one-shot cards)

## Run structure

- Player progresses through encounters (combat + environmental + events)
- Sector bosses required
- Runs reset fully after completion

## Power progression (during run only)

Upgrade triangle:
- Reactor = more energy
- Weapons = more damage
- Shields = survivability

## Movement

- No free flight simulation
- Warp/node illusion travel between encounters

## Emotional arc

Early survival → mid specialization → late power fantasy.

---

## Where the prototype is now

The current **Stellar Run** HTML/CSS/JS build already includes: start screen, ship selection, sector-based node map (fuel, shops, docks, elites, planets, distress), gate/boss contract flow, combat with rewards and stat scaling, tooltips and basic audio (e.g. start theme + mute). Iteration should extend this foundation—not replace it.

**Active focus (typical):** deepen variety (Phase 3), boss spectacle (Phase 4), and presentation (Phase 6)—see `ROADMAP.md`.

---

## Idea backlog (not committed)

- Card presentation tiers: common, green, blue, purple, orange legendary
- Very rare drops
- Meta reward idea: after many successful runs, a title or perk that guarantees a legendary drop in a run

Do NOT redesign the whole game. Iterate step-by-step within the roadmap.
