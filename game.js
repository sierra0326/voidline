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
  pendingReward: false,
  ambushEncounter: false,
  victoryFuelGranted: false,
  pendingPlanetAlienAmbush: false,
  planetAlienAmbushCombat: false,
  pendingEliteContract: false,
  eliteContractCombat: false,
  mapNodes: [],
  currentNodeId: null,
  visitedNodeIds: [],
  clearedNodeIds: [],
  currentScreen: "start",
  sectorNumber: 1,
  notoriety: 0,
  gateUnlocked: false,
  inBossCombat: false,
  pendingBoss: false,
  shopInventory: [],
  selectedShipId: "heavy-fighter"
};

const SHIP_NAME = "Bounty Hunter";
const SHIP_PASSIVE_TEXT = "Gain credits after each encounter win.";
const SHIP_OPTIONS = [
  {
    id: "heavy-fighter",
    name: "Heavy Fighter",
    description: "Aggressive combat ship. Starts with Beam-focused damage tools."
  },
  {
    id: "exploration-vessel",
    name: "Exploration Vessel",
    description: "Long-range explorer. Starts with extra resources and map-friendly economy."
  },
  {
    id: "gunship",
    name: "Gunship",
    description: "Heavy assault platform. Starts with strong hull and defensive bruiser tools."
  },
  {
    id: "stealth-bomber",
    name: "Stealth Bomber",
    description: "Precision strike craft. Starts with Mark setup and execution tools."
  },
  {
    id: "mining-ship",
    name: "Mining Ship",
    description: "Industrial platform. Starts with extra credits and a mining laser package."
  }
];

function getShipDisplayName(shipId) {
  const ship = SHIP_OPTIONS.find(s => s.id === shipId);
  return ship ? ship.name : "Bounty Hunter";
}

function getShipBaseHull(shipId) {
  if (shipId === "heavy-fighter") return 60;
  if (shipId === "exploration-vessel") return 70;
  if (shipId === "gunship") return 90;
  if (shipId === "stealth-bomber") return 40;
  if (shipId === "mining-ship") return 80;
  return 50;
}

function getShipStartingCredits(shipId) {
  if (shipId === "exploration-vessel") return 25;
  if (shipId === "mining-ship") return 40;
  return 0;
}

function getShipStartingDeckIds(shipId) {
  const base = [
    "pulse-shot",
    "pulse-shot",
    "brace",
    "brace",
    "missile",
    "missile"
  ];

  if (shipId === "heavy-fighter") {
    return [...base, "charge-beam", "laser-pulse", "full-beam"];
  }

  if (shipId === "exploration-vessel") {
    return [...base, "tactical-scan", "reroute-power", "evasive-burst"];
  }

  if (shipId === "gunship") {
    return [...base, "brace", "reinforce-shields", "collection-sweep"];
  }

  if (shipId === "stealth-bomber") {
    return [...base, "hunters-tag", "paint-the-target", "claim-shot"];
  }

  if (shipId === "mining-ship") {
    return [...base, "pulse-shot", "collection-sweep", "overcharge-cannon"];
  }

  return [...STARTING_DECK_IDS];
}
const BASE_CREDIT_REWARD = 10;
const CREDIT_REWARD_STEP = 5;
const ELITE_CLEAR_BONUS = 15;

const RUN_LENGTH = 5;

function rollNextNodeType() {
  const r = Math.random() * 100;
  if (r < 50) return "combat";
  if (r < 70) return "dock";
  if (r < 90) return "planet";
  return "elite";
}

function createSector1() {
  return [
    { id: "S", type: "start", neighbors: ["A", "B", "C"], x: 220, y: 220 },
    { id: "A", type: "combat", danger: "easy", neighbors: ["S", "B", "D", "M"], x: 340, y: 130 },
    { id: "B", type: "dock", neighbors: ["S", "A", "C", "E", "N"], x: 360, y: 230 },
    { id: "C", type: "planet", neighbors: ["S", "B", "F", "O"], x: 320, y: 340 },
    { id: "D", type: "combat", danger: "medium", neighbors: ["A", "E", "G", "P"], x: 500, y: 90 },
    { id: "E", type: "combat", danger: "medium", neighbors: ["B", "D", "F", "G", "H", "K"], x: 540, y: 210 },
    { id: "F", type: "combat", danger: "medium", neighbors: ["C", "E", "H", "Q"], x: 510, y: 340 },
    { id: "G", type: "dock", neighbors: ["D", "E", "I", "P"], x: 700, y: 130 },
    { id: "H", type: "planet", neighbors: ["E", "F", "J", "K", "Q"], x: 720, y: 300 },
    { id: "I", type: "elite", danger: "elite", neighbors: ["G", "J"], x: 900, y: 150 },
    { id: "J", type: "gate", neighbors: ["H", "I"], x: 950, y: 280 },
    { id: "K", type: "shop", neighbors: ["E", "H", "N"], x: 610, y: 420 },
    { id: "M", type: "combat", danger: "easy", neighbors: ["A", "N"], x: 450, y: 30 },
    { id: "N", type: "planet", neighbors: ["B", "M", "K", "O"], x: 470, y: 440 },
    { id: "O", type: "combat", danger: "medium", neighbors: ["C", "N", "Q"], x: 360, y: 500 },
    { id: "P", type: "dock", neighbors: ["D", "G", "Q"], x: 640, y: 30 },
    { id: "Q", type: "combat", danger: "hard", neighbors: ["F", "H", "O", "P"], x: 670, y: 500 }
  ];
}

function createSector2() {
  return [
    { id: "S", type: "start", neighbors: ["A", "B", "C"], x: 220, y: 220 },
    { id: "A", type: "combat", danger: "easy", neighbors: ["S", "B", "D", "M"], x: 330, y: 120 },
    { id: "B", type: "combat", danger: "medium", neighbors: ["S", "A", "C", "E", "N"], x: 360, y: 220 },
    { id: "C", type: "dock", neighbors: ["S", "B", "F", "O"], x: 330, y: 340 },
    { id: "D", type: "planet", neighbors: ["A", "E", "G", "L", "P"], x: 500, y: 80 },
    { id: "E", type: "combat", danger: "medium", neighbors: ["B", "D", "F", "G", "H", "K"], x: 540, y: 210 },
    { id: "F", type: "combat", danger: "medium", neighbors: ["C", "E", "H", "Q"], x: 500, y: 340 },
    { id: "G", type: "dock", neighbors: ["D", "E", "I", "L", "P"], x: 700, y: 120 },
    { id: "H", type: "planet", neighbors: ["E", "F", "J", "K", "Q"], x: 710, y: 300 },
    { id: "I", type: "elite", danger: "elite", neighbors: ["G", "J"], x: 900, y: 150 },
    { id: "J", type: "gate", neighbors: ["H", "I"], x: 950, y: 280 },
    { id: "K", type: "shop", neighbors: ["E", "H", "N"], x: 620, y: 420 },
    { id: "L", type: "distress", neighbors: ["D", "G", "M"], x: 620, y: 20 },
    { id: "M", type: "combat", danger: "easy", neighbors: ["A", "L", "P"], x: 450, y: 20 },
    { id: "N", type: "planet", neighbors: ["B", "K", "O"], x: 460, y: 430 },
    { id: "O", type: "combat", danger: "medium", neighbors: ["C", "N", "Q"], x: 340, y: 500 },
    { id: "P", type: "dock", neighbors: ["D", "G", "M", "Q"], x: 640, y: 40 },
    { id: "Q", type: "combat", danger: "hard", neighbors: ["F", "H", "O", "P"], x: 680, y: 500 }
  ];
}

