import { state } from "./state.js";
import { setGraphicsPreset, getGraphicsKey, cancelAutoDetect } from "./game/graphics.js";

// ============================================================
// UI CÀI ĐẶT: Mức đồ họa + Giới hạn FPS
// graphics.js đã nạp preset đồ họa từ localStorage; ở đây ta nạp FPS cap
// và nối các <select> với hành vi tương ứng.
// ============================================================

const FPS_KEY = "bm_fps_cap";
const SHOW_FPS_KEY = "bm_show_fps";

function ensureSettings() {
  if (!state.settings) state.settings = {};
  return state.settings;
}

// Nạp cờ hiện FPS (mặc định tắt).
export function loadShowFps() {
  const s = ensureSettings();
  let saved = "0";
  try {
    saved = localStorage.getItem(SHOW_FPS_KEY) ?? "0";
  } catch (_) {}
  s.showFps = saved === "1";
  return s.showFps;
}

function setShowFps(on) {
  const s = ensureSettings();
  s.showFps = !!on;
  try {
    localStorage.setItem(SHOW_FPS_KEY, s.showFps ? "1" : "0");
  } catch (_) {}
}

// Nạp FPS cap đã lưu (mặc định 60 — giữ cảm giác như cũ, tránh vẽ thừa trên
// màn hình tần số cao vì game không nội suy khung).
export function loadFpsCap() {
  const s = ensureSettings();
  let saved = "60";
  try {
    saved = localStorage.getItem(FPS_KEY) ?? "60";
  } catch (_) {}
  s.fpsCap = parseInt(saved, 10) || 0;
  return s.fpsCap;
}

function setFpsCap(value) {
  const s = ensureSettings();
  s.fpsCap = parseInt(value, 10) || 0;
  try {
    localStorage.setItem(FPS_KEY, String(s.fpsCap));
  } catch (_) {}
}

export function setupSettingsUI() {
  loadFpsCap();
  loadShowFps();

  const screen = document.getElementById("screen-settings");
  const main = document.getElementById("screen-main");
  const btnOpen = document.getElementById("btn-settings");
  const btnBack = document.getElementById("btn-settings-back");
  const selGraphics = document.getElementById("setting-graphics");
  const selFps = document.getElementById("setting-fps");
  const chkFps = document.getElementById("setting-show-fps");

  // Đồng bộ select với giá trị hiện tại
  if (selGraphics) {
    selGraphics.value = getGraphicsKey();
    selGraphics.addEventListener("change", (e) => {
      cancelAutoDetect(); // người chơi tự chọn -> tắt auto-detect
      setGraphicsPreset(e.target.value);
    });
  }

  if (selFps) {
    selFps.value = String(ensureSettings().fpsCap ?? 60);
    selFps.addEventListener("change", (e) => {
      setFpsCap(e.target.value);
    });
  }

  if (chkFps) {
    chkFps.checked = !!ensureSettings().showFps;
    chkFps.addEventListener("change", (e) => {
      setShowFps(e.target.checked);
    });
  }

  if (btnOpen && screen && main) {
    btnOpen.addEventListener("click", () => {
      main.classList.add("hidden");
      screen.classList.remove("hidden");
    });
  }
  if (btnBack && screen && main) {
    btnBack.addEventListener("click", () => {
      screen.classList.add("hidden");
      main.classList.remove("hidden");
    });
  }
}
