import { state } from "../../../state.js";
import { spawnWarning, spawnHazard, spawnSafeZone } from "../../helpers.js";
import { activateShield, aim } from "./patternHelpers.js";

export const EARTH_SKILLS = {
  "Seismic Rift": (boss) => {
    activateShield(boss, 180);
    const targetAngle = aim(boss);
    for (let i = 0; i < 10; i++) {
      state.delayedTasks.push({
        delay: i * 8,
        action: () => {
          const px = boss.x + Math.cos(targetAngle) * (i * 60 + 50);
          const py = boss.y + Math.sin(targetAngle) * (i * 60 + 50);
          spawnHazard("rock", px, py, 45, 400);
          state.screenShake.timer = 5;
          state.screenShake.intensity = 8;
          state.screenShake.type = "earth";
        },
      });
    }
  },

  "Earth Spikes": (boss) => {
    activateShield(boss, 150);
    for (let i = 0; i < 15; i++) {
      state.delayedTasks.push({
        delay: i * 12,
        action: () => {
          const px = state.player.x + (Math.random() - 0.5) * 40;
          const py = state.player.y + (Math.random() - 0.5) * 40;
          spawnWarning(px, py, 45, 50, "stone_warn");
          state.delayedTasks.push({
            delay: 50,
            action: () => {
              // Rock active → damage qua hazard loop (i-frame + gate 30f, không melt)
              spawnHazard("rock", px, py, 45, 240, 1, "boss");
              state.screenShake.timer = 5;
              state.screenShake.intensity = 8;
              state.screenShake.type = "earth";
            },
          });
        },
      });
    }
  },

  "Rock Prison": (boss) => {
    activateShield(boss, 180);
    const px = state.player.x;
    const py = state.player.y;
    const prisonR = 300;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const startX = px + Math.cos(a) * prisonR;
      const startY = py + Math.sin(a) * prisonR;
      spawnWarning(startX, startY, 40, 60, "stone_warn");
      state.delayedTasks.push({
        delay: 60,
        action: () => {
          for (let step = 0; step < 5; step++) {
            state.delayedTasks.push({
              delay: step * 20,
              action: () => {
                const progress = step / 5;
                const rx = startX + (px - startX) * progress;
                const ry = startY + (py - startY) * progress;
                spawnHazard("rock", rx, ry, 40, 40, 1, "boss");
                state.screenShake.timer = 3;
                state.screenShake.intensity = 5;
              },
            });
          }
        },
      });
    }
  },

  "Boulder Roll": (boss) => {
    activateShield(boss, 120);
    const centerX = state.player.x;
    const centerY = state.player.y;
    const angles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
    angles.forEach((a, idx) => {
      state.delayedTasks.push({
        delay: idx * 20,
        action: () => {
          const startX = centerX + Math.cos(a) * 600;
          const startY = centerY + Math.sin(a) * 600;
          spawnWarning(startX, startY, 50, 40, "stone_warn");
          state.delayedTasks.push({
            delay: 40,
            action: () => {
              for (let step = 0; step < 8; step++) {
                state.delayedTasks.push({
                  delay: step * 10,
                  action: () => {
                    const t = step / 8;
                    spawnHazard("rock", startX + (centerX - startX) * t, startY + (centerY - startY) * t, 50, 15, 1.2, "boss");
                  },
                });
              }
            },
          });
        },
      });
    });
  },

  "Tectonic Slam": (boss) => {
    activateShield(boss, 150);
    state.screenShake.timer = 8;
    state.screenShake.intensity = 12;
    state.screenShake.type = "earth";
    for (let wave = 0; wave < 3; wave++) {
      state.delayedTasks.push({
        delay: wave * 25,
        action: () => {
          const waveR = 80 + wave * 100;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const wx = boss.x + Math.cos(a) * waveR;
            const wy = boss.y + Math.sin(a) * waveR;
            spawnWarning(wx, wy, 35, 30, "stone_warn");
            state.delayedTasks.push({
              delay: 30,
              action: () => {
                spawnHazard("rock", wx, wy, 35, 150, 0.8, "boss");
                state.screenShake.timer = 4;
                state.screenShake.intensity = 6;
              },
            });
          }
        },
      });
    }
  },

  EARTHQUAKE: (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5;
    state.screenShake.type = "earth";
    state.globalHazard = { type: "earth", active: true, timer: 600, damage: 1.2, graceTimer: 90 };
    spawnSafeZone(state.player.x, state.player.y, 250, 600, { shrinking: false });
  },
};