function createSector3() {
  return [
    { id: "S", type: "start", neighbors: ["A", "B", "C"], x: 220, y: 220 },
    { id: "A", type: "combat", danger: "easy", neighbors: ["S", "B", "D", "M"], x: 330, y: 120 },
    { id: "B", type: "combat", danger: "medium", neighbors: ["S", "A", "C", "E", "N"], x: 360, y: 220 },
    { id: "C", type: "planet", neighbors: ["S", "B", "F", "O"], x: 330, y: 340 },
    { id: "D", type: "dock", neighbors: ["A", "E", "F", "P"], x: 500, y: 90 },
    { id: "E", type: "combat", danger: "medium", neighbors: ["B", "D", "F", "G", "K"], x: 540, y: 210 },
    { id: "F", type: "combat", danger: "medium", neighbors: ["C", "D", "E", "H", "Q"], x: 500, y: 330 },
    { id: "G", type: "planet", neighbors: ["E", "I", "L", "P"], x: 700, y: 180 },
    { id: "H", type: "dock", neighbors: ["F", "I", "J", "K", "Q"], x: 700, y: 320 },
    { id: "I", type: "elite", danger: "elite", neighbors: ["G", "H", "J"], x: 900, y: 180 },
    { id: "J", type: "gate", neighbors: ["H", "I", "L"], x: 960, y: 280 },
    { id: "K", type: "shop", neighbors: ["E", "H", "N"], x: 620, y: 430 },
    { id: "L", type: "black-market", neighbors: ["G", "J", "M"], x: 900, y: 380 },
    { id: "M", type: "combat", danger: "easy", neighbors: ["A", "L", "P"], x: 450, y: 20 },
    { id: "N", type: "planet", neighbors: ["B", "K", "O"], x: 460, y: 450 },
    { id: "O", type: "combat", danger: "medium", neighbors: ["C", "N", "Q"], x: 340, y: 510 },
    { id: "P", type: "dock", neighbors: ["D", "G", "M"], x: 650, y: 40 },
    { id: "Q", type: "combat", danger: "hard", neighbors: ["F", "H", "O"], x: 670, y: 510 }
  ];
}

function randomizeSectorNodes(nodes) {
  const flexibleIds = ["M", "N", "O", "P", "Q"];
  const flexibleTypes = ["combat", "combat", "planet", "dock", "shop", "distress"];

  return nodes.map(node => {
    if (!flexibleIds.includes(node.id)) return node;

    const nextType = pickRandom(flexibleTypes);

    if (nextType === "combat") {
      return { ...node, type: "combat", danger: pickRandom(["easy", "medium", "hard"]) };
    }

    return { ...node, type: nextType };
  });
}

function createSectorByNumber(sectorNumber) {
  if (sectorNumber === 1) return randomizeSectorNodes(createSector1());
  if (sectorNumber === 2) return randomizeSectorNodes(createSector2());
  return randomizeSectorNodes(createSector3());
}

function getNodeById(nodeId) {
  return state.mapNodes.find(node => node.id === nodeId) || null;
}

function getCurrentNode() {
  return getNodeById(state.currentNodeId);
}

function formatNodeLabel(node) {
  if (!node) return "Unknown";
  if (node.type === "start") return "Hangar";
  if (node.type === "combat") return `Combat (${node.danger || "unknown"})`;
  if (node.type === "elite") return "Elite";
  if (node.type === "gate") {
    return state.gateUnlocked ? "Boss Contract (Available)" : "Boss Contract (Locked)";
  }
  if (node.type === "dock") return "Dock";
  if (node.type === "planet") return "Planet";
  if (node.type === "shop") return "Shop";
  if (node.type === "distress") return "Distress Signal";
  if (node.type === "black-market") return "Black Market";
  return node.type;
}

function isNodeVisited(nodeId) {
  return state.visitedNodeIds.includes(nodeId);
}

function isNodeCleared(nodeId) {
  return state.clearedNodeIds.includes(nodeId);
}

function isCurrentNodeCleared() {
  return state.clearedNodeIds.includes(state.currentNodeId);
}

function formatNodeStatus(node) {
  if (!node) return "";
  const tags = [];

  if (isNodeVisited(node.id)) tags.push("Visited");
  if (isNodeCleared(node.id)) tags.push("Cleared");

  return tags.length ? ` • ${tags.join(" • ")}` : "";
}

function markCurrentNodeCleared() {
  if (!state.currentNodeId) return;
  if (!state.clearedNodeIds.includes(state.currentNodeId)) {
    state.clearedNodeIds.push(state.currentNodeId);
  }
}

function getSectorProgressText() {
  const total = state.mapNodes.length;
  const visited = state.visitedNodeIds.length;
  const cleared = state.clearedNodeIds.length;
  return `Visited ${visited} / ${total} • Cleared ${cleared} / ${total}`;
}

function renderStarMapSvg() {
  const currentNode = getCurrentNode();
  if (!currentNode) return "";

  const drawnEdges = new Set();
  const lineParts = [];
  const nodeParts = [];

  for (const node of state.mapNodes) {
    for (const neighborId of node.neighbors) {
      const key = [node.id, neighborId].sort().join("-");
      if (drawnEdges.has(key)) continue;
      drawnEdges.add(key);

      const neighbor = getNodeById(neighborId);
      if (!neighbor) continue;

      const isAdjacentEdge =
        node.id === state.currentNodeId ||
        neighborId === state.currentNodeId;

      const stroke = isAdjacentEdge
        ? "rgba(140, 200, 255, 0.9)"
        : "rgba(140, 180, 255, 0.35)";

      const strokeWidth = isAdjacentEdge ? 5 : 3;

      lineParts.push(`
        <line
          x1="${node.x}"
          y1="${node.y}"
          x2="${neighbor.x}"
          y2="${neighbor.y}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
        />
      `);
    }
  }

  for (const node of state.mapNodes) {
    const isCurrent = node.id === state.currentNodeId;
    const isVisited = isNodeVisited(node.id);
    const isCleared = isNodeCleared(node.id);
    const isAdjacent = currentNode.neighbors.includes(node.id);

    const projectedFuel = Math.max(0, state.player.fuel - 1);
    const fuelPreviewText =
      isAdjacent && !isCurrent
        ? `<text x="${node.x}" y="${node.y + 56}" text-anchor="middle" font-size="11" font-weight="700" fill="#79bcff">${projectedFuel} fuel</text>`
        : "";

    let fill = "#1c2c4a";
    if (node.type === "dock") fill = "#1f6b62";
    if (node.type === "planet") fill = "#5b4b8a";
    if (node.type === "elite") fill = "#8a2f2f";
    if (node.type === "gate") fill = state.gateUnlocked ? "#c08b2f" : "#5f5f5f";
    if (node.type === "combat") {
      if (node.danger === "easy") fill = "#3f6ea8";
      else if (node.danger === "medium") fill = "#2f4d7a";
      else if (node.danger === "hard") fill = "#24385c";
      else fill = "#2f4d7a";
    }

    let stroke = "rgba(255,255,255,0.18)";
    let strokeWidth = 2;
    let opacity = 1;
    let cursor = "default";

    if (isVisited) stroke = "rgba(121,188,255,0.65)";
    if (isCleared) opacity = 0.55;
    if (isCurrent) {
      stroke = "#ffd36a";
      strokeWidth = 4;
      cursor = "pointer";
    } else if (isAdjacent) {
      stroke = "#79bcff";
      strokeWidth = 3;
      cursor = "pointer";
    }

    nodeParts.push(`
      <g class="star-node" data-node-id="${node.id}" style="cursor:${cursor}; opacity:${opacity}">
        <circle
          cx="${node.x}"
          cy="${node.y}"
          r="24"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
        />
        <text x="${node.x}" y="${node.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#e6f0ff">
          ${node.id}
        </text>
        <text x="${node.x}" y="${node.y + 42}" text-anchor="middle" font-size="11" fill="#9fb3cf">
          ${formatNodeLabel(node)}
        </text>
        ${fuelPreviewText}
      </g>
    `);
  }

  return `
    <div class="star-map-shell">
      <svg class="star-map-svg" viewBox="0 0 1120 560" width="100%" height="560" role="img" aria-label="Sector star map">
        ${lineParts.join("")}
        ${nodeParts.join("")}
      </svg>
    </div>
  `;
}

