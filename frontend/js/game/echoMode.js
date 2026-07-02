import { state, resetGlitchState } from "../state.js";
import { FPS, GHOST_DATA_KEY } from "../config.js";
import { changeState, resetSkillsState } from "./flow.js";
import {
  applyCharacterToPlayer,
  ensureCharacterData,
} from "../characters/manager.js";
import { CHARACTERS } from "../characters/data.js";
import {
  setupBossArenaVisual,
  clearBossArenaVisual,
} from "../world/bossArenaVisual.js";
import { clearDungeon } from "../world/dungeonLayout.js";
import { playSound } from "./audio.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import {
  saveGame,
  dist,
  submitEchoScore,
  fetchEchoLeaderboard,
} from "../utils.js";
import { persistState, isAuthenticated } from "../auth.js";
import { initSkills } from "./skills.js";
import { initMapTheme } from "./mapTheme.js";

// ============================================================================
// ECHO MODE — "VÒNG LẶP"
// Arena cố định, sóng quái vô tận. Mỗi lần chết, run đó trở thành một Bóng Ma
// REPLAY NGUYÊN BẢN (vị trí tuyệt đối + bắn đúng target chuột đã ghi) ở vòng
// lặp sau. Record kết thúc = khoảnh khắc chết cũ → rơi mộ bia chứa vàng.
// Vì arena cố định nên replay tuyệt đối luôn hợp lệ — khác campaign (dungeon
// random khiến path cũ vô nghĩa, phải dùng delta + chase).
// ============================================================================

export const ECHO = {
  CX: 1500,
  CY: 1500,
  RADIUS: 950,
  MAX_RECORD_FRAMES: 5 * 60 * FPS, // giữ 5 phút CUỐI của run (đoạn kịch tính nhất)
  MIN_RECORD_FRAMES: 5 * FPS, // run dưới 5s không đáng làm Bóng Ma
  MAX_RUNS: 5, // Nemesis + 4 run gần nhất
  INTERMISSION: 4 * FPS,
  GRAVE_PICKUP_RADIUS: 45,
  GHOST_SPAWN_PROTECT: 3 * FPS, // mới hiện hình: mờ + không gây chạm
};

const ECHO_DATA_KEY = "BongMa_Echo_V1";

// ---------------------------------------------------------------------------
// LƯU TRỮ — echoRuns tách khỏi save campaign (record nặng, chỉ giữ local;
// server chỉ nhận ĐIỂM cho bảng xếp hạng)
// ---------------------------------------------------------------------------

let echoData = null; // { runs: [{record, wave, timeFrames, graveCoins, characterId, date}], bestWave, bestTimeFrames }

export function loadEchoData() {
  if (echoData) return echoData;
  try {
    echoData = JSON.parse(localStorage.getItem(ECHO_DATA_KEY) || "null");
  } catch {
    echoData = null;
  }
  if (!echoData || !Array.isArray(echoData.runs)) {
    echoData = { runs: [], bestWave: 0, bestTimeFrames: 0 };
  }
  return echoData;
}

function saveEchoData() {
  try {
    localStorage.setItem(ECHO_DATA_KEY, JSON.stringify(echoData));
  } catch {
    // localStorage đầy → bỏ dần run cũ nhất (giữ Nemesis nhờ pruneRuns đã sort)
    while (echoData.runs.length > 1) {
      echoData.runs.shift();
      try {
        localStorage.setItem(ECHO_DATA_KEY, JSON.stringify(echoData));
        return;
      } catch {
        /* thử tiếp */
      }
    }
  }
}

function getNemesisRun(runs) {
  if (!runs || runs.length === 0) return null;
  return runs.reduce((best, r) => {
    if (!best) return r;
    if ((r.wave || 0) !== (best.wave || 0))
      return (r.wave || 0) > (best.wave || 0) ? r : best;
    return (r.timeFrames || 0) > (best.timeFrames || 0) ? r : best;
  }, null);
}

function pruneRuns(data) {
  if (data.runs.length <= ECHO.MAX_RUNS) return;
  const nemesis = getNemesisRun(data.runs);
  const rest = data.runs
    .filter((r) => r !== nemesis)
    .sort((a, b) => (b.date || 0) - (a.date || 0))
    .slice(0, ECHO.MAX_RUNS - 1);
  // Sort theo date tăng dần để run cũ nhất nằm đầu (saveEchoData shift từ đầu)
  data.runs = [nemesis, ...rest].sort((a, b) => (a.date || 0) - (b.date || 0));
}

