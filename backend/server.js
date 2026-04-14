import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { User } from "./models/User.js";

const app = express();
app.use(cors());
app.use(express.json());

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

app.listen(3000, () => console.log("Server running on :3000"));