const TIER_MULTIPLIER = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.4,
  elite: 1.58
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
    id: "debug-delete",
    name: "Debug Delete",
    type: "system",
    cost: 0,
    description: "TEST ONLY: Destroy the selected enemy.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      dealDamageToEnemy(enemy.hull + enemy.block, "Debug Delete");
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
    description: "Convert all Mark into Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;

      const mark = enemy.markStacks || 0;
      if (mark <= 0) return;

      enemy.markStacks = 0;
      enemy.beamCharge = (enemy.beamCharge || 0) + mark;

      log(`Target Lock converts ${mark} Mark into Beam.`, "system");
      showComboBanner("🎯→⚡ CHAIN ONLINE");
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
    description: "Deal 2 damage. Apply 2 Mark.",
    effect() {
      dealAttackDamageToEnemy(2, "Hunter's Tag");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 2;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      log(`Mark applied — +${x} Mark.`, "system");
    }
  },
  {
    id: "paint-the-target",
    name: "Paint the Target",
    type: "system",
    cost: 0,
    description: "Apply 1 Mark. Draw 1 card.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 1;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      drawCards(1);
      log(`Mark applied — +${x} Mark.`, "system");
    }
  },
  {
    id: "pursuit-sweep",
    name: "Pursuit Sweep",
    type: "system",
    cost: 1,
    description: "Gain 3 block. Apply 1 Mark.",
    effect() {
      gainPlayerBlock(3 + state.player.shieldBonus, "Pursuit Sweep");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 1;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      log(`Mark applied — +${x} Mark.`, "system");
    }
  },
  {
    id: "claim-shot",
    name: "Claim Shot",
    type: "system",
    cost: 1,
    description: "Deal 4 damage. If target has Mark, deal 8 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const mark = enemy.markStacks || 0;
      const dmg = 4 + mark * 3;
      dealAttackDamageToEnemy(dmg, "Claim Shot");
    }
  },
  {
    id: "bounty-collection",
    name: "Bounty Collection",
    type: "system",
    cost: 2,
    description: "Deal 7 damage. If target has Mark, gain 1 energy.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const mark = enemy.markStacks || 0;
      const credits = 3 + mark * 2;
      state.runCredits += credits;
      log(`Bounty Collection pays out ${credits} credits.`, "system");
      if (credits >= 9) showComboBanner("💰 BIG PAYOUT");
    }
  },
  {
    id: "dead-or-alive",
    name: "Dead or Alive",
    type: "system",
    cost: 2,
    description: "Deal 6 damage. If target has Mark, gain 6 block and deal 9 instead.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;

      const mark = enemy.markStacks || 0;

      if (mark >= 5) {
        enemy.hull = 0;
        enemy.block = 0;
        log("Dead or Alive executes the target!", "system");
        showComboBanner("☠ EXECUTION");
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
      } else {
        const dmg = 6 + mark * 2;
        dealAttackDamageToEnemy(dmg, "Dead or Alive");
      }
    }
  },
  {
    id: "tracking-burst",
    name: "Tracking Burst",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. If target has 0 Mark, apply 1 Mark.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      dealAttackDamageToEnemy(3, "Tracking Burst");
      if ((enemy.markStacks || 0) === 0) {
        const x = 1;
        enemy.markStacks = (enemy.markStacks || 0) + x;
        log(`Mark applied — +${x} Mark.`, "system");
      }
    }
  },
  {
    id: "signal-flare",
    name: "Signal Flare",
    type: "system",
    cost: 1,
    description: "Apply 1 Mark. Gain 1 energy.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 1;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      state.player.energy += 1;
      log(`Mark applied — +${x} Mark.`, "system");
      log("Signal Flare grants 1 energy.", "system");
    }
  },
  {
    id: "glint-strike",
    name: "Glint Strike",
    type: "system",
    cost: 1,
    description: "Deal 1 damage. Apply 1 Mark.",
    effect() {
      dealAttackDamageToEnemy(1, "Glint Strike");
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 1;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      log(`Mark applied — +${x} Mark.`, "system");
    }
  },
  {
    id: "hard-lock",
    name: "Hard Lock",
    type: "system",
    cost: 2,
    description: "Apply 2 Mark. Draw 2 cards.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const x = 2;
      enemy.markStacks = (enemy.markStacks || 0) + x;
      drawCards(2);
      log(`Mark applied — +${x} Mark.`, "system");
    }
  },
  {
    id: "charge-beam",
    name: "Charge Beam",
    type: "system",
    cost: 1,
    description: "Charge +3 Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) + 3;
      log("Beam charge increased by 3.", "system");
    }
  },
  {
    id: "laser-pulse",
    name: "Laser Pulse",
    type: "system",
    cost: 1,
    description: "Deal 2 damage. +2 per Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const beam = enemy.beamCharge || 0;
      const dmg = 2 + beam * 2;
      dealAttackDamageToEnemy(dmg, "Laser Pulse");
    }
  },
  {
    id: "full-beam",
    name: "Full Beam",
    type: "system",
    cost: 2,
    description: "Deal 6 damage. +4 per Beam. Consume all Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const beam = enemy.beamCharge || 0;
      const dmg = 6 + beam * 4;
      enemy.beamCharge = 0;
      dealAttackDamageToEnemy(dmg, "Full Beam");
      log("Full Beam fires — all charge released.", "system");
    }
  },
  {
    id: "overfocus",
    name: "Overfocus",
    type: "system",
    cost: 1,
    description: "Double current Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) * 2;
      log("Beam charge doubled.", "system");
    }
  },
  {
    id: "recalibrate",
    name: "Recalibrate",
    type: "system",
    cost: 1,
    description: "Convert all Beam into Mark.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;

      const beam = enemy.beamCharge || 0;
      if (beam <= 0) return;

      enemy.beamCharge = 0;
      enemy.markStacks = (enemy.markStacks || 0) + beam;

      log(`Recalibrate converts ${beam} Beam into Mark.`, "system");
      showComboBanner("⚡→🎯 RELOCK");
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

function getCardById(cardId) {
  return ALL_CARDS.find(card => card.id === cardId) || null;
}

/** UI / archetype: weapon (damage), system (defense/draw/utility), tactical (setup / Mark / synergy), beam (laser scaling) */
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
  "debug-delete": "system",
  "tactical-scan": "system",
  "evasive-burst": "system",
  "deep-cache": "system",
  "reroute-power": "system",
  "overclock-drive": "system",
  "covering-fire": "system",
  "skirmish-step": "system",
  "collection-sweep": "system",
  "target-lock": "beam",
  "hunters-tag": "tactical",
  "paint-the-target": "tactical",
  "pursuit-sweep": "tactical",
  "tracking-burst": "tactical",
  "signal-flare": "tactical",
  "glint-strike": "tactical",
  "hard-lock": "tactical",
  "charge-beam": "beam",
  "laser-pulse": "beam",
  "full-beam": "beam",
  overfocus: "beam",
  recalibrate: "mark"
};

function getCardCategoryLabel(card) {
  const role = card.cardRole || "system";
  if (role === "weapon") return "Weapon";
  if (role === "tactical") return "Tactical";
  if (role === "beam") return "Beam";
  if (role === "mark") return "Mark";
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
  "missile",
  "debug-delete",
  "charge-beam",
  "laser-pulse"
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
  "hard-lock",
  "charge-beam",
  "laser-pulse",
  "full-beam",
  "overfocus",
  "recalibrate"
];

