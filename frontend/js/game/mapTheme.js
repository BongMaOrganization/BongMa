import { state } from "../state.js";
import { spawnHazard } from "../entities/helpers.js";

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function seededRandom() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildRockPoints(rand, width, height) {
  const points = [];
  const count = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = 0.72 + rand() * 0.38;
    points.push({
      x: Math.cos(angle) * width * wobble,
      y: Math.sin(angle) * height * wobble,
    });
  }
  return points;
}

function buildFireThemeData() {
  const { width, height } = state.world;
  const rand = createSeededRandom(
    (width * 73856093) ^ (height * 19349663) ^ 0x51f15e,
  );

  const lavaPools = [];
  const basaltOutcrops = [];
  const emberVents = [];
  const fissures = [];

  const spacingX = 760;
  const spacingY = 700;

  for (let gy = 420; gy <= height - 320; gy += spacingY) {
    for (let gx = 420; gx <= width - 320; gx += spacingX) {
      const px = gx + (rand() - 0.5) * 240;
      const py = gy + (rand() - 0.5) * 220;

      if (rand() < 0.58) {
        const rx = 90 + rand() * 95;
        const ry = 52 + rand() * 58;
        const islands = [];
        const islandCount = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < islandCount; i++) {
          islands.push({
            ox: (rand() - 0.5) * rx * 0.8,
            oy: (rand() - 0.5) * ry * 0.75,
            rx: 18 + rand() * 26,
            ry: 10 + rand() * 16,
            rot: rand() * Math.PI,
          });
        }

        lavaPools.push({
          x: px,
          y: py,
          rx,
          ry,
          angle: rand() * Math.PI,
          pulse: rand() * Math.PI * 2,
          glow: 0.45 + rand() * 0.4,
          islands,
        });
      }

      if (rand() < 0.8) {
        const rockW = 44 + rand() * 54;
        const rockH = 26 + rand() * 30;
        basaltOutcrops.push({
          x: px + (rand() - 0.5) * 240,
          y: py + (rand() - 0.5) * 220,
          angle: rand() * Math.PI,
          shade: 12 + Math.floor(rand() * 16),
          highlight: 28 + Math.floor(rand() * 24),
          points: buildRockPoints(rand, rockW, rockH),
        });
      }

      if (rand() < 0.42) {
        emberVents.push({
          x: px + (rand() - 0.5) * 260,
          y: py + (rand() - 0.5) * 240,
          radius: 26 + rand() * 32,
          phase: rand() * Math.PI * 2,
          strength: 0.35 + rand() * 0.4,
        });
      }
    }
  }

  const fissureCount = 8;
  for (let i = 0; i < fissureCount; i++) {
    const points = [];
    const baseY =
      300 + ((i + 0.5) / fissureCount) * (height - 600) + (rand() - 0.5) * 180;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const segments = 10;

    for (let step = 0; step <= segments; step++) {
      const ratio = step / segments;
      const x = 120 + ratio * (width - 240) + (rand() - 0.5) * 120;
      const y =
        baseY +
        Math.sin(ratio * Math.PI * (1.8 + rand() * 1.2) + i * 0.7) *
          (70 + rand() * 50) +
        (rand() - 0.5) * 70;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    fissures.push({
      points,
      minX,
      minY,
      maxX,
      maxY,
      glowWidth: 34 + rand() * 26,
      coreWidth: 8 + rand() * 6,
      phase: rand() * Math.PI * 2,
    });
  }

  return {
    theme: "fire",
    lavaPools,
    basaltOutcrops,
    emberVents,
    fissures,
  };
}

