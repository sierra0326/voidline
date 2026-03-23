console.log("game.js loaded");

const state = {
  player: null,
  enemy: null,
  drawPile: [],
  discardPile: [],
  exhaustPile: [],
  hand: [],
  turn: 1,
  combatEnded: false,
  encounterIndex: 0,
  runWon: false
};

const SYSTEM_CARDS = [
  {
    id: "pulse-shot",
    name: "Pulse Shot",
    type: "system",
    cost: 1,
    description: "Deal 2 damage.",
    effect() {
      dealDamageToEnemy(2 + state.player.weaponBonus, "Pulse Shot");
    }
  },
  {
    id: "brace",
    name: "Brace",
    type: "system",
    cost: 1,
    description: "Gain 2 block.",
    effect() {
      gainPlayerBlock(2 + state.player.shieldBonus, "Brace");
    }
  },
  {
    id: "patch-hull",
    name: "Patch Hull",
    type: "system",
    cost: 1,
    description: "Repair 2 hull.",
    effect() {
      repairPlayerHull(2, "Patch Hull");
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
      dealDamageToEnemy(6 + state.player.weaponBonus, "Missile");
    }
  }
];

const ALL_CARDS = [...SYSTEM_CARDS, ...MISSILE_CARDS];

const STARTING_DECK_IDS = [
  "pulse-shot",
  "pulse-shot",
  "pulse-shot",
  "brace",
  "brace",
  "brace",
  "patch-hull",
  "patch-hull",
  "missile",
  "missile"
];

const ENEMY_TYPES = [
  {
    id: "scout",
    name: "Scout Drone",
    difficulty: "easy",
    maxHull: 8,
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
    maxHull: 12,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 3, text: "Attack for 3" },
        { type: "attack", amount: 3, text: "Attack for 3" },
        { type: "block", amount: 3, text: "Will gain 3 block" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "hunter",
    name: "Hunter Frigate",
    difficulty: "hard",
    maxHull: 16,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 4, text: "Attack for 4" },
        { type: "block", amount: 3, text: "Will gain 3 block" },
        { type: "attack", amount: 4, text: "Attack for 4" }
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

  drawCount: document.getElementById("drawCount"),
  discardCount: document.getElementById("discardCount"),
  exhaustCount: document.getElementById("exhaustCount"),

  enemyName: document.getElementById("enemyName"),
  enemyDifficulty: document.getElementById("enemyDifficulty"),
  enemyHullText: document.getElementById("enemyHullText"),
  enemyHullBar: document.getElementById("enemyHullBar"),
  enemyBlockText: document.getElementById("enemyBlockText"),
  enemyIntentText: document.getElementById("enemyIntentText"),
  enemyIntentDetail: document.getElementById("enemyIntentDetail"),
  encounterInfo: document.getElementById("encounterInfo"),

  hand: document.getElementById("hand"),
  log: document.getElementById("log"),

  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  overlayBtn: document.getElementById("overlayBtn")
};

function makeCard(id) {
  const base = ALL_CARDS.find(card => card.id === id);
  if (!base) throw new Error(`Card not found: ${id}`);

  return {
    ...base,
    uid: `${id}-${Math.random().toString(36).slice(2, 10)}`
  };
}

function makeStartingDeck() {
  return STARTING_DECK_IDS.map(id => makeCard(id));
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

function hideOverlay() {
  els.overlay.classList.add("hidden");
}

function showOverlay(title, text, buttonText, onClick) {
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlayBtn.textContent = buttonText;
  els.overlay.classList.remove("hidden");
  els.overlayBtn.onclick = onClick;
}

function getCurrentEnemyTemplate() {
  return ENEMY_TYPES[Math.min(state.encounterIndex, ENEMY_TYPES.length - 1)];
}

function buildEnemyFromTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    difficulty: template.difficulty,
    maxHull: template.maxHull,
    hull: template.maxHull,
    block: 0,
    getIntent: template.getIntent,
    intent: template.getIntent(1)
  };
}

function beginEncounter() {
  const template = getCurrentEnemyTemplate();

  state.enemy = buildEnemyFromTemplate(template);
  state.drawPile = shuffle(makeStartingDeck());
  state.discardPile = [];
  state.exhaustPile = [];
  state.hand = [];
  state.turn = 1;
  state.combatEnded = false;
  state.runWon = false;

  state.player.block = 0;
  state.player.energy = state.player.baseEnergy + state.player.reactorBonus;

  hideOverlay();

  log(`Encounter ${state.encounterIndex + 1} begins against ${state.enemy.name}.`, "enemy");

  drawCards(3);
  updateEnemyIntent();
  render();
}

function startRun() {
  state.player = {
    maxHull: 12,
    hull: 12,
    block: 0,
    baseEnergy: 2,
    energy: 2,
    weaponBonus: 0,
    shieldBonus: 0,
    reactorBonus: 0
  };

  state.encounterIndex = 0;
  els.log.innerHTML = "";
  beginEncounter();
}

function gainPlayerBlock(amount, sourceName) {
  state.player.block += amount;
  log(`${sourceName} grants ${amount} block.`, "system");
}

