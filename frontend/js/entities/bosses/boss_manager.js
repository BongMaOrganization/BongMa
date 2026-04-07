import { state } from "../../state.js";
import { FPS } from "../../config.js";
import { SPECIAL_SKILLS, ATTACK_MODES } from "./patterns.js";

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
        name: "Hỏa Vương", hp: 600, maxHp: 600, speed: 2, color: "#ff4400", originalColor: "#ff4400",
        icon: "🔥",
        phases: [
            { attackModes: [0, 1, 2], special: "Inferno Pulse", speedMult: 1.0 },
            { attackModes: [3, 4], special: "Meteor Strike", speedMult: 1.3 },
            { attackModes: [0, 2, 4], ultimate: "SUPERNOVA", speedMult: 1.6 },
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
            { attackModes: [15, 16], special: "Seismic Rift", speedMult: 1.0 },
            { attackModes: [17, 18], special: "Earth Spikes", speedMult: 1.3 },
            { attackModes: [16, 18], ultimate: "EARTHQUAKE", speedMult: 1.5 },
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
            { attackModes: [5, 6], special: "Frost Nova", speedMult: 1.0 },
            { attackModes: [7, 8], special: "Icicle Rain", speedMult: 1.4 },
            { attackModes: [6, 8], ultimate: "GLACIAL AGE", speedMult: 1.6 },
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
            { attackModes: [20, 21], special: "Cyclone Barrage", speedMult: 1.0 },
            { attackModes: [22, 23], special: "Vacuum Wave", speedMult: 1.5 },
            // THÊM MỚI:
            { attackModes: [21, 23], ultimate: "HURRICANE", speedMult: 2.0 },
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
            { attackModes: [10, 11], special: "Tesla Field", speedMult: 1.0 },
            { attackModes: [12, 13], special: "Chain Lightning", speedMult: 1.5 },
            // THÊM MỚI:
            { attackModes: [11, 13], ultimate: "HEAVEN'S WRATH", speedMult: 1.8 },
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
        icon: "🌀",

        phases: [
            {
                attackModes: [33, 34],
                special: "Void Prison",
                speedMult: 1.0,
            },
            {
                attackModes: [35, 36],
                special: "Gravity Well",
                speedMult: 1.3,
            },
            {
                attackModes: [33, 35, 36],
                special: ["Void Prison", "Gravity Well"],
                ultimate: "EVENT HORIZON",
                speedMult: 1.8,
            },
        ],
    },

    glitch: {
        name: "Mã Lỗi Vĩnh Cửu (ERROR_404)",
        hp: 111,
        maxHp: 111,
        speed: 1.0,
        color: "#000000",
        originalColor: "#000000",
        icon: "👾",

        phases: [
            {
                attackModes: [37, 38],
                special: "Visual_Glitch_Matrix",
                speedMult: 1.0,
            },
            { attackModes: [39, 40], special: "Control_Corruption", speedMult: 1.4 },
            {
                attackModes: [37, 38, 39, 40],
                special: ["Visual_Glitch_Matrix", "Control_Corruption"],
                ultimate: "SYSTEM_REBOOT_FAILURE",
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
        radius: 45, attackTimer: 0, moveTimer: 0,
        moveTargetX: state.player ? state.player.x : 1500,
        moveTargetY: state.player ? state.player.y : 1350,
        shield: 0, maxShield: 0, shieldActive: false, stunTimer: 0,
        ultimatePhase: false, bossType: type, phaseCount: cfg.phaseCount || 3,
        skillCooldown: 180, summonCooldown: 10 * 60,
    };
}

export function updateBoss(boss) {

    if (boss.entityPhase) {
        boss.entityTimer--;

        if (state.frameCount % 20 === 0) {
            ATTACK_MODES[60](boss);
        }

        if (state.frameCount % 40 === 0) {
            ATTACK_MODES[61](boss);
        }

        if (boss.entityTimer <= 0) {
            boss.entityPhase = false; // 🔥 cực quan trọng
            boss.hp = 0;
        }

        return;
    }

    if (boss.hp <= 0 && !boss.entityPhase && !boss.entityTriggered) {
        boss.entityPhase = true;
        boss.entityTriggered = true;

        boss.hp = boss.maxHp = 999999;
        boss.entityTimer = 40 * FPS;

        boss.name = "The Entity";
        boss.color = "#ffffff";

        state.screenShake.timer = 60;
        state.screenShake.intensity = 10;

        state.bullets = [];

        return;
    }
    if (boss.stunTimer > 0) return;

    boss.attackTimer++;
    boss.moveTimer++;

    // Movement
    if (boss.moveTimer % 120 === 0) {
        boss.moveTargetX = state.player.x + (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 200);
        boss.moveTargetY = state.player.y + (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 200);

        boss.moveTargetX = Math.max(100, Math.min(state.world.width - 100, boss.moveTargetX));
        boss.moveTargetY = Math.max(100, Math.min(state.world.height - 100, boss.moveTargetY));
    }

    const phaseIdx = getBossPhase(boss);
    const speed = boss.speed * (boss.phases[phaseIdx]?.speedMult || 1.0);
    boss.x += (boss.moveTargetX - boss.x) * 0.02 * speed;
    boss.y += (boss.moveTargetY - boss.y) * 0.02 * speed;

    if (state.bossSpecial.timer > 0) {
        state.bossSpecial.timer--;

        if (state.bossSpecial.timer === 0) {
            boss.shieldActive = false;
            if (SPECIAL_SKILLS[state.bossSpecial.name])
                SPECIAL_SKILLS[state.bossSpecial.name](boss);
            state.bossSpecial.name = "";

            boss.skillCooldown = 400 + Math.random() * 100;
        }
        return;
    }

    if (boss.skillCooldown > 0) {
        boss.skillCooldown--;
    }

    if (boss.skillCooldown <= 0) {
        const phase = boss.phases[phaseIdx];
        let nextSkill = "";

        if (phase.ultimate && Math.random() < 0.4) {
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
            state.bossSpecial = {
                name: nextSkill,
                timer: isUlt ? 120 : 90,
                duration: isUlt ? 120 : 90,
                type: isUlt ? "ULTIMATE" : "SPECIAL",
                color: boss.color,
            };

            boss.shield = isUlt ? 150 : 100;
            boss.maxShield = boss.shield;
            boss.shieldActive = true;
            return;
        }
    }

    if (boss.attackTimer % 60 === 0 && state.delayedTasks.length < 5) {
        const modes = boss.phases[phaseIdx].attackModes || [0];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        if (ATTACK_MODES[mode]) ATTACK_MODES[mode](boss);
    }
}