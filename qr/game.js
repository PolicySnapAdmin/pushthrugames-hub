/**
 * QR — Purpose Unknown
 * Endless sectors · random Memory/RAM modules · creative combat & mazes.
 * Cloud: qr_* only (see online.js). Local-first.
 */
(() => {
  const TILE = 24;
  const COLS = 32;
  const ROWS = 22;
  const SAVE_KEY = "qr-purpose-v3";
  const MEMORY_KEY = "qr-memory-ram-v1";
  const META_KEY = "qr-meta-stats-v1";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  // Larger canvas for bigger grid
  canvas.width = 768;
  canvas.height = 528;

  const els = {
    level: document.getElementById("hud-level"),
    hp: document.getElementById("hud-hp"),
    threats: document.getElementById("hud-threats"),
    mods: document.getElementById("hud-mods"),
    powerBar: document.getElementById("power-bar"),
    log: document.getElementById("log-list"),
    title: document.getElementById("title-screen"),
    welcome: document.getElementById("welcome-screen"),
    overlay: document.getElementById("overlay"),
    overlayKicker: document.getElementById("overlay-kicker"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayBody: document.getElementById("overlay-body"),
    overlayOk: document.getElementById("overlay-ok"),
    btnStart: document.getElementById("btn-start"),
    btnLoadTitle: document.getElementById("btn-load-title"),
    btnAccountTitle: document.getElementById("btn-account-title"),
    pause: document.getElementById("pause-screen"),
    pauseHeading: document.getElementById("pause-heading"),
    pauseSub: document.getElementById("pause-sub"),
    pauseToast: document.getElementById("pause-toast"),
    pauseViews: {
      main: document.getElementById("pause-view-main"),
      controls: document.getElementById("pause-view-controls"),
      powerups: document.getElementById("pause-view-powerups"),
      status: document.getElementById("pause-view-status"),
      stats: document.getElementById("pause-view-stats"),
      account: document.getElementById("pause-view-account"),
    },
    pausePowerupsBody: document.getElementById("pause-powerups-body"),
    pauseStatusBody: document.getElementById("pause-status-body"),
    pauseStatsBody: document.getElementById("pause-stats-body"),
    statsLevelCard: document.getElementById("stats-level-card"),
    pauseAccountBody: document.getElementById("pause-account-body"),
    accountName: document.getElementById("account-name"),
    accountEmail: document.getElementById("account-email"),
    accountPass: document.getElementById("account-pass"),
    accountMsg: document.getElementById("account-msg"),
    accountSignin: document.getElementById("account-signin"),
    accountSignup: document.getElementById("account-signup"),
    accountGuest: document.getElementById("account-guest"),
    accountSignout: document.getElementById("account-signout"),
    titleMeta: document.getElementById("title-meta"),
    btnStatsTitle: document.getElementById("btn-stats-title"),
    welcomeName: document.getElementById("welcome-name"),
    welcomeEmail: document.getElementById("welcome-email"),
    welcomePass: document.getElementById("welcome-pass"),
    welcomeMsg: document.getElementById("welcome-msg"),
    welcomeCreate: document.getElementById("welcome-create"),
    welcomeSignin: document.getElementById("welcome-signin"),
    welcomePlay: document.getElementById("welcome-play"),
    welcomeGuest: document.getElementById("welcome-guest"),
  };

  const WELCOME_SKIP_KEY = "qr-welcome-skip-v1";

  function setWelcomeMsg(msg) {
    if (els.welcomeMsg) els.welcomeMsg.textContent = msg;
  }

  function syncModalOpenClass() {
    const any =
      (els.welcome && !els.welcome.hidden) ||
      (els.pause && !els.pause.hidden) ||
      (els.title && !els.title.hidden) ||
      (els.overlay && !els.overlay.hidden);
    document.body.classList.toggle("modal-open", !!any);
  }

  function showWelcome() {
    if (els.welcome) els.welcome.hidden = false;
    if (els.title) els.title.hidden = true;
    syncModalOpenClass();
  }

  function hideWelcome() {
    if (els.welcome) els.welcome.hidden = true;
    syncModalOpenClass();
  }

  function goToTitleFromWelcome() {
    hideWelcome();
    if (els.title) els.title.hidden = false;
    refreshTitleMeta();
    refreshTitleLoadBtn();
    syncModalOpenClass();
  }

  function hasEmailAccount() {
    const u = online()?.api?.session?.user;
    if (!u) return false;
    if (u.is_anonymous) return false;
    const email = u.email || "";
    if (!email || email.includes("@login.qr.")) return false;
    return true;
  }

  function shouldShowWelcome() {
    try {
      if (localStorage.getItem(WELCOME_SKIP_KEY) === "1") return false;
    } catch (_) {}
    if (hasEmailAccount()) return false;
    return true;
  }

  // ── Online helpers ────────────────────────────────────────────────────────
  function online() {
    return window.QROnline || null;
  }
  function setAccountMsg(msg) {
    if (els.accountMsg) els.accountMsg.textContent = msg;
  }
  function renderPauseAccount() {
    const o = online()?.api;
    const enabled = !!(online()?.cfg?.()?.enabled && online()?.cfg?.()?.supabaseUrl);
    if (!els.pauseAccountBody) return;
    if (!enabled) {
      els.pauseAccountBody.innerHTML = `<p>Cloud accounts are <strong>off</strong>. See docs/BACKEND.md + config.js.</p>`;
      return;
    }
    const prof = o?.profile;
    if (!prof) {
      els.pauseAccountBody.innerHTML = `<p>Status: <strong>not signed in</strong>. Guest / email uses <code>qr_*</code> only.</p>`;
      return;
    }
    els.pauseAccountBody.innerHTML = `
      <div class="pause-status-row"><span>Name</span><span>${esc(prof.display_name || "—")}</span></div>
      <div class="pause-status-row"><span>Code</span><span>${esc(prof.friend_code || "—")}</span></div>
      <div class="pause-status-row"><span>Cloud best</span><span>${esc(String(prof.best_sector ?? "—"))}</span></div>
      <div class="pause-status-row"><span>Sectors cleared</span><span>${esc(String(prof.sectors_cleared ?? 0))}</span></div>
      <div class="pause-status-row"><span>Threats purged</span><span>${esc(String(prof.threats_purged ?? 0))}</span></div>`;
    if (els.accountName && prof.display_name) els.accountName.value = prof.display_name;
  }
  async function syncProgress(opts = {}) {
    const o = online();
    if (!o?.api?.online) return;
    try {
      await o.reportProgress({
        bestSector: Math.max(state.bestLevel, state.level || 1),
        sectorsClearedDelta: opts.sectorsClearedDelta || 0,
        threatsDelta: opts.threatsDelta || 0,
        runStarted: !!opts.runStarted,
      });
    } catch (e) {
      console.warn(e);
    }
  }

  /** @typedef {'floor'|'wall'|'soft'|'exit'|'spawn'|'hazard'|'ice'|'portal'} Tile */

  // ── Massive random module pool (rarity, not level-gated) ──────────────────
  // Unique combo: letter + shape + color
  const POWERUPS = {};
  function def(id, name, letter, shape, color, rarity, desc, apply) {
    POWERUPS[id] = { id, name, letter, shape, color, rarity, desc, apply };
  }

  // Commons
  def("swift", "Swift", "S", "chevron", "#7cffb2", "common", "Faster movement", (p) => {
    p.moveCdBase = Math.max(0.045, p.moveCdBase - 0.02);
  });
  def("repair", "Repair", "P", "cross", "#5ec8ff", "common", "Restore HP", (p) => {
    p.hp = Math.min(p.maxHp, p.hp + 5);
  });
  def("spike", "Spike", "K", "diamond", "#ff6b8a", "common", "+scan damage", (p) => {
    p.damage += 1;
  });
  def("rupture", "Rupture", "R", "burst", "#ffc857", "common", "+2 soft-wall breaks (B)", (p) => {
    p.breaks += 2;
  });
  def("fortify", "Fortify", "F", "square", "#9aa0ff", "common", "+max HP & heal 2", (p) => {
    p.maxHp += 2;
    p.hp = Math.min(p.maxHp, p.hp + 2);
  });
  def("crumb", "Crumb", "C", "dot", "#c4a882", "common", "Tiny heal + 1 break", (p) => {
    p.hp = Math.min(p.maxHp, p.hp + 2);
    p.breaks += 1;
  });
  def("focus", "Focus", "O", "ring", "#a8e6cf", "common", "Slightly faster scans", (p) => {
    p.scanCdBase = Math.max(0.12, p.scanCdBase - 0.04);
  });
  def("boot", "Boot", "B", "chevron", "#88d8b0", "common", "Small speed boost", (p) => {
    p.moveCdBase = Math.max(0.05, p.moveCdBase - 0.012);
  });
  def("patch", "Patch", "H", "cross", "#7fdbda", "common", "Heal 3", (p) => {
    p.hp = Math.min(p.maxHp, p.hp + 3);
  });
  def("nudge", "Nudge", "U", "triangle", "#ffd3b6", "common", "+0.5 damage", (p) => {
    p.damage += 0.5;
  });

  // Uncommon
  def("expand", "Expand", "E", "ring", "#7ee8ff", "uncommon", "+scan range", (p) => {
    p.scanRange = Math.min(4, p.scanRange + 1);
  });
  def("overclock", "Overclock", "X", "triangle", "#ffe066", "uncommon", "Faster scans + damage", (p) => {
    p.scanCdBase = Math.max(0.1, p.scanCdBase - 0.06);
    p.damage += 0.5;
  });
  def("nullify", "Nullify", "N", "hex", "#c77dff", "uncommon", "+boss damage mult", (p) => {
    p.bossMult += 0.4;
  });
  def("bolt", "Bolt", "L", "bolt", "#ff9f43", "uncommon", "Unlock SHOOT (F) · +bolt dmg", (p) => {
    p.canShoot = true;
    p.shootDmg += 1.5;
  });
  def("blade", "Blade", "D", "blade", "#e17055", "uncommon", "Sword reach on scan", (p) => {
    p.hasSword = true;
    p.swordReach = Math.max(p.swordReach, 2);
    p.damage += 0.5;
  });
  def("aegis", "Aegis", "A", "shield", "#74b9ff", "uncommon", "+2 shield blocks", (p) => {
    p.shieldCharges += 2;
  });
  def("magnet", "Magnet", "M", "ring", "#fd79a8", "uncommon", "Pull nearby modules", (p) => {
    p.magnet = true;
  });
  def("thorns", "Thorns", "T", "burst", "#e84393", "uncommon", "Reflect contact damage", (p) => {
    p.thorns = (p.thorns || 0) + 1;
  });
  def("vamp", "Vamp", "V", "diamond", "#d63031", "uncommon", "Heal on kill", (p) => {
    p.lifesteal = true;
  });
  def("bombkit", "Bombkit", "Q", "square", "#fdcb6e", "uncommon", "+2 bombs (G to drop)", (p) => {
    p.bombs += 2;
  });
  def("phase", "Phase", "Z", "hex", "#a29bfe", "uncommon", "Walk through soft walls", (p) => {
    p.phaseSoft = true;
  });
  def("decoy", "Decoy", "Y", "dot", "#b2bec3", "uncommon", "+2 decoys (V key)", (p) => {
    p.decoys += 2;
  });

  // Rare
  def("hulk", "Hulk", "W", "square", "#00b894", "rare", "RAM enemies by walking into them (timed)", (p) => {
    p.hulkTime = Math.max(p.hulkTime, 0) + 12;
  });
  def("ghost", "Ghost", "G", "ring", "#dfe6e9", "rare", "Phase through enemies (time + passes)", (p) => {
    p.ghostTime = Math.max(p.ghostTime, 0) + 10;
    p.ghostPasses += 4;
  });
  def("superspeed", "Warp", "J", "chevron", "#55efc4", "rare", "Super speed", (p) => {
    p.moveCdBase = Math.max(0.035, p.moveCdBase * 0.55);
    p.superSpeed = true;
  });
  def("joinus", "Join-Us", "I", "hex", "#6c5ce7", "rare", "Convert 1 enemy to ally (C key)", (p) => {
    p.joinUs += 1;
  });
  def("rail", "Rail", "!", "bolt", "#fab1a0", "rare", "Long-range bolts", (p) => {
    p.canShoot = true;
    p.shootRange += 4;
    p.shootDmg += 2;
  });
  def("cleave", "Cleave", "§", "blade", "#ff7675", "rare", "Wide sword arc", (p) => {
    p.hasSword = true;
    p.swordReach = Math.max(p.swordReach, 3);
    p.cleave = true;
    p.damage += 1;
  });
  def("fortress", "Fortress", "#", "shield", "#0984e3", "rare", "Big shield stack + HP", (p) => {
    p.shieldCharges += 5;
    p.maxHp += 4;
    p.hp = Math.min(p.maxHp, p.hp + 4);
  });
  def("multibeam", "Multibeam", "*", "burst", "#ffeaa7", "rare", "Scan hits farther + harder", (p) => {
    p.scanRange = Math.min(5, p.scanRange + 2);
    p.damage += 1.5;
  });
  def("chaos", "Chaos", "?", "burst", "#fd79a8", "rare", "Random small boosts", (p) => {
    p.damage += 1;
    p.breaks += 2;
    p.hp = Math.min(p.maxHp, p.hp + 3);
    p.moveCdBase = Math.max(0.05, p.moveCdBase - 0.01);
  });
  def("mirror", "Mirror", "%", "diamond", "#81ecec", "rare", "Strong thorns", (p) => {
    p.thorns = (p.thorns || 0) + 3;
  });

  // Legendary
  def("apocalypse", "Apocalypse", "Ω", "burst", "#ff1744", "legendary", "Massive damage + boss shred", (p) => {
    p.damage += 4;
    p.bossMult += 1;
    p.canShoot = true;
    p.shootDmg += 3;
  });
  def("spectre", "Spectre", "Ψ", "ring", "#eceff1", "legendary", "Long ghost + free soft phase", (p) => {
    p.ghostTime += 20;
    p.ghostPasses += 12;
    p.phaseSoft = true;
  });
  def("titan", "Titan", "Ξ", "square", "#00e676", "legendary", "Long hulk + HP", (p) => {
    p.hulkTime += 22;
    p.maxHp += 8;
    p.hp = Math.min(p.maxHp, p.hp + 8);
  });
  def("oracle", "Oracle", "Δ", "hex", "#b388ff", "legendary", "Huge scan + bolt kit", (p) => {
    p.scanRange = 5;
    p.damage += 2;
    p.canShoot = true;
    p.shootRange += 6;
    p.shootDmg += 2;
  });
  def("swarm", "Swarm", "Σ", "dot", "#ff6e40", "legendary", "+3 Join-Us converts", (p) => {
    p.joinUs += 3;
  });
  def("godspeed", "Godspeed", "∞", "chevron", "#18ffff", "legendary", "Extreme speed + shield", (p) => {
    p.moveCdBase = 0.03;
    p.superSpeed = true;
    p.shieldCharges += 3;
  });

  const POWER_IDS = Object.keys(POWERUPS);
  const RARITY_WEIGHT = { common: 52, uncommon: 28, rare: 15, legendary: 5 };

  const LORE = [
    "VERSION=UNKNOWN. Someone wrote you.",
    "Patterns like you are not meant to leave the quiet.",
    "…return what was taken from the scan.",
    "Error is not failure — error is a trail.",
    "Readers hunt incomplete codes.",
    "A checksum that never closes still points somewhere.",
    "You are a key shaped like a question.",
    "Major versions rewrite the lattice.",
    "Moving modules drift on dead protocols.",
    "Mazes are just failed compressions.",
  ];

  const state = {
    running: false,
    paused: false,
    pauseView: "main",
    level: 1,
    bestLevel: 1,
    runSeed: 1,
    player: null,
    keys: new Set(),
    log: [],
    moveCd: 0,
    scanCd: 0,
    shootCd: 0,
    scanFlash: 0,
    invuln: 0,
    enemies: [],
    pickups: [],
    projectiles: [],
    particles: [],
    hazards: [],
    bombs: [],
    decoys: [],
    grid: [],
    exitOpen: false,
    bossKind: null,
    awaitingNext: false,
    dead: false,
    onContinue: null,
    toastTimer: 0,
    memory: new Set(),
    threatsKilledThisLevel: 0,
    mazeName: "",
    meta: defaultMetaPlaceholder(),
  };

  function defaultMetaPlaceholder() {
    return {
      accountLevel: 1,
      accountXp: 0,
      runsStarted: 0,
      runsDied: 0,
      runsWonSector: 0,
      bestSectorEver: 1,
      totalSectorsCleared: 0,
      totalKills: 0,
      killsGrunt: 0,
      killsElite: 0,
      killsZig: 0,
      killsPatrol: 0,
      killsMini: 0,
      killsMajor: 0,
      modulesInstalled: 0,
      ramUnlocks: 0,
      bombsDropped: 0,
      decoysDropped: 0,
      boltsFired: 0,
      joinsUsed: 0,
      wallsBroken: 0,
      damageDealt: 0,
      damageTaken: 0,
      scansUsed: 0,
      hulkKills: 0,
      ghostPasses: 0,
      mazes: {},
      rarityLoot: { common: 0, uncommon: 0, rare: 0, legendary: 0 },
      longestRunSectors: 0,
      totalPlaySec: 0,
      lastPlayedAt: 0,
    };
  }

  function isBusyUi() {
    return (
      state.paused ||
      (els.overlay && !els.overlay.hidden) ||
      (els.title && !els.title.hidden) ||
      (els.welcome && !els.welcome.hidden)
    );
  }

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }

  function isBossLevel(level) {
    if (level > 0 && level % 10 === 0) return "major";
    if (level > 0 && level % 3 === 0) return "mini";
    return null;
  }

  function isKnown(id) {
    return state.memory.has(id);
  }

  function loadMemory() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) state.memory = new Set(arr.filter((id) => POWERUPS[id]));
    } catch (_) {}
  }

  function saveMemory() {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify([...state.memory]));
    } catch (_) {}
  }

  function unlockMemory(id) {
    if (!POWERUPS[id] || state.memory.has(id)) return false;
    state.memory.add(id);
    saveMemory();
    return true;
  }

  function memoryCount() {
    return state.memory.size;
  }

  // ── Meta / account level (survives runs) ───────────────────────────────────
  function defaultMeta() {
    return {
      accountLevel: 1,
      accountXp: 0,
      runsStarted: 0,
      runsDied: 0,
      runsWonSector: 0,
      bestSectorEver: 1,
      totalSectorsCleared: 0,
      totalKills: 0,
      killsGrunt: 0,
      killsElite: 0,
      killsZig: 0,
      killsPatrol: 0,
      killsMini: 0,
      killsMajor: 0,
      modulesInstalled: 0,
      ramUnlocks: 0,
      bombsDropped: 0,
      decoysDropped: 0,
      boltsFired: 0,
      joinsUsed: 0,
      wallsBroken: 0,
      damageDealt: 0,
      damageTaken: 0,
      scansUsed: 0,
      hulkKills: 0,
      ghostPasses: 0,
      mazes: {},
      rarityLoot: { common: 0, uncommon: 0, rare: 0, legendary: 0 },
      longestRunSectors: 0,
      totalPlaySec: 0,
      lastPlayedAt: 0,
    };
  }

  /** XP needed to go from level L → L+1 */
  function xpToNextLevel(level) {
    return Math.floor(40 + level * 28 + Math.pow(level, 1.35) * 4);
  }

  function accountProgress(meta) {
    const m = meta || state.meta;
    const need = xpToNextLevel(m.accountLevel);
    const pct = Math.min(100, Math.floor((m.accountXp / need) * 100));
    return { need, pct, xp: m.accountXp, level: m.accountLevel };
  }

  function loadMetaStats() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) {
        state.meta = defaultMeta();
        return;
      }
      state.meta = { ...defaultMeta(), ...JSON.parse(raw) };
      if (!state.meta.mazes || typeof state.meta.mazes !== "object") state.meta.mazes = {};
      if (!state.meta.rarityLoot) state.meta.rarityLoot = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    } catch (_) {
      state.meta = defaultMeta();
    }
  }

  function saveMetaStats() {
    try {
      state.meta.lastPlayedAt = Date.now();
      localStorage.setItem(META_KEY, JSON.stringify(state.meta));
    } catch (_) {}
    refreshTitleMeta();
    syncMetaCloud();
  }

  function grantAccountXp(amount, reason) {
    if (!amount || amount <= 0) return;
    const m = state.meta;
    m.accountXp += amount;
    let leveled = 0;
    while (m.accountXp >= xpToNextLevel(m.accountLevel)) {
      m.accountXp -= xpToNextLevel(m.accountLevel);
      m.accountLevel += 1;
      leveled += 1;
    }
    if (leveled) {
      log(`Account level up! → LV ${m.accountLevel}${reason ? " (" + reason + ")" : ""}`, true);
      // Full modal only on milestone ranks so combat isn't interrupted every level
      if (m.accountLevel % 5 === 0 || leveled > 1) {
        showOverlay(
          "ACCOUNT LEVEL",
          `Signal rank ${m.accountLevel}`,
          `Your account grows across runs.\n${metaBonusSummary(m.accountLevel)}\n\nXP carries forever. Run gear still resets on death.`
        );
      }
    }
    saveMetaStats();
  }

  function metaBonusSummary(level) {
    const hp = Math.floor((level - 1) / 3);
    const brk = Math.floor((level - 1) / 5);
    const dmg = Math.floor((level - 1) / 8) * 0.5;
    const shd = Math.floor((level - 1) / 10);
    return `Run bonuses: +${hp} max HP · +${brk} start breaks · +${dmg} damage · +${shd} shield`;
  }

  /** Soft permanent-feel bonuses at run start from account level */
  function applyMetaBonuses(p) {
    const L = state.meta.accountLevel || 1;
    const hp = Math.floor((L - 1) / 3);
    const brk = Math.floor((L - 1) / 5);
    const dmg = Math.floor((L - 1) / 8) * 0.5;
    const shd = Math.floor((L - 1) / 10);
    p.maxHp += hp;
    p.hp = p.maxHp;
    p.breaks += brk;
    p.damage += dmg;
    p.shieldCharges += shd;
    p._meta = { hp, brk, dmg, shd, level: L };
  }

  function trackKill(e) {
    const m = state.meta;
    m.totalKills += 1;
    const k = e.kind || "grunt";
    if (k === "elite") m.killsElite += 1;
    else if (k === "zig") m.killsZig += 1;
    else if (k === "patrol") m.killsPatrol += 1;
    else if (k === "mini") m.killsMini += 1;
    else if (k === "major") m.killsMajor += 1;
    else m.killsGrunt += 1;
    let xp = 2;
    if (k === "elite") xp = 5;
    if (k === "zig" || k === "patrol") xp = 3;
    if (k === "mini") xp = 28;
    if (k === "major") xp = 70;
    grantAccountXp(xp, e.boss ? "boss" : "purge");
  }

  function trackModuleInstall(def, firstRam) {
    const m = state.meta;
    m.modulesInstalled += 1;
    if (def?.rarity && m.rarityLoot[def.rarity] != null) m.rarityLoot[def.rarity] += 1;
    if (firstRam) {
      m.ramUnlocks += 1;
      grantAccountXp(18, "RAM write");
    } else {
      grantAccountXp(3, "module");
    }
  }

  function trackSectorClear(sector) {
    const m = state.meta;
    m.totalSectorsCleared += 1;
    m.runsWonSector += 1;
    m.bestSectorEver = Math.max(m.bestSectorEver, sector + 1);
    m.longestRunSectors = Math.max(m.longestRunSectors, sector);
    if (state.mazeName) m.mazes[state.mazeName] = (m.mazes[state.mazeName] || 0) + 1;
    grantAccountXp(12 + sector * 2, "sector clear");
  }

  function trackRunStart() {
    state.meta.runsStarted += 1;
    grantAccountXp(2, "boot");
  }

  function trackDeath(sector) {
    state.meta.runsDied += 1;
    state.meta.bestSectorEver = Math.max(state.meta.bestSectorEver, sector);
    state.meta.longestRunSectors = Math.max(state.meta.longestRunSectors, sector);
    saveMetaStats();
  }

  function refreshTitleMeta() {
    if (!els.titleMeta) return;
    const { level, xp, need } = accountProgress();
    els.titleMeta.textContent = `Account LV ${level} · ${xp}/${need} XP · best sector ${state.meta.bestSectorEver} · RAM ${memoryCount()}`;
  }

  function renderStatsPage() {
    const m = state.meta;
    const { level, xp, need, pct } = accountProgress();
    if (els.statsLevelCard) {
      els.statsLevelCard.innerHTML = `
        <div class="al-top">
          <span class="al-lv">Account LV ${level}</span>
          <span class="al-xp">${xp} / ${need} XP</span>
        </div>
        <div class="account-level-track"><div class="account-level-fill" style="width:${pct}%"></div></div>
        <p class="account-level-perks">${esc(metaBonusSummary(level))}</p>`;
    }
    if (!els.pauseStatsBody) return;
    const mazeTop = Object.entries(m.mazes || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k} ×${v}`)
      .join(" · ") || "—";
    const rl = m.rarityLoot || {};
    els.pauseStatsBody.innerHTML = `
      <div class="stats-section">Career</div>
      <div class="stats-grid-mini">
        <div class="stats-pill"><strong>${m.runsStarted}</strong>Runs started</div>
        <div class="stats-pill"><strong>${m.runsDied}</strong>Runs ended</div>
        <div class="stats-pill"><strong>${m.bestSectorEver}</strong>Best sector</div>
        <div class="stats-pill"><strong>${m.totalSectorsCleared}</strong>Sectors cleared</div>
        <div class="stats-pill"><strong>${m.longestRunSectors}</strong>Longest run depth</div>
        <div class="stats-pill"><strong>${memoryCount()}/${POWER_IDS.length}</strong>RAM decoded</div>
      </div>
      <div class="stats-section">Combat</div>
      <div class="stats-grid-mini">
        <div class="stats-pill"><strong>${m.totalKills}</strong>Threats purged</div>
        <div class="stats-pill"><strong>${m.killsGrunt}</strong>Grunts</div>
        <div class="stats-pill"><strong>${m.killsElite}</strong>Elites</div>
        <div class="stats-pill"><strong>${m.killsZig + m.killsPatrol}</strong>Zig / Patrol</div>
        <div class="stats-pill"><strong>${m.killsMini}</strong>Mini-bosses</div>
        <div class="stats-pill"><strong>${m.killsMajor}</strong>Major bosses</div>
        <div class="stats-pill"><strong>${Math.floor(m.damageDealt)}</strong>Damage dealt</div>
        <div class="stats-pill"><strong>${Math.floor(m.damageTaken)}</strong>Damage taken</div>
      </div>
      <div class="stats-section">Modules &amp; tools</div>
      <div class="stats-grid-mini">
        <div class="stats-pill"><strong>${m.modulesInstalled}</strong>Modules installed</div>
        <div class="stats-pill"><strong>${m.ramUnlocks}</strong>First-time RAM writes</div>
        <div class="stats-pill"><strong>${rl.common || 0}</strong>Common loot</div>
        <div class="stats-pill"><strong>${rl.uncommon || 0}</strong>Uncommon</div>
        <div class="stats-pill"><strong>${rl.rare || 0}</strong>Rare</div>
        <div class="stats-pill"><strong>${rl.legendary || 0}</strong>Legendary</div>
        <div class="stats-pill"><strong>${m.boltsFired}</strong>Bolts fired</div>
        <div class="stats-pill"><strong>${m.bombsDropped}</strong>Bombs dropped</div>
        <div class="stats-pill"><strong>${m.decoysDropped}</strong>Decoys</div>
        <div class="stats-pill"><strong>${m.joinsUsed}</strong>Join-Us used</div>
        <div class="stats-pill"><strong>${m.wallsBroken}</strong>Walls ruptured</div>
        <div class="stats-pill"><strong>${m.scansUsed}</strong>Scans</div>
        <div class="stats-pill"><strong>${m.hulkKills}</strong>Hulk smashes</div>
        <div class="stats-pill"><strong>${m.ghostPasses}</strong>Ghost passes</div>
      </div>
      <div class="stats-section">Mazes visited</div>
      <p class="ram-blurb">${esc(mazeTop)}</p>
      <p class="ram-blurb">Account level is permanent. Run inventory still resets on death — but LV bonuses and stats stack forever.</p>`;
  }

  async function syncMetaCloud() {
    const o = online();
    if (!o?.api?.online || !o.api.sb) return;
    try {
      // Best-effort: store key fields if columns exist
      await o.api.sb.rpc("qr_report_meta", {
        p_account_level: state.meta.accountLevel,
        p_account_xp: state.meta.accountXp,
        p_best_sector: state.meta.bestSectorEver,
        p_stats: state.meta,
      });
    } catch (_) {
      /* RPC optional until migration applied */
    }
  }

  function defaultPlayer() {
    const p = {
      x: 2,
      y: Math.floor(ROWS / 2),
      hp: 14,
      maxHp: 14,
      damage: 2,
      bossMult: 1,
      moveCdBase: 0.13,
      scanCdBase: 0.28,
      scanRange: 1,
      breaks: 1,
      level: 1,
      modules: [],
      facing: { dx: 1, dy: 0 },
      canShoot: false,
      shootDmg: 2,
      shootRange: 6,
      hasSword: false,
      swordReach: 1,
      cleave: false,
      shieldCharges: 0,
      hulkTime: 0,
      ghostTime: 0,
      ghostPasses: 0,
      joinUs: 0,
      superSpeed: false,
      magnet: false,
      thorns: 0,
      lifesteal: false,
      bombs: 0,
      decoys: 0,
      phaseSoft: false,
    };
    applyMetaBonuses(p);
    return p;
  }

  function log(msg, highlight) {
    state.log.unshift({ msg, highlight: !!highlight });
    state.log = state.log.slice(0, 55);
    renderLog();
  }

  function renderLog() {
    els.log.innerHTML = state.log
      .map((e) => `<li>${e.highlight ? `<strong>${esc(e.msg)}</strong>` : esc(e.msg)}</li>`)
      .join("");
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function updateHud() {
    const p = state.player;
    if (!p) return;
    els.level.textContent = String(state.level);
    els.hp.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const alive = livingEnemies().length;
    els.threats.textContent = state.exitOpen ? "clear" : String(alive);
    els.mods.textContent = `${p.modules.length} · brk ${p.breaks}`;

    const chips = [];
    chips.push(
      `<span class="power-chip" title="Decoded in Memory/RAM">${memoryCount()}/${POWER_IDS.length} RAM</span>`
    );
    const buffs = [];
    if (p.canShoot) buffs.push("BOLT");
    if (p.hasSword) buffs.push("BLADE");
    if (p.shieldCharges > 0) buffs.push(`SHD${p.shieldCharges}`);
    if (p.hulkTime > 0) buffs.push(`HULK${Math.ceil(p.hulkTime)}s`);
    if (p.ghostTime > 0 || p.ghostPasses > 0) buffs.push(`GHOST`);
    if (p.joinUs > 0) buffs.push(`JOIN${p.joinUs}`);
    if (p.bombs > 0) buffs.push(`BOMB${p.bombs}`);
    if (p.superSpeed) buffs.push("WARP");
    for (const b of buffs) chips.push(`<span class="power-chip warn">${b}</span>`);

    const counts = {};
    for (const id of p.modules) counts[id] = (counts[id] || 0) + 1;
    const top = Object.entries(counts).slice(-6);
    for (const [id, n] of top) {
      const def = POWERUPS[id];
      if (!def) continue;
      const known = isKnown(id);
      chips.push(
        `<span class="power-chip" style="color:${known ? def.color : "#8b8b9a"}" title="${esc(
          known ? def.desc : "???"
        )}">${esc(known ? def.letter + " " + def.name : "???")}${n > 1 ? "×" + n : ""}</span>`
      );
    }
    if (state.bossKind === "mini") chips.push(`<span class="power-chip warn">MINI-BOSS</span>`);
    if (state.bossKind === "major") chips.push(`<span class="power-chip warn">MAJOR BOSS</span>`);
    if (state.exitOpen) chips.push(`<span class="power-chip">EXIT</span>`);
    if (state.mazeName) chips.push(`<span class="power-chip">${esc(state.mazeName)}</span>`);
    els.powerBar.innerHTML = chips.join("");
  }

  function showOverlay(kicker, title, body, onContinue) {
    if (state.paused) closePause(false);
    els.overlayKicker.textContent = kicker;
    els.overlayTitle.textContent = title;
    els.overlayBody.textContent = body;
    els.overlay.hidden = false;
    state.onContinue = onContinue || null;
    syncModalOpenClass();
  }

  function hideOverlay() {
    els.overlay.hidden = true;
    syncModalOpenClass();
    const fn = state.onContinue;
    state.onContinue = null;
    if (fn) fn();
  }

  // ── Save / load ───────────────────────────────────────────────────────────
  function snapshotRun() {
    if (!state.running || !state.player || state.dead) return null;
    return {
      level: state.level,
      runSeed: state.runSeed,
      player: JSON.parse(JSON.stringify(state.player)),
      grid: state.grid.map((r) => r.slice()),
      enemies: JSON.parse(JSON.stringify(state.enemies)),
      pickups: JSON.parse(JSON.stringify(state.pickups)),
      bombs: JSON.parse(JSON.stringify(state.bombs)),
      decoys: JSON.parse(JSON.stringify(state.decoys)),
      exitOpen: state.exitOpen,
      bossKind: state.bossKind,
      mazeName: state.mazeName,
      log: state.log.slice(0, 30),
    };
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function hasRunSave() {
    const d = readSave();
    return !!(d && d.run && d.run.player && d.run.grid);
  }

  function saveGame(manual) {
    try {
      const prev = readSave() || {};
      const run = snapshotRun();
      const payload = {
        v: 3,
        bestLevel: Math.max(state.bestLevel, state.level || 1),
        savedAt: Date.now(),
        run: manual && state.running && !state.dead ? snapshotRun() : run || prev.run || null,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      state.bestLevel = payload.bestLevel;
      refreshTitleLoadBtn();
      return true;
    } catch (_) {
      return false;
    }
  }

  function save() {
    saveGame(false);
  }

  function applyRun(run) {
    state.level = Math.max(1, Number(run.level) || 1);
    state.runSeed = run.runSeed || state.level * 99;
    state.player = run.player;
    state.grid = run.grid;
    state.enemies = run.enemies || [];
    state.pickups = run.pickups || [];
    state.bombs = run.bombs || [];
    state.decoys = run.decoys || [];
    state.projectiles = [];
    state.particles = [];
    state.exitOpen = !!run.exitOpen;
    state.bossKind = run.bossKind || isBossLevel(state.level);
    state.mazeName = run.mazeName || "";
    state.log = Array.isArray(run.log) ? run.log : [];
    state.awaitingNext = false;
    state.dead = false;
    state.moveCd = 0;
    state.scanCd = 0;
    state.shootCd = 0;
    renderLog();
    updateHud();
  }

  function loadGame() {
    const data = readSave();
    if (!data?.run?.player || !data.run.grid) return { ok: false, msg: "No saved run." };
    els.title.hidden = true;
    els.overlay.hidden = true;
    state.onContinue = null;
    state.running = true;
    applyRun(data.run);
    state.bestLevel = Math.max(state.bestLevel, Number(data.bestLevel) || 1);
    log("Save loaded.", true);
    return { ok: true, msg: `Loaded sector ${state.level}.` };
  }

  function loadMeta() {
    const data = readSave();
    if (data) state.bestLevel = Math.max(1, Number(data.bestLevel) || 1);
  }

  function refreshTitleLoadBtn() {
    if (els.btnLoadTitle) els.btnLoadTitle.hidden = !hasRunSave();
  }

  function showPauseToast(msg) {
    if (!els.pauseToast) return;
    els.pauseToast.hidden = false;
    els.pauseToast.textContent = msg;
    state.toastTimer = 2.2;
  }

  function setPauseView(view) {
    state.pauseView = view;
    for (const [name, el] of Object.entries(els.pauseViews)) {
      if (el) el.hidden = name !== view;
    }
    if (view === "main") {
      els.pauseHeading.textContent = "Menu";
      els.pauseSub.textContent = `Sector ${state.level} · best ${state.bestLevel} · ${state.mazeName || "grid"}`;
    } else if (view === "controls") {
      els.pauseHeading.textContent = "Controls";
      els.pauseSub.textContent = "Parse the lattice";
    } else if (view === "powerups") {
      els.pauseHeading.textContent = "Memory / RAM";
      els.pauseSub.textContent = `${memoryCount()}/${POWER_IDS.length} decoded · random each run`;
      renderPausePowerups();
    } else if (view === "status") {
      els.pauseHeading.textContent = "Status";
      els.pauseSub.textContent = "Live signal";
      renderPauseStatus();
    } else if (view === "stats") {
      els.pauseHeading.textContent = "Lifetime & Account";
      els.pauseSub.textContent = "Progress that survives every wipe";
      renderStatsPage();
    } else if (view === "account") {
      els.pauseHeading.textContent = "Account";
      els.pauseSub.textContent = "QR cloud · qr_* only";
      renderPauseAccount();
    }
  }

  function glyphHtml(def, known) {
    const shape = known ? def.shape : "unknown";
    const letter = known ? def.letter : "?";
    const color = known ? def.color : "#6a6a78";
    return `<span class="mod-glyph" data-shape="${esc(shape)}" style="--mod:${color}">${esc(letter)}</span>`;
  }

  function renderPausePowerups() {
    const owned = {};
    for (const id of state.player?.modules || []) owned[id] = (owned[id] || 0) + 1;
    const order = ["legendary", "rare", "uncommon", "common"];
    const sorted = POWER_IDS.slice().sort((a, b) => {
      const ra = order.indexOf(POWERUPS[a].rarity);
      const rb = order.indexOf(POWERUPS[b].rarity);
      return ra - rb || POWERUPS[a].name.localeCompare(POWERUPS[b].name);
    });
    const rows = sorted.map((id) => {
      const def = POWERUPS[id];
      const n = owned[id] || 0;
      const known = isKnown(id);
      if (!known) {
        return `<div class="pause-mod locked"><div class="pause-mod-main">${glyphHtml(def, false)}
          <div><strong style="color:#8b8b9a">???</strong><br />${esc(def.rarity)} · unknown</div></div>
          <div class="owned">—</div></div>`;
      }
      return `<div class="pause-mod"><div class="pause-mod-main">${glyphHtml(def, true)}
        <div><strong style="color:${def.color}">${esc(def.letter)} · ${esc(def.name)}</strong>
        <br />${esc(def.desc)}<br /><span class="mod-meta">${esc(def.rarity)} · ${esc(def.shape)}</span></div></div>
        <div class="owned">${n ? "run ×" + n : "in RAM"}</div></div>`;
    });
    els.pausePowerupsBody.innerHTML =
      `<p class="ram-blurb"><strong>${POWER_IDS.length}</strong> modules in the pool. Drops are <strong>random per run</strong> (not fixed by sector). Unknown = ??? until you install one into Memory/RAM.</p>` +
      rows.join("");
  }

  function renderPauseStatus() {
    const p = state.player;
    if (!p) {
      els.pauseStatusBody.innerHTML = "<p>No active run.</p>";
      return;
    }
    const rows = [
      ["Sector", state.level],
      ["Maze", state.mazeName || "—"],
      ["Best", state.bestLevel],
      ["HP", `${Math.ceil(p.hp)}/${p.maxHp}`],
      ["Damage", p.damage],
      ["Boss mult", p.bossMult.toFixed(2) + "×"],
      ["Scan range", p.scanRange],
      ["Shield", p.shieldCharges],
      ["Hulk", p.hulkTime > 0 ? p.hulkTime.toFixed(1) + "s" : "off"],
      ["Ghost", `${p.ghostTime.toFixed(1)}s / ${p.ghostPasses} passes`],
      ["Join-Us", p.joinUs],
      ["Bolts", p.canShoot ? `yes dmg ${p.shootDmg}` : "no"],
      ["Sword", p.hasSword ? `reach ${p.swordReach}` : "no"],
      ["Bombs", p.bombs],
      ["Breaks", p.breaks],
      ["RAM", `${memoryCount()}/${POWER_IDS.length}`],
      ["Threats", livingEnemies().length],
    ];
    els.pauseStatusBody.innerHTML = rows
      .map(([k, v]) => `<div class="pause-status-row"><span>${esc(k)}</span><span>${esc(String(v))}</span></div>`)
      .join("");
  }

  function openPause() {
    if (!state.running || state.dead || (els.overlay && !els.overlay.hidden)) return;
    state.paused = true;
    state.keys.clear();
    els.pause.hidden = false;
    if (els.pauseToast) els.pauseToast.hidden = true;
    setPauseView("main");
    syncModalOpenClass();
  }

  function closePause(resumeLog) {
    if (!state.paused) return;
    state.paused = false;
    els.pause.hidden = true;
    if (!state.running) {
      els.title.hidden = false;
      refreshTitleMeta();
    } else if (resumeLog) {
      log("Resumed.");
    }
    syncModalOpenClass();
  }

  function quitToTitle() {
    closePause(false);
    state.running = false;
    state.player = null;
    if (els.overlay) els.overlay.hidden = true;
    state.onContinue = null;
    els.title.hidden = false;
    refreshTitleLoadBtn();
    refreshTitleMeta();
    syncModalOpenClass();
  }

  function handlePauseAction(action) {
    if (action === "resume") return closePause(true);
    if (action === "back" || action === "back-or-close") {
      if (state.pauseView !== "main") return setPauseView("main");
      return closePause(true);
    }
    if (action === "controls") return setPauseView("controls");
    if (action === "powerups") return setPauseView("powerups");
    if (action === "status") return setPauseView("status");
    if (action === "stats") return setPauseView("stats");
    if (action === "account") return setPauseView("account");
    if (action === "save") {
      const ok = saveGame(true);
      showPauseToast(ok ? "Game saved." : "Save failed.");
      return;
    }
    if (action === "load") {
      if (!hasRunSave()) return showPauseToast("No save file.");
      const res = loadGame();
      showPauseToast(res.msg);
      if (res.ok) closePause(false);
      return;
    }
    if (action === "quit") {
      saveGame(false);
      quitToTitle();
    }
  }

  // ── Level generation ──────────────────────────────────────────────────────
  function floorTiles() {
    const out = [];
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const t = state.grid[y][x];
        if (t === "floor" || t === "spawn" || t === "ice") out.push({ x, y });
      }
    }
    return out;
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickPowerId(rand) {
    // Pure rarity bag — NOT gated by level (addictive run variance)
    const bag = [];
    for (const id of POWER_IDS) {
      const w = RARITY_WEIGHT[POWERUPS[id].rarity] || 10;
      for (let i = 0; i < w; i++) bag.push(id);
    }
    return bag[Math.floor(rand() * bag.length)];
  }

  function carveRect(x0, y0, x1, y1, tile) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1) {
          state.grid[y][x] = tile || "floor";
        }
      }
    }
  }

  function buildMaze(level, rand) {
    // Start solid soft/hard mix then carve
    state.grid = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? "wall" : "wall"))
    );

    const styles = ["rooms", "corridors", "scatter", "arena", "braid", "islands"];
    const style = styles[Math.floor(rand() * styles.length)];
    state.mazeName = style.toUpperCase();

    if (style === "rooms") {
      const rooms = 5 + Math.floor(rand() * 4) + Math.min(4, Math.floor(level / 5));
      const centers = [];
      for (let i = 0; i < rooms; i++) {
        const w = 3 + Math.floor(rand() * 5);
        const h = 3 + Math.floor(rand() * 4);
        const x = 2 + Math.floor(rand() * (COLS - w - 4));
        const y = 2 + Math.floor(rand() * (ROWS - h - 4));
        carveRect(x, y, x + w, y + h, "floor");
        centers.push({ x: x + Math.floor(w / 2), y: y + Math.floor(h / 2) });
      }
      // Connect rooms
      for (let i = 1; i < centers.length; i++) {
        const a = centers[i - 1];
        const b = centers[i];
        let x = a.x;
        let y = a.y;
        while (x !== b.x) {
          state.grid[y][x] = "floor";
          x += Math.sign(b.x - x);
        }
        while (y !== b.y) {
          state.grid[y][x] = "floor";
          y += Math.sign(b.y - y);
        }
      }
    } else if (style === "corridors") {
      // Horizontal + vertical highways
      for (let y = 2; y < ROWS - 2; y += 2 + Math.floor(rand() * 2)) {
        for (let x = 1; x < COLS - 1; x++) state.grid[y][x] = "floor";
      }
      for (let x = 2; x < COLS - 2; x += 3 + Math.floor(rand() * 2)) {
        for (let y = 1; y < ROWS - 1; y++) state.grid[y][x] = "floor";
      }
    } else if (style === "scatter") {
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          if (rand() > 0.38) state.grid[y][x] = "floor";
        }
      }
      // Ensure connectivity flood from spawn pocket
      carveRect(1, Math.floor(ROWS / 2) - 2, 6, Math.floor(ROWS / 2) + 2, "floor");
    } else if (style === "arena") {
      carveRect(2, 2, COLS - 3, ROWS - 3, "floor");
      // Pillars
      for (let i = 0; i < 8 + level; i++) {
        const x = 4 + Math.floor(rand() * (COLS - 8));
        const y = 3 + Math.floor(rand() * (ROWS - 6));
        state.grid[y][x] = rand() > 0.5 ? "wall" : "soft";
      }
    } else if (style === "braid") {
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          if ((x + y) % 2 === 0 || rand() > 0.55) state.grid[y][x] = "floor";
        }
      }
    } else if (style === "islands") {
      carveRect(1, 1, COLS - 2, ROWS - 2, "floor");
      for (let i = 0; i < 12 + level; i++) {
        const x = 3 + Math.floor(rand() * (COLS - 6));
        const y = 2 + Math.floor(rand() * (ROWS - 4));
        const s = 1 + Math.floor(rand() * 3);
        carveRect(x, y, x + s, y + s, rand() > 0.4 ? "soft" : "wall");
      }
    }

    // Soft wall sprinkle scales with level
    const softChance = Math.min(0.2, 0.04 + level * 0.01);
    for (let y = 2; y < ROWS - 2; y++) {
      for (let x = 2; x < COLS - 2; x++) {
        if (state.grid[y][x] === "floor" && rand() < softChance) state.grid[y][x] = "soft";
      }
    }

    // Ice patches (higher levels)
    if (level >= 3) {
      for (let i = 0; i < 3 + Math.floor(level / 4); i++) {
        const x = 3 + Math.floor(rand() * (COLS - 6));
        const y = 2 + Math.floor(rand() * (ROWS - 4));
        if (state.grid[y][x] === "floor") state.grid[y][x] = "ice";
      }
    }

    // Hazards
    state.hazards = [];
    if (level >= 2) {
      const n = Math.min(10, 1 + Math.floor(level / 2));
      const floors = floorTiles();
      shuffle(floors, rand);
      for (let i = 0; i < n && i < floors.length; i++) {
        const c = floors[i];
        if (c.x < 8) continue;
        state.hazards.push({ x: c.x, y: c.y, dmg: 1 + Math.floor(level / 8), cd: 0 });
        state.grid[c.y][c.x] = "hazard";
      }
    }

    // Spawn + exit
    const mid = Math.floor(ROWS / 2);
    carveRect(1, mid - 2, 5, mid + 2, "floor");
    state.grid[mid][2] = "spawn";
    carveRect(COLS - 6, mid - 2, COLS - 2, mid + 2, "floor");
    state.grid[mid][COLS - 3] = "exit";
  }

  function makeEnemy(kind, x, y, level, rand) {
    const scale = 1 + (level - 1) * 0.14;
    const base = {
      kind,
      x,
      y,
      hp: 1,
      maxHp: 1,
      damage: 1,
      moveEvery: 0.5,
      cd: rand() * 0.5,
      boss: false,
      friendly: false,
      color: "#ff6b8a",
      name: kind,
      pattern: "chase",
      flash: 0,
    };
    if (kind === "grunt") {
      return {
        ...base,
        hp: 3 * scale,
        maxHp: 3 * scale,
        damage: 1 + Math.floor(level / 6),
        moveEvery: 0.52 - Math.min(0.18, level * 0.008),
        color: "#ff6b8a",
      };
    }
    if (kind === "elite") {
      return {
        ...base,
        hp: 8 * scale,
        maxHp: 8 * scale,
        damage: 2 + Math.floor(level / 5),
        moveEvery: 0.4,
        color: "#ff9f43",
        name: "Elite",
      };
    }
    if (kind === "zig") {
      return {
        ...base,
        hp: 4 * scale,
        maxHp: 4 * scale,
        damage: 1 + Math.floor(level / 7),
        moveEvery: 0.28,
        color: "#fd79a8",
        name: "Zig",
        pattern: "zigzag",
        zig: 1,
      };
    }
    if (kind === "patrol") {
      return {
        ...base,
        hp: 5 * scale,
        maxHp: 5 * scale,
        damage: 1,
        moveEvery: 0.35,
        color: "#fdcb6e",
        name: "Patrol",
        pattern: "patrol",
        dir: rand() > 0.5 ? 1 : -1,
      };
    }
    if (kind === "mini") {
      return {
        ...base,
        boss: true,
        hp: 26 * scale,
        maxHp: 26 * scale,
        damage: 2 + Math.floor(level / 3),
        moveEvery: 0.36,
        color: "#c77dff",
        name: "Hardened Reader",
        pattern: "boss_mini",
        phase: 0,
      };
    }
    // major
    const gen = Math.floor(level / 10);
    const names = ["Protocol Absolute", "Lattice Sovereign", "Checksum Tyrant", "Quiet Devourer", "Version ∞"];
    return {
      ...base,
      boss: true,
      kind: "major",
      hp: 50 * scale + gen * 15,
      maxHp: 50 * scale + gen * 15,
      damage: 3 + gen + Math.floor(level / 5),
      moveEvery: 0.3,
      color: "#ff3d6e",
      name: names[Math.min(names.length - 1, Math.max(0, gen - 1))],
      pattern: "boss_major",
      gen,
      phase: 0,
    };
  }

  function buildLevel(level) {
    const rand = rng((state.runSeed || 1) * 10007 + level * 9973);
    state.bossKind = isBossLevel(level);
    state.exitOpen = false;
    state.enemies = [];
    state.pickups = [];
    state.projectiles = [];
    state.particles = [];
    state.bombs = [];
    state.decoys = [];
    state.awaitingNext = false;
    state.dead = false;
    state.threatsKilledThisLevel = 0;

    buildMaze(level, rand);

    const mid = Math.floor(ROWS / 2);
    state.player.x = 2;
    state.player.y = mid;
    state.player.level = level;

    let floors = floorTiles().filter((c) => Math.abs(c.x - 2) + Math.abs(c.y - mid) >= 6);
    shuffle(floors, rand);

    let enemyCount = Math.min(22, 3 + Math.floor(level * 1.15));
    if (state.bossKind === "mini") enemyCount = Math.max(2, Math.floor(enemyCount * 0.5));
    if (state.bossKind === "major") enemyCount = Math.max(2, Math.floor(enemyCount * 0.35));

    const kinds = ["grunt", "grunt", "grunt"];
    if (level >= 3) kinds.push("zig", "patrol");
    if (level >= 5) kinds.push("elite", "zig");
    if (level >= 8) kinds.push("elite", "patrol");

    for (let i = 0; i < enemyCount && i < floors.length; i++) {
      const c = floors[i];
      const kind = kinds[Math.floor(rand() * kinds.length)];
      state.enemies.push(makeEnemy(kind, c.x, c.y, level, rand));
    }
    if (level >= 4) {
      for (let i = 0; i < Math.min(3, 1 + Math.floor(level / 6)); i++) {
        const c = floors[enemyCount + i];
        if (c) state.enemies.push(makeEnemy("elite", c.x, c.y, level, rand));
      }
    }
    if (state.bossKind === "mini") state.enemies.push(makeEnemy("mini", COLS - 5, mid, level, rand));
    if (state.bossKind === "major") state.enemies.push(makeEnemy("major", COLS - 5, mid, level, rand));

    // Module drops — count scales a bit, **identity is pure random**
    let drops = Math.min(8, 2 + Math.floor(level / 3) + (state.bossKind ? 1 : 0));
    if (state.bossKind === "major") drops += 1;
    floors = floorTiles().filter(
      (c) => !state.enemies.some((e) => e.x === c.x && e.y === c.y) && c.x > 5
    );
    shuffle(floors, rand);
    for (let i = 0; i < drops && i < floors.length; i++) {
      const id = pickPowerId(rand);
      const moving = rand() < 0.28 + Math.min(0.25, level * 0.02);
      state.pickups.push({
        x: floors[i].x,
        y: floors[i].y,
        id,
        moving,
        dir: rand() > 0.5 ? 1 : -1,
        axis: rand() > 0.5 ? "x" : "y",
        cd: rand() * 0.8,
        moveEvery: 0.45 + rand() * 0.4,
      });
    }

    log(`Sector ${level} · ${state.mazeName}${state.bossKind ? " · " + state.bossKind.toUpperCase() + " BOSS" : ""}`, true);

    if (state.bossKind === "mini") {
      showOverlay("ALERT", "Mini-boss sector", "A Hardened Reader patrols the east. Modules are random — decode ??? into RAM.");
    } else if (state.bossKind === "major") {
      showOverlay("CRITICAL", "Major protocol", "Every 10 sectors a new sovereign. Stack Nullify / Apocalypse if luck allows.");
    } else if (level === 1) {
      showOverlay(
        "BOOT",
        "First sector",
        "WASD move · Space/E scan · F bolt · C join · G bomb · B rupture · Esc menu.\n\nUnknown modules are ??? until Memory write."
      );
    }

    updateHud();
    save();
  }

  // ── Entities helpers ──────────────────────────────────────────────────────
  function livingEnemies() {
    return state.enemies.filter((e) => e.hp > 0 && !e.friendly);
  }

  function enemyAt(x, y, opts = {}) {
    return state.enemies.find(
      (e) => e.hp > 0 && e.x === x && e.y === y && (opts.any || !e.friendly) && (!opts.onlyHostile || !e.friendly)
    );
  }

  function walkable(x, y, forEnemy) {
    if (!inBounds(x, y)) return false;
    const t = state.grid[y][x];
    if (t === "wall") return false;
    if (t === "soft") {
      if (forEnemy) return false;
      return !!state.player?.phaseSoft;
    }
    return true;
  }

  function damageEnemy(e, amount, src) {
    if (!e || e.hp <= 0) return;
    if (e.friendly && src !== "betray") return;
    const p = state.player;
    let dmg = amount;
    if (e.boss && p) dmg = amount * (p.bossMult || 1);
    e.hp -= dmg;
    e.flash = 0.15;
    burst(e.x, e.y, e.color);
    if (!e.friendly) state.meta.damageDealt += dmg;
    if (e.hp <= 0) {
      state.threatsKilledThisLevel++;
      log(e.boss ? `Boss down: ${e.name}` : e.friendly ? "Ally lost." : "Threat purged.", true);
      if (!e.friendly) {
        trackKill(e);
        if (src === "hulk") state.meta.hulkKills += 1;
      }
      if (p?.lifesteal) p.hp = Math.min(p.maxHp, p.hp + 1);
      // random drop
      if (!e.friendly && Math.random() < (e.boss ? 0.9 : 0.2)) {
        const id = pickPowerId(Math.random);
        state.pickups.push({
          x: e.x,
          y: e.y,
          id,
          moving: Math.random() < 0.2,
          dir: 1,
          axis: "x",
          cd: 0,
          moveEvery: 0.5,
        });
        log(isKnown(id) ? `Drop ${POWERUPS[id].letter} · ${POWERUPS[id].name}` : "Drop ???");
      }
      if (e.boss) {
        state.pickups.push({
          x: e.x,
          y: Math.min(ROWS - 2, e.y + 1),
          id: pickPowerId(Math.random),
          moving: false,
          dir: 1,
          axis: "y",
          cd: 0,
          moveEvery: 0.5,
        });
      }
      checkClear();
      updateHud();
      syncProgress({ threatsDelta: e.friendly ? 0 : 1 });
    }
  }

  function tryMove(dx, dy) {
    if (state.moveCd > 0 || isBusyUi() || state.dead || state.awaitingNext) return;
    const p = state.player;
    if (dx || dy) p.facing = { dx, dy };

    let nx = p.x + dx;
    let ny = p.y + dy;
    if (!inBounds(nx, ny)) return;

    // Ice slide
    if (state.grid[p.y][p.x] === "ice" || state.grid[ny]?.[nx] === "ice") {
      // allow slide one extra if free
    }

    const t = state.grid[ny][nx];
    if (t === "wall") {
      state.moveCd = p.moveCdBase * 0.4;
      return;
    }
    if (t === "soft" && !p.phaseSoft) {
      state.moveCd = p.moveCdBase * 0.4;
      return;
    }

    const e = enemyAt(nx, ny, { any: true });
    if (e) {
      if (e.friendly) {
        // swap past ally
        e.x = p.x;
        e.y = p.y;
        p.x = nx;
        p.y = ny;
      } else if (p.hulkTime > 0) {
        damageEnemy(e, Math.max(3, p.damage * 1.5), "hulk");
        if (e.hp <= 0) {
          p.x = nx;
          p.y = ny;
        }
        state.moveCd = p.moveCdBase;
      } else if (p.ghostTime > 0 || p.ghostPasses > 0) {
        p.x = nx;
        p.y = ny;
        if (p.ghostPasses > 0) {
          p.ghostPasses--;
          state.meta.ghostPasses += 1;
        }
        state.moveCd = p.moveCdBase * 0.85;
      } else {
        // bump attack
        damageEnemy(e, p.damage * 0.5, "bump");
        state.moveCd = p.moveCdBase;
        return;
      }
    } else {
      p.x = nx;
      p.y = ny;
      state.moveCd = p.moveCdBase;
      // ice slip extra step
      if (state.grid[p.y][p.x] === "ice" && dx + dy !== 0) {
        const sx = p.x + dx;
        const sy = p.y + dy;
        if (walkable(sx, sy, false) && !enemyAt(sx, sy, { any: true })) {
          p.x = sx;
          p.y = sy;
        }
      }
    }

    // hazard
    if (state.grid[p.y][p.x] === "hazard") hurtPlayer(1 + Math.floor(state.level / 10), "hazard");

    collectPickup();
    checkExit();
    updateHud();
  }

  function collectPickup() {
    const p = state.player;
    // magnet
    if (p.magnet) {
      for (const u of state.pickups) {
        if (Math.abs(u.x - p.x) + Math.abs(u.y - p.y) === 1) {
          u.x = p.x;
          u.y = p.y;
        }
      }
    }
    const i = state.pickups.findIndex((u) => u.x === p.x && u.y === p.y);
    if (i < 0) return;
    const u = state.pickups[i];
    state.pickups.splice(i, 1);
    const def = POWERUPS[u.id];
    if (!def) return;
    const first = unlockMemory(u.id);
    def.apply(p);
    p.modules.push(u.id);
    burst(p.x, p.y, def.color);
    trackModuleInstall(def, first);
    if (first) {
      log(`RAM write: ${def.letter} · ${def.name} [${def.rarity}]`, true);
      showOverlay(
        "MEMORY WRITE",
        `${def.letter} · ${def.name}`,
        `Rarity: ${def.rarity}\nShape: ${def.shape}\n\n${def.desc}`
      );
    } else {
      log(`Installed ${def.letter} · ${def.name}`, true);
    }
    updateHud();
    save();
  }

  function checkExit() {
    const p = state.player;
    if (!state.exitOpen || state.grid[p.y][p.x] !== "exit" || state.awaitingNext) return;
    state.awaitingNext = true;
    const lore = LORE[(state.level - 1) % LORE.length];
    const next = state.level + 1;
    showOverlay(
      "SECTOR CLEAR",
      `Level ${state.level} complete`,
      `${lore}\n\nMaze was ${state.mazeName}. Modules persist. Next: ${next}${
        isBossLevel(next) ? " (" + isBossLevel(next) + " boss)" : ""
      }.`,
      () => {
        trackSectorClear(state.level);
        state.level = next;
        state.bestLevel = Math.max(state.bestLevel, state.level);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
        syncProgress({ sectorsClearedDelta: 1 });
        buildLevel(state.level);
      }
    );
  }

  function checkClear() {
    if (livingEnemies().length === 0 && !state.exitOpen) {
      state.exitOpen = true;
      log("All hostiles clear. Exit open (east).", true);
      updateHud();
    }
  }

  function tryBreak() {
    if (isBusyUi() || state.dead) return;
    const p = state.player;
    if (p.breaks <= 0) return log("No rupture charges.");
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [p.facing.dx, p.facing.dy],
    ];
    for (const [dx, dy] of dirs) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (!inBounds(x, y)) continue;
      if (state.grid[y][x] === "soft") {
        state.grid[y][x] = "floor";
        p.breaks--;
        state.meta.wallsBroken += 1;
        saveMetaStats();
        log("Soft wall ruptured.", true);
        burst(x, y, "#ffc857");
        updateHud();
        save();
        return;
      }
    }
    log("No soft wall adjacent.");
  }

  function tryScan() {
    if (state.scanCd > 0 || isBusyUi() || state.dead || state.awaitingNext) return;
    const p = state.player;
    state.scanCd = p.scanCdBase;
    state.scanFlash = 0.28;
    state.meta.scansUsed += 1;
    let hit = false;
    const reach = p.hasSword ? Math.max(p.scanRange, p.swordReach) : p.scanRange;

    if (p.cleave) {
      // wide cone in facing
      for (let d = 1; d <= reach; d++) {
        for (let o = -1; o <= 1; o++) {
          let x = p.x + p.facing.dx * d;
          let y = p.y + p.facing.dy * d;
          if (p.facing.dx !== 0) y += o;
          else x += o;
          const e = enemyAt(x, y);
          if (e) {
            damageEnemy(e, p.damage * (d === 1 ? 1.2 : 1), "scan");
            hit = true;
          }
        }
      }
    } else {
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > reach || (dx === 0 && dy === 0)) continue;
          if (p.hasSword && reach > 1) {
            // prefer facing half-plane
            if (p.facing.dx && Math.sign(dx) !== 0 && Math.sign(dx) !== p.facing.dx) continue;
            if (p.facing.dy && Math.sign(dy) !== 0 && Math.sign(dy) !== p.facing.dy) continue;
          }
          const e = enemyAt(p.x + dx, p.y + dy);
          if (e) {
            damageEnemy(e, p.damage, "scan");
            hit = true;
          }
        }
      }
    }
    if (!hit) log("Scan empty.");
    updateHud();
  }

  function tryShoot() {
    if (isBusyUi() || state.dead) return;
    const p = state.player;
    if (!p.canShoot) return log("No bolt module (find Bolt/Rail/…).");
    if (state.shootCd > 0) return;
    state.shootCd = 0.22;
    const { dx, dy } = p.facing;
    if (!dx && !dy) return;
    state.projectiles.push({
      x: p.x + dx,
      y: p.y + dy,
      dx,
      dy,
      dmg: p.shootDmg,
      life: p.shootRange,
      color: "#ff9f43",
    });
    state.meta.boltsFired += 1;
    saveMetaStats();
    log("Bolt fired.");
  }

  function tryJoinUs() {
    if (isBusyUi() || state.dead) return;
    const p = state.player;
    if (p.joinUs <= 0) return log("No Join-Us charges.");
    // nearest hostile
    let best = null;
    let bestD = 99;
    for (const e of livingEnemies()) {
      if (e.boss) continue;
      const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      if (d < bestD && d <= 4) {
        best = e;
        bestD = d;
      }
    }
    if (!best) return log("No convert target in range.");
    p.joinUs--;
    state.meta.joinsUsed += 1;
    saveMetaStats();
    best.friendly = true;
    best.color = "#55efc4";
    best.name = "Ally";
    best.pattern = "ally";
    log("Join-Us: threat rewritten as ally.", true);
    checkClear();
    updateHud();
  }

  function tryBomb() {
    if (isBusyUi() || state.dead) return;
    const p = state.player;
    if (p.bombs <= 0) return log("No bombs.");
    p.bombs--;
    state.bombs.push({ x: p.x, y: p.y, fuse: 1.1 });
    state.meta.bombsDropped += 1;
    saveMetaStats();
    log("Bomb dropped.");
    updateHud();
  }

  function tryDecoy() {
    if (isBusyUi() || state.dead) return;
    const p = state.player;
    if (p.decoys <= 0) return log("No decoys.");
    p.decoys--;
    state.decoys.push({ x: p.x, y: p.y, life: 8 });
    state.meta.decoysDropped += 1;
    saveMetaStats();
    log("Decoy deployed.");
    updateHud();
  }

  function hurtPlayer(amount, source) {
    if (state.invuln > 0 || state.dead) return;
    const p = state.player;
    if (p.shieldCharges > 0) {
      p.shieldCharges--;
      state.invuln = 0.4;
      log(`Shield absorbed ${source}`);
      updateHud();
      return;
    }
    if (p.ghostTime > 0) {
      state.invuln = 0.2;
      return;
    }
    p.hp -= amount;
    state.meta.damageTaken += amount;
    state.invuln = 0.55;
    burst(p.x, p.y, "#ff6b8a");
    log(`Hit by ${source} (−${amount})`);
    updateHud();
    if (p.hp <= 0) {
      p.hp = 0;
      state.dead = true;
      trackDeath(state.level);
      const { level: alv } = accountProgress();
      showOverlay(
        "SIGNAL LOST",
        "You were overwritten",
        `Sector ${state.level} ended the run.\nCareer best sector: ${state.meta.bestSectorEver}\nAccount LV ${alv} · RAM ${memoryCount()}/${POWER_IDS.length}\n\nRun gear resets — account level & lifetime stats keep growing.`,
        () => {
          state.player = defaultPlayer();
          state.level = 1;
          state.runSeed = (Math.random() * 1e9) | 0;
          buildLevel(1);
        }
      );
      save();
    }
  }

  function updateProjectiles(dt) {
    for (const pr of state.projectiles) {
      pr.life -= dt * 8;
      // step in tile space roughly
      pr._acc = (pr._acc || 0) + dt * 10;
      while (pr._acc >= 1 && pr.life > 0) {
        pr._acc -= 1;
        pr.x += pr.dx;
        pr.y += pr.dy;
        if (!inBounds(pr.x, pr.y) || state.grid[pr.y][pr.x] === "wall") {
          pr.life = 0;
          break;
        }
        if (state.grid[pr.y][pr.x] === "soft") {
          state.grid[pr.y][pr.x] = "floor";
          pr.life = 0;
          break;
        }
        const e = enemyAt(pr.x, pr.y);
        if (e) {
          damageEnemy(e, pr.dmg, "bolt");
          pr.life = 0;
          break;
        }
      }
    }
    state.projectiles = state.projectiles.filter((p) => p.life > 0);
  }

  function updateBombs(dt) {
    for (const b of state.bombs) {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        burst(b.x, b.y, "#fdcb6e");
        for (const e of state.enemies) {
          if (e.hp > 0 && Math.abs(e.x - b.x) <= 1 && Math.abs(e.y - b.y) <= 1) {
            damageEnemy(e, 4 + state.player.damage, "bomb");
          }
        }
        if (Math.abs(state.player.x - b.x) <= 1 && Math.abs(state.player.y - b.y) <= 1) {
          hurtPlayer(2, "bomb");
        }
        // soft walls
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = b.x + dx;
            const y = b.y + dy;
            if (inBounds(x, y) && state.grid[y][x] === "soft") state.grid[y][x] = "floor";
          }
        }
        b.dead = true;
      }
    }
    state.bombs = state.bombs.filter((b) => !b.dead);
  }

  function updatePickups(dt) {
    for (const u of state.pickups) {
      if (!u.moving) continue;
      u.cd = (u.cd || 0) - dt;
      if (u.cd > 0) continue;
      u.cd = u.moveEvery || 0.5;
      const dx = u.axis === "x" ? u.dir : 0;
      const dy = u.axis === "y" ? u.dir : 0;
      const nx = u.x + dx;
      const ny = u.y + dy;
      if (!walkable(nx, ny, true) || enemyAt(nx, ny, { any: true }) || (nx === state.player.x && ny === state.player.y)) {
        u.dir *= -1;
        continue;
      }
      u.x = nx;
      u.y = ny;
    }
  }

  function updateEnemies(dt) {
    if (isBusyUi() || state.dead || state.awaitingNext) return;
    const p = state.player;
    // decoy target
    let tx = p.x;
    let ty = p.y;
    if (state.decoys.length) {
      const d = state.decoys[0];
      tx = d.x;
      ty = d.y;
    }

    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, (e.flash || 0) - dt);
      e.cd -= dt;
      if (e.cd > 0) continue;

      if (e.friendly) {
        e.cd = 0.4;
        // ally chases nearest hostile
        let target = null;
        let best = 99;
        for (const h of livingEnemies()) {
          const d = Math.abs(h.x - e.x) + Math.abs(h.y - e.y);
          if (d < best) {
            best = d;
            target = h;
          }
        }
        if (target && best === 1) {
          damageEnemy(target, 1.5 + state.level * 0.1, "ally");
          continue;
        }
        if (target) {
          const dx = Math.sign(target.x - e.x);
          const dy = Math.sign(target.y - e.y);
          const opts = dx ? [[dx, 0]] : [];
          if (dy) opts.push([0, dy]);
          opts.push([1, 0], [-1, 0], [0, 1], [0, -1]);
          for (const [ox, oy] of opts) {
            const nx = e.x + ox;
            const ny = e.y + oy;
            if (!walkable(nx, ny, true)) continue;
            if (enemyAt(nx, ny, { any: true })) continue;
            if (nx === p.x && ny === p.y) continue;
            e.x = nx;
            e.y = ny;
            break;
          }
        }
        continue;
      }

      e.cd = e.moveEvery;

      if (e.pattern === "patrol") {
        const nx = e.x + (e.dir || 1);
        if (!walkable(nx, e.y, true) || enemyAt(nx, e.y, { any: true })) e.dir *= -1;
        else {
          e.x = nx;
          if (e.x === p.x && e.y === p.y) {
            contactHit(e);
          }
        }
        continue;
      }

      if (e.pattern === "zigzag") {
        const step = e.zig > 0 ? [e.zig, 0] : [0, 1];
        e.zig = e.zig > 0 ? -e.zig : 1;
        let nx = e.x + step[0];
        let ny = e.y + step[1];
        if (!walkable(nx, ny, true)) {
          nx = e.x + Math.sign(tx - e.x);
          ny = e.y;
        }
        if (walkable(nx, ny, true) && !enemyAt(nx, ny, { any: true })) {
          e.x = nx;
          e.y = ny;
        }
        if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 0) contactHit(e);
        else if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) === 1) contactHit(e);
        continue;
      }

      // chase / boss
      const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      if (dist === 1 && !state.decoys.length) {
        contactHit(e);
        // mini boss pulse
        if (e.pattern === "boss_mini" && Math.random() < 0.3) {
          for (const h of livingEnemies()) {
            /* no-op */
          }
        }
        continue;
      }

      // major boss sometimes dashes
      if (e.pattern === "boss_major" && Math.random() < 0.15) {
        e.cd = 0.15;
      }

      const opts = [];
      const dx = Math.sign(tx - e.x);
      const dy = Math.sign(ty - e.y);
      if (dx) opts.push([dx, 0]);
      if (dy) opts.push([0, dy]);
      opts.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [ox, oy] of opts) {
        const nx = e.x + ox;
        const ny = e.y + oy;
        if (!walkable(nx, ny, true)) continue;
        if (enemyAt(nx, ny, { any: true })) continue;
        if (nx === p.x && ny === p.y) {
          contactHit(e);
          break;
        }
        // attack decoy
        const dec = state.decoys.find((d) => d.x === nx && d.y === ny);
        if (dec) {
          dec.life -= 2;
          break;
        }
        e.x = nx;
        e.y = ny;
        break;
      }
    }

    state.decoys = state.decoys.filter((d) => {
      d.life -= dt;
      return d.life > 0;
    });
  }

  function contactHit(e) {
    const p = state.player;
    if (p.thorns) damageEnemy(e, p.thorns, "thorns");
    if (p.hulkTime > 0) {
      damageEnemy(e, p.damage, "hulk");
      return;
    }
    hurtPlayer(e.damage, e.name || e.kind);
  }

  function burst(tx, ty, color) {
    for (let i = 0; i < 7; i++) {
      state.particles.push({
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE / 2,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        life: 0.35,
        color,
      });
    }
  }

  function updateParticles(dt) {
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function tickBuffs(dt) {
    const p = state.player;
    if (!p) return;
    if (p.hulkTime > 0) p.hulkTime = Math.max(0, p.hulkTime - dt);
    if (p.ghostTime > 0) p.ghostTime = Math.max(0, p.ghostTime - dt);
  }

  function handleInput(dt) {
    state.moveCd = Math.max(0, state.moveCd - dt);
    state.scanCd = Math.max(0, state.scanCd - dt);
    state.shootCd = Math.max(0, state.shootCd - dt);
    state.scanFlash = Math.max(0, state.scanFlash - dt);
    state.invuln = Math.max(0, state.invuln - dt);
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0 && els.pauseToast) els.pauseToast.hidden = true;
    }
    tickBuffs(dt);
    if (!state.running || isBusyUi() || state.dead) return;

    let dx = 0;
    let dy = 0;
    if (state.keys.has("arrowleft") || state.keys.has("a")) dx -= 1;
    if (state.keys.has("arrowright") || state.keys.has("d")) dx += 1;
    if (state.keys.has("arrowup") || state.keys.has("w")) dy -= 1;
    if (state.keys.has("arrowdown") || state.keys.has("s")) dy += 1;
    if (dx && dy) {
      if (state.keys.has("a") || state.keys.has("d") || state.keys.has("arrowleft") || state.keys.has("arrowright"))
        dy = 0;
      else dx = 0;
    }
    if (dx || dy) tryMove(dx, dy);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawQrMark(px, py, size, color) {
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = color;
    const u = size / 8;
    ctx.fillRect(px + u, py + u, u * 3, u * 3);
    ctx.fillRect(px + size - u * 4, py + u, u * 3, u * 3);
    ctx.fillRect(px + u, py + size - u * 4, u * 3, u * 3);
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(px + u * 1.5, py + u * 1.5, u * 2, u * 2);
    ctx.fillRect(px + size - u * 3.5, py + u * 1.5, u * 2, u * 2);
    ctx.fillRect(px + u * 1.5, py + size - u * 3.5, u * 2, u * 2);
    ctx.fillStyle = color;
    ctx.fillRect(px + u * 3.5, py + u * 3.5, u, u);
  }

  function drawModuleGlyph(cx, cy, r, def, known) {
    const color = known ? def.color : "#6a6a78";
    const shape = known ? def.shape : "unknown";
    const letter = known ? def.letter : "?";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const shapes = {
      square: () => ctx.rect(-r, -r, r * 2, r * 2),
      diamond: () => {
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
      },
      triangle: () => {
        ctx.moveTo(0, -r);
        ctx.lineTo(r, r * 0.85);
        ctx.lineTo(-r, r * 0.85);
        ctx.closePath();
      },
      hex: () => {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      },
      ring: () => {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      },
      cross: () => {
        const w = r * 0.4;
        ctx.rect(-w, -r, w * 2, r * 2);
        ctx.rect(-r, -w, r * 2, w * 2);
      },
      chevron: () => {
        ctx.moveTo(-r, -r * 0.2);
        ctx.lineTo(0, -r);
        ctx.lineTo(r, -r * 0.2);
        ctx.lineTo(r * 0.5, r);
        ctx.lineTo(0, r * 0.3);
        ctx.lineTo(-r * 0.5, r);
        ctx.closePath();
      },
      burst: () => {
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i;
          const rr = i % 2 === 0 ? r : r * 0.45;
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      },
      bolt: () => {
        ctx.moveTo(-r * 0.2, -r);
        ctx.lineTo(r * 0.4, -r * 0.1);
        ctx.lineTo(0, -r * 0.1);
        ctx.lineTo(r * 0.3, r);
        ctx.lineTo(-r * 0.5, r * 0.15);
        ctx.lineTo(0, r * 0.15);
        ctx.closePath();
      },
      blade: () => {
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.35, r * 0.2);
        ctx.lineTo(r * 0.15, r);
        ctx.lineTo(-r * 0.15, r);
        ctx.lineTo(-r * 0.35, r * 0.2);
        ctx.closePath();
      },
      shield: () => {
        ctx.moveTo(0, -r);
        ctx.lineTo(r, -r * 0.3);
        ctx.lineTo(r * 0.75, r * 0.5);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.75, r * 0.5);
        ctx.lineTo(-r, -r * 0.3);
        ctx.closePath();
      },
      dot: () => ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2),
      unknown: () => ctx.rect(-r, -r, r * 2, r * 2),
    };
    (shapes[shape] || shapes.unknown)();
    if (shape === "ring") ctx.stroke();
    else ctx.fill();
    ctx.fillStyle = known ? "#0a0a0c" : "#c8c8d0";
    if (shape === "ring") ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, Math.floor(r))}px IBM Plex Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 0, 0.5);
    ctx.restore();
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, w, h);
    if (!state.player) return;

    const camX = state.player.x * TILE + TILE / 2 - w / 2;
    const camY = state.player.y * TILE + TILE / 2 - h / 2;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const sx = x * TILE - camX;
        const sy = y * TILE - camY;
        if (sx < -TILE || sy < -TILE || sx > w || sy > h) continue;
        const t = state.grid[y]?.[x];
        if (t === "wall") {
          ctx.fillStyle = "#1a1a22";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = "#0e0e12";
          ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        } else if (t === "soft") {
          ctx.fillStyle = "#2a2218";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.strokeStyle = "rgba(255,200,87,0.4)";
          ctx.strokeRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        } else if (t === "hazard") {
          ctx.fillStyle = "#1a0808";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = `rgba(255,60,80,${0.35 + 0.25 * Math.sin(performance.now() / 200)})`;
          ctx.fillRect(sx + 6, sy + 6, 12, 12);
        } else if (t === "ice") {
          ctx.fillStyle = "#0a1520";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.strokeStyle = "rgba(120,200,255,0.25)";
          ctx.strokeRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        } else if (t === "exit") {
          ctx.fillStyle = state.exitOpen ? "#0c1a14" : "#121018";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.strokeStyle = state.exitOpen
            ? `rgba(124,255,178,${0.4 + 0.4 * Math.sin(performance.now() / 300)})`
            : "rgba(100,100,120,0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#0a0a0e" : "#0c0c10";
          ctx.fillRect(sx, sy, TILE, TILE);
        }
      }
    }

    for (const d of state.decoys) {
      const sx = d.x * TILE - camX + 4;
      const sy = d.y * TILE - camY + 4;
      ctx.globalAlpha = 0.6;
      drawQrMark(sx, sy, TILE - 8, "#b2bec3");
      ctx.globalAlpha = 1;
    }

    for (const b of state.bombs) {
      const sx = b.x * TILE - camX + TILE / 2;
      const sy = b.y * TILE - camY + TILE / 2;
      ctx.fillStyle = b.fuse < 0.3 ? "#ff3d00" : "#fdcb6e";
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const u of state.pickups) {
      const def = POWERUPS[u.id];
      if (!def) continue;
      const cx = u.x * TILE - camX + TILE / 2;
      const cy = u.y * TILE - camY + TILE / 2;
      ctx.globalAlpha = 0.9;
      drawModuleGlyph(cx, cy, u.moving ? 10 : 11, def, isKnown(u.id));
      ctx.globalAlpha = 1;
      if (u.moving) {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.strokeRect(cx - 12, cy - 12, 24, 24);
      }
    }

    for (const pr of state.projectiles) {
      const sx = pr.x * TILE - camX + TILE / 2;
      const sy = pr.y * TILE - camY + TILE / 2;
      ctx.fillStyle = pr.color;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }

    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const sx = e.x * TILE - camX;
      const sy = e.y * TILE - camY;
      const size = e.boss ? TILE - 2 : TILE - 6;
      const ox = e.boss ? 1 : 3;
      const col = e.flash > 0 ? "#fff" : e.color;
      drawQrMark(sx + ox, sy + ox, size, col);
      if (e.boss) {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, TILE, TILE);
        ctx.lineWidth = 1;
      }
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "#000";
      ctx.fillRect(sx + 2, sy - 4, TILE - 4, 3);
      ctx.fillStyle = e.friendly ? "#55efc4" : e.boss ? "#c77dff" : "#ff6b8a";
      ctx.fillRect(sx + 2, sy - 4, (TILE - 4) * pct, 3);
    }

    const p = state.player;
    const ppx = p.x * TILE - camX;
    const ppy = p.y * TILE - camY;
    const blink = state.invuln > 0 && Math.floor(performance.now() / 60) % 2 === 0;
    let pcol = "#7cffb2";
    if (p.hulkTime > 0) pcol = "#00e676";
    else if (p.ghostTime > 0) pcol = "#dfe6e9";
    else if (p.superSpeed) pcol = "#18ffff";
    if (!blink) {
      ctx.globalAlpha = p.ghostTime > 0 ? 0.55 : 1;
      drawQrMark(ppx + 2, ppy + 2, TILE - 4, pcol);
      ctx.globalAlpha = 1;
    }
    // facing notch
    ctx.fillStyle = "#fff";
    ctx.fillRect(
      ppx + TILE / 2 + p.facing.dx * 8 - 2,
      ppy + TILE / 2 + p.facing.dy * 8 - 2,
      4,
      4
    );
    if (state.scanFlash > 0) {
      ctx.strokeStyle = `rgba(124,255,178,${state.scanFlash * 2})`;
      ctx.beginPath();
      ctx.arc(ppx + TILE / 2, ppy + TILE / 2, 16 + p.scanRange * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 3);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - camX - 2, pt.y - camY - 2, 4, 4);
      ctx.globalAlpha = 1;
    }

    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(8, 8, 220, 36);
    ctx.fillStyle = "#7cffb2";
    ctx.font = "600 12px IBM Plex Mono, monospace";
    ctx.fillText(`SECTOR ${state.level} · ${state.mazeName}`, 16, 24);
    ctx.fillStyle = "#8b8b9a";
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.fillText(
      `RAM ${memoryCount()}/${POWER_IDS.length} · ACC LV ${state.meta.accountLevel}`,
      16,
      38
    );
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      handleInput(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      updateBombs(dt);
      updatePickups(dt);
      updateParticles(dt);
      if (Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) updateHud();
    }
    draw();
    requestAnimationFrame(loop);
  }

  function start() {
    closePause(false);
    hideWelcome();
    if (els.title) els.title.hidden = true;
    if (els.overlay) els.overlay.hidden = true;
    state.onContinue = null;
    state.running = true;
    state.dead = false;
    state.player = defaultPlayer();
    state.level = 1;
    state.runSeed = (Math.random() * 1e9) | 0;
    state.log = [];
    renderLog();
    log("Boot… identity = QR?");
    log(`Account LV ${state.meta.accountLevel} bonuses applied.`);
    log("Space scan · F bolt · C join · G bomb · B break · Esc pause");
    trackRunStart();
    buildLevel(1);
    syncProgress({ runStarted: true, bestSector: 1 });
    syncModalOpenClass();
  }

  function openStatsFromTitle() {
    if (els.title) els.title.hidden = true;
    state.running = false;
    state.paused = true;
    els.pause.hidden = false;
    setPauseView("stats");
    syncModalOpenClass();
  }

  function openAccountFromTitle() {
    if (els.title) els.title.hidden = true;
    state.running = false;
    state.paused = true;
    els.pause.hidden = false;
    setPauseView("account");
    syncModalOpenClass();
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const isContinue = k === " " || k === "enter" || e.code === "Space" || e.code === "Enter";
    state.keys.add(k);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter"].includes(k)) e.preventDefault();

    if (els.welcome && !els.welcome.hidden) {
      if (k === "escape") {
        e.preventDefault();
        try {
          localStorage.setItem(WELCOME_SKIP_KEY, "1");
        } catch (_) {}
        goToTitleFromWelcome();
      }
      return;
    }
    if (state.paused) {
      if (k === "escape") {
        e.preventDefault();
        if (state.pauseView !== "main") setPauseView("main");
        else closePause(true);
      }
      return;
    }
    if (els.overlay && !els.overlay.hidden) {
      if (isContinue || k === "escape" || k === "e") {
        e.preventDefault();
        hideOverlay();
      }
      return;
    }
    if (!state.running) {
      if (isContinue && els.title && !els.title.hidden) {
        e.preventDefault();
        start();
      }
      return;
    }
    if (k === "escape") {
      e.preventDefault();
      openPause();
      return;
    }
    if (k === " " || k === "e") {
      e.preventDefault();
      tryScan();
    }
    if (k === "f") {
      e.preventDefault();
      tryShoot();
    }
    if (k === "b") {
      e.preventDefault();
      tryBreak();
    }
    if (k === "c") {
      e.preventDefault();
      tryJoinUs();
    }
    if (k === "g") {
      e.preventDefault();
      tryBomb();
    }
    if (k === "v") {
      e.preventDefault();
      tryDecoy();
    }
  });
  window.addEventListener("keyup", (e) => state.keys.delete(e.key.toLowerCase()));

  els.btnStart.addEventListener("click", start);
  els.btnLoadTitle?.addEventListener("click", () => {
    const res = loadGame();
    if (!res.ok) log(res.msg);
  });
  els.overlayOk.addEventListener("click", hideOverlay);
  els.pause?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pause-action]");
    if (btn) handlePauseAction(btn.getAttribute("data-pause-action"));
  });

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!state.running || isBusyUi() || state.dead) return;
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const ty = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const dx = tx - cx;
      const dy = ty - cy;
      if (Math.hypot(dx, dy) < 40) {
        tryScan();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
      else tryMove(0, dy > 0 ? 1 : -1);
    },
    { passive: true }
  );

  async function wireAccountUi() {
    const o = online();

    els.accountSignin?.addEventListener("click", async () => {
      try {
        setAccountMsg("Signing in…");
        await o.signInWithEmail(els.accountEmail?.value?.trim(), els.accountPass?.value || "");
        setAccountMsg("Signed in. Tap Back / Close anytime.");
        renderPauseAccount();
      } catch (err) {
        setAccountMsg(err.message || "Sign-in failed");
      }
    });
    els.accountSignup?.addEventListener("click", async () => {
      try {
        setAccountMsg("Creating…");
        await o.signUpWithEmail(
          els.accountEmail?.value?.trim(),
          els.accountPass?.value || "",
          els.accountName?.value?.trim() || "Signal"
        );
        setAccountMsg("Account created. Tap Back / Close to continue.");
        renderPauseAccount();
      } catch (err) {
        setAccountMsg(err.message || "Sign-up failed");
      }
    });
    els.accountGuest?.addEventListener("click", async () => {
      try {
        setAccountMsg("Guest…");
        await o.signInGuest();
        setAccountMsg("Guest ready. Tap Back / Close.");
        renderPauseAccount();
      } catch (err) {
        setAccountMsg(err.message || "Guest failed");
      }
    });
    els.accountSignout?.addEventListener("click", async () => {
      await o.signOut();
      setAccountMsg("Signed out.");
      renderPauseAccount();
    });

    // Welcome soft-gate
    els.welcomePlay?.addEventListener("click", () => {
      try {
        localStorage.setItem(WELCOME_SKIP_KEY, "1");
      } catch (_) {}
      goToTitleFromWelcome();
    });
    els.welcomeGuest?.addEventListener("click", async () => {
      try {
        setWelcomeMsg("Starting guest…");
        if (o) await o.signInGuest();
        try {
          localStorage.setItem(WELCOME_SKIP_KEY, "1");
        } catch (_) {}
        goToTitleFromWelcome();
      } catch (err) {
        setWelcomeMsg(err.message || "Guest failed — you can still play without account.");
      }
    });
    els.welcomeCreate?.addEventListener("click", async () => {
      try {
        setWelcomeMsg("Creating account…");
        if (!o) throw new Error("Cloud offline");
        await o.signUpWithEmail(
          els.welcomeEmail?.value?.trim(),
          els.welcomePass?.value || "",
          els.welcomeName?.value?.trim() || "Signal"
        );
        setWelcomeMsg("Account created — continuing…");
        try {
          localStorage.setItem(WELCOME_SKIP_KEY, "1");
        } catch (_) {}
        goToTitleFromWelcome();
      } catch (err) {
        setWelcomeMsg(err.message || "Create failed");
      }
    });
    els.welcomeSignin?.addEventListener("click", async () => {
      try {
        setWelcomeMsg("Signing in…");
        if (!o) throw new Error("Cloud offline");
        await o.signInWithEmail(els.welcomeEmail?.value?.trim(), els.welcomePass?.value || "");
        setWelcomeMsg("Signed in — continuing…");
        try {
          localStorage.setItem(WELCOME_SKIP_KEY, "1");
        } catch (_) {}
        goToTitleFromWelcome();
      } catch (err) {
        setWelcomeMsg(err.message || "Sign-in failed");
      }
    });

    window.addEventListener("qr-auth", () => {
      if (state.paused && state.pauseView === "account") renderPauseAccount();
    });

    if (o) await o.init();

    // First paint: soft account page or title
    if (shouldShowWelcome()) {
      showWelcome();
    } else {
      hideWelcome();
      if (els.title) els.title.hidden = false;
    }
    syncModalOpenClass();
  }

  // Patch controls text if present
  const controlsView = document.getElementById("pause-view-controls");
  if (controlsView) {
    const ul = controlsView.querySelector(".pause-list");
    if (ul) {
      ul.innerHTML = `
        <li><kbd>WASD</kbd> — move (face direction)</li>
        <li><kbd>Space</kbd> / <kbd>E</kbd> — scan / sword</li>
        <li><kbd>F</kbd> — bolt (needs Bolt/Rail module)</li>
        <li><kbd>C</kbd> — Join-Us convert</li>
        <li><kbd>G</kbd> — drop bomb · <kbd>V</kbd> decoy</li>
        <li><kbd>B</kbd> — rupture soft wall</li>
        <li><kbd>Esc</kbd> — pause / Memory / save</li>
        <li>Modules on floor may <strong>move</strong>. ??? until RAM decode.</li>`;
    }
  }

  const titleHint = document.querySelector(".title-inner .hint");
  if (titleHint) {
    titleHint.textContent = "WASD · Space scan · F bolt · C join · G bomb · Esc pause · random modules";
  }

  loadMemory();
  loadMetaStats();
  loadMeta();
  refreshTitleLoadBtn();
  refreshTitleMeta();
  els.btnStatsTitle?.addEventListener("click", openStatsFromTitle);
  els.btnAccountTitle?.addEventListener("click", openAccountFromTitle);
  // Title hidden until welcome resolves
  if (els.title) els.title.hidden = true;
  wireAccountUi();
  requestAnimationFrame(loop);
})();
