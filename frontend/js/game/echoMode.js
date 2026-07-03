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
  getBossSpawnPosition,
} from "../world/bossArenaVisual.js";
import { clearDungeon } from "../world/dungeonLayout.js";
import { createBoss } from "../entities/bosses/boss_manager.js";
import { playSound, playBGM } from "./audio.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import {
  saveGame,
  dist,
  submitEchoScore,
  fetchEchoLeaderboard,
  uploadEchoGhost,
  fetchRemoteGhosts,
  fetchGhostByName,
} from "../utils.js";
import { encodeRecord, decodeRecord } from "./echoCodec.js";
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
  REMOTE_UNLOCK_WAVE: 3, // gate: bestWave ≥ 3 mới gặp ghost người khác
  MAX_REMOTE: 3,
  SOLO_REWARD_MULT: 0.8, // tắt Bóng Ma người khác → thưởng vàng ×0.8
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
  // Giải nén record (decodeRecord tự nhận cả định dạng cũ chưa nén); hỏng → bỏ
  echoData.runs = echoData.runs
    .map((r) => ({ ...r, record: decodeRecord(r.record) }))
    .filter((r) => Array.isArray(r.record) && r.record.length > 0);
  return echoData;
}

// Nén record trước khi ghi — runtime giữ mảng thô, chỉ storage/network dùng bản nén
function serializeEchoData() {
  return JSON.stringify({
    ...echoData,
    runs: echoData.runs.map((r) => ({ ...r, record: encodeRecord(r.record) })),
  });
}

function saveEchoData() {
  try {
    localStorage.setItem(ECHO_DATA_KEY, serializeEchoData());
  } catch {
    // localStorage đầy → bỏ dần run cũ nhất (giữ Nemesis nhờ pruneRuns đã sort)
    while (echoData.runs.length > 1) {
      echoData.runs.shift();
      try {
        localStorage.setItem(ECHO_DATA_KEY, serializeEchoData());
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
  state.tower = null;
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
    pendingSpawns: [], // hàng chờ spawn nhỏ giọt trong wave
    spawnTick: 0,
    lastGhostLabel: "",
    runToken: Math.random(), // chống spawn ghost remote vào nhầm run (fetch về trễ)
    banner: null,
    bannerTimer: 0,
    mod: null, // mod áp cho wave hiện tại
    modNext: null, // mod chọn từ thẻ, áp cho wave kế
    rewardMult: 1, // <1 khi tắt Bóng Ma người khác
  };
  state.echoChoicePause = false;
  state.echoGraves = [];
  state._echoGameOverHandled = false;

  // === GATE remote ghost ===
  // Run đầu đời phải sạch (học luật), run 2 phải là "gặp chính mình".
  // Người khác chỉ xâm nhập khi: BẬT toggle VÀ có ≥1 run của mình VÀ bestWave ≥ 3.
  // Nhập username thách đấu = chủ động → bỏ qua gate (nhưng vẫn tôn trọng toggle).
  const rivalName =
    document.getElementById("echo-rival-input")?.value.trim() || null;
  const remoteEnabled = data.remoteEnabled !== false; // mặc định BẬT
  const remoteUnlocked =
    remoteEnabled &&
    data.runs.length >= 1 &&
    (data.bestWave || 0) >= ECHO.REMOTE_UNLOCK_WAVE;
  const remoteActive = remoteEnabled && (remoteUnlocked || !!rivalName);

  // Tắt Bóng Ma người khác → thưởng vàng giảm (khuyến khích bật)
  state.echo.rewardMult = remoteActive ? 1 : ECHO.SOLO_REWARD_MULT;

  // Remote bật → nhường slot: mình giữ Nemesis + 2 run gần nhất, còn lại cho người lạ.
  // Remote tắt → giữ nguyên tối đa 5 (Nemesis + 4 run gần nhất).
  spawnEchoGhosts(data.runs, remoteActive ? 3 : ECHO.MAX_RUNS);
  if (remoteActive) {
    fetchAndSpawnRemoteGhosts(data, rivalName, state.echo.runToken);
  }

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
      timer: 300, // ~5s tự biến mất, đỡ che skill bar
    };
  }

  changeState("PLAYING", gameLoopFn);
}

