import { state } from "../../state.js";
import {
  FPS,
  BOSS_ATTACK_INTERVAL,
  BOSS_MOVE_SPEED_MULTIPLIER,
  BOSS_SPECIAL_CAST_TIME_MULTIPLIER,
  BOSS_SPECIAL_COOLDOWN_BASE,
  BOSS_SPECIAL_COOLDOWN_VARIANCE,
} from "../../config.js";
import { SPECIAL_SKILLS, ATTACK_MODES } from "./patterns.js";

function getBossSkillCooldown() {
  return (
    BOSS_SPECIAL_COOLDOWN_BASE +
    Math.random() * BOSS_SPECIAL_COOLDOWN_VARIANCE
  );
}

function getBossCastTime(frames) {
  return Math.ceil(frames * BOSS_SPECIAL_CAST_TIME_MULTIPLIER);
}

function getBossPhase(boss) {
  if (!boss || !boss.maxHp) return 0;
  const r = (boss.hp || 0) / boss.maxHp;

  if (boss.phaseCount === 5) {
    if (r > 0.8) return 0;
    if (r > 0.6) return 1;
    if (r > 0.4) return 2;
    if (r > 0.2) return 3;
    return 4; // Giai đoạn cuối
  }

  if (boss.phaseCount === 3) {
    if (r > 0.6) return 0;
    if (r > 0.3) return 1;
    return 2;
  }
  return r > 0.5 ? 0 : 1;
}

