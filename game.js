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
  lockedNodeIds: [],
  clearedNodeIds: [],
  currentScreen: "start",
  sectorNumber: 1,
  notoriety: 0,
  bossCount: 0,
  bossEncounterId: null,
  endlessMode: false,
  gateUnlocked: false,
  inBossCombat: false,
  pendingBoss: false,
  shopInventory: [],
  selectedShipId: "heavy-fighter",
  lastCombatCreditsEarned: 0,
  lastEncounterBucket: null,
  rewardChoiceBonus: 0,
  encounterCreditRewardModifier: 1,
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
    miniComboSynergyShown: false,
    commitMomentUsed: false,
    encounterTagCounts: {},
    fuel: 6
  },
  miningMinigameActive: false,
  miningMinigamePhase: "idle",
  miningMarkerPos: 0,
  miningMarkerDir: 1,
  miningRafId: null
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

const SHIP_FANTASY_BY_ID = {
  "heavy-fighter": "Direct beam pressure and decisive kills",
  "stealth-bomber": "Mark, setup, and execution timing",
  gunship: "Tanky bruiser with defensive tempo",
  "exploration-vessel": "Utility, snub support, and sustained control",
  "mining-ship": "Economy engine with thermal scaling"
};

const SHIP_TRAITS_BY_ID = {
  "heavy-fighter": ["Beam", "Burst", "Aggro"],
  "stealth-bomber": ["Mark", "Precision", "Setup"],
  gunship: ["Block", "Bruiser", "Sustain"],
  "exploration-vessel": ["Snub", "Utility", "Control"],
  "mining-ship": ["Economy", "Burn", "Scaling"]
};

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
    "basic-block",
    "basic-block"
  ];

  if (shipId === "heavy-fighter") {
    return [...baseCore, "focused-beam"];
  }

  if (shipId === "stealth-bomber") {
    return [...baseCore, "hunters-tag"];
  }

  if (shipId === "gunship") {
    return [...baseCore, "reinforce-shields"];
  }

  if (shipId === "exploration-vessel") {
    return [...baseCore, "snub-strike"];
  }

  if (shipId === "mining-ship") {
    return [...baseCore, "laser-drill"];
  }

  return [...baseCore, "focused-beam"];
}

function getShipArchetypeCardIds(shipId) {
  if (shipId === "mining-ship") return ["laser-drill", "laser-alignment"];
  return [];
}
const BASE_CREDIT_REWARD = 10;
const CREDIT_REWARD_STEP = 5;
const ELITE_CLEAR_BONUS = 15;
const CAMPAIGN_MAX_FUEL = 6;
const SANDBOX_MAX_FUEL = 100;

const RUN_LENGTH = 30;

function rollNextNodeType() {
  const r = Math.random() * 100;
  if (r < 50) return "combat";
  if (r < 70) return "dock";
  if (r < 90) return "planet";
  return "elite";
}

function createBranchMergeCampaignSector(sectorNum) {
  const Y = r => 578 - r * 51;
  const L = 290;
  const C = 560;
  const R = 830;
  const p = id => `s${sectorNum}-${id}`;
  const layout = ((Math.max(1, sectorNum) - 1) % 3) + 1;
  const hardMode = sectorNum > 3;

  const ez = () => (hardMode ? "medium" : "easy");
  const mid = () => (hardMode ? "hard" : layout >= 2 ? "medium" : "medium");
  const hard = () => "hard";

  const nodes = [];

  nodes.push({ id: "S", type: "start", row: 0, neighbors: [p("n1")], x: C, y: Y(0) });
  nodes.push({
    id: p("n1"),
    type: "combat",
    danger: ez(),
    row: 1,
    neighbors: [p("b2a"), p("b2b"), p("b2c")],
    x: C,
    y: Y(1)
  });

  if (layout === 1) {
    nodes.push({ id: p("b2a"), type: "planet", row: 2, neighbors: [p("n3")], x: L, y: Y(2) });
    nodes.push({ id: p("b2b"), type: "shop", row: 2, neighbors: [p("n3")], x: C, y: Y(2) });
    nodes.push({ id: p("b2c"), type: "combat", danger: ez(), row: 2, neighbors: [p("n3")], x: R, y: Y(2) });
  } else if (layout === 2) {
    nodes.push({ id: p("b2a"), type: "combat", danger: ez(), row: 2, neighbors: [p("n3")], x: L, y: Y(2) });
    nodes.push({ id: p("b2b"), type: "planet", row: 2, neighbors: [p("n3")], x: C, y: Y(2) });
    nodes.push({ id: p("b2c"), type: "dock", row: 2, neighbors: [p("n3")], x: R, y: Y(2) });
  } else {
    nodes.push({ id: p("b2a"), type: "shop", row: 2, neighbors: [p("n3")], x: L, y: Y(2) });
    nodes.push({ id: p("b2b"), type: "combat", danger: mid(), row: 2, neighbors: [p("n3")], x: C, y: Y(2) });
    nodes.push({
      id: p("b2c"),
      type: "elite",
      danger: "elite",
      row: 2,
      neighbors: [p("n3")],
      x: R,
      y: Y(2)
    });
  }

  nodes.push({ id: p("n3"), type: "combat", danger: mid(), row: 3, neighbors: [p("n4")], x: C, y: Y(3) });
  nodes.push({ id: p("n4"), type: "combat", danger: mid(), row: 4, neighbors: [p("b5a"), p("b5b"), p("b5c")], x: C, y: Y(4) });

  if (layout === 1) {
    nodes.push({ id: p("b5a"), type: "combat", danger: mid(), row: 5, neighbors: [p("n6")], x: L, y: Y(5) });
    nodes.push({ id: p("b5b"), type: "combat", danger: hard(), row: 5, neighbors: [p("n6")], x: C, y: Y(5) });
    nodes.push({ id: p("b5c"), type: "dock", row: 5, neighbors: [p("n6")], x: R, y: Y(5) });
  } else if (layout === 2) {
    nodes.push({ id: p("b5a"), type: "shop", row: 5, neighbors: [p("n6")], x: L, y: Y(5) });
    nodes.push({ id: p("b5b"), type: "combat", danger: hard(), row: 5, neighbors: [p("n6")], x: C, y: Y(5) });
    nodes.push({ id: p("b5c"), type: "combat", danger: hard(), row: 5, neighbors: [p("n6")], x: R, y: Y(5) });
  } else {
    nodes.push({ id: p("b5a"), type: "planet", row: 5, neighbors: [p("n6")], x: L, y: Y(5) });
    nodes.push({ id: p("b5b"), type: "combat", danger: hard(), row: 5, neighbors: [p("n6")], x: C, y: Y(5) });
    nodes.push({ id: p("b5c"), type: "dock", row: 5, neighbors: [p("n6")], x: R, y: Y(5) });
  }

  nodes.push({ id: p("n6"), type: "elite", danger: "elite", row: 6, neighbors: [p("n7")], x: C, y: Y(6) });
  nodes.push({
    id: p("n7"),
    type: "combat",
    danger: hard(),
    row: 7,
    neighbors: [p("b8a"), p("b8b")],
    x: C,
    y: Y(7)
  });

  if (layout === 1) {
    nodes.push({ id: p("b8a"), type: "planet", row: 8, neighbors: [p("n9")], x: 420, y: Y(8) });
    nodes.push({ id: p("b8b"), type: "combat", danger: hard(), row: 8, neighbors: [p("n9")], x: 700, y: Y(8) });
  } else if (layout === 2) {
    nodes.push({ id: p("b8a"), type: "dock", row: 8, neighbors: [p("n9")], x: 420, y: Y(8) });
    nodes.push({ id: p("b8b"), type: "combat", danger: hard(), row: 8, neighbors: [p("n9")], x: 700, y: Y(8) });
  } else {
    nodes.push({ id: p("b8a"), type: "combat", danger: hard(), row: 8, neighbors: [p("n9")], x: 420, y: Y(8) });
    nodes.push({ id: p("b8b"), type: "shop", row: 8, neighbors: [p("n9")], x: 700, y: Y(8) });
  }

  nodes.push({ id: p("n9"), type: "combat", danger: hard(), row: 9, neighbors: [p("n10")], x: C, y: Y(9) });
  nodes.push({
    id: p("n10"),
    type: "combat",
    danger: hard(),
    row: 10,
    neighbors: ["BG"],
    x: C,
    y: Y(10)
  });
  nodes.push({ id: "BG", type: "gate", row: 11, neighbors: [], x: C, y: Y(11) });

  return nodes;
}

function createSingleRunCampaignMap() {
  const totalRows = 30;
  const Y = r => 578 - r * 16.5;
  const L = 310;
  const C = 560;
  const R = 810;
  const nodes = [];

  nodes.push({ id: "S", type: "start", row: 0, neighbors: [], x: C, y: Y(0) });

  const typeCycle = ["combat", "planet", "combat", "dock", "combat", "shop", "combat"];
  const branchRows = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27]);
  const eliteRows = new Set([10, 20]);

  let prevIds = ["S"];
  for (let row = 1; row <= totalRows; row += 1) {
    const rowIds = [];

    if (row === totalRows) {
      nodes.push({ id: "BG", type: "gate", row, neighbors: [], x: C, y: Y(row) });
      rowIds.push("BG");
    } else if (eliteRows.has(row)) {
      const id = `n${row}`;
      nodes.push({ id, type: "elite", danger: "elite", row, neighbors: [], x: C, y: Y(row) });
      rowIds.push(id);
    } else if (branchRows.has(row)) {
      const laneTypes = [
        typeCycle[row % typeCycle.length],
        "combat",
        typeCycle[(row + 2) % typeCycle.length]
      ];
      const xs = [L, C, R];
      const suffixes = ["a", "b", "c"];
      for (let i = 0; i < 3; i += 1) {
        const type = laneTypes[i];
        const id = `b${row}${suffixes[i]}`;
        const node = { id, type, row, neighbors: [], x: xs[i], y: Y(row) };
        if (type === "combat") {
          node.danger = row <= 8 ? "easy" : row <= 18 ? "medium" : "hard";
        }
        nodes.push(node);
        rowIds.push(id);
      }
    } else {
      const id = `n${row}`;
      const type = row <= 8 ? "combat" : row <= 18 ? "combat" : row <= 26 ? "combat" : "combat";
      const node = { id, type, row, neighbors: [], x: C, y: Y(row) };
      node.danger = row <= 8 ? "easy" : row <= 18 ? "medium" : "hard";
      nodes.push(node);
      rowIds.push(id);
    }

    prevIds.forEach(fromId => {
      const fromNode = nodes.find(n => n.id === fromId);
      if (!fromNode) return;
      fromNode.neighbors.push(...rowIds);
    });
    prevIds = rowIds;
  }

  const checkpointN10 = nodes.find(n => n.id === "n10");
  if (checkpointN10) {
    checkpointN10.type = "elite";
    checkpointN10.danger = "elite";
  }
  const checkpointN20 = nodes.find(n => n.id === "n20");
  if (checkpointN20) {
    checkpointN20.type = "elite";
    checkpointN20.danger = "elite";
  }
  console.log(
    "[elite checkpoint verify]",
    ["n10", "n20"].map(id => {
      const node = nodes.find(n => n.id === id);
      return { id, type: node?.type || "missing" };
    })
  );
  console.log(
    "[elite checkpoints]",
    nodes
      .filter(n => n.type === "elite")
      .map(n => n.id)
  );

  return nodes;
}

function collectAllPathsStartToBoss(nodes, startId, bossId) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const paths = [];
  function walk(current, pathSoFar) {
    if (current === bossId) {
      paths.push([...pathSoFar, bossId]);
      return;
    }
    const node = byId.get(current);
    if (!node) return;
    for (const next of node.neighbors || []) {
      if (pathSoFar.includes(next)) continue;
      walk(next, [...pathSoFar, current]);
    }
  }
  walk(startId, []);
  return paths;
}

function getLaneBossNode(nodes) {
  const gates = nodes.filter(n => n.type === "gate");
  if (!gates.length) return null;
  const withRow = gates.filter(n => typeof n.row === "number");
  if (withRow.length) {
    const maxRow = Math.max(...withRow.map(n => n.row));
    return gates.find(n => n.row === maxRow) || gates[0];
  }
  return gates[0];
}

function replacementScore(node) {
  if (!node) return -1;
  if (node.type === "combat") return 2;
  if (node.type === "planet" || node.type === "dock" || node.type === "distress" || node.type === "black-market") return 1;
  return 0;
}

function pickShopReplacementNodeId(path, bossId, byId, hasRows, bossRow) {
  const blocked = new Set(["start", "elite", "gate", "shop"]);
  const isReplaceable = id => {
    const n = byId.get(id);
    return n && !blocked.has(n.type);
  };

  let primary = [];
  if (hasRows && bossRow != null) {
    primary = path.filter(id => id !== bossId && isReplaceable(id)).filter(id => {
      const n = byId.get(id);
      return n.row === bossRow - 1 || n.row === bossRow - 2;
    });
  } else {
    const bi = path.indexOf(bossId);
    if (bi >= 1) {
      const cands = [path[bi - 1]];
      if (bi >= 2) cands.push(path[bi - 2]);
      primary = cands.filter(isReplaceable);
    }
  }
  primary.sort((a, b) => {
    const s = replacementScore(byId.get(b)) - replacementScore(byId.get(a));
    if (s !== 0) return s;
    const na = byId.get(a);
    const nb = byId.get(b);
    if (na && nb && typeof na.row === "number" && typeof nb.row === "number") return nb.row - na.row;
    return 0;
  });
  if (primary.length) return primary[0];

  const rest = path.filter(id => id !== bossId && isReplaceable(id));
  rest.sort((a, b) => {
    const ra = replacementScore(byId.get(a));
    const rb = replacementScore(byId.get(b));
    if (rb !== ra) return rb - ra;
    return path.indexOf(b) - path.indexOf(a);
  });
  return rest[0] || null;
}

function applyShopConversion(node) {
  if (node?.id === "s1-n6") return;
  const next = { ...node, type: "shop" };
  delete next.danger;
  Object.assign(node, next);
}

function ensureShopOnEveryPathToBoss(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const start = nodes.find(n => n.type === "start");
  const boss = getLaneBossNode(nodes);
  if (!start || !boss) return nodes;

  const hasRows = nodes.some(n => typeof n.row === "number");
  const bossRow = typeof boss.row === "number" ? boss.row : null;

  function pathHasShop(path) {
    return path.some(id => byId.get(id)?.type === "shop");
  }

  for (let iter = 0; iter < 64; iter++) {
    const paths = collectAllPathsStartToBoss(nodes, start.id, boss.id);
    const bad = paths.find(p => !pathHasShop(p));
    if (!bad) break;

    const pathId = bad.join("->");
    const candId = pickShopReplacementNodeId(bad, boss.id, byId, hasRows, bossRow);
    if (!candId) {
      console.warn("[shop guarantee] no replacement candidate for path", pathId);
      break;
    }
    applyShopConversion(byId.get(candId));
    console.log("[shop guarantee]", pathId, "shop added");
  }
  return nodes;
}

function dockReplacementScore(node) {
  if (!node) return -1;
  if (node.type === "combat") return 4;
  if (node.type === "planet" || node.type === "distress" || node.type === "black-market") return 2;
  if (node.type === "elite") return 1;
  return 0;
}

function pickDockReplacementNodeId(path, bossId, byId, hasRows, bossRow) {
  const hardBlocked = new Set(["start", "gate", "shop"]);

  function rowFiltered(allowElite) {
    if (hasRows && bossRow != null) {
      return path.filter(id => id !== bossId).filter(id => {
        const n = byId.get(id);
        if (!n || hardBlocked.has(n.type)) return false;
        if (!allowElite && n.type === "elite") return false;
        return n.row === bossRow - 1 || n.row === bossRow - 2;
      });
    }
    const bi = path.indexOf(bossId);
    if (bi < 1) return [];
    const cands = [path[bi - 1]];
    if (bi >= 2) cands.push(path[bi - 2]);
    return cands.filter(id => {
      const n = byId.get(id);
      return n && !hardBlocked.has(n.type) && (allowElite || n.type !== "elite");
    });
  }

  function sortAndPick(ids) {
    const arr = [...ids];
    arr.sort((x, y) => {
      const s = dockReplacementScore(byId.get(y)) - dockReplacementScore(byId.get(x));
      if (s !== 0) return s;
      const nx = byId.get(x);
      const ny = byId.get(y);
      if (nx && ny && typeof nx.row === "number" && typeof ny.row === "number") return ny.row - nx.row;
      return 0;
    });
    return arr[0] || null;
  }

  for (const allowElite of [false, true]) {
    const pick = sortAndPick(rowFiltered(allowElite));
    if (pick) return pick;
  }

  for (const allowElite of [false, true]) {
    const rest = path.filter(id => id !== bossId).filter(id => {
      const n = byId.get(id);
      if (!n || hardBlocked.has(n.type)) return false;
      if (!allowElite && n.type === "elite") return false;
      return true;
    });
    rest.sort((a, b) => {
      const ra = dockReplacementScore(byId.get(a));
      const rb = dockReplacementScore(byId.get(b));
      if (rb !== ra) return rb - ra;
      return path.indexOf(b) - path.indexOf(a);
    });
    if (rest.length) return rest[0];
  }
  return null;
}

function applyDockConversion(node) {
  if (node?.id === "s1-n6") return;
  const next = { ...node, type: "dock" };
  delete next.danger;
  Object.assign(node, next);
}

function ensureDockOnEveryPathToBoss(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const start = nodes.find(n => n.type === "start");
  const boss = getLaneBossNode(nodes);
  if (!start || !boss) return nodes;

  const hasRows = nodes.some(n => typeof n.row === "number");
  const bossRow = typeof boss.row === "number" ? boss.row : null;

  function pathHasDock(path) {
    return path.some(id => byId.get(id)?.type === "dock");
  }

  for (let iter = 0; iter < 64; iter++) {
    const paths = collectAllPathsStartToBoss(nodes, start.id, boss.id);
    const bad = paths.find(p => !pathHasDock(p));
    if (!bad) break;

    const pathId = bad.join("->");
    const candId = pickDockReplacementNodeId(bad, boss.id, byId, hasRows, bossRow);
    if (!candId) {
      console.warn("[dock guarantee] no replacement candidate for path", pathId);
      break;
    }
    applyDockConversion(byId.get(candId));
    console.log("[dock guarantee]", pathId);
  }
  return nodes;
}

function convertNodeToCombat(node, danger) {
  if (node?.id === "s1-n6") return;
  const d = danger || node.danger || pickRandom(["easy", "medium", "hard"]);
  Object.assign(node, { ...node, type: "combat", danger: d });
}

function convertNodeToPlanet(node) {
  if (node?.id === "s1-n6") return;
  const next = { ...node, type: "planet" };
  delete next.danger;
  Object.assign(node, next);
}

