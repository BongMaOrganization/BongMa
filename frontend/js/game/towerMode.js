import { state, resetGlitchState } from "../state.js";
import { FPS, GHOST_DATA_KEY } from "../config.js";
import { changeState, resetSkillsState } from "./flow.js";
import {
  applyCharacterToPlayer,
  ensureCharacterData,
} from "../characters/manager.js";
import { clearDungeon } from "../world/dungeonLayout.js";
import { playSound } from "./audio.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import { saveGame, dist } from "../utils.js";
import { persistState } from "../auth.js";
import { initSkills } from "./skills.js";
import { initMapTheme } from "./mapTheme.js";
import { spawnBullet } from "../entities/helpers.js";
import { addExperience } from "./combat.js";

// ============================================================================
// TOWER MODE — "CÔNG THÀNH" (lane-push PvE kiểu MOBA)
// 1 lane ngang giữa world 3000x3000. Mỗi bên: 2 trụ + 1 nhà chính. Lính spawn
// theo wave, đi theo lane, đánh nhau và công trình. Thắng = phá nhà chính địch.
// Luật cốt lõi:
//  - Trụ MIỄN sát thương skill — chỉ ăn đạn thường của player (dmg cap/viên).
//  - Chỉ phá được công trình NGOÀI CÙNG còn sống (chống backdoor).
//  - Player chết KHÔNG game over: hồi sinh tại nhà chính, thời gian chờ tăng dần.
//  - Lính địch nằm trong state.ghosts (isTowerMinion) → đạn/skill player dùng
//    được bình thường; lính đồng minh là mảng riêng để tránh friendly-fire.
// ============================================================================

export const TOWER = {
  LANE_Y: 1500,
  LANE_HALF: 90, // nửa bề rộng lane (vẽ nền)
  ALLY_SPAWN_X: 430,
  WAVE_INTERVAL: 22 * FPS,
  FIRST_WAVE_DELAY: 4 * FPS,
  MELEE_PER_WAVE: 4,
  BRUTE_EVERY: 3, // mỗi 3 wave thêm 1 lính trâu
  MAX_MINIONS_PER_SIDE: 22,
  AGGRO_MINION: 170, // lính đổi mục tiêu sang lính địch trong tầm này
  AGGRO_PLAYER: 240, // lính địch đuổi player trong tầm này
  ATK_INTERVAL: 45, // nhịp cận chiến của lính (frame)
  TOWER_HP: 90,
  NEXUS_HP: 140,
  TOWER_RANGE: 330,
  TOWER_FIRE_INTERVAL: 70,
  TOWER_DMG_MINION: 2, // trụ bắn lính: trừ HP trực tiếp (không né được)
  STRUCT_DMG_CAP: 2, // trần sát thương MỖI VIÊN đạn player lên công trình
  PASSIVE_XP: 2, // XP thụ động mỗi giây (chuẩn MOBA)
  RESPAWN_BASE_S: 3, // chờ hồi sinh = base + số lần chết (giây)
  RESPAWN_MAX_S: 10,
};

const COLOR_ALLY = "#00ffcc";
const COLOR_ENEMY = "#ff4455";

// ---------------------------------------------------------------------------
// KHỞI TẠO RUN
// ---------------------------------------------------------------------------

function makeStructure(team, kind, x, order) {
  const isNexus = kind === "nexus";
  return {
    team, // "ally" | "enemy"
    kind, // "tower" | "nexus"
    x,
    y: TOWER.LANE_Y,
    order, // thứ tự bị công phá: 0 = ngoài cùng
    radius: isNexus ? 46 : 30,
    hp: isNexus ? TOWER.NEXUS_HP : TOWER.TOWER_HP,
    maxHp: isNexus ? TOWER.NEXUS_HP : TOWER.TOWER_HP,
    range: TOWER.TOWER_RANGE,
    fireCd: 0,
    alive: true,
  };
}