const ENEMY_TYPES = [
  {
    id: "scout",
    name: "Scout Drone",
    difficulty: "easy",
    trait: "overcharged",
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
    trait: "jammer",
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
    trait: "shielder",
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
  fuelText: document.getElementById("fuelText"),

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
  rewardOptions: document.getElementById("rewardOptions"),
  comboBanner: document.getElementById("comboBanner"),
  startScreen: document.getElementById("startScreen"),
  shipSelectScreen: document.getElementById("shipSelectScreen"),
  shipSelectOptions: document.getElementById("shipSelectOptions"),
  startRunFlowBtn: document.getElementById("startRunFlowBtn"),
  mapScreen: document.getElementById("mapScreen"),
  mapTitleText: document.getElementById("mapTitleText"),
  mapSubtitleText: document.getElementById("mapSubtitleText"),
  mapCurrentInfo: document.getElementById("mapCurrentInfo"),
  mapSvgWrap: document.getElementById("mapSvgWrap"),
  mapActionArea: document.getElementById("mapActionArea"),
  combatGrid: document.querySelector(".combat-grid"),
  controls: document.querySelector(".controls"),
  handSection: document.querySelector(".hand-section"),
  logSection: document.querySelector(".log-section")
};

let comboBannerTimeout = null;

function showComboBanner(text) {
  if (!els.comboBanner) return;

  if (comboBannerTimeout) {
    clearTimeout(comboBannerTimeout);
    comboBannerTimeout = null;
  }

  els.comboBanner.textContent = text;
  els.comboBanner.classList.remove("hidden", "fade-out");

  comboBannerTimeout = setTimeout(() => {
    els.comboBanner.classList.add("fade-out");

    comboBannerTimeout = setTimeout(() => {
      els.comboBanner.classList.add("hidden");
      els.comboBanner.classList.remove("fade-out");
      comboBannerTimeout = null;
    }, 220);
  }, 900);
}

function hideComboBanner() {
  if (!els.comboBanner) return;
  if (comboBannerTimeout) {
    clearTimeout(comboBannerTimeout);
    comboBannerTimeout = null;
  }
  els.comboBanner.classList.add("hidden");
  els.comboBanner.classList.remove("fade-out");
  els.comboBanner.textContent = "";
}

function showStartScreen() {
  state.currentScreen = "start";
  render();
}

function showShipSelection() {
  state.currentScreen = "ship-select";
  renderShipSelection();
  render();
}

function renderShipSelection() {
  if (!els.shipSelectOptions) return;

  els.shipSelectOptions.innerHTML = "";

  SHIP_OPTIONS.forEach(ship => {
    const btn = document.createElement("button");
    btn.className = "reward-option";
    btn.innerHTML = `
      <div class="reward-name">${ship.name}</div>
      <div class="reward-meta">${ship.description}</div>
    `;
    btn.addEventListener("click", () => {
      startRun(ship.id);
    });
    els.shipSelectOptions.appendChild(btn);
  });
}

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
    const bossBadge = enemy.bossType ? `<span class="badge bounty-badge">BOSS</span>` : "";

    const markBadge = (enemy.markStacks || 0) > 0 ? `<span class="badge mark-badge">MARKED</span>` : "";
    const traitBadge = enemy.trait
      ? `<span class="badge trait-badge trait-${enemy.trait}">${enemy.trait.toUpperCase()}</span>`
      : "";

    const card = document.createElement("div");
    card.className = `enemy-card ${isSelected ? "selected" : ""}`.trim();
    card.innerHTML = `
      <div class="enemy-head">
        <div>
          <div class="value">${enemy.name}</div>
          <div class="muted">${enemy.difficulty.toUpperCase()}</div>
        </div>
        <div class="enemy-badges">
          ${bossBadge}
          ${roleBadge}
          ${markBadge}
          ${traitBadge}
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
          <div class="value">${enemy.markStacks || 0}</div>
        </div>
        <div class="enemy-mini">
          <div class="label">Beam</div>
          <div class="value">${enemy.beamCharge || 0}</div>
        </div>
        <div class="enemy-mini">
          <div class="label">Trait</div>
          <div class="value">${enemy.trait || "None"}</div>
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

function makeStartingDeck(shipId = "heavy-fighter") {
  return getShipStartingDeckIds(shipId).map(id => makeCard(id));
}

function makeRunDeck(shipId = "heavy-fighter") {
  return [...getShipStartingDeckIds(shipId)];
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomCards(array, count) {
  return shuffle(array).slice(0, count);
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

function clearNonCombatPresentation() {
  state.enemies = [];
  state.hand = [];
  state.drawPile = [];
  state.discardPile = [];
  state.exhaustPile = [];
  state.combatEnded = true;
  state.selectedEnemyUid = null;
}

function showMapOverlay() {
  const currentNode = getCurrentNode();
  if (!currentNode) return;

  hideComboBanner();
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = `Star Map — Sector ${state.sectorNumber} — Notoriety: ${getNotorietyLabel(state.notoriety)}`;
  els.overlayText.textContent = `Current Node: ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)} • Fuel: ${state.player.fuel} • ${getSectorProgressText()}`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  els.rewardOptions.innerHTML = `
  <div class="reward-option">
    <div class="reward-name">Current Location</div>
    <div class="reward-meta">Node ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
  </div>
  <div class="reward-option">
    <div class="reward-name">Sector Map</div>
    <div class="reward-meta">Current node is gold. Adjacent nodes are blue. Cleared nodes are dimmed. Adjacent nodes show fuel after travel. Darker combat nodes indicate higher danger.</div>
    ${renderStarMapSvg()}
  </div>
