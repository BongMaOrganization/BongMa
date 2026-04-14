export const TOKEN_KEY = "auth_token";
const API = "http://localhost:3000";

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(username, password) {
  const res = await fetch(`${API}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Đăng ký thất bại");
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");
  return data;
}

export function saveGame(state, GHOST_DATA_KEY) {
  if (!state.player) return;
  let savePlayer = { ...state.player };
  delete savePlayer.gracePeriod;
  localStorage.setItem(
    GHOST_DATA_KEY,
    JSON.stringify({
      level: state.currentLevel,
      runs: state.pastRuns,
      player: savePlayer,
      ownedCharacters: state.ownedCharacters,
      selectedCharacter: state.selectedCharacter,
      characterUpgrades: state.characterUpgrades,
      resources: state.resources || { common: 0, rare: 0, legendary: 0 },
      bossFragments: state.bossFragments || [],
      maps: state.maps || [],
      selectedMap: state.selectedMap || "fire",
    }),
  );
}

export async function saveGameToServer(state, GHOST_DATA_KEY) {
  if (!state.player) return;
  saveGame(state, GHOST_DATA_KEY);

  try {
    await fetch(`${API}/api/save`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        gameState: {
          level: state.currentLevel,
          runs: state.pastRuns,
          player: state.player,
          ownedCharacters: state.ownedCharacters,
          selectedCharacter: state.selectedCharacter,
          characterUpgrades: state.characterUpgrades,
          resources: state.resources || { common: 0, rare: 0, legendary: 0 },
          bossFragments: state.bossFragments || [],
          maps: state.maps || [],
          selectedMap: state.selectedMap || "fire",
        },
        coins: state.player?.coins || 0,
        ownedCharacters: state.ownedCharacters,
        selectedCharacter: state.selectedCharacter,
        characterUpgrades: state.characterUpgrades,
        resources: state.resources || { common: 0, rare: 0, legendary: 0 },
        bossFragments: state.bossFragments || [],
        maps: state.maps || [],
        selectedMap: state.selectedMap || "fire",
      }),
    });
  } catch (error) {
    console.warn("Save to server failed, offline mode:", error);
  }
}

export async function loadGameFromServer() {
  try {
    const res = await fetch(`${API}/api/load`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn("Load from server failed, offline mode:", error);
    return null;
  }
}