export function startTowerRun(gameLoopFn) {
  ensureCharacterData();
  const saved = JSON.parse(localStorage.getItem(GHOST_DATA_KEY) || "{}");

  state.gameMode = "tower";
  state.isMultiplayer = false;
  state.isBossLevel = false;
  state.bossArenaMode = false;
  state.bossArenaType = null;
  state.boss = null;
  state.pendingBossType = null;

  state.player = applyCharacterToPlayer(state.selectedCharacter);
  state.player.coins = saved.player?.coins || 0;
  state.player.experience = 0;
  state.player.experienceToLevel = 100;
  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;
  state.player.x = TOWER.ALLY_SPAWN_X;
  state.player.y = TOWER.LANE_Y;

  // Nâng cấp trong-run reset như echo/campaign
  state.upgrades = {
    cdr: 0,
    fire: 0,
    multi: state.player.multiShot || 1,
    bounce: state.player.bounces || 0,
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
  state.rerollCount = 0;
  state.upgradeFromXP = false;

  // Dọn sạch thực thể của các chế độ khác (giống startEchoRun)
  clearDungeon();
  resetSkillsState();
  resetGlitchState();
  initSkills();
  state.bullets = [];
  state.ghosts = [];
  state.crates = [];
  state.capturePoints = [];
  state.swarmZones = [];
  state.elementalEnemies = [];
  state.elementalZones = [];
  state.items = [];
  state.healStations = [];
  state.dungeonUpgradePedestals = [];
  state.storySigns = [];
  state.puzzleZone = null;
  state.stagePortal = null;
  state.satelliteDrone = null;
  state.activePlayerBuffs = [];
  state.godMode = { active: false, timer: 0 };
  state.currentRunRecord = [];
  state.frameCount = 0;
  state.scoreTime = 0;
  state.maxFramesToSurvive = 999999;
  state.echo = null;
  state.echoGraves = [];

  // Nền theo map đang chọn, TẮT field-event của Map Identity
  initMapTheme();
  state.mapMechanic.theme = null;

  state.tower = {
    wave: 0,
    waveTimer: TOWER.FIRST_WAVE_DELAY,
    timeFrames: 0,
    coinsAtStart: state.player.coins,
    kills: 0,
    deaths: 0,
    respawnTimer: 0,
    towersDown: 0, // trụ địch đã phá
    allyMinions: [],
    beams: [], // vệt bắn của trụ {x1,y1,x2,y2,life,maxLife,color}
    banner: null,
    bannerTimer: 0,
    lastGhostLabel: "",
    immuneMsgCd: 0,
    result: null, // "victory" | "defeat"
    _endHandled: false,
    // Thứ tự công phá: ngoài cùng trước (chống backdoor)
    structures: [
      // Bên TA — lính địch phá theo order 0→2
      makeStructure("ally", "tower", 1200, 0),
      makeStructure("ally", "tower", 780, 1),
      makeStructure("ally", "nexus", 300, 2),
      // Bên ĐỊCH — mình và lính đồng minh phá theo order 0→2
      makeStructure("enemy", "tower", 1800, 0),
      makeStructure("enemy", "tower", 2220, 1),
      makeStructure("enemy", "nexus", 2700, 2),
    ],
  };

  UI.bossUi.style.display = "none";
  updateHealthUI();
  updateXPUI();
  UI.timer.innerText = "CÔNG THÀNH — CHUẨN BỊ";
  UI.level.innerText = "Wave: 0";
  UI.ghosts.innerText = "Quái: 0";

  state.storyToast = {
    title: "🏰 CÔNG THÀNH",
    text: "Đẩy lane cùng lính đồng minh, phá 2 trụ rồi công phá NHÀ CHÍNH địch. Trụ miễn sát thương kỹ năng — chỉ đạn thường mới phá được. Gục ngã sẽ hồi sinh tại nhà chính, nhưng thời gian chờ tăng dần!",
    timer: 480,
  };

  changeState("PLAYING", gameLoopFn);
}

function exitTowerMode() {
  state.gameMode = "campaign";
  state.tower = null;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function setBanner(t, text, color = "#ffd700") {
  t.banner = text;
  t.bannerColor = color;
  t.bannerTimer = 110;
}

// Công trình NGOÀI CÙNG còn sống của một phe — mục tiêu hợp lệ duy nhất
function currentObjective(team) {
  const t = state.tower;
  if (!t) return null;
  let best = null;
  for (const s of t.structures) {
    if (s.team !== team || !s.alive) continue;
    if (!best || s.order < best.order) best = s;
  }
  return best;
}

function minionScale(wave) {
  return 1 + 0.12 * Math.max(0, wave - 1);
}

function spawnEnemyMinion(wave, brute, laneOff) {
  const sc = minionScale(wave);
  state.ghosts.push({
    isTowerMinion: true,
    isHorde: true, // tái dùng AI di chuyển-theo-target + chạm player gây dmg
    x: 2640 + (Math.random() - 0.5) * 40,
    y: TOWER.LANE_Y + laneOff,
    laneOff,
    radius: brute ? 17 : 11,
    hp: Math.round((brute ? 14 : 3) * sc),
    maxHp: Math.round((brute ? 14 : 3) * sc),
    speed: brute ? 0.7 : 0.9, // horde branch nhân 1.8
    isStunned: 0,
    historyPath: [],
    timer: 0,
    atkCd: 0,
    minionDmg: brute ? 2 : 1, // dmg lên lính đồng minh / công trình
    brute,
    bounty: brute ? 10 : 3,
    xpValue: brute ? 25 : 8,
  });
}

function spawnAllyMinion(wave, brute, laneOff) {
  const sc = minionScale(wave);
  state.tower.allyMinions.push({
    x: 360 + (Math.random() - 0.5) * 40,
    y: TOWER.LANE_Y + laneOff,
    laneOff,
    radius: brute ? 16 : 11,
    hp: Math.round((brute ? 16 : 4) * sc),
    maxHp: Math.round((brute ? 16 : 4) * sc),
    speed: brute ? 1.15 : 1.5,
    atkCd: 0,
    minionDmg: brute ? 2 : 1,
    brute,
  });
}

function spawnWave(t) {
  const brute = t.wave % TOWER.BRUTE_EVERY === 0;
  const melee = TOWER.MELEE_PER_WAVE + Math.floor(t.wave / 4);
  const enemyAlive = state.ghosts.reduce(
    (n, g) => n + (g.isTowerMinion ? 1 : 0),
    0,
  );

  for (let i = 0; i < melee; i++) {
    const laneOff = -70 + (i * 140) / Math.max(1, melee - 1);
    if (enemyAlive + i < TOWER.MAX_MINIONS_PER_SIDE)
      spawnEnemyMinion(t.wave, false, laneOff);
    if (t.allyMinions.length + i < TOWER.MAX_MINIONS_PER_SIDE)
      spawnAllyMinion(t.wave, false, laneOff);
  }
  if (brute) {
    if (enemyAlive + melee < TOWER.MAX_MINIONS_PER_SIDE)
      spawnEnemyMinion(t.wave, true, 0);
    if (t.allyMinions.length + melee < TOWER.MAX_MINIONS_PER_SIDE)
      spawnAllyMinion(t.wave, true, 0);
  }
}

function pushBeam(t, x1, y1, x2, y2, color) {
  if (t.beams.length > 40) t.beams.shift();
  t.beams.push({ x1, y1, x2, y2, life: 12, maxLife: 12, color });
}

function smallExplosion(x, y, color, radius = 18) {
  if (!state.explosions) state.explosions = [];
  state.explosions.push({ x, y, radius, life: 14, color });
}

function structureDestroyed(t, s, changeStateFn) {
  s.alive = false;
  s.hp = 0;
  smallExplosion(s.x, s.y, "rgba(255,200,80,0.85)", s.kind === "nexus" ? 120 : 70);
  state.screenShake = { x: 0, y: 0, timer: 35, intensity: 12 };
  playSound("fragment");

  if (s.kind === "nexus") {
    t.result = s.team === "enemy" ? "victory" : "defeat";
    changeStateFn("GAME_OVER");
    return;
  }

  if (s.team === "enemy") {
    t.towersDown++;
    state.player.coins = (state.player.coins || 0) + 80;
    addExperience(40, changeStateFn);
    setBanner(t, "💥 TRỤ ĐỊCH BỊ PHÁ! +80 Vàng", COLOR_ALLY);
  } else {
    setBanner(t, "⚠ MẤT TRỤ! Phòng thủ nhà chính!", COLOR_ENEMY);
  }
}

// ---------------------------------------------------------------------------
// PLAYER GỤC NGÃ → HỒI SINH TẠI NHÀ CHÍNH (gọi từ update.js, KHÔNG game over)
// ---------------------------------------------------------------------------

export function handleTowerPlayerDown() {
  const t = state.tower;
  const p = state.player;
  if (!t || !p) return;

  t.deaths++;
  const downS = Math.min(TOWER.RESPAWN_MAX_S, TOWER.RESPAWN_BASE_S + t.deaths);
  const downFrames = downS * FPS;

  smallExplosion(p.x, p.y, "rgba(0,255,204,0.7)", 60);

  p.hp = p.maxHp;
  p.x = TOWER.ALLY_SPAWN_X;
  p.y = TOWER.LANE_Y;
  p.gracePeriod = downFrames + 60;
  p.cooldown = Math.max(p.cooldown || 0, downFrames); // không bắn khi đang chờ
  state.playerStatus.stunTimer = downFrames; // không di chuyển khi đang chờ
  t.respawnTimer = downFrames;

  setBanner(t, `💀 BẠN ĐÃ GỤC — HỒI SINH SAU ${downS}s`, COLOR_ENEMY);
  playSound("damage");
  updateHealthUI();
}

// ---------------------------------------------------------------------------
// UPDATE — gọi mỗi frame từ update.js khi gameMode === "tower"
// ---------------------------------------------------------------------------

export function updateTowerMode(player, changeStateFn) {
  const t = state.tower;
  if (!t || !player || t.result) return;
  t.timeFrames++;

  if (t.bannerTimer > 0) t.bannerTimer--;
  if (t.respawnTimer > 0) t.respawnTimer--;
  if (t.immuneMsgCd > 0) t.immuneMsgCd--;

  // XP thụ động mỗi giây — đảm bảo có level-up đều như MOBA
  if (t.timeFrames % FPS === 0) addExperience(TOWER.PASSIVE_XP, changeStateFn);

  // --- WAVE ---
  t.waveTimer--;
  if (t.waveTimer <= 0) {
    t.wave++;
    t.waveTimer = TOWER.WAVE_INTERVAL;
    spawnWave(t);
    UI.level.innerText = `Wave: ${t.wave}`;
    setBanner(t, `WAVE ${t.wave}`, "#ffd700");
    playSound("fragment");
  }

  const enemyMinions = state.ghosts.filter(
    (g) => g.isTowerMinion && (g.hp || 0) > 0,
  );
  const allyObj = currentObjective("ally"); // lính địch công cái này
  const enemyObj = currentObjective("enemy"); // mình + lính đồng minh công cái này

  // --- LÍNH ĐỊCH: chọn mục tiêu (horde branch của update.js lo di chuyển/chạm) ---
  for (const g of enemyMinions) {
    if (g.atkCd > 0) g.atkCd--;

    // 1) Lính đồng minh gần nhất trong tầm aggro
    let target = null;
    let bestD = TOWER.AGGRO_MINION;
    for (const m of t.allyMinions) {
      const d = dist(g.x, g.y, m.x, m.y);
      if (d < bestD) {
        bestD = d;
        target = m;
      }
    }

    if (target) {
      if (bestD < g.radius + target.radius + 8) {
        // Cận chiến: đứng lại đánh
        g.targetX = g.x;
        g.targetY = g.y;
        if (g.atkCd <= 0) {
          g.atkCd = TOWER.ATK_INTERVAL;
          target.hp -= g.minionDmg;
          smallExplosion(target.x, target.y, "rgba(255,80,80,0.6)", 10);
        }
      } else {
        g.targetX = target.x;
        g.targetY = target.y;
      }
      continue;
    }

    // 2) Player trong tầm → đuổi (contact damage do update.js xử lý)
    if (
      t.respawnTimer <= 0 &&
      dist(g.x, g.y, player.x, player.y) < TOWER.AGGRO_PLAYER
    ) {
      g.targetX = player.x;
      g.targetY = player.y;
      continue;
    }

    // 3) Công trình mục tiêu (ngoài cùng còn sống)
    if (allyObj) {
      const d = dist(g.x, g.y, allyObj.x, allyObj.y);
      if (d < allyObj.radius + g.radius + 10) {
        g.targetX = g.x;
        g.targetY = g.y;
        if (g.atkCd <= 0 && allyObj.alive) {
          g.atkCd = TOWER.ATK_INTERVAL;
          allyObj.hp -= g.minionDmg;
          smallExplosion(allyObj.x, allyObj.y, "rgba(255,120,60,0.7)", 14);
          if (allyObj.hp <= 0) structureDestroyed(t, allyObj, changeStateFn);
        }
      } else {
        g.targetX = allyObj.x;
        g.targetY = allyObj.y + g.laneOff * 0.5;
      }
    }
  }
  if (t.result) return; // nhà chính vừa sập trong loop trên

  // --- LÍNH ĐỒNG MINH: di chuyển + cận chiến (towerMode tự quản) ---
  for (let i = t.allyMinions.length - 1; i >= 0; i--) {
    const m = t.allyMinions[i];
    if (m.hp <= 0) {
      smallExplosion(m.x, m.y, "rgba(0,255,204,0.6)", 16);
      t.allyMinions.splice(i, 1);
      continue;
    }
    if (m.atkCd > 0) m.atkCd--;

    // 1) Lính địch gần nhất trong tầm aggro
    let target = null;
    let bestD = TOWER.AGGRO_MINION;
    for (const g of enemyMinions) {
      if ((g.hp || 0) <= 0) continue;
      const d = dist(m.x, m.y, g.x, g.y);
      if (d < bestD) {
        bestD = d;
        target = g;
      }
    }

    let moveX = null;
    let moveY = null;
    if (target) {
      if (bestD < m.radius + target.radius + 8) {
        if (m.atkCd <= 0) {
          m.atkCd = TOWER.ATK_INTERVAL;
          target.hp -= m.minionDmg;
          target.isStunned = Math.max(target.isStunned || 0, 10);
          smallExplosion(target.x, target.y, "rgba(0,255,204,0.55)", 10);
        }
      } else {
        moveX = target.x;
        moveY = target.y;
      }
    } else if (enemyObj) {
      const d = dist(m.x, m.y, enemyObj.x, enemyObj.y);
      if (d < enemyObj.radius + m.radius + 10) {
        if (m.atkCd <= 0 && enemyObj.alive) {
          m.atkCd = TOWER.ATK_INTERVAL;
          enemyObj.hp -= m.minionDmg;
          smallExplosion(enemyObj.x, enemyObj.y, "rgba(0,255,204,0.7)", 14);
          if (enemyObj.hp <= 0) structureDestroyed(t, enemyObj, changeStateFn);
        }
      } else {
        moveX = enemyObj.x;
        moveY = enemyObj.y + m.laneOff * 0.5;
      }
    }

    if (moveX !== null) {
      const a = Math.atan2(moveY - m.y, moveX - m.x);
      m.x += Math.cos(a) * m.speed;
      m.y += Math.sin(a) * m.speed;
      m.x = Math.max(20, Math.min(state.world.width - 20, m.x));
      m.y = Math.max(20, Math.min(state.world.height - 20, m.y));
    }
  }
  if (t.result) return;

  // --- TRỤ: bắt mục tiêu + bắn ---
  for (const s of t.structures) {
    if (!s.alive || s.kind === "nexus") continue;
    if (s.fireCd > 0) {
      s.fireCd--;
      continue;
    }

    if (s.team === "ally") {
      // Trụ TA: trừ HP trực tiếp lính địch gần nhất trong tầm
      let target = null;
      let bestD = s.range;
      for (const g of enemyMinions) {
        if ((g.hp || 0) <= 0) continue;
        const d = dist(s.x, s.y, g.x, g.y);
        if (d < bestD) {
          bestD = d;
          target = g;
        }
      }
      if (target) {
        s.fireCd = TOWER.TOWER_FIRE_INTERVAL;
        target.hp -= TOWER.TOWER_DMG_MINION;
        target.isStunned = Math.max(target.isStunned || 0, 8);
        pushBeam(t, s.x, s.y - s.radius, target.x, target.y, COLOR_ALLY);
        smallExplosion(target.x, target.y, "rgba(0,255,204,0.6)", 12);
      }
    } else {
      // Trụ ĐỊCH: ưu tiên lính đồng minh (trừ trực tiếp), không có thì bắn
      // ĐẠN về phía player (né được — công bằng khi dive trụ)
      let target = null;
      let bestD = s.range;
      for (const m of t.allyMinions) {
        if (m.hp <= 0) continue;
        const d = dist(s.x, s.y, m.x, m.y);
        if (d < bestD) {
          bestD = d;
          target = m;
        }
      }
      if (target) {
        s.fireCd = TOWER.TOWER_FIRE_INTERVAL;
        target.hp -= TOWER.TOWER_DMG_MINION;
        pushBeam(t, s.x, s.y - s.radius, target.x, target.y, COLOR_ENEMY);
        smallExplosion(target.x, target.y, "rgba(255,68,85,0.6)", 12);
      } else if (
        t.respawnTimer <= 0 &&
        dist(s.x, s.y, player.x, player.y) < s.range
      ) {
        s.fireCd = TOWER.TOWER_FIRE_INTERVAL;
        spawnBullet(s.x, s.y - s.radius, player.x, player.y, false, 0, "tower", 1);
        pushBeam(t, s.x, s.y - s.radius, player.x, player.y, "rgba(255,68,85,0.35)");
      }
    }
  }

  // --- ĐẠN PLAYER vs CÔNG TRÌNH ĐỊCH ---
  // Trụ chỉ ăn ĐẠN THƯỜNG: sát thương mỗi viên bị cap → skill buff đạn không
  // phá trụ nhanh hơn; hazard/AoE của skill vốn chỉ quét state.ghosts nên
  // không đụng công trình.
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (!b.isPlayer) continue;
    for (const s of t.structures) {
      if (s.team !== "enemy" || !s.alive) continue;
      if (dist(b.x, b.y, s.x, s.y) > s.radius + (b.radius || 4)) continue;

      if (enemyObj && s !== enemyObj) {
        // Chưa tới lượt công trình này (chống backdoor) — đạn vỡ, không dmg
        smallExplosion(b.x, b.y, "rgba(160,170,190,0.55)", 8);
        if (t.immuneMsgCd <= 0) {
          t.immuneMsgCd = 90;
          state.floatingTexts.push({
            x: s.x,
            y: s.y - s.radius - 30,
            text: "🛡 BẤT KHẢ XÂM — PHÁ TRỤ NGOÀI TRƯỚC!",
            color: "#aab4c8",
            size: 16,
            life: 90,
            opacity: 1,
          });
        }
      } else {
        const dmg = Math.min(TOWER.STRUCT_DMG_CAP, b.damage || 1);
        s.hp -= dmg;
        smallExplosion(b.x, b.y, "rgba(255,200,80,0.7)", 10);
        if (s.hp <= 0) structureDestroyed(t, s, changeStateFn);
      }
      state.bullets.splice(i, 1);
      break;
    }
    if (t.result) return;
  }

  // --- VỆT BẮN của trụ ---
  for (let i = t.beams.length - 1; i >= 0; i--) {
    t.beams[i].life--;
    if (t.beams[i].life <= 0) t.beams.splice(i, 1);
  }

  // --- HUD (ghi DOM tiết kiệm) ---
  if (t.timeFrames % FPS === 0) {
    const nextIn = Math.ceil(t.waveTimer / FPS);
    UI.timer.innerText = `CÔNG THÀNH — WAVE ${t.wave} · ${formatFrames(t.timeFrames)} · đợt kế ${nextIn}s`;
  }
  const label = `Quái: ${enemyMinions.length} · Lính ta: ${t.allyMinions.length}`;
  if (label !== t.lastGhostLabel) {
    t.lastGhostLabel = label;
    UI.ghosts.innerText = label;
  }
}

function formatFrames(frames) {
  const s = Math.floor((frames || 0) / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// DRAW — world-space (lane, công trình, lính đồng minh) + screen-space HUD
// ---------------------------------------------------------------------------

export function drawTowerWorld(ctx) {
  const t = state.tower;
  if (!t) return;

  // Lane nền + vạch giữa
  const x0 = 260;
  const x1 = 2740;
  ctx.save();
  ctx.fillStyle = "rgba(120,140,180,0.08)";
  ctx.fillRect(x0, TOWER.LANE_Y - TOWER.LANE_HALF, x1 - x0, TOWER.LANE_HALF * 2);
  ctx.strokeStyle = "rgba(160,180,220,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(x0, TOWER.LANE_Y);
  ctx.lineTo(x1, TOWER.LANE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const enemyObj = currentObjective("enemy");

  for (const s of t.structures) {
    const color = s.team === "ally" ? COLOR_ALLY : COLOR_ENEMY;

    if (!s.alive) {
      // Phế tích
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#333a44";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#556";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.save();
    // Vòng tầm bắn mờ của trụ (giúp player biết vùng nguy hiểm)
    if (s.kind === "tower") {
      ctx.strokeStyle =
        s.team === "enemy" ? "rgba(255,68,85,0.12)" : "rgba(0,255,204,0.10)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Thân công trình
    ctx.shadowBlur = s.kind === "nexus" ? 22 : 14;
    ctx.shadowColor = color;
    ctx.fillStyle = s.team === "ally" ? "#0a2d2a" : "#33101a";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Lõi
    ctx.shadowBlur = 0;
    const pulse = s.kind === "nexus" ? Math.sin(state.frameCount * 0.08) * 3 : 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.45 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${s.kind === "nexus" ? 30 : 20}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(s.kind === "nexus" ? "🏰" : "🗼", s.x, s.y + 8);

    // Khiên "bất khả xâm" cho công trình địch chưa tới lượt
    if (s.team === "enemy" && enemyObj && s !== enemyObj) {
      ctx.strokeStyle = "rgba(170,180,200,0.5)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Thanh máu
    const w = s.radius * 2.4;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(s.x - w / 2, s.y - s.radius - 16, w, 6);
    ctx.fillStyle = color;
    ctx.fillRect(
      s.x - w / 2,
      s.y - s.radius - 16,
      w * Math.max(0, Math.min(1, s.hp / s.maxHp)),
      6,
    );
    ctx.restore();
  }

  // Vệt bắn của trụ
  for (const beam of t.beams) {
    ctx.save();
    ctx.globalAlpha = (beam.life / beam.maxLife) * 0.8;
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawTowerMinions(ctx) {
  const t = state.tower;
  if (!t) return;

  // Lính đồng minh (mảng riêng — drawEnemies không vẽ)
  for (const m of t.allyMinions) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#0a3d38";
    ctx.fill();
    ctx.strokeStyle = COLOR_ALLY;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (m.brute) {
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.fillText("⚔", m.x, m.y + 4);
    }
    // Thanh máu
    const w = m.radius * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(m.x - w / 2, m.y - m.radius - 10, w, 3);
    ctx.fillStyle = COLOR_ALLY;
    ctx.fillRect(
      m.x - w / 2,
      m.y - m.radius - 10,
      w * Math.max(0, Math.min(1, m.hp / m.maxHp)),
      3,
    );
    ctx.restore();
  }

  // Thanh máu cho lính địch (thân đã được drawEnemies vẽ đỏ mặc định)
  for (const g of state.ghosts) {
    if (!g.isTowerMinion || !g.maxHp) continue;
    const w = g.radius * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(g.x - w / 2, g.y - g.radius - 10, w, 3);
    ctx.fillStyle = COLOR_ENEMY;
    ctx.fillRect(
      g.x - w / 2,
      g.y - g.radius - 10,
      w * Math.max(0, Math.min(1, g.hp / g.maxHp)),
      3,
    );
    if (g.brute) {
      ctx.save();
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.fillText("💀", g.x, g.y + 4);
      ctx.restore();
    }
  }
}

export function drawTowerHud(ctx, canvas) {
  const t = state.tower;
  if (!t) return;

  // 2 thanh máu nhà chính — top giữa màn hình
  const allyNexus = t.structures.find((s) => s.team === "ally" && s.kind === "nexus");
  const enemyNexus = t.structures.find((s) => s.team === "enemy" && s.kind === "nexus");
  const barW = 210;
  const cx = canvas.width / 2;
  const y = 14;

  const drawBar = (x, s, color, align) => {
    if (!s) return;
    const ratio = Math.max(0, Math.min(1, s.hp / s.maxHp));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, barW, 12);
    ctx.fillStyle = color;
    ctx.fillRect(
      align === "right" ? x + barW * (1 - ratio) : x,
      y,
      barW * ratio,
      12,
    );
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, 12);
  };
  drawBar(cx - barW - 30, allyNexus, COLOR_ALLY, "right");
  drawBar(cx + 30, enemyNexus, COLOR_ENEMY, "left");
  ctx.save();
  ctx.font = "bold 13px Orbitron, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = COLOR_ALLY;
  ctx.fillText("🏰 TA", cx - barW - 55, y + 11);
  ctx.fillStyle = COLOR_ENEMY;
  ctx.fillText("ĐỊCH 🏰", cx + barW + 60, y + 11);
  ctx.restore();

  // Đếm ngược hồi sinh
  if (t.respawnTimer > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 40px Orbitron, sans-serif";
    ctx.fillStyle = "rgba(255,68,85,0.9)";
    ctx.shadowBlur = 18;
    ctx.shadowColor = COLOR_ENEMY;
    ctx.fillText(
      `HỒI SINH ${Math.ceil(t.respawnTimer / FPS)}s`,
      canvas.width / 2,
      canvas.height / 2 - 90,
    );
    ctx.restore();
  }

  // Banner giữa màn hình (giống echo)
  if (t.banner && t.bannerTimer > 0) {
    const tt = t.bannerTimer;
    const alpha = tt > 90 ? (110 - tt) / 20 : tt < 25 ? tt / 25 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = "center";
    ctx.font = "bold 46px Orbitron, sans-serif";
    ctx.shadowBlur = 22;
    ctx.shadowColor = t.bannerColor || "#ffd700";
    ctx.fillStyle = t.bannerColor || "#ffd700";
    ctx.fillText(t.banner, canvas.width / 2, canvas.height / 2 - 40);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// KẾT THÚC — thắng (phá nhà chính địch) / thua (mất nhà chính).
// Gọi từ flow.changeState("GAME_OVER") khi gameMode === "tower".
// ---------------------------------------------------------------------------

export function handleTowerGameOver(gameLoopFn) {
  const t = state.tower;
  if (!t || t._endHandled) return;
  t._endHandled = true;

  const victory = t.result === "victory";
  const bonus = victory ? 250 + 25 * t.wave : 60 + 5 * t.wave;
  state.player.coins = (state.player.coins || 0) + bonus;
  const coinsEarned = Math.max(
    0,
    (state.player.coins || 0) - (t.coinsAtStart || 0),
  );

  saveGame(state, GHOST_DATA_KEY);
  persistState();

  const screen = document.getElementById("screen-tower-end");
  if (!screen) {
    exitTowerMode();
    changeState("MENU", gameLoopFn);
    return;
  }

  const title = document.getElementById("tower-end-title");
  if (title) {
    title.innerText = victory ? "🏆 CÔNG THÀNH THẮNG LỢI!" : "💔 NHÀ CHÍNH THẤT THỦ";
    title.style.color = victory ? "#ffd700" : "#ff4455";
  }
  const stats = document.getElementById("tower-end-stats");
  if (stats) {
    stats.innerHTML =
      `Wave đạt được: <b style="color:#ffd700">${t.wave}</b>` +
      `<br>Thời gian trận: <b style="color:#00ffcc">${formatFrames(t.timeFrames)}</b>` +
      `<br>Trụ địch đã phá: <b>${t.towersDown} / 2</b>` +
      `<br>Số lần gục ngã: <b>${t.deaths}</b>` +
      `<br>Vàng nhận được: <b style="color:#ffd700">+${coinsEarned}</b> (thưởng trận +${bonus})`;
  }

  screen.classList.remove("hidden");

  const retry = document.getElementById("btn-tower-retry");
  if (retry)
    retry.onclick = () => {
      screen.classList.add("hidden");
      startTowerRun(gameLoopFn);
    };
  const menu = document.getElementById("btn-tower-end-menu");
  if (menu)
    menu.onclick = () => {
      screen.classList.add("hidden");
      exitTowerMode();
      changeState("MENU", gameLoopFn);
    };
}

// ---------------------------------------------------------------------------
// MENU
// ---------------------------------------------------------------------------

export function openTowerMenu(gameLoopFn) {
  const screen = document.getElementById("screen-tower");
  if (!screen) return;
  document.getElementById("screen-main")?.classList.add("hidden");
  screen.classList.remove("hidden");

  const start = document.getElementById("btn-tower-start");
  if (start)
    start.onclick = () => {
      screen.classList.add("hidden");
      startTowerRun(gameLoopFn);
    };
  const back = document.getElementById("btn-tower-back");
  if (back)
    back.onclick = () => {
      screen.classList.add("hidden");
      document.getElementById("screen-main")?.classList.remove("hidden");
    };
}