`;

  const engageButton = document.createElement("button");
  engageButton.className = "reward-option";
  engageButton.innerHTML = `
  <div class="reward-name">Engage Current Node</div>
  <div class="reward-meta">${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
`;
  engageButton.addEventListener("click", () => {
    resolveCurrentNode();
  });
  els.rewardOptions.appendChild(engageButton);

  const nodeEls = els.rewardOptions.querySelectorAll(".star-node");
  nodeEls.forEach(nodeEl => {
    const nodeId = nodeEl.getAttribute("data-node-id");
    if (!nodeId) return;

    if (nodeId === state.currentNodeId) {
      nodeEl.addEventListener("click", () => resolveCurrentNode());
      return;
    }

    const currentNode = getCurrentNode();
    if (currentNode && currentNode.neighbors.includes(nodeId)) {
      nodeEl.addEventListener("click", () => travelToNode(nodeId));
    }
  });

  render();
}

function renderMapScreen() {
  const currentNode = getCurrentNode();
  if (!currentNode) return;

  hideOverlay();
  hideComboBanner();

  if (!els.mapTitleText || !els.mapSubtitleText || !els.mapCurrentInfo || !els.mapSvgWrap || !els.mapActionArea) return;

  els.mapTitleText.textContent = `Star Map — Sector ${state.sectorNumber}`;
  els.mapSubtitleText.textContent = `Notoriety: ${getNotorietyLabel(state.notoriety)} • Fuel: ${state.player.fuel} • ${getSectorProgressText()}`;

  els.mapCurrentInfo.innerHTML = `
    <div class="reward-name">Current Location</div>
    <div class="reward-meta">Node ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
  `;

  els.mapSvgWrap.innerHTML = renderStarMapSvg();

  els.mapActionArea.innerHTML = "";

  const engageButton = document.createElement("button");
  engageButton.className = "reward-option";
  engageButton.innerHTML = `
    <div class="reward-name">Engage Current Node</div>
    <div class="reward-meta">${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
  `;
  engageButton.addEventListener("click", () => resolveCurrentNode());
  els.mapActionArea.appendChild(engageButton);

  const nodeEls = els.mapSvgWrap.querySelectorAll(".star-node");
  nodeEls.forEach(nodeEl => {
    const nodeId = nodeEl.getAttribute("data-node-id");
    if (!nodeId) return;

    if (nodeId === state.currentNodeId) {
      nodeEl.addEventListener("click", () => resolveCurrentNode());
      return;
    }

    const current = getCurrentNode();
    if (current && current.neighbors.includes(nodeId)) {
      nodeEl.addEventListener("click", () => travelToNode(nodeId));
    }
  });
}

function travelToNode(targetNodeId) {
  const currentNode = getCurrentNode();
  if (!currentNode) return;

  if (!currentNode.neighbors.includes(targetNodeId)) return;

  if (state.player.fuel < 1) {
    log("Out of fuel. Drift Mode will be implemented later.", "enemy");
    return;
  }

  state.player.fuel -= 1;
  state.currentNodeId = targetNodeId;

  if (!state.visitedNodeIds.includes(targetNodeId)) {
    state.visitedNodeIds.push(targetNodeId);
  }

  log(`Traveled to node ${targetNodeId}. Fuel: ${state.player.fuel}.`, "system");
  resolveCurrentNode();
}

function resolveCurrentNode() {
  const node = getCurrentNode();
  if (!node) return;

  if (node.type === "start") {
    log("Hangar ready. Choose your route.", "system");
    returnToMap();
    return;
  }

  if (node.type === "combat" || node.type === "elite") {
    if (isCurrentNodeCleared()) {
      log(`Node ${node.id} already cleared.`, "system");
      returnToMap();
      return;
    }

    state.currentScreen = "combat";
    state.pendingEliteContract = node.type === "elite";
    state.pendingPlanetAlienAmbush = false;
    state.pendingReward = false;
    hideOverlay();
    beginEncounter();
    return;
  }

  if (node.type === "dock") {
    if (isCurrentNodeCleared()) {
      log(`Dock node ${node.id} already used.`, "system");
      returnToMap();
      return;
    }

    state.currentScreen = "combat";
    hideOverlay();
    showDockOverlay();
    return;
  }

  if (node.type === "planet") {
    if (isCurrentNodeCleared()) {
      log(`Planet node ${node.id} already resolved.`, "system");
      returnToMap();
      return;
    }

    state.currentScreen = "combat";
    hideOverlay();
    showPlanetOverlay();
    return;
  }

  if (node.type === "shop") {
    state.currentScreen = "combat";
    hideOverlay();
    showShopOverlay();
    return;
  }

  if (node.type === "distress") {
    if (isCurrentNodeCleared()) {
      log(`Distress node ${node.id} already resolved.`, "system");
      returnToMap();
      return;
    }

    state.currentScreen = "combat";
    hideOverlay();
    showDistressOverlay();
    return;
  }

  if (node.type === "black-market") {
    state.currentScreen = "combat";
    hideOverlay();
    showBlackMarketOverlay();
    return;
  }

  if (node.type === "gate") {
    state.currentScreen = "combat";
    hideOverlay();
    showGateOverlay();
    return;
  }
}

function returnToMap() {
  state.currentScreen = "map";
  state.pendingReward = false;
  state.pendingExtraction = false;
  state.shopInventory = [];
  hideOverlay();
  render();
}

function advanceAfterCombatRewards() {
  state.pendingReward = false;
  state.pendingExtraction = false;
  state.rewardChoices = [];
  returnToMap();
}

function finishNodeAfterNonCombat() {
  state.pendingReward = false;
  markCurrentNodeCleared();
  returnToMap();
}

function showDockOverlay() {
  hideComboBanner();
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Dock";
  els.overlayText.textContent = "Station services.";
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const refuelBtn = document.createElement("button");
  refuelBtn.className = "reward-option";
  refuelBtn.innerHTML = `
    <div class="reward-name">Refuel</div>
    <div class="reward-meta">Restore fuel to full (free)</div>
  `;
  refuelBtn.addEventListener("click", () => {
    const restored = state.player.maxFuel - state.player.fuel;
    state.player.fuel = state.player.maxFuel;
    log(`Dock: refueled ${restored} fuel. Total fuel: ${state.player.fuel}.`, "system");
    returnToMap();
  });

  const repairBtn = document.createElement("button");
  repairBtn.className = "reward-option";
  repairBtn.disabled = state.runCredits < 40;
  repairBtn.innerHTML = `
    <div class="reward-name">Repair hull</div>
    <div class="reward-meta">Restore 10 hull — 40 credits</div>
  `;
  repairBtn.addEventListener("click", () => {
    if (state.runCredits < 40) return;
    state.runCredits -= 40;
    repairPlayerHull(10, "Dock");
    finishNodeAfterNonCombat();
  });

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Leave</div>
    <div class="reward-meta">Return to the map without consuming this dock.</div>
  `;
  leaveBtn.addEventListener("click", () => returnToMap());

  els.rewardOptions.appendChild(refuelBtn);
  els.rewardOptions.appendChild(repairBtn);
  els.rewardOptions.appendChild(leaveBtn);
  render();
}

function showShopOverlay() {
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Babu's Emporium";
  els.overlayText.textContent =
    "A strange alien merchant offers questionable tech, polished salvage, and suspiciously fair prices.";

  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  if (!state.shopInventory || state.shopInventory.length === 0) {
    state.shopInventory = pickRandomCards(REWARD_POOL_IDS, 3);
  }

  const shopCards = state.shopInventory;

  shopCards.forEach(cardId => {
    const card = getCardById(cardId);
    if (!card) return;

    const btn = document.createElement("button");
    btn.className = "reward-option";

    btn.innerHTML = `
      <div class="reward-name">${card.name}</div>
      <div class="reward-meta">Buy for 25 credits • ${card.description}</div>
    `;

    btn.addEventListener("click", () => {
      if (state.runCredits < 25) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 25;
      state.runDeck.push(cardId);

      log(`Bought ${card.name}.`, "system");
      returnToMap();
    });

    els.rewardOptions.appendChild(btn);
  });

  const rerollBtn = document.createElement("button");
  rerollBtn.className = "reward-option";

  rerollBtn.innerHTML = `
  <div class="reward-name">Reroll Inventory</div>
  <div class="reward-meta">Cost: 15 credits</div>
`;

  rerollBtn.addEventListener("click", () => {
    if (state.runCredits < 15) {
      log("Not enough credits.", "enemy");
      return;
    }

    state.runCredits -= 15;
    state.shopInventory = pickRandomCards(REWARD_POOL_IDS, 3);

    log("Babu refreshes the inventory.", "system");

    showShopOverlay();
  });

  els.rewardOptions.appendChild(rerollBtn);

  const removeBtn = document.createElement("button");
  removeBtn.className = "reward-option";
  removeBtn.innerHTML = `
    <div class="reward-name">Remove a Card</div>
    <div class="reward-meta">Cost: 40 credits</div>
  `;
  removeBtn.addEventListener("click", () => {
    if (state.runCredits < 40) {
      log("Not enough credits.", "enemy");
      return;
    }

    showRemoveCardOverlay();
  });
  els.rewardOptions.appendChild(removeBtn);

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Leave</div>
    <div class="reward-meta">Return to map</div>
  `;
  leaveBtn.addEventListener("click", () => returnToMap());
  els.rewardOptions.appendChild(leaveBtn);

  render();
}

function showRemoveCardOverlay() {
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Remove a Card";
  els.overlayText.textContent = "Select one card to remove from your deck.";

  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  state.runDeck.forEach((cardId, index) => {
    const card = getCardById(cardId);
    if (!card) return;

    const btn = document.createElement("button");
    btn.className = "reward-option";
    btn.innerHTML = `
      <div class="reward-name">${card.name}</div>
      <div class="reward-meta">Remove for 40 credits</div>
    `;

    btn.addEventListener("click", () => {
      if (state.runCredits < 40) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 40;
      state.runDeck.splice(index, 1);

      log(`Removed ${card.name} from deck.`, "system");
      returnToMap();
    });

    els.rewardOptions.appendChild(btn);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "reward-option";
  cancelBtn.innerHTML = `
    <div class="reward-name">Cancel</div>
    <div class="reward-meta">Return to Babu's Emporium</div>
  `;
  cancelBtn.addEventListener("click", () => showShopOverlay());
  els.rewardOptions.appendChild(cancelBtn);

  render();
}

function showDistressOverlay() {
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Distress Signal";
  els.overlayText.textContent = "A broken transmission cuts through the void. It could be salvage — or bait.";

  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const investigateBtn = document.createElement("button");
  investigateBtn.className = "reward-option";
  investigateBtn.innerHTML = `
    <div class="reward-name">Investigate</div>
    <div class="reward-meta">Resolve the signal and consume this node.</div>
  `;
  investigateBtn.addEventListener("click", () => {
    const roll = Math.random();

    if (roll < 0.45) {
      state.runCredits += 20;
      log("Distress signal yields salvage: +20 credits.", "system");
      finishNodeAfterNonCombat();
      return;
    }

    if (roll < 0.75) {
      state.player.fuel = Math.min(state.player.maxFuel, state.player.fuel + 1);
      log(`Distress signal yields emergency fuel. Fuel: ${state.player.fuel}.`, "system");
      finishNodeAfterNonCombat();
      return;
    }

    log("Distress signal was a trap.", "enemy");
    state.pendingPlanetAlienAmbush = true;
    state.currentScreen = "combat";
    hideOverlay();
    beginEncounter();
  });

  const ignoreBtn = document.createElement("button");
  ignoreBtn.className = "reward-option";
  ignoreBtn.innerHTML = `
    <div class="reward-name">Ignore</div>
    <div class="reward-meta">Return to the map without consuming this node.</div>
  `;
  ignoreBtn.addEventListener("click", () => returnToMap());

  els.rewardOptions.appendChild(investigateBtn);
  els.rewardOptions.appendChild(ignoreBtn);

  render();
}

function showBlackMarketOverlay() {
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Black Market";
  els.overlayText.textContent = "Shuttered cargo bays, unregistered tech, and prices Babu would call irresponsible.";

  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const marketCards = pickRandomCards(REWARD_POOL_IDS, 3);

  marketCards.forEach(cardId => {
    const card = getCardById(cardId);
    if (!card) return;

    const btn = document.createElement("button");
    btn.className = "reward-option";
    btn.innerHTML = `
      <div class="reward-name">${card.name}</div>
      <div class="reward-meta">Buy for 20 credits • ${card.description}</div>
    `;
    btn.addEventListener("click", () => {
      if (state.runCredits < 20) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 20;
      state.runDeck.push(cardId);
      log(`Bought ${card.name} on the black market.`, "system");
      returnToMap();
    });

    els.rewardOptions.appendChild(btn);
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "reward-option";
  removeBtn.innerHTML = `
    <div class="reward-name">Remove a Card</div>
    <div class="reward-meta">Cost: 30 credits</div>
  `;
  removeBtn.addEventListener("click", () => {
    if (state.runCredits < 30) {
      log("Not enough credits.", "enemy");
      return;
    }

    showBlackMarketRemoveOverlay();
  });
  els.rewardOptions.appendChild(removeBtn);

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Leave</div>
    <div class="reward-meta">Return to map</div>
  `;
  leaveBtn.addEventListener("click", () => returnToMap());
  els.rewardOptions.appendChild(leaveBtn);

  render();
}

function showBlackMarketRemoveOverlay() {
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Black Market Removal";
  els.overlayText.textContent = "A backroom technician offers to strip one card from your deck.";

  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  state.runDeck.forEach((cardId, index) => {
    const card = getCardById(cardId);
    if (!card) return;

    const btn = document.createElement("button");
    btn.className = "reward-option";
    btn.innerHTML = `
      <div class="reward-name">${card.name}</div>
      <div class="reward-meta">Remove for 30 credits</div>
    `;
    btn.addEventListener("click", () => {
      if (state.runCredits < 30) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 30;
      state.runDeck.splice(index, 1);
      log(`Removed ${card.name} through the black market.`, "system");
      returnToMap();
    });

    els.rewardOptions.appendChild(btn);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "reward-option";
  cancelBtn.innerHTML = `
    <div class="reward-name">Cancel</div>
    <div class="reward-meta">Return to the black market</div>
  `;
  cancelBtn.addEventListener("click", () => showBlackMarketOverlay());
  els.rewardOptions.appendChild(cancelBtn);

  render();
}

function startNextSector() {
  state.sectorNumber += 1;
  state.gateUnlocked = false;
  state.mapNodes = createSectorByNumber(state.sectorNumber);
  state.currentNodeId = "S";
  state.visitedNodeIds = ["S"];
  state.clearedNodeIds = [];
  state.player.fuel = state.player.maxFuel;
  state.encounterIndex = 0;
  state.encounterTier = "easy";
  state.pendingPlanetAlienAmbush = false;
  state.planetAlienAmbushCombat = false;
  state.pendingEliteContract = false;
  state.eliteContractCombat = false;
  state.pendingReward = false;
  state.pendingExtraction = false;
  state.rewardChoices = [];
  state.combatEnded = false;
  state.ambushEncounter = false;
  state.victoryFuelGranted = false;
  state.inBossCombat = false;
  state.pendingBoss = false;
  log(`Jumped to Sector ${state.sectorNumber}. Fuel restored to ${state.player.fuel}.`, "system");
  hideComboBanner();
  returnToMap();
}

function showPlanetOverlay() {
  const node = getCurrentNode();
  if (!node) return;

  hideComboBanner();
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Planet";
  els.overlayText.textContent = `Node ${node.id} • Choose whether to explore now or leave it for later.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const exploreBtn = document.createElement("button");
  exploreBtn.className = "reward-option";
  exploreBtn.innerHTML = `
    <div class="reward-name">Explore Planet</div>
    <div class="reward-meta">Resolve the planet event and consume this node.</div>
  `;
  exploreBtn.addEventListener("click", () => {
    hideOverlay();
    resolvePlanetEvent();
  });

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Leave for Now</div>
    <div class="reward-meta">Return to the map without consuming this node.</div>
  `;
  leaveBtn.addEventListener("click", () => {
    returnToMap();
  });

  els.rewardOptions.appendChild(exploreBtn);
  els.rewardOptions.appendChild(leaveBtn);

  render();
}

function getSectorBossName(sectorNumber) {
  if (sectorNumber === 1) return "Patrol Commander";
  if (sectorNumber === 2) return "Contract Warden";
  return "Blacksite Hunter";
}

function getSectorBossDescription(sectorNumber) {
  if (sectorNumber === 1) return "Heavy striker with escort support.";
  if (sectorNumber === 2) return "Aggressive dual-ship assault.";
  return "Fortified flagship with support cover.";
}

function getSectorUpgradeFlavor(sectorNumber) {
  if (sectorNumber === 1) {
    return {
      title: "Patrol Commander Salvage",
      text: `You strip the wreckage of ${getSectorBossName(sectorNumber)} for usable systems. Choose one upgrade before entering Sector ${sectorNumber + 1}.`
    };
  }

  if (sectorNumber === 2) {
    return {
      title: "Contract Warden Retrofit",
      text: `The remains of ${getSectorBossName(sectorNumber)} yield hardened components and tactical hardware. Choose one upgrade before entering Sector ${sectorNumber + 1}.`
    };
  }

  return {
    title: "Blacksite Hunter Recovery",
    text: `Recovered blacksite components offer dangerous but valuable enhancements. Choose one upgrade before entering Sector ${sectorNumber + 1}.`
  };
}

function getNotorietyLabel(notoriety) {
  if (notoriety <= 0) return "Unknown";
  if (notoriety === 1) return "Noticed";
  if (notoriety === 2) return "Tracked";
  if (notoriety === 3) return "Feared";
  return "Hunted";
}

function buildSectorBossEncounter(sectorNumber) {
  let bossType = "blacksite-hunter";
  if (sectorNumber === 1) bossType = "patrol-commander";
  else if (sectorNumber === 2) bossType = "contract-warden";

  if (sectorNumber === 1) {
    const lead = getEnemyTypeById("burst-bounty") || ENEMY_TYPES[Math.min(3, ENEMY_TYPES.length - 1)];
    const escort = getEnemyTypeById("support-escort") || ENEMY_TYPES[0];
    const bossEnemy = buildEnemyFromTemplate(lead, "bounty", "hard");
    bossEnemy.bossType = bossType;
    return [bossEnemy, buildEnemyFromTemplate(escort, "escort", "hard")];
  }

  if (sectorNumber === 2) {
    const lead = ENEMY_TYPES[Math.min(4, ENEMY_TYPES.length - 1)];
    const wing = getEnemyTypeById("burst-bounty") || lead;
    const bossEnemy = buildEnemyFromTemplate(lead, "bounty", "hard");
    bossEnemy.bossType = bossType;
    return [bossEnemy, buildEnemyFromTemplate(wing, "bounty", "hard")];
  }

  const tank = getEnemyTypeById("bulwark") || ENEMY_TYPES[Math.min(3, ENEMY_TYPES.length - 1)];
  const escort = getEnemyTypeById("support-escort") || ENEMY_TYPES[0];
  const bossEnemy = buildEnemyFromTemplate(tank, "bounty", "elite");
  bossEnemy.bossType = bossType;
  return [bossEnemy, buildEnemyFromTemplate(escort, "escort", "hard")];
}

function showBossIntroOverlay() {
  const bossName = getSectorBossName(state.sectorNumber);
  const bossDescription = getSectorBossDescription(state.sectorNumber);

  hideComboBanner();
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Boss Contact";
  els.overlayText.textContent = `${bossName} detected. ${bossDescription}`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const engageBtn = document.createElement("button");
  engageBtn.className = "reward-option";
  engageBtn.innerHTML = `
    <div class="reward-name">Engage Boss</div>
    <div class="reward-meta">${bossDescription}</div>
  `;
  engageBtn.addEventListener("click", () => {
    state.pendingBoss = true;
    state.currentScreen = "combat";
    hideOverlay();
    beginEncounter();
  });

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Stand Down</div>
    <div class="reward-meta">Return to the map and prepare before the boss fight.</div>
  `;
  leaveBtn.addEventListener("click", () => {
    returnToMap();
  });

  els.rewardOptions.appendChild(engageBtn);
  els.rewardOptions.appendChild(leaveBtn);

  render();
}

function showGateOverlay() {
  const node = getCurrentNode();
  if (!node) return;

  hideComboBanner();
  clearNonCombatPresentation();
  state.pendingReward = true;

  els.overlayTitle.textContent = "Boss Contract";
  els.overlayText.textContent = state.gateUnlocked
    ? "High-value target located. Engage to complete the sector contract."
    : "Contract locked. Eliminate the elite target to reveal the boss.";
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  if (state.gateUnlocked) {
    const jumpBtn = document.createElement("button");
    jumpBtn.className = "reward-option";
    jumpBtn.innerHTML = `
      <div class="reward-name">Engage Boss Contract</div>
      <div class="reward-meta">Confront ${getSectorBossName(state.sectorNumber)} to unlock the next sector upgrade.</div>
    `;
    jumpBtn.addEventListener("click", () => {
      showBossIntroOverlay();
    });
    els.rewardOptions.appendChild(jumpBtn);
  }

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "reward-option";
  leaveBtn.innerHTML = `
    <div class="reward-name">Leave</div>
    <div class="reward-meta">Return to the map.</div>
  `;
  leaveBtn.addEventListener("click", () => {
    returnToMap();
  });
  els.rewardOptions.appendChild(leaveBtn);

  render();
}

function showShipUpgradeOverlay() {
  hideComboBanner();
  state.pendingReward = true;
  const flavor = getSectorUpgradeFlavor(state.sectorNumber);

  els.overlayTitle.textContent = flavor.title;
  els.overlayText.textContent = `${flavor.text} Current notoriety: ${getNotorietyLabel(state.notoriety)}.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const energyBtn = document.createElement("button");
  energyBtn.className = "reward-option";
  energyBtn.innerHTML = `
    <div class="reward-name">+1 Max Energy</div>
    <div class="reward-meta">Increase your base reactor output by 1.</div>
  `;
  energyBtn.addEventListener("click", () => {
    state.player.baseEnergy += 1;
    state.player.energy = state.player.baseEnergy + state.player.reactorBonus;
    hideOverlay();
    state.notoriety += 1;
    startNextSector();
  });

  const hullBtn = document.createElement("button");
  hullBtn.className = "reward-option";
  hullBtn.innerHTML = `
    <div class="reward-name">+10 Max Hull</div>
    <div class="reward-meta">Increase hull capacity and current hull by 10.</div>
  `;
  hullBtn.addEventListener("click", () => {
    state.player.maxHull += 10;
    state.player.hull += 10;
    hideOverlay();
    state.notoriety += 1;
    startNextSector();
  });

  const fuelBtn = document.createElement("button");
  fuelBtn.className = "reward-option";
  fuelBtn.innerHTML = `
    <div class="reward-name">+1 Max Fuel</div>
    <div class="reward-meta">Increase fuel tank capacity by 1.</div>
  `;
  fuelBtn.addEventListener("click", () => {
    state.player.maxFuel += 1;
    state.player.fuel = Math.min(state.player.fuel + 1, state.player.maxFuel);
    hideOverlay();
    state.notoriety += 1;
    startNextSector();
  });

  els.rewardOptions.appendChild(energyBtn);
  els.rewardOptions.appendChild(hullBtn);
  els.rewardOptions.appendChild(fuelBtn);

  render();
}

function showPlanetResolvedOverlay(title, text) {
  state.pendingReward = true;
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const btn = document.createElement("button");
  btn.className = "reward-option";
  btn.innerHTML = `
    <div class="reward-name">Continue</div>
    <div class="reward-meta">Return to the map.</div>
  `;
  btn.addEventListener("click", () => finishNodeAfterNonCombat());
  els.rewardOptions.appendChild(btn);
  render();
}

function resolvePlanetEvent() {
  const kinds = ["alien", "cache", "fuel", "tech", "radiation"];
  const kind = pickRandom(kinds);

  if (kind === "alien") {
    state.encounterIndex += 1;
    state.pendingPlanetAlienAmbush = true;
    beginEncounter();
    return;
  }

  clearNonCombatPresentation();
  state.pendingReward = true;

  if (kind === "cache") {
    state.runCredits += 30;
    log(`Planet: derelict cache — +30 credits. Total: ${state.runCredits}.`, "system");
    showPlanetResolvedOverlay("Planet", "Derelict cache: +30 credits.");
    return;
  }

  if (kind === "fuel") {
    state.player.fuel = Math.max(0, state.player.fuel - 1);
    log(`Planet: fuel leak — lost 1 fuel. Fuel: ${state.player.fuel}.`, "system");
    showPlanetResolvedOverlay("Planet", "Fuel leak: −1 fuel.");
    return;
  }

  if (kind === "tech") {
    const pool = shuffle(REWARD_POOL_IDS.slice());
    const cardId = pool[0];
    state.runDeck.push(cardId);
    const card = ALL_CARDS.find(c => c.id === cardId);
    const name = card ? card.name : cardId;
    log(`Planet: tech find — ${name} added to your deck.`, "system");
    showPlanetResolvedOverlay("Planet", `Tech find: ${name} added to your deck.`);
    return;
  }

  state.player.hull = Math.max(0, state.player.hull - 4);
  log(`Planet: radiation storm — took 4 hull damage. Hull: ${state.player.hull}.`, "enemy");
  if (state.player.hull <= 0) {
    showOverlay(
      "Run Failed",
      "Radiation exposure destroyed your ship.",
      "Restart Run",
      () => startRun()
    );
    return;
  }
  showPlanetResolvedOverlay("Planet", `Radiation storm: −4 hull (${state.player.hull} / ${state.player.maxHull}).`);
}

function chooseCreditsReward() {
  awardEncounterCredits();
  advanceAfterCombatRewards();
}

function showAmbushCreditsOnlyOverlay() {
  state.pendingReward = true;

  const creditReward = getCreditRewardForEncounter(state.encounterIndex);

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = `Low fuel — ambush. No card salvage. +${creditReward} credits.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const creditsBtn = document.createElement("button");
  creditsBtn.className = "reward-option";
  creditsBtn.innerHTML = `
    <div class="reward-name">Take Credits</div>
    <div class="reward-meta">Gain ${creditReward} credits and continue.</div>
  `;
  creditsBtn.addEventListener("click", chooseCreditsReward);

  els.rewardOptions.appendChild(creditsBtn);
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
  advanceAfterCombatRewards();
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
    trait: template.trait || null,
    difficulty: tier,
    maxHull: scaledMaxHull,
    hull: scaledMaxHull,
    block: 0,
    markStacks: 0,
    beamCharge: 0,
    role,
    turnCounter: 0,
    bossType: null,
    spawnedEscort: false,
    damageReduction: 0,
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

const AMBUSH_TEMPLATE = {
  id: "ambush",
  tier: "hard",
  build(encounterIndex, tier) {
    const bounty = ENEMY_TYPES[Math.min(encounterIndex + 1, ENEMY_TYPES.length - 1)];
    return [buildEnemyFromTemplate(bounty, "bounty", tier)];
  }
};

const PLANET_ALIEN_AMBUSH_TEMPLATE = {
  id: "planet-alien",
  tier: "hard",
  build(encounterIndex, tier) {
    const bounty = ENEMY_TYPES[Math.min(encounterIndex + 2, ENEMY_TYPES.length - 1)];
    return [buildEnemyFromTemplate(bounty, "bounty", tier)];
  }
};

const ELITE_CONTRACT_TEMPLATES = [
  {
    id: "elite-vanguard",
    build(encounterIndex, tier) {
      const bounty = ENEMY_TYPES[Math.min(encounterIndex + 3, ENEMY_TYPES.length - 1)];
      const escort = getEnemyTypeById("support-escort") || ENEMY_TYPES[0];
      return [buildEnemyFromTemplate(bounty, "bounty", tier), buildEnemyFromTemplate(escort, "escort", tier)];
    }
  },
  {
    id: "elite-breach",
    build(encounterIndex, tier) {
      const lead = ENEMY_TYPES[Math.min(encounterIndex + 3, ENEMY_TYPES.length - 1)];
      const wing = ENEMY_TYPES[Math.min(encounterIndex + 2, ENEMY_TYPES.length - 1)];
      return [buildEnemyFromTemplate(lead, "bounty", tier), buildEnemyFromTemplate(wing, "bounty", tier)];
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
  state.ambushEncounter = false;
  state.victoryFuelGranted = false;
  state.planetAlienAmbushCombat = false;
  state.eliteContractCombat = false;

  let tier;
  if (state.pendingBoss) {
    state.inBossCombat = true;
    state.pendingBoss = false;
    tier = "boss";
    state.encounterTier = tier;
    state.enemies = buildSectorBossEncounter(state.sectorNumber).slice(0, 2);
  } else if (state.pendingPlanetAlienAmbush) {
    state.pendingPlanetAlienAmbush = false;
    state.planetAlienAmbushCombat = true;
    tier = "medium";
    state.encounterTier = tier;
    state.enemies = PLANET_ALIEN_AMBUSH_TEMPLATE.build(state.encounterIndex, tier);
  } else if (state.pendingEliteContract) {
    state.pendingEliteContract = false;
    state.eliteContractCombat = true;
    tier = "elite";
    state.encounterTier = tier;
    const template = pickRandom(ELITE_CONTRACT_TEMPLATES);
    state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
  } else if (state.encounterIndex > 0) {
    const allowed = getAllowedTiersForEncounter(state.encounterIndex);
    tier = pickRandom(allowed);
    state.encounterTier = tier;
    const template = getCurrentEncounterTemplate(tier);
    state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
  } else {
    const allowed = getAllowedTiersForEncounter(state.encounterIndex);
    tier = pickRandom(allowed);
    state.encounterTier = tier;
    const template = getCurrentEncounterTemplate(tier);
    state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
  }
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

  if (state.inBossCombat) {
    log(
      `Encounter ${state.encounterIndex + 1} begins (BOSS • ${getSectorBossName(state.sectorNumber)}).`,
      "enemy"
    );
  } else {
    log(
      `Encounter ${state.encounterIndex + 1} begins (${tier.toUpperCase()}${state.planetAlienAmbushCombat ? " • PLANET AMBUSH" : state.eliteContractCombat ? " • ELITE CONTRACT" : state.ambushEncounter ? " • AMBUSH" : ""}).`,
      "enemy"
    );
  }

  drawCards(5);
  updateEnemyIntent();
  render();
}

function startRun(selectedShipId = "heavy-fighter") {
  state.selectedShipId = selectedShipId;
  const baseHull = getShipBaseHull(selectedShipId);
  state.player = {
    maxHull: baseHull,
    hull: baseHull,
    block: 0,
    baseEnergy: 3,
    energy: 3,
    weaponBonus: 0,
    shieldBonus: 0,
    reactorBonus: 0,
    maxFuel: 100,
    fuel: 100
  };

  state.runDeck = makeRunDeck(selectedShipId);
  state.runCredits = getShipStartingCredits(selectedShipId);
  state.nextAttackBonus = 0;
  state.attacksPlayedThisTurn = 0;
  state.pendingExtraction = false;
  state.encounterIndex = 0;
  state.rewardChoices = [];
  state.pendingReward = false;
  state.pendingPlanetAlienAmbush = false;
  state.planetAlienAmbushCombat = false;
  state.pendingEliteContract = false;
  state.eliteContractCombat = false;
  state.gateUnlocked = false;
  state.inBossCombat = false;
  state.pendingBoss = false;
  state.sectorNumber = 1;
  state.notoriety = 0;
  els.log.innerHTML = "";

  hideComboBanner();

  state.mapNodes = createSectorByNumber(state.sectorNumber);
  state.currentNodeId = "S";
  state.visitedNodeIds = ["S"];
  state.clearedNodeIds = [];
  state.currentScreen = "map";
  log(`Ship selected: ${getShipDisplayName(state.selectedShipId)}.`, "system");

  hideOverlay();
  render();
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

  if (enemy.trait === "overcharged") {
    amount = Math.floor(amount * 1.5);
    log(`${enemy.name} destabilizes under the hit.`, "system");
  }
  if (enemy.damageReduction) {
    amount = Math.floor(amount * (1 - enemy.damageReduction));
  }

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

  if (amount >= 10) log("⚡ LASER LOCKED!", "system");
  if (amount >= 20) log("🔥 FULL BEAM RELEASE!", "system");
  if (amount >= 30) log("💀 ANNIHILATION!", "system");

  if (amount >= 10) showComboBanner("⚡ LASER LOCKED");
  if (amount >= 20) showComboBanner("🔥 FULL BEAM RELEASE");
  if (amount >= 30) showComboBanner("💀 ANNIHILATION");

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
    enemy.turnCounter = (enemy.turnCounter || 0) + 1;
    if (enemy.bossType) {
      handleBossBehavior(enemy);
    }

    if (enemy.trait === "shielder" && enemy.hull > 0) {
      enemy.block += 3;
      log(`${enemy.name} fortifies for 3 block.`, "enemy");
    }

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
        if (enemy.trait === "jammer" && finalAmount > 0) {
          state.player.energy = Math.max(0, state.player.energy - 1);
          log(`${enemy.name} jams your systems. Lose 1 energy.`, "enemy");
        }
        break;
      }

      case "block":
        gainEnemyBlock(intent.amount, enemy.name);
        break;
    }

    enemy.attackReduction = 0;
  });

  alive.forEach(enemy => {
    if ((enemy.markStacks || 0) > 0) {
      enemy.markStacks = Math.max(0, enemy.markStacks - 1);
      log(`Mark decays on ${enemy.name}.`, "enemy");
    }
  });
}

function handleBossBehavior(enemy) {
  if (enemy.bossType === "patrol-commander") {
    enemy.block += 4;

    if (!enemy.spawnedEscort && enemy.hull < enemy.maxHull * 0.7) {
      enemy.spawnedEscort = true;
      spawnEscortEnemy();
      log("Patrol Commander calls reinforcements!", "enemy");
    }
  }

  if (enemy.bossType === "contract-warden") {
    state.player.energy = Math.max(0, state.player.energy - 1);

    if (enemy.turnCounter % 2 === 0) {
      enemy.block += 8;
    }
  }

  if (enemy.bossType === "blacksite-hunter") {
    const target = typeof getPlayerTargetEnemy === "function" ? getPlayerTargetEnemy() || enemy : enemy;
    target.markStacks = (target.markStacks || 0) + 2;

    if (enemy.turnCounter % 3 === 0) {
      enemy.damageReduction = 0.5;
      log("Blacksite Hunter shifts phase.", "enemy");
    } else {
      enemy.damageReduction = 0;
    }
  }
}

function spawnEscortEnemy() {
  const escortTemplate = getEnemyTypeById("support-escort") || ENEMY_TYPES[0];
  const escort = buildEnemyFromTemplate(escortTemplate, "escort", "medium");
  state.enemies.push(escort);
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
    state.planetAlienAmbushCombat = false;
    state.eliteContractCombat = false;
    state.inBossCombat = false;
    showOverlay(
      "Run Failed",
      "Your ship was destroyed. Restart and try again.",
      "Restart Run",
      () => startRun()
    );
    return;
  }

  state.runCredits += 5;
  log(`Cleanup bonus: +5 credits. Total credits: ${state.runCredits}.`, "system");

  const currentNode = getCurrentNode();
  if (
    state.combatEnded &&
    currentNode &&
    (currentNode.type === "combat" || currentNode.type === "elite") &&
    !state.clearedNodeIds.includes(currentNode.id)
  ) {
    state.clearedNodeIds.push(currentNode.id);
  }

  if (state.combatEnded && currentNode && currentNode.type === "elite") {
    state.gateUnlocked = true;
  }

  if (state.planetAlienAmbushCombat) {
    state.runCredits += 20;
    log(`Planet ambush bonus: +20 credits. Total credits: ${state.runCredits}.`, "system");
    state.planetAlienAmbushCombat = false;
  }

  if (state.eliteContractCombat) {
    state.runCredits += ELITE_CLEAR_BONUS;
    log(`Elite contract bonus: +${ELITE_CLEAR_BONUS} credits. Total credits: ${state.runCredits}.`, "system");
    state.eliteContractCombat = false;
  }

  if (state.inBossCombat) {
    state.inBossCombat = false;
    showShipUpgradeOverlay();
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

  if (state.ambushEncounter) {
    showAmbushCreditsOnlyOverlay();
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

let mapOverlayInProgress = false;

function render() {
  if (els.startScreen) {
    els.startScreen.classList.toggle("hidden", state.currentScreen !== "start");
  }
  if (els.shipSelectScreen) {
    els.shipSelectScreen.classList.toggle("hidden", state.currentScreen !== "ship-select");
  }
  if (els.mapScreen) {
    els.mapScreen.classList.toggle("hidden", state.currentScreen !== "map");
  }
  const showCombatShell = state.currentScreen === "combat";
  if (els.combatGrid) els.combatGrid.classList.toggle("hidden", !showCombatShell);
  if (els.controls) els.controls.classList.toggle("hidden", !showCombatShell);
  if (els.handSection) els.handSection.classList.toggle("hidden", !showCombatShell);
  if (els.logSection) els.logSection.classList.toggle("hidden", !showCombatShell);

  if (state.currentScreen === "start" || state.currentScreen === "ship-select") {
    return;
  }

  if (state.currentScreen === "map") {
    renderMapScreen();
    return;
  }
  els.playerHullText.textContent = `${state.player.hull} / ${state.player.maxHull}`;
  els.playerHullBar.style.width = `${(state.player.hull / state.player.maxHull) * 100}%`;
  els.playerBlockText.textContent = state.player.block;
  els.playerEnergyText.textContent = `${state.player.energy} / ${state.player.baseEnergy + state.player.reactorBonus}`;
  els.playerWeaponsText.textContent = `+${state.player.weaponBonus}`;
  els.playerShieldsText.textContent = `+${state.player.shieldBonus}`;
  els.playerReactorText.textContent = `+${state.player.reactorBonus}`;
  els.shipNameText.textContent = getShipDisplayName(state.selectedShipId);
  els.shipPassiveText.textContent = SHIP_PASSIVE_TEXT;
  els.creditsText.textContent = state.runCredits;
  if (els.fuelText) els.fuelText.textContent = state.player.fuel;

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
if (els.startRunFlowBtn) {
  els.startRunFlowBtn.addEventListener("click", () => {
    showShipSelection();
  });
}

showStartScreen();
