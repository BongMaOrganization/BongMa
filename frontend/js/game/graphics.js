import { state } from "../state.js";

// ============================================================
// HỆ THỐNG CHẤT LƯỢNG ĐỒ HỌA (Graphics Quality)
// ------------------------------------------------------------
// Một điểm điều khiển duy nhất cho toàn bộ hiệu ứng nặng:
//   - shadowBlur (op đắt nhất Canvas2D) được nhân với 1 hệ số toàn cục
//     thông qua hook ở prototype -> tắt/giảm cho TẤT CẢ 800+ chỗ gọi mà
//     không cần sửa từng file.
//   - particleScale: giảm số hạt/hiệu ứng cosmetic ở mức thấp.
//   - Auto-downgrade: khi cảnh quá tải (nhiều đạn/hạt) tự hạ shadow trong
//     frame đó để FPS hồi lại, không phụ thuộc preset người chơi chọn.
// ============================================================

export const GRAPHICS_PRESETS = {
  low: { key: "low", label: "Thấp", shadow: 0, particleScale: 0.35 },
  medium: { key: "medium", label: "Vừa", shadow: 0.55, particleScale: 0.7 },
  high: { key: "high", label: "Cao", shadow: 1, particleScale: 1 },
};

const STORAGE_KEY = "bm_graphics";

let _shadowScale = 1; // theo preset người chơi chọn
let _frameShadowScale = 1; // adaptive theo tải, đặt lại mỗi frame
let _patched = false;

function ensureSettings() {
  if (!state.settings) state.settings = {};
  return state.settings;
}

// Gắn hook vào CanvasRenderingContext2D.shadowBlur (chỉ 1 lần).
// Mọi lệnh `ctx.shadowBlur = v` sẽ được nhân hệ số toàn cục.
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

export function setGraphicsPreset(key) {
  const valid = GRAPHICS_PRESETS[key] ? key : "high";
  ensureSettings().graphics = valid;
  _shadowScale = GRAPHICS_PRESETS[valid].shadow;
  try {
    localStorage.setItem(STORAGE_KEY, valid);
  } catch (_) {}
  return valid;
}

export function initGraphics() {
  installShadowHook();
  let saved = "high";
  try {
    saved = localStorage.getItem(STORAGE_KEY) || "high";
  } catch (_) {}
  setGraphicsPreset(saved);
}

// Gọi 1 lần đầu mỗi frame render (trong draw()).
// perfLoad: 0 = bình thường, 1 = nặng, 2 = cực nặng.
export function beginFrameQuality(perfLoad) {
  if (perfLoad >= 2) _frameShadowScale = 0;
  else if (perfLoad >= 1) _frameShadowScale = 0.4;
  else _frameShadowScale = 1;
}