function spawnEchoGhosts(runs, limitOwn = ECHO.MAX_RUNS) {
  const nemesis = getNemesisRun(runs);

  // Giới hạn slot của mình: luôn giữ Nemesis, còn lại lấy run mới nhất
  let chosen = runs;
  if (runs.length > limitOwn) {
    const rest = runs
      .filter((r) => r !== nemesis)
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .slice(0, Math.max(0, limitOwn - (nemesis ? 1 : 0)));
    chosen = nemesis ? [nemesis, ...rest] : rest;
  }

  chosen.forEach((run) => {
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
// REMOTE GHOSTS — run thật của người chơi khác.
// Fetch async KHÔNG chặn vào trận: về muộn thì ghost "xâm nhập" giữa chừng
// (có spawnProtect); fail/offline → run vẫn chạy với ghost của mình.
// ---------------------------------------------------------------------------

async function fetchAndSpawnRemoteGhosts(data, rivalName, runToken) {
  const found = [];

  if (rivalName) {
    const g = await fetchGhostByName(rivalName);
    if (g) found.push({ ...g, isRival: true });
  }

  const need = ECHO.MAX_REMOTE - found.length;
  if (need > 0) {
    const list = await fetchRemoteGhosts(
      Math.max(ECHO.REMOTE_UNLOCK_WAVE, data.bestWave || 0),
    );
    if (Array.isArray(list)) list.slice(0, need).forEach((g) => found.push(g));
  }

  // Fetch về trễ sau khi run đã kết thúc / sang run khác → bỏ
  if (
    state.gameMode !== "echo" ||
    !state.echo ||
    state.echo.runToken !== runToken
  ) {
    return;
  }

  let spawned = 0;
  found.forEach((g) => {
    if (spawnRemoteGhost(g)) spawned++;
  });

  if (spawned > 0) {
    state.storyToast = {
      title: "🌐 XÂM NHẬP",
      text: `${spawned} Bóng Ma từ người chơi khác đã xâm nhập arena — replay run thật của họ. Diệt để nhận tiền thưởng săn.`,
      timer: 320,
    };
  } else if (rivalName) {
    state.storyToast = {
      title: "⚔ THÁCH ĐẤU",
      text: `Không tìm thấy Bóng Ma của "${rivalName}" — họ chưa có run nào đạt Wave 3.`,
      timer: 300,
    };
  }
}

function spawnRemoteGhost(g) {
  const record = decodeRecord(g.record);
  if (!record || record.length < ECHO.MIN_RECORD_FRAMES) return false;

  const wave = g.wave || ECHO.REMOTE_UNLOCK_WAVE;
  const hp = Math.min(30, 6 + wave * 2);
  // Bounty PHẲNG theo wave — không phải % tiền của chủ ghost (chặn farm người giàu)
  const bounty = Math.round((20 + wave * 2) * (g.isRival ? 1.5 : 1));

  state.ghosts.push({
    isEchoGhost: true,
    isRemote: true,
    isRival: !!g.isRival,
    name: String(g.username || "???").slice(0, 16),
    record,
    graveCoins: bounty,
    timer: 0,
    lastIdx: -1,
    speedRate: 1,
    x: record[0][0],
    y: record[0][1],
    radius: 13,
    hp,
    maxHp: hp,
    isStunned: 0,
    spawnProtect: ECHO.GHOST_SPAWN_PROTECT,
    historyPath: [],
  });
  return true;
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
  const cap = concurrentCap(eco.wave);

  if (eco.bannerTimer > 0) eco.bannerTimer--;

  if (eco.waveTimer > 0) {
    eco.waveTimer--;
    if (eco.waveTimer === 0) {
      eco.wave++;
      buildWave(eco, player);
      UI.level.innerText = `Wave: ${eco.wave}`;
      playSound("fragment");
    }
  } else if (alive === 0 && eco.pendingSpawns.length === 0 && !state.boss) {
    // Wave sạch → thưởng vàng (nhân theo mod chọn × hệ số solo) + mở thẻ lựa chọn
    const bonus = Math.round(
      (15 + eco.wave * 6) * (eco.mod?.gold || 1) * (eco.rewardMult || 1),
    );
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
    eco.mod = null; // mod đã tiêu thụ
    openEchoChoice(eco);
  } else if (eco.pendingSpawns.length > 0) {
    // Nhỏ giọt phần còn lại của wave — áp lực liên tục, không chờ dọn sạch
    eco.spawnTick--;
    if (eco.spawnTick <= 0 && alive < cap) {
      const batch = Math.min(2, eco.pendingSpawns.length, cap - alive);
      for (let k = 0; k < batch; k++) {
        spawnFromDesc(eco.pendingSpawns.shift(), eco.wave, player);
      }
      eco.spawnTick = 45; // 0.75s một nhịp
    }
  }

  // HUD: thời gian sống sót — ghi mỗi giây, tránh ghi DOM mỗi frame
  if (eco.wave > 0 && eco.timeFrames % FPS === 0) {
    UI.timer.innerText = `VÒNG LẶP — WAVE ${eco.wave} · ${formatFrames(eco.timeFrames)}`;
  }

  // HUD đếm quái (kèm số đang chờ spawn) — chỉ ghi DOM khi đổi
  const aliveNow = state.ghosts.reduce(
    (n, g) => n + (g.isEchoEnemy ? 1 : 0),
    0,
  );
  const pendingNow = eco.pendingSpawns.length;
  const label = `Quái: ${aliveNow}${pendingNow > 0 ? ` (+${pendingNow})` : ""}`;
  if (label !== eco.lastGhostLabel) {
    eco.lastGhostLabel = label;
    UI.ghosts.innerText = label;
  }
}

// ---- Công thức độ khó ----
// Nguyên tắc: HP có thành phần MŨ sau wave 10 (không trần) để chắc chắn vượt
// power curve của player → mọi run đều kết thúc, leaderboard mới có nghĩa.
// Số lượng/tốc độ có trần (perf + né được), áp lực dồn vào HP + elite + Tái Chiếu.

function lateMult(wave) {
  return Math.pow(1.05, Math.max(0, wave - 10));
}

function concurrentCap(wave) {
  return Math.min(26, 12 + wave); // quái đồng thời trên sân
}

function fodderHp(wave) {
  // 1 hit tới wave 7 (giữ cảm giác cũ), sau đó +1 mỗi 4 wave, nhân mũ về sau
  const base = 1 + Math.max(0, Math.floor((wave - 4) / 4));
  return Math.max(1, Math.round(base * lateMult(wave)));
}

function shooterHp(wave) {
  return Math.round((3 + Math.floor(wave * 0.8)) * lateMult(wave));
}

function buildWave(eco, player) {
  const wave = eco.wave;
  // Mod từ thẻ lựa chọn (nếu chọn thẻ rủi ro) — tiêu thụ cho đúng wave này
  const mod = eco.modNext || {};
  eco.mod = mod;
  eco.modNext = null;

  // === BOSS WAVE mỗi 10 wave — chỉ boss, không quái thường ===
  if (wave % 10 === 0 && wave > 0) {
    eco.pendingSpawns = [];
    spawnEchoBoss(wave);
    setBanner(eco, `⚠ BOSS WAVE ${wave}`);
    return;
  }

  const total = Math.min(
    60,
    Math.round((7 + Math.floor(wave * 2.5)) * (mod.crowd || 1)),
  );
  const shooters = Math.min(8, Math.floor(wave / 2));
  const fodder = Math.max(0, total - shooters);

  eco.pendingSpawns = [];
  for (let i = 0; i < fodder; i++) eco.pendingSpawns.push("fodder");
  for (let i = 0; i < shooters; i++) eco.pendingSpawns.push("shooter");
  // Trộn để shooter không dồn hết về cuối wave
  eco.pendingSpawns.sort(() => Math.random() - 0.5);

  // Elite mỗi 5 wave: "Kẻ Nuốt Vòng Lặp" — trâu, chậm, bounty vàng
  const extraElite = mod.extraElite || 0;
  if (wave % 5 === 0 || extraElite > 0) {
    const elites = (wave % 5 === 0 ? 1 + Math.floor(wave / 15) : 0) + extraElite;
    for (let i = 0; i < elites; i++) eco.pendingSpawns.unshift("elite");
  }

  // Tái Chiếu: từ wave 6, mỗi 3 wave một Bóng Ma cũ quay lại — tua nhanh ×1.25
  if (wave >= 6 && wave % 3 === 0) spawnReEcho(player);

  // Đợt đầu spawn ngay tới cap, phần còn lại nhỏ giọt trong updateEchoWaves
  const initial = Math.min(eco.pendingSpawns.length, concurrentCap(wave));
  for (let k = 0; k < initial; k++) {
    spawnFromDesc(eco.pendingSpawns.shift(), wave, player);
  }
  eco.spawnTick = 45;
  setBanner(eco, `WAVE ${wave}`);
}

function setBanner(eco, text) {
  eco.banner = text;
  eco.bannerTimer = 110;
}

// ---------------------------------------------------------------------------
// BOSS WAVE — tái dùng boss campaign, scale HP theo wave
// ---------------------------------------------------------------------------

const ECHO_BOSS_ROTATION = ["fire", "ice", "earth", "wind", "thunder", "void"];

function spawnEchoBoss(wave) {
  const type =
    ECHO_BOSS_ROTATION[
      (Math.floor(wave / 10) - 1) % ECHO_BOSS_ROTATION.length
    ];
  const boss = createBoss(type);
  if (!boss) return;

  const mult = Math.min(1.5, 0.4 + wave * 0.015);
  boss.maxHp = Math.round((boss.maxHp || boss.hp || 500) * mult);
  boss.hp = boss.maxHp;

  const spawn = getBossSpawnPosition();
  boss.x = spawn.x;
  boss.y = spawn.y;
  boss.moveTargetX = state.player?.x ?? spawn.x;
  boss.moveTargetY = state.player?.y ?? spawn.y;

  state.boss = boss;
  state.currentBossType = type;

  UI.bossUi.style.display = "block";
  UI.bossName.innerText = `${boss.name} — WAVE ${wave}`;
  const iconEl = document.getElementById("boss-icon");
  if (iconEl) iconEl.textContent = boss.icon || "👹";
  if (UI.bossHp) UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";

  state.screenShake = { x: 0, y: 0, timer: 40, intensity: 14 };
  playBGM(`BOSS_${Math.min(5, Math.floor(wave / 10))}`);
}

// Gọi từ main.js khi boss echo gục (update.js trả "BOSS_KILLED") — chơi tiếp,
// KHÔNG nextStage. Wave-clear branch sẽ tự mở thẻ lựa chọn ngay sau đó.
export function handleEchoBossKilled() {
  const eco = state.echo;
  const wave = eco?.wave || 10;
  const bounty = Math.round((50 + wave * 5) * (eco?.rewardMult || 1));
  state.player.coins = (state.player.coins || 0) + bounty;
  state.floatingTexts.push({
    x: state.player.x,
    y: state.player.y - 110,
    text: `👑 BOSS GỤC NGÃ! +${bounty} Vàng`,
    color: "#ffd700",
    size: 26,
    life: 180,
    opacity: 1,
  });
  UI.bossUi.style.display = "none";
  playBGM("PLAYING");
}

// ---------------------------------------------------------------------------
// THẺ LỰA CHỌN GIỮA WAVE — 1 an toàn + 1 rủi ro; game đóng băng khi đang chọn
// ---------------------------------------------------------------------------

const ECHO_SAFE_CHOICES = [
  {
    icon: "❤",
    title: "Hồi Phục",
    desc: "Hồi 2 HP ngay lập tức",
    apply: () => {
      const p = state.player;
      p.hp = Math.min(p.maxHp, p.hp + 2);
      updateHealthUI();
    },
  },
  {
    icon: "🛡",
    title: "Khiên Tạm",
    desc: "+1 khiên chặn 1 đòn bất kỳ",
    apply: () => {
      state.player.shield = (state.player.shield || 0) + 1;
      updateHealthUI();
    },
  },
  {
    icon: "💰",
    title: "Tiền Tươi",
    desc: "+40 vàng ngay lập tức",
    apply: () => {
      state.player.coins = (state.player.coins || 0) + 40;
    },
  },
];

const ECHO_RISKY_CHOICES = [
  {
    icon: "⚔",
    title: "Cơn Lũ",
    desc: "Wave kế +30% quái · thưởng vàng +50%",
    apply: (eco) => {
      eco.modNext = { crowd: 1.3, gold: 1.5 };
    },
  },
  {
    icon: "⚡",
    title: "Tăng Tốc",
    desc: "Wave kế quái nhanh +25% · thưởng vàng ×2",
    apply: (eco) => {
      eco.modNext = { speed: 1.25, gold: 2 };
    },
  },
  {
    icon: "👿",
    title: "Săn Lớn",
    desc: "Wave kế +1 Elite · bounty Elite ×2",
    apply: (eco) => {
      eco.modNext = { extraElite: 1, eliteBounty: 2 };
    },
  },
];

function openEchoChoice(eco) {
  const screen = document.getElementById("screen-echo-choice");
  if (!screen) {
    eco.waveTimer = ECHO.INTERMISSION;
    return;
  }

  const safe =
    ECHO_SAFE_CHOICES[Math.floor(Math.random() * ECHO_SAFE_CHOICES.length)];
  const risky =
    ECHO_RISKY_CHOICES[Math.floor(Math.random() * ECHO_RISKY_CHOICES.length)];

  state.echoChoicePause = true; // update.js đóng băng mô phỏng khi cờ này bật
  screen.classList.remove("hidden");

  const wire = (btnId, choice, accent) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.innerHTML =
      `<div style="font-size:28px">${choice.icon}</div>` +
      `<div style="font-weight:bold;margin:6px 0;color:${accent}">${choice.title}</div>` +
      `<div style="font-size:13px;color:#aab4c8">${choice.desc}</div>`;
    btn.onclick = () => {
      choice.apply(eco);
      screen.classList.add("hidden");
      state.echoChoicePause = false;
      eco.waveTimer = ECHO.INTERMISSION;
      playSound("button");
    };
  };

  wire("echo-choice-a", risky, "#ff5566");
  wire("echo-choice-b", safe, "#00ffcc");
}

function spawnReEcho(player) {
  const runs = loadEchoData().runs;
  if (!runs || runs.length === 0) return;
  const run = runs[Math.floor(Math.random() * runs.length)];
  if (!run.record || run.record.length < ECHO.MIN_RECORD_FRAMES) return;

  const hp = Math.round(Math.min(30, 6 + (run.wave || 0) * 2) * 0.8);
  state.ghosts.push({
    isEchoGhost: true,
    isReEcho: true, // không rơi mộ bia (chặn farm), replay nhanh hơn
    name: null,
    record: run.record,
    graveCoins: 0,
    timer: 0,
    lastIdx: -1,
    speedRate: 1.25,
    x: run.record[0][0],
    y: run.record[0][1],
    radius: 12,
    hp,
    maxHp: hp,
    isStunned: 0,
    spawnProtect: ECHO.GHOST_SPAWN_PROTECT,
    historyPath: [],
  });
  state.floatingTexts.push({
    x: player.x,
    y: player.y - 150,
    text: "⏪ TÁI CHIẾU — quá khứ quay lại nhanh hơn!",
    color: "#ff5599",
    size: 20,
    life: 160,
    opacity: 1,
  });
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

function spawnFromDesc(kind, wave, player) {
  const pt = randomArenaPoint(player);
  const mod = state.echo?.mod || {}; // mod của wave hiện tại (từ thẻ rủi ro)
  const spd = mod.speed || 1;
  if (kind === "elite") {
    // isSubBoss AI (đuổi + bắn), to, trâu, chậm — chết rơi bounty vàng
    const hp = Math.round((20 + wave * 2) * lateMult(wave));
    state.ghosts.push({
      isSubBoss: true,
      isEchoEnemy: true,
      isEchoElite: true,
      x: pt.x,
      y: pt.y,
      radius: 22,
      hp,
      maxHp: hp,
      speed: 0.9 * spd,
      speedRate: 1,
      isStunned: 0,
      historyPath: [],
      color: "#b870ff",
      bounty: (15 + wave) * (mod.eliteBounty || 1),
    });
  } else if (kind === "shooter") {
    // isSubBoss → AI đuổi + bắn có sẵn (update.js nhánh 3), chết theo HP
    const hp = shooterHp(wave);
    state.ghosts.push({
      isSubBoss: true,
      isEchoEnemy: true,
      x: pt.x,
      y: pt.y,
      radius: 15,
      hp,
      maxHp: hp,
      speed: Math.min(2.4, 1.0 + wave * 0.06) * spd,
      speedRate: 1,
      isStunned: 0,
      historyPath: [],
      color: wave % 2 === 0 ? "#ff4400" : "#66ccff",
    });
  } else {
    // isHorde → AI lao thẳng (update.js nhánh 2), HP theo fodderHp()
    const hp = fodderHp(wave);
    state.ghosts.push({
      isHorde: true,
      isEchoEnemy: true,
      x: pt.x,
      y: pt.y,
      radius: 11,
      hp,
      maxHp: hp,
      speed: Math.min(1.75, 0.9 + wave * 0.05) * spd,
      speedRate: 1,
      isStunned: 0,
      historyPath: [],
      timer: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// MAP RIÊNG CỦA VÒNG LẶP — "Vực Thời Gian"
// Nền void tím/cyan + vòng đồng tâm kiểu mặt đồng hồ + nan hoa xoay. Khác hẳn
// map nguyên tố (không dùng theme lửa/băng…). Vòng ngoài = biên arena (chặn player).
// ---------------------------------------------------------------------------

// Nhốt thực thể trong vòng arena — gọi từ update.js cho player.
export function constrainToEchoArena(e, radius = 0) {
  const dx = e.x - ECHO.CX;
  const dy = e.y - ECHO.CY;
  const d = Math.hypot(dx, dy);
  const maxR = ECHO.RADIUS - radius - 8;
  if (d > maxR && d > 0) {
    e.x = ECHO.CX + (dx / d) * maxR;
    e.y = ECHO.CY + (dy / d) * maxR;
  }
}

export function drawEchoBackground(ctx) {
  const cx = ECHO.CX;
  const cy = ECHO.CY;
  const R = ECHO.RADIUS;
  const t = state.frameCount || 0;
  const PI2 = Math.PI * 2;
  const cam = state.camera;

  ctx.save();

  // Nền void bao trùm vùng nhìn (ngoài arena = hư không)
  ctx.fillStyle = "#06060f";
  ctx.fillRect(cam.x - 120, cam.y - 120, cam.width + 240, cam.height + 240);

  // Sàn arena — gradient tím sâu
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, "rgba(48,24,84,0.55)");
  g.addColorStop(0.7, "rgba(22,12,44,0.4)");
  g.addColorStop(1, "rgba(8,6,18,0.05)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, PI2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, PI2);
  ctx.clip(); // mọi thứ dưới đây chỉ trong arena

  // Vòng đồng tâm (các "vòng lặp thời gian")
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 6; i++) {
    ctx.strokeStyle = `rgba(184,112,255,${0.05 + (i % 2) * 0.035})`;
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 6, 0, PI2);
    ctx.stroke();
  }

  // Nan hoa xoay (kim đồng hồ)
  const rot = t * 0.002;
  ctx.strokeStyle = "rgba(0,255,204,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * PI2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }

  // Vạch tick sát biên (mặt đồng hồ)
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * PI2;
    const big = i % 5 === 0;
    const r1 = R - (big ? 28 : 14);
    ctx.strokeStyle = big ? "rgba(0,255,204,0.25)" : "rgba(184,112,255,0.15)";
    ctx.lineWidth = big ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
    ctx.stroke();
  }

  ctx.restore(); // bỏ clip

  // Biên arena — vành sáng đôi (đây là "tường" chặn player)
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#b870ff";
  ctx.strokeStyle = `rgba(184,112,255,${0.45 + Math.sin(t * 0.05) * 0.15})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, PI2);
  ctx.stroke();
  // vòng gạch xoay bên trong
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,255,204,0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([22, 16]);
  ctx.lineDashOffset = -t * 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 10, 0, PI2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// BANNER giữa màn hình (thay floating text nhỏ)
// ---------------------------------------------------------------------------
export function drawEchoBanner(ctx, canvas) {
  const eco = state.echo;
  if (!eco || !eco.banner || eco.bannerTimer <= 0) return;

  const t = eco.bannerTimer;
  // Fade in nhanh, giữ, fade out
  const alpha = t > 90 ? (110 - t) / 20 : t < 25 ? t / 25 : 1;
  const isBoss = eco.banner.includes("BOSS");
  const color = isBoss ? "#ff5566" : "#b870ff";

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = "center";
  ctx.font = "bold 52px Orbitron, sans-serif";
  ctx.shadowBlur = 24;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillText(eco.banner, canvas.width / 2, canvas.height / 2 - 40);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// BÓNG MA CHẾT → MỘ BIA (gọi từ update.js)
// reason: "killed" (bị diệt) | "expired" (record hết = lặp lại cái chết cũ)
// ---------------------------------------------------------------------------

export function onEchoGhostDeath(g, reason) {
  // Tái Chiếu không rơi mộ bia — tránh farm vàng từ cùng một run
  const graveCoins = g.isReEcho ? 0 : g.graveCoins || 10;
  if (graveCoins > 0) {
    state.echoGraves.push({
      x: g.x,
      y: g.y,
      coins: graveCoins,
      pulse: 0,
    });
  }
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
    // Chia sẻ record cho matchmaking (server chỉ giữ 2 run wave cao nhất/user)
    if (newGhostCreated && eco.wave >= ECHO.REMOTE_UNLOCK_WAVE) {
      uploadEchoGhost({
        wave: eco.wave,
        timeFrames: eco.timeFrames,
        characterId: state.selectedCharacter,
        record: encodeRecord(rec),
      });
    }
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
      (isAuthenticated()
        ? `<br><span id="echo-gameover-rank" style="color:#8899aa">🏆 Đang tính hạng toàn cầu…</span>`
        : `<br><span style="color:#8899aa">Đăng nhập để ghi danh bảng xếp hạng.</span>`) +
      (info.newGhostCreated
        ? '<br><br><span style="color:#8899aa">Run này đã trở thành một Bóng Ma — nó sẽ chờ bạn ở vòng lặp sau.</span>'
        : "");

    if (isAuthenticated()) showGlobalRank(info.eco);
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

// Hạng toàn cầu: đếm số người điểm cao hơn mình trong top 20 → rank
async function showGlobalRank(eco) {
  const myScore =
    eco.wave * 100000 + Math.min(Math.floor(eco.timeFrames / 60), 99999);
  const rows = await fetchEchoLeaderboard();
  const el = document.getElementById("echo-gameover-rank");
  if (!el) return;
  if (!rows) {
    el.textContent = "🏆 Không kết nối được bảng xếp hạng.";
    return;
  }
  const better = rows.filter((r) => (r.echoBest?.score || 0) > myScore).length;
  if (better >= rows.length && rows.length >= 20) {
    el.innerHTML = `🏆 Ngoài top 20 toàn cầu — leo tiếp!`;
  } else {
    const rank = better + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏆";
    el.innerHTML = `${medal} Hạng <b style="color:#ffd700">#${rank}</b> toàn cầu`;
  }
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

    // Note cơ chế remote ghost — đổi theo tiến trình + toggle
    let remoteLine;
    if (data.remoteEnabled === false) {
      remoteLine = `<span style="color:#ff8866">🚫 Bóng Ma người chơi khác: ĐÃ TẮT — chỉ Bóng Ma của bạn · thưởng vàng ×${ECHO.SOLO_REWARD_MULT}.</span>`;
    } else if (data.runs.length === 0) {
      remoteLine = `<span style="color:#8899aa">👻 Run đầu tiên của bạn sẽ trở thành Bóng Ma đầu tiên trong arena.</span>`;
    } else if ((data.bestWave || 0) < ECHO.REMOTE_UNLOCK_WAVE) {
      remoteLine = `<span style="color:#8899aa">🔒 Đạt <b style="color:#ffaa44">Wave ${ECHO.REMOTE_UNLOCK_WAVE}</b> để Bóng Ma của NGƯỜI CHƠI KHÁC bắt đầu xâm nhập arena của bạn.</span>`;
    } else {
      remoteLine = `<span style="color:#ffaa44">🌐 Bóng Ma người chơi khác: ĐANG MỞ — tối đa ${ECHO.MAX_REMOTE} run thật từ người lạ cùng trình độ.</span>`;
    }

    stats.innerHTML =
      `Kỷ lục: <b style="color:#b870ff">Wave ${data.bestWave || 0}</b> — <b style="color:#00ffcc">${formatFrames(data.bestTimeFrames)}</b>` +
      `<br>Bóng Ma đang chờ: <b>${data.runs.length}</b>` +
      (nemesis && (nemesis.wave || 0) >= 2
        ? `<br><span style="color:#ffd700">👑 Nemesis: Bóng Ma Wave ${nemesis.wave} đang trấn giữ arena</span>`
        : "") +
      `<br><br>${remoteLine}`;
  }

  // Danh sách Bóng Ma đang chờ — wave, nhân vật, thời điểm
  const listEl = document.getElementById("echo-menu-runs");
  if (listEl) {
    const nemesis = getNemesisRun(data.runs);
    if (data.runs.length === 0) {
      listEl.innerHTML = `<div style="color:#8899aa;padding:10px;text-align:center">Chưa có Bóng Ma nào.</div>`;
    } else {
      listEl.innerHTML = [...data.runs]
        .sort((a, b) => (b.date || 0) - (a.date || 0))
        .map((r) => {
          const ch = CHARACTERS.find((c) => c.id === r.characterId);
          const isN = r === nemesis && (r.wave || 0) >= 2;
          return (
            `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid rgba(255,255,255,0.06)">` +
            `<span style="width:26px">${isN ? "👑" : "👻"}</span>` +
            `<span style="flex:1;text-align:left;color:${isN ? "#ffd700" : "#cfd6e6"}">Wave ${r.wave || 0} · ${formatFrames(r.timeFrames)}</span>` +
            `<span style="width:110px;color:#8899aa;font-size:12px">${escapeHtml(ch?.name || "?")}</span>` +
            `<span style="width:80px;color:#667;font-size:11px">${timeAgo(r.date)}</span>` +
            `</div>`
          );
        })
        .join("");
    }
  }

  // Toggle Bóng Ma người chơi khác (mặc định BẬT; tắt → thưởng ×SOLO_REWARD_MULT)
  const renderRemoteToggle = () => {
    const on = data.remoteEnabled !== false;
    const btn = document.getElementById("btn-echo-remote-toggle");
    const hint = document.getElementById("echo-remote-hint");
    if (btn) {
      btn.textContent = on ? "BẬT" : "TẮT";
      btn.style.color = on ? "#00ffcc" : "#ff8866";
      btn.style.borderColor = on
        ? "rgba(0,255,204,0.5)"
        : "rgba(255,136,102,0.5)";
    }
    if (hint) {
      // Breakdown slot để người chơi hiểu số Bóng Ma từ đâu ra
      const ownWhenOn = ECHO.MAX_RUNS - ECHO.MAX_REMOTE; // 3 slot mình khi bật remote
      hint.innerHTML = on
        ? `Tối đa <b style="color:#cfd6e6">${ECHO.MAX_RUNS}</b> Bóng Ma: 👑 Nemesis + ${ownWhenOn - 1} run gần nhất + tối đa <b style="color:#ffaa44">${ECHO.MAX_REMOTE}</b> người lạ cùng trình · <b style="color:#00ffcc">100% thưởng</b>`
        : `Tối đa <b style="color:#cfd6e6">${ECHO.MAX_RUNS}</b> Bóng Ma: 👑 Nemesis + ${ECHO.MAX_RUNS - 1} run gần nhất của BẠN · thưởng <b style="color:#ff8866">×${ECHO.SOLO_REWARD_MULT}</b> — bật để nhận đủ`;
    }
  };
  renderRemoteToggle();

  const toggleBtn = document.getElementById("btn-echo-remote-toggle");
  if (toggleBtn)
    toggleBtn.onclick = () => {
      data.remoteEnabled = data.remoteEnabled === false; // đảo
      saveEchoData();
      renderRemoteToggle();
      playSound("button");
    };

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

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`;
  return `${Math.floor(s / 86400)} ngày`;
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
