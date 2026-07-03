import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { spawnMiniBoss } from "../entities/miniBosses.js";

export { spawnMiniBoss };

export function spawnCrate() {
    const maxCrates = 10;
    if (state.crates.length >= maxCrates) return;

    let x, y, overlap;
    let attempts = 0;
    const radius = 25;

    do {
        overlap = false;
        x = radius + 50 + Math.random() * (state.world.width - radius * 2 - 100);
        y = radius + 50 + Math.random() * (state.world.height - radius * 2 - 100);

        // Tránh swarmZones (né xa thêm 50px cho an toàn)
        if (state.swarmZones) {
            for (const zone of state.swarmZones) {
                if (dist(x, y, zone.x, zone.y) < zone.radius + radius + 50) {
                    overlap = true;
                    break;
                }
            }
        }

        // Tránh các thùng khác
        if (!overlap && state.crates) {
            for (const crate of state.crates) {
                if (dist(x, y, crate.x, crate.y) < radius * 2 + 20) {
                    overlap = true;
                    break;
                }
            }
        }

        // Tránh người chơi lúc spawn (bán kính 200px)
        if (!overlap && state.player && dist(x, y, state.player.x, state.player.y) < 200) {
            overlap = true;
        }

        attempts++;
    } while (overlap && attempts < 50);

    if (!overlap) {
        const rewards = ["GOLD", "XP", "FIRE_RATE", "HP_REGEN"];
        const type = rewards[Math.floor(Math.random() * rewards.length)];
        const hp = 1 + Math.floor(Math.random() * 5);

        state.crates.push({
            id: `crate_${Date.now()}_${Math.random()}`,
            x,
            y,
            radius,
            hp: hp,
            maxHp: hp,
            type: type,
        });
    }
}

export function spawnCapturePoint() {
    let x, y, overlap;
    let attempts = 0;
    const radius = 800; // Vòng tròn ban đầu (Giảm từ 1000 xuống 800)

    do {
        overlap = false;
        // Spawn xa người chơi và tránh các vùng swarm/crate cũ
        x = radius + 200 + Math.random() * (state.world.width - radius * 2 - 400);
        y = radius + 200 + Math.random() * (state.world.height - radius * 2 - 400);

        // Tránh swarmZones
        for (const sz of state.swarmZones) {
            if (dist(x, y, sz.x, sz.y) < radius + sz.radius + 200) {
                overlap = true;
                break;
            }
        }

        // Tránh các Capture Point khác
        if (!overlap && state.capturePoints) {
            for (const cp of state.capturePoints) {
                if (dist(x, y, cp.x, cp.y) < 1500) {
                    overlap = true;
                    break;
                }
            }
        }

        // Tránh người chơi
        if (!overlap && state.player && dist(x, y, state.player.x, state.player.y) < 800) {
            overlap = true;
        }
        attempts++;
    } while (overlap && attempts < 200);

    if (!overlap) {
        const id = `cp_${Date.now()}`;
        const type = Math.random() > 0.5 ? "fortress" : "shrine";

        state.capturePoints.push({
            id,
            x,
            y,
            radius,
            maxRadius: radius,
            minRadius: radius * 0.3, // Cứ điểm thu hẹp tối đa còn 30% cho kịch tính
            progress: 0,
            totalProgress: 350, // Tăng thời gian chiếm đóng (từ 100 lên 350)
            type,
            state: "guarding",
            miniBossId: id + "_boss",
            lastPulseTime: 0,
            laserAngle: 0,
            lastGhostAttractTime: 0,
            rewardType: ["NUKE", "GOD_MODE", "SATELLITE", "RARE_TICKET", "EPIC_TICKET"][Math.floor(Math.random() * 5)],
        });

        // Spawn Mini-Boss hơi lệch ra một chút để không bị đè lên Trụ
        spawnMiniBoss(x + 100, y + 100, id + "_boss", null, 1);
    }
}

export function spawnCrystal(x, y, rewardType) {
    if (!state.items) state.items = [];
    state.items.push({
        id: `crystal_${Date.now()}`,
        x,
        y,
        radius: 20,
        type: "crystal",
        rewardType: rewardType, // NUKE, GOD_MODE, SATELLITE, RARE_TICKET, EPIC_TICKET
        life: 60 * 30, // Tồn tại 30s
        pulse: 0
    });
}

export function spawnSatelliteDrone() {
    state.satelliteDrone = {
        x: state.player.x,
        y: state.player.y,
        timer: 60 * FPS, // 60 giây
        lastFireTime: 0,
        angle: 0,
        orbitRadius: 80,
        orbitSpeed: 0.05
    };
}