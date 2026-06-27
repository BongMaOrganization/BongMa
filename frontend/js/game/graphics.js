import { state } from "../state.js";

// ============================================================
// HỆ THỐNG CHẤT LƯỢNG ĐỒ HỌA (Graphics Quality)
// ------------------------------------------------------------
// Một điểm điều khiển duy nhất cho toàn bộ hiệu ứng nặng:
//   - shadowBlur (op đắt nhất Canvas2D) nhân với 1 hệ số toàn cục qua hook ở
//     prototype -> tắt/giảm cho TẤT CẢ 800+ chỗ gọi mà không sửa từng file.
//   - particleScale: <1 giảm hạt (mức thấp), >1 thêm hạt (Ultra).
//   - renderScale: vẽ scene vào offscreen nhỏ rồi phóng to -> giảm fillrate
//     GPU theo bình phương (draw.js xử lý). FOV không đổi.
//   - extraFx: cờ cho code nhân vật bật hiệu ứng phụ khi máy khỏe.
//   - Auto-downgrade: cảnh quá tải tự hạ shadow trong frame đó, độc lập preset.
//   - Auto-detect: lần đầu chưa có lựa chọn -> đo FPS rồi tự chọn mức.
// ============================================================

export const GRAPHICS_PRESETS = {
  low: { key: "low", label: "Thấp", shadow: 0, particleScale: 0.35, renderScale: 0.7, extraFx: false },
  medium: { key: "medium", label: "Vừa", shadow: 0.55, particleScale: 0.7, renderScale: 0.85, extraFx: false },
  high: { key: "high", label: "Cao", shadow: 1, particleScale: 1, renderScale: 1, extraFx: false },
  ultra: { key: "ultra", label: "Tối đa", shadow: 1, particleScale: 1.4, renderScale: 1, extraFx: true },
};

const STORAGE_KEY = "bm_graphics";

let _shadowScale = 1; // theo preset người chơi chọn
let _frameShadowScale = 1; // adaptive theo tải, đặt lại mỗi frame
let _patched = false;

// --- auto-detect ---
let _autoActive = false;
let _autoSamples = [];
const AUTO_SAMPLE_TARGET = 120; // ~2 giây @ 60fps

function ensureSettings() {
  if (!state.settings) state.settings = {};
  return state.settings;
}

// Gắn hook vào CanvasRenderingContext2D.shadowBlur (chỉ 1 lần).
export function installShadowHook() {
  if (_patched || typeof CanvasRenderingContext2D === "undefined") return;
  const proto = CanvasRenderingContext2D.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "shadowBlur");
  if (!desc || !desc.set || !desc.get) return;

  Object.defineProperty(proto, "shadowBlur", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return desc.get.call(this);
    },
    set(v) {
      const s = _shadowScale * _frameShadowScale;
      if (s >= 0.999) desc.set.call(this, v);
      else desc.set.call(this, s <= 0 ? 0 : v * s);
    },
  });
  _patched = true;
}

export function getGraphicsPreset() {
  const key = ensureSettings().graphics || "high";
  return GRAPHICS_PRESETS[key] || GRAPHICS_PRESETS.high;
}

export function getGraphicsKey() {
  return getGraphicsPreset().key;
}

export function getRenderScale() {
  return getGraphicsPreset().renderScale || 1;
}

// Cờ cho code nhân vật: bật hiệu ứng phụ khi máy khỏe (Ultra).
export function graphicsExtraFx() {
  return !!getGraphicsPreset().extraFx;
}

// Áp dụng preset nhưng KHÔNG lưu (dùng cho mức tạm thời lúc auto-detect).
function applyPreset(key) {
  const valid = GRAPHICS_PRESETS[key] ? key : "high";
  ensureSettings().graphics = valid;
  _shadowScale = GRAPHICS_PRESETS[valid].shadow;
  return valid;
}

export function setGraphicsPreset(key) {
  const valid = applyPreset(key);
  try {
    localStorage.setItem(STORAGE_KEY, valid);
  } catch (_) {}
  return valid;
}

export function initGraphics() {
  installShadowHook();
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (_) {}

  if (saved && GRAPHICS_PRESETS[saved]) {
    applyPreset(saved); // người chơi đã chọn trước đó
  } else {
    applyPreset("high"); // tạm thời, auto-detect sẽ quyết
    _autoActive = true;
  }
}

// Gọi 1 lần đầu mỗi frame render (trong draw()).
// perfLoad: 0 = bình thường, 1 = nặng, 2 = cực nặng.
export function beginFrameQuality(perfLoad) {
  if (perfLoad >= 2) _frameShadowScale = 0;
  else if (perfLoad >= 1) _frameShadowScale = 0.4;
  else _frameShadowScale = 1;
}

// ===== AUTO-DETECT =====
export function needsAutoDetect() {
  return _autoActive;
}

export function cancelAutoDetect() {
  _autoActive = false;
  _autoSamples = [];
}

// Nạp 1 mẫu FPS. Khi đủ mẫu -> chọn mức theo FPS trung vị, lưu lại, trả về key
// đã chọn (để UI đồng bộ); chưa đủ trả null.
export function sampleAutoDetect(fps) {
  if (!_autoActive || !isFinite(fps) || fps <= 0) return null;
  _autoSamples.push(fps);
  if (_autoSamples.length < AUTO_SAMPLE_TARGET) return null;

  _autoSamples.sort((a, b) => a - b);
  const median = _autoSamples[_autoSamples.length >> 1];
  const pick = median < 40 ? "low" : median < 55 ? "medium" : "high";
  _autoActive = false;
  _autoSamples = [];
  return setGraphicsPreset(pick);
}
