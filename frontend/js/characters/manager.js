import { state } from "../state.js";
import { CHARACTERS } from "../config.js";
import { getInitialPlayerState } from "../entities.js";

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
    speed: 0,
    fireRate: 0,
  };
  let base = getInitialPlayerState();

  base.hp = data.baseStats.hp + (upp.hp || 0);
  base.maxHp = base.hp;
  base.speed = data.baseStats.speed * (1 + (upp.speed || 0) * 0.1);
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

export function rollGacha() {
  const roll = Math.random();
  const { probabilities } = gachaConfig;

  if (roll < probabilities.legendary) return "legendary";
  if (roll < probabilities.legendary + probabilities.rare) return "rare";
  return "common";
}

export function gachaRoll() {
  if (state.player.coins < gachaConfig.cost) {
    alert("Not enough coins!");
    return;
  }

  state.player.coins -= gachaConfig.cost;
  const rarity = rollGacha();
  const availableCharacters = CHARACTERS.filter((c) => c.rarity === rarity);
  const character = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];

  if (!state.ownedCharacters.includes(character.id)) {
    state.ownedCharacters.push(character.id);
    alert(`You unlocked a ${rarity} character: ${character.name}!`);
  } else {
    alert(`You rolled a ${rarity} character: ${character.name}, but you already own it.`);
  }
}