// ---------------------------------------------------------------------------
// VÒNG ĐỜI RUN
// ---------------------------------------------------------------------------

export function startEchoRun(gameLoopFn) {
  const data = loadEchoData();
  ensureCharacterData();

  const saved = JSON.parse(localStorage.getItem(GHOST_DATA_KEY) || "{}");

  state.gameMode = "echo";
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
  state.player.x = ECHO.CX;
  state.player.y = ECHO.CY;

  // Nâng cấp trong-run reset như initGame campaign
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

  // Dọn sạch thực thể của các chế độ khác
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

  // Nền theo map đang chọn, nhưng TẮT field-event của Map Identity trong arena
  initMapTheme();
  state.mapMechanic.theme = null;

  // Arena cố định — tái dùng vòng tròn Boss Arena (player tự bị constrain khi
  // state.bossArenaVisual tồn tại, xem update.js)
  setupBossArenaVisual("void", ECHO.CX, ECHO.CY, { maxRadius: ECHO.RADIUS });

  state.echo = {
    wave: 0,
    waveTimer: ECHO.INTERMISSION,
    timeFrames: 0,
    coinsAtStart: state.player.coins,
    kills: 0,
    lastGhostCount: -1,
  };
  state.echoGraves = [];
  state._echoGameOverHandled = false;

  spawnEchoGhosts(data.runs);

  UI.bossUi.style.display = "none";
  updateHealthUI();
  updateXPUI();
  UI.timer.innerText = "VÒNG LẶP — CHUẨN BỊ";
  UI.level.innerText = "Wave: 0";
  UI.ghosts.innerText = `Quái: ${state.ghosts.length}`;

  if (state.ghosts.length > 0) {
    state.storyToast = {
      title: "🔁 VÒNG LẶP",
      text: `${state.ghosts.length} Bóng Ma từ các vòng lặp trước đang đi lại chính con đường bạn đã đi — và bắn vào những nơi bạn từng nhắm. Diệt chúng (hoặc chờ chúng lặp lại cái chết) để nhặt mộ bia.`,
      timer: 420,
    };
  }

  changeState("PLAYING", gameLoopFn);
}

function spawnEchoGhosts(runs) {
  const nemesis = getNemesisRun(runs);
  runs.forEach((run) => {
    if (!run.record || run.record.length < ECHO.MIN_RECORD_FRAMES) return;
    const isNemesis = run === nemesis && (run.wave || 0) >= 2;
    const baseHp = Math.min(30, 6 + (run.wave || 0) * 2);
    const hp = Math.round(baseHp * (isNemesis ? 2.5 : 1));
    state.ghosts.push({
      isEchoGhost: true,
      isNemesis,
      name: isNemesis ? `NEMESIS — Wave ${run.wave}` : null,
      record: run.record,
      graveCoins: run.graveCoins || 10,
      timer: 0,
      lastIdx: -1,
      speedRate: 1,
      x: run.record[0][0],
      y: run.record[0][1],
      radius: isNemesis ? 16 : 12,
      hp,
      maxHp: hp,
      isStunned: 0,
      spawnProtect: ECHO.GHOST_SPAWN_PROTECT,
      historyPath: [],
    });
  });
}

// ---------------------------------------------------------------------------
// WAVES — gọi mỗi frame từ update.js khi gameMode === "echo"
// ---------------------------------------------------------------------------

