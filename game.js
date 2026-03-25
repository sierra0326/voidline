console.log("game.js loaded");

const state = {
  player: null,
  enemies: [],
  selectedEnemyUid: null,
  runDeck: [],
  drawPile: [],
  discardPile: [],
  exhaustPile: [],
  hand: [],
  turn: 1,
  runCredits: 0,
  nextAttackBonus: 0,
  attacksPlayedThisTurn: 0,
  pendingExtraction: false,
  combatEnded: false,
  encounterIndex: 0,
  encounterTier: "easy",
  runWon: false,
  rewardChoices: [],
  pendingReward: false
};

const SHIP_NAME = "Bounty Hunter";
const SHIP_PASSIVE_TEXT = "Gain credits after each encounter win.";
const BASE_CREDIT_REWARD = 10;
const CREDIT_REWARD_STEP = 5;

const RUN_LENGTH = 5;

const TIER_MULTIPLIER = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.4
};

function getAllowedTiersForEncounter(encounterIndex) {
  switch (encounterIndex) {
    case 0:
      return ["easy"];
    case 1:
      return ["easy", "medium"];
    case 2:
      return ["medium"];
    case 3:
      return ["medium", "hard"];
    default:
      return ["hard"];
  }
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatIntentText(type, amount) {
  return type === "attack" ? `Attack for ${amount}` : `Will gain ${amount} block`;
}

const SYSTEM_CARDS = [
  {
    id: "pulse-shot",
    name: "Pulse Shot",
    type: "system",
    cost: 1,
    description: "Deal 2 damage.",
    effect() {
      dealAttackDamageToEnemy(2, "Pulse Shot");
    }
  },
  {
    id: "brace",
    name: "Brace",
    type: "system",
    cost: 1,
    description: "Gain 4 block.",
    effect() {
      gainPlayerBlock(4 + state.player.shieldBonus, "Brace");
    }
  },
  {
    id: "patch-hull",
    name: "Patch Hull",
    type: "system",
    cost: 1,
    description: "Decommissioned. No effect.",
    effect() {
      log("Patch Hull is decommissioned and has no effect.", "system");
    }
  },
  {
    id: "overcharge-cannon",
    name: "Overcharge Cannon",
    type: "system",
    cost: 1,
    description: "Deal 4 damage.",
    effect() {
      dealAttackDamageToEnemy(4, "Overcharge Cannon");
    }
  },
  {
    id: "reinforce-shields",
    name: "Reinforce Shields",
    type: "system",
    cost: 1,
    description: "Gain 4 block.",
    effect() {
      gainPlayerBlock(4 + state.player.shieldBonus, "Reinforce Shields");
    }
  },
  {
    id: "capacitor-burst",
    name: "Capacitor Burst",
    type: "system",
    cost: 0,
    description: "Gain 1 energy.",
    effect() {
      state.player.energy += 1;
      log("Capacitor Burst grants 1 energy.", "system");
    }
  },
  {
    id: "finishing-shot",
    name: "Finishing Shot",
    type: "system",
    cost: 2,
    description: "Deal 8 damage. If enemy is below half hull, deal 12 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const belowHalfHull = enemy.hull < enemy.maxHull / 2;
      const baseDamage = belowHalfHull ? 12 : 8;
      dealAttackDamageToEnemy(baseDamage, "Finishing Shot");
    }
  },
  {
    id: "target-lock",
    name: "Target Lock",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. Your next attack this turn deals +3 damage.",
    effect() {
      dealAttackDamageToEnemy(3, "Target Lock");
      state.nextAttackBonus += 3;
      log("Target Lock primes your next attack for +3 damage this turn.", "system");
    }
  },
  {
    id: "collection-sweep",
    name: "Collection Sweep",
    type: "system",
    cost: 1,
    description: "Gain 5 block and deal 3 damage.",
    effect() {
      gainPlayerBlock(5 + state.player.shieldBonus, "Collection Sweep");
      dealAttackDamageToEnemy(3, "Collection Sweep");
    }
  },
  {
    id: "tactical-scan",
    name: "Tactical Scan",
    type: "system",
    cost: 1,
    description: "Draw 2 cards.",
    effect() {
      drawCards(2);
    }
  },
  {
    id: "evasive-burst",
    name: "Evasive Burst",
    type: "system",
    cost: 1,
    description: "Gain 4 block. Draw 1 card.",
    effect() {
      gainPlayerBlock(4 + state.player.shieldBonus, "Evasive Burst");
      drawCards(1);
    }
  },
  {
    id: "deep-cache",
    name: "Deep Cache",
    type: "system",
    cost: 1,
    description: "Draw 3 cards. Exhaust.",
    exhaust: true,
    effect() {
      drawCards(3);
    }
  },
  {
    id: "reroute-power",
    name: "Reroute Power",
    type: "system",
    cost: 1,
    description: "Gain 1 energy. Draw 1 card.",
    effect() {
      state.player.energy += 1;
      drawCards(1);
      log("Reroute Power grants 1 energy.", "system");
    }
  },
  {
    id: "overclock-drive",
    name: "Overclock Drive",
    type: "system",
    cost: 1,
    description: "Gain 2 energy.",
    effect() {
      state.player.energy += 2;
      log("Overclock Drive grants 2 energy.", "system");
    }
  },
  {
    id: "covering-fire",
    name: "Covering Fire",
    type: "system",
    cost: 1,
    description: "Reduce the enemy's next attack by 2. Draw 1 card.",
    effect() {
      const enemy = getSelectedEnemy();
      if (enemy) enemy.attackReduction = (enemy.attackReduction || 0) + 2;
      drawCards(1);
      log("Covering Fire reduces the enemy's next attack by 2.", "system");
    }
  },
  {
    id: "skirmish-step",
    name: "Skirmish Step",
    type: "system",
    cost: 1,
    description: "Gain 6 block and deal 2 damage.",
    effect() {
      gainPlayerBlock(6 + state.player.shieldBonus, "Skirmish Step");
      dealAttackDamageToEnemy(2, "Skirmish Step");
    }
  },
  {
    id: "pressure-shot",
    name: "Pressure Shot",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. If you've played an attack this turn, deal 6 instead.",
    effect() {
      const baseDamage = state.attacksPlayedThisTurn > 0 ? 6 : 3;
      dealAttackDamageToEnemy(baseDamage, "Pressure Shot");
    }
  },
  {
    id: "opportunist-strike",
    name: "Opportunist Strike",
    type: "system",
    cost: 1,
    description: "Deal 4 damage. If enemy has block, deal 8 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const baseDamage = enemy.block > 0 ? 8 : 4;
      dealAttackDamageToEnemy(baseDamage, "Opportunist Strike");
    }
  },
  {
    id: "execution-barrage",
    name: "Execution Barrage",
    type: "system",
    cost: 2,
    description: "Deal 6 damage. If you've played an attack this turn, deal 10 instead.",
    effect() {
      const baseDamage = state.attacksPlayedThisTurn > 0 ? 10 : 6;
      dealAttackDamageToEnemy(baseDamage, "Execution Barrage");
    }
  },
  {
    id: "hunters-tag",
    name: "Hunter's Tag",
    type: "system",
    cost: 1,
    description: "Deal 2 damage. Apply Mark.",
    effect() {
      dealAttackDamageToEnemy(2, "Hunter's Tag");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      log("Mark applied — enemy is Marked.", "system");
    }
  },
  {
    id: "paint-the-target",
    name: "Paint the Target",
    type: "system",
    cost: 0,
    description: "Apply Mark. Draw 1 card.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      drawCards(1);
      log("Mark applied — enemy is Marked.", "system");
    }
  },
  {
    id: "pursuit-sweep",
    name: "Pursuit Sweep",
    type: "system",
    cost: 1,
    description: "Gain 3 block. Apply Mark.",
    effect() {
      gainPlayerBlock(3 + state.player.shieldBonus, "Pursuit Sweep");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      log("Mark applied — enemy is Marked.", "system");
    }
  },
  {
    id: "claim-shot",
    name: "Claim Shot",
    type: "system",
    cost: 1,
    description: "Deal 4 damage. If Marked, deal 8 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const baseDamage = enemy.isMarked ? 8 : 4;
      dealAttackDamageToEnemy(baseDamage, "Claim Shot");
    }
  },
  {
    id: "bounty-collection",
    name: "Bounty Collection",
    type: "system",
    cost: 2,
    description: "Deal 7 damage. If Marked, gain 1 energy.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      dealAttackDamageToEnemy(7, "Bounty Collection");
      if (enemy.isMarked) {
        state.player.energy += 1;
        log("Bounty Collection grants 1 energy on a Marked target.", "system");
      }
    }
  },
  {
    id: "dead-or-alive",
    name: "Dead or Alive",
    type: "system",
    cost: 2,
    description: "Deal 6 damage. If Marked, gain 6 block and deal 9 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      if (enemy.isMarked) {
        gainPlayerBlock(6 + state.player.shieldBonus, "Dead or Alive");
        dealAttackDamageToEnemy(9, "Dead or Alive");
      } else {
        dealAttackDamageToEnemy(6, "Dead or Alive");
      }
    }
  },
  {
    id: "tracking-burst",
    name: "Tracking Burst",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. If enemy is not Marked, apply Mark.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      dealAttackDamageToEnemy(3, "Tracking Burst");
      if (!enemy.isMarked) {
        enemy.isMarked = true;
        log("Mark applied — enemy is Marked.", "system");
      }
    }
  },
  {
    id: "signal-flare",
    name: "Signal Flare",
    type: "system",
    cost: 1,
    description: "Apply Mark. Gain 1 energy.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      state.player.energy += 1;
      log("Mark applied — enemy is Marked.", "system");
      log("Signal Flare grants 1 energy.", "system");
    }
  },
  {
    id: "glint-strike",
    name: "Glint Strike",
    type: "system",
    cost: 1,
    description: "Deal 1 damage. Apply Mark.",
    effect() {
      dealAttackDamageToEnemy(1, "Glint Strike");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      log("Mark applied — enemy is Marked.", "system");
    }
  },
  {
    id: "hard-lock",
    name: "Hard Lock",
    type: "system",
    cost: 2,
    description: "Apply Mark. Draw 2 cards.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.isMarked = true;
      drawCards(2);
      log("Mark applied — enemy is Marked.", "system");
    }
  }
];