function rebalanceCampaignNodeDistribution(nodes) {
  if (!nodes.length) return nodes;

  if (!nodes.some(n => typeof n.row === "number")) {
    let combat = 0;
    let dock = 0;
    let shop = 0;
    for (const n of nodes) {
      if (n.type === "start" || n.type === "gate") continue;
      if (n.type === "combat") combat++;
      else if (n.type === "dock") dock++;
      else if (n.type === "shop") shop++;
    }
    console.log("[node distribution]", { combat, dock, shop });
    return nodes;
  }

  const byId = new Map(nodes.map(n => [n.id, n]));
  const boss = getLaneBossNode(nodes);
  const start = nodes.find(n => n.type === "start");
  if (!boss || !start) return nodes;

  const maxRow = Math.max(...nodes.map(n => (typeof n.row === "number" ? n.row : -1)));
  const paths = collectAllPathsStartToBoss(nodes, start.id, boss.id);

  function isFlexible(n) {
    return n && n.type !== "start" && n.type !== "gate";
  }

  function tallySpecial() {
    let combat = 0;
    let dock = 0;
    let shop = 0;
    for (const n of nodes) {
      if (!isFlexible(n)) continue;
      if (n.type === "combat") combat++;
      else if (n.type === "dock") dock++;
      else if (n.type === "shop") shop++;
    }
    return { combat, dock, shop };
  }

  function canRemoveShopFromPaths(shopId) {
    return paths.every(path => {
      if (!path.includes(shopId)) return true;
      return path.some(id => id !== shopId && byId.get(id)?.type === "shop");
    });
  }

  function canRemoveDockFromPaths(dockId) {
    return paths.every(path => {
      if (!path.includes(dockId)) return true;
      return path.some(id => id !== dockId && byId.get(id)?.type === "dock");
    });
  }

  while (nodes.filter(n => n.type === "elite").length > 2) {
    const elites = nodes.filter(n => n.type === "elite" && typeof n.row === "number").sort((a, b) => a.row - b.row);
    convertNodeToCombat(elites[0], "medium");
  }

  for (const n of nodes) {
    if (n.type !== "dock") continue;
    for (const tid of n.neighbors || []) {
      const t = byId.get(tid);
      if (t && t.type === "dock" && canRemoveDockFromPaths(t.id)) {
        convertNodeToCombat(t, "medium");
      }
    }
  }

  for (let ri = 0; ri <= maxRow; ri++) {
    let docksHere = nodes.filter(n => n.row === ri && isFlexible(n) && n.type === "dock");
    while (docksHere.length > 1) {
      const victim = docksHere.pop();
      if (canRemoveDockFromPaths(victim.id)) convertNodeToCombat(victim, "medium");
      else break;
      docksHere = nodes.filter(n => n.row === ri && isFlexible(n) && n.type === "dock");
    }
    let shopsHere = nodes.filter(n => n.row === ri && isFlexible(n) && n.type === "shop");
    while (shopsHere.length > 1) {
      const victim = shopsHere.pop();
      if (canRemoveShopFromPaths(victim.id)) convertNodeToCombat(victim, "medium");
      else break;
      shopsHere = nodes.filter(n => n.row === ri && isFlexible(n) && n.type === "shop");
    }
  }

  let shops = nodes.filter(n => n.type === "shop").sort((a, b) => b.row - a.row);
  while (shops.length > 3) {
    const victim = shops.find(s => canRemoveShopFromPaths(s.id));
    if (!victim) break;
    convertNodeToCombat(victim, "medium");
    shops = nodes.filter(n => n.type === "shop").sort((a, b) => b.row - a.row);
  }

  let docks = nodes.filter(n => n.type === "dock").sort((a, b) => b.row - a.row);
  while (docks.length > 3) {
    const victim = docks.find(d => canRemoveDockFromPaths(d.id));
    if (!victim) break;
    convertNodeToCombat(victim, "medium");
    docks = nodes.filter(n => n.type === "dock").sort((a, b) => b.row - a.row);
  }

  for (const s of nodes.filter(n => n.type === "shop")) {
    for (const tid of s.neighbors || []) {
      const t = byId.get(tid);
      if (t && t.type === "shop" && canRemoveShopFromPaths(t.id)) {
        convertNodeToCombat(t, "medium");
      }
    }
  }

  const midRow = Math.max(1, Math.floor(maxRow * 0.45));
  let shopsEarlyMid = nodes.filter(n => n.type === "shop" && n.row <= midRow && n.row > 0);
  while (shopsEarlyMid.length === 0 && nodes.some(n => n.type === "shop")) {
    const late = nodes
      .filter(n => n.type === "shop" && n.row > midRow)
      .sort((a, b) => b.row - a.row);
    const candidate = late.find(l => canRemoveShopFromPaths(l.id));
    if (!candidate) break;
    const earlyCombat = nodes.find(
      n =>
        n.type === "combat" &&
        typeof n.row === "number" &&
        n.row > 0 &&
        n.row <= midRow &&
        paths.some(p => p.includes(n.id))
    );
    if (!earlyCombat) break;
    convertNodeToCombat(candidate, "medium");
    applyShopConversion(earlyCombat);
    shopsEarlyMid = nodes.filter(n => n.type === "shop" && n.row <= midRow && n.row > 0);
  }

  for (let ri = 1; ri < maxRow; ri++) {
    const rowNodes = nodes.filter(n => n.row === ri && isFlexible(n));
    if (!rowNodes.length) continue;
    if (rowNodes.some(n => n.type === "combat")) continue;
    const victim =
      rowNodes.find(n => n.type === "planet") ||
      rowNodes.find(n => n.type === "distress") ||
      rowNodes.find(n => n.type === "black-market") ||
      rowNodes.find(n => n.type === "shop") ||
      rowNodes.find(n => n.type === "dock") ||
      rowNodes[0];
    if (victim) convertNodeToCombat(victim, ri <= 2 ? "easy" : "medium");
  }

  let flex = nodes.filter(isFlexible);
  let flexCount = flex.length;
  let combatTargetMin = Math.ceil(flexCount * 0.6);
  let combatTargetMax = Math.floor(flexCount * 0.7);

  function combatCount() {
    return nodes.filter(n => isFlexible(n) && n.type === "combat").length;
  }

  let guard = 0;
  while (combatCount() < combatTargetMin && guard++ < 48) {
    const nonCombat = flex.filter(
      n => n.type === "planet" || n.type === "distress" || n.type === "black-market"
    );
    if (!nonCombat.length) break;
    nonCombat.sort((a, b) => a.row - b.row);
    convertNodeToCombat(nonCombat[0], nonCombat[0].row <= 2 ? "easy" : "medium");
    flex = nodes.filter(isFlexible);
    flexCount = flex.length;
    combatTargetMin = Math.ceil(flexCount * 0.6);
    combatTargetMax = Math.floor(flexCount * 0.7);
  }

  guard = 0;
  while (combatCount() > combatTargetMax && guard++ < 48) {
    const combats = nodes.filter(n => isFlexible(n) && n.type === "combat");
    if (!combats.length) break;
    const byRow = new Map();
    for (const c of combats) {
      if (!byRow.has(c.row)) byRow.set(c.row, []);
      byRow.get(c.row).push(c);
    }
    let victim = null;
    for (const arr of byRow.values()) {
      if (arr.length > 1) {
        victim = arr.sort((a, b) => b.row - a.row)[0];
        break;
      }
    }
    if (!victim) break;
    convertNodeToPlanet(victim);
    flex = nodes.filter(isFlexible);
    flexCount = flex.length;
    combatTargetMax = Math.floor(flexCount * 0.7);
  }

  const t = tallySpecial();
  console.log("[node distribution]", {
    combat: t.combat,
    dock: t.dock,
    shop: t.shop
  });
  return nodes;
}

function finalizeCampaignLaneMap(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const nodeRows = nodes.map(n => (typeof n.row === "number" ? n.row : -1));
  const maxRow = nodeRows.length ? Math.max(...nodeRows) : -1;
  const rows = [];
  for (let i = 0; i <= maxRow; i++) rows.push(i);
  console.log("[map size]", rows.length, "rows");
  const gateIds = new Set(nodes.filter(n => n.type === "gate").map(n => n.id));

  const rev = new Map();
  for (const n of nodes) {
    for (const t of n.neighbors || []) {
      if (!rev.has(t)) rev.set(t, []);
      rev.get(t).push(n.id);
    }
  }

  const fromStart = new Set();
  const startNode = nodes.find(n => n.type === "start");
  if (startNode) {
    const q = [startNode.id];
    fromStart.add(startNode.id);
    while (q.length) {
      const id = q.shift();
      const n = byId.get(id);
      if (!n) continue;
      for (const tid of n.neighbors || []) {
        if (!fromStart.has(tid)) {
          fromStart.add(tid);
          q.push(tid);
        }
      }
    }
  }

  const bossId = nodes.find(n => n.type === "gate" && n.row === maxRow)?.id || [...gateIds][0];
  const toBoss = new Set();
  if (bossId) {
    const q = [bossId];
    toBoss.add(bossId);
    while (q.length) {
      const id = q.shift();
      for (const pred of rev.get(id) || []) {
        if (!toBoss.has(pred)) {
          toBoss.add(pred);
          q.push(pred);
        }
      }
    }
  }

  for (const node of nodes) {
    const fwd = node.neighbors || [];
    console.log("[map validation]", "node", node.id, "forwardConnections", fwd);

    const isBossLayer = gateIds.has(node.id) && node.row === maxRow;
    if (isBossLayer) continue;

    if (fwd.length === 0) {
      console.error("[map validation] dead end (no forward)", node.id);
    }
    for (const tid of fwd) {
      const t = byId.get(tid);
      if (!t) {
        console.error("[map validation] unknown forward id", node.id, "->", tid);
        continue;
      }
      if (typeof node.row === "number" && typeof t.row === "number" && t.row !== node.row + 1) {
        console.error("[map validation] not next row", node.id, "row", node.row, "->", tid, "row", t.row);
      }
    }
    if (!fromStart.has(node.id)) {
      console.error("[map validation] unreachable from start", node.id);
    }
    if (bossId && !toBoss.has(node.id)) {
      console.error("[map validation] cannot reach boss from", node.id);
    }
  }

  for (let ri = 0; ri <= maxRow; ri++) {
    const rowNodes = nodes.filter(n => n.row === ri);
    console.log("[campaign map rows]", ri, rowNodes.map(n => n.id));
  }

  ensureShopOnEveryPathToBoss(nodes);
  ensureDockOnEveryPathToBoss(nodes);
  rebalanceCampaignNodeDistribution(nodes);
  ensureShopOnEveryPathToBoss(nodes);
  ensureDockOnEveryPathToBoss(nodes);
  return nodes;
}

function createSectorByNumber(sectorNumber) {
  return finalizeCampaignLaneMap(createSingleRunCampaignMap());
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
    return "Boss Contract (Available)";
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

function isSandboxMapMode() {
  return state.endlessMode;
}

function isCampaignLaneMovement() {
  return !isSandboxMapMode();
}

function passesGuidedForwardRules(targetNodeId) {
  const currentNode = getCurrentNode();
  if (!currentNode) return false;
  if (targetNodeId === state.currentNodeId) return false;
  if (!currentNode.neighbors.includes(targetNodeId)) return false;

  const target = getNodeById(targetNodeId);
  if (!target) return false;

  if (
    isCampaignLaneMovement() &&
    typeof currentNode.row === "number" &&
    typeof target.row === "number" &&
    target.row !== currentNode.row + 1
  ) {
    return false;
  }

  if (target.type === "dock" && isNodeVisited(targetNodeId)) {
    return true;
  }

  if (state.lockedNodeIds.includes(targetNodeId)) {
    return false;
  }

  if (isNodeVisited(targetNodeId)) {
    return false;
  }

  return true;
}

const GUIDED_MAX_BRANCHES = 3;

function getGuidedForwardNeighborIds() {
  const currentNode = getCurrentNode();
  if (!currentNode) return [];
  const candidates = currentNode.neighbors.filter(id => passesGuidedForwardRules(id));
  if (isCampaignLaneMovement()) return candidates;
  if (candidates.length <= GUIDED_MAX_BRANCHES) return candidates;
  return [...candidates].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, GUIDED_MAX_BRANCHES);
}

const TRAVEL_LONG_EDGE_DIST = 175;

function getTravelFuelCost(fromId, toId) {
  const from = getNodeById(fromId);
  const to = getNodeById(toId);
  if (!from || !to) return 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const longEdge = dist > TRAVEL_LONG_EDGE_DIST;
  const specialNode = to.type === "elite" || to.type === "gate";
  return longEdge || specialNode ? 2 : 1;
}

function syncPlayerFuelFromRun() {
  if (state.player && state.run) {
    state.player.fuel = state.run.fuel;
  }
}

function applyFuelCapForRunState() {
  if (!state.player || !state.run) return;
  const campaign = !state.endlessMode;
  state.player.maxFuel = campaign ? CAMPAIGN_MAX_FUEL : SANDBOX_MAX_FUEL;
  state.run.fuel = Math.min(state.run.fuel, state.player.maxFuel);
  syncPlayerFuelFromRun();
}

function applyOutOfFuelMovePenalty() {
  const dmg = Math.max(1, Math.floor(state.player.maxHull * 0.02));
  state.player.hull = Math.max(0, state.player.hull - dmg);
  log("Warning: Out of fuel — hull damage sustained");
  if (state.player.hull <= 0) {
    showOverlay("Run Failed", "Hull breach — ship destroyed.", "Restart Run", () => startRun());
  }
}

function canTravelToNode(targetNodeId) {
  const currentNode = getCurrentNode();
  if (!currentNode) return false;
  if (targetNodeId === state.currentNodeId) return false;
  if (!currentNode.neighbors.includes(targetNodeId)) return false;

  if (isSandboxMapMode()) {
    return true;
  }

  return getGuidedForwardNeighborIds().includes(targetNodeId);
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
    text = "Hangar. Starting point for this campaign climb.";
  } else if (node.type === "combat") {
    const danger = (node.danger || "medium").toLowerCase();
    const threat = danger.charAt(0).toUpperCase() + danger.slice(1);
    const pool = filterEncounterBucketsForSectorPreview(state.sectorNumber);
    const themes = collectSoftEncounterTagsForMap(state.sectorNumber, false).slice(0, 4);
    const themeStr = themes.length ? ` Themes: ${formatEncounterTagsList(themes)}.` : "";
    const namesHint =
      pool.length > 0
        ? ` e.g. ${pool
            .slice(0, 2)
            .map(b => `${b.name} (${formatEncounterTagsList(b.tags)})`)
            .join("; ")}`
        : "";
    text = `Combat. Threat ${threat}.${themeStr}${namesHint}.`;
  } else if (node.type === "dock") {
    text = "Dock. Repair and refuel opportunities.";
  } else if (node.type === "planet") {
    text = "Planet. Event node with possible risks or rewards.";
  } else if (node.type === "shop") {
    text = "Shop. Spend credits on cards, upgrades, or services.";
  } else if (node.type === "elite") {
    const pool = filterEliteBucketsForSector(state.sectorNumber);
    const themes = collectSoftEncounterTagsForMap(state.sectorNumber, true).slice(0, 4);
    const themeStr = themes.length ? ` Themes: ${formatEncounterTagsList(themes)}.` : "";
    const namesHint =
      pool.length > 0
        ? ` e.g. ${pool
            .slice(0, 2)
            .map(b => `${b.name} (${formatEncounterTagsList(b.tags)})`)
            .join("; ")}`
        : "";
    text = `Elite contract.${themeStr}${namesHint}.`;
  } else if (node.type === "gate") {
    text = "Boss Contract. Final encounter of the campaign climb.";
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
  } else if (currentNode && currentNode.neighbors.includes(node.id) && canTravelToNode(node.id)) {
    stateNotes.push("Available to travel.");
  }
  if (isNodeVisited(node.id)) stateNotes.push("Previously visited.");
  if (isNodeCleared(node.id)) stateNotes.push("Encounter already completed.");
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
  const ec = state.encounterIndex || 0;
  return `Combats won ${ec} / ${RUN_LENGTH} • Campaign climb • Nodes ${visited}/${total} • Cleared ${cleared}`;
}

function getNodeSymbol(node) {
  if (!node) return "?";
  if (node.type === "start") return "⌂";
  if (node.type === "combat") return "⌖";
  if (node.type === "dock") return "⛭";
  if (node.type === "planet") return "◎";
  if (node.type === "shop") return "$";
  if (node.type === "black-market") return "✦";
  if (node.type === "distress") return "!";
  if (node.type === "elite") return "☠";
  if (node.type === "gate") return "★";
  return "?";
}

function getMapNodeKindLabel(node) {
  if (!node) return "";
  if (node.type === "start") return "Hangar";
  if (node.type === "combat") return "Combat";
  if (node.type === "elite") return "Elite";
  if (node.type === "gate") return "Boss";
  if (node.type === "dock") return "Dock";
  if (node.type === "planet") return "Planet";
  if (node.type === "shop") return "Shop";
  if (node.type === "distress") return "Distress";
  if (node.type === "black-market") return "Black Market";
  return node.type;
}

function getRouteIdentityForMapNode(node) {
  if (!node || !state.mapNodes || state.mapNodes.length === 0) {
    return { routeType: "middle", preferredTags: ["balanced", "defense", "sustain"] };
  }
  if (typeof node.x === "number") {
    if (node.x < 395) {
      return { routeType: "left", preferredTags: ["economy", "sustain", "swarm"] };
    }
    if (node.x > 625) {
      return { routeType: "right", preferredTags: ["burst", "elite-support", "alien"] };
    }
    return { routeType: "middle", preferredTags: ["balanced", "defense", "sustain"] };
  }
  const ys = state.mapNodes.map(n => n.y);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const span = Math.max(1, yMax - yMin);
  const t = (node.y - yMin) / span;
  if (t < 0.34) {
    return { routeType: "upper", preferredTags: ["burst", "swarm", "elite-support"] };
  }
  if (t > 0.66) {
    return { routeType: "lower", preferredTags: ["alien", "sustain", "mixed"] };
  }
  return { routeType: "middle", preferredTags: ["balanced", "defense", "sustain"] };
}

function getMapNodeTagHintLine(node) {
  const ri = getRouteIdentityForMapNode(node);
  const tags = ri.preferredTags.slice(0, 2);
  return tags.map(formatEncounterTagForDisplay).join(" · ");
}

function getBossRingStrokeColor() {
  const id = state.bossEncounterId || "bastion";
  if (id === "overloader") return "rgba(255, 150, 95, 0.9)";
  if (id === "hive-mind") return "rgba(190, 140, 255, 0.9)";
  return "rgba(120, 190, 255, 0.9)";
}

function getGateBossSubtitle() {
  const id = state.bossEncounterId || "bastion";
  if (id === "overloader") return "Burst • High Damage";
  if (id === "hive-mind") return "Swarm • Summons";
  return "Defense • High Armor";
}