export function updateEchoWaves(player, changeStateFn) {
  const eco = state.echo;
  if (!eco || !player) return;
  eco.timeFrames++;

  // Nhặt mộ bia
  for (let i = state.echoGraves.length - 1; i >= 0; i--) {
    const gr = state.echoGraves[i];
    gr.pulse = (gr.pulse || 0) + 1;
    if (dist(player.x, player.y, gr.x, gr.y) < ECHO.GRAVE_PICKUP_RADIUS) {
      state.player.coins = (state.player.coins || 0) + gr.coins;
      state.floatingTexts.push({
        x: gr.x,
        y: gr.y - 30,
        text: `🪦 +${gr.coins} Vàng`,
        color: "#ffd700",
        size: 22,
        life: 120,
        opacity: 1,
      });
      playSound("fragment");
      state.echoGraves.splice(i, 1);
    }
  }

  const alive = state.ghosts.reduce((n, g) => n + (g.isEchoEnemy ? 1 : 0), 0);

  if (eco.waveTimer > 0) {
    eco.waveTimer--;
    if (eco.waveTimer === 0) {
      eco.wave++;
      spawnWave(eco.wave, player);
      UI.timer.innerText = `VÒNG LẶP — WAVE ${eco.wave}`;
      UI.level.innerText = `Wave: ${eco.wave}`;
      state.floatingTexts.push({
        x: player.x,
        y: player.y - 120,
        text: `⚔ WAVE ${eco.wave}`,
        color: "#b870ff",
        size: 30,
        life: 150,
        opacity: 1,
      });
      playSound("fragment");
    }
  } else if (alive === 0) {
    // Wave sạch → thưởng vàng + nghỉ ngắn
    const bonus = 10 + eco.wave * 5;
    state.player.coins = (state.player.coins || 0) + bonus;
    state.floatingTexts.push({
      x: player.x,
      y: player.y - 100,
      text: `WAVE ${eco.wave} SẠCH! +${bonus} Vàng`,
      color: "#00ffcc",
      size: 24,
      life: 150,
      opacity: 1,
    });
    eco.waveTimer = ECHO.INTERMISSION;
  }

  // Cập nhật HUD đếm quái khi số lượng đổi (tránh ghi DOM mỗi frame)
  if (state.ghosts.length !== eco.lastGhostCount) {
    eco.lastGhostCount = state.ghosts.length;
    UI.ghosts.innerText = `Quái: ${state.ghosts.length}`;
  }
}

function spawnWave(wave, player) {
  const fodder = Math.min(24, 5 + wave * 2);
  const shooters = Math.min(6, Math.floor(wave / 2));
  for (let i = 0; i < fodder; i++) spawnWaveEnemy(false, wave, player);
  for (let i = 0; i < shooters; i++) spawnWaveEnemy(true, wave, player);
}

function randomArenaPoint(player) {
  // Tránh spawn đè lên player
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 150 + Math.random() * (ECHO.RADIUS - 220);
    const x = ECHO.CX + Math.cos(angle) * r;
    const y = ECHO.CY + Math.sin(angle) * r;
    if (!player || dist(x, y, player.x, player.y) > 280) return { x, y };
  }
  return { x: ECHO.CX, y: ECHO.CY - ECHO.RADIUS + 120 };
}

