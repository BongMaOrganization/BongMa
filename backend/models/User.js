import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    coins: { type: Number, default: 0 },
    selectedCharacter: { type: String, default: "speedster" },
    ownedCharacters: { type: [String], default: ["speedster"] },
    characterUpgrades: { type: mongoose.Schema.Types.Mixed, default: {} },
    resources: {
      type: mongoose.Schema.Types.Mixed,
      default: { common: 0, rare: 0, legendary: 0 },
    },
    bossFragments: { type: [String], default: [] },
    selectedMap: { type: String, default: "fire" },
    maps: {
      type: mongoose.Schema.Types.Mixed,
      default: [{ id: "fire", unlocked: true }],
    },
    gameState: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);
