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
  bossCount: 0,
  endlessMode: false,
  gateUnlocked: false,
  inBossCombat: false,
  pendingBoss: false,
  shopInventory: [],
  selectedShipId: "heavy-fighter",
  lastCombatCreditsEarned: 0,
  run: {
    archetypeBias: {
      beam: 0,
      burn: 0,
      snub: 0,
      block: 0,
      mark: 0,
      economy: 0,
      drone: 0,
      overheat: 0
    },
    archetypeCounts: {
      beam: 0,
      burn: 0,
      snub: 0,
      block: 0,
      mark: 0,
      economy: 0,
      drone: 0,
      overheat: 0
    },
    committedArchetype: null,
    encounterCount: 0,
    miniComboSynergyShown: false
  }
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
  const baseCore = [
    "basic-attack",
    "basic-attack",
    "basic-attack",
    "basic-attack",
    "basic-attack",
    "basic-block",
    "basic-block",
    "basic-block",
    "basic-block",
    "basic-block"
  ];

  if (shipId === "heavy-fighter") {
    return [...baseCore, "charge-beam", "laser-pulse", "missile"];
  }

  if (shipId === "stealth-bomber") {
    return [...baseCore, "hunters-tag", "paint-the-target", "missile"];
  }

  if (shipId === "gunship") {
    return [...baseCore, "reinforce-shields", "shield-slam", "missile"];
  }

  if (shipId === "exploration-vessel") {
    return [...baseCore, "snub-reinforce", "snub-strike", "missile"];
  }

  if (shipId === "mining-ship") {
    return [...baseCore, "laser-drill", "laser-alignment", "missile"];
  }

  return [...baseCore, "charge-beam", "laser-pulse", "missile"];
}