function renderStarMapSvg() {
  const currentNode = getCurrentNode();
  if (!currentNode) return "";
  console.log(
    "[elite render verify]",
    ["n10", "n20"].map(id => {
      const node = state.mapNodes.find(n => n.id === id);
      return { id, type: node?.type || "missing" };
    })
  );

  const mapHasRowLayering = state.mapNodes.some(n => typeof n.row === "number");
  const currentRow = typeof currentNode.row === "number" ? currentNode.row : null;
  const rowWindowBehind = 2;
  const rowWindowAhead = 8;
  const maxRow = mapHasRowLayering
    ? Math.max(...state.mapNodes.map(n => (typeof n.row === "number" ? n.row : 0)))
    : null;
  const stepY = 74;
  const topPad = 64;

  function rowInLookaheadBand(row) {
    if (currentRow === null || typeof row !== "number") return false;
    return row >= currentRow && row <= currentRow + rowWindowAhead;
  }

  function edgeInLookaheadBand(a, b) {
    if (!mapHasRowLayering || currentRow === null) return false;
    const ra = typeof a.row === "number" ? a.row : null;
    const rb = typeof b.row === "number" ? b.row : null;
    if (ra === null || rb === null) return false;
    const lo = Math.min(ra, rb);
    const hi = Math.max(ra, rb);
    return hi <= currentRow + rowWindowAhead && lo >= currentRow - rowWindowBehind;
  }

  function getRenderPoint(node) {
    if (!mapHasRowLayering || typeof node.row !== "number" || maxRow === null) {
      return { x: node.x, y: node.y };
    }
    const y = topPad + (maxRow - node.row) * stepY;
    const x = 560 + (node.x - 560) * 1.14;
    return { x, y };
  }

  const drawnEdges = new Set();
  const lineParts = [];
  const nodeParts = [];

  for (const node of state.mapNodes) {
    let renderedFromNodeCount = 0;
    for (const neighborId of node.neighbors || []) {
      if (renderedFromNodeCount >= 3) break;
      const key = [node.id, neighborId].sort().join("-");
      if (drawnEdges.has(key)) continue;

      const neighbor = getNodeById(neighborId);
      if (!neighbor) continue;
      const isAdjacentEdge =
        (node.id === state.currentNodeId && canTravelToNode(neighborId)) ||
        (neighborId === state.currentNodeId && canTravelToNode(node.id));
      let edgeClass = isAdjacentEdge ? "map-edge map-edge-adjacent" : "map-edge map-edge-dim";
      if (!isAdjacentEdge && edgeInLookaheadBand(node, neighbor)) {
        edgeClass = "map-edge map-edge-lookahead";
      }

      drawnEdges.add(key);
      renderedFromNodeCount += 1;
      const a = getRenderPoint(node);
      const b = getRenderPoint(neighbor);

      lineParts.push(`
        <line
          class="${edgeClass}"
          x1="${a.x}"
          y1="${a.y}"
          x2="${b.x}"
          y2="${b.y}"
        />
      `);
    }
  }

  for (const node of state.mapNodes) {
    const rp = getRenderPoint(node);
    const isCurrent = node.id === state.currentNodeId;
    const isVisited = isNodeVisited(node.id);
    const isCleared = isNodeCleared(node.id);
    const isAdjacent = currentNode.neighbors.includes(node.id) && canTravelToNode(node.id);
    const isEliteCheckpoint = node.id === "n10" || node.id === "n20";

    let fill = "#1c2c4a";
    if (node.type === "start") fill = "#ffd166";
    if (node.type === "dock") fill = "#1d7b84";
    if (node.type === "planet") fill = "#6b49a3";
    if (node.type === "elite") fill = "#b63c4a";
    if (node.type === "gate") fill = "#f1bb44";
    if (node.type === "shop") fill = "#d8a83f";
    if (node.type === "combat") {
      if (node.danger === "easy") fill = "#4c7fc0";
      else if (node.danger === "medium") fill = "#3f6da8";
      else if (node.danger === "hard") fill = "#335a8b";
      else fill = "#3f6da8";
    }

    let stroke = "rgba(255,255,255,0.16)";
    let strokeWidth = 2;
    let opacity = 1;
    let cursor = "default";
    let radius = 28;
    const isInteractive = isCurrent || isAdjacent;
    const classParts = ["star-node"];
    if (node.type === "start") radius = 31;
    if (node.type === "elite") radius = 31;
    if (node.type === "gate") radius = 34;

    let drawRadius = radius;
    if (isAdjacent && !isCurrent) drawRadius = radius + 4;

    if (isInteractive) {
      opacity = isCleared ? 0.9 : 1;
    } else if (mapHasRowLayering && typeof node.row === "number" && currentRow !== null) {
      if (node.row < currentRow - rowWindowBehind) {
        opacity = 0.28;
      } else if (node.row < currentRow) {
        opacity = 0.42;
      } else if (rowInLookaheadBand(node.row)) {
        opacity = 0.88;
      } else {
        opacity = 0.38;
      }
    } else {
      opacity = 0.48;
    }
    if (node.type === "elite") {
      opacity = Math.max(opacity, 0.96);
    }

    if (isVisited) stroke = "rgba(121,188,255,0.65)";
    if (node.type === "start") {
      stroke = "rgba(255, 230, 170, 0.95)";
      strokeWidth = 3;
    }
    if (isCurrent) {
      stroke = "#ffe08a";
      strokeWidth = 5;
      cursor = "pointer";
    } else if (isAdjacent) {
      stroke = "#b8e8ff";
      strokeWidth = 4.2;
      cursor = "pointer";
    }
    if (isCurrent) classParts.push("is-current");
    if (isAdjacent && !isCurrent) classParts.push("is-adjacent");
    if (isVisited) classParts.push("is-visited");
    if (isCleared) classParts.push("is-cleared");
    if (isInteractive) classParts.push("is-interactive");
    if (!isInteractive) classParts.push("is-map-dimmed");
    if (isAdjacent && !isCurrent) classParts.push("is-next-available");
    if (node.type === "start") classParts.push("is-start");
    if (node.type === "elite") classParts.push("is-elite");
    if (node.type === "gate") classParts.push("is-gate");
    if (node.type === "shop") classParts.push("is-shop");
    if (node.type === "dock") classParts.push("is-dock");

    const labelsInner = "";

    const tooltipText = getMapNodeTooltip(node, currentNode);
    nodeParts.push(`
      <g class="${classParts.join(" ")}" data-node-id="${node.id}" data-node-type="${node.type}" data-elite-checkpoint="${isEliteCheckpoint ? "true" : "false"}" data-tooltip="${tooltipText}" data-interactive="${isInteractive ? "true" : "false"}" style="cursor:${cursor}; opacity:${opacity}">
        ${
          node.type === "gate"
            ? `<circle class="boss-node-glow" cx="${rp.x}" cy="${rp.y}" r="${drawRadius + 10}" fill="none" stroke="${
                getBossRingStrokeColor()
              }" stroke-width="2.4" />`
            : ""
        }
        ${
          node.type === "start"
            ? `<circle cx="${rp.x}" cy="${rp.y}" r="${drawRadius + 6}" fill="none" stroke="rgba(255, 225, 155, 0.5)" stroke-width="2.2" />`
            : ""
        }
        ${
          node.type === "elite"
            ? `<circle cx="${rp.x}" cy="${rp.y}" r="${drawRadius + 6}" fill="none" stroke="rgba(255, 88, 88, 0.82)" stroke-width="3.4" />
               <circle cx="${rp.x}" cy="${rp.y}" r="${drawRadius + 10}" fill="none" stroke="rgba(255, 110, 110, 0.32)" stroke-width="2.2" />`
            : ""
        }
        <circle
          class="star-node-core"
          cx="${rp.x}"
          cy="${rp.y}"
          r="${drawRadius}"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
        />
        <text class="star-node-symbol" x="${rp.x}" y="${rp.y + 7}" text-anchor="middle" font-size="${
          node.type === "elite" ? 22 : node.type === "gate" ? 21 : 20
        }" font-weight="800" fill="#e6f0ff">
          ${getNodeSymbol(node)}
        </text>
        ${labelsInner}
      </g>
    `);
  }

  return `
    <div class="star-map-shell">
      <svg class="star-map-svg" viewBox="0 0 1120 ${topPad * 2 + ((maxRow ?? 0) + 1) * stepY}" preserveAspectRatio="xMidYMin meet" width="100%" role="img" aria-label="Campaign map" data-current-row="${currentRow ?? 0}" data-max-row="${maxRow ?? 0}">
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
  const i = encounterIndex;
  if (i <= 3) return ["easy"];
  if (i <= 8) return ["easy", "medium"];
  if (i <= 15) return ["medium"];
  if (i <= 22) return ["medium", "hard"];
  if (i <= 28) return ["hard"];
  return ["hard", "medium"];
}

function getRunProgressStage(encounterIndex = state.encounterIndex || 0) {
  if (encounterIndex <= 9) return 1;
  if (encounterIndex <= 19) return 2;
  return 3;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function pickRandomBossEncounterId() {
  return pickRandom(["bastion", "overloader", "hive-mind"]);
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
        resolveCombatAfterDamageIfNeeded();
        if (state.pendingExtraction) return;
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
    id: "focused-beam",
    name: "Focused Beam",
    type: "system",
    cost: 1,
    description: "Charge +2 Beam. Deal 4 damage.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) + 2;
      dealAttackDamageToEnemy(4, "Focused Beam");
      log("Focused Beam builds 2 charge and hits for 4.", "system");
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
    cost: 3,
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
    cost: 2,
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
    id: "beam-burst",
    name: "Beam Burst",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. +1 per Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const beam = enemy.beamCharge || 0;
      dealAttackDamageToEnemy(3 + beam, "Beam Burst");
    }
  },
  {
    id: "beam-siphon",
    name: "Beam Siphon",
    type: "system",
    cost: 1,
    description: "Gain 1 energy. Charge +1 Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      state.player.energy += 1;
      enemy.beamCharge = (enemy.beamCharge || 0) + 1;
      log("Beam Siphon grants 1 energy and adds 1 Beam.", "system");
    }
  },
  {
    id: "prism-lance",
    name: "Prism Lance",
    type: "system",
    cost: 2,
    description: "Deal 4 damage. +3 per Beam. Consume half Beam.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      const beam = enemy.beamCharge || 0;
      const consume = Math.floor(beam / 2);
      enemy.beamCharge = Math.max(0, beam - consume);
      dealAttackDamageToEnemy(4 + beam * 3, "Prism Lance");
      if (consume > 0) log(`Prism Lance consumes ${consume} Beam.`, "system");
    }
  },
  {
    id: "steady-charge",
    name: "Steady Charge",
    type: "system",
    cost: 1,
    description: "Charge +2 Beam. Draw 1 card.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.beamCharge = (enemy.beamCharge || 0) + 2;
      drawCards(1);
      log("Steady Charge builds 2 Beam and draws 1.", "system");
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
  },
  {
    id: "ash-volley",
    name: "Ash Volley",
    type: "system",
    cost: 1,
    description: "Deal 3 damage. Apply 2 Burn.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      dealAttackDamageToEnemy(3, "Ash Volley");
      enemy.burnStacks = (enemy.burnStacks || 0) + 2;
      log("Ash Volley applies Burn.", "system");
    }
  },
  {
    id: "slow-burn",
    name: "Slow Burn",
    type: "system",
    cost: 1,
    description: "Apply 1 Burn. Burn deals +1 damage this combat.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.burnStacks = (enemy.burnStacks || 0) + 1;
      state.player.burnBonus = (state.player.burnBonus || 0) + 1;
      log("Slow Burn ramps burn damage.", "system");
    }
  },
  {
    id: "toll-booth",
    name: "Toll Booth",
    type: "system",
    cost: 1,
    description: "Gain 4 credits.",
    effect() {
      gainCredits(4, "Toll Booth");
    }
  },
  {
    id: "snub-screen",
    name: "Snub Screen",
    type: "system",
    cost: 1,
    description: "If Snub is active, gain 7 block. Otherwise gain 3 block.",
    effect() {
      const snub = state.player?.snub;
      const bonus = state.player.shieldBonus || 0;
      if (snub && snub.alive) {
        gainPlayerBlock(7 + bonus, "Snub Screen");
      } else {
        gainPlayerBlock(3 + bonus, "Snub Screen");
      }
    }
  },
  {
    id: "thermal-vent",
    name: "Thermal Vent",
    type: "system",
    cost: 1,
    description: "Vent up to 3 Heat. Deal 2 damage per Heat vented.",
    effect() {
      const heat = state.player.heat || 0;
      const lost = Math.min(3, heat);
      if (lost <= 0) return;
      state.player.heat = heat - lost;
      dealAttackDamageToEnemy(lost * 2, "Thermal Vent");
    }
  },
  {
    id: "drone-chip",
    name: "Drone Chip",
    type: "system",
    cost: 1,
    description: "Deploy 1 drone. Gain 2 credits.",
    effect() {
      state.player.drones = (state.player.drones || 0) + 1;
      gainCredits(2, "Drone Chip");
    }
  },
  {
    id: "anchor-matrix",
    name: "Anchor Matrix",
    type: "system",
    cost: 1,
    description: "Gain 6 block. If you already have block, gain 4 more.",
    effect() {
      const hadBlock = (state.player.block || 0) > 0;
      const amount = hadBlock ? 10 : 6;
      gainPlayerBlock(amount + (state.player.shieldBonus || 0), "Anchor Matrix");
      log(
        hadBlock ? "Anchor Matrix reinforces your shields." : "Anchor Matrix projects a fresh barrier.",
        "system"
      );
    }
  },
  {
    id: "kinetic-redirect",
    name: "Kinetic Redirect",
    type: "system",
    cost: 1,
    description: "Deal damage equal to your Block. Your Block becomes 0.",
    effect() {
      const b = state.player.block || 0;
      dealAttackDamageToEnemy(b, "Kinetic Redirect");
      state.player.block = 0;
      log("Kinetic Redirect converts block into a strike.", "system");
    }
  },
  {
    id: "fortified-core",
    name: "Fortified Core",
    type: "system",
    cost: 1,
    description: "Gain 4 block. Block cards gain +1 block this combat.",
    effect() {
      gainPlayerBlock(4 + (state.player.shieldBonus || 0), "Fortified Core");
      state.player.shieldBonus = (state.player.shieldBonus || 0) + 1;
      log("Fortified Core hardens your shield emitters.", "system");
    }
  },
  {
    id: "auxiliary-feed",
    name: "Auxiliary Feed",
    type: "system",
    cost: 1,
    description: "Gain 1 energy.",
    effect() {
      state.player.energy += 1;
      log("Auxiliary Feed routes spare power.", "system");
    }
  },
  {
    id: "salvage-scan",
    name: "Salvage Scan",
    type: "system",
    cost: 1,
    description: "Draw 2 cards. Discard 1 random card from your hand.",
    effect() {
      drawCards(2);
      if (state.hand.length === 0) return;
      const idx = Math.floor(Math.random() * state.hand.length);
      const [discarded] = state.hand.splice(idx, 1);
      state.discardPile.push(discarded);
      log(`Salvage Scan jettisons ${discarded.name}.`, "system");
    }
  },
  {
    id: "braced-strike",
    name: "Braced Strike",
    type: "system",
    cost: 1,
    description: "Gain 3 block. Deal 3 damage.",
    effect() {
      gainPlayerBlock(3 + (state.player.shieldBonus || 0), "Braced Strike");
      dealAttackDamageToEnemy(3, "Braced Strike");
    }
  },
  {
    id: "black-market-stash",
    name: "Black Market Stash",
    type: "system",
    cost: 1,
    description: "Gain 4 credits.",
    effect() {
      gainCredits(4, "Black Market Stash");
    }
  },
  {
    id: "risk-dividend",
    name: "Risk Dividend",
    type: "system",
    cost: 0,
    description: "Gain 3 credits. Take 1 hull damage.",
    effect() {
      gainCredits(3, "Risk Dividend");
      state.player.hull = Math.max(0, state.player.hull - 1);
      log("Risk Dividend cuts into the hull for profit.", "system");
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

const NEUTRAL_CARDS = [
  {
    id: "quick-cycle",
    name: "Quick Cycle",
    category: "neutral",
    type: "system",
    cost: 1,
    description: "Discard your hand. Draw the same number of cards you discarded (including this).",
    effect() {
      const n = state.hand.length + 1;
      discardHand();
      drawCards(n);
      log("Quick Cycle clears the hand and refreshes.", "system");
    }
  },
  {
    id: "energy-surge",
    name: "Energy Surge",
    category: "neutral",
    type: "system",
    cost: 0,
    exhaust: true,
    description: "Gain +1 energy this turn. Exhaust.",
    effect() {
      state.player.energy += 1;
      log("Energy Surge spikes reactor output (+1 energy).", "system");
    }
  },
  {
    id: "emergency-shields",
    name: "Emergency Shields",
    category: "neutral",
    type: "system",
    cost: 1,
    description: "Gain 8 block.",
    effect() {
      gainPlayerBlock(8 + (state.player.shieldBonus || 0), "Emergency Shields");
    }
  },
  {
    id: "neutral-lock",
    name: "Target Lock",
    category: "neutral",
    type: "system",
    cost: 1,
    description: "Selected enemy takes +2 damage from attacks this turn. Draw 1 card.",
    effect() {
      const enemy = getSelectedEnemy();
      if (!enemy) return;
      enemy.extraDamageFromLockThisTurn = (enemy.extraDamageFromLockThisTurn || 0) + 2;
      drawCards(1);
      log(
        `Target Lock: ${enemy.name} takes +${enemy.extraDamageFromLockThisTurn} extra per attack this turn.`,
        "system"
      );
    }
  },
  {
    id: "stabilize-systems",
    name: "Stabilize Systems",
    category: "neutral",
    type: "system",
    cost: 1,
    description: "Clear disruption on your ship. Draw 1 card.",
    effect() {
      let cleared = false;
      if ((state.player.damageReductionFlat || 0) > 0) {
        state.player.damageReductionFlat = 0;
        cleared = true;
      }
      drawCards(1);
      log(
        cleared ? "Stabilize Systems clears hull stress. Draw 1." : "Stabilize Systems: draw 1.",
        "system"
      );
    }
  }
];

const ALL_CARDS = [...SYSTEM_CARDS, ...MISSILE_CARDS, ...NEUTRAL_CARDS];

const CARD_TAGS_BY_ID = {
  "focused-beam": ["beam"],
  "charge-beam": ["beam"],
  "laser-pulse": ["beam"],
  "full-beam": ["beam", "ultra"],
  "beam-burst": ["beam"],
  "beam-siphon": ["beam"],
  "prism-lance": ["beam"],
  "steady-charge": ["beam"],
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
  "ash-volley": ["burn"],
  "slow-burn": ["burn"],
  "toll-booth": ["economy"],
  "snub-screen": ["snub"],
  "thermal-vent": ["overheat"],
  "drone-chip": ["drone"],
  "anchor-matrix": ["block"],
  "kinetic-redirect": ["block"],
  "fortified-core": ["block"],
  "auxiliary-feed": ["neutral"],
  "salvage-scan": ["neutral"],
  "braced-strike": ["neutral"],
  "black-market-stash": ["neutral"],
  "risk-dividend": ["neutral"],

  "basic-attack": ["neutral"],
  "basic-block": ["neutral"],
  "pulse-shot": ["neutral"],
  missile: ["neutral"],
  "debug-delete": ["neutral"],

  "quick-cycle": ["neutral"],
  "energy-surge": ["neutral"],
  "emergency-shields": ["neutral"],
  "neutral-lock": ["neutral"],
  "stabilize-systems": ["neutral"],

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

const TRACKED_ARCHETYPE_TAGS = ["beam", "burn", "snub", "block", "mark", "economy", "drone", "overheat"];
const WEAK_ARCHETYPE_TAGS = ["burn", "economy", "snub", "overheat", "drone"];
const OFF_ARCHETYPE_POOL_CHANCE = 0.36;
const ARCHETYPE_SEED_RATE_EARLY = 0.36;
const ARCHETYPE_SEED_RATE_ELITE = 0.54;

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

    if (
      TRACKED_ARCHETYPE_TAGS.some(t => tags.includes(t)) &&
      !tags.includes(allowedArchetype) &&
      !tags.includes("neutral") &&
      Math.random() < OFF_ARCHETYPE_POOL_CHANCE
    ) {
      return true;
    }

    return false;
  });
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
  const committed = state.run?.committedArchetype || null;
  const encounter = state.run?.encounterCount || 0;
  const earlyRun = encounter <= 2;
  const earlyDirectionWindow = encounter <= 3;
  const shipArchetype = getShipArchetype(state.selectedShipId);
  let weight = 1;
  const isArchetypeCard = tags.includes(shipArchetype);
  const isEliteReward = Boolean(state.eliteContractCombat);
  const recentOffers = state.run?.recentRewardOfferIds || [];
  const seenInLastOne = recentOffers[recentOffers.length - 1] === card.id;
  const seenInLastTwo = recentOffers.slice(-2).includes(card.id);

  weight *= getArchetypeRepresentationMultiplier(card);

  if (committed && tags.includes(committed)) {
    weight *= 1.28;
  }
  if (committed && tags.includes("commit") && tags.includes(committed)) {
    weight *= 1.38;
  }
  if (isArchetypeCard) {
    weight *= isEliteReward ? 1.08 : 0.92;
  }
  if (earlyDirectionWindow && isArchetypeCard) {
    weight *= 0.9;
  }

  if (isArchetypeCard) {
    if (encounter <= 1) weight *= 0.92;
    else if (encounter === 2) weight *= 0.96;
  }

  if (tags.includes("block") && encounter <= 2) {
    weight *= 1.2;
    console.log("[block bias]", card.name, weight);
  }

  if (earlyRun && tags.includes("neutral") && card.category !== "neutral") {
    weight *= 1.22;
  }
  if (card.category === "neutral") {
    weight *= 1.18;
  }
  if (earlyRun && tags.includes("beam")) {
    weight *= 0.82;
  }
  if (earlyRun) {
    const ownedCopies = (state.runDeck || []).filter(id => id === card.id).length;
    if (ownedCopies > 0) {
      weight *= 1 / (1 + ownedCopies * 0.45);
    }
  }

  if (!committed && isArchetypeCard) {
    const targetRate = isEliteReward ? ARCHETYPE_SEED_RATE_ELITE : ARCHETYPE_SEED_RATE_EARLY;
    weight *= targetRate / Math.max(0.01, 1 - targetRate);
  }

  if (seenInLastOne) {
    weight *= 0.12;
  } else if (seenInLastTwo) {
    weight *= 0.28;
  }

  weight *= getTimingWeightMultiplier(card.timing);

  const finalWeight = Math.max(0.01, weight);
  if (encounter <= 2) {
    console.log("[early bias]", card.name, encounter, finalWeight);
  }
  return finalWeight;
}