const MISSILE_CARDS = [
  {
    id: "missile",
    name: "Missile",
    type: "missile",
    cost: 2,
    description: "Deal 6 damage. Exhaust.",
    effect() {
      dealAttackDamageToEnemy(6, "Missile");
    }
  }
];

const ALL_CARDS = [...SYSTEM_CARDS, ...MISSILE_CARDS];

/** UI / archetype: weapon (damage), system (defense/draw/utility), tactical (setup / Mark / synergy) */
const CARD_ROLE_BY_ID = {
  "pulse-shot": "weapon",
  "overcharge-cannon": "weapon",
  "finishing-shot": "weapon",
  "pressure-shot": "weapon",
  "opportunist-strike": "weapon",
  "execution-barrage": "weapon",
  "claim-shot": "weapon",
  "bounty-collection": "weapon",
  "dead-or-alive": "weapon",
  missile: "weapon",
  brace: "system",
  "patch-hull": "system",
  "reinforce-shields": "system",
  "capacitor-burst": "system",
  "tactical-scan": "system",
  "evasive-burst": "system",
  "deep-cache": "system",
  "reroute-power": "system",
  "overclock-drive": "system",
  "covering-fire": "system",
  "skirmish-step": "system",
  "collection-sweep": "system",
  "target-lock": "tactical",
  "hunters-tag": "tactical",
  "paint-the-target": "tactical",
  "pursuit-sweep": "tactical",
  "tracking-burst": "tactical",
  "signal-flare": "tactical",
  "glint-strike": "tactical",
  "hard-lock": "tactical"
};