function spawnWaveEnemy(isShooter, wave, player) {
  const pt = randomArenaPoint(player);
  if (isShooter) {
    // isSubBoss → dùng AI đuổi + bắn có sẵn (update.js nhánh 3), chết theo HP
    const hp = 3 + Math.floor(wave * 0.8);
    state.ghosts.push({
      isSubBoss: true,
      isEchoEnemy: true,
      x: pt.x,
      y: pt.y,
      radius: 15,
      hp,
      maxHp: hp,
      speed: Math.min(2.2, 1.0 + wave * 0.06),
      speedRate: 1,
      isStunned: 0,
      historyPath: [],
      color: wave % 2 === 0 ? "#ff4400" : "#66ccff",
    });
  } else {
    // isHorde → AI lao thẳng (update.js nhánh 2), 1 hit chết
    state.ghosts.push({
      isHorde: true,
      isEchoEnemy: true,
      x: pt.x,
      y: pt.y,
      radius: 11,
      speed: Math.min(1.6, 0.9 + wave * 0.05),
      speedRate: 1,
      isStunned: 0,
      historyPath: [],
      timer: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// BÓNG MA CHẾT → MỘ BIA (gọi từ update.js)
// reason: "killed" (bị diệt) | "expired" (record hết = lặp lại cái chết cũ)
// ---------------------------------------------------------------------------

export function onEchoGhostDeath(g, reason) {
  state.echoGraves.push({
    x: g.x,
    y: g.y,
    coins: g.graveCoins || 10,
    pulse: 0,
  });
  if (!state.explosions) state.explosions = [];
  state.explosions.push({
    x: g.x,
    y: g.y,
    radius: g.isNemesis ? 70 : 40,
    life: 30,
    color: g.isNemesis ? "rgba(255,215,0,0.7)" : "rgba(0,255,204,0.7)",
  });
  if (reason === "killed") {
    if (state.echo) state.echo.kills++;
    state.floatingTexts.push({
      x: g.x,
      y: g.y - 40,
      text: g.isNemesis ? "👑 NEMESIS TAN BIẾN!" : "Bóng Ma tan biến",
      color: g.isNemesis ? "#ffd700" : "#00ffcc",
      size: g.isNemesis ? 26 : 16,
      life: 130,
      opacity: 1,
    });
  } else {
    state.floatingTexts.push({
      x: g.x,
      y: g.y - 40,
      text: "Bóng Ma lặp lại cái chết của nó…",
      color: "#8899aa",
      size: 15,
      life: 130,
      opacity: 1,
    });
  }
}

// ---------------------------------------------------------------------------
// GAME OVER — run chết trở thành Bóng Ma mới + nộp điểm bảng xếp hạng.
// Được gọi từ flow.changeState("GAME_OVER") khi gameMode === "echo";
// KHÔNG reset level/pastRuns campaign.
// ---------------------------------------------------------------------------

export function handleEchoGameOver(gameLoopFn) {
  // Fixed-timestep có thể chạy 2+ bước update/frame → GAME_OVER bắn nhiều lần.
  // Guard để không tạo Bóng Ma trùng / nộp điểm đúp.
  if (state._echoGameOverHandled) return;
  state._echoGameOverHandled = true;

  const eco = state.echo || { wave: 0, timeFrames: 0, coinsAtStart: 0, kills: 0 };
  const data = loadEchoData();
  const coinsEarned = Math.max(
    0,
    (state.player?.coins || 0) - (eco.coinsAtStart || 0),
  );

  // Run này trở thành Bóng Ma cho vòng lặp sau
  const rec = (state.currentRunRecord || []).slice(-ECHO.MAX_RECORD_FRAMES);
  let newGhostCreated = false;
  if (rec.length >= ECHO.MIN_RECORD_FRAMES) {
    data.runs.push({
      record: rec,
      wave: eco.wave,
      timeFrames: eco.timeFrames,
      graveCoins: Math.max(10, Math.round(coinsEarned * 0.3)),
      characterId: state.selectedCharacter,
      date: Date.now(),
    });
    pruneRuns(data);
    newGhostCreated = true;
  }

  const isNewBest =
    eco.wave > (data.bestWave || 0) ||
    (eco.wave === (data.bestWave || 0) &&
      eco.timeFrames > (data.bestTimeFrames || 0));
  if (isNewBest) {
    data.bestWave = eco.wave;
    data.bestTimeFrames = eco.timeFrames;
  }
  saveEchoData();

  // Giữ vàng kiếm được (như campaign) — không đụng level/pastRuns campaign
  saveGame(state, GHOST_DATA_KEY);
  persistState();

  if (isAuthenticated()) {
    submitEchoScore({
      wave: eco.wave,
      timeFrames: eco.timeFrames,
      coins: coinsEarned,
      characterId: state.selectedCharacter,
    });
  }

  showEchoGameOverScreen(gameLoopFn, {
    eco,
    coinsEarned,
    newGhostCreated,
    isNewBest,
  });
}

function exitEchoMode() {
  state.gameMode = "campaign";
  state.echo = null;
  state.echoGraves = [];
  clearBossArenaVisual();
}

function showEchoGameOverScreen(gameLoopFn, info) {
  const screen = document.getElementById("screen-echo-gameover");
  if (!screen) {
    exitEchoMode();
    changeState("MENU", gameLoopFn);
    return;
  }

  const stats = document.getElementById("echo-gameover-stats");
  if (stats) {
    stats.innerHTML =
      `Wave đạt được: <b style="color:#b870ff">${info.eco.wave}</b>` +
      (info.isNewBest
        ? ' <span style="color:#ffd700">★ KỶ LỤC MỚI</span>'
        : "") +
      `<br>Thời gian sống sót: <b style="color:#00ffcc">${formatFrames(info.eco.timeFrames)}</b>` +
      `<br>Vàng kiếm được: <b style="color:#ffd700">+${info.coinsEarned}</b>` +
      `<br>Bóng Ma đã diệt: <b>${info.eco.kills}</b>` +
      (info.newGhostCreated
        ? '<br><br><span style="color:#8899aa">Run này đã trở thành một Bóng Ma — nó sẽ chờ bạn ở vòng lặp sau.</span>'
        : "");
  }

  screen.classList.remove("hidden");

  const retry = document.getElementById("btn-echo-retry");
  if (retry)
    retry.onclick = () => {
      screen.classList.add("hidden");
      startEchoRun(gameLoopFn);
    };

  const lb = document.getElementById("btn-echo-gameover-leaderboard");
  if (lb) lb.onclick = () => openEchoLeaderboard();

  const menu = document.getElementById("btn-echo-gameover-menu");
  if (menu)
    menu.onclick = () => {
      screen.classList.add("hidden");
      exitEchoMode();
      changeState("MENU", gameLoopFn);
    };
}

function formatFrames(frames) {
  const s = Math.floor((frames || 0) / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// MENU + BẢNG XẾP HẠNG
// ---------------------------------------------------------------------------

export function openEchoMenu(gameLoopFn) {
  const screen = document.getElementById("screen-echo");
  if (!screen) return;
  const data = loadEchoData();

  document.getElementById("screen-main")?.classList.add("hidden");
  screen.classList.remove("hidden");

  const stats = document.getElementById("echo-menu-stats");
  if (stats) {
    const nemesis = getNemesisRun(data.runs);
    stats.innerHTML =
      `Kỷ lục: <b style="color:#b870ff">Wave ${data.bestWave || 0}</b> — <b style="color:#00ffcc">${formatFrames(data.bestTimeFrames)}</b>` +
      `<br>Bóng Ma đang chờ: <b>${data.runs.length}</b>` +
      (nemesis && (nemesis.wave || 0) >= 2
        ? `<br><span style="color:#ffd700">👑 Nemesis: Bóng Ma Wave ${nemesis.wave} đang trấn giữ arena</span>`
        : "");
  }

  const start = document.getElementById("btn-echo-start");
  if (start)
    start.onclick = () => {
      screen.classList.add("hidden");
      startEchoRun(gameLoopFn);
    };

  const lb = document.getElementById("btn-echo-leaderboard");
  if (lb) lb.onclick = () => openEchoLeaderboard();

  const back = document.getElementById("btn-echo-back");
  if (back)
    back.onclick = () => {
      screen.classList.add("hidden");
      document.getElementById("screen-main")?.classList.remove("hidden");
    };
}

function escapeHtml(s) {
  return String(s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

export async function openEchoLeaderboard() {
  const screen = document.getElementById("screen-echo-leaderboard");
  if (!screen) return;
  screen.classList.remove("hidden");

  const closeBtn = document.getElementById("btn-echo-lb-close");
  if (closeBtn) closeBtn.onclick = () => screen.classList.add("hidden");

  const list = document.getElementById("echo-lb-list");
  if (!list) return;
  list.innerHTML = `<p style="color:#888">Đang tải bảng xếp hạng…</p>`;

  const rows = await fetchEchoLeaderboard();
  if (!rows) {
    list.innerHTML = `<p style="color:#ff6666">Không kết nối được server — bảng xếp hạng tạm thời không khả dụng.</p>`;
    return;
  }
  if (rows.length === 0) {
    list.innerHTML = `<p style="color:#888">Chưa có ai ghi danh. Hãy là người đầu tiên!</p>`;
    return;
  }

  const medal = ["🥇", "🥈", "🥉"];
  list.innerHTML = rows
    .map((r, i) => {
      const ch = CHARACTERS.find((c) => c.id === r.echoBest?.characterId);
      return (
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.08);${i < 3 ? "background:rgba(255,215,0,0.06);" : ""}">` +
        `<span style="width:44px;color:#ffd700;font-weight:bold">${medal[i] || "#" + (i + 1)}</span>` +
        `<span style="flex:1;text-align:left;color:#fff">${escapeHtml(r.username)}</span>` +
        `<span style="width:100px;color:#b870ff">Wave ${r.echoBest?.wave ?? 0}</span>` +
        `<span style="width:70px;color:#00ffcc">${formatFrames(r.echoBest?.timeFrames)}</span>` +
        `<span style="width:110px;color:#8899aa;font-size:12px">${escapeHtml(ch?.name || "")}</span>` +
        `</div>`
      );
    })
    .join("");
}