const MINI_COMBO_PAYOFF_IDS = new Set([
  "full-beam",
  "focused-beam",
  "beam-overload",
  "prism-lance",
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

function getArchetypeRepresentationMultiplier(card) {
  const run = state.run;
  if (!run) return 1;
  const counts = run.archetypeCounts || {};
  const keys = TRACKED_ARCHETYPE_TAGS;
  const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const mean = total / keys.length;
  const trackedOnCard = (card.tags || []).filter(tag => keys.includes(tag));
  if (trackedOnCard.length === 0) return 1;

  let deltaSum = 0;
  trackedOnCard.forEach(tag => {
    deltaSum += mean - (counts[tag] || 0);
  });
  const avgDelta = deltaSum / trackedOnCard.length;
  let mult = 1 + Math.max(-0.22, Math.min(0.28, avgDelta * 0.055));

  if (WEAK_ARCHETYPE_TAGS.some(w => trackedOnCard.includes(w) && (counts[w] || 0) === 0)) {
    mult *= 1.12;
  }

  return Math.max(0.55, mult);
}

function pickWeightedRewardCards(pool, count) {
  const pickedIds = new Set();
  const picks = [];
  let available = (pool || []).filter(c => c && c.id !== "debug-delete");

  function refillFromBroadPool() {
    const seen = new Set([...pickedIds, ...available.map(c => c.id)]);
    for (const card of ALL_CARDS) {
      if (!card || card.id === "debug-delete") continue;
      if (seen.has(card.id)) continue;
      available.push(card);
      seen.add(card.id);
    }
  }

  while (picks.length < count) {
    if (available.length === 0) {
      refillFromBroadPool();
    }
    if (available.length === 0) {
      const fallback = ALL_CARDS.find(c => c && c.id !== "debug-delete");
      if (fallback) {
        picks.push(fallback);
        pickedIds.add(fallback.id);
      }
      break;
    }

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

    const picked = weighted[pickedIndex].card;
    const pickedWeight = weighted[pickedIndex].weight;
    const archTags = (picked.tags || []).filter(t => TRACKED_ARCHETYPE_TAGS.includes(t));
    console.log(
      "[reward weight]",
      picked.name,
      archTags.length ? archTags : picked.tags || [],
      pickedWeight.toFixed(3)
    );
    picks.push(picked);
    pickedIds.add(picked.id);
    available = available.filter(c => c.id !== picked.id);
  }

  while (picks.length < count) {
    const fallback = ALL_CARDS.find(c => c && c.id !== "debug-delete");
    if (!fallback) break;
    picks.push(fallback);
  }

  console.log("[reward count]", picks.length);
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
  "focused-beam": "beam",
  "charge-beam": "beam",
  "laser-pulse": "beam",
  "full-beam": "beam",
  "beam-burst": "beam",
  "beam-siphon": "beam",
  "prism-lance": "beam",
  "steady-charge": "beam",
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
  "overclock-drill": "system",

  "quick-cycle": "neutral",
  "energy-surge": "neutral",
  "emergency-shields": "neutral",
  "neutral-lock": "neutral",
  "stabilize-systems": "neutral"
};

function getCardCategoryLabel(card) {
  const role = card.cardRole || "system";
  if (role === "weapon") return "Weapon";
  if (role === "tactical") return "Tactical";
  if (role === "beam") return "Beam";
  if (role === "mark") return "Mark";
  if (role === "neutral") return "Neutral";
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
  "beam-burst",
  "beam-siphon",
  "steady-charge",
  "prism-lance",
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
    id: "boss-bastion",
    name: "Bastion",
    difficulty: "boss",
    maxHull: 64,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 7, text: "Attack for 7" },
        { type: "block", amount: 10, text: "Fortifying defenses" },
        { type: "attack", amount: 8, text: "Attack for 8" },
        { type: "block", amount: 18, text: "Mass fortify — large block spike" }
      ];
      return cycle[(turn - 1) % cycle.length];
    }
  },
  {
    id: "boss-overloader",
    name: "Overloader",
    difficulty: "boss",
    maxHull: 56,
    getIntent(turn) {
      if (turn % 2 === 1) {
        return { type: "block", amount: 12, text: "Charging — heavy attack next turn" };
      }
      return { type: "attack", amount: 13, text: "Heavy discharge" };
    }
  },
  {
    id: "boss-hive-mind",
    name: "Hive Mind",
    difficulty: "boss",
    maxHull: 54,
    getIntent(turn) {
      const cycle = [
        { type: "attack", amount: 6, text: "Attack for 6" },
        { type: "attack", amount: 5, text: "Attack for 5" },
        { type: "block", amount: 5, text: "Reinforcing swarm" }
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
  },
  {
    id: "defender-drone",
    name: "Defender Drone",
    difficulty: "medium",
    counter: "defender-share",
    combatRole: "defender",
    priority: "high",
    maxHull: 22,
    getIntent(turn) {
      if (turn % 2 === 1) {
        return {
          type: "block",
          amount: 6,
          intentType: "self-shield",
          textTemplate: "Self shield — gains BLOCK block"
        };
      }
      return {
        type: "ally-block",
        amount: 6,
        intentType: "ally-shield",
        textTemplate: "Shield link — ally gains BLOCK block"
      };
    }
  },
  {
    id: "burner-drone",
    name: "Burner Drone",
    difficulty: "easy",
    counter: "burn-spray",
    combatRole: "burner",
    priority: "medium",
    maxHull: 12,
    getIntent(turn) {
      return {
        type: "attack",
        amount: 4,
        intentType: "burn-burst",
        textTemplate: "Thermal burst — BLOCK damage (+2 self Burn/turn)"
      };
    }
  },
  {
    id: "charger-drone",
    name: "Charger Drone",
    difficulty: "medium",
    combatRole: "charger",
    priority: "medium",
    maxHull: 18,
    getIntent(turn) {
      if (turn % 2 === 1) {
        return {
          type: "block",
          amount: 8,
          intentType: "charging",
          textTemplate: "Charging — gains BLOCK block (next: heavy attack)"
        };
      }
      return {
        type: "attack",
        amount: 9,
        intentType: "discharge",
        textTemplate: "Discharge — BLOCK damage"
      };
    }
  },
  {
    id: "alien-parasite",
    name: "Alien Parasite",
    difficulty: "medium",
    counter: "parasite",
    combatRole: "parasite",
    priority: "low",
    maxHull: 16,
    getIntent(turn) {
      if (turn % 2 === 1) {
        return {
          type: "attack",
          amount: 5,
          intentType: "drain",
          textTemplate: "Drain claw — BLOCK damage (heals on hull hit)"
        };
      }
      return {
        type: "block",
        amount: 4,
        intentType: "brace",
        textTemplate: "Harden shell — gains BLOCK block"
      };
    }
  }
];

function pickVarietyEnemy() {
  const ids = [
    "defender-drone",
    "burner-drone",
    "charger-drone",
    "alien-parasite",
    "scout",
    "raider",
    "hunter"
  ];
  const pool = ids.map(id => getEnemyTypeById(id)).filter(Boolean);
  return pool.length ? pickRandom(pool) : ENEMY_TYPES[1];
}

const els = {
  restartBtn: document.getElementById("restartBtn"),
  muteBtn: document.getElementById("muteBtn"),
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
  battlefieldFloatLayer: document.getElementById("battlefieldFloatLayer"),
  combatGrid: document.querySelector(".combat-grid"),
  controls: document.querySelector(".controls"),
  handSection: document.querySelector(".hand-section"),
  logSection: document.querySelector(".log-section"),
  combatScreen: document.getElementById("combatScreen"),
  miningMinigameOverlay: document.getElementById("miningMinigameOverlay"),
  miningMarker: document.getElementById("miningMarker"),
  miningResultText: document.getElementById("miningResultText"),
  miningExtractBtn: document.getElementById("miningExtractBtn"),
  miningContinueBtn: document.getElementById("miningContinueBtn")
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
  els.shipSelectOptions.classList.add("ship-select-grid");

  SHIP_OPTIONS.forEach(ship => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `reward-option ship-select-card ship-accent-${ship.id}`;
    const fantasy = SHIP_FANTASY_BY_ID[ship.id] || ship.description;
    const traits = SHIP_TRAITS_BY_ID[ship.id] || [];
    btn.innerHTML = `
      <div class="ship-select-head">
        <div class="reward-name">${ship.name}</div>
        <div class="reward-meta ship-role">${fantasy}</div>
      </div>
      <div class="ship-trait-row">
        ${traits.map(t => `<span class="ship-trait-pill">${t}</span>`).join("")}
      </div>
      <div class="reward-meta ship-secondary">${ship.description}</div>
    `;
    btn.addEventListener("click", () => {
      btn.classList.add("is-selected");
      setTimeout(() => startRun(ship.id), 90);
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
        <div class="snub-ship-wrap" aria-hidden="true"><div class="ship-sprite ship-sprite--snub"></div></div>
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
      const enemyTier = enemy.bossType ? "boss" : enemy.difficulty === "elite" ? "elite" : "normal";

      return `
        <div class="enemy-lane">
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
          <div class="enemy-silhouette" aria-hidden="true"><div class="ship-sprite ship-sprite--enemy" data-tier="${enemyTier}"></div></div>
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
        </div>
      `;
    })
    .join("");

  const aliveEnemies = getAliveEnemies().length;
  const clearedHint =
    state.combatEnded && aliveEnemies === 0 && state.enemies.length > 0
      ? `<div class="battlefield-cleared-hint" role="status">Hostiles neutralized</div>`
      : "";

  els.battlefield.innerHTML = `
    <div class="battlefield-stage battlefield-stage--compact">
      <div class="player-zone">
        <div class="zone-label zone-label--player">Your ship</div>
        <div id="playerGroup" class="player-group">
          <div id="playerUnit" class="player-unit">
            <div class="player-ship-name">${getShipDisplayName(state.selectedShipId)}</div>
            <div class="player-energy">⚡ ${state.player.energy} / ${playerEnergyMax}</div>
            <div class="player-ship-visual" aria-hidden="true">
              <div class="ship-sprite ship-sprite--player" data-ship="${state.selectedShipId}"></div>
            </div>
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
      </div>
      <div class="enemy-zone">
        <div class="zone-label zone-label--hostile">Hostiles</div>
        <div class="enemy-units-wrap">
          ${clearedHint}
          ${enemiesHtml}
        </div>
      </div>
    </div>
  `;

  const enemyEls = els.battlefield.querySelectorAll(".enemy-unit[data-enemy-uid]");
  enemyEls.forEach(enemyEl => {
    const enemyUid = enemyEl.dataset.enemyUid;
    if (!enemyUid) return;
    enemyEl.addEventListener("dragover", event => {
      if (!draggingTargetedCardUid) return;
      event.preventDefault();
      enemyEl.classList.add("drop-over");
      enemyEl.classList.add("target-lock");
      draggingTargetHoverEnemyUid = enemyUid;
    });
    enemyEl.addEventListener("dragleave", () => {
      enemyEl.classList.remove("drop-over");
      enemyEl.classList.remove("target-lock");
      if (draggingTargetHoverEnemyUid === enemyUid) draggingTargetHoverEnemyUid = null;
    });
    enemyEl.addEventListener("drop", event => {
      event.preventDefault();
      enemyEl.classList.remove("drop-over");
      enemyEl.classList.remove("target-lock");
      if (!draggingTargetedCardUid) return;
      applyEnemyDamageFlash(enemyEl);
      enemyEl.classList.remove("enemy-hit-shake");
      void enemyEl.offsetWidth;
      enemyEl.classList.add("enemy-hit-shake");
      setTimeout(() => enemyEl.classList.remove("enemy-hit-shake"), 300);
      playCardOnEnemy(draggingTargetedCardUid, enemyUid);
      clearDragTargetingState();
    });
  });

  const playerGroup = document.getElementById("playerGroup");
  if (playerGroup) {
    playerGroup.addEventListener("dragover", event => {
      if (!draggingPlayerCardUid) return;
      event.preventDefault();
      playerGroup.classList.add("drop-over");
      playerGroup.classList.add("target-lock");
    });
    playerGroup.addEventListener("dragleave", () => {
      playerGroup.classList.remove("drop-over");
      playerGroup.classList.remove("target-lock");
    });
    playerGroup.addEventListener("drop", event => {
      event.preventDefault();
      playerGroup.classList.remove("drop-over");
      playerGroup.classList.remove("target-lock");
      if (!draggingPlayerCardUid) return;
      applyHitFlash(playerGroup);
      playCardOnPlayer(draggingPlayerCardUid);
      clearDragTargetingState();
    });
  }
}

function renderPlayerHud() {
  if (!els.playerHud || !state.player) return;
  const creditsValue =
    typeof state.player.credits === "number" ? state.player.credits : state.runCredits;

  els.playerHud.innerHTML = `
    <div class="hud-pill hud-resource">Fuel ${state.run.fuel}</div>
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

function getBattlefieldFloatParent() {
  return els.battlefieldFloatLayer || els.battlefield;
}

function spawnFloatingText(text, x, y, className = "") {
  const parent = getBattlefieldFloatParent();
  if (!parent) return;
  const el = document.createElement("div");
  el.className = `combat-float-text float-up ${className}`.trim();
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  parent.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1040);
}

function spawnFloatingTextNearElement(targetEl, text, className = "") {
  const parent = getBattlefieldFloatParent();
  if (!parent || !targetEl) return;
  const anchorRect = parent.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const x = targetRect.left - anchorRect.left + targetRect.width * 0.5;
  const y = targetRect.top - anchorRect.top - 14;
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

function applyEnemyDamageFlash(targetEl) {
  if (!targetEl) return;
  targetEl.classList.remove("enemy-damage-flash");
  void targetEl.offsetWidth;
  targetEl.classList.add("enemy-damage-flash");
  setTimeout(() => targetEl.classList.remove("enemy-damage-flash"), 220);
}

function applyPlayerBlockFlash() {
  const el = document.getElementById("playerGroup");
  if (!el) return;
  el.classList.remove("player-block-flash");
  void el.offsetWidth;
  el.classList.add("player-block-flash");
  setTimeout(() => el.classList.remove("player-block-flash"), 480);
}

function applyBattlefieldShake() {
  const shakeEl = document.querySelector(".battlefield-wrap") || els.battlefield;
  if (!shakeEl) return;
  shakeEl.classList.remove("screen-shake");
  void shakeEl.offsetWidth;
  shakeEl.classList.add("screen-shake");
  setTimeout(() => shakeEl.classList.remove("screen-shake"), 200);
}

function applyCombatCardPlayJuice() {
  if (!els.combatScreen) return;
  els.combatScreen.classList.remove("combat-card-flash");
  void els.combatScreen.offsetWidth;
  els.combatScreen.classList.add("combat-card-flash");
  setTimeout(() => els.combatScreen.classList.remove("combat-card-flash"), 260);
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

function enemyHullValue(enemy) {
  const h = Number(enemy?.hull);
  return Number.isFinite(h) ? h : 0;
}

function getAliveEnemies() {
  return state.enemies.filter(e => enemyHullValue(e) > 0);
}

function pickAllyBlockTarget(defender, alive) {
  const others = alive.filter(e => e.uid !== defender.uid && e.hull > 0);
  if (others.length === 0) return null;
  const chargerCharging = others.find(
    e => e.combatRole === "charger" && e.intent && e.intent.intentType === "charging"
  );
  if (chargerCharging) {
    console.log("[enemy synergy]", defender.name, "with", chargerCharging.name);
    return chargerCharging;
  }
  const parasite = others.find(e => e.combatRole === "parasite");
  if (parasite) {
    console.log("[enemy synergy]", defender.name, "with", parasite.name);
    return parasite;
  }
  return others[0];
}

function getEnemySynergyAttackBonus(enemy, alive, intent) {
  let bonus = 0;
  const burner = alive.find(e => e.combatRole === "burner" && e.hull > 0);
  const parasite = alive.find(e => e.combatRole === "parasite" && e.hull > 0);
  const charger = alive.find(e => e.combatRole === "charger" && e.hull > 0);
  const suppressChargerBurstSynergy = state.encounterIndex <= 4;

  if (enemy.combatRole === "parasite" && burner) {
    bonus += 1;
    log(`${enemy.name} exploits allied heat (+1 damage).`, "enemy");
    console.log("[enemy synergy]", enemy.name, "with", burner.name);
  }
  if (enemy.combatRole === "burner" && parasite) {
    bonus += 1;
    log(`${enemy.name} flares with spore support (+1 damage).`, "enemy");
    console.log("[enemy synergy]", enemy.name, "with", parasite.name);
  }
  if (
    enemy.combatRole === "charger" &&
    intent &&
    intent.intentType === "discharge" &&
    burner &&
    !suppressChargerBurstSynergy
  ) {
    bonus += 1;
    log(`${enemy.name} couples discharge with Burner (+1 damage).`, "enemy");
    console.log("[enemy synergy]", enemy.name, "with", burner.name);
  }
  if (
    enemy.combatRole === "burner" &&
    charger &&
    charger.intent &&
    charger.intent.intentType === "charging" &&
    !suppressChargerBurstSynergy
  ) {
    bonus += 1;
    log(`${enemy.name} ramps while Charger charges (+1 damage).`, "enemy");
    console.log("[enemy synergy]", enemy.name, "with", charger.name);
  }
  return bonus;
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
  if (selected && enemyHullValue(selected) > 0) return selected;
  state.selectedEnemyUid = null;
  return null;
}

function selectEnemy(uid) {
  const enemy = getEnemyByUid(uid);
  if (!enemy || enemyHullValue(enemy) <= 0) return;
  state.selectedEnemyUid = uid;
  render();
}

function getBountyTargets() {
  return state.enemies.filter(e => e.role === "bounty");
}

function allBountyTargetsDead() {
  const bounty = getBountyTargets();
  return bounty.length > 0 && bounty.every(e => enemyHullValue(e) <= 0);
}

function anyEscortAlive() {
  return state.enemies.some(e => e.role === "escort" && enemyHullValue(e) > 0);
}

function allEnemiesDead() {
  return state.enemies.length > 0 && state.enemies.every(e => enemyHullValue(e) <= 0);
}

function resolveCombatAfterDamageIfNeeded() {
  if (state.combatEnded) return;
  if (!state.enemies.length) return;

  if (allBountyTargetsDead() && anyEscortAlive() && !state.pendingExtraction) {
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

function hideOverlay() {
  els.overlay.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.add("hidden");
  els.rewardOptions.classList.remove("reward-card-grid");
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
  let amount = getCreditRewardForEncounter(state.encounterIndex);
  const mult = state.encounterCreditRewardModifier || 1;
  if (mult !== 1) {
    const before = amount;
    amount = Math.max(1, Math.floor(amount * mult));
    log(
      `Encounter bonus: Contract terms favor you (credit reward ${before} → ${amount}).`,
      "system"
    );
  }
  gainCredits(amount, "encounter reward");
  state.encounterCreditRewardModifier = 1;
}

function buildRewardChoices() {
  const pool = getRewardPool();
  const choiceCount = 3 + (state.rewardChoiceBonus || 0);
  const weightedPicks = pickWeightedRewardCards(pool, choiceCount);
  let finalPicks = applyMiniComboRewardRules(pool, weightedPicks, choiceCount);
  if (finalPicks.length < choiceCount) {
    const ids = new Set(finalPicks.map(c => c.id));
    const broad = ALL_CARDS.filter(c => c && c.id !== "debug-delete");
    for (const card of broad) {
      if (finalPicks.length >= choiceCount) break;
      if (!ids.has(card.id)) {
        finalPicks.push(card);
        ids.add(card.id);
      }
    }
    while (finalPicks.length < choiceCount) {
      const fb = ALL_CARDS.find(c => c && c.id !== "debug-delete");
      if (!fb) break;
      finalPicks.push(fb);
    }
    finalPicks = finalPicks.slice(0, choiceCount);
  }
  console.log("REWARD SHIP:", state.selectedShipId);
  console.log("REWARD ARCHETYPE:", getShipArchetype(state.selectedShipId));
  console.log("REWARD POOL IDS:", pool.map(card => card.id));
  if (state.run) {
    const recent = [...(state.run.recentRewardOfferIds || []), ...finalPicks.map(card => card.id)];
    state.run.recentRewardOfferIds = recent.slice(-10);
  }
  state.rewardChoiceBonus = 0;
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

  els.overlayTitle.textContent = `Star Map — Campaign Climb — Notoriety: ${getNotorietyLabel(state.notoriety)}`;
  const encPreviewLine =
    (currentNode.type === "combat" || currentNode.type === "elite") && !isNodeCleared(currentNode.id)
      ? `\n${getSoftEncounterPreviewLine(state.sectorNumber, currentNode.type === "elite")}`
      : "";
  els.overlayText.textContent = `Current Node: ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)} • Fuel: ${state.run.fuel} • ${getSectorProgressText()}${encPreviewLine}`;
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
    <div class="reward-name">Campaign Map</div>
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
    if (currentNode && currentNode.neighbors.includes(nodeId) && canTravelToNode(nodeId)) {
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

  els.mapTitleText.textContent = `Campaign Climb — Continuous Run • Boss at node 30`;
  const notorietyTooltip =
    getNotorietyLabel(state.notoriety) === "Hunted"
      ? "Hunted: powerful enemies are now actively pursuing you in endless mode."
      : "Notoriety reflects how much attention your run has attracted.";
  els.mapSubtitleText.innerHTML = `
    <span class="map-hud-tip" data-tooltip="${notorietyTooltip}">Notoriety: ${getNotorietyLabel(state.notoriety)}</span>
    •
    <span class="map-hud-tip" data-tooltip="Fuel is used to travel between map nodes.">Fuel: ${state.run.fuel}</span>
    •
    <span class="map-hud-tip" data-tooltip="Credits are spent at Shops and other special services.">Credits: ${state.runCredits}</span>
    •
    <span class="map-hud-tip" data-tooltip="Tracks your progress through the full campaign climb.">${getSectorProgressText()}</span>
  `;

  const gateStateHtml =
    currentNode.type === "gate"
      ? `<div class="reward-meta"><span class="map-hud-tip" data-tooltip="${
          "Boss Contract is available at the end of the climb. Defeating it completes the run."
        }">Boss Contract Status: Available</span></div>`
      : "";

  els.mapCurrentInfo.innerHTML = `
    <div class="reward-name">Current Location</div>
    <div class="reward-meta">Node ${currentNode.id} • ${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}</div>
    ${getEncounterMapFlavorHtml(currentNode)}
    ${gateStateHtml}
    <div class="reward-meta"><span class="map-hud-tip" data-tooltip="Credits are spent at Shops and other special services.">Credits: ${state.runCredits}</span></div>
  `;

  els.mapSvgWrap.innerHTML = renderStarMapSvg();

  els.mapActionArea.innerHTML = "";

  const engageButton = document.createElement("button");
  engageButton.className = "reward-option";
  engageButton.innerHTML = `
    <div class="reward-name">Engage Current Node</div>
    <div class="reward-meta">${formatNodeLabel(currentNode)}${formatNodeStatus(currentNode)}${
    (() => {
      if (
        (currentNode.type !== "combat" && currentNode.type !== "elite") ||
        isNodeCleared(currentNode.id)
      ) {
        return "";
      }
      const line = getSoftEncounterPreviewLine(state.sectorNumber, currentNode.type === "elite");
      return line ? ` • ${line}` : "";
    })()
  }</div>
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
    if (current && current.neighbors.includes(nodeId) && canTravelToNode(nodeId)) {
      nodeEl.addEventListener("click", () => travelToNode(nodeId));
    }
  });

  const mapSvgEl = els.mapSvgWrap.querySelector(".star-map-svg");
  if (mapSvgEl) {
    const currentRowNum = Number(mapSvgEl.getAttribute("data-current-row") || 0);
    const maxRowNum = Number(mapSvgEl.getAttribute("data-max-row") || 0);
    const rowSpan = Math.max(1, maxRowNum + 1);
    const targetRatio = 1 - (currentRowNum + 0.5) / rowSpan;
    const maxScroll = Math.max(0, els.mapSvgWrap.scrollHeight - els.mapSvgWrap.clientHeight);
    const desired = Math.max(0, Math.min(maxScroll, maxScroll * targetRatio - els.mapSvgWrap.clientHeight * 0.18));
    els.mapSvgWrap.scrollTop = desired;
  }
}

function travelToNode(targetNodeId) {
  const currentNode = getCurrentNode();
  if (!currentNode) return;

  if (!currentNode.neighbors.includes(targetNodeId)) return;
  if (!canTravelToNode(targetNodeId)) return;

  const fromNode = state.currentNodeId;
  const fuelCost = getTravelFuelCost(fromNode, targetNodeId);
  console.log("[fuel cost]", fuelCost);

  if (fromNode && !state.lockedNodeIds.includes(fromNode)) {
    state.lockedNodeIds.push(fromNode);
  }

  if (state.run.fuel >= fuelCost) {
    state.run.fuel -= fuelCost;
  } else {
    if (state.run.fuel > 0) {
      state.run.fuel = 0;
    }
    applyOutOfFuelMovePenalty();
  }
  syncPlayerFuelFromRun();
  console.log("[fuel remaining]", state.run.fuel);

  state.currentNodeId = targetNodeId;

  console.log("[movement allowed]", fromNode, "->", targetNodeId);

  if (state.player.hull <= 0) {
    return;
  }

  if (!state.visitedNodeIds.includes(targetNodeId)) {
    state.visitedNodeIds.push(targetNodeId);
  }

  log(
    `Traveled to node ${targetNodeId} (${fuelCost} fuel). Fuel: ${state.run.fuel}.`,
    "system"
  );
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
  closeMiningMinigameIfOpen();
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
  state.rewardChoiceBonus = 0;
  state.encounterCreditRewardModifier = 1;
  returnToMap();
}

function finishNodeAfterNonCombat() {
  state.pendingReward = false;
  markCurrentNodeCleared();
  returnToMap();
}

const MINING_MARKER_SPEED = 0.78;

function closeMiningMinigameIfOpen() {
  if (state.miningRafId != null) {
    cancelAnimationFrame(state.miningRafId);
    state.miningRafId = null;
  }
  state.miningMinigameActive = false;
  state.miningMinigamePhase = "idle";
  if (els.miningMinigameOverlay) els.miningMinigameOverlay.classList.add("hidden");
  if (els.miningResultText) {
    els.miningResultText.textContent = "";
    els.miningResultText.classList.add("hidden");
  }
  if (els.miningExtractBtn) els.miningExtractBtn.classList.remove("hidden");
  if (els.miningContinueBtn) els.miningContinueBtn.classList.add("hidden");
}

function updateMiningMarkerVisual() {
  if (!els.miningMarker) return;
  els.miningMarker.style.left = `${state.miningMarkerPos * 100}%`;
}

function startMiningPlanetMinigame() {
  clearNonCombatPresentation();
  state.pendingReward = true;
  state.miningMinigameActive = true;
  state.miningMinigamePhase = "playing";
  state.miningMarkerPos = 0;
  state.miningMarkerDir = 1;
  if (els.miningResultText) {
    els.miningResultText.textContent = "";
    els.miningResultText.classList.add("hidden");
  }
  if (els.miningExtractBtn) els.miningExtractBtn.classList.remove("hidden");
  if (els.miningContinueBtn) els.miningContinueBtn.classList.add("hidden");
  if (els.miningMinigameOverlay) els.miningMinigameOverlay.classList.remove("hidden");
  updateMiningMarkerVisual();

  let last = performance.now();
  function tick(now) {
    if (!state.miningMinigameActive || state.miningMinigamePhase !== "playing") {
      state.miningRafId = null;
      return;
    }
    const dt = Math.min(0.048, (now - last) / 1000);
    last = now;
    state.miningMarkerPos += state.miningMarkerDir * MINING_MARKER_SPEED * dt;
    if (state.miningMarkerPos >= 1) {
      state.miningMarkerPos = 1;
      state.miningMarkerDir = -1;
    } else if (state.miningMarkerPos <= 0) {
      state.miningMarkerPos = 0;
      state.miningMarkerDir = 1;
    }
    updateMiningMarkerVisual();
    state.miningRafId = requestAnimationFrame(tick);
  }
  state.miningRafId = requestAnimationFrame(tick);
  render();
}

function onMiningExtract() {
  if (!state.miningMinigameActive || state.miningMinigamePhase !== "playing") return;
  if (state.miningRafId != null) {
    cancelAnimationFrame(state.miningRafId);
    state.miningRafId = null;
  }
  const pos = state.miningMarkerPos;
  let tier = "miss";
  if (pos >= 0.44 && pos <= 0.56) tier = "perfect";
  else if (pos >= 0.28 && pos <= 0.72) tier = "good";

  let msg = "";
  if (tier === "perfect") {
    gainCredits(50, "rich mining vein");
    repairPlayerHull(3, "Rich vein secured");
    msg = "Rich Vein Secured — +50 credits and a small hull patch.";
  } else if (tier === "good") {
    gainCredits(25, "mining operation");
    msg = "Solid yield — +25 credits.";
  } else {
    gainCredits(10, "mining scrape");
    msg = "Marginal ore — +10 credits.";
  }

  state.miningMinigamePhase = "result";
  if (els.miningResultText) {
    els.miningResultText.textContent = msg;
    els.miningResultText.classList.remove("hidden");
  }
  if (els.miningExtractBtn) els.miningExtractBtn.classList.add("hidden");
  if (els.miningContinueBtn) els.miningContinueBtn.classList.remove("hidden");
  log(msg, "system");
}

function onMiningContinue() {
  closeMiningMinigameIfOpen();
  finishNodeAfterNonCombat();
}

function initMiningMinigame() {
  if (els.miningExtractBtn) els.miningExtractBtn.addEventListener("click", onMiningExtract);
  if (els.miningContinueBtn) els.miningContinueBtn.addEventListener("click", onMiningContinue);
  document.addEventListener("keydown", e => {
    if (!state.miningMinigameActive || state.miningMinigamePhase !== "playing") return;
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      onMiningExtract();
    }
  });
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
    const restored = state.player.maxFuel - state.run.fuel;
    state.run.fuel = state.player.maxFuel;
    syncPlayerFuelFromRun();
    console.log("[fuel remaining]", state.run.fuel);
    log(`Dock: refueled ${restored} fuel. Total fuel: ${state.run.fuel}.`, "system");
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
  els.overlayText.textContent = `Credits: ${state.runCredits}. A strange alien merchant offers questionable tech, polished salvage, and suspiciously fair prices.`;

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
    btn.disabled = state.runCredits < 25;

    btn.addEventListener("click", () => {
      if (state.runCredits < 25) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 25;
      state.runDeck.push(cardId);
      state.shopInventory = state.shopInventory.filter(id => id !== cardId);

      log(`Bought ${card.name}.`, "system");
      showShopOverlay();
    });

    els.rewardOptions.appendChild(btn);
  });

  const rerollBtn = document.createElement("button");
  rerollBtn.className = "reward-option";

  rerollBtn.innerHTML = `
  <div class="reward-name">Reroll Inventory</div>
  <div class="reward-meta">Cost: 15 credits</div>