function getCardCategoryLabel(card) {
  const role = card.cardRole || "system";
  if (role === "weapon") return "Weapon";
  if (role === "tactical") return "Tactical";
  return "System";
}

const STARTING_DECK_IDS = [
  "pulse-shot",
  "pulse-shot",
  "pulse-shot",
  "brace",
  "brace",
  "brace",
  "missile",
  "missile"
];

const REWARD_POOL_IDS = [
  "pulse-shot",
  "brace",
  "missile",
  "overcharge-cannon",
  "reinforce-shields",
  "capacitor-burst",
  "finishing-shot",
  "target-lock",
  "collection-sweep",
  "tactical-scan",
  "evasive-burst",
  "deep-cache",
  "reroute-power",
  "overclock-drive",
  "covering-fire",
  "skirmish-step",
  "pressure-shot",
  "opportunist-strike",
  "execution-barrage",
  "hunters-tag",
  "paint-the-target",
  "pursuit-sweep",
  "claim-shot",
  "bounty-collection",
  "dead-or-alive",
  "tracking-burst",
  "signal-flare",
  "glint-strike",
  "hard-lock"
];

const ENEMY_TYPES = [
  {
    id: "scout",
    name: "Scout Drone",
    difficulty: "easy",
    maxHull: 10,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 2, text: "Attack for 2" },
        { type: "block", amount: 2, text: "Will gain 2 block" },
        { type: "attack", amount: 2, text: "Attack for 2" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "raider",
    name: "Raider Skiff",
    difficulty: "medium",
    maxHull: 15,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 4, text: "Attack for 4" },
        { type: "attack", amount: 4, text: "Attack for 4" },
        { type: "block", amount: 4, text: "Will gain 4 block" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "hunter",
    name: "Hunter Frigate",
    difficulty: "hard",
    maxHull: 22,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 6, text: "Attack for 6" },
        { type: "block", amount: 5, text: "Will gain 5 block" },
        { type: "attack", amount: 6, text: "Attack for 6" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "bulwark",
    name: "Bulwark Corvette",
    difficulty: "hard",
    maxHull: 30,
    getIntent(turn) {
      const cycle = [
        { type: "block", amount: 7, text: "Will gain 7 block" },
        { type: "attack", amount: 5, text: "Attack for 5" },
        { type: "block", amount: 7, text: "Will gain 7 block" },
        { type: "attack", amount: 5, text: "Attack for 5" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "interceptor",
    name: "Interceptor Ace",
    difficulty: "hard",
    maxHull: 18,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 8, text: "Attack for 8" },
        { type: "attack", amount: 8, text: "Attack for 8" },
        { type: "block", amount: 2, text: "Will gain 2 block" },
        { type: "attack", amount: 8, text: "Attack for 8" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "support-escort",
    name: "Support Escort",
    difficulty: "hard",
    maxHull: 16,
    getIntent(turn) {
      const cycle = [
        { type: "block", amount: 6, text: "Will gain 6 block" },
        { type: "block", amount: 6, text: "Will gain 6 block" },
        { type: "attack", amount: 4, text: "Attack for 4" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "burst-bounty",
    name: "Burst Bounty",
    difficulty: "hard",
    maxHull: 20,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 9, text: "Attack for 9" },
        { type: "attack", amount: 9, text: "Attack for 9" },
        { type: "block", amount: 2, text: "Will gain 2 block" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  }
];

const els = {
  restartBtn: document.getElementById("restartBtn"),
  redrawBtn: document.getElementById("redrawBtn"),
  endTurnBtn: document.getElementById("endTurnBtn"),

  playerHullText: document.getElementById("playerHullText"),
  playerHullBar: document.getElementById("playerHullBar"),
  playerBlockText: document.getElementById("playerBlockText"),
  playerEnergyText: document.getElementById("playerEnergyText"),
  playerWeaponsText: document.getElementById("playerWeaponsText"),
  playerShieldsText: document.getElementById("playerShieldsText"),
  playerReactorText: document.getElementById("playerReactorText"),
  shipNameText: document.getElementById("shipNameText"),
  shipPassiveText: document.getElementById("shipPassiveText"),
  creditsText: document.getElementById("creditsText"),

  drawCount: document.getElementById("drawCount"),
  discardCount: document.getElementById("discardCount"),
  exhaustCount: document.getElementById("exhaustCount"),

  enemies: document.getElementById("enemies"),
  encounterInfo: document.getElementById("encounterInfo"),

  hand: document.getElementById("hand"),
  log: document.getElementById("log"),

  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  overlayBtn: document.getElementById("overlayBtn"),
  rewardOptions: document.getElementById("rewardOptions")
};

function renderEnemies() {
  if (!els.enemies) return;
  els.enemies.innerHTML = "";

  state.enemies.forEach(enemy => {
    const isAlive = enemy.hull > 0;
    const isSelected = enemy.uid === state.selectedEnemyUid;
    const intentText =
      !state.combatEnded && isAlive && enemy.intent ? enemy.intent.text : isAlive ? "—" : "Destroyed";
    const intentDetail =
      !state.combatEnded && isAlive && enemy.intent
        ? getIntentDescription(enemy.intent)
        : isAlive
        ? "—"
        : `${enemy.name} has been eliminated.`;

    const roleBadge =
      enemy.role === "bounty"
        ? `<span class="badge bounty-badge">BOUNTY</span>`
        : `<span class="badge escort-badge">ESCORT</span>`;

    const markBadge = enemy.isMarked ? `<span class="badge mark-badge">MARKED</span>` : "";

    const card = document.createElement("div");
    card.className = `enemy-card ${isSelected ? "selected" : ""}`.trim();
    card.innerHTML = `
      <div class="enemy-head">
        <div>
          <div class="value">${enemy.name}</div>
          <div class="muted">${enemy.difficulty.toUpperCase()}</div>
        </div>
        <div class="enemy-badges">
          ${roleBadge}
          ${markBadge}
        </div>
      </div>

      <div class="enemy-mini-grid">
        <div class="enemy-mini">
          <div class="label">Hull</div>
          <div class="value">${enemy.hull} / ${enemy.maxHull}</div>
          <div class="bar">
            <div class="bar-fill enemy-fill" style="width: ${(enemy.hull / enemy.maxHull) * 100}%"></div>
          </div>
        </div>
        <div class="enemy-mini">
          <div class="label">Block</div>
          <div class="value">${enemy.block}</div>
        </div>
        <div class="enemy-mini">
          <div class="label">Mark</div>
          <div class="value">${enemy.isMarked ? "MARKED" : "CLEAR"}</div>
        </div>
        <div class="enemy-mini">
          <div class="label">Target</div>
          <button ${isAlive ? "" : "disabled"}>${isSelected ? "Targeted" : "Target"}</button>
        </div>
      </div>

      <div class="enemy-intent">
        <div class="label">Next Enemy Action</div>
        <div class="value">${intentText}</div>
        <div class="muted">${intentDetail}</div>
      </div>
    `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", () => selectEnemy(enemy.uid));

    els.enemies.appendChild(card);
  });
}

function makeCard(id) {
  const base = ALL_CARDS.find(card => card.id === id);
  if (!base) throw new Error(`Card not found: ${id}`);

  const cardRole = base.cardRole ?? CARD_ROLE_BY_ID[id] ?? "system";

  return {
    ...base,
    cardRole,
    uid: `${id}-${Math.random().toString(36).slice(2, 10)}`
  };
}

function makeStartingDeck() {
  return STARTING_DECK_IDS.map(id => makeCard(id));
}

function makeRunDeck() {
  return [...STARTING_DECK_IDS];
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function log(message, type = "") {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`.trim();
  entry.textContent = message;
  els.log.prepend(entry);
}

function getAliveEnemies() {
  return state.enemies.filter(e => e.hull > 0);
}

function getEnemyByUid(uid) {
  return state.enemies.find(e => e.uid === uid) || null;
}

function getDefaultTargetUid() {
  const alive = getAliveEnemies();
  const bounty = alive.find(e => e.role === "bounty");
  return (bounty || alive[0] || null)?.uid ?? null;
}

function getSelectedEnemy() {
  const selected = state.selectedEnemyUid ? getEnemyByUid(state.selectedEnemyUid) : null;
  if (selected && selected.hull > 0) return selected;
  const fallbackUid = getDefaultTargetUid();
  if (fallbackUid) state.selectedEnemyUid = fallbackUid;
  return fallbackUid ? getEnemyByUid(fallbackUid) : null;
}

function selectEnemy(uid) {
  const enemy = getEnemyByUid(uid);
  if (!enemy || enemy.hull <= 0) return;
  state.selectedEnemyUid = uid;
  render();
}

function getBountyTargets() {
  return state.enemies.filter(e => e.role === "bounty");
}

function allBountyTargetsDead() {
  const bounty = getBountyTargets();
  return bounty.length > 0 && bounty.every(e => e.hull <= 0);
}

function anyEscortAlive() {
  return state.enemies.some(e => e.role === "escort" && e.hull > 0);
}

function allEnemiesDead() {
  return state.enemies.length > 0 && state.enemies.every(e => e.hull <= 0);
}

function hideOverlay() {
  els.overlay.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.add("hidden");
  els.overlayBtn.classList.remove("hidden");
}

function showOverlay(title, text, buttonText, onClick) {
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlayBtn.textContent = buttonText;
  els.overlayBtn.classList.remove("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.add("hidden");
  els.overlay.classList.remove("hidden");
  els.overlayBtn.onclick = onClick;
}

function getEncounterTierLabel(index) {
  if (index === 0) return "Tier I - Scout skirmish";
  if (index === 1) return "Tier II - Raider assault";
  if (index === 2) return "Tier III - Bulwark duel";
  if (index === 3) return "Tier IV - Interceptor burst";
  return "Tier V - Hunter siege";
}

function awardEncounterCredits() {
  const amount = getCreditRewardForEncounter(state.encounterIndex);
  state.runCredits += amount;
  log(`Credits gained: +${amount}. Total credits: ${state.runCredits}.`, "system");
}

function buildRewardChoices() {
  const pool = shuffle(REWARD_POOL_IDS);
  return pool.slice(0, 3);
}

function getCreditRewardForEncounter(encounterIndex) {
  return BASE_CREDIT_REWARD + CREDIT_REWARD_STEP * encounterIndex;
}

function continueToNextEncounter() {
  state.pendingReward = false;
  state.pendingExtraction = false;
  state.rewardChoices = [];
  state.encounterIndex += 1;
  beginEncounter();
}

function chooseCreditsReward() {
  awardEncounterCredits();
  continueToNextEncounter();
}

function chooseCardReward() {
  showRewardOverlay();
}

function chooseReward(cardId) {
  state.runDeck.push(cardId);
  const card = ALL_CARDS.find(c => c.id === cardId);
  if (card) {
    log(`Reward chosen: ${card.name} added to your run deck.`, "system");
  }
  continueToNextEncounter();
}

function showRewardOverlay() {
  state.pendingReward = true;
  state.rewardChoices = buildRewardChoices();

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = `Choose 1 card reward before encounter ${state.encounterIndex + 2}.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  state.rewardChoices.forEach(cardId => {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (!card) return;

    const button = document.createElement("button");
    button.className = "reward-option";
    button.innerHTML = `
      <div class="reward-name">${card.name}</div>
      <div class="reward-meta">${getCardCategoryLabel(card)} • Cost ${card.cost} • ${card.description}</div>
    `;
    button.addEventListener("click", () => chooseReward(cardId));
    els.rewardOptions.appendChild(button);
  });
}

function showPostVictoryChoiceOverlay() {
  state.pendingReward = true;

  const creditReward = getCreditRewardForEncounter(state.encounterIndex);

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = "Choose your reward.";
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const cardBtn = document.createElement("button");
  cardBtn.className = "reward-option";
  cardBtn.innerHTML = `
    <div class="reward-name">Take Card Reward</div>
    <div class="reward-meta">Pick 1 of 3 cards to add to your deck.</div>
  `;
  cardBtn.addEventListener("click", chooseCardReward);

  const creditsBtn = document.createElement("button");
  creditsBtn.className = "reward-option";
  creditsBtn.innerHTML = `
    <div class="reward-name">Take Credits</div>
    <div class="reward-meta">Gain ${creditReward} credits and continue.</div>
  `;
  creditsBtn.addEventListener("click", chooseCreditsReward);

  els.rewardOptions.appendChild(cardBtn);
  els.rewardOptions.appendChild(creditsBtn);
}

function buildEnemyFromTemplate(template, role, tier) {
  const mult = TIER_MULTIPLIER[tier] ?? 1;
  const scaledMaxHull = Math.round(template.maxHull * mult);
  const baseGetIntent = template.getIntent;

  function scaledGetIntent(turn) {
    const base = baseGetIntent(turn);
    const scaledAmount = Math.max(0, Math.round(base.amount * mult));
    return {
      ...base,
      amount: scaledAmount,
      text: formatIntentText(base.type, scaledAmount)
    };
  }

  return {
    uid: `${template.id}-${Math.random().toString(36).slice(2, 10)}`,
    id: template.id,
    name: template.name,
    difficulty: tier,
    maxHull: scaledMaxHull,
    hull: scaledMaxHull,
    block: 0,
    isMarked: false,
    role,
    attackReduction: 0,
    getIntent: scaledGetIntent,
    intent: scaledGetIntent(1)
  };
}

function getEnemyTypeById(id) {
  return ENEMY_TYPES.find(e => e.id === id) || null;
}

const ENCOUNTER_TEMPLATES = [
  {
    id: "duel",
    tier: "easy",
    build(encounterIndex, tier) {
      const bounty = ENEMY_TYPES[Math.min(encounterIndex + 1, ENEMY_TYPES.length - 1)];
      return [buildEnemyFromTemplate(bounty, "bounty", tier)];
    }
  },
  {
    id: "protected",
    tier: "medium",
    build(encounterIndex, tier) {
      const bounty = ENEMY_TYPES[Math.min(encounterIndex + 2, ENEMY_TYPES.length - 1)];
      const escort = ENEMY_TYPES[0];
      return [buildEnemyFromTemplate(bounty, "bounty", tier), buildEnemyFromTemplate(escort, "escort", tier)];
    }
  },
  {
    id: "double",
    tier: "medium",
    build(encounterIndex, tier) {
      const bounty = ENEMY_TYPES[Math.min(encounterIndex + 1, ENEMY_TYPES.length - 1)];
      return [buildEnemyFromTemplate(bounty, "bounty", tier), buildEnemyFromTemplate(bounty, "bounty", tier)];
    }
  },
  {
    id: "protected-hard",
    tier: "hard",
    build(encounterIndex, tier) {
      const bounty = ENEMY_TYPES[Math.min(encounterIndex + 2, ENEMY_TYPES.length - 1)];
      const escort = getEnemyTypeById("support-escort") || ENEMY_TYPES[0];
      return [buildEnemyFromTemplate(bounty, "bounty", tier), buildEnemyFromTemplate(escort, "escort", tier)];
    }
  },
  {
    id: "double-hard",
    tier: "hard",
    build(encounterIndex, tier) {
      const steady = ENEMY_TYPES[Math.min(encounterIndex + 1, ENEMY_TYPES.length - 1)];
      const burst = getEnemyTypeById("burst-bounty") || steady;
      return [buildEnemyFromTemplate(burst, "bounty", tier), buildEnemyFromTemplate(steady, "bounty", tier)];
    }
  }
];

function getEncounterTemplatesForTier(tier) {
  if (tier === "easy") return ENCOUNTER_TEMPLATES.filter(t => t.id === "duel");
  if (tier === "medium") return ENCOUNTER_TEMPLATES.filter(t => t.id === "duel" || t.id === "protected" || t.id === "double");
  return ENCOUNTER_TEMPLATES.filter(t => t.id === "protected-hard" || t.id === "double-hard");
}

function getCurrentEncounterTemplate(tier) {
  const pool = getEncounterTemplatesForTier(tier);
  return pickRandom(pool);
}

function showExtractionOverlay() {
  state.pendingExtraction = true;
  state.pendingReward = true;

  els.overlayTitle.textContent = "Bounty Secured";
  els.overlayText.textContent =
    "All bounty targets are down. Extract now, or stay and finish the escorts.";
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const extractBtn = document.createElement("button");
  extractBtn.className = "reward-option";
  extractBtn.innerHTML = `
    <div class="reward-name">Extract Now</div>
    <div class="reward-meta">End encounter immediately. Escorts won't act.</div>
  `;
  extractBtn.addEventListener("click", () => {
    state.pendingExtraction = false;
    state.pendingReward = false;
    state.combatEnded = true;
    hideOverlay();
    render();
    handleCombatEnd();
  });

  const continueBtn = document.createElement("button");
  continueBtn.className = "reward-option";
  continueBtn.innerHTML = `
    <div class="reward-name">Finish the Escorts</div>
    <div class="reward-meta">Continue combat. Escorts will keep acting.</div>
  `;
  continueBtn.addEventListener("click", () => {
    state.pendingExtraction = false;
    state.pendingReward = false;
    hideOverlay();
    render();
  });

  els.rewardOptions.appendChild(extractBtn);
  els.rewardOptions.appendChild(continueBtn);
}

function beginEncounter() {
  const allowed = getAllowedTiersForEncounter(state.encounterIndex);
  const tier = pickRandom(allowed);
  state.encounterTier = tier;

  const template = getCurrentEncounterTemplate(tier);
  state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
  state.selectedEnemyUid = getDefaultTargetUid();
  state.drawPile = shuffle(state.runDeck.map(id => makeCard(id)));
  state.discardPile = [];
  state.exhaustPile = [];
  state.hand = [];
  state.turn = 1;
  state.combatEnded = false;
  state.runWon = false;
  state.pendingReward = false;
  state.pendingExtraction = false;
  state.rewardChoices = [];

  state.player.block = 0;
  state.nextAttackBonus = 0;
  state.attacksPlayedThisTurn = 0;
  state.player.energy = state.player.baseEnergy + state.player.reactorBonus;

  hideOverlay();

  log(`Encounter ${state.encounterIndex + 1} begins (${tier.toUpperCase()}).`, "enemy");

  drawCards(5);
  updateEnemyIntent();
  render();
}

function startRun() {
  state.player = {
    maxHull: 50,
    hull: 50,
    block: 0,
    baseEnergy: 3,
    energy: 3,
    weaponBonus: 0,
    shieldBonus: 0,
    reactorBonus: 0
  };

  state.runDeck = makeRunDeck();
  state.runCredits = 0;
  state.nextAttackBonus = 0;
  state.attacksPlayedThisTurn = 0;
  state.pendingExtraction = false;
  state.encounterIndex = 0;
  state.rewardChoices = [];
  state.pendingReward = false;
  els.log.innerHTML = "";
  beginEncounter();
}

function gainPlayerBlock(amount, sourceName) {
  state.player.block += amount;
  log(`${sourceName} grants ${amount} block.`, "system");
}

function gainEnemyBlock(amount, sourceName) {
  const enemy = state.enemies.find(e => e.name === sourceName && e.hull > 0) || state.enemies[0];
  if (!enemy) return;
  enemy.block += amount;
  log(`${sourceName} gains ${amount} block.`, "enemy");
}

function repairPlayerHull(amount, sourceName) {
  const before = state.player.hull;
  state.player.hull = Math.min(state.player.maxHull, state.player.hull + amount);
  const repaired = state.player.hull - before;
  log(`${sourceName} repairs ${repaired} hull.`, "system");
}

function dealAttackDamageToEnemy(baseAmount, sourceName) {
  const bonus = state.nextAttackBonus;
  const total = baseAmount + state.player.weaponBonus + bonus;
  dealDamageToEnemy(total, sourceName);
  state.attacksPlayedThisTurn += 1;
  if (bonus > 0) {
    log(`Attack bonus consumed: +${bonus} damage.`, "system");
    state.nextAttackBonus = 0;
  }
}

function dealDamageToEnemy(amount, sourceName) {
  const enemy = getSelectedEnemy();
  if (!enemy) return;

  const blocked = Math.min(enemy.block, amount);
  const hpDamage = amount - blocked;

  enemy.block -= blocked;
  enemy.hull = Math.max(0, enemy.hull - hpDamage);

  if (blocked > 0 && hpDamage > 0) {
    log(`${sourceName} hits for ${amount}. Enemy blocks ${blocked} and takes ${hpDamage}.`);
  } else if (blocked >= amount) {
    log(`${sourceName} hits for ${amount}, but enemy blocks it all.`);
  } else {
    log(`${sourceName} deals ${hpDamage} damage.`, sourceName === "Missile" ? "missile" : "");
  }

  if (enemy.hull <= 0) {
    log(`${enemy.name} is destroyed.`, "system");
  }

  if (!state.combatEnded && allBountyTargetsDead() && anyEscortAlive() && !state.pendingExtraction) {
    showExtractionOverlay();
    return;
  }

  if (allEnemiesDead()) {
    state.combatEnded = true;
    if (state.encounterIndex >= RUN_LENGTH - 1) {
      state.runWon = true;
      log("All targets eliminated. Run complete.", "system");
    } else {
      log("Encounter cleared.", "system");
    }
  }
}

function dealDamageToPlayer(amount, sourceName) {
  const blocked = Math.min(state.player.block, amount);
  const hpDamage = amount - blocked;

  state.player.block -= blocked;
  state.player.hull = Math.max(0, state.player.hull - hpDamage);

  if (blocked > 0 && hpDamage > 0) {
    log(`${sourceName} hits for ${amount}. You block ${blocked} and take ${hpDamage}.`, "enemy");
  } else if (blocked >= amount) {
    log(`${sourceName} hits for ${amount}, but you block it all.`, "enemy");
  } else {
    log(`${sourceName} deals ${hpDamage} damage to you.`, "enemy");
  }

  if (state.player.hull <= 0) {
    state.combatEnded = true;
    log("Your ship is destroyed. Run failed.", "enemy");
  }
}

function drawCards(amount) {
  for (let i = 0; i < amount; i += 1) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) return;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      log("Discard pile reshuffled into draw pile.");
    }

    const nextCard = state.drawPile.shift();
    if (nextCard) state.hand.push(nextCard);
  }
}

function discardHand() {
  state.discardPile.push(...state.hand);
  state.hand = [];
}

function removeCardFromHand(uid) {
  const index = state.hand.findIndex(card => card.uid === uid);
  if (index === -1) return null;
  return state.hand.splice(index, 1)[0];
}

function updateEnemyIntent() {
  if (state.combatEnded) return;
  state.enemies.forEach(enemy => {
    if (enemy.hull <= 0) return;
    enemy.intent = enemy.getIntent(state.turn);
  });
}

function getIntentDescription(intent) {
  switch (intent.type) {
    case "attack":
      return `Enemy will attack for ${intent.amount}.`;
    case "block":
      return `Enemy will gain ${intent.amount} block on its turn.`;
    default:
      return "Unknown enemy maneuver.";
  }
}

function playCard(uid) {
  if (state.combatEnded || state.pendingReward || state.pendingExtraction) return;

  const card = state.hand.find(c => c.uid === uid);
  if (!card) return;
  if (card.cost > state.player.energy) return;

  state.player.energy -= card.cost;

  const removed = removeCardFromHand(uid);
  if (!removed) return;

  removed.effect();

  if (removed.exhaust || removed.type === "missile" || removed.type === "torpedo") {
    state.exhaustPile.push(removed);
    log(`${removed.name} is exhausted.`, removed.type);
  } else {
    state.discardPile.push(removed);
  }

  render();

  if (state.combatEnded) {
    handleCombatEnd();
  }
}

function resolveEnemyTurn() {
  if (state.combatEnded) return;
  const alive = getAliveEnemies();
  alive.forEach(enemy => {
    const intent = enemy.intent;
    if (!intent) return;

    switch (intent.type) {
      case "attack": {
        const reduction = enemy.attackReduction || 0;
        const finalAmount = Math.max(0, intent.amount - reduction);
        if (reduction > 0) {
          log(`${enemy.name}'s attack reduced by ${reduction}.`, "system");
        }
        dealDamageToPlayer(finalAmount, enemy.name);
        break;
      }

      case "block":
        gainEnemyBlock(intent.amount, enemy.name);
        break;
    }

    enemy.attackReduction = 0;
  });

  alive.forEach(enemy => {
    if (enemy.isMarked) {
      log(`Mark clears from ${enemy.name} at end of enemy turn.`, "enemy");
    }
    enemy.isMarked = false;
  });
}

function endTurn() {
  if (state.combatEnded || state.pendingReward || state.pendingExtraction) return;

  discardHand();
  log("You end your turn.");

  // Enemy block expires at the start of enemy turn
  state.enemies.forEach(enemy => {
    enemy.block = 0;
  });

  resolveEnemyTurn();

  if (state.combatEnded) {
    render();
    handleCombatEnd();
    return;
  }

  state.turn += 1;

  // Player block expires at the start of the new player turn
  state.player.block = 0;
  state.nextAttackBonus = 0;
  state.attacksPlayedThisTurn = 0;

  state.player.energy = state.player.baseEnergy + state.player.reactorBonus;

  updateEnemyIntent();
  drawCards(5);
  render();
}

function redrawHand() {
  if (state.combatEnded || state.pendingReward || state.pendingExtraction) return;

  if (state.player.energy < 1) {
    log("You need 1 energy to redraw.", "system");
    return;
  }

  state.player.energy -= 1;
  discardHand();
  drawCards(5);
  log("You spend 1 energy to redraw your hand.", "system");
  render();
}

function handleCombatEnd() {
  if (state.player.hull <= 0) {
    showOverlay(
      "Run Failed",
      "Your ship was destroyed. Restart and try again.",
      "Restart Run",
      () => startRun()
    );
    return;
  }

  if (state.runWon) {
    showOverlay(
      "Run Complete",
      "You cleared easy, medium, and hard.",
      "Restart Run",
      () => startRun()
    );
    return;
  }

  showPostVictoryChoiceOverlay();
}

function renderHand() {
  els.hand.innerHTML = "";

  if (state.hand.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card disabled";
    empty.innerHTML = `
      <div class="card-top">
        <div class="card-title">No Cards</div>
        <div class="cost">—</div>
      </div>
      <div class="card-type">Status</div>
      <div class="card-text">End turn or redraw to continue.</div>
      <button disabled>Waiting</button>
    `;
    els.hand.appendChild(empty);
    return;
  }

  state.hand.forEach(card => {
    const canPlay = !state.combatEnded && card.cost <= state.player.energy;

    const cardEl = document.createElement("div");
    const role = card.cardRole || "system";
    cardEl.className = `card ${card.type} role-${role} ${canPlay ? "" : "disabled"}`.trim();

    const typeLabel = getCardCategoryLabel(card);

    cardEl.innerHTML = `
      <div class="card-top">
        <div class="card-title">${card.name}</div>
        <div class="cost">${card.cost}</div>
      </div>
      <div class="card-type">${typeLabel}</div>
      <div class="card-text">${card.description}</div>
      <button ${canPlay ? "" : "disabled"}>${canPlay ? "Play Card" : "Not Enough Energy"}</button>
    `;

    const button = cardEl.querySelector("button");
    button.addEventListener("click", () => playCard(card.uid));

    els.hand.appendChild(cardEl);
  });
}

function render() {
  els.playerHullText.textContent = `${state.player.hull} / ${state.player.maxHull}`;
  els.playerHullBar.style.width = `${(state.player.hull / state.player.maxHull) * 100}%`;
  els.playerBlockText.textContent = state.player.block;
  els.playerEnergyText.textContent = `${state.player.energy} / ${state.player.baseEnergy + state.player.reactorBonus}`;
  els.playerWeaponsText.textContent = `+${state.player.weaponBonus}`;
  els.playerShieldsText.textContent = `+${state.player.shieldBonus}`;
  els.playerReactorText.textContent = `+${state.player.reactorBonus}`;
  els.shipNameText.textContent = SHIP_NAME;
  els.shipPassiveText.textContent = SHIP_PASSIVE_TEXT;
  els.creditsText.textContent = state.runCredits;

  els.drawCount.textContent = state.drawPile.length;
  els.discardCount.textContent = state.discardPile.length;
  els.exhaustCount.textContent = state.exhaustPile.length;

  const aliveCount = getAliveEnemies().length;
  const totalCount = state.enemies.length;
  if (els.encounterInfo) {
    els.encounterInfo.textContent = `${state.encounterIndex + 1} / ${RUN_LENGTH} • ${state.encounterTier.toUpperCase()} • Enemies ${aliveCount} / ${totalCount}`;
  }

  renderEnemies();

  els.endTurnBtn.disabled = state.combatEnded;
  els.redrawBtn.disabled = state.combatEnded;

  renderHand();
}

els.restartBtn.addEventListener("click", startRun);
els.redrawBtn.addEventListener("click", redrawHand);
els.endTurnBtn.addEventListener("click", endTurn);

startRun();