function buildIceThemeData() {
  const { width, height } = state.world;
  const rand = createSeededRandom(
    (width * 2654435761) ^ (height * 2246822519) ^ 0x1ce5eed,
  );

  const iceSheets = [];
  const crystalClusters = [];
  const frostVeins = [];
  const mistFields = [];

  const spacingX = 720;
  const spacingY = 660;

  for (let gy = 380; gy <= height - 300; gy += spacingY) {
    for (let gx = 380; gx <= width - 300; gx += spacingX) {
      const px = gx + (rand() - 0.5) * 220;
      const py = gy + (rand() - 0.5) * 200;

      if (rand() < 0.62) {
        const rx = 105 + rand() * 85;
        const ry = 60 + rand() * 50;
        const cracks = [];
        const crackCount = 3 + Math.floor(rand() * 3);
        for (let i = 0; i < crackCount; i++) {
          cracks.push({
            angle: rand() * Math.PI * 2,
            length: 0.4 + rand() * 0.4,
            offset: (rand() - 0.5) * 0.24,
          });
        }

        iceSheets.push({
          x: px,
          y: py,
          rx,
          ry,
          angle: rand() * Math.PI,
          pulse: rand() * Math.PI * 2,
          glow: 0.35 + rand() * 0.35,
          cracks,
        });
      }

      if (rand() < 0.7) {
        const clusterX = px + (rand() - 0.5) * 210;
        const clusterY = py + (rand() - 0.5) * 210;
        const shardCount = 3 + Math.floor(rand() * 4);
        const shards = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < shardCount; i++) {
          const ox = (rand() - 0.5) * 70;
          const oy = (rand() - 0.5) * 40;
          const length = 22 + rand() * 38;
          const widthShard = 8 + rand() * 10;
          shards.push({
            ox,
            oy,
            length,
            width: widthShard,
            tilt: (rand() - 0.5) * 0.42,
            lean: rand() * Math.PI * 2,
          });

          minX = Math.min(minX, clusterX + ox - widthShard);
          minY = Math.min(minY, clusterY + oy - length);
          maxX = Math.max(maxX, clusterX + ox + widthShard);
          maxY = Math.max(maxY, clusterY + oy + widthShard);
        }

        crystalClusters.push({
          x: clusterX,
          y: clusterY,
          phase: rand() * Math.PI * 2,
          glow: 0.3 + rand() * 0.3,
          shards,
          minX,
          minY,
          maxX,
          maxY,
        });
      }

      if (rand() < 0.44) {
        mistFields.push({
          x: px + (rand() - 0.5) * 250,
          y: py + (rand() - 0.5) * 210,
          radius: 120 + rand() * 120,
          phase: rand() * Math.PI * 2,
          strength: 0.24 + rand() * 0.18,
        });
      }
    }
  }

  const veinCount = 7;
  for (let i = 0; i < veinCount; i++) {
    const points = [];
    const baseX =
      320 + ((i + 0.5) / veinCount) * (width - 640) + (rand() - 0.5) * 160;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const segments = 9;

    for (let step = 0; step <= segments; step++) {
      const ratio = step / segments;
      const x =
        baseX +
        Math.sin(ratio * Math.PI * (1.7 + rand() * 1.3) + i * 0.8) *
          (75 + rand() * 55) +
        (rand() - 0.5) * 60;
      const y = 140 + ratio * (height - 280) + (rand() - 0.5) * 110;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    frostVeins.push({
      points,
      minX,
      minY,
      maxX,
      maxY,
      glowWidth: 24 + rand() * 18,
      coreWidth: 4 + rand() * 4,
      phase: rand() * Math.PI * 2,
    });
  }

  return {
    theme: "ice",
    iceSheets,
    crystalClusters,
    frostVeins,
    mistFields,
  };
}