function getShipArchetypeCardIds(shipId) {
  if (shipId === "mining-ship") return ["laser-drill", "laser-alignment"];
  return [];
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

function getMapNodeTooltip(node, currentNode) {
  if (!node) return "Unknown node.";

  let text = "Unknown node.";
  if (node.type === "start") {
    text = "Hangar. Starting point for this sector.";
  } else if (node.type === "combat") {
    const danger = (node.danger || "medium").toLowerCase();
    const threat = danger.charAt(0).toUpperCase() + danger.slice(1);
    text = `Combat. Standard encounter. Threat level: ${threat}.`;
  } else if (node.type === "dock") {
    text = "Dock. Repair and refuel opportunities.";
  } else if (node.type === "planet") {
    text = "Planet. Event node with possible risks or rewards.";
  } else if (node.type === "shop") {
    text = "Shop. Spend credits on cards, upgrades, or services.";
  } else if (node.type === "elite") {
    text = "Elite. Harder combat with better rewards.";
  } else if (node.type === "gate") {
    text = state.gateUnlocked
      ? "Boss Contract. Major boss encounter with powerful rewards."
      : "Boss Contract. Locked until the gate is opened.";
  } else if (node.type === "distress") {
    text = "Distress Signal. Unpredictable encounter with risk and reward.";
  } else if (node.type === "black-market") {
    text = "Black Market. Rare services or unusual offers.";
  } else {
    text = `${formatNodeLabel(node)} node.`;
  }

  const stateNotes = [];
  if (node.id === state.currentNodeId) {
    stateNotes.push("You are here.");
  } else if (currentNode && currentNode.neighbors.includes(node.id)) {
    stateNotes.push("Available to travel.");
  }
  if (isNodeVisited(node.id)) stateNotes.push("Previously visited.");
  if (isNodeCleared(node.id)) stateNotes.push("Encounter already completed.");
  if (node.type === "gate" && !state.gateUnlocked) stateNotes.push("Currently locked.");

  return stateNotes.length ? `${text} ${stateNotes.join(" ")}` : text;
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

function getNodeSymbol(node) {
  if (!node) return "?";
  if (node.type === "start") return "⌂";
  if (node.type === "combat") return "●";
  if (node.type === "dock") return "⬢";
  if (node.type === "planet") return "◉";
  if (node.type === "shop") return "$";
  if (node.type === "black-market") return "✦";
  if (node.type === "distress") return "!";
  if (node.type === "elite") return "☠";
  if (node.type === "gate") return "★";
  return "?";
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
      const edgeClass = isAdjacentEdge ? "map-edge map-edge-adjacent" : "map-edge map-edge-background";

      lineParts.push(`
        <line
          class="${edgeClass}"
          x1="${node.x}"
          y1="${node.y}"
          x2="${neighbor.x}"
          y2="${neighbor.y}"
        />
      `);
    }
  }

  for (const node of state.mapNodes) {
    const isCurrent = node.id === state.currentNodeId;
    const isVisited = isNodeVisited(node.id);
    const isCleared = isNodeCleared(node.id);
    const isAdjacent = currentNode.neighbors.includes(node.id);

    let fill = "#1c2c4a";
    if (node.type === "start") fill = "#ffd166";
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

    let stroke = "rgba(255,255,255,0.16)";
    let strokeWidth = 2;
    let opacity = 1;
    let cursor = "default";
    let radius = 23;
    const isInteractive = isCurrent || isAdjacent;
    const classParts = ["star-node"];
    const isImportant = node.type === "start" || node.type === "elite" || node.type === "gate";
    if (node.type === "start") radius = 29;
    if (node.type === "elite") radius = 27;
    if (node.type === "gate") radius = 31;

    if (isVisited) stroke = "rgba(121,188,255,0.65)";
    if (isCleared) opacity = 0.55;
    if (!isInteractive) opacity = Math.min(opacity, 0.58);
    if (node.type === "start") {
      stroke = "rgba(255, 230, 170, 0.95)";
      strokeWidth = 3;
    }
    if (isCurrent) {
      stroke = "#ffe08a";
      strokeWidth = 5;
      cursor = "pointer";
    } else if (isAdjacent) {
      stroke = "#8fceff";
      strokeWidth = 3.8;
      cursor = "pointer";
    }
    if (isCurrent) classParts.push("is-current");
    if (isAdjacent && !isCurrent) classParts.push("is-adjacent");
    if (isVisited) classParts.push("is-visited");
    if (isCleared) classParts.push("is-cleared");
    if (isInteractive) classParts.push("is-interactive");
    if (node.type === "start") classParts.push("is-start");
    if (node.type === "elite") classParts.push("is-elite");
    if (node.type === "gate") classParts.push("is-gate");
    if (node.type === "shop") classParts.push("is-shop");
    if (node.type === "dock") classParts.push("is-dock");

    const tooltipText = getMapNodeTooltip(node, currentNode);
    nodeParts.push(`
      <g class="${classParts.join(" ")}" data-node-id="${node.id}" data-node-type="${node.type}" data-tooltip="${tooltipText}" data-interactive="${isInteractive ? "true" : "false"}" style="cursor:${cursor}; opacity:${opacity}">
        ${
          node.type === "gate"
            ? `<circle class="boss-node-glow" cx="${node.x}" cy="${node.y}" r="${radius + 10}" fill="none" stroke="${state.gateUnlocked ? "rgba(255, 220, 120, 0.72)" : "rgba(220, 230, 250, 0.3)"}" stroke-width="2.4" />`
            : ""
        }
        ${
          node.type === "start"
            ? `<circle cx="${node.x}" cy="${node.y}" r="${radius + 6}" fill="none" stroke="rgba(255, 225, 155, 0.5)" stroke-width="2.2" />`
            : ""
        }
        ${
          node.type === "elite"
            ? `<circle cx="${node.x}" cy="${node.y}" r="${radius + 5}" fill="none" stroke="rgba(255, 105, 105, 0.5)" stroke-width="2" />`
            : ""
        }
        <circle
          class="star-node-core"
          cx="${node.x}"
          cy="${node.y}"
          r="${radius}"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
        />
        <text class="star-node-symbol" x="${node.x}" y="${node.y + 6}" text-anchor="middle" font-size="18" font-weight="800" fill="#e6f0ff">
          ${getNodeSymbol(node)}
        </text>
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
  if (type === "disrupt") return "Will disrupt systems";
  return type === "attack" ? `Attack for ${amount}` : `Will gain ${amount} block`;
}

const SYSTEM_CARDS = [
  {
    id: "basic-attack",
    name: "Basic Attack",
    type: "system",
    cost: 1,
    description: "Deal 5 damage.",
    effect() {
      dealAttackDamageToEnemy(5, "Basic Attack");
    }
  },
  {
    id: "basic-block",
    name: "Basic Block",
    type: "system",
    cost: 1,
    description: "Gain 5 block.",
    effect() {
      gainPlayerBlock(5 + (state.player.shieldBonus || 0), "Basic Block");
    }
  },
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
    id: "laser-drill",
    name: "Laser Drill",
    type: "system",
    cost: 1,
    description: "Deal 4 damage. Apply 2 Burn.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;

      dealAttackDamageToEnemy(4, "Laser Drill");
      enemy.burnStacks = (enemy.burnStacks || 0) + 2;

      log("Laser Drill applies 2 Burn.", "system");
    }
  },
  {
    id: "laser-alignment",
    name: "Laser Alignment",
    type: "system",
    cost: 1,
    description: "Gain 2 Laser. Burn deals +1 damage this combat.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;

      enemy.laserStacks = (enemy.laserStacks || 0) + 2;
      state.player.burnBonus = (state.player.burnBonus || 0) + 1;

      log("Laser Alignment improves burn output.", "system");
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
    id: "shield-slam",
    name: "Shield Slam",
    type: "system",
    cost: 1,
    description: "Deal damage equal to your Block.",
    effect() {
      dealAttackDamageToEnemy(state.player.block || 0, "Shield Slam");
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
    id: "snub-reinforce",
    name: "Snub Reinforcement",
    type: "system",
    cost: 1,
    description: "Snub gains +2 max HP and heals 2 this combat.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      snub.maxHull += 2;
      snub.hull = Math.min(snub.maxHull, snub.hull + 2);
      log("Snub Reinforcement upgrades the snub for this combat.", "system");
    }
  },
  {
    id: "snub-strike",
    name: "Snub Strike",
    type: "system",
    cost: 1,
    description: "Snub deals damage equal to current hull.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      dealAttackDamageToEnemy(snub.hull || 0, "Snub Strike");
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
      gainCredits(credits, "Bounty Collection");
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
  },
  {
    id: "overdrive-cannon",
    name: "Overdrive Cannon",
    type: "system",
    cost: 1,
    description: "Deal 12 damage. Gain 2 Heat.",
    effect() {
      dealAttackDamageToEnemy(12, "Overdrive Cannon");
      state.player.heat = (state.player.heat || 0) + 2;
      log("Overdrive Cannon builds 2 Heat.", "system");
    }
  },
  {
    id: "vent-systems",
    name: "Vent Systems",
    type: "system",
    cost: 1,
    description: "Remove all Heat. Gain block equal to Heat removed.",
    effect() {
      const heat = state.player.heat || 0;
      state.player.heat = 0;
      gainPlayerBlock(heat + (state.player.shieldBonus || 0), "Vent Systems");
      log(`Vent Systems purges ${heat} Heat.`, "system");
    }
  },
  {
    id: "cloak",
    name: "Cloak",
    type: "system",
    cost: 1,
    description: "Gain Stealth. Next attack deals double.",
    effect() {
      state.player.stealthReady = true;
      log("Cloak engaged. Next attack is doubled.", "system");
    }
  },
  {
    id: "ambush-strike",
    name: "Ambush Strike",
    type: "system",
    cost: 1,
    description: "Deal 6 damage. Double if Stealth is active.",
    effect() {
      dealAttackDamageToEnemy(6, "Ambush Strike");
    }
  },
  {
    id: "fortify-hull",
    name: "Fortify Hull",
    type: "system",
    cost: 1,
    description: "Gain scaling block this turn.",
    effect() {
      const block = 3 + (state.turn || 1);
      gainPlayerBlock(block + (state.player.shieldBonus || 0), "Fortify Hull");
      log(`Fortify Hull gains ${block} block.`, "system");
    }
  },
  {
    id: "reinforced-plating",
    name: "Reinforced Plating",
    type: "system",
    cost: 1,
    description: "Reduce incoming damage by 1 this combat.",
    effect() {
      state.player.damageReductionFlat = (state.player.damageReductionFlat || 0) + 1;
      log("Reinforced Plating improves damage resistance.", "system");
    }
  },
  {
    id: "deploy-drone",
    name: "Deploy Drone",
    type: "system",
    cost: 1,
    description: "Deploy a drone unit.",
    effect() {
      state.player.drones = (state.player.drones || 0) + 1;
      log("Drone deployed.", "system");
    }
  },
  {
    id: "swarm-command",
    name: "Swarm Command",
    type: "system",
    cost: 1,
    description: "All drones deal damage.",
    effect() {
      const drones = state.player.drones || 0;
      if (drones <= 0) return;
      dealAttackDamageToEnemy(drones * 3, "Swarm Command");
      log(`Swarm Command triggers ${drones} drones.`, "system");
    }
  },
  {
    id: "extract-resources",
    name: "Extract Resources",
    type: "system",
    cost: 1,
    description: "Gain 3 credits.",
    effect() {
      gainCredits(3, "Extract Resources");
    }
  },
  {
    id: "overclock-drill",
    name: "Overclock Drill",
    type: "system",
    cost: 1,
    description: "Spend 3 credits to gain 2 Laser.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      if (state.runCredits < 3) return;
      state.runCredits -= 3;
      if (state.player) state.player.credits = state.runCredits;
      enemy.laserStacks = (enemy.laserStacks || 0) + 2;
      log("Overclock Drill converts credits into Laser.", "system");
    }
  },
  {
    id: "overheat-cycle",
    name: "Overheat Cycle",
    type: "system",
    cost: 1,
    description: "Apply 2 Burn. Gain 1 Heat.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.burnStacks = (enemy.burnStacks || 0) + 2;
      state.player.heat = (state.player.heat || 0) + 1;
      log("Overheat Cycle builds Heat and Burn.", "system");
    }
  },
  {
    id: "industrial-beam",
    name: "Industrial Beam",
    type: "system",
    cost: 2,
    description: "Deal 5 damage. +2 per Burn.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const burn = enemy.burnStacks || 0;
      dealAttackDamageToEnemy(5 + burn * 2, "Industrial Beam");
    }
  },
  {
    id: "thermal-collapse",
    name: "Thermal Collapse",
    type: "system",
    cost: 2,
    description: "Consume Burn. Deal damage equal to Burn x3.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const burn = enemy.burnStacks || 0;
      if (burn <= 0) return;
      enemy.burnStacks = 0;
      dealAttackDamageToEnemy(burn * 3, "Thermal Collapse");
    }
  },
  {
    id: "snub-rebuild",
    name: "Snub Rebuild",
    type: "system",
    cost: 1,
    description: "Restore Snub to full and +1 max HP.",
    effect() {
      const snub = state.player?.snub;
      if (!snub) return;
      snub.maxHull += 1;
      snub.alive = true;
      snub.hull = snub.maxHull;
      snub.respawnCounter = 0;
      log("Snub Rebuild fully restores the snub.", "system");
    }
  },
  {
    id: "escort-protocol",
    name: "Escort Protocol",
    type: "system",
    cost: 1,
    description: "Snub gains +2 max HP and heals 2.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      snub.maxHull += 2;
      snub.hull = Math.min(snub.maxHull, snub.hull + 2);
      log("Escort Protocol reinforces the snub.", "system");
    }
  },
  {
    id: "snub-commander",
    name: "Snub Commander",
    type: "system",
    cost: 2,
    description: "Snub strikes for 2 + Snub max HP damage.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      dealAttackDamageToEnemy(2 + (snub.maxHull || 0), "Snub Commander");
    }
  },
  {
    id: "barricade-core",
    name: "Barricade Core",
    type: "system",
    cost: 1,
    description: "Gain 6 block. Block cards gain +1 this combat.",
    effect() {
      gainPlayerBlock(6 + (state.player.shieldBonus || 0), "Barricade Core");
      state.player.shieldBonus = (state.player.shieldBonus || 0) + 1;
      log("Barricade Core fortifies shield systems.", "system");
    }
  },
  {
    id: "shield-battery",
    name: "Shield Battery",
    type: "system",
    cost: 1,
    description: "Gain 10 block.",
    effect() {
      gainPlayerBlock(10 + (state.player.shieldBonus || 0), "Shield Battery");
    }
  },
  {
    id: "impact-conversion",
    name: "Impact Conversion",
    type: "system",
    cost: 1,
    description: "Deal damage equal to your Block.",
    effect() {
      dealAttackDamageToEnemy(state.player.block || 0, "Impact Conversion");
    }
  },
  {
    id: "assassination-protocol",
    name: "Assassination Protocol",
    type: "system",
    cost: 1,
    description: "Apply 3 Mark.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.markStacks = (enemy.markStacks || 0) + 3;
      log("Assassination Protocol applies 3 Mark.", "system");
    }
  },
  {
    id: "precision-strike",
    name: "Precision Strike",
    type: "system",
    cost: 2,
    description: "Deal 6 damage. +2 per Mark.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const mark = enemy.markStacks || 0;
      dealAttackDamageToEnemy(6 + mark * 2, "Precision Strike");
    }
  },
  {
    id: "power-conduit",
    name: "Power Conduit",
    type: "system",
    cost: 1,
    description: "Charge +2 Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) + 2;
      log("Power Conduit increases Beam charge.", "system");
    }
  },
  {
    id: "beam-overload",
    name: "Beam Overload",
    type: "system",
    cost: 1,
    description: "Double Beam. Deal 2 damage.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) * 2;
      dealAttackDamageToEnemy(2, "Beam Overload");
    }
  },
  {
    id: "focused-beam",
    name: "Focused Beam",
    type: "system",
    cost: 2,
    description: "Deal 8 damage. +3 per Beam. Consume all Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const beam = enemy.beamCharge || 0;
      enemy.beamCharge = 0;
      dealAttackDamageToEnemy(8 + beam * 3, "Focused Beam");
    }
  },
  {
    id: "launch-support",
    name: "Launch Support",
    type: "system",
    cost: 1,
    description: "Snub heals 2. Gain 4 block.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      snub.hull = Math.min(snub.maxHull || 5, (snub.hull || 0) + 2);
      gainPlayerBlock(4 + (state.player.shieldBonus || 0), "Launch Support");
      log("Launch Support stabilizes your snub.", "system");
    }
  },
  {
    id: "reinforced-frame",
    name: "Reinforced Frame",
    type: "system",
    cost: 1,
    description: "Snub gains +3 max HP and heals 1.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      snub.maxHull += 3;
      snub.hull = Math.min(snub.maxHull, snub.hull + 1);
      log("Reinforced Frame strengthens the snub.", "system");
    }
  },
  {
    id: "synchronized-assault",
    name: "Synchronized Assault",
    type: "system",
    cost: 2,
    description: "Snub deals double its current hull as damage.",
    effect() {
      const snub = state.player?.snub;
      if (!snub || !snub.alive) return;
      dealAttackDamageToEnemy((snub.hull || 0) * 2, "Synchronized Assault");
    }
  },
  {
    id: "deploy-swarm",
    name: "Deploy Swarm",
    type: "system",
    cost: 1,
    description: "Deploy 2 drones.",
    effect() {
      state.player.drones = (state.player.drones || 0) + 2;
      log("Deploy Swarm launches 2 drones.", "system");
    }
  },
  {
    id: "drone-uplink",
    name: "Drone Uplink",
    type: "system",
    cost: 1,
    description: "Drone attacks gain +1 damage this combat.",
    effect() {
      state.player.droneDamageBonus = (state.player.droneDamageBonus || 0) + 1;
      log("Drone Uplink boosts swarm damage.", "system");
    }
  },
  {
    id: "swarm-strike",
    name: "Swarm Strike",
    type: "system",
    cost: 1,
    description: "Deal damage per drone.",
    effect() {
      const drones = state.player.drones || 0;
      if (drones <= 0) return;
      const perDrone = 2 + (state.player.droneDamageBonus || 0);
      dealAttackDamageToEnemy(drones * perDrone, "Swarm Strike");
    }
  },
  {
    id: "drone-shielding",
    name: "Drone Shielding",
    type: "system",
    cost: 1,
    description: "Gain 2 block per drone.",
    effect() {
      const drones = state.player.drones || 0;
      const block = drones * 2;
      if (block <= 0) return;
      gainPlayerBlock(block + (state.player.shieldBonus || 0), "Drone Shielding");
    }
  },
  {
    id: "thermal-spread",
    name: "Thermal Spread",
    type: "system",
    cost: 1,
    description: "Apply 3 Burn to the selected target.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.burnStacks = (enemy.burnStacks || 0) + 3;
      log("Thermal Spread applies 3 Burn.", "system");
    }
  },
  {
    id: "heat-shielding",
    name: "Heat Shielding",
    type: "system",
    cost: 1,
    description: "Gain block equal to target Burn.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const burn = enemy.burnStacks || 0;
      gainPlayerBlock(burn + (state.player.shieldBonus || 0), "Heat Shielding");
    }
  },
  {
    id: "smoldering-core",
    name: "Smoldering Core",
    type: "system",
    cost: 1,
    description: "Burn deals +2 damage this combat.",
    effect() {
      state.player.burnBonus = (state.player.burnBonus || 0) + 2;
      log("Smoldering Core amplifies burn output.", "system");
    }
  },
  {
    id: "salvage-run",
    name: "Salvage Run",
    type: "system",
    cost: 1,
    description: "Gain 5 credits.",
    effect() {
      gainCredits(5, "Salvage Run");
    }
  },
  {
    id: "liquidate-assets",
    name: "Liquidate Assets",
    type: "system",
    cost: 1,
    description: "Spend up to 6 credits. Deal that much damage.",
    effect() {
      const spend = Math.min(6, state.runCredits);
      if (spend <= 0) return;
      state.runCredits -= spend;
      if (state.player) state.player.credits = state.runCredits;
      dealAttackDamageToEnemy(spend, "Liquidate Assets");
      log(`Liquidate Assets spends ${spend} credits.`, "system");
    }
  },
  {
    id: "defensive-contracts",
    name: "Defensive Contracts",
    type: "system",
    cost: 1,
    description: "Spend up to 6 credits. Gain that much block.",
    effect() {
      const spend = Math.min(6, state.runCredits);
      if (spend <= 0) return;
      state.runCredits -= spend;
      if (state.player) state.player.credits = state.runCredits;
      gainPlayerBlock(spend + (state.player.shieldBonus || 0), "Defensive Contracts");
      log(`Defensive Contracts spends ${spend} credits.`, "system");
    }
  },
  {
    id: "compound-interest",
    name: "Compound Interest",
    type: "system",
    cost: 1,
    description: "Gain 2 credits plus 20% of your current credits.",
    effect() {
      const bonus = Math.floor((state.runCredits || 0) * 0.2);
      gainCredits(2 + bonus, "Compound Interest");
    }
  },
  {
    id: "black-market-fuel",
    name: "Black Market Fuel",
    type: "system",
    cost: 1,
    description: "Spend 3 credits to gain 2 Laser.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      if (state.runCredits < 3) return;
      state.runCredits -= 3;
      if (state.player) state.player.credits = state.runCredits;
      enemy.laserStacks = (enemy.laserStacks || 0) + 2;
      log("Black Market Fuel converts credits into Laser.", "system");
    }
  },
  {
    id: "overclocked-extraction",
    name: "Overclocked Extraction",
    type: "system",
    cost: 1,
    description: "Gain 3 credits and +1 Laser.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      gainCredits(3, "Overclocked Extraction");
      enemy.laserStacks = (enemy.laserStacks || 0) + 1;
      log("Overclocked Extraction boosts mining output.", "system");
    }
  },
  {
    id: "heat-sink",
    name: "Heat Sink",
    type: "system",
    cost: 1,
    description: "Lose all Heat. Gain block equal to Heat lost.",
    effect() {
      const heat = state.player.heat || 0;
      if (heat <= 0) return;
      state.player.heat = 0;
      gainPlayerBlock(heat + (state.player.shieldBonus || 0), "Heat Sink");
      log(`Heat Sink vents ${heat} Heat into shielding.`, "system");
    }
  },
  {
    id: "pressure-build",
    name: "Pressure Build",
    type: "system",
    cost: 1,
    description: "Generate 2 Heat.",
    effect() {
      state.player.heat = (state.player.heat || 0) + 2;
      log("Pressure Build increases reactor heat.", "system");
    }
  },
  {
    id: "thermal-spike",
    name: "Thermal Spike",
    type: "system",
    cost: 1,
    description: "Deal damage equal to 3 + Heat.",
    effect() {
      const heat = state.player.heat || 0;
      dealAttackDamageToEnemy(3 + heat, "Thermal Spike");
    }
  },
  {
    id: "reactor-surge",
    name: "Reactor Surge",
    type: "system",
    cost: 1,
    description: "Double current Heat.",
    effect() {
      state.player.heat = (state.player.heat || 0) * 2;
      log("Reactor Surge doubles current Heat.", "system");
    }
  },
  {
    id: "meltdown-protocol",
    name: "Meltdown Protocol",
    type: "system",
    cost: 2,
    description: "Consume all Heat. Deal 6 + Heat x3 damage.",
    effect() {
      const heat = state.player.heat || 0;
      state.player.heat = 0;
      dealAttackDamageToEnemy(6 + heat * 3, "Meltdown Protocol");
      log("Meltdown Protocol discharges reactor overload.", "system");
    }
  },
  {
    id: "unstable-core",
    name: "Unstable Core",
    type: "system",
    cost: 0,
    description: "Gain 4 Heat. Take 2 hull damage.",
    effect() {
      state.player.heat = (state.player.heat || 0) + 4;
      state.player.hull = Math.max(0, state.player.hull - 2);
      log("Unstable Core spikes reactor output at a cost.", "system");
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

const CARD_TAGS_BY_ID = {
  "charge-beam": ["beam"],
  "laser-pulse": ["beam"],
  "full-beam": ["beam", "ultra"],
  overfocus: ["beam"],
  "target-lock": ["beam"],
  recalibrate: ["beam"],

  "hunters-tag": ["mark"],
  "paint-the-target": ["mark"],
  "pursuit-sweep": ["mark"],
  "claim-shot": ["mark"],
  "dead-or-alive": ["mark", "ultra"],
  "tracking-burst": ["mark"],
  "signal-flare": ["mark"],
  "glint-strike": ["mark"],
  "hard-lock": ["mark"],

  "reinforce-shields": ["block"],
  "shield-slam": ["block"],
  "collection-sweep": ["block"],
  "skirmish-step": ["block"],
  brace: ["block"],

  "snub-reinforce": ["snub"],
  "snub-strike": ["snub"],

  "laser-drill": ["burn"],
  "laser-alignment": ["burn"],
  "overdrive-cannon": ["overheat"],
  "vent-systems": ["overheat"],
  cloak: ["stealth"],
  "ambush-strike": ["stealth"],
  "fortify-hull": ["fortress"],
  "reinforced-plating": ["fortress"],
  "deploy-drone": ["drone"],
  "swarm-command": ["drone"],
  "extract-resources": ["economy"],
  "overclock-drill": ["economy"],
  "overheat-cycle": ["burn"],
  "industrial-beam": ["burn"],
  "thermal-collapse": ["burn"],
  "snub-rebuild": ["snub"],
  "escort-protocol": ["snub"],
  "snub-commander": ["snub"],
  "barricade-core": ["block"],
  "shield-battery": ["block"],
  "impact-conversion": ["block"],
  "assassination-protocol": ["mark"],
  "precision-strike": ["mark"],
  "power-conduit": ["beam"],
  "beam-overload": ["beam"],
  "focused-beam": ["beam"],
  "launch-support": ["snub"],
  "reinforced-frame": ["snub"],
  "synchronized-assault": ["snub"],
  "deploy-swarm": ["drone"],
  "drone-uplink": ["drone"],
  "swarm-strike": ["drone"],
  "drone-shielding": ["drone"],
  "thermal-spread": ["burn"],
  "heat-shielding": ["burn"],
  "smoldering-core": ["burn"],
  "salvage-run": ["economy"],
  "liquidate-assets": ["economy"],
  "defensive-contracts": ["economy"],
  "compound-interest": ["economy"],
  "black-market-fuel": ["burn", "economy"],
  "overclocked-extraction": ["burn", "economy"],
  "heat-sink": ["overheat"],
  "pressure-build": ["overheat"],
  "thermal-spike": ["overheat"],
  "reactor-surge": ["overheat"],
  "meltdown-protocol": ["overheat"],
  "unstable-core": ["overheat"],

  "basic-attack": ["neutral"],
  "basic-block": ["neutral"],
  "pulse-shot": ["neutral"],
  "patch-hull": ["neutral"],
  missile: ["neutral"],
  "debug-delete": ["neutral"],

  "finishing-shot": ["ultra"],
  "execution-barrage": ["ultra"]
};

ALL_CARDS.forEach(card => {
  card.tags = [...(CARD_TAGS_BY_ID[card.id] || [])];
  if (card.tags.includes("block") || card.tags.includes("overheat")) {
    card.timing = "early";
  } else if (card.tags.includes("mark") || card.tags.includes("snub")) {
    card.timing = "mid";
  } else if (card.tags.includes("burn") || card.tags.includes("drone")) {
    card.timing = "late";
  } else {
    card.timing = "mid";
  }
});

function getShipArchetype(shipId) {
  if (shipId === "heavy-fighter") return "beam";
  if (shipId === "stealth-bomber") return "mark";
  if (shipId === "gunship") return "block";
  if (shipId === "exploration-vessel") return "snub";
  if (shipId === "mining-ship") return "burn";
  return "neutral";
}

function getCommittedArchetype() {
  const bias = state.run?.archetypeBias;
  if (!bias) return null;
  const entries = Object.entries(bias).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [topTag, topValue] = entries[0];
  const secondValue = entries[1] ? entries[1][1] : 0;
  if (topValue >= 4 && topValue - secondValue >= 2) return topTag;
  return null;
}

function getRewardPool() {
  const archetype = getShipArchetype(state.selectedShipId);
  const committed = state.run?.committedArchetype || null;
  const allowedArchetype = committed || archetype;
  const earlyRun = (state.run?.encounterCount || 0) <= 2;

  return ALL_CARDS.filter(card => {
    const tags = card.tags || [];
    if (earlyRun && card.timing === "late") return false;

    if (tags.includes("commit")) {
      return Boolean(committed && tags.includes(committed));
    }
    if (tags.includes(allowedArchetype)) return true;
    if (tags.includes("neutral")) return true;
    if (!state.endlessMode && tags.includes("ultra") && Math.random() < 0.1) return true;

    return false;
  });
}

function getRewardBiasStrength(encounterIndex) {
  if (encounterIndex <= 1) return 0.35;
  if (encounterIndex <= 3) return 0.7;
  return 1.05;
}

function getTimingWeightMultiplier(timing) {
  const encounterCount = state.run?.encounterCount || 0;
  if (encounterCount <= 2) {
    if (timing === "early") return 1.4;
    if (timing === "late") return 0.65;
    return 1.0;
  }
  if (encounterCount <= 5) {
    if (timing === "mid") return 1.35;
    return 1.0;
  }
  if (timing === "late") return 1.75;
  if (timing === "early") return 0.75;
  return 1.0;
}

function getCardRewardWeight(card) {
  const tags = card.tags || [];
  const bias = state.run?.archetypeBias || {};
  const committed = state.run?.committedArchetype || null;
  const scale = getRewardBiasStrength(state.encounterIndex);
  const earlyRun = (state.run?.encounterCount || 0) <= 2;
  const earlyDirectionWindow = (state.run?.encounterCount || 0) <= 3;
  const shipArchetype = getShipArchetype(state.selectedShipId);
  let weight = 1;

  tags.forEach(tag => {
    const tagBias = bias[tag] || 0;
    if (tagBias > 0) {
      weight += tagBias * 0.8 * scale;
    }
  });

  if (committed && tags.includes(committed)) {
    weight *= 2.4;
  }
  if (committed && tags.includes("commit") && tags.includes(committed)) {
    weight *= 1.6;
  }
  if (earlyDirectionWindow && tags.includes(shipArchetype)) {
    weight *= 1.2;
  }

  if (earlyRun && tags.includes("neutral")) {
    weight *= 1.35;
  }
  if (earlyRun && tags.includes("beam")) {
    weight *= 0.78;
  }
  if (earlyRun) {
    const ownedCopies = (state.runDeck || []).filter(id => id === card.id).length;
    if (ownedCopies > 0) {
      weight *= 1 / (1 + ownedCopies * 0.45);
    }
  }

  weight *= getArchetypeBalanceMultiplier(card);
  weight *= getTimingWeightMultiplier(card.timing);

  return Math.max(0.01, weight);
}

const MINI_COMBO_PAYOFF_IDS = new Set([
  "full-beam",
  "focused-beam",
  "beam-overload",
  "thermal-collapse",
  "industrial-beam",
  "meltdown-protocol",
  "synchronized-assault",
  "snub-commander",
  "swarm-strike",
  "liquidate-assets",
  "defensive-contracts",
  "impact-conversion",
  "precision-strike",
  "overclock-drill",
  "black-market-fuel"
]);

function isMiniComboPayoffCard(card) {
  return Boolean(card && MINI_COMBO_PAYOFF_IDS.has(card.id));
}

function pickWeightedCardFromPool(pool, predicate, excludedIds = new Set()) {
  const eligible = pool.filter(card => predicate(card) && !excludedIds.has(card.id));
  if (eligible.length === 0) return null;
  const [picked] = pickWeightedRewardCards(eligible, 1);
  return picked || null;
}

function applyMiniComboRewardRules(pool, picks, choiceCount) {
  let result = [...picks];
  const encounterCount = state.run?.encounterCount || 0;
  const committed = state.run?.committedArchetype || null;
  const shipArchetype = committed || getShipArchetype(state.selectedShipId);
  const counts = state.run?.archetypeCounts || {};

  if (encounterCount <= 3 && !committed) {
    const highest = Math.max(
      counts.beam || 0,
      counts.burn || 0,
      counts.snub || 0,
      counts.block || 0,
      counts.mark || 0,
      counts.economy || 0,
      counts.drone || 0,
      counts.overheat || 0
    );
    const hasArchetypeCard = result.some(card => (card.tags || []).includes(shipArchetype));
    if (highest < 2 && !hasArchetypeCard) {
      const replacement = pickWeightedCardFromPool(pool, card => (card.tags || []).includes(shipArchetype));
      if (replacement) {
        result[0] = replacement;
      }
    }
  }

  if (encounterCount >= 3 && encounterCount <= 5) {
    let payoffSeen = false;
    result = result.filter(card => {
      if (!isMiniComboPayoffCard(card)) return true;
      if (!payoffSeen) {
        payoffSeen = true;
        return true;
      }
      return false;
    });

    while (result.length < choiceCount) {
      const excluded = new Set(result.map(card => card.id));
      const fill = pickWeightedCardFromPool(pool, card => !isMiniComboPayoffCard(card), excluded);
      if (!fill) break;
      result.push(fill);
    }
  }

  if (encounterCount >= 4 && encounterCount <= 5 && !state.run?.miniComboSynergyShown) {
    const hasPayoff = result.some(isMiniComboPayoffCard);
    if (!hasPayoff) {
      const excluded = new Set(result.map(card => card.id));
      const payoff = pickWeightedCardFromPool(pool, isMiniComboPayoffCard, excluded);
      if (payoff) {
        if (result.length >= choiceCount) result[result.length - 1] = payoff;
        else result.push(payoff);
      }
    }
    if (result.some(isMiniComboPayoffCard)) {
      state.run.miniComboSynergyShown = true;
    }
  }

  return result.slice(0, choiceCount);
}

function getArchetypeBalanceMultiplier(card) {
  const run = state.run;
  if (!run || run.committedArchetype) return 1;
  if ((run.encounterCount || 0) > 3) return 1;
  const counts = run.archetypeCounts || {};
  const keys = ["burn", "economy", "snub", "drone", "beam", "overheat", "mark", "block"];
  const trackedTags = (card.tags || []).filter(tag => keys.includes(tag));
  if (trackedTags.length === 0) return 1;
  const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const mean = total / keys.length;
  const cardMean = trackedTags.reduce((sum, tag) => sum + (counts[tag] || 0), 0) / trackedTags.length;
  const delta = mean - cardMean;
  const adjust = Math.max(-0.12, Math.min(0.12, delta * 0.08));
  return 1 + adjust;
}

function pickWeightedRewardCards(pool, count) {
  const available = [...pool];
  const picks = [];

  while (picks.length < count && available.length > 0) {
    let totalWeight = 0;
    const weighted = available.map(card => {
      const weight = getCardRewardWeight(card);
      totalWeight += weight;
      return { card, weight };
    });

    let roll = Math.random() * totalWeight;
    let pickedIndex = weighted.length - 1;
    for (let i = 0; i < weighted.length; i += 1) {
      roll -= weighted[i].weight;
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }

    picks.push(weighted[pickedIndex].card);
    available.splice(pickedIndex, 1);
  }

  return picks;
}

function applyCardToArchetypeBias(cardId) {
  const card = getCardById(cardId);
  if (!card || !card.tags || !state.run || !state.run.archetypeBias) return;
  card.tags.forEach(tag => {
    if (typeof state.run.archetypeBias[tag] === "number") {
      state.run.archetypeBias[tag] += 1;
    }
    if (state.run.archetypeCounts && typeof state.run.archetypeCounts[tag] === "number") {
      state.run.archetypeCounts[tag] += 1;
    }
  });
  if (!state.run.committedArchetype) {
    const committed = getCommittedArchetype();
    if (committed) {
      state.run.committedArchetype = committed;
      log(`Run commitment formed: ${committed.toUpperCase()} archetype locked in.`, "system");
    }
  }
}

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
  recalibrate: "mark",
  "overdrive-cannon": "beam",
  "vent-systems": "beam",
  cloak: "tactical",
  "ambush-strike": "tactical",
  "fortify-hull": "system",
  "reinforced-plating": "system",
  "deploy-drone": "system",
  "swarm-command": "tactical",
  "extract-resources": "system",
  "overclock-drill": "system"
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
    id: "sentinel-frigate",
    name: "Sentinel Frigate",
    difficulty: "boss",
    maxHull: 58,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 7, text: "Attack for 7" },
        { type: "block", amount: 8, text: "Will gain 8 block" },
        { type: "disrupt", amount: 0, text: "Will disrupt systems" },
        { type: "attack", amount: 12, text: "Overcharge Cannon for 12" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "scout",
    name: "Scout Drone",
    difficulty: "easy",
    trait: "overcharged",
    counter: "beam-dampener",
    maxHull: 18,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 6, text: "Attack for 6" },
        { type: "attack", amount: 5, text: "Attack for 5" },
        { type: "block", amount: 4, text: "Will gain 4 block" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "raider",
    name: "Raider Skiff",
    difficulty: "medium",
    counter: "burn-purge",
    maxHull: 21,
    getIntent(turn) {
      const cycle = [
        { type: "block", amount: 6, text: "Will gain 6 block" },
        { type: "attack", amount: 4, text: "Attack for 4" },
        { type: "block", amount: 6, text: "Will gain 6 block" },
        { type: "attack", amount: 5, text: "Attack for 5" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "hunter",
    name: "Hunter Frigate",
    difficulty: "hard",
    counter: "mark-suppressor",
    maxHull: 24,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 4, text: "Attack for 4" },
        { type: "attack", amount: 5, text: "Attack for 5" },
        { type: "attack", amount: 6, text: "Attack for 6" },
        { type: "block", amount: 5, text: "Will gain 5 block" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "bulwark",
    name: "Bulwark Corvette",
    difficulty: "hard",
    counter: "block-breaker",
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
    counter: "snub-hunter",
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
    counter: "drone-swarm",
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
  muteBtn: document.getElementById("muteBtn"),
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
  tooltip: document.getElementById("tooltip"),
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
  combatHeaderSection: document.querySelector(".combat-header-section"),
  playerHudSection: document.querySelector(".player-hud-section"),
  playerHud: document.getElementById("playerHud"),
  battlefieldSection: document.querySelector(".battlefield-section"),
  battlefield: document.getElementById("battlefield"),
  combatGrid: document.querySelector(".combat-grid"),
  controls: document.querySelector(".controls"),
  handSection: document.querySelector(".hand-section"),
  logSection: document.querySelector(".log-section")
};

let comboBannerTimeout = null;
let tooltipTargetEl = null;

const TOOLTIP_TEXT = {
  burn: "Burn deals damage over time at end of turn.",
  laser: "Laser is a Mining Ship resource used to power burn-related effects.",
  mark: "Mark increases the effectiveness of execution and mark payoff cards.",
  beam: "Beam is a Heavy Fighter charge resource used for burst attacks.",
  block: "Block prevents incoming damage before hull is damaged.",
  snub: "Snub Fighter absorbs damage after Block and before player hull."
};

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

function showTooltip(text, x, y) {
  if (!els.tooltip || !text) return;
  els.tooltip.textContent = text;
  els.tooltip.classList.remove("hidden");
  moveTooltip(x, y);
}

function moveTooltip(x, y) {
  if (!els.tooltip) return;
  const pad = 14;
  const rect = els.tooltip.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - pad;
  const maxY = window.innerHeight - rect.height - pad;
  const nextX = Math.max(pad, Math.min(x + 14, maxX));
  const nextY = Math.max(pad, Math.min(y + 16, maxY));
  els.tooltip.style.left = `${nextX}px`;
  els.tooltip.style.top = `${nextY}px`;
}

function hideTooltip() {
  if (!els.tooltip) return;
  els.tooltip.classList.add("hidden");
}

function enhanceCardDescriptionWithTooltips(description) {
  if (!description) return "";
  return description
    .replace(/Snub Fighter/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.snub}">Snub Fighter</span>`)
    .replace(/\bBurn\b/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.burn}">Burn</span>`)
    .replace(/\bLaser\b/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.laser}">Laser</span>`)
    .replace(/\bMark\b/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.mark}">Mark</span>`)
    .replace(/\bBeam\b/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.beam}">Beam</span>`)
    .replace(/\bBlock\b/gi, `<span class="tooltip-keyword" data-tooltip="${TOOLTIP_TEXT.block}">Block</span>`);
}

function initTooltipSystem() {
  if (!els.tooltip) return;
  document.addEventListener("mouseover", event => {
    const target = event.target instanceof Element ? event.target.closest("[data-tooltip]") : null;
    if (!target) return;
    if (target === tooltipTargetEl) return;
    tooltipTargetEl = target;
    showTooltip(target.getAttribute("data-tooltip") || "", event.clientX, event.clientY);
  });
  document.addEventListener("mousemove", event => {
    if (!tooltipTargetEl) return;
    moveTooltip(event.clientX, event.clientY);
  });
  document.addEventListener("mouseout", event => {
    if (!tooltipTargetEl) return;
    const related = event.relatedTarget;
    if (related instanceof Element && tooltipTargetEl.contains(related)) return;
    tooltipTargetEl = null;
    hideTooltip();
  });
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

function renderBattlefield() {
  if (!els.battlefield || !state.player) return;

  const playerHullPct = state.player.maxHull > 0
    ? Math.max(0, Math.min(100, (state.player.hull / state.player.maxHull) * 100))
    : 0;
  const playerEnergyMax = state.player.baseEnergy + state.player.reactorBonus;

  const playerBlockHtml = state.player.block > 0
    ? `<div class="unit-block" data-tooltip="${TOOLTIP_TEXT.block}">🛡 ${state.player.block}</div>`
    : "";
  const selectedEnemy = getSelectedEnemy();
  const playerLaserAmount =
    typeof state.player.laserStacks === "number"
      ? state.player.laserStacks
      : (selectedEnemy?.laserStacks || 0);
  const playerLaserHtml =
    state.selectedShipId === "mining-ship"
      ? `<div class="player-laser" data-tooltip="${TOOLTIP_TEXT.laser}">Laser: ${playerLaserAmount}</div>`
      : "";
  const snub = state.selectedShipId === "exploration-vessel" ? state.player.snub : null;
  console.log("SNUB DEBUG", state.selectedShipId, state.player?.snub);
  const snubHullPct =
    snub && snub.maxHull > 0 ? Math.max(0, Math.min(100, (snub.hull / snub.maxHull) * 100)) : 0;
  const snubStatusText = snub
    ? snub.alive
      ? `${snub.hull} / ${snub.maxHull}`
      : (snub.respawnCounter || 0) > 0
      ? "Regenerating"
      : "Destroyed"
    : "";
  const snubHtml = snub
    ? `
      <div id="snubUnit" class="snub-unit ${snub.alive ? "" : "destroyed"}">
        <div class="snub-label" data-tooltip="${TOOLTIP_TEXT.snub}">Snub Fighter</div>
        <div class="unit-hull snub-hull">
          <div class="bar">
            <div class="bar-fill player-fill" style="width: ${snubHullPct}%"></div>
          </div>
          <div class="unit-hull-text">${snubStatusText}</div>
        </div>
      </div>
    `
    : "";

  const enemiesHtml = state.enemies
    .map(enemy => {
      const enemyHullPct = enemy.maxHull > 0
        ? Math.max(0, Math.min(100, (enemy.hull / enemy.maxHull) * 100))
        : 0;
      const isSelected = enemy.uid === state.selectedEnemyUid;
      const destroyedClass = enemy.hull <= 0 ? " destroyed" : "";
      const selectedClass = isSelected ? " selected" : "";
      const intentText =
        !state.combatEnded && enemy.hull > 0 && enemy.intent
          ? enemy.intent.text
          : enemy.hull > 0
          ? "—"
          : "Destroyed";
      const enemyBlockHtml = enemy.block > 0 ? `<div class="unit-block" data-tooltip="${TOOLTIP_TEXT.block}">🛡 ${enemy.block}</div>` : "";
      const enemyBurnHtml = (enemy.burnStacks || 0) > 0 ? `<div class="unit-burn" data-tooltip="${TOOLTIP_TEXT.burn}">Burn: ${enemy.burnStacks}</div>` : "";
      const markHtml = (enemy.markStacks || 0) > 0 ? `<div class="unit-mini-badge mark" data-tooltip="${TOOLTIP_TEXT.mark}">MARK ${enemy.markStacks}</div>` : "";
      const beamHtml = (enemy.beamCharge || 0) > 0 ? `<div class="unit-mini-badge beam" data-tooltip="${TOOLTIP_TEXT.beam}">BEAM ${enemy.beamCharge}</div>` : "";
      const traitHtml = enemy.trait ? `<div class="unit-mini-badge trait">${enemy.trait.toUpperCase()}</div>` : "";
      const roleHtml = enemy.role === "bounty" ? `<div class="unit-mini-badge role">BOUNTY</div>` : `<div class="unit-mini-badge role escort">ESCORT</div>`;
      const eliteHtml = enemy.difficulty === "elite" ? `<div class="unit-mini-badge elite">ELITE</div>` : "";
      const bossHtml = enemy.bossType ? `<div class="unit-mini-badge boss">BOSS</div>` : "";

      return `
        <div class="enemy-unit${selectedClass}${destroyedClass}" data-enemy-uid="${enemy.uid}">
          <div class="enemy-intent-badge">${intentText}</div>
          <div class="enemy-meta-badges">
            ${bossHtml}
            ${eliteHtml}
            ${roleHtml}
            ${traitHtml}
            ${markHtml}
            ${beamHtml}
          </div>
          <div class="enemy-silhouette">${getNodeSymbol({ type: "combat" })}</div>
          <div class="enemy-name">${enemy.name}</div>
          <div class="unit-hull">
            <div class="bar">
              <div class="bar-fill enemy-fill" style="width: ${enemyHullPct}%"></div>
            </div>
            <div class="unit-hull-text">${enemy.hull} / ${enemy.maxHull}</div>
          </div>
          ${enemyBlockHtml}
          ${enemyBurnHtml}
          ${isSelected ? `<div class="unit-targeted">TARGETED</div>` : ""}
        </div>
      `;
    })
    .join("");

  els.battlefield.innerHTML = `
    <div id="playerGroup" class="player-group">
      <div id="playerUnit" class="player-unit">
        <div class="player-ship-name">${getShipDisplayName(state.selectedShipId)}</div>
        <div class="player-energy">⚡ ${state.player.energy} / ${playerEnergyMax}</div>
        <img src="./assets/images/player_ship.png" class="ship-img" />
        <div class="unit-hull">
          <div class="bar">
            <div class="bar-fill player-fill" style="width: ${playerHullPct}%"></div>
          </div>
          <div class="unit-hull-text">${state.player.hull} / ${state.player.maxHull}</div>
        </div>
      ${playerLaserHtml}
        ${playerBlockHtml}
      </div>
      ${snubHtml}
    </div>
    <div class="enemy-units-wrap">
      ${enemiesHtml}
    </div>
  `;
}

function renderPlayerHud() {
  if (!els.playerHud || !state.player) return;
  const creditsValue =
    typeof state.player.credits === "number" ? state.player.credits : state.runCredits;

  els.playerHud.innerHTML = `
    <div class="hud-pill hud-resource">Fuel ${state.player.fuel}</div>
    <div class="hud-pill hud-resource resource-credits">$ Credits ${creditsValue}</div>
    <div class="hud-pill hud-resource">Draw ${state.drawPile.length}</div>
    <div class="hud-pill hud-resource">Discard ${state.discardPile.length}</div>
    <div class="hud-pill hud-resource">Exhaust ${state.exhaustPile.length}</div>
  `;
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

function spawnFloatingText(text, x, y, className = "") {
  if (!els.battlefield) return;
  const el = document.createElement("div");
  el.className = `combat-float-text float-up ${className}`.trim();
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  els.battlefield.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 850);
}

function spawnFloatingTextNearElement(targetEl, text, className = "") {
  if (!els.battlefield || !targetEl) return;
  const battlefieldRect = els.battlefield.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const x = targetRect.left - battlefieldRect.left + targetRect.width * 0.5;
  const y = targetRect.top - battlefieldRect.top + 12;
  spawnFloatingText(text, x, y, className);
}

function showCreditsPopup(amount) {
  if (!els.playerHud || amount <= 0) return;
  const creditsEl = els.playerHud.querySelector(".resource-credits");
  if (!creditsEl) return;
  const popup = document.createElement("span");
  popup.className = "credit-float-text";
  popup.textContent = `+${amount} Credits`;
  creditsEl.appendChild(popup);
  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 850);
}

function gainCredits(amount, sourceText) {
  if (amount <= 0) return;
  state.runCredits += amount;
  if (state.player) state.player.credits = state.runCredits;
  log(`Gained ${amount} credits from ${sourceText}.`, "system");
  showCreditsPopup(amount);
}

function applyHitFlash(targetEl) {
  if (!targetEl) return;
  targetEl.classList.remove("hit-flash");
  void targetEl.offsetWidth;
  targetEl.classList.add("hit-flash");
  setTimeout(() => targetEl.classList.remove("hit-flash"), 120);
}

function applyBattlefieldShake() {
  if (!els.battlefield) return;
  els.battlefield.classList.remove("screen-shake");
  void els.battlefield.offsetWidth;
  els.battlefield.classList.add("screen-shake");
  setTimeout(() => els.battlefield.classList.remove("screen-shake"), 200);
}

function animateEnemyAttack(enemyUid) {
  if (!enemyUid) return;
  const enemyEl = document.querySelector(`.enemy-unit[data-enemy-uid="${enemyUid}"]`);
  if (!enemyEl) return;
  enemyEl.classList.remove("enemy-attack-lunge");
  void enemyEl.offsetWidth;
  enemyEl.classList.add("enemy-attack-lunge");
  setTimeout(() => enemyEl.classList.remove("enemy-attack-lunge"), 170);
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
  gainCredits(amount, "encounter reward");
}

function buildRewardChoices() {
  const pool = getRewardPool();
  const choiceCount = (state.run?.encounterCount || 0) <= 2 ? 2 : 3;
  const weightedPicks = pickWeightedRewardCards(pool, choiceCount);
  const finalPicks = applyMiniComboRewardRules(pool, weightedPicks, choiceCount);
  console.log("REWARD SHIP:", state.selectedShipId);
  console.log("REWARD ARCHETYPE:", getShipArchetype(state.selectedShipId));
  console.log("REWARD POOL IDS:", pool.map(card => card.id));
  return finalPicks.map(card => card.id);
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
  engageButton.className = "reward-option map-engage-cta";
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
  const notorietyTooltip =
    getNotorietyLabel(state.notoriety) === "Hunted"
      ? "Hunted: powerful enemies are now actively pursuing you in endless mode."
      : "Notoriety reflects how much attention your run has attracted.";
  els.mapSubtitleText.innerHTML = `
    <span class="map-hud-tip" data-tooltip="${notorietyTooltip}">Notoriety: ${getNotorietyLabel(state.notoriety)}</span>
    •
    <span class="map-hud-tip" data-tooltip="Fuel is used to travel between map nodes.">Fuel: ${state.player.fuel}</span>
    •
    <span class="map-hud-tip" data-tooltip="Credits are spent at Shops and other special services.">Credits: ${state.runCredits}</span>
    •
    <span class="map-hud-tip" data-tooltip="Tracks your progress through the current sector.">${getSectorProgressText()}</span>
  `;

  const gateStateHtml =
    currentNode.type === "gate"
      ? `<div class="reward-meta"><span class="map-hud-tip" data-tooltip="${
          state.gateUnlocked
            ? "Boss Contract is available. Defeating the boss grants major rewards."
            : "Boss Contract is locked until the required sector progress or gate condition is met."
        }">Boss Contract Status: ${state.gateUnlocked ? "Unlocked" : "Locked"}</span></div>`
      : "";

  els.mapCurrentInfo.innerHTML = `
    <div class="reward-name">Current Location</div>
    <div class="reward-meta">Node ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
    ${gateStateHtml}
    <div class="reward-meta"><span class="map-hud-tip" data-tooltip="Credits are spent at Shops and other special services.">Credits: ${state.runCredits}</span></div>
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

  const legendCard = document.createElement("div");
  legendCard.className = "reward-option map-legend-card";
  legendCard.innerHTML = `
    <div class="reward-name">Legend</div>
    <div class="reward-meta">⌂ Hangar • ● Combat • ⬢ Dock • ◉ Planet • $ Shop • ✦ Black Market • ! Distress • ☠ Elite • ★ Boss Contract</div>
  `;
  els.mapActionArea.appendChild(legendCard);

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
    <div class="reward-meta">Restore 25% max hull — 40 credits</div>
  `;
  repairBtn.addEventListener("click", () => {
    if (state.runCredits < 40) return;
    state.runCredits -= 40;
    const healAmount = Math.floor(state.player.maxHull * 0.25);
    repairPlayerHull(healAmount, "Dock");
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
      gainCredits(20, "Distress signal salvage");
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
  if (sectorNumber === 1) return "Sentinel Frigate";
  if (sectorNumber === 2) return "Contract Warden";
  return "Blacksite Hunter";
}

function getSectorBossDescription(sectorNumber) {
  if (sectorNumber === 1) return "Patterned warship with adaptive system disruption.";
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
  if (sectorNumber === 1) bossType = "sentinel-frigate";
  else if (sectorNumber === 2) bossType = "contract-warden";

  if (sectorNumber === 1) {
    const lead = getEnemyTypeById("sentinel-frigate") || ENEMY_TYPES[Math.min(3, ENEMY_TYPES.length - 1)];
    const bossEnemy = buildEnemyFromTemplate(lead, "bounty", "elite");
    bossEnemy.bossType = bossType;
    return [bossEnemy];
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

  document.body.style.backgroundImage = "url('./assets/images/boss_planet.png')";
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
    gainCredits(30, "planet derelict cache");
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
  const earnedNow = state.lastCombatCreditsEarned || 0;

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = `Low fuel — ambush. No card salvage.\nCredits earned: +${earnedNow}\nCurrent credits: ${state.runCredits}\nOptional reward: +${creditReward} credits.`;
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
  applyCardToArchetypeBias(cardId);
  const card = ALL_CARDS.find(c => c.id === cardId);
  if (card) {
    log(`Reward chosen: ${card.name} added to your run deck.`, "system");
  }
  advanceAfterCombatRewards();
}

function skipReward() {
  state.pendingReward = false;
  state.rewardChoices = [];
  log("Reward skipped.", "system");
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

  const skipBtn = document.createElement("button");
  skipBtn.className = "reward-option reward-option-secondary";
  skipBtn.innerHTML = `
    <div class="reward-name">Skip</div>
    <div class="reward-meta">Decline all card rewards and continue.</div>
  `;
  skipBtn.addEventListener("click", skipReward);
  els.rewardOptions.appendChild(skipBtn);
}

function showPostVictoryChoiceOverlay() {
  state.pendingReward = true;

  const creditReward = getCreditRewardForEncounter(state.encounterIndex);
  const earnedNow = state.lastCombatCreditsEarned || 0;

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = `Credits earned: +${earnedNow}\nCurrent credits: ${state.runCredits}\nChoose your reward.`;
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
  const endlessScale =
    state.endlessMode && state.sectorNumber > 3 ? 1 + (state.sectorNumber - 3) * 0.08 : 1;
  const mult = (TIER_MULTIPLIER[tier] ?? 1) * endlessScale;
  const scaledMaxHull = Math.round(template.maxHull * mult);
  const baseGetIntent = template.getIntent;

  function scaledGetIntent(turn) {
    const base = baseGetIntent(turn);
    const pressureBonus = base.type === "attack" ? Math.floor(Math.max(0, turn - 1) / 2) : 0;
    const scaledAmount = Math.max(0, Math.round(base.amount * mult) + pressureBonus);
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
    counter: template.counter || null,
    difficulty: tier,
    maxHull: scaledMaxHull,
    hull: scaledMaxHull,
    block: 0,
    markStacks: 0,
    beamCharge: 0,
    burnStacks: 0,
    laserStacks: 0,
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
  state.player.burnBonus = 0;
  state.player.heat = 0;
  state.player.stealthReady = false;
  state.player.damageReductionFlat = 0;
  state.player.drones = 0;
  if (state.selectedShipId === "exploration-vessel") {
    state.player.snub = {
      alive: true,
      hull: 5,
      maxHull: 5,
      respawnCounter: 0
    };
  }
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
  const isExplorationShip = state.selectedShipId === "exploration-vessel";
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
    burnBonus: 0,
    snub: isExplorationShip
      ? {
          alive: true,
          hull: 5,
          maxHull: 5,
          respawnCounter: 0
        }
      : null,
    maxFuel: 100,
    fuel: 100
  };
  ensureSnubState();

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
  state.bossCount = 0;
  state.endlessMode = false;
  state.run = {
    archetypeBias: {
      beam: 0,
      burn: 0,
      snub: 0,
      block: 0,
      mark: 0,
      economy: 0,
      drone: 0,
      overheat: 0
    },
    archetypeCounts: {
      beam: 0,
      burn: 0,
      snub: 0,
      block: 0,
      mark: 0,
      economy: 0,
      drone: 0,
      overheat: 0
    },
    committedArchetype: null,
    encounterCount: 0,
    miniComboSynergyShown: false
  };
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
  const stealthMult = state.player.stealthReady ? 2 : 1;
  const total = (baseAmount + state.player.weaponBonus + bonus) * stealthMult;
  dealDamageToEnemy(total, sourceName);
  state.attacksPlayedThisTurn += 1;
  if (state.player.stealthReady) {
    state.player.stealthReady = false;
    log("Stealth strike consumed: attack damage doubled.", "system");
  }
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
  if ((state.player.damageReductionFlat || 0) > 0) {
    amount = Math.max(0, amount - state.player.damageReductionFlat);
  }
  const blocked = Math.min(state.player.block, amount);
  let remainingDamage = amount - blocked;
  let snubDamage = 0;
  const playerUnitEl = document.getElementById("playerGroup");
  const snubUnitEl = document.getElementById("snubUnit");

  state.player.block -= blocked;

  const snub = state.selectedShipId === "exploration-vessel" ? state.player.snub : null;
  if (snub && snub.alive && remainingDamage > 0) {
    snubDamage = Math.min(snub.hull, remainingDamage);
    snub.hull = Math.max(0, snub.hull - snubDamage);
    remainingDamage -= snubDamage;
    if (snub.hull <= 0) {
      snub.alive = false;
      snub.hull = 0;
      snub.respawnCounter = 2;
      log("Snub Fighter destroyed.", "enemy");
    }
  }

  const hpDamage = remainingDamage;
  state.player.hull = Math.max(0, state.player.hull - hpDamage);

  if (blocked > 0) {
    spawnFloatingTextNearElement(playerUnitEl, `Block -${blocked}`, "block-text");
    applyHitFlash(playerUnitEl);
  }
  if (snubDamage > 0) {
    spawnFloatingTextNearElement(snubUnitEl, `-${snubDamage}`, "snub-text");
    applyHitFlash(snubUnitEl);
    if (state.selectedShipId === "exploration-vessel" && state.player.snub && !state.player.snub.alive) {
      spawnFloatingTextNearElement(snubUnitEl, "Snub Destroyed", "snub-destroyed-text");
    }
  }
  if (hpDamage > 0) {
    spawnFloatingTextNearElement(playerUnitEl, `-${hpDamage}`, "damage-text");
    applyHitFlash(playerUnitEl);
  }
  if (blocked > 0 || snubDamage > 0 || hpDamage > 0) {
    applyBattlefieldShake();
  }

  if (blocked > 0 && (snubDamage > 0 || hpDamage > 0)) {
    if (snubDamage > 0 && hpDamage > 0) {
      log(`${sourceName} hits for ${amount}. You block ${blocked}, snub takes ${snubDamage}, you take ${hpDamage}.`, "enemy");
    } else if (snubDamage > 0) {
      log(`${sourceName} hits for ${amount}. You block ${blocked}, snub takes ${snubDamage}.`, "enemy");
    } else {
      log(`${sourceName} hits for ${amount}. You block ${blocked} and take ${hpDamage}.`, "enemy");
    }
  } else if (blocked >= amount) {
    log(`${sourceName} hits for ${amount}, but you block it all.`, "enemy");
  } else if (snubDamage > 0 && hpDamage > 0) {
    log(`${sourceName} hits for ${amount}. Snub takes ${snubDamage}, you take ${hpDamage}.`, "enemy");
  } else if (snubDamage > 0) {
    log(`${sourceName} hits for ${amount}. Snub takes ${snubDamage}.`, "enemy");
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
    case "disrupt":
      return "Enemy will disrupt your systems.";
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

    if (enemy.counter === "burn-purge" && enemy.turnCounter % 2 === 0 && (enemy.burnStacks || 0) > 0) {
      const removed = Math.min(2, enemy.burnStacks || 0);
      enemy.burnStacks = Math.max(0, (enemy.burnStacks || 0) - removed);
      log(`${enemy.name} vents heat and clears ${removed} Burn.`, "enemy");
    }
    if (enemy.counter === "mark-suppressor" && enemy.turnCounter % 2 === 0 && (enemy.markStacks || 0) > 0) {
      enemy.markStacks = Math.max(0, (enemy.markStacks || 0) - 1);
      log(`${enemy.name} disrupts your targeting lock.`, "enemy");
    }
    if (enemy.counter === "beam-dampener" && enemy.turnCounter % 2 === 0 && (enemy.beamCharge || 0) > 0) {
      enemy.beamCharge = Math.max(0, (enemy.beamCharge || 0) - 1);
      log(`${enemy.name} dampens Beam charge.`, "enemy");
    }
    if (enemy.counter === "drone-swarm" && enemy.turnCounter % 3 === 0 && (state.player.drones || 0) > 0) {
      state.player.drones = Math.max(0, (state.player.drones || 0) - 1);
      dealDamageToPlayer(1, `${enemy.name} flak burst`);
      log(`${enemy.name} scatters your drone formation.`, "enemy");
    }

    const intent = enemy.intent;
    if (!intent) return;

    switch (intent.type) {
      case "attack": {
        animateEnemyAttack(enemy.uid);
        const reduction = enemy.attackReduction || 0;
        const finalAmount = Math.max(0, intent.amount - reduction);
        if (reduction > 0) {
          log(`${enemy.name}'s attack reduced by ${reduction}.`, "system");
        }
        if (enemy.counter === "block-breaker" && finalAmount > 0 && enemy.turnCounter % 2 === 0) {
          const ignored = Math.min(2, state.player.block || 0);
          if (ignored > 0) {
            state.player.block = Math.max(0, state.player.block - ignored);
            log(`${enemy.name}'s attack pierces ${ignored} block.`, "enemy");
          }
        }
        if (enemy.counter === "snub-hunter" && finalAmount > 0) {
          const snub = state.player?.snub;
          if (snub && snub.alive) {
            const snubHit = Math.min(2, snub.hull);
            snub.hull = Math.max(0, snub.hull - snubHit);
            log(`${enemy.name} targets the Snub Fighter for ${snubHit}.`, "enemy");
            if (snub.hull <= 0) {
              snub.alive = false;
              snub.hull = 0;
              snub.respawnCounter = 2;
              log("Snub Fighter destroyed.", "enemy");
            }
          }
        }
        if (enemy.sentinelIgnoreBlockNext && finalAmount > 0) {
          const ignored = state.player.block || 0;
          if (ignored > 0) {
            state.player.block = 0;
            log(`${enemy.name} bypasses your defenses.`, "enemy");
          }
          enemy.sentinelIgnoreBlockNext = false;
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
      case "disrupt":
        applySentinelDisruption(enemy);
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

function applySentinelDisruption(enemy) {
  const effects = ["burn", "beam", "snub", "pierce"];
  const choice = pickRandom(effects);
  if (choice === "burn") {
    const removed = Math.min(2, enemy.burnStacks || 0);
    enemy.burnStacks = Math.max(0, (enemy.burnStacks || 0) - removed);
    log(`${enemy.name} vents thermal residue (${removed} Burn removed).`, "enemy");
    return;
  }
  if (choice === "beam") {
    const removed = Math.min(2, enemy.beamCharge || 0);
    enemy.beamCharge = Math.max(0, (enemy.beamCharge || 0) - removed);
    log(`${enemy.name} scrambles beam harmonics (${removed} Beam lost).`, "enemy");
    return;
  }
  if (choice === "snub") {
    const snub = state.player?.snub;
    if (snub && snub.alive) {
      const hit = Math.min(2, snub.hull);
      snub.hull = Math.max(0, snub.hull - hit);
      log(`${enemy.name} disrupts your snub for ${hit}.`, "enemy");
      if (snub.hull <= 0) {
        snub.alive = false;
        snub.hull = 0;
        snub.respawnCounter = 2;
        log("Snub Fighter destroyed.", "enemy");
      }
    } else {
      enemy.sentinelIgnoreBlockNext = true;
      log(`${enemy.name} primes a piercing barrage.`, "enemy");
    }
    return;
  }
  enemy.sentinelIgnoreBlockNext = true;
  log(`${enemy.name} primes a piercing barrage.`, "enemy");
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

  state.enemies.forEach(enemy => {
    if (enemy.hull <= 0) return;
    const burnDamage = (enemy.burnStacks || 0) + (state.player.burnBonus || 0);
    if (burnDamage <= 0) return;
    enemy.hull = Math.max(0, enemy.hull - burnDamage);
    log(`${enemy.name} suffers ${burnDamage} Burn damage.`, "system");
  });

  if (allEnemiesDead()) {
    state.combatEnded = true;
  }

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
  if (
    state.selectedShipId === "exploration-vessel" &&
    state.player.snub &&
    state.player.snub.alive === false
  ) {
    if ((state.player.snub.respawnCounter || 0) > 0) {
      state.player.snub.respawnCounter -= 1;
    }
    if ((state.player.snub.respawnCounter || 0) === 0) {
      state.player.snub.alive = true;
      state.player.snub.hull = 5;
      state.player.snub.maxHull = 5;
      state.player.snub.respawnCounter = 0;
      log("Snub Fighter redeployed.", "system");
    }
  }

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
  let earnedNow = 0;
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
  if (state.run) {
    state.run.encounterCount = (state.run.encounterCount || 0) + 1;
  }

  gainCredits(5, "combat cleanup bonus");
  earnedNow += 5;

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
    gainCredits(20, "planet ambush bonus");
    earnedNow += 20;
    state.planetAlienAmbushCombat = false;
  }

  if (state.eliteContractCombat) {
    gainCredits(ELITE_CLEAR_BONUS, "elite contract bonus");
    earnedNow += ELITE_CLEAR_BONUS;
    state.eliteContractCombat = false;
  }

  state.lastCombatCreditsEarned = earnedNow;

  if (state.inBossCombat) {
    state.bossCount += 1;
    if (!state.endlessMode && state.bossCount >= 3) {
      state.endlessMode = true;
      state.notoriety = 4;
      log("Endless mode unlocked. Notoriety set to Hunted.", "system");
    }
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
      <div class="card-text">${enhanceCardDescriptionWithTooltips(card.description)}</div>
      <button ${canPlay ? "" : "disabled"}>${canPlay ? "Play Card" : "Not Enough Energy"}</button>
    `;

    const button = cardEl.querySelector("button");
    button.addEventListener("click", () => playCard(card.uid));

    els.hand.appendChild(cardEl);
  });
}

let mapOverlayInProgress = false;
let lastRenderedScreen = null;

function ensureSnubState() {
  if (!state.player) return;

  if (state.selectedShipId === "exploration-vessel") {
    if (!state.player.snub) {
      state.player.snub = {
        alive: true,
        hull: 5,
        maxHull: 5,
        respawnCounter: 0
      };
    }
    if (typeof state.player.snub.respawnCounter !== "number") {
      state.player.snub.respawnCounter = 0;
    }
  } else {
    state.player.snub = null;
  }
}

function updateBackground() {
  if (state.currentScreen === "combat") {
    if (state.inBossCombat || state.pendingBoss) {
      document.body.style.backgroundImage = "url('./assets/images/boss_planet.png')";
    } else {
      document.body.style.backgroundImage = "url('./assets/images/blue_nebula.png')";
    }
  } else if (state.currentScreen === "map") {
    document.body.style.backgroundImage = "url('./assets/images/plain_starfield.png')";
  } else {
    document.body.style.backgroundImage = "url('./assets/images/plain_starfield.png')";
  }
}

function render() {
  ensureSnubState();
  updateBackground();
  if (lastRenderedScreen !== state.currentScreen) {
    window.scrollTo({ top: 0, behavior: "auto" });
    lastRenderedScreen = state.currentScreen;
  }
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
  if (els.combatHeaderSection) els.combatHeaderSection.classList.toggle("hidden", !showCombatShell);
  if (els.playerHudSection) els.playerHudSection.classList.toggle("hidden", !showCombatShell);
  if (els.combatGrid) els.combatGrid.classList.toggle("hidden", !showCombatShell);
  if (els.battlefieldSection) els.battlefieldSection.classList.toggle("hidden", !showCombatShell);
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

  renderPlayerHud();
  renderBattlefield();
  renderEnemies();

  els.endTurnBtn.disabled = state.combatEnded;
  els.redrawBtn.disabled = state.combatEnded;

  renderHand();
}

function initStartMusic() {
  const music = document.getElementById("startMusic");
  if (!music) return;

  const startAudio = () => {
    music.volume = 0.5;
    music.play().catch(() => {});

    document.removeEventListener("click", startAudio);
    document.removeEventListener("keydown", startAudio);
  };

  document.addEventListener("click", startAudio);
  document.addEventListener("keydown", startAudio);
}

function initMuteButton() {
  const music = document.getElementById("startMusic");
  const muteBtn = els.muteBtn;
  if (!muteBtn) return;

  const updateMuteLabel = () => {
    if (!music) {
      muteBtn.textContent = "Mute";
      return;
    }
    muteBtn.textContent = music.muted ? "Unmute" : "Mute";
  };

  updateMuteLabel();
  muteBtn.addEventListener("click", () => {
    if (!music) return;
    music.muted = !music.muted;
    updateMuteLabel();
  });
}

els.restartBtn.addEventListener("click", startRun);
els.redrawBtn.addEventListener("click", redrawHand);
els.endTurnBtn.addEventListener("click", endTurn);
if (els.startRunFlowBtn) {
  els.startRunFlowBtn.addEventListener("click", () => {
    showShipSelection();
  });
}

initStartMusic();
initMuteButton();
initTooltipSystem();
showStartScreen();
