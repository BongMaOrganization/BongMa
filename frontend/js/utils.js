export const TOKEN_KEY = "AsynchronousEchoes_Token";
const API_URL = "http://localhost:3000/api";

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function saveGame(state, GHOST_DATA_KEY) {
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
    }),
  );
}

// GỌI API ĐĂNG KÝ
export async function register(username, password) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Lỗi đăng ký");
  return data;
}

// GỌI API ĐĂNG NHẬP
export async function login(username, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Lỗi đăng nhập");
  return data;
}

export async function saveGameToServer(state, GHOST_DATA_KEY) {
  saveGame(state, GHOST_DATA_KEY);

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    await fetch(`${API_URL}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameState: {
          level: state.currentLevel,
          runs: state.pastRuns,
          player: state.player,
          ownedCharacters: state.ownedCharacters,
          selectedCharacter: state.selectedCharacter,
          characterUpgrades: state.characterUpgrades,
        },
        coins: state.player?.coins || 0,
        ownedCharacters: state.ownedCharacters,
        selectedCharacter: state.selectedCharacter,
        characterUpgrades: state.characterUpgrades,
      }),
    });
  } catch (error) {
    console.warn("Save to server failed, offline mode:", error);
  }
}

// GỌI API TẢI GAME TỪ SERVER (Dùng Token)
export async function loadGameFromServer() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    let res = await fetch(`${API_URL}/load`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn("Load from server failed, offline mode:", error);
    return null;
  }
}