function buildEarthThemeData() {
  const { width, height } = state.world;
  const rand = createSeededRandom(
    (width * 1597334677) ^ (height * 3812015801) ^ 0x34ea2f1,
  );

  const earthPlates = [];
  const stoneClusters = [];
  const faultLines = [];
  const dustBasins = [];

  const spacingX = 760;
  const spacingY = 700;

  for (let gy = 420; gy <= height - 320; gy += spacingY) {
    for (let gx = 420; gx <= width - 320; gx += spacingX) {
      const px = gx + (rand() - 0.5) * 220;
      const py = gy + (rand() - 0.5) * 210;

      if (rand() < 0.64) {
        const rx = 120 + rand() * 96;
        const ry = 72 + rand() * 54;
        const ridges = [];
        const ridgeCount = 2 + Math.floor(rand() * 3);
        for (let i = 0; i < ridgeCount; i++) {
          ridges.push({
            offset: -0.28 + i * (0.24 + rand() * 0.08),
            width: 0.26 + rand() * 0.18,
            wobble: rand() * Math.PI * 2,
          });
        }

        earthPlates.push({
          x: px,
          y: py,
          rx,
          ry,
          angle: rand() * Math.PI,
          pulse: rand() * Math.PI * 2,
          glow: 0.25 + rand() * 0.2,
          ridges,
        });
      }

      if (rand() < 0.7) {
        const clusterX = px + (rand() - 0.5) * 220;
        const clusterY = py + (rand() - 0.5) * 220;
        const monolithCount = 3 + Math.floor(rand() * 4);
        const monoliths = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < monolithCount; i++) {
          const ox = (rand() - 0.5) * 84;
          const oy = (rand() - 0.5) * 48;
          const heightMonolith = 24 + rand() * 44;
          const widthMonolith = 12 + rand() * 18;
          monoliths.push({
            ox,
            oy,
            width: widthMonolith,
            height: heightMonolith,
            lean: (rand() - 0.5) * 0.28,
            hue: 34 + Math.floor(rand() * 16),
          });

          minX = Math.min(minX, clusterX + ox - widthMonolith * 1.1);
          minY = Math.min(minY, clusterY + oy - heightMonolith - 8);
          maxX = Math.max(maxX, clusterX + ox + widthMonolith * 1.1);
          maxY = Math.max(maxY, clusterY + oy + 16);
        }

        stoneClusters.push({
          x: clusterX,
          y: clusterY,
          phase: rand() * Math.PI * 2,
          glow: 0.18 + rand() * 0.14,
          monoliths,
          minX,
          minY,
          maxX,
          maxY,
        });
      }

      if (rand() < 0.46) {
        dustBasins.push({
          x: px + (rand() - 0.5) * 260,
          y: py + (rand() - 0.5) * 220,
          radius: 120 + rand() * 140,
          phase: rand() * Math.PI * 2,
          strength: 0.18 + rand() * 0.14,
        });
      }
    }
  }

  const faultCount = 8;
  for (let i = 0; i < faultCount; i++) {
    const points = [];
    const baseY =
      260 + ((i + 0.5) / faultCount) * (height - 520) + (rand() - 0.5) * 170;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const segments = 11;

    for (let step = 0; step <= segments; step++) {
      const ratio = step / segments;
      const x = 120 + ratio * (width - 240) + (rand() - 0.5) * 130;
      const y =
        baseY +
        Math.sin(ratio * Math.PI * (1.5 + rand() * 1.1) + i * 0.65) *
          (64 + rand() * 44) +
        (rand() - 0.5) * 54;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    faultLines.push({
      points,
      minX,
      minY,
      maxX,
      maxY,
      outerWidth: 28 + rand() * 18,
      innerWidth: 8 + rand() * 5,
      phase: rand() * Math.PI * 2,
    });
  }

  return {
    theme: "earth",
    earthPlates,
    stoneClusters,
    faultLines,
    dustBasins,
  };
}