export const BOSS_TYPES = {
  fire: {
    name: "Hỏa Vương",
    hp: 600,
    maxHp: 600,
    speed: 2,
    color: "#ff4400",
    originalColor: "#ff4400",
    icon: "🔥",
    phases: [
      { attackModes: [0, 1, 2], special: ["Inferno Pulse", "Flame Pillar"], speedMult: 1.0 },
      { attackModes: [3, 4], special: ["Meteor Strike", "Magma Splash", "Eruption Wall"], speedMult: 1.3 },
      { attackModes: [0, 2, 4], special: ["Inferno Pulse", "Flame Pillar", "Meteor Strike", "Magma Splash", "Eruption Wall"], ultimate: "SUPERNOVA", speedMult: 1.6 },
    ],
  },

  earth: {
    name: "Địa Chấn Vương",
    hp: 800,
    maxHp: 800,
    speed: 1.2,
    color: "#8b4513",
    originalColor: "#8b4513",
    elementColor: "#d2b48c",
    icon: "⛰️",
    phases: [
      { attackModes: [15, 16], special: ["Seismic Rift", "Rock Prison"], speedMult: 1.0 },
      { attackModes: [17, 18], special: ["Earth Spikes", "Boulder Roll", "Tectonic Slam"], speedMult: 1.3 },
      { attackModes: [16, 18], special: ["Seismic Rift", "Rock Prison", "Earth Spikes", "Boulder Roll", "Tectonic Slam"], ultimate: "EARTHQUAKE", speedMult: 1.5 },
    ],
  },

  ice: {
    name: "Băng Hậu",
    hp: 500,
    maxHp: 500,
    speed: 1.8,
    color: "#00ffff",
    originalColor: "#00ffff",
    elementColor: "#aaffff",
    icon: "❄️",
    phases: [
      { attackModes: [5, 6], special: ["Frost Nova", "Blizzard Barrage"], speedMult: 1.0 },
      { attackModes: [7, 8], special: ["Icicle Rain", "Frozen Wall", "Permafrost"], speedMult: 1.4 },
      { attackModes: [6, 8], special: ["Frost Nova", "Blizzard Barrage", "Icicle Rain", "Frozen Wall", "Permafrost"], ultimate: "GLACIAL AGE", speedMult: 1.6 },
    ],
  },

  wind: {
    name: "Phong Thần",
    hp: 450,
    maxHp: 450,
    speed: 3.2,
    color: "#00ffcc",
    originalColor: "#00ffcc",
    elementColor: "#ccfff5",
    icon: "🌪️",
    phases: [
      { attackModes: [20, 21], special: ["Cyclone Barrage", "Blade Gale"], speedMult: 1.0 },
      { attackModes: [22, 23], special: ["Vacuum Wave", "Typhoon Eye", "Air Shatter"], speedMult: 1.5 },
      { attackModes: [21, 23], special: ["Cyclone Barrage", "Blade Gale", "Vacuum Wave", "Typhoon Eye", "Air Shatter"], ultimate: "HURRICANE", speedMult: 2.0 },
    ],
  },

  thunder: {
    name: "Lôi Thần",
    hp: 550,
    maxHp: 550,
    speed: 2.8,
    color: "#ffff00",
    originalColor: "#ffff00",
    elementColor: "#ffffaa",
    icon: "⚡",
    phases: [
      { attackModes: [10, 11], special: ["Tesla Field", "Ball Lightning"], speedMult: 1.0 },
      { attackModes: [12, 13], special: ["Chain Lightning", "EMP Burst", "Ionized Field"], speedMult: 1.5 },
      { attackModes: [11, 13], special: ["Tesla Field", "Ball Lightning", "Chain Lightning", "EMP Burst", "Ionized Field"], ultimate: "HEAVEN'S WRATH", speedMult: 1.8 },
    ],
  },

  omni: {
    name: "Chúa Tể Nguyên Tố",
    hp: 800,
    maxHp: 800,
    speed: 2.5,
    color: "#ffffff",
    originalColor: "#ffffff",
    elementColor: "#ff00ff",
    icon: "👑",
    phaseCount: 5,
    phases: [
      { attackModes: [1, 21], special: ["Omni_SpatialMatrix"], speedMult: 1.0 },
      {
        attackModes: [6, 16],
        special: ["Omni_SpatialMatrix", "Omni_PrismaticMeteors"],
        speedMult: 1.2,
      },
      {
        attackModes: [11, 20],
        special: [
          "Omni_SpatialMatrix",
          "Omni_PrismaticMeteors",
          "Omni_MirageAssault",
        ],
        speedMult: 1.4,
      },
      {
        attackModes: [8, 13, 23],
        special: [
          "Omni_SpatialMatrix",
          "Omni_PrismaticMeteors",
          "Omni_MirageAssault",
          "Omni_EternalCarousel",
        ],
        speedMult: 1.6,
      },
      {
        attackModes: [30, 31, 32],
        special: [
          "Omni_SpatialMatrix",
          "Omni_PrismaticMeteors",
          "Omni_MirageAssault",
          "Omni_EternalCarousel",
          "OMNI_DOOMSDAY_ARENA",
        ],
        ultimate: "OMNI_DOOMSDAY_ARENA",
        speedMult: 2.0,
      },
    ],
  },
  void: {
    name: "Hư Không Chúa",
    hp: 900,
    maxHp: 900,
    speed: 2.2,
    color: "#5500aa",
    originalColor: "#5500aa",
    icon: "🌌",
    phases: [
      {
        attackModes: [70, 34],
        special: ["DARK_MATTER_BEAM", "ECLIPSE_RING", "ABYSSAL_RIFT"],
        speedMult: 1.0,
      },
      {
        attackModes: [71, 35],
        special: ["GRAVITY_CRUSH", "COSMIC_FRACTURE", "SINGULARITY_BOMB", "NULL_ZONE"],
        speedMult: 1.3,
      },
      {
        attackModes: [70, 71, 36],
        special: [
          "DARK_MATTER_BEAM",
          "ECLIPSE_RING",
          "ABYSSAL_RIFT",
          "GRAVITY_CRUSH",
          "COSMIC_FRACTURE",
          "SINGULARITY_BOMB",
          "NULL_ZONE",
          "STAR_DEVOURER",
        ],
        ultimate: "EVENT_HORIZON",
        speedMult: 1.8,
      },
    ],
  },

  glitch: {
    name: "Mã Lỗi Vĩnh Cửu (ERROR_404)",
    hp: 500,
    maxHp: 500,
    speed: 1.8,
    color: "#00ffff",
    originalColor: "#00ffff",
    icon: "👾",
    phases: [
      {
        attackModes: [80, 40], // Đạn thường
        // Phase 1 xài 3 chiêu cơ bản
        special: [
          "GLITCH_MEMORY_LEAK",
          "GLITCH_SYNTAX_ERROR",
          "GLITCH_PACKET_LOSS",
        ],
        speedMult: 1.0,
      },
      {
        attackModes: [81, 39], // Đạn thường
        // Phase 2 xài 4 chiêu khác gắt hơn
        special: [
          "GLITCH_FIREWALL_BREACH",
          "GLITCH_DEAD_PIXEL_STORM",
          "GLITCH_DDOS_ATTACK",
          "GLITCH_FATAL_EXCEPTION",
        ],
        speedMult: 1.4,
      },
      {
        attackModes: [80, 81],
        // Phase cuối: Xoay tua ĐẦY ĐỦ 10 CHIÊU ngẫu nhiên
        special: [
          "GLITCH_MEMORY_LEAK",
          "GLITCH_SYNTAX_ERROR",
          "GLITCH_FIREWALL_BREACH",
          "GLITCH_TROJAN_HORSE",
          "GLITCH_BUFFER_OVERFLOW",
          "GLITCH_DEAD_PIXEL_STORM",
          "GLITCH_PACKET_LOSS",
          "GLITCH_DDOS_ATTACK",
          "GLITCH_FATAL_EXCEPTION",
          "GLITCH_CORRUPTED_SECTOR",
        ],
        ultimate: "ENTITY_KERNEL_PANIC",
        speedMult: 1.8,
      },
    ],
  },
};

