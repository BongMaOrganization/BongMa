import { state } from "../state.js";
import { getInitialPlayerState } from "../entities.js";
import { CHARACTERS } from "./data.js";

export function getCharacterConfig(id) {
  const character = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  return {
    ...character,
    rarity: character.rarity || "common", // Ensure rarity is always present
  };
}

export function applyCharacterToPlayer(characterId) {
  let data = getCharacterConfig(characterId);
  let upp = state.characterUpgrades[characterId] || {
    hp: 0,
    cdr: 0,
    fireRate: 0,
  };
  let base = getInitialPlayerState();

  base.hp = data.baseStats.hp + (upp.hp || 0);
  base.maxHp = base.hp;
  base.speed = data.baseStats.speed; // Tốc độ giữ nguyên theo nhân vật
  base.cdr = 1.0 - (upp.cdr || 0) * 0.05; // Mỗi cấp giảm 5% hồi chiêu (Max 50%)
  base.fireRate = Math.max(5, data.baseStats.fireRate - (upp.fireRate || 0));
  base.multiShot = data.baseStats.multiShot;
  base.bounces = data.baseStats.bounces;
  base.coins = state.player?.coins || 0;

  // Reset shield properties to initial values
  base.shield = 0;
  base.maxShield = 0;
  base.shieldRegenTimer = 0;

  base.characterId = data.id;

  return base;
}

export function ensureCharacterData() {
  if (!state.ownedCharacters) state.ownedCharacters = ["speedster"];
  if (!state.selectedCharacter) state.selectedCharacter = "speedster";
  if (!state.characterUpgrades) state.characterUpgrades = {};
}