function buildWindThemeData() {
  const { width, height } = state.world;
  const rand = createSeededRandom(
    (width * 1099511627) ^ (height * 2166136261) ^ 0x77a1d5,
  );

  const streamLanes = [];
  const pressureCells = [];
  const wispClusters = [];
  const vortexFields = [];

  const laneCount = 8;
  for (let i = 0; i < laneCount; i++) {
    const points = [];
    const baseY =
      240 + ((i + 0.5) / laneCount) * (height - 480) + (rand() - 0.5) * 160;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const segments = 10;

    for (let step = 0; step <= segments; step++) {
      const ratio = step / segments;
      const x = 100 + ratio * (width - 200) + (rand() - 0.5) * 130;
      const y =
        baseY +
        Math.sin(ratio * Math.PI * (1.7 + rand() * 1.3) + i * 0.8) *
          (54 + rand() * 40) +
        (rand() - 0.5) * 48;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    streamLanes.push({
      points,
      minX,
      minY,
      maxX,
      maxY,
      outerWidth: 26 + rand() * 16,
      innerWidth: 5 + rand() * 4,
      phase: rand() * Math.PI * 2,
      speed: 0.014 + rand() * 0.01,
    });
  }

  const spacingX = 780;
  const spacingY = 700;
  for (let gy = 420; gy <= height - 320; gy += spacingY) {
    for (let gx = 420; gx <= width - 320; gx += spacingX) {
      const px = gx + (rand() - 0.5) * 240;
      const py = gy + (rand() - 0.5) * 220;

      if (rand() < 0.62) {
        pressureCells.push({
          x: px,
          y: py,
          rx: 120 + rand() * 90,
          ry: 70 + rand() * 54,
          angle: rand() * Math.PI,
          phase: rand() * Math.PI * 2,
          glow: 0.22 + rand() * 0.18,
        });
      }

      if (rand() < 0.58) {
        const clusterX = px + (rand() - 0.5) * 220;
        const clusterY = py + (rand() - 0.5) * 220;
        const wisps = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const wispCount = 3 + Math.floor(rand() * 3);

        for (let i = 0; i < wispCount; i++) {
          const ox = (rand() - 0.5) * 88;
          const oy = (rand() - 0.5) * 54;
          const radius = 20 + rand() * 32;
          wisps.push({
            ox,
            oy,
            radius,
            stretch: 0.55 + rand() * 0.45,
            tilt: (rand() - 0.5) * 0.7,
            arcOffset: rand() * Math.PI * 2,
          });

          minX = Math.min(minX, clusterX + ox - radius * 1.3);
          minY = Math.min(minY, clusterY + oy - radius);
          maxX = Math.max(maxX, clusterX + ox + radius * 1.3);
          maxY = Math.max(maxY, clusterY + oy + radius);
        }

        wispClusters.push({
          x: clusterX,
          y: clusterY,
          phase: rand() * Math.PI * 2,
          glow: 0.18 + rand() * 0.14,
          wisps,
          minX,
          minY,
          maxX,
          maxY,
        });
      }

      if (rand() < 0.34) {
        vortexFields.push({
          x: px + (rand() - 0.5) * 260,
          y: py + (rand() - 0.5) * 240,
          radius: 88 + rand() * 92,
          phase: rand() * Math.PI * 2,
          spin: rand() > 0.5 ? 1 : -1,
          strength: 0.16 + rand() * 0.12,
        });
      }
    }
  }

  return {
    theme: "wind",
    streamLanes,
    pressureCells,
    wispClusters,
    vortexFields,
  };
}

function buildThunderThemeData() {
  const { width, height } = state.world;
  const rand = createSeededRandom(
    (width * 3266489917) ^ (height * 668265263) ^ 0x51e7d3,
  );

  const surgeChannels = [];
  const capacitorNodes = [];
  const conductorSpikes = [];
  const chargeFields = [];

  const channelCount = 8;
  for (let i = 0; i < channelCount; i++) {
    const points = [];
    const branches = [];
    const baseX =
      220 + ((i + 0.5) / channelCount) * (width - 440) + (rand() - 0.5) * 150;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const segments = 9;

    for (let step = 0; step <= segments; step++) {
      const ratio = step / segments;
      const x =
        baseX +
        (step % 2 === 0 ? -1 : 1) * (18 + rand() * 24) +
        Math.sin(ratio * Math.PI * (1.8 + rand() * 1.4) + i * 0.76) *
          (58 + rand() * 44) +
        (rand() - 0.5) * 48;
      const y = 120 + ratio * (height - 240) + (rand() - 0.5) * 120;
      points.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    for (let b = 1; b < points.length - 1; b++) {
      if (rand() < 0.42) {
        const start = points[b];
        const branchPoints = [{ x: start.x, y: start.y }];
        const branchSteps = 2 + Math.floor(rand() * 2);
        const dir = rand() > 0.5 ? 1 : -1;
        let bx = start.x;
        let by = start.y;

        for (let step = 0; step < branchSteps; step++) {
          bx += dir * (22 + rand() * 34) + (rand() - 0.5) * 14;
          by += (rand() - 0.5) * 44 + 12 + step * 6;
          branchPoints.push({ x: bx, y: by });
          minX = Math.min(minX, bx);
          minY = Math.min(minY, by);
          maxX = Math.max(maxX, bx);
          maxY = Math.max(maxY, by);
        }

        branches.push({
          points: branchPoints,
          phase: rand() * Math.PI * 2,
        });
      }
    }

    surgeChannels.push({
      points,
      branches,
      minX,
      minY,
      maxX,
      maxY,
      outerWidth: 18 + rand() * 12,
      innerWidth: 4 + rand() * 3,
      phase: rand() * Math.PI * 2,
      flicker: 0.02 + rand() * 0.02,
    });
  }

  const spacingX = 760;
  const spacingY = 680;
  for (let gy = 400; gy <= height - 300; gy += spacingY) {
    for (let gx = 400; gx <= width - 300; gx += spacingX) {
      const px = gx + (rand() - 0.5) * 240;
      const py = gy + (rand() - 0.5) * 220;

      if (rand() < 0.6) {
        capacitorNodes.push({
          x: px,
          y: py,
          radius: 56 + rand() * 46,
          rx: 110 + rand() * 80,
          ry: 66 + rand() * 46,
          angle: rand() * Math.PI,
          phase: rand() * Math.PI * 2,
          glow: 0.24 + rand() * 0.16,
        });
      }

      if (rand() < 0.62) {
        const clusterX = px + (rand() - 0.5) * 220;
        const clusterY = py + (rand() - 0.5) * 220;
        const spikeCount = 3 + Math.floor(rand() * 4);
        const spikes = [];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < spikeCount; i++) {
          const ox = (rand() - 0.5) * 86;
          const oy = (rand() - 0.5) * 54;
          const heightSpike = 26 + rand() * 48;
          const widthSpike = 10 + rand() * 12;
          spikes.push({
            ox,
            oy,
            width: widthSpike,
            height: heightSpike,
            lean: (rand() - 0.5) * 0.34,
            phase: rand() * Math.PI * 2,
          });

          minX = Math.min(minX, clusterX + ox - widthSpike * 1.2);
          minY = Math.min(minY, clusterY + oy - heightSpike - 10);
          maxX = Math.max(maxX, clusterX + ox + widthSpike * 1.2);
          maxY = Math.max(maxY, clusterY + oy + 18);
        }

        conductorSpikes.push({
          x: clusterX,
          y: clusterY,
          phase: rand() * Math.PI * 2,
          glow: 0.2 + rand() * 0.12,
          spikes,
          minX,
          minY,
          maxX,
          maxY,
        });
      }

      if (rand() < 0.38) {
        chargeFields.push({
          x: px + (rand() - 0.5) * 240,
          y: py + (rand() - 0.5) * 220,
          radius: 96 + rand() * 100,
          phase: rand() * Math.PI * 2,
          strength: 0.18 + rand() * 0.14,
          polarity: rand() > 0.5 ? 1 : -1,
        });
      }
    }
  }

  return {
    theme: "thunder",
    surgeChannels,
    capacitorNodes,
    conductorSpikes,
    chargeFields,
  };
}

function buildMapThemeData(theme) {
  if (theme === "fire") return buildFireThemeData();
  if (theme === "ice") return buildIceThemeData();
  if (theme === "earth") return buildEarthThemeData();
  if (theme === "wind") return buildWindThemeData();
  if (theme === "thunder") return buildThunderThemeData();
  return { theme };
}

export function initMapTheme() {
  // Lấy Theme chuẩn dựa trên chế độ đang chơi
  let bossType = "fire";
  if (state.bossArenaMode && state.bossArenaType) {
    bossType = state.bossArenaType;
  } else {
    bossType = state.selectedMap || state.pendingBossType || "fire";
  }

  state.currentMapTheme = bossType;
  state.mapThemeData = buildMapThemeData(bossType);
  state.lavaParticles = [];

  // Dọn dẹp rác bẫy trang trí nếu có sót từ version cũ
  state.hazards = state.hazards.filter(h => h.owner !== "map");

  // Tắt các hiệu ứng toàn bản đồ mặc định
  state.globalHazard = {
    type: null,
    active: false,
    damage: 0,
  };
}
