# Space Roguelike Card Game – Roadmap

**Prototype snapshot:** The HTML/JS build already includes a full run shell—start screen, ship select, sector maps with travel/fuel, shops and docks, elite/planet/distress nodes, gate-locked boss contracts, card rewards, and combat tooltips/audio hooks. Phases below note **done (prototype)** vs **in progress** vs **not yet** relative to that build.

---

## Phase 0 – Foundation

**Status:** Done (prototype).

Goal: Prove the core combat loop is fun.

Tasks:
- Player hand system working
- Energy spending works
- Enemy intent system works
- Win / Lose state works
- Basic deployed ships OR direct attack cards

Success Condition:
Player can complete a single fight and feel tension + decision making.

---

## Phase 1 – Encounter Flow

**Status:** Done (prototype).

Goal: Make fights feel like part of a run.

Tasks:
- Encounter loader system
- Enemy group spawning
- Victory screen
- Reward choice (pick 1 of 3 cards)
- Next encounter button

Success Condition:
Player can complete multiple encounters in sequence.

_Note: Reward picks are weighted (often 2–3 choices early run); flow uses overlays and map return._

---

## Phase 2 – Run Progression

**Status:** Done (prototype).

Goal: Introduce identity and scaling.

Tasks:
- Reactor upgrade option
- Weapons upgrade option
- Shields upgrade option
- Upgrade UI between fights
- Visual stat scaling

Success Condition:
Player feels stronger in later encounters.

_Note: Reactor / Weapons / Shields bonuses exist in combat UI; shops and rewards feed the triangle._

---

## Phase 3 – Encounter Variety

**Status:** In progress (breadth in; depth TBD).

Goal: Reduce repetition.

Tasks:
- Environmental encounter (example: mining extraction)
- Elite enemy encounter
- Status effects or hazard mechanics
- Basic event screen

Success Condition:
Runs feel dynamic.

_Note: Elite nodes, planet/dock/distress routes, ambush/contract variants, and keyword/status combat exist; extraction and events are still rough._

---

## Phase 4 – Boss Fight

**Status:** Done (prototype) for a sector boss beat; **in progress** for spectacle depth.

Goal: Create climax.

Tasks:
- Multi-phase boss
- Unique boss mechanic
- Boss reward

Success Condition:
Run has emotional payoff.

_Note: Gate unlock → boss contract → per-sector boss with rewards is in; multi-phase design and stronger bespoke mechanics are future depth._

---

## Phase 5 – Run Structure

**Status:** Done (prototype).

Goal: Full roguelike feel.

Tasks:
- Node map or encounter tree
- Shops or repair nodes
- Run start screen
- Run reset

Success Condition:
Complete playable run exists.

_Note: Multi-sector progression, fuel travel, ship select, and run restart through the existing flow._

---

## Phase 6 – Polish & Identity

**Status:** In progress.

Goal: Make game feel real.

Tasks:
- Ship visual upgrades
- Sound feedback
- UI polish
- Art direction tests

Success Condition:
Game is presentable to players.

_Note: Tooltips, map tips, combo banner, mute, and start music are in; art pass and fuller audio/design cohesion remain._
