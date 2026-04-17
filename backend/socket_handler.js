/**
 * socket_handler.js — Quản lý phòng và relay multiplayer qua Socket.io
 * Boss Arena Co-op: 2-4 người chơi, Host authority
 */

// rooms: Map<roomCode, Room>
// Room: { code, hostId, players: Map<socketId, PlayerInfo>, gameStarted, bossType }
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function setupSocketIO(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Kết nối: ${socket.id}`);

    // ==============================
    // TẠO PHÒNG
    // ==============================
    socket.on("create_room", ({ username, characterId }) => {
      let code;
      do {
        code = generateRoomCode();
      } while (rooms.has(code));

      const room = {
        code,
        hostId: socket.id,
        players: new Map(),
        gameStarted: false,
        bossType: null,
      };

      const player = {
        id: socket.id,
        username: username || "Player",
        characterId: characterId || "speedster",
        isHost: true,
        x: 0,
        y: 0,
        hp: 5,
        maxHp: 5,
        isDead: false,
      };

      room.players.set(socket.id, player);
      rooms.set(code, room);
      socket.join(code);

      socket.emit("room_created", {
        roomCode: code,
        playerId: socket.id,
        players: Array.from(room.players.values()),
      });

      console.log(`[Room] Tạo phòng ${code} bởi ${username}`);
    });

    // ==============================
    // VÀO PHÒNG
    // ==============================
    socket.on("join_room", ({ roomCode, username, characterId }) => {
      const room = rooms.get(roomCode?.toUpperCase());

      if (!room) {
        socket.emit("join_error", { message: "Phòng không tồn tại!" });
        return;
      }
      if (room.gameStarted) {
        socket.emit("join_error", { message: "Trận đấu đã bắt đầu!" });
        return;
      }
      if (room.players.size >= 4) {
        socket.emit("join_error", { message: "Phòng đã đủ 4 người!" });
        return;
      }

      const player = {
        id: socket.id,
        username: username || `Player${room.players.size + 1}`,
        characterId: characterId || "speedster",
        isHost: false,
        x: 0,
        y: 0,
        hp: 5,
        maxHp: 5,
        isDead: false,
      };

      room.players.set(socket.id, player);
      socket.join(roomCode.toUpperCase());

      socket.emit("room_joined", {
        roomCode: room.code,
        playerId: socket.id,
        hostId: room.hostId,
        players: Array.from(room.players.values()),
      });

      // Notify others
      socket.to(room.code).emit("player_joined", {
        player,
        players: Array.from(room.players.values()),
      });

      console.log(`[Room] ${username} vào phòng ${room.code} (${room.players.size}/4)`);
    });

    // ==============================
    // HOST BẮT ĐẦU GAME
    // ==============================
    socket.on("start_game", ({ roomCode, bossType }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      room.gameStarted = true;
      room.bossType = bossType;

      const playerCount = room.players.size;
      // HP scale: 1 người = 1.0x, 2 = 1.7x, 3 = 2.4x, 4 = 3.1x
      const hpScale = 1 + 0.7 * (playerCount - 1);

      io.to(roomCode).emit("game_start", {
        bossType,
        playerCount,
        hpScale,
        players: Array.from(room.players.values()),
      });

      console.log(`[Room] ${roomCode} bắt đầu với boss=${bossType}, ${playerCount} người, HP x${hpScale.toFixed(1)}`);
    });

    // ==============================
    // RELAY VỊ TRÍ PLAYER
    // ==============================
    socket.on("player_update", ({ roomCode, x, y, hp, maxHp, isDead }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;

      player.x = x;
      player.y = y;
      player.hp = hp;
      player.maxHp = maxHp;
      player.isDead = isDead;

      socket.to(roomCode).emit("remote_player_update", {
        id: socket.id,
        x,
        y,
        hp,
        maxHp,
        isDead,
      });
    });

    // ==============================
    // HOST BROADCAST BOSS STATE
    // ==============================
    socket.on("boss_state", ({ roomCode, x, y, hp, maxHp, phase, bossSpecial, deathTimer }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      socket.to(roomCode).emit("boss_state_update", {
        x, y, hp, maxHp, phase, bossSpecial, deathTimer,
      });
    });

    // ==============================
    // NON-HOST GỬI DAMAGE LÊN HOST
    // ==============================
    socket.on("player_damage", ({ roomCode, damage }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      // Relay về cho host
      io.to(room.hostId).emit("apply_damage", {
        fromId: socket.id,
        damage,
      });
    });

    // ==============================
    // REVIVE MECHANIC
    // ==============================
    socket.on("revive_update", ({ roomCode, deadPlayerId, progress }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      // Broadcast trạng thái revive cho mọi người trong phòng
      socket.to(roomCode).emit("revive_progress", {
        deadPlayerId,
        progress,
        reviverId: socket.id,
      });
    });

    socket.on("player_revived", ({ roomCode, deadPlayerId }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      const player = room.players.get(deadPlayerId);
      if (player) {
        player.isDead = false;
        player.hp = Math.ceil(player.maxHp / 2);
      }
      io.to(roomCode).emit("remote_player_revived", { deadPlayerId });
      console.log(`[Room] ${roomCode}: ${deadPlayerId} được hồi sinh`);
    });

    // ==============================
    // BOSS KILLED — thông báo cho tất cả
    // ==============================
    socket.on("boss_killed", ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;
      io.to(roomCode).emit("all_boss_killed");
      console.log(`[Room] ${roomCode}: Boss bị hạ gục!`);
    });

    // ==============================
    // NGẮT KẾT NỐI
    // ==============================
    socket.on("disconnect", () => {
      console.log(`[Socket] Ngắt kết nối: ${socket.id}`);

      // Tìm và dọn phòng
      for (const [code, room] of rooms) {
        if (!room.players.has(socket.id)) continue;

        const wasHost = room.hostId === socket.id;
        room.players.delete(socket.id);

        if (room.players.size === 0) {
          rooms.delete(code);
          console.log(`[Room] Phòng ${code} đã xóa (trống)`);
        } else {
          socket.to(code).emit("player_left", {
            playerId: socket.id,
            wasHost,
            players: Array.from(room.players.values()),
          });

          if (wasHost) {
            // Chuyển host cho người tiếp theo
            const newHostId = room.players.keys().next().value;
            room.hostId = newHostId;
            rooms.delete(code); // Game kết thúc nếu host thoát khi đang chơi
            io.to(code).emit("host_left");
            console.log(`[Room] Host phòng ${code} đã thoát. Game kết thúc.`);
          }
        }
        break;
      }
    });
  });
}