function gainEnemyBlock(amount, sourceName) {
  state.enemy.block += amount;
  log(`${sourceName} gains ${amount} block.`, "enemy");
}

function repairPlayerHull(amount, sourceName) {
  const before = state.player.hull;
  state.player.hull = Math.min(state.player.maxHull, state.player.hull + amount);
  const repaired = state.player.hull - before;
  log(`${sourceName} repairs ${repaired} hull.`, "system");
}

function dealDamageToEnemy(amount, sourceName) {
  const blocked = Math.min(state.enemy.block, amount);
  const hpDamage = amount - blocked;

  state.enemy.block -= blocked;
  state.enemy.hull = Math.max(0, state.enemy.hull - hpDamage);

  if (blocked > 0 && hpDamage > 0) {
    log(`${sourceName} hits for ${amount}. Enemy blocks ${blocked} and takes ${hpDamage}.`);
  } else if (blocked >= amount) {
    log(`${sourceName} hits for ${amount}, but enemy blocks it all.`);
  } else {
    log(`${sourceName} deals ${hpDamage} damage.`, sourceName === "Missile" ? "missile" : "");
  }

  if (state.enemy.hull <= 0) {
    state.combatEnded = true;

    if (state.encounterIndex >= ENEMY_TYPES.length - 1) {
      state.runWon = true;
      log(`${state.enemy.name} is destroyed. Run complete.`, "system");
    } else {
      log(`${state.enemy.name} is destroyed. Encounter won.`, "system");
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
  if (!state.enemy || state.combatEnded) return;
  state.enemy.intent = state.enemy.getIntent(state.turn);
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
  if (state.combatEnded) return;

  const card = state.hand.find(c => c.uid === uid);
  if (!card) return;
  if (card.cost > state.player.energy) return;

  state.player.energy -= card.cost;

  const removed = removeCardFromHand(uid);
  if (!removed) return;

  removed.effect();

  if (removed.type === "missile" || removed.type === "torpedo") {
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

  const intent = state.enemy.intent;
  if (!intent) return;

  switch (intent.type) {
    case "attack":
      dealDamageToPlayer(intent.amount, state.enemy.name);
      break;

    case "block":
      gainEnemyBlock(intent.amount, state.enemy.name);
      break;
  }
}

function endTurn() {
  if (state.combatEnded) return;

  discardHand();
  log("You end your turn.");

  // Enemy's previous block expires at the start of its turn
  state.enemy.block = 0;

  resolveEnemyTurn();

  if (state.combatEnded) {
    render();
    handleCombatEnd();
    return;
  }

  state.turn += 1;

  // Player block expires at the start of the new player turn
  state.player.block = 0;

  state.player.energy = state.player.baseEnergy + state.player.reactorBonus;

  updateEnemyIntent();
  drawCards(3);
  render();
}

function redrawHand() {
  if (state.combatEnded) return;

  if (state.player.energy < 1) {
    log("You need 1 energy to redraw.", "system");
    return;
  }

  state.player.energy -= 1;
  discardHand();
  drawCards(3);
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

  showOverlay(
    "Encounter Won",
    `You defeated ${state.enemy.name}. Continue to the next encounter.`,
    "Next Encounter",
    () => {
      state.encounterIndex += 1;
      beginEncounter();
    }
  );
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
    cardEl.className = `card ${card.type} ${canPlay ? "" : "disabled"}`.trim();

    const typeLabel =
      card.type === "system"
        ? "System"
        : card.type === "missile"
        ? "Missile"
        : "Torpedo";

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

  els.drawCount.textContent = state.drawPile.length;
  els.discardCount.textContent = state.discardPile.length;
  els.exhaustCount.textContent = state.exhaustPile.length;

  els.enemyName.textContent = state.enemy.name;
  els.enemyDifficulty.textContent = state.enemy.difficulty.toUpperCase();
  els.enemyHullText.textContent = `${state.enemy.hull} / ${state.enemy.maxHull}`;
  els.enemyHullBar.style.width = `${(state.enemy.hull / state.enemy.maxHull) * 100}%`;
  els.enemyBlockText.textContent = state.enemy.block;
  els.encounterInfo.textContent = `${state.encounterIndex + 1} / ${ENEMY_TYPES.length}`;

  if (state.combatEnded) {
    if (state.player.hull <= 0) {
      els.enemyIntentText.textContent = "Defeat";
      els.enemyIntentDetail.textContent = "Your ship has been destroyed.";
    } else {
      els.enemyIntentText.textContent = "Destroyed";
      els.enemyIntentDetail.textContent = `${state.enemy.name} has been eliminated.`;
    }
  } else {
    els.enemyIntentText.textContent = state.enemy.intent.text;
    els.enemyIntentDetail.textContent = getIntentDescription(state.enemy.intent);
  }

  els.endTurnBtn.disabled = state.combatEnded;
  els.redrawBtn.disabled = state.combatEnded;

  renderHand();
}

els.restartBtn.addEventListener("click", startRun);
els.redrawBtn.addEventListener("click", redrawHand);
els.endTurnBtn.addEventListener("click", endTurn);

startRun();
