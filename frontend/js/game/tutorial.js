import { state, resetGlitchState } from "../state.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import { applyCharacterToPlayer } from "../characters/manager.js";
import { initSkills } from "./skills.js";
import {
  clearBossArenaVisual,
  setupBossArenaVisual,
} from "../world/bossArenaVisual.js";
import { createBoss } from "../entities/bosses/boss_manager.js";

const TUTORIAL_DONE_KEY = "bongma_tutorial_complete_v1";
const TUTORIAL_CHARACTER_ID = "speedster";
const MOVE_DISTANCE_TARGET = 260;
const TRAINING_KILL_TARGET = 4;

function cloneJson(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function captureMenuSnapshot() {
  return {
    player: cloneJson(state.player),
    currentLevel: state.currentLevel,
    selectedCharacter: state.selectedCharacter,
    selectedMap: state.selectedMap,
    gameMode: state.gameMode,
    pastRuns: cloneJson(state.pastRuns),
    currentRunRecord: cloneJson(state.currentRunRecord),
    bossArenaMode: !!state.bossArenaMode,
    bossArenaType: state.bossArenaType || null,
    echo: cloneJson(state.echo),
    echoGraves: cloneJson(state.echoGraves),
    tower: cloneJson(state.tower),
  };
}

function resetTutorialRuntime() {
  state.frameCount = 0;
  state.scoreTime = 0;
  state.currentLevel = 1;
  state.maxFramesToSurvive = 0;
  state.isBossLevel = false;
  state.pendingBossType = null;
  state.currentBossType = null;
  state.bossArenaMode = false;
  state.bossArenaType = null;

  state.boss = null;
  state.bullets = [];
  state.particles = [];
  state.ghosts = [];
  state.painterTrails = [];
  state.painterZones = [];
  state.painterDrawing = false;
  state.painterDrawTime = 0;
  state.pastRuns = [];
  state.currentRunRecord = [];
  state.delayedTasks = [];
  state.activeBuffs = { q: 0, e: 0, r: 0 };
  state.phoenixTrails = [];
  state.phoenixEfx = null;
  state.phoenixReviveReady = false;
  state.necroMinions = [];
  state.necroZone = null;
  state.necroExplosions = [];
  state.voidBlackholes = [];
  state.voidLaser = null;
  state.stormTraps = [];
  state.stormLightnings = [];
  state.explosions = [];
  state.druidOrbs = [];
  state.phantoms = [];
  state.painterBomb = null;
  state.painterExplosions = [];
  state.hunterTraps = [];
  state.engineerTurrets = [];
  state.gunnerMines = [];
  state.gunnerAirstrikes = [];
  state.gunnerLaser = null;
  state.reaperSlash = null;
  state.destroyerRifts = [];
  state.destroyerUlt = null;
  state.creatorTurrets = [];
  state.creatorHolyZone = null;
  state.creatorOrbs = [];
  state.creatorDeathSave = false;
  state.knightCharge = null;
  state.knightShield = null;
  state.knightRage = null;
  state.isScoutQ = false;
  state.hazards = [];
  state.floatingTexts = [];
  state.damageNumbers = [];
  state.safeZones = [];
  state.bossBeams = [];
  state.groundWarnings = [];
  state.globalHazard = {
    type: null,
    active: false,
    timer: 0,
    damage: 0,
  };
  state.screenShake = { x: 0, y: 0, timer: 0, intensity: 0 };
  state.phaseTransitionTimer = 0;
  state.bossCutscene = null;
  state.bossArenaVisual = null;
  state.bossSpecial = {
    name: "",
    type: "NORMAL",
    timer: 0,
    duration: 0,
    color: "#fff",
  };
  state.bossSpecialCD = 0;
  state.rerollCount = 0;
  state.element = "fire";
  state.swarmZones = [];
  state.crates = [];
  state.capturePoints = [];
  state.permanentScars = [];
  state.satelliteDrone = null;
  state.godMode = { active: false, timer: 0 };
  state.items = [];
  state.puzzleZone = null;
  state.currentPuzzle = null;
  state.currentPuzzleType = null;
  state.stagePortal = null;
  state.currentMapTheme = null;
  state.mapThemeData = null;
  state.elementalZones = [];
  state.elementalEnemies = [];
  state.dungeon = null;
  state.healStations = [];
  state.dungeonUpgradePedestals = [];
  state.storySigns = [];
  state.storyLog = [];
  state.storyToast = null;
  state.echo = null;
  state.echoGraves = [];
  state.tower = null;
  state.isMultiplayer = false;
  state.isHost = false;
  state.mpRoomCode = null;
  state.mpPlayerCount = 1;
  state.remotePlayers = [];
  state.remoteBullets = [];
  state.reviveZones = [];
  state._mpBossKilledSent = false;
  state._bossKilled = false;
  state.nukeFlash = 0;
  state.glitch.fakeUI = false;
  state.playerStatus = {
    slow: 1,
    slowTimer: 0,
    stunTimer: 0,
    burnTimer: 0,
    lastHazardDamageTime: 0,
  };
  state.windForce = { x: 0, y: 0, timer: 0 };
  state.cinematicEffects = {
    fogAlpha: 0,
    distortion: 0,
    vortexPower: 0,
    vortexCenter: { x: 400, y: 300 },
    freezeTimer: 0,
    fieldBurn: 0,
  };
  state.mapMechanic = {
    theme: null,
    element: null,
    meter: 0,
    meterMax: 240,
    eventTimer: 300,
    eruptTimer: 360,
    objectiveProgress: 0,
    objectiveTarget: 3,
    lastX: 0,
    lastY: 0,
    inertiaX: 0,
    inertiaY: 0,
    windAngle: 0,
    strikes: [],
  };
  state.keys = {};
  state.prevKeys = {};
  state.mouse = {
    x: 0,
    y: 0,
    screenX: 0,
    screenY: 0,
    clicked: false,
    isDown: false,
  };
  resetGlitchState();
  clearBossArenaVisual();
}

function getActiveTutorialStep(tutorial) {
  const steps = getTutorialSteps(tutorial);
  return steps[tutorial.stepIndex] || steps[steps.length - 1];
}

function getTutorialSteps(tutorial) {
  const moveProgress = Math.min(
    100,
    Math.round((tutorial.moveDistance / MOVE_DISTANCE_TARGET) * 100),
  );
  return [
    {
      title: "Di chuyen",
      detail: "WASD hoac phim mui ten",
      status: tutorial.completedSteps[0]
        ? "done"
        : tutorial.stepIndex === 0
          ? "active"
          : "pending",
      progress: `${moveProgress}%`,
    },
    {
      title: "Dash",
      detail: "Nhan Space de lot",
      status: tutorial.completedSteps[1]
        ? "done"
        : tutorial.stepIndex === 1
          ? "active"
          : "pending",
      progress: tutorial.completedSteps[1] ? "Xong" : "Space",
    },
    {
      title: "Tap ban quai",
      detail: "Giu chuot trai de tan cong",
      status: tutorial.completedSteps[2]
        ? "done"
        : tutorial.stepIndex === 2
          ? "active"
          : "pending",
      progress: `${tutorial.kills}/${TRAINING_KILL_TARGET}`,
    },
    {
      title: "Dung ky nang",
      detail: "Nhan Q hoac E de kich hoat skill",
      status: tutorial.completedSteps[3]
        ? "done"
        : tutorial.stepIndex === 3
          ? "active"
          : "pending",
      progress: tutorial.completedSteps[3] ? "Xong" : "Q / E",
    },
    {
      title: "Boss cuoi bai",
      detail: "Né telegraph do va ha guc Hoa Vuong",
      status: tutorial.completedSteps[4]
        ? "done"
        : tutorial.stepIndex >= 4
          ? "active"
          : "pending",
      progress: tutorial.completedSteps[4]
        ? "Hoan thanh"
        : tutorial.bossSpawned
          ? "Dang giao chien"
          : "Cho kich hoat",
    },
  ];
}

function announce(text, color = "#00ffcc") {
  if (!state.floatingTexts || !state.player) return;
  state.floatingTexts.push({
    x: state.player.x,
    y: state.player.y - 110,
    text,
    color,
    size: 24,
    life: 140,
    opacity: 1,
  });
}

function updateTutorialLabels(tutorial) {
  const current = getActiveTutorialStep(tutorial);
  UI.level.innerText = "Che do: Tutorial";
  UI.timer.innerText = state.boss ? "Boss Tutorial" : `Buoc ${tutorial.stepIndex + 1}/5`;
  UI.ghosts.innerText = current
    ? `Muc tieu: ${current.title} (${current.progress})`
    : "Muc tieu: Hoan thanh tutorial";
}

function completeStep(index, text, color = "#00ffcc") {
  const tutorial = state.tutorial;
  if (!tutorial || tutorial.completedSteps[index]) return;
  tutorial.completedSteps[index] = true;
  tutorial.stepIndex = Math.max(tutorial.stepIndex, index + 1);
  tutorial.stepPulse = 36;
  announce(text, color);
}

function spawnTrainingWave() {
  const tutorial = state.tutorial;
  if (!tutorial || tutorial.trainingSpawned) return;

  tutorial.trainingSpawned = true;
  state.ghosts = [];
  state.bullets = state.bullets.filter((b) => b.isPlayer);

  const px = state.player?.x || state.world.width / 2;
  const py = state.player?.y || state.world.height / 2;
  const points = [
    { x: px + 180, y: py - 120 },
    { x: px - 170, y: py - 160 },
    { x: px + 220, y: py + 60 },
    { x: px - 200, y: py + 100 },
  ];

  points.forEach((pt, index) => {
    state.ghosts.push({
      id: `tutorial_enemy_${Date.now()}_${index}`,
      x: pt.x,
      y: pt.y,
      radius: 15,
      hp: 3,
      maxHp: 3,
      speed: 1.2,
      speedRate: 1,
      isHorde: true,
      tutorialEnemy: true,
      bounty: 5,
      xpValue: 8,
      timer: 0,
      isStunned: 0,
      historyPath: [],
    });
  });

  announce("4 bong ma huan luyen da xuat hien!", "#ffd080");
}

function spawnTutorialBoss() {
  const tutorial = state.tutorial;
  if (!tutorial || tutorial.bossSpawned) return;

  tutorial.bossSpawned = true;
  state.isBossLevel = true;
  state.ghosts = [];
  state.bullets = [];
  state.hazards = [];
  state.groundWarnings = [];
  state.safeZones = [];
  state.globalHazard.active = false;

  const cx = state.world.width / 2;
  const cy = state.world.height / 2;
  setupBossArenaVisual("fire", cx, cy, { maxRadius: 430 });

  if (state.player) {
    state.player.x = cx;
    state.player.y = cy + 170;
    state.player.gracePeriod = 90;
    state.player.dashTimeLeft = 0;
    state.player.dashCooldownTimer = 0;
  }

  const boss = createBoss("fire");
  boss.name = "Hoa Vuong Mo Phong";
  boss.icon = "F";
  boss.maxHp = 220;
  boss.hp = 220;
  boss.speed = 1.35;
  boss.skillCooldown = 150;
  boss.summonCooldown = 999999;
  boss.ghostsActive = false;
  boss.isTutorialBoss = true;
  boss.phases = [
    {
      attackModes: [0],
      special: ["Inferno Pulse"],
      speedMult: 0.85,
    },
    {
      attackModes: [0, 1],
      special: ["Inferno Pulse"],
      speedMult: 1,
    },
    {
      attackModes: [0, 1],
      special: ["Inferno Pulse", "Flame Pillar"],
      speedMult: 1.08,
    },
  ];
  boss.x = cx;
  boss.y = cy - 150;
  boss.moveTargetX = cx;
  boss.moveTargetY = cy - 50;

  state.boss = boss;
  state.currentBossType = "fire";

  UI.bossUi.style.display = "block";
  UI.bossName.innerText = boss.name;
  UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";
  const bossIconEl = document.getElementById("boss-icon");
  if (bossIconEl) bossIconEl.textContent = boss.icon;

  announce("Boss tutorial bat dau! Dash de ne va tan cong lien tuc!", "#ff9b55");
}

function hasUsedTutorialSkill() {
  const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
  const cds = state.skillsCD || { q: 0, e: 0, r: 0 };
  return cds.q > 0 || cds.e > 0 || buffs.q > 0 || buffs.e > 0;
}

export function hasCompletedTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

export function isTutorialMode() {
  return state.gameMode === "tutorial" && !!state.tutorial?.active;
}

export function startTutorialRun(changeStateFn) {
  const snapshot = cloneJson(state.tutorial?.snapshot) || captureMenuSnapshot();

  resetTutorialRuntime();
  state.gameMode = "tutorial";
  state.selectedMap = "fire";
  state.player = applyCharacterToPlayer(TUTORIAL_CHARACTER_ID);
  state.player.coins = 0;
  state.player.experience = 0;
  state.player.experienceToLevel = 100;
  state.player.x = state.world.width / 2;
  state.player.y = state.world.height / 2 + 90;
  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;
  state.player.dashCooldownTimer = 0;
  state.camera.x = Math.max(0, state.player.x - state.camera.width / 2);
  state.camera.y = Math.max(0, state.player.y - state.camera.height / 2);
  state.upgrades = {
    cdr: 0,
    fire: 0,
    multi: 1,
    bounce: 0,
    dash: 0,
    regen: 0,
    hp_up: 0,
    shield_up: 0,
  };
  state.evolutions = {
    cdr: false,
    fire: false,
    multi: false,
    bounce: false,
    dash: false,
    regen: false,
    hp_up: false,
    shield_up: false,
  };
  state.evolutionReady = null;
  initSkills();
  updateHealthUI();
  updateXPUI();

  state.tutorial = {
    active: true,
    snapshot,
    stepIndex: 0,
    moveDistance: 0,
    lastPlayerX: state.player.x,
    lastPlayerY: state.player.y,
    kills: 0,
    trainingSpawned: false,
    bossSpawned: false,
    completedSteps: [false, false, false, false, false],
    stepPulse: 0,
  };

  UI.bossUi.style.display = "none";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";
  updateTutorialLabels(state.tutorial);
  changeStateFn("PLAYING");
}

export function registerTutorialEnemyKill() {
  const tutorial = state.tutorial;
  if (!isTutorialMode() || !tutorial) return;
  tutorial.kills = Math.min(TRAINING_KILL_TARGET, tutorial.kills + 1);
}

export function updateTutorial() {
  const tutorial = state.tutorial;
  if (!isTutorialMode() || !tutorial || !state.player) return;

  const dx = state.player.x - tutorial.lastPlayerX;
  const dy = state.player.y - tutorial.lastPlayerY;
  tutorial.moveDistance += Math.hypot(dx, dy);
  tutorial.lastPlayerX = state.player.x;
  tutorial.lastPlayerY = state.player.y;

  if (tutorial.stepPulse > 0) tutorial.stepPulse--;

  if (!tutorial.completedSteps[0] && tutorial.moveDistance >= MOVE_DISTANCE_TARGET) {
    completeStep(0, "Tot. Ban da lam quen di chuyen.");
  }

  if (
    tutorial.stepIndex >= 1 &&
    !tutorial.completedSteps[1] &&
    state.player.dashCooldownTimer > 0
  ) {
    completeStep(1, "Dash thanh cong. Dung lot de ne dan boss.");
  }

  if (tutorial.stepIndex >= 2 && !tutorial.trainingSpawned) {
    spawnTrainingWave();
  }

  if (
    tutorial.stepIndex >= 2 &&
    !tutorial.completedSteps[2] &&
    tutorial.kills >= TRAINING_KILL_TARGET
  ) {
    completeStep(2, "Dich da bi quet sach. Ban da biet cach diet quai.");
  }

  if (
    tutorial.stepIndex >= 3 &&
    !tutorial.completedSteps[3] &&
    hasUsedTutorialSkill()
  ) {
    completeStep(3, "Skill da kich hoat. Gio den luc doi dau boss.");
  }

  if (tutorial.stepIndex >= 4 && !tutorial.bossSpawned) {
    spawnTutorialBoss();
  }

  updateTutorialLabels(tutorial);
}

export function restoreTutorialMenuState() {
  const snapshot = state.tutorial?.snapshot;

  clearBossArenaVisual();
  state.boss = null;
  state.ghosts = [];
  state.bullets = [];
  state.hazards = [];
  state.groundWarnings = [];
  state.safeZones = [];
  state.globalHazard.active = false;
  state.isBossLevel = false;
  state.currentBossType = null;
  state.gameMode = snapshot?.gameMode || "campaign";
  state.bossArenaMode = snapshot?.bossArenaMode || false;
  state.bossArenaType = snapshot?.bossArenaType || null;
  state.echo = cloneJson(snapshot?.echo) || null;
  state.echoGraves = cloneJson(snapshot?.echoGraves) || [];
  state.tower = cloneJson(snapshot?.tower) || null;
  state.player = cloneJson(snapshot?.player) || null;
  state.currentLevel = snapshot?.currentLevel || 1;
  state.selectedCharacter = snapshot?.selectedCharacter || state.selectedCharacter;
  state.selectedMap = snapshot?.selectedMap || state.selectedMap;
  state.pastRuns = cloneJson(snapshot?.pastRuns) || [];
  state.currentRunRecord = cloneJson(snapshot?.currentRunRecord) || [];
  state.tutorial = null;

  UI.bossUi.style.display = "none";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";
}

export function finishTutorialRun({ changeStateFn, replayTutorial }) {
  if (!isTutorialMode()) return false;

  if (state.tutorial) {
    state.tutorial.completedSteps[4] = true;
  }

  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch (_) {}

  restoreTutorialMenuState();
  changeStateFn("MENU");

  const overlay = document.getElementById("screen-tutorial-complete");
  const replayBtn = document.getElementById("btn-tutorial-replay");
  const menuBtn = document.getElementById("btn-tutorial-menu");

  if (overlay) overlay.classList.remove("hidden");
  if (replayBtn) {
    replayBtn.onclick = () => {
      overlay?.classList.add("hidden");
      replayTutorial?.();
    };
  }
  if (menuBtn) {
    menuBtn.onclick = () => {
      overlay?.classList.add("hidden");
    };
  }

  return true;
}

export function drawTutorialOverlay(ctx, canvas) {
  if (!isTutorialMode() || !state.tutorial) return;

  const tutorial = state.tutorial;
  const steps = getTutorialSteps(tutorial);
  const current = getActiveTutorialStep(tutorial);
  const panelW = 360;
  const panelH = 252;
  const panelX = 20;
  const panelY = 110;
  const pulse = tutorial.stepPulse > 0 ? tutorial.stepPulse / 36 : 0;

  ctx.save();
  ctx.fillStyle = `rgba(8, 14, 22, ${0.92 - pulse * 0.08})`;
  ctx.strokeStyle = pulse > 0 ? "#7dffd8" : "rgba(0,255,204,0.28)";
  ctx.lineWidth = 1.5;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 14);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeRect(panelX, panelY, panelW, panelH);
  }

  ctx.fillStyle = "rgba(0,255,204,0.12)";
  ctx.fillRect(panelX + 1, panelY + 1, panelW - 2, 34);

  ctx.font = "bold 14px Orbitron, sans-serif";
  ctx.fillStyle = "#00ffcc";
  ctx.textAlign = "left";
  ctx.fillText("TUTORIAL", panelX + 16, panelY + 22);

  ctx.font = "12px Rajdhani, sans-serif";
  ctx.fillStyle = "#9ac8c0";
  ctx.fillText("Lam quen dieu khien va tran boss cuoi", panelX + 16, panelY + 48);

  let y = panelY + 74;
  steps.forEach((step, index) => {
    const isDone = step.status === "done";
    const isActive = step.status === "active";
    ctx.fillStyle = isDone ? "#19ff9c" : isActive ? "#ffd080" : "#60717e";
    ctx.beginPath();
    ctx.arc(panelX + 22, y - 5, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#081015";
    ctx.font = "bold 10px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isDone ? "V" : `${index + 1}`, panelX + 22, y - 1.5);

    ctx.textAlign = "left";
    ctx.font = isActive
      ? "bold 14px Rajdhani, sans-serif"
      : "600 13px Rajdhani, sans-serif";
    ctx.fillStyle = isDone ? "#f2fff9" : isActive ? "#fff2c7" : "#b0bcc7";
    ctx.fillText(step.title, panelX + 38, y);

    ctx.font = "12px Rajdhani, sans-serif";
    ctx.fillStyle = isActive ? "#ffd080" : "#8f9ca7";
    ctx.fillText(step.progress, panelX + 230, y);

    ctx.fillStyle = "#8a98a6";
    ctx.fillText(step.detail, panelX + 38, y + 15);
    y += 38;
  });

  const tipW = 560;
  const tipH = 48;
  const tipX = 20;
  const tipY = canvas.height - 118;
  const hintText = state.boss
    ? "Boss do se canh bao bang vung do. Dash de thoat telegraph, giu chuot trai de duy tri sat thuong."
    : current?.detail || "Lam theo checklist de mo boss tutorial.";

  ctx.fillStyle = "rgba(4, 8, 14, 0.82)";
  ctx.strokeStyle = "rgba(255,208,128,0.32)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, tipW, tipH, 12);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(tipX, tipY, tipW, tipH);
    ctx.strokeRect(tipX, tipY, tipW, tipH);
  }

  ctx.font = "13px Rajdhani, sans-serif";
  ctx.fillStyle = "#f2f6fa";
  ctx.textAlign = "center";
  ctx.fillText(hintText, canvas.width / 2, tipY + 29);
  ctx.restore();
}
