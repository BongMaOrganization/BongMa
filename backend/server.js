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

// ========== ECHO MODE (Vòng Lặp) — Bảng xếp hạng ==========
// Điểm = wave * 100000 + giây sống sót → so sánh 1 số duy nhất, wave luôn thắng thời gian
app.post("/api/echo-score", authenticateToken, async (req, res) => {
  const wave = Math.max(0, Math.floor(Number(req.body.wave) || 0));
  const timeFrames = Math.max(0, Math.floor(Number(req.body.timeFrames) || 0));
  const coins = Math.max(0, Math.floor(Number(req.body.coins) || 0));
  const characterId = String(req.body.characterId || "").slice(0, 40);
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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Server running on :${PORT} — WAN via api.bongma.storyoftri.xyz`));

