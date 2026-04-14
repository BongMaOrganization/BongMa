import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { User } from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username =
  process.argv[2] || process.env.FULL_UNLOCK_USERNAME || "fullunlock";
const password =
  process.argv[3] || process.env.FULL_UNLOCK_PASSWORD || "FullUnlock123!";

const maps = [
  { id: "fire", unlocked: true },
  { id: "ice", unlocked: true },
  { id: "earth", unlocked: true },
  { id: "wind", unlocked: true },
  { id: "thunder", unlocked: true },
];

const resources = {
  common: 9999,
  rare: 9999,
  legendary: 9999,
  rareTickets: 9999,
  epicTickets: 9999,
};

const bossFragments = [
  "frag_fire",
  "frag_ice",
  "frag_storm",
  "frag_shadow",
  "frag_spirit",
];

async function getCharacterIds() {
  const dataPath = path.resolve(
    __dirname,
    "../../frontend/js/characters/data.js",
  );
  const source = await readFile(dataPath, "utf8");
  const ids = [...source.matchAll(/\bid:\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) {
    throw new Error("Could not find character ids in frontend character data.");
  }

  return uniqueIds;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in backend/.env");
  }

  const ownedCharacters = await getCharacterIds();
  const characterUpgrades = Object.fromEntries(
    ownedCharacters.map((id) => [id, { hp: 10, speed: 10, fireRate: 10 }]),
  );

  const selectedCharacter = ownedCharacters.includes("creator")
    ? "creator"
    : ownedCharacters[0];

  const coins = 999999;
  const gameState = {
    level: 1,
    runs: [],
    player: {
      coins,
      shield: 0,
      maxShield: 0,
    },
    ownedCharacters,
    selectedCharacter,
    characterUpgrades,
    resources,
    bossFragments,
    maps,
    selectedMap: "fire",
  };

  await mongoose.connect(process.env.MONGODB_URI);

  await User.findOneAndUpdate(
    { username },
    {
      username,
      password: await bcrypt.hash(password, 10),
      coins,
      selectedCharacter,
      ownedCharacters,
      characterUpgrades,
      resources,
      bossFragments,
      maps,
      selectedMap: "fire",
      gameState,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  await mongoose.disconnect();

  console.log(`Full-unlock account is ready: ${username}`);
  console.log(`Unlocked characters: ${ownedCharacters.length}`);
  console.log(`Unlocked maps: ${maps.map((map) => map.id).join(", ")}`);
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
