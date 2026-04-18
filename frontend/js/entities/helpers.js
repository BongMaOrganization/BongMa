import { state } from "../state.js";

const PLAYER_BULLET_VISUALS = {
    speedster: "speedster_lightning",
    ghost: "ghost_wisp",
    warden: "warden_sigil",
    engineer: "engineer_plasma",
    druid: "druid_seed",
    brawler: "brawler_impact",
    mage: "mage_fire",
    assassin: "assassin_blade",
    hunter: "hunter_bolt",
    frost: "frost_crystal",
    gunner: "gunner_round",
    knight: "knight_blade",
    oracle: "oracle_eye",
    alchemist: "alchemist_flask",
    sharpshooter: "sharpshooter_mark",
    berserker: "berserker_rage",
    summoner: "summoner_soul",
    sniper: "sniper_round",
    spirit: "spirit_orb",
    timekeeper: "timekeeper_space",
    void: "void_shard",
    storm: "storm_bolt",
    reaper: "reaper_soul",
    phoenix: "phoenix_fire",
    scout: "scout_arc",
    medic: "medic_serum",
    tank: "tank_fortress",
};

// Các hàm bổ trợ cốt lõi cho việc tạo vật thể trong game
export function spawnBullet(sx, sy, tx, ty, isPlayer, style = 0, source = "enemy", damage = 1) {
    const angle = Math.atan2(ty - sy, tx - sx);
    const speed = isPlayer ? 10 : 4.5;
    const ownerCharacter = isPlayer ? state.player?.characterId : null;
    const finalDamage =
        isPlayer && ownerCharacter === "knight" && (state.activeBuffs?.r || 0) > 0
            ? damage + 0.5
            : damage;
    state.bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        isPlayer,
        radius: isPlayer ? 4 : 8,
        life: isPlayer ? 130 : 220,
        style,
        damage: finalDamage,
        ownerCharacter,
        visualStyle: PLAYER_BULLET_VISUALS[ownerCharacter] || null,
        bounces: isPlayer ? state.player.bounces || 0 : 0,
        pierce: isPlayer ? state.player.pierce || false : false,
    });
}

export function spawnHazard(type, x, y, radius = 40, duration = 300, damage = 0.5, owner = "boss", targetRadius = 0) {
    state.hazards.push({
        x, y, radius, type, life: duration, maxLife: duration, damage, owner,
        targetRadius: targetRadius || radius,
        expanding: targetRadius > radius,
        firstEnterTime: 0,
        active: type !== "rock",
    });
}

export function spawnBeam(x1, y1, x2, y2, chargeTime, fireTime) {
    const beam = { x1, y1, x2, y2, state: "charge", timer: chargeTime + fireTime, chargeTime, fireTime };
    state.bossBeams.push(beam);
    state.delayedTasks.push({ delay: chargeTime, action: () => { beam.state = "fire"; } });
    state.delayedTasks.push({
        delay: chargeTime + fireTime,
        action: () => {
            const idx = state.bossBeams.indexOf(beam);
            if (idx > -1) state.bossBeams.splice(idx, 1);
        },
    });
}

export function spawnWarning(x, y, radius, duration, type = "laser") {
    state.groundWarnings.push({ x, y, radius, timer: duration, maxTimer: duration, type });
}

export function spawnSafeZone(x, y, radius, life, options = {}) {
    state.safeZones.push({
        x, y, radius, life, maxLife: life,
        vx: options.vx || 0,
        vy: options.vy || 0,
        shrinking: options.shrinking !== false,
    });
}

export function spawnMeteor(tx, ty, destX, destY) {
    state.bullets.push({
        x: tx, y: ty, destX: destX, destY: destY, vx: 0, vy: 25,
        radius: 35, isMeteor: true, life: 120, isPlayer: false, style: 1,
    });
}