`;

  rerollBtn.disabled = state.runCredits < 15;
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
  removeBtn.disabled = state.runCredits < 40;
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
    <div class="reward-name">Leave Shop</div>
    <div class="reward-meta">Return to the map</div>
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

    btn.disabled = state.runCredits < 40;
    btn.addEventListener("click", () => {
      if (state.runCredits < 40) {
        log("Not enough credits.", "enemy");
        return;
      }

      state.runCredits -= 40;
      state.runDeck.splice(index, 1);

      log(`Removed ${card.name} from deck.`, "system");
      showShopOverlay();
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

    if (roll < 0.38) {
      gainCredits(20, "Distress signal salvage");
      finishNodeAfterNonCombat();
      return;
    }

    if (roll < 0.58) {
      state.run.fuel = Math.min(state.player.maxFuel, state.run.fuel + 1);
      syncPlayerFuelFromRun();
      console.log("[fuel remaining]", state.run.fuel);
      log(`Distress signal yields emergency fuel. Fuel: ${state.run.fuel}.`, "system");
      finishNodeAfterNonCombat();
      return;
    }

    if (roll < 0.73) {
      state.run.fuel = Math.max(0, state.run.fuel - 1);
      syncPlayerFuelFromRun();
      console.log("[fuel remaining]", state.run.fuel);
      log(`Distress signal drained auxiliary reserves. Fuel: ${state.run.fuel}.`, "enemy");
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
  if (state.sectorNumber <= 3) {
    console.log("[campaign route map]", state.sectorNumber, state.mapNodes);
  }
  state.currentNodeId = "S";
  state.visitedNodeIds = ["S"];
  state.lockedNodeIds = [];
  state.clearedNodeIds = [];
  applyFuelCapForRunState();
  state.run.fuel = state.player.maxFuel;
  syncPlayerFuelFromRun();
  console.log("[fuel tuning]", "sector", state.sectorNumber, "fuel", state.run.fuel, "max", state.player.maxFuel);
  state.player.hull = state.player.maxHull;
  log("Hull restored to full for new sector");
  console.log("[sector reset]", "hull", state.player.hull, "/", state.player.maxHull);
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
  state.bossEncounterId = pickRandomBossEncounterId();
  if (state.run) state.run.encounterTagCounts = {};
  log(`Jumped to Sector ${state.sectorNumber}. Fuel restored to ${state.run.fuel}.`, "system");
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
    <div class="reward-meta">Surface mining drill — quick timing game. Consumes this node.</div>
  `;
  exploreBtn.addEventListener("click", () => {
    hideOverlay();
    startMiningPlanetMinigame();
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
  const id = state.bossEncounterId || "bastion";
  if (id === "bastion") return "Bastion";
  if (id === "overloader") return "Overloader";
  if (id === "hive-mind") return "Hive Mind";
  return "Bastion";
}

function getSectorBossDescription(sectorNumber) {
  const id = state.bossEncounterId || "bastion";
  if (id === "bastion") return "Defense boss—layers of block and fortification.";
  if (id === "overloader") return "Burst boss—charges, then unloads massive damage.";
  if (id === "hive-mind") return "Summoner boss—drones empower it until cleared.";
  return "High-value contract target.";
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
  const id = state.bossEncounterId || pickRandomBossEncounterId();
  state.bossEncounterId = id;
  const templateId =
    id === "bastion" ? "boss-bastion" : id === "overloader" ? "boss-overloader" : "boss-hive-mind";
  const lead = getEnemyTypeById(templateId) || getEnemyTypeById("boss-bastion");
  const bossEnemy = buildEnemyFromTemplate(lead, "bounty", "elite");
  bossEnemy.bossType = id;
  return [bossEnemy];
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
  els.overlayText.textContent = "Final target located. Engage to complete the campaign climb.";
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const jumpBtn = document.createElement("button");
  jumpBtn.className = "reward-option";
  jumpBtn.innerHTML = `
    <div class="reward-name">Engage Boss Contract</div>
    <div class="reward-meta">Confront ${getSectorBossName(state.sectorNumber)} to complete this run.</div>
  `;
  jumpBtn.addEventListener("click", () => {
    showBossIntroOverlay();
  });
  els.rewardOptions.appendChild(jumpBtn);

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

function resolveBossArchetypeKey() {
  if (state.run?.committedArchetype) return state.run.committedArchetype;
  const s = getShipArchetype(state.selectedShipId);
  if (s === "snub") return "block";
  if (s === "neutral") return "beam";
  return s;
}

function getBossArchetypeAmplifierOption() {
  const key = resolveBossArchetypeKey();
  if (key === "block") {
    return {
      name: "Bulwark Coupling",
      meta: "Archetype — +2 shield effectiveness on block cards.",
      apply: () => {
        state.player.shieldBonus = (state.player.shieldBonus || 0) + 2;
      }
    };
  }
  if (key === "burn") {
    return {
      name: "Thermal Amplifier",
      meta: "Archetype — +1 burn damage each tick.",
      apply: () => {
        state.player.runBurnBonus = (state.player.runBurnBonus || 0) + 1;
      }
    };
  }
  if (key === "mark") {
    return {
      name: "Hunter's Lens",
      meta: "Archetype — +2 damage when you apply Mark.",
      apply: () => {
        state.player.markOnApplyDamage = (state.player.markOnApplyDamage || 0) + 2;
      }
    };
  }
  if (key === "beam") {
    return {
      name: "Beam Capacitors",
      meta: "Archetype — +1 Beam whenever you gain Beam.",
      apply: () => {
        state.player.runBeamGenerationBonus = (state.player.runBeamGenerationBonus || 0) + 1;
      }
    };
  }
  if (key === "drone") {
    return {
      name: "Swarm Matrix",
      meta: "Archetype — +1 drone strike damage.",
      apply: () => {
        state.player.droneDamageBonus = (state.player.droneDamageBonus || 0) + 1;
      }
    };
  }
  return {
    name: "Bulwark Coupling",
    meta: "Archetype — +2 shield effectiveness on block cards.",
    apply: () => {
      state.player.shieldBonus = (state.player.shieldBonus || 0) + 2;
    }
  };
}

function showShipUpgradeOverlay() {
  hideComboBanner();
  state.pendingReward = true;
  const flavor = getSectorUpgradeFlavor(state.sectorNumber);
  const arch = getBossArchetypeAmplifierOption();

  els.overlayTitle.textContent = flavor.title;
  els.overlayText.textContent = `${flavor.text} Current notoriety: ${getNotorietyLabel(state.notoriety)}. Choose one boss reward.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  function finishBossReward() {
    hideOverlay();
    state.notoriety += 1;
    startNextSector();
  }

  const powerBtn = document.createElement("button");
  powerBtn.className = "reward-option";
  powerBtn.innerHTML = `
    <div class="reward-name">Reactor Surge (Power)</div>
    <div class="reward-meta">+1 max energy per turn.</div>
  `;
  powerBtn.addEventListener("click", () => {
    state.player.baseEnergy += 1;
    state.player.energy = state.player.baseEnergy + state.player.reactorBonus;
    log("Boss reward acquired: Reactor Surge", "system");
    finishBossReward();
  });

  const archBtn = document.createElement("button");
  archBtn.className = "reward-option";
  archBtn.innerHTML = `
    <div class="reward-name">${arch.name} (Archetype)</div>
    <div class="reward-meta">${arch.meta}</div>
  `;
  archBtn.addEventListener("click", () => {
    arch.apply();
    log(`Boss reward acquired: ${arch.name}`, "system");
    finishBossReward();
  });

  const wildBtn = document.createElement("button");
  wildBtn.className = "reward-option";
  wildBtn.innerHTML = `
    <div class="reward-name">Neural Shunt (Wildcard)</div>
    <div class="reward-meta">+1 card drawn at the start of each turn.</div>
  `;
  wildBtn.addEventListener("click", () => {
    state.player.handDrawBonus = (state.player.handDrawBonus || 0) + 1;
    log("Boss reward acquired: Neural Shunt", "system");
    finishBossReward();
  });

  els.rewardOptions.appendChild(powerBtn);
  els.rewardOptions.appendChild(archBtn);
  els.rewardOptions.appendChild(wildBtn);

  render();
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
  const cardOptions = state.rewardChoices.length;

  els.overlayTitle.textContent = "Encounter Won";
  els.overlayText.textContent = `Choose 1 card reward (${cardOptions} options) before encounter ${state.encounterIndex + 2}.`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.add("reward-card-grid");
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  state.rewardChoices.forEach(cardId => {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (!card) return;

    const button = document.createElement("button");
    const role = card.cardRole || "system";
    button.type = "button";
    button.className = `reward-card-button card ${card.type} role-${role}`.trim();
    button.innerHTML = `
      <div class="card-top">
        <div class="card-title">${card.name}</div>
        <div class="cost">${card.cost}</div>
      </div>
      <div class="card-type">${getCardCategoryLabel(card)}</div>
      <div class="card-text">${enhanceCardDescriptionWithTooltips(card.description)}</div>
    `;
    button.addEventListener("click", () => chooseReward(cardId));
    els.rewardOptions.appendChild(button);
  });

  const skipWrap = document.createElement("div");
  skipWrap.className = "reward-skip-wrap";
  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "reward-option reward-option-secondary";
  skipBtn.innerHTML = `
    <div class="reward-name">Skip</div>
    <div class="reward-meta">Decline all card rewards and continue.</div>
  `;
  skipBtn.addEventListener("click", skipReward);
  skipWrap.appendChild(skipBtn);
  els.rewardOptions.appendChild(skipWrap);
}

function showCommitMomentOverlay() {
  state.pendingReward = true;

  const earnedNow = state.lastCombatCreditsEarned || 0;
  els.overlayTitle.textContent = "Elite commitment";
  els.overlayText.textContent = `Choose one run-long focus. This only appears once per run.\nCredits this fight: +${earnedNow}`;
  els.overlayBtn.classList.add("hidden");
  els.rewardOptions.innerHTML = "";
  els.rewardOptions.classList.remove("hidden");
  els.overlay.classList.remove("hidden");

  const options = shuffle(["block", "burn", "mark", "beam", "drone"]).slice(0, 3);
  const meta = {
    block: "Bulwark — +2 to block from block cards (run)",
    burn: "Ember — +1 burn damage each tick (run)",
    mark: "Hunter — +2 damage when you apply Mark (run)",
    beam: "Lancer — +1 Beam whenever you gain Beam (run)",
    drone: "Swarm — +1 drone strike damage (run)"
  };
  const names = {
    block: "Commit: Bulwark",
    burn: "Commit: Ember",
    mark: "Commit: Hunter",
    beam: "Commit: Lancer",
    drone: "Commit: Swarm"
  };

  options.forEach(archetype => {
    const btn = document.createElement("button");
    btn.className = "reward-option";
    btn.innerHTML = `
      <div class="reward-name">${names[archetype]}</div>
      <div class="reward-meta">${meta[archetype]}</div>
    `;
    btn.addEventListener("click", () => applyCommitChoice(archetype));
    els.rewardOptions.appendChild(btn);
  });

  render();
}

function applyCommitChoice(archetype) {
  if (!state.run) return;
  state.run.commitMomentUsed = true;
  state.run.committedArchetype = archetype;

  if (archetype === "block") {
    state.player.shieldBonus = (state.player.shieldBonus || 0) + 2;
  } else if (archetype === "burn") {
    state.player.runBurnBonus = (state.player.runBurnBonus || 0) + 1;
  } else if (archetype === "mark") {
    state.player.markOnApplyDamage = (state.player.markOnApplyDamage || 0) + 2;
  } else if (archetype === "beam") {
    state.player.runBeamGenerationBonus = (state.player.runBeamGenerationBonus || 0) + 1;
  } else if (archetype === "drone") {
    state.player.droneDamageBonus = (state.player.droneDamageBonus || 0) + 1;
  }

  log(`Committed to ${archetype}`, "system");
  state.pendingReward = false;
  hideOverlay();
  returnToMap();
}

function showPostVictoryChoiceOverlay() {
  state.pendingReward = true;

  const creditReward = getCreditRewardForEncounter(state.encounterIndex);
  const earnedNow = state.lastCombatCreditsEarned || 0;
  const cardOptions = 3 + (state.rewardChoiceBonus || 0);

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
    <div class="reward-meta">Pick 1 of ${cardOptions} cards to add to your deck.</div>
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
  const runStage = getRunProgressStage();
  const sectorScale = 1 + (runStage - 1) * 0.25;
  const encounterScale = 1 + state.encounterIndex * 0.15;
  const finalScale = sectorScale * encounterScale;

  const endlessScale =
    state.endlessMode && state.sectorNumber > 3 ? 1 + (state.sectorNumber - 3) * 0.08 : 1;
  const mult = (TIER_MULTIPLIER[tier] ?? 1) * endlessScale;
  const earlyHpFactor = tier === "easy" ? 1.12 : 1;
  const scaledMaxHull = Math.floor(Math.round(template.maxHull * earlyHpFactor * mult) * finalScale);
  const baseGetIntent = template.getIntent;

  function scaledGetIntent(turn) {
    const base = baseGetIntent(turn);
    let pressureBonus = 0;
    if (base.type === "attack") {
      pressureBonus =
        runStage === 1
          ? Math.floor(Math.max(0, turn - 3) / 3)
          : Math.floor(Math.max(0, turn - 1) / 2);
    }
    let scaledAmount;
    if (base.type === "attack") {
      scaledAmount = Math.max(0, Math.round(base.amount * mult * finalScale) + pressureBonus);
      const isFirstMandatoryElite =
        state.eliteContractCombat && tier === "elite" && (state.encounterIndex || 0) <= 10;
      const isEarlyCombat = runStage === 1 && tier !== "elite" && tier !== "boss";
      if (isEarlyCombat && template.id === "scout") {
        scaledAmount = Math.min(7, scaledAmount);
      }
      if (isEarlyCombat && template.id === "raider") {
        scaledAmount = Math.min(6, scaledAmount);
      }
      if (isFirstMandatoryElite && template.id === "hunter") {
        scaledAmount = Math.min(6, scaledAmount);
      }
      if (isFirstMandatoryElite && template.id === "interceptor") {
        scaledAmount = Math.min(8, scaledAmount);
      }
      const isFirstEliteBurstBounty = isFirstMandatoryElite && template.id === "burst-bounty";
      if (isFirstEliteBurstBounty) {
        // Keep elite burst identity, but cap unfair early mandatory spike.
        scaledAmount = Math.min(12, scaledAmount);
      }
    } else {
      scaledAmount = Math.max(0, Math.round((base.amount || 0) * mult));
    }
    const intentType = base.intentType || base.type;
    let text;
    if (base.textTemplate) {
      text = base.textTemplate.replace(/BLOCK/g, String(scaledAmount));
    } else if (base.intentType && base.text) {
      text = base.text;
    } else {
      text = formatIntentText(base.type, scaledAmount);
    }
    return {
      ...base,
      amount: scaledAmount,
      text,
      intentType
    };
  }

  console.log(template.name, finalScale);

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
    combatRole: template.combatRole || null,
    priority: template.priority || "medium",
    turnCounter: 0,
    bossType: null,
    spawnedEscort: false,
    damageReduction: 0,
    attackReduction: 0,
    extraDamageFromLockThisTurn: 0,
    getIntent: scaledGetIntent,
    intent: scaledGetIntent(1)
  };
}

function getEnemyTypeById(id) {
  return ENEMY_TYPES.find(e => e.id === id) || null;
}

const ENCOUNTER_BUCKETS = [
  {
    id: "s1-solo-scout",
    name: "Forward Scout",
    enemyIds: ["scout"],
    danger: 1,
    tags: ["balanced", "sustain"],
    flavorText: "A lone picket—good for learning tempo and target priority.",
    minSector: 1,
    maxSector: 1,
    tiers: ["easy", "medium"]
  },
  {
    id: "s1-solo-burner",
    name: "Thermal Pickett",
    enemyIds: ["burner-drone"],
    danger: 1,
    tags: ["burn-pressure", "sustain"],
    flavorText: "Heat stacks if you ignore it—plan mitigation early.",
    postCombatEffect: "burn-pressure",
    minSector: 1,
    maxSector: 1,
    tiers: ["easy", "medium"]
  },
  {
    id: "s1-shield-line",
    name: "Shield Line",
    enemyIds: ["defender-drone", "charger-drone"],
    roles: ["bounty", "bounty"],
    danger: 2,
    tags: ["defense", "burst"],
    flavorText: "Shields feed a heavy discharge—burst windows matter.",
    minSector: 1,
    maxSector: 1,
    tiers: ["hard"]
  },
  {
    id: "s1-mixed-patrol",
    name: "Mixed Patrol",
    enemyIds: ["raider", "scout"],
    roles: ["bounty", "escort"],
    danger: 2,
    tags: ["balanced", "swarm"],
    flavorText: "Two hulls with different rhythms—don’t split focus forever.",
    minSector: 1,
    maxSector: 1,
    tiers: ["medium", "hard"]
  },
  {
    id: "s1-stall-pair",
    name: "Bulwark Screen",
    enemyIds: ["bulwark", "support-escort"],
    roles: ["bounty", "escort"],
    danger: 3,
    tags: ["defense", "siege", "elite-support"],
    flavorText: "Thick block and escort support—break the stall or spike through it.",
    postCombatEffect: "defense-salvage",
    bonusCredits: 12,
    flavorOutcomeText: "Salvaged reinforced plating",
    minSector: 1,
    maxSector: 1,
    tiers: ["hard"]
  },
  {
    id: "s2-solo-raider",
    name: "Raider Contact",
    enemyIds: ["raider"],
    danger: 2,
    tags: ["balanced", "sustain"],
    flavorText: "A stubborn skiff that rewards steady pressure.",
    rewardModifier: 1.12,
    minSector: 2,
    maxSector: 2,
    tiers: ["easy", "medium"]
  },
  {
    id: "s2-burner-parasite",
    name: "Infestation Sweep",
    enemyIds: ["burner-drone", "alien-parasite"],
    roles: ["bounty", "bounty"],
    danger: 3,
    tags: ["burn-pressure", "alien", "sustain"],
    flavorText: "Thermal damage plus parasitic sustain—clear one threat fast.",
    minSector: 2,
    maxSector: 2,
    tiers: ["medium"]
  },
  {
    id: "s2-hunter-defender",
    name: "Hunter Screen",
    enemyIds: ["hunter", "defender-drone"],
    roles: ["bounty", "escort"],
    danger: 3,
    tags: ["defense", "burst"],
    flavorText: "A hunter up front with a defender shielding the line.",
    minSector: 2,
    maxSector: 2,
    tiers: ["medium", "hard"]
  },
  {
    id: "s2-ace-escort",
    name: "Ace Escort Pair",
    enemyIds: ["interceptor", "support-escort"],
    roles: ["bounty", "escort"],
    danger: 4,
    tags: ["burst", "elite-support", "defense"],
    flavorText: "Ace damage plus escort shields—burst down or get buried.",
    minSector: 2,
    maxSector: 2,
    tiers: ["hard"]
  },
  {
    id: "s2-double-strike",
    name: "Double Strike",
    enemyIds: ["raider", "hunter"],
    roles: ["bounty", "bounty"],
    danger: 3,
    tags: ["balanced", "burst", "swarm"],
    flavorText: "Two bounty targets—double the pressure, double the payoffs.",
    postCombatEffect: "swarm-options",
    flavorOutcomeText: "Tight formation—extra salvage on the reward screen.",
    minSector: 2,
    maxSector: 2,
    tiers: ["medium", "hard"]
  },
  {
    id: "s3-solo-hunter",
    name: "Hunter Contact",
    enemyIds: ["hunter"],
    danger: 3,
    tags: ["burst", "balanced"],
    flavorText: "A focused hunter—respect its attack cadence.",
    minSector: 3,
    maxSector: null,
    tiers: ["easy", "medium"]
  },
  {
    id: "s3-alien-charger",
    name: "Alien Overcharge",
    enemyIds: ["alien-parasite", "charger-drone"],
    roles: ["bounty", "bounty"],
    danger: 5,
    tags: ["alien", "burst", "sustain"],
    flavorText: "Xeno drain paired with a charging battery—volatile and cruel.",
    minSector: 3,
    maxSector: null,
    tiers: ["medium", "hard"]
  },
  {
    id: "s3-bulwark-burner",
    name: "Bastion Furnace",
    enemyIds: ["bulwark", "burner-drone"],
    roles: ["bounty", "escort"],
    danger: 5,
    tags: ["defense", "burn-pressure", "siege"],
    flavorText: "A wall of block with fire behind it—siege breaks or burns.",
    minSector: 3,
    maxSector: null,
    tiers: ["hard"]
  },
  {
    id: "s3-burst-interceptor",
    name: "Burst Intercept",
    enemyIds: ["burst-bounty", "interceptor"],
    roles: ["bounty", "bounty"],
    danger: 6,
    tags: ["burst", "swarm"],
    flavorText: "Pure spike damage—stabilize fast or get shredded.",
    minSector: 3,
    maxSector: null,
    tiers: ["hard"]
  },
  {
    id: "s3-alien-pack",
    name: "Alien Pack",
    enemyIds: ["alien-parasite", "hunter"],
    roles: ["bounty", "bounty"],
    danger: 5,
    tags: ["alien", "balanced", "sustain"],
    flavorText: "Alien sustain meets human aggression—don’t feed the parasite.",
    postCombatEffect: "alien-residue",
    bonusCredits: 6,
    flavorOutcomeText: "Odd residue sold for scrap",
    minSector: 3,
    maxSector: null,
    tiers: ["medium", "hard"]
  },
  {
    id: "s3-var-wing",
    name: "Skirmish Wing",
    enemyIds: ["scout", "raider"],
    roles: ["bounty", "escort"],
    danger: 3,
    tags: ["balanced", "swarm", "mixed"],
    flavorText: "A skirmish line with a variable lead—expect a small twist.",
    minSector: 3,
    maxSector: null,
    tiers: ["medium"],
    varianceSlot: { index: 0, options: ["scout", "burner-drone"] }
  }
];

const ELITE_ENCOUNTER_BUCKETS = [
  {
    id: "elite-breach-crew",
    name: "Elite Breach Crew",
    enemyIds: ["hunter", "interceptor"],
    roles: ["bounty", "bounty"],
    danger: 6,
    tags: ["burst", "swarm", "elite-support"],
    flavorText: "Two elite killers—answer with burst or get overwhelmed.",
    minSector: 1,
    maxSector: null
  },
  {
    id: "elite-vanguard-screen",
    name: "Elite Vanguard Screen",
    enemyIds: ["burst-bounty", "support-escort"],
    roles: ["bounty", "escort"],
    danger: 6,
    tags: ["defense", "burst", "elite-support"],
    flavorText: "Spike damage behind a professional shield line.",
    postCombatEffect: "defense-salvage",
    bonusCredits: 8,
    flavorOutcomeText: "Recovered hardened plating",
    minSector: 1,
    maxSector: null
  },
  {
    id: "elite-xeno-pincer",
    name: "Elite Xeno Pincer",
    enemyIds: ["alien-parasite", "charger-drone"],
    roles: ["bounty", "bounty"],
    danger: 7,
    tags: ["alien", "burst", "elite-support"],
    flavorText: "Alien drain paired with elite overcharge—brutal sync.",
    minSector: 2,
    maxSector: null
  },
  {
    id: "elite-heavy-surge",
    name: "Elite Heavy Surge",
    enemyIds: ["bulwark", "burst-bounty"],
    roles: ["bounty", "bounty"],
    danger: 7,
    tags: ["siege", "burst", "defense"],
    flavorText: "A wall and a cannon—siege pacing with burst finishers.",
    minSector: 3,
    maxSector: null
  }
];

const PLANET_AMBUSH_BUCKETS = [
  {
    id: "p1-ambush-hunter",
    name: "Planet Ambush — Hunter",
    enemyIds: ["hunter"],
    danger: 3,
    tags: ["ambush", "burst", "balanced"],
    flavorText: "Something fast waited in the ruins—strike first.",
    postCombatEffect: "ambush-speed",
    minSector: 1,
    maxSector: 1
  },
  {
    id: "p2-ambush-parasite",
    name: "Planet Ambush — Parasite",
    enemyIds: ["alien-parasite"],
    danger: 4,
    tags: ["ambush", "alien", "sustain"],
    flavorText: "A parasite in the dust—don’t give it time to stabilize.",
    minSector: 2,
    maxSector: 2
  },
  {
    id: "p3-ambush-interceptor",
    name: "Planet Ambush — Ace",
    enemyIds: ["interceptor"],
    danger: 5,
    tags: ["ambush", "burst", "swarm"],
    flavorText: "An ace ambush—pure intercept pressure.",
    minSector: 3,
    maxSector: null
  }
];

function defaultRolesForEnemyCount(n) {
  if (n <= 1) return ["bounty"];
  return ["bounty", "escort"];
}

function resolveBucketEnemyIds(bucket) {
  const ids = bucket.enemyIds.slice();
  if (bucket.varianceSlot) {
    const { index, options } = bucket.varianceSlot;
    ids[index] = pickRandom(options);
  }
  return ids;
}

function bucketMatchesTierRules(bucket, tier) {
  if (!bucket.tiers.includes(tier)) return false;
  const n = resolveBucketEnemyIds(bucket).length;
  if (tier === "easy" && n !== 1) return false;
  if (tier === "hard" && n !== 2) return false;
  return true;
}

function filterEncounterBucketsForSectorAndTier(sectorNumber, tier) {
  const stage = getRunProgressStage();
  return ENCOUNTER_BUCKETS.filter(b => {
    if (b.minSector != null && stage < b.minSector) return false;
    if (b.maxSector != null && stage > b.maxSector) return false;
    return bucketMatchesTierRules(b, tier);
  });
}

const ENCOUNTER_TAG_SOFT_CAP = 3;

function getEncounterBucketWeight(bucket, tagCounts, routeIdentity) {
  let w = 1;
  for (const tag of bucket.tags || []) {
    const c = tagCounts[tag] || 0;
    if (c >= ENCOUNTER_TAG_SOFT_CAP) w *= 0.1;
    else if (c >= 2) w *= 0.42;
  }
  if (routeIdentity && routeIdentity.preferredTags && routeIdentity.preferredTags.length) {
    const prefs = routeIdentity.preferredTags;
    const overlap = (bucket.tags || []).filter(t => prefs.includes(t)).length;
    if (overlap > 0) w *= 1 + 0.32 * overlap;
  }
  return Math.max(0.04, w);
}

function pickWeightedEncounterBucket(pool, tagCounts, routeIdentity) {
  if (!pool.length) return null;
  const tc = tagCounts || {};
  const weights = pool.map(b => getEncounterBucketWeight(b, tc, routeIdentity));
  const total = weights.reduce((s, x) => s + x, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function recordEncounterTagDistribution(bucket) {
  if (!bucket || !state.run) return;
  if (!state.run.encounterTagCounts) state.run.encounterTagCounts = {};
  const tc = state.run.encounterTagCounts;
  for (const tag of bucket.tags || []) {
    tc[tag] = (tc[tag] || 0) + 1;
  }
  console.log("[tag distribution]", { ...tc });
}

function pickEncounterBucketForRun(sectorNumber, tier) {
  const pool = filterEncounterBucketsForSectorAndTier(sectorNumber, tier);
  if (!pool.length) return null;
  const tagCounts = state.run?.encounterTagCounts || {};
  const node = getCurrentNode();
  const ri = node ? getRouteIdentityForMapNode(node) : null;
  if (node && ri) {
    console.log("[route identity]", node.id, ri.routeType, ri.preferredTags);
  }
  return pickWeightedEncounterBucket(pool, tagCounts, ri);
}

function filterEliteBucketsForSector(sectorNumber) {
  const stage = getRunProgressStage();
  return ELITE_ENCOUNTER_BUCKETS.filter(b => {
    if (b.minSector != null && stage < b.minSector) return false;
    if (b.maxSector != null && stage > b.maxSector) return false;
    return true;
  });
}

function pickEliteEncounterBucket(sectorNumber) {
  const pool = filterEliteBucketsForSector(sectorNumber);
  if (!pool.length) return null;
  const tagCounts = state.run?.encounterTagCounts || {};
  const node = getCurrentNode();
  const ri = node ? getRouteIdentityForMapNode(node) : null;
  if (node && ri) {
    console.log("[route identity]", node.id, ri.routeType, ri.preferredTags);
  }
  return pickWeightedEncounterBucket(pool, tagCounts, ri);
}

function filterPlanetAmbushBucketsForSector(sectorNumber) {
  const stage = getRunProgressStage();
  return PLANET_AMBUSH_BUCKETS.filter(b => {
    if (b.minSector != null && stage < b.minSector) return false;
    if (b.maxSector != null && stage > b.maxSector) return false;
    return true;
  });
}

function pickPlanetAmbushBucket(sectorNumber) {
  const pool = filterPlanetAmbushBucketsForSector(sectorNumber);
  if (!pool.length) return null;
  const tagCounts = state.run?.encounterTagCounts || {};
  const node = getCurrentNode();
  const ri = node ? getRouteIdentityForMapNode(node) : null;
  if (node && ri) {
    console.log("[route identity]", node.id, ri.routeType, ri.preferredTags);
  }
  return pickWeightedEncounterBucket(pool, tagCounts, ri);
}

function buildEnemiesFromEncounterBucket(bucket, tier) {
  const ids = resolveBucketEnemyIds(bucket);
  const roles = bucket.roles || defaultRolesForEnemyCount(ids.length);
  return ids.map((id, i) => {
    const template = getEnemyTypeById(id);
    if (!template) return null;
    return buildEnemyFromTemplate(template, roles[i], tier);
  }).filter(Boolean);
}

function formatEncounterTagForDisplay(tag) {
  if (!tag || typeof tag !== "string") return "";
  return tag
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatEncounterTagsList(tags) {
  return (tags || []).map(formatEncounterTagForDisplay).join(", ");
}

function filterEncounterBucketsForSectorPreview(sectorNumber) {
  const stage = getRunProgressStage();
  return ENCOUNTER_BUCKETS.filter(b => {
    if (b.minSector != null && stage < b.minSector) return false;
    if (b.maxSector != null && stage > b.maxSector) return false;
    return true;
  });
}

function collectSoftEncounterTagsForMap(sectorNumber, isElite) {
  const pool = isElite
    ? filterEliteBucketsForSector(sectorNumber)
    : filterEncounterBucketsForSectorPreview(sectorNumber);
  const set = new Set();
  for (const b of pool) {
    for (const t of b.tags || []) {
      set.add(t);
    }
  }
  return [...set].sort();
}

function getSoftEncounterPreviewLine(sectorNumber, isElite) {
  const tags = collectSoftEncounterTagsForMap(sectorNumber, isElite);
  if (!tags.length) return "";
  const shown = tags.slice(0, 6);
  return `Possible threat patterns: ${formatEncounterTagsList(shown)}`;
}

function getEncounterMapFlavorHtml(node) {
  if (!node || (node.type !== "combat" && node.type !== "elite")) return "";
  if (isNodeCleared(node.id)) return "";
  const line = getSoftEncounterPreviewLine(state.sectorNumber, node.type === "elite");
  if (!line) return "";
  return `<div class="reward-meta map-encounter-preview">${line}</div>`;
}

function logEncounterIntroFromBucket(bucket) {
  if (!bucket) return;
  console.log("[encounter tags]", bucket.id, bucket.tags);
  log(`Contact: ${bucket.name}`, "system");
  const tags = bucket.tags || [];
  if (tags.length) {
    log(`Threat pattern: ${formatEncounterTagsList(tags)}`, "system");
  }
  if (bucket.flavorText) {
    log(bucket.flavorText, "system");
  }
}

function resolveEncounterBucketOutcomes() {
  const bucket = state.lastEncounterBucket;
  state.rewardChoiceBonus = 0;
  state.encounterCreditRewardModifier = 1;

  if (!bucket) {
    console.log("[encounter outcome]", null, "none");
    return 0;
  }

  let extraCredits = 0;
  let effect = "none";
  const pe = bucket.postCombatEffect;

  if (typeof bucket.bonusFuel === "number" && bucket.bonusFuel > 0) {
    const f = bucket.bonusFuel;
    state.run.fuel = Math.min(state.player.maxFuel, state.run.fuel + f);
    syncPlayerFuelFromRun();
    console.log("[fuel remaining]", state.run.fuel);
    log(`Encounter bonus: Fuel recovered (+${f} fuel)`, "system");
    effect = "bonus-fuel";
  }

  if (pe === "defense-salvage") {
    const c = bucket.bonusCredits ?? 10;
    gainCredits(c, "encounter outcome");
    extraCredits += c;
    const label = bucket.flavorOutcomeText || "Salvaged plating";
    log(`Encounter bonus: ${label} (+${c} credits)`, "system");
    effect = "defense-salvage";
  } else if (pe === "alien-residue") {
    const c = bucket.bonusCredits ?? 5;
    gainCredits(c, "encounter outcome");
    extraCredits += c;
    const label = bucket.flavorOutcomeText || "Strange salvage";
    log(`Encounter bonus: ${label} (+${c} credits)`, "system");
    effect = "alien-residue";
  } else if (pe === "swarm-options") {
    state.rewardChoiceBonus = 1;
    log(
      `Encounter bonus: ${bucket.flavorOutcomeText || "Extra salvage options on the reward screen."}`,
      "system"
    );
    effect = "swarm-options";
  } else if (pe === "burn-pressure") {
    if (state.turn > 5) {
      state.player.hull = Math.max(1, state.player.hull - 3);
      log("Encounter consequence: Hull scorched (-3 hull)", "system");
      effect = "hull-scorched";
    } else {
      const c = 5;
      gainCredits(c, "encounter outcome");
      extraCredits += c;
      log("Encounter bonus: Clean thermal break (+5 credits)", "system");
      effect = "thermal-clean";
    }
  } else if (pe === "ambush-speed") {
    if (state.turn <= 4) {
      const c = 15;
      gainCredits(c, "encounter outcome");
      extraCredits += c;
      log("Encounter bonus: Fast ambush clearance (+15 credits)", "system");
      effect = "ambush-fast";
    } else {
      log("Encounter consequence: Slow ambush extraction (no speed bonus)", "system");
      effect = "ambush-slow";
    }
  }

  if (typeof bucket.rewardModifier === "number" && bucket.rewardModifier > 0 && bucket.rewardModifier !== 1) {
    state.encounterCreditRewardModifier = bucket.rewardModifier;
    if (effect === "none" || effect === "bonus-fuel") {
      effect = "credit-modifier";
    }
  }

  console.log("[encounter outcome]", bucket.id, effect);
  return extraCredits;
}

const ENCOUNTER_TEMPLATES = [
  {
    id: "duel",
    tier: "easy",
    build(encounterIndex, tier) {
      const indexed = ENEMY_TYPES[Math.min(encounterIndex + 1, ENEMY_TYPES.length - 1)];
      const bounty = Math.random() < 0.55 ? pickVarietyEnemy() : indexed;
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
  state.lastEncounterBucket = null;
  state.rewardChoiceBonus = 0;
  state.encounterCreditRewardModifier = 1;

  let encounterBucketForIntro = null;
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
    const pBucket = pickPlanetAmbushBucket(state.sectorNumber);
    if (pBucket) {
      encounterBucketForIntro = pBucket;
      console.log("[encounter bucket]", pBucket.id, pBucket.name, pBucket.enemyIds);
      state.enemies = buildEnemiesFromEncounterBucket(pBucket, tier);
      recordEncounterTagDistribution(pBucket);
    } else {
      state.enemies = PLANET_ALIEN_AMBUSH_TEMPLATE.build(state.encounterIndex, tier);
    }
  } else if (state.pendingEliteContract) {
    state.pendingEliteContract = false;
    state.eliteContractCombat = true;
    tier = "elite";
    state.encounterTier = tier;
    const eBucket = pickEliteEncounterBucket(state.sectorNumber);
    if (eBucket) {
      encounterBucketForIntro = eBucket;
      console.log("[encounter bucket]", eBucket.id, eBucket.name, eBucket.enemyIds);
      state.enemies = buildEnemiesFromEncounterBucket(eBucket, tier).slice(0, 2);
      recordEncounterTagDistribution(eBucket);
    } else {
      const template = pickRandom(ELITE_CONTRACT_TEMPLATES);
      state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
    }
  } else if (state.encounterIndex > 0) {
    const allowed = getAllowedTiersForEncounter(state.encounterIndex);
    tier = pickRandom(allowed);
    state.encounterTier = tier;
    const bucket = pickEncounterBucketForRun(state.sectorNumber, tier);
    if (bucket) {
      encounterBucketForIntro = bucket;
      console.log("[encounter bucket]", bucket.id, bucket.name, bucket.enemyIds);
      state.enemies = buildEnemiesFromEncounterBucket(bucket, tier).slice(0, 2);
      recordEncounterTagDistribution(bucket);
    } else {
      const template = getCurrentEncounterTemplate(tier);
      state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
    }
  } else {
    const allowed = getAllowedTiersForEncounter(state.encounterIndex);
    tier = pickRandom(allowed);
    state.encounterTier = tier;
    const bucket = pickEncounterBucketForRun(state.sectorNumber, tier);
    if (bucket) {
      encounterBucketForIntro = bucket;
      console.log("[encounter bucket]", bucket.id, bucket.name, bucket.enemyIds);
      state.enemies = buildEnemiesFromEncounterBucket(bucket, tier).slice(0, 2);
      recordEncounterTagDistribution(bucket);
    } else {
      const template = getCurrentEncounterTemplate(tier);
      state.enemies = template.build(state.encounterIndex, tier).slice(0, 2);
    }
  }
  state.lastEncounterBucket = encounterBucketForIntro;
  state.selectedEnemyUid = null;
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

  if (encounterBucketForIntro) {
    logEncounterIntroFromBucket(encounterBucketForIntro);
  }

  if (state.inBossCombat) {
    log(`Boss Encounter: ${getSectorBossName(state.sectorNumber)}`, "enemy");
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

  drawCards(5 + (state.player.handDrawBonus || 0));
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
    runBurnBonus: 0,
    runBeamGenerationBonus: 0,
    markOnApplyDamage: 0,
    snub: isExplorationShip
      ? {
          alive: true,
          hull: 5,
          maxHull: 5,
          respawnCounter: 0
        }
      : null,
    maxFuel: CAMPAIGN_MAX_FUEL,
    fuel: CAMPAIGN_MAX_FUEL,
    handDrawBonus: 0
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
  state.lastEncounterBucket = null;
  state.rewardChoiceBonus = 0;
  state.encounterCreditRewardModifier = 1;
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
  state.bossEncounterId = pickRandomBossEncounterId();
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
    miniComboSynergyShown: false,
    commitMomentUsed: false,
    encounterTagCounts: {},
    recentRewardOfferIds: [],
    fuel: CAMPAIGN_MAX_FUEL
  };
  state.player.fuel = state.run.fuel;
  applyFuelCapForRunState();
  console.log("[fuel tuning]", "sector", state.sectorNumber, "fuel", state.run.fuel, "max", state.player.maxFuel);
  els.log.innerHTML = "";

  hideComboBanner();

  state.mapNodes = createSectorByNumber(state.sectorNumber);
  if (state.sectorNumber <= 3) {
    console.log("[campaign route map]", state.sectorNumber, state.mapNodes);
  }
  state.currentNodeId = "S";
  state.visitedNodeIds = ["S"];
  state.lockedNodeIds = [];
  state.clearedNodeIds = [];
  state.currentScreen = "map";
  log(`Ship selected: ${getShipDisplayName(state.selectedShipId)}.`, "system");

  closeMiningMinigameIfOpen();
  hideOverlay();
  render();
}

function gainPlayerBlock(amount, sourceName) {
  state.player.block += amount;
  log(`${sourceName} grants ${amount} block.`, "system");
  if (amount > 0) {
    applyPlayerBlockFlash();
    const pg = document.getElementById("playerGroup");
    spawnFloatingTextNearElement(pg, `+${amount}`, "block-gain-text");
  }
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
  if (repaired > 0) {
    const pg = document.getElementById("playerGroup");
    spawnFloatingTextNearElement(pg, `+${repaired}`, "heal-text");
  }
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

  const lockBonus = enemy.extraDamageFromLockThisTurn || 0;
  if (lockBonus > 0) {
    amount += lockBonus;
  }

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
  if (!Number.isFinite(enemy.hull)) enemy.hull = 0;

  try {
    const enemyHitEl = document.querySelector(`.enemy-unit[data-enemy-uid="${enemy.uid}"]`);
    if (enemyHitEl) {
      if (hpDamage > 0) {
        spawnFloatingTextNearElement(enemyHitEl, `−${hpDamage}`, "damage-text");
      } else if (blocked > 0 && amount > 0) {
        spawnFloatingTextNearElement(enemyHitEl, `−${blocked}`, "block-text");
      }
      applyEnemyDamageFlash(enemyHitEl);
      enemyHitEl.classList.remove("enemy-hit-shake");
      void enemyHitEl.offsetWidth;
      enemyHitEl.classList.add("enemy-hit-shake");
      setTimeout(() => enemyHitEl.classList.remove("enemy-hit-shake"), 420);
      if (hpDamage >= 6 || amount >= 10) applyBattlefieldShake();
    }

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

    if (enemyHullValue(enemy) <= 0) {
      log(`${enemy.name} is destroyed.`, "system");
    }
  } finally {
    resolveCombatAfterDamageIfNeeded();
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
    spawnFloatingTextNearElement(playerUnitEl, `−${blocked}`, "block-mitigate-text");
    applyHitFlash(playerUnitEl);
  }
  if (snubDamage > 0) {
    spawnFloatingTextNearElement(snubUnitEl, `−${snubDamage}`, "snub-text");
    applyHitFlash(snubUnitEl);
    if (state.selectedShipId === "exploration-vessel" && state.player.snub && !state.player.snub.alive) {
      spawnFloatingTextNearElement(snubUnitEl, "Snub Destroyed", "snub-destroyed-text");
    }
  }
  if (hpDamage > 0) {
    spawnFloatingTextNearElement(playerUnitEl, `−${hpDamage}`, "player-damage-text");
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
    if (enemy.intent) {
      console.log("[enemy intent]", enemy.name, enemy.intent.intentType || enemy.intent.type);
    }
  });
}

function getIntentDescription(intent) {
  if (intent.intentType === "charging") return "Stores energy — big attack next turn.";
  if (intent.intentType === "discharge") return "Fires a charged volley.";
  if (intent.intentType === "self-shield") return "Reinforces its own shields.";
  if (intent.intentType === "ally-shield") return "Passes block to an ally — kill or CC the defender first.";
  if (intent.intentType === "burn-burst") return "Small hit; unstable core stacks Burn on itself.";
  if (intent.intentType === "drain") return "Strike that heals the parasite if it cuts hull.";
  if (intent.intentType === "brace") return "Turtles briefly between drain strikes.";
  switch (intent.type) {
    case "attack":
      return `Enemy will attack for ${intent.amount}.`;
    case "block":
      return `Enemy will gain ${intent.amount} block on its turn.`;
    case "ally-block":
      return `Ally will gain ${intent.amount} block from this unit.`;
    case "disrupt":
      return "Enemy will disrupt your systems.";
    default:
      return "Unknown enemy maneuver.";
  }
}

function cardRequiresEnemyTarget(card) {
  if (!card || typeof card.effect !== "function") return false;
  const source = card.effect.toString();
  return (
    source.includes("getSelectedEnemy(") ||
    source.includes("dealAttackDamageToEnemy(") ||
    source.includes("dealDamageToEnemy(")
  );
}

function cardSupportsPlayerDropTarget(card) {
  if (!card || typeof card.effect !== "function") return false;
  if (cardRequiresEnemyTarget(card)) return false;

  const explicitSelfTargetIds = new Set([
    "basic-block",
    "reinforce-shields",
    "tactical-reposition",
    "defense-matrix",
    "guard-shift",
    "braced-strike",
    "heat-shielding",
    "heat-sink",
    "shield-harvest",
    "escort-protocol",
    "spare-plating"
  ]);
  if (explicitSelfTargetIds.has(card.id)) return true;

  const source = card.effect.toString();
  return (
    source.includes("gainPlayerBlock(") ||
    source.includes("repairPlayerHull(") ||
    source.includes("state.player.energy +=")
  );
}

function playCardOnEnemy(uid, enemyUid) {
  const enemy = getEnemyByUid(enemyUid);
  if (!enemy || enemyHullValue(enemy) <= 0) return;
  state.selectedEnemyUid = enemyUid;
  playCard(uid, enemyUid);
}

function playCardOnPlayer(uid) {
  playCard(uid);
}

function playCard(uid, forcedEnemyUid = null) {
  if (state.pendingReward || state.pendingExtraction) return;
  if (state.combatEnded) {
    try {
      render();
    } finally {
      handleCombatEnd();
    }
    return;
  }

  const card = state.hand.find(c => c.uid === uid);
  if (!card) return;
  if (cardRequiresEnemyTarget(card) && !forcedEnemyUid) {
    log("Drag this card onto an enemy to target it.", "system");
    return;
  }
  const cost = cardPlayCost(card);
  const energy = playerEnergyPlayable();
  if (cost > energy) return;

  state.player.energy = energy - cost;

  const cardEl = document.querySelector(`.hand [data-card-uid="${uid}"]`);
  if (cardEl) {
    cardEl.classList.remove("card-play-pop");
    void cardEl.offsetWidth;
    cardEl.classList.add("card-play-pop");
    setTimeout(() => cardEl.classList.remove("card-play-pop"), 320);
  }

  const removed = removeCardFromHand(uid);
  if (!removed) return;

  applyCombatCardPlayJuice();

  const targetEnemy = getSelectedEnemy();
  const markBefore = targetEnemy ? targetEnemy.markStacks || 0 : 0;
  const beamBefore = targetEnemy ? targetEnemy.beamCharge || 0 : 0;

  removed.effect();

  if (targetEnemy) {
    if (
      state.player.markOnApplyDamage &&
      (targetEnemy.markStacks || 0) > markBefore
    ) {
      dealAttackDamageToEnemy(state.player.markOnApplyDamage, "Mark commitment");
    }
    if (state.player.runBeamGenerationBonus && (targetEnemy.beamCharge || 0) > beamBefore) {
      targetEnemy.beamCharge =
        (targetEnemy.beamCharge || 0) + state.player.runBeamGenerationBonus;
    }
  }

  if (removed.exhaust || removed.type === "missile" || removed.type === "torpedo") {
    state.exhaustPile.push(removed);
    log(`${removed.name} is exhausted.`, removed.type);
  } else {
    state.discardPile.push(removed);
  }

  try {
    render();
  } finally {
    resolveCombatAfterDamageIfNeeded();
    if (state.combatEnded) {
      handleCombatEnd();
    }
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
    if (enemy.counter === "burn-spray") {
      enemy.burnStacks = (enemy.burnStacks || 0) + 2;
      log(`${enemy.name} core runs hot (+2 self Burn).`, "enemy");
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
        const attackBonus = getEnemySynergyAttackBonus(enemy, alive, intent);
        const totalDamage = Math.max(0, finalAmount + attackBonus);
        const hullBefore = state.player.hull;
        dealDamageToPlayer(totalDamage, enemy.name);
        if (enemy.counter === "parasite" && state.player.hull < hullBefore) {
          enemy.hull = Math.min(enemy.maxHull, enemy.hull + 2);
          log(`${enemy.name} feeds on hull damage (+2 hull).`, "enemy");
        }
        if (enemy.trait === "jammer" && totalDamage > 0) {
          state.player.energy = Math.max(0, state.player.energy - 1);
          log(`${enemy.name} jams your systems. Lose 1 energy.`, "enemy");
        }
        break;
      }

      case "block":
        gainEnemyBlock(intent.amount, enemy.name);
        break;
      case "ally-block": {
        const ally = pickAllyBlockTarget(enemy, alive);
        if (ally) {
          ally.block = (ally.block || 0) + intent.amount;
          const syn =
            ally.combatRole === "charger" || ally.combatRole === "parasite" ? " (formation synergy)" : "";
          log(`${ally.name} gains ${intent.amount} block from ${enemy.name}'s shield link${syn}.`, "enemy");
        } else {
          gainEnemyBlock(intent.amount, enemy.name);
        }
        break;
      }
      case "disrupt":
        applySentinelDisruption(enemy);
        break;
    }

    if (enemy.counter === "parasite" && enemy.turnCounter % 2 === 0) {
      const others = alive.filter(e => e.uid !== enemy.uid && e.hull > 0);
      if (others.length) {
        const t = others[0];
        t.burnStacks = (t.burnStacks || 0) + 2;
        log(`${enemy.name} spreads spores to ${t.name} (+2 Burn).`, "enemy");
      }
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
  if (enemy.bossType === "bastion") {
    enemy.block = (enemy.block || 0) + 6;
  }

  if (enemy.bossType === "hive-mind") {
    const drones = state.enemies.filter(e => e.hiveDrone && e.hull > 0);
    if (drones.length > 0) {
      enemy.hull = Math.min(enemy.maxHull, enemy.hull + 3);
      log("Hive Mind feeds on linked drones (+3 hull).", "enemy");
    }
    const droneCount = drones.length;
    if (enemy.turnCounter % 3 === 0 && droneCount < 2) {
      const alive = state.enemies.filter(e => e.hull > 0).length;
      if (alive < 4) {
        spawnHiveDrone();
        log("Spawning drones.", "enemy");
      }
    }
  }

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

function spawnHiveDrone() {
  const droneTemplate = getEnemyTypeById("scout") || ENEMY_TYPES[0];
  const drone = buildEnemyFromTemplate(droneTemplate, "bounty", "medium");
  drone.hiveDrone = true;
  drone.name = "Hive Drone";
  state.enemies.push(drone);
}

function endTurn() {
  if (state.pendingReward || state.pendingExtraction) return;
  if (state.combatEnded) {
    try {
      render();
    } finally {
      handleCombatEnd();
    }
    return;
  }

  state.enemies.forEach(enemy => {
    enemy.extraDamageFromLockThisTurn = 0;
  });

  discardHand();
  log("You end your turn.");

  // Enemy block expires at the start of enemy turn
  state.enemies.forEach(enemy => {
    enemy.block = 0;
  });

  resolveEnemyTurn();

  state.enemies.forEach(enemy => {
    if (enemyHullValue(enemy) <= 0) return;
    const burnDamage =
      (enemy.burnStacks || 0) +
      (state.player.burnBonus || 0) +
      (state.player.runBurnBonus || 0);
    if (burnDamage <= 0) return;
    enemy.hull = Math.max(0, enemy.hull - burnDamage);
    if (!Number.isFinite(enemy.hull)) enemy.hull = 0;
    log(`${enemy.name} suffers ${burnDamage} Burn damage.`, "system");
    const burnEl = document.querySelector(`.enemy-unit[data-enemy-uid="${enemy.uid}"]`);
    if (burnEl) {
      spawnFloatingTextNearElement(burnEl, `−${burnDamage}`, "burn-damage-text");
    }
  });

  state.enemies.forEach(enemy => {
    if (enemyHullValue(enemy) <= 0) return;
    enemy.beamCharge = Math.max(0, (enemy.beamCharge || 0) - 1);
  });

  resolveCombatAfterDamageIfNeeded();

  if (state.combatEnded) {
    try {
      render();
    } finally {
      handleCombatEnd();
    }
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
  drawCards(5 + (state.player.handDrawBonus || 0));
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
  if (state.pendingReward || state.pendingExtraction) return;
  if (state.run) {
    state.run.encounterCount = (state.run.encounterCount || 0) + 1;
  }
  state.encounterIndex = (state.encounterIndex || 0) + 1;

  gainCredits(5, "combat cleanup bonus");
  earnedNow += 5;

  earnedNow += resolveEncounterBucketOutcomes();

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
  if (
    state.combatEnded &&
    currentNode &&
    Array.isArray(currentNode.neighbors) &&
    currentNode.neighbors.includes("BG")
  ) {
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

  if (state.runWon) {
    state.pendingReward = true;
    showOverlay(
      "Run Complete",
      "You finished the 30-combat campaign route.",
      "Restart Run",
      () => startRun()
    );
    return;
  }

  if (state.inBossCombat) {
    state.inBossCombat = false;
    state.runWon = true;
    state.pendingReward = true;
    showOverlay(
      "Run Complete",
      "Boss defeated. You completed the 30-node campaign climb.",
      "Restart Run",
      () => startRun()
    );
    return;
  }

  if (state.ambushEncounter) {
    showAmbushCreditsOnlyOverlay();
    return;
  }

  if (
    currentNode &&
    currentNode.type === "elite" &&
    state.run &&
    !state.run.commitMomentUsed
  ) {
    showCommitMomentOverlay();
    return;
  }

  showPostVictoryChoiceOverlay();
}

function cardPlayCost(card) {
  const n = Number(card?.cost);
  if (Number.isFinite(n)) return n;
  const base = card?.id != null ? getCardById(card.id) : null;
  const n2 = Number(base?.cost);
  return Number.isFinite(n2) ? n2 : 0;
}

function playerEnergyPlayable() {
  const n = Number(state.player?.energy);
  return Number.isFinite(n) ? n : 0;
}

let draggingTargetedCardUid = null;
let draggingPlayerCardUid = null;
let draggingTargetHoverEnemyUid = null;
let dragOriginPoint = null;
let dragPointerPoint = null;
let targetingBeamEl = null;

function ensureTargetingBeamEl() {
  if (targetingBeamEl && document.body.contains(targetingBeamEl)) return targetingBeamEl;
  targetingBeamEl = document.getElementById("targetingBeam");
  if (!targetingBeamEl) {
    targetingBeamEl = document.createElement("div");
    targetingBeamEl.id = "targetingBeam";
    document.body.appendChild(targetingBeamEl);
  }
  return targetingBeamEl;
}

function updateTargetingBeam() {
  if (!draggingTargetedCardUid || !dragOriginPoint) return;
  const beam = ensureTargetingBeamEl();
  const targetPoint = (() => {
    if (draggingTargetHoverEnemyUid) {
      const el = document.querySelector(`.enemy-unit[data-enemy-uid="${draggingTargetHoverEnemyUid}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return dragPointerPoint;
  })();
  if (!targetPoint) return;
  const dx = targetPoint.x - dragOriginPoint.x;
  const dy = targetPoint.y - dragOriginPoint.y;
  const length = Math.max(0, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx);
  beam.style.left = `${dragOriginPoint.x}px`;
  beam.style.top = `${dragOriginPoint.y}px`;
  beam.style.width = `${length}px`;
  beam.style.transform = `rotate(${angle}rad)`;
  beam.classList.toggle("locked", Boolean(draggingTargetHoverEnemyUid));
}

function clearDragTargetingState() {
  draggingTargetedCardUid = null;
  draggingPlayerCardUid = null;
  draggingTargetHoverEnemyUid = null;
  dragOriginPoint = null;
  dragPointerPoint = null;
  document.body.classList.remove("drag-targeting-active");
  document.body.classList.remove("drag-player-targeting-active");
  document.querySelectorAll(".enemy-unit.drop-over, .enemy-unit.target-lock").forEach(el => {
    el.classList.remove("drop-over");
    el.classList.remove("target-lock");
  });
  const playerGroup = document.getElementById("playerGroup");
  if (playerGroup) {
    playerGroup.classList.remove("drop-over");
    playerGroup.classList.remove("target-lock");
  }
  const beam = document.getElementById("targetingBeam");
  if (beam) beam.classList.remove("locked");
}

document.addEventListener("dragover", event => {
  if (!draggingTargetedCardUid) return;
  dragPointerPoint = { x: event.clientX, y: event.clientY };
  updateTargetingBeam();
});

document.addEventListener("drop", () => {
  if (!draggingTargetedCardUid && !draggingPlayerCardUid) return;
  clearDragTargetingState();
});

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
      <div class="card-text">End turn, or draw cards when your deck refills.</div>
      <button disabled>Waiting</button>
    `;
    els.hand.appendChild(empty);
    return;
  }

  const handSize = Math.max(1, state.hand.length);
  const center = (handSize - 1) / 2;
  const spread = Math.max(1, center);

  state.hand.forEach((card, index) => {
    const cost = cardPlayCost(card);
    const energy = playerEnergyPlayable();
    const canPlay = !state.combatEnded && cost <= energy;
    const requiresTarget = cardRequiresEnemyTarget(card);
    const supportsPlayerDrop = cardSupportsPlayerDropTarget(card);

    const cardEl = document.createElement("div");
    const role = card.cardRole || "system";
    cardEl.dataset.cardUid = card.uid;
    cardEl.className =
      `card ${card.type} role-${role} ${canPlay ? "card--playable" : "disabled"} ${requiresTarget ? "card--targeted" : ""} ${supportsPlayerDrop ? "card--player-targeted" : ""}`.trim();

    const normalized = (index - center) / spread;
    const edge = Math.abs(normalized);
    const rotate = normalized * 8;
    const yOffset = Math.round(edge * edge * 14);
    const xOffset = Math.round(normalized * 8);
    const overlap = handSize <= 4 ? -8 : handSize <= 6 ? -12 : -16;
    const zBase = 20 - Math.round(edge * 10);
    cardEl.style.setProperty("--fan-rotate", `${rotate}deg`);
    cardEl.style.setProperty("--fan-y", `${yOffset}px`);
    cardEl.style.setProperty("--fan-x", `${xOffset}px`);
    cardEl.style.setProperty("--fan-overlap", `${index === 0 ? 0 : overlap}px`);
    cardEl.style.setProperty("--fan-z", `${zBase + index}`);
    cardEl.style.setProperty("--fan-rotate-mobile", `${rotate * 0.65}deg`);
    cardEl.style.setProperty("--fan-y-mobile", `${Math.round(yOffset * 0.65)}px`);
    cardEl.style.setProperty("--fan-x-mobile", `${Math.round(xOffset * 0.6)}px`);
    cardEl.style.setProperty("--fan-overlap-mobile", `${index === 0 ? 0 : Math.round(overlap * 0.6)}px`);

    cardEl.draggable = Boolean((requiresTarget || supportsPlayerDrop) && canPlay);
    if ((requiresTarget || supportsPlayerDrop) && canPlay) {
      cardEl.addEventListener("dragstart", event => {
        draggingTargetedCardUid = requiresTarget ? card.uid : null;
        draggingPlayerCardUid = supportsPlayerDrop ? card.uid : null;
        draggingTargetHoverEnemyUid = null;
        const rect = cardEl.getBoundingClientRect();
        dragOriginPoint = { x: rect.left + rect.width / 2, y: rect.top + 18 };
        dragPointerPoint = { x: event.clientX || dragOriginPoint.x, y: event.clientY || dragOriginPoint.y };
        cardEl.classList.add("card--dragging");
        if (requiresTarget) {
          document.body.classList.add("drag-targeting-active");
          ensureTargetingBeamEl();
          updateTargetingBeam();
        }
        if (supportsPlayerDrop) {
          document.body.classList.add("drag-player-targeting-active");
        }
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", card.uid);
        }
      });
      cardEl.addEventListener("dragend", () => {
        cardEl.classList.remove("card--dragging");
        clearDragTargetingState();
      });
    }

    const typeLabel = getCardCategoryLabel(card);

    cardEl.innerHTML = `
      <div class="card-top">
        <div class="card-title">${card.name}</div>
        <div class="cost">${cost}</div>
      </div>
      <div class="card-type">${typeLabel}</div>
      <div class="card-text">${enhanceCardDescriptionWithTooltips(card.description)}</div>
      <button ${canPlay ? "" : "disabled"}>${canPlay ? (requiresTarget ? "Drag to Target" : supportsPlayerDrop ? "Drag to Ship" : "Play Card") : "Not Enough Energy"}</button>
    `;

    const button = cardEl.querySelector("button");
    button.addEventListener("click", () => {
      if (requiresTarget) {
        log("Drag this card onto an enemy to target it.", "system");
        return;
      }
      playCard(card.uid);
    });

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
  document.body.classList.toggle("combat-active", state.currentScreen === "combat");
  if (els.combatScreen) els.combatScreen.classList.toggle("hidden", state.currentScreen !== "combat");
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
  if (els.fuelText) els.fuelText.textContent = state.run.fuel;

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

  renderHand();
}

function initStartMusic() {
  const music = document.getElementById("startMusic");
  if (!music) return;

  const startAudio = () => {
    music.volume = 0.025;
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
els.endTurnBtn.addEventListener("click", endTurn);
if (els.startRunFlowBtn) {
  els.startRunFlowBtn.addEventListener("click", () => {
    showShipSelection();
  });
}

initStartMusic();
initMuteButton();
initTooltipSystem();
initMiningMinigame();
showStartScreen();