export function createBoss(type) {
  const cfg = BOSS_TYPES[type];
  if (!cfg) return null;
  return {
    ...cfg,
    x: state.player ? state.player.x + 400 : 1500,
    y: state.player ? state.player.y - 300 : 1350,
    radius: 45,
    attackTimer: 0,
    moveTimer: 0,
    moveTargetX: state.player ? state.player.x : 1500,
    moveTargetY: state.player ? state.player.y : 1350,
    shield: 0,
    maxShield: 0,
    shieldActive: false,
    stunTimer: 0,
    ultimatePhase: false,
    bossType: type,
    phaseCount: cfg.phaseCount || 3,
    skillCooldown: 120,
    summonCooldown: 10 * 60,
  };
}

export function updateBoss(boss) {
  // Nếu boss hết máu thì dừng update các hành động thường,
  // nhường cho file update.js lo việc văng tiền hoặc hóa The Entity
  if (boss.hp <= 0) return;

  if (boss.stunTimer > 0) return;

  boss.attackTimer++;
  boss.moveTimer++;

  // Movement
  if (boss.moveTimer % 120 === 0) {
    boss.moveTargetX =
      state.player.x +
      (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 200);
    boss.moveTargetY =
      state.player.y +
      (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 200);

    boss.moveTargetX = Math.max(
      100,
      Math.min(state.world.width - 100, boss.moveTargetX),
    );
    boss.moveTargetY = Math.max(
      100,
      Math.min(state.world.height - 100, boss.moveTargetY),
    );
  }

  const phaseIdx = getBossPhase(boss);
  
  // [CỰC KỲ QUAN TRỌNG] Reset Cooldown ngay lập tức khi Boss chuyển Phase
  if (boss.currentPhaseIndex === undefined) boss.currentPhaseIndex = phaseIdx;
  if (boss.currentPhaseIndex !== phaseIdx) {
      boss.currentPhaseIndex = phaseIdx;
      boss.skillCooldown = 0; // Sang Phase mới là xả chiêu luôn, không chờ đợi!
  }

  const speed =
    boss.speed *
    (boss.phases[phaseIdx]?.speedMult || 1.0) *
    BOSS_MOVE_SPEED_MULTIPLIER;
  boss.x += (boss.moveTargetX - boss.x) * 0.02 * speed;
  boss.y += (boss.moveTargetY - boss.y) * 0.02 * speed;

  // Xử lý khi đang gồng chiêu
  if (state.bossSpecial && state.bossSpecial.timer > 0) {
    state.bossSpecial.timer--;

    if (state.bossSpecial.timer === 0) {
      boss.shieldActive = false;
      if (SPECIAL_SKILLS[state.bossSpecial.name])
        SPECIAL_SKILLS[state.bossSpecial.name](boss);
      state.bossSpecial.name = "";

      boss.skillCooldown = getBossSkillCooldown();
    }
    return;
  }
  
  // NẾU GIÁP BỊ PHÁ (chiêu bị hủy, bossSpecial.name === ""): Cần reset lại cooldown để boss bừng tỉnh
  if (boss.skillCooldown <= 0 && state.bossSpecial && state.bossSpecial.name === "") {
     boss.skillCooldown = getBossSkillCooldown();
     state.bossSpecial = null; // Dọn dẹp sạch sẽ
  }

  if (boss.skillCooldown > 0) {
    boss.skillCooldown--;
  }

  if (boss.skillCooldown <= 0) {
    const phase = boss.phases[phaseIdx];
    let nextSkill = "";

    if (phase.ultimate && (!boss.ultimatePhase || Math.random() < 0.4)) {
      nextSkill = Array.isArray(phase.ultimate)
        ? phase.ultimate[Math.floor(Math.random() * phase.ultimate.length)]
        : phase.ultimate;
    } else if (phase.special) {
      nextSkill = Array.isArray(phase.special)
        ? phase.special[Math.floor(Math.random() * phase.special.length)]
        : phase.special;
    }

    if (nextSkill) {
      const isUlt =
        phase.ultimate === nextSkill ||
        (Array.isArray(phase.ultimate) && phase.ultimate.includes(nextSkill));
      const castTime = getBossCastTime(isUlt ? 120 : 90);
      state.bossSpecial = {
        name: nextSkill,
        timer: castTime,
        duration: castTime,
        type: isUlt ? "ULTIMATE" : "SPECIAL",
        color: boss.color,
      };

      boss.shield = isUlt ? 150 : 100;
      boss.maxShield = boss.shield;
      boss.shieldActive = true;
      return;
    }
  }

  if (
    boss.attackTimer % BOSS_ATTACK_INTERVAL === 0 &&
    state.delayedTasks.length < 5
  ) {
    const modes = boss.phases[phaseIdx].attackModes || [0];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    if (ATTACK_MODES[mode]) ATTACK_MODES[mode](boss);
  }
}
