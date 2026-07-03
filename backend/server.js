import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { User } from "./models/User.js";
import { setupSocketIO } from "./socket_handler.js";

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 204,
};

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", corsOptions.methods.join(", "));
  res.header("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(", "));
  res.header("Access-Control-Expose-Headers", corsOptions.exposedHeaders.join(", "));

  if (req.method === "OPTIONS") {
    return res.sendStatus(corsOptions.optionsSuccessStatus);
  }

  next();
});
app.use(cors(corsOptions));
// Save campaign gửi cả pastRuns (record dài) — limit mặc định 100kb làm save fail im lặng
app.use(express.json({ limit: "5mb" }));

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
});
setupSocketIO(io);

await mongoose.connect(process.env.MONGODB_URI);
console.log("Đã kết nối thành công!");

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Username already exists" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "User not found" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
  );
  res.json({ token });
});

app.post("/api/save", authenticateToken, async (req, res) => {
  const {
    gameState,
    coins,
    ownedCharacters,
    selectedCharacter,
    characterUpgrades,
    resources,
    bossFragments,
    selectedMap,
    maps,
  } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      gameState,
      coins,
      ownedCharacters,
      selectedCharacter,
      characterUpgrades,
      resources: resources || { common: 0, rare: 0, legendary: 0 },
      bossFragments: bossFragments || [],
      selectedMap: selectedMap || gameState?.selectedMap || "fire",
      maps: maps || gameState?.maps || [{ id: "fire", unlocked: true }],
    },
    { returnDocument: "after" },
  );
  res.json(user);
});

app.get("/api/load", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
});

// Auth tùy chọn: có token thì lấy danh tính (để exclude chính mình), không có vẫn cho qua
const optionalAuth = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      /* token hỏng → coi như guest */
    }
  }
  next();
};

// Sanity chống gian lận: mỗi wave tối thiểu ~5s (intermission 4s + dọn quái)
function isEchoScorePlausible(wave, timeFrames) {
  if (wave < 0 || wave > 500) return false;
  if (timeFrames < 0 || timeFrames > 60 * 60 * 12 * 60) return false; // > 12h = láo
  if (timeFrames < wave * 300) return false;
  return true;
}

// ========== ECHO MODE (Vòng Lặp) — Bảng xếp hạng ==========
// Điểm = wave * 100000 + giây sống sót → so sánh 1 số duy nhất, wave luôn thắng thời gian
app.post("/api/echo-score", authenticateToken, async (req, res) => {
  const wave = Math.max(0, Math.floor(Number(req.body.wave) || 0));
  const timeFrames = Math.max(0, Math.floor(Number(req.body.timeFrames) || 0));
  const coins = Math.max(0, Math.floor(Number(req.body.coins) || 0));
  const characterId = String(req.body.characterId || "").slice(0, 40);

  if (!isEchoScorePlausible(wave, timeFrames)) {
    return res.status(400).json({ message: "Invalid score" });
  }

  const score = wave * 100000 + Math.min(Math.floor(timeFrames / 60), 99999);

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Not found" });

    if (!user.echoBest || score > (user.echoBest.score || 0)) {
      user.echoBest = {
        wave,
        timeFrames,
        coins,
        characterId,
        score,
        achievedAt: new Date(),
      };
      await user.save();
      return res.json({ improved: true, best: user.echoBest });
    }
    res.json({ improved: false, best: user.echoBest });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/echo-leaderboard", async (req, res) => {
  try {
    const top = await User.find({ "echoBest.score": { $gt: 0 } })
      .sort({ "echoBest.score": -1 })
      .limit(20)
      .select("username echoBest -_id");
    res.json(top);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ========== ECHO MODE — Chia sẻ Bóng Ma giữa người chơi ==========

// Upload record sau khi chết (giữ 2 run wave cao nhất mỗi user)
app.post("/api/echo-ghost", authenticateToken, async (req, res) => {
  const wave = Math.floor(Number(req.body.wave) || 0);
  const timeFrames = Math.floor(Number(req.body.timeFrames) || 0);
  const characterId = String(req.body.characterId || "").slice(0, 40);
  const record = req.body.record;

  // Chỉ nhận run đáng chia sẻ + record đúng định dạng nén v1, chặn payload phình
  if (wave < 3 || !isEchoScorePlausible(wave, timeFrames)) {
    return res.status(400).json({ message: "Run không hợp lệ" });
  }
  if (
    !record ||
    record.v !== 1 ||
    typeof record.d !== "string" ||
    record.d.length > 400000 ||
    !Number.isFinite(record.n) ||
    record.n > 40000
  ) {
    return res.status(400).json({ message: "Record không hợp lệ" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Not found" });

    const list = Array.isArray(user.echoGhosts) ? user.echoGhosts : [];
    list.push({
      wave,
      timeFrames,
      characterId,
      record: { v: 1, sx: record.sx, sy: record.sy, n: record.n, d: record.d },
      updatedAt: new Date(),
    });
    list.sort((a, b) => (b.wave || 0) - (a.wave || 0));
    user.echoGhosts = list.slice(0, 2);
    user.markModified("echoGhosts");
    await user.save();
    res.json({ stored: user.echoGhosts.map((g) => g.wave) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Ghép trình: trả tối đa 3 ghost của người khác có wave gần nearWave
app.get("/api/echo-ghosts", optionalAuth, async (req, res) => {
  const w = Math.max(1, Math.floor(Number(req.query.nearWave) || 1));
  try {
    const users = await User.find({ "echoGhosts.0": { $exists: true } })
      .select("username echoGhosts")
      .limit(60);

    const me = req.user?.username;
    const pool = [];
    users.forEach((u) => {
      if (u.username === me) return;
      (u.echoGhosts || []).forEach((g) => {
        if ((g.wave || 0) >= w - 2 && (g.wave || 0) <= w + 4) {
          pool.push({
            username: u.username,
            wave: g.wave,
            characterId: g.characterId,
            record: g.record,
          });
        }
      });
    });

    pool.sort(() => Math.random() - 0.5);
    res.json(pool.slice(0, 3));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Thách đấu: tải ghost tốt nhất của đúng 1 người theo username
app.get("/api/echo-ghost/by-name/:username", async (req, res) => {
  try {
    const u = await User.findOne({
      username: String(req.params.username || "").slice(0, 60),
    }).select("username echoGhosts");
    const best = (u?.echoGhosts || [])[0];
    if (!best) {
      return res.status(404).json({ message: "Người chơi này chưa có Bóng Ma" });
    }
    res.json({
      username: u.username,
      wave: best.wave,
      characterId: best.characterId,
      record: best.record,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Server running on :${PORT} — WAN via api.bongma.storyoftri.xyz`));

