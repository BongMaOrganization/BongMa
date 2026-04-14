import { state } from "./state.js";
import { GHOST_DATA_KEY } from "./config.js";
import {
  TOKEN_KEY,
  login,
  register,
  loadGameFromServer,
  saveGameToServer,
} from "./utils.js";

export { TOKEN_KEY, login, register };

export let currentUser = null;

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function showLoginScreen() {
  document.getElementById("screen-login").classList.remove("hidden");
  document.getElementById("screen-main").classList.add("hidden");
}

export function showMainScreen() {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-main").classList.remove("hidden");
}

export function initAuth(onAuthenticated) {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    showLoginScreen();
  } else {
    showMainScreen();
    setTimeout(() => onAuthenticated(), 0);
  }

  let isLoginMode = true;

  const authTitle = document.getElementById("auth-title");
  const authError = document.getElementById("auth-error");
  const inUser = document.getElementById("auth-username");
  const inPass = document.getElementById("auth-password");
  const btnDoAuth = document.getElementById("btn-do-auth");
  const btnToggle = document.getElementById("btn-toggle-auth");
  const btnLogout = document.getElementById("btn-logout");

  btnToggle?.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    authError.innerText = "";
    if (isLoginMode) {
      authTitle.innerText = "ĐĂNG NHẬP";
      btnDoAuth.innerText = "ĐĂNG NHẬP";
      btnToggle.innerText = "Đăng ký ngay";
    } else {
      authTitle.innerText = "ĐĂNG KÝ MỚI";
      btnDoAuth.innerText = "TẠO TÀI KHOẢN";
      btnToggle.innerText = "Đăng nhập";
    }
  });

  btnDoAuth?.addEventListener("click", async () => {
    const u = inUser.value.trim();
    const p = inPass.value.trim();
    if (!u || !p) {
      authError.style.color = "#ff4444";
      authError.innerText = "Vui lòng nhập đủ thông tin!";
      return;
    }

    authError.style.color = "#00ffcc";
    authError.innerText = "Đang kết nối...";
    btnDoAuth.disabled = true;

    try {
      if (!isLoginMode) {
        await register(u, p);
        authError.innerText = "Đăng ký thành công! Đang đăng nhập...";
      }
      const data = await login(u, p);
      localStorage.setItem(TOKEN_KEY, data.token);
      inUser.value = "";
      inPass.value = "";
      authError.innerText = "";
      showMainScreen();
      await onAuthenticated();
    } catch (err) {
      authError.style.color = "#ff4444";
      authError.innerText = err.message || "Đăng nhập thất bại";
    } finally {
      btnDoAuth.disabled = false;
    }
  });

  [inUser, inPass].forEach((el) => {
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnDoAuth.click();
    });
  });

  btnLogout?.addEventListener("click", () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    }
  });
}

export async function syncRemoteState() {
  try {
    const remote = await loadGameFromServer();
    if (!remote) return;

    // Check if we have root data (like in the user screenshot) or inside gameState
    const rootData = remote.gameState || remote;

    const saved = {
      level: rootData.level || 1,
      runs: rootData.runs || [],
      player: rootData.player || null,
      ownedCharacters: remote.ownedCharacters || 
                       rootData.ownedCharacters || ["speedster"],
      selectedCharacter: remote.selectedCharacter || 
                         rootData.selectedCharacter || "speedster",
      characterUpgrades: rootData.characterUpgrades || {},
      resources: remote.resources || 
                 rootData.resources || { common: 0, rare: 0, legendary: 0 },
      bossFragments: remote.bossFragments || 
                     rootData.bossFragments || [],
      maps: remote.maps || rootData.maps || state.maps,
      selectedMap: remote.selectedMap || rootData.selectedMap || state.selectedMap,
    };

    localStorage.setItem(GHOST_DATA_KEY, JSON.stringify(saved));

    state.ownedCharacters = saved.ownedCharacters;
    state.selectedCharacter = saved.selectedCharacter;
    state.characterUpgrades = saved.characterUpgrades;
    state.resources = saved.resources;
    state.bossFragments = saved.bossFragments;
    state.maps = saved.maps;
    state.selectedMap = saved.selectedMap;
    
    // Fix coins sync
    const coins = remote.coins !== undefined ? remote.coins : (rootData.coins || 0);
    if (!state.player) state.player = {};
    state.player.coins = coins;
    
    if (saved.player) {
        state.player = { ...state.player, ...saved.player };
        state.player.coins = coins; // Re-apply coins to ensure it's correct
    }
  } catch (e) {
    console.warn("syncRemoteState failed:", e);
  }
}

export function persistState() {
  saveGameToServer(state, GHOST_DATA_KEY);
}
