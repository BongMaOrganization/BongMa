import { state } from "./state.js";

export function setupInput(canvas) {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") e.preventDefault();
    state.keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") state.keys["space"] = true;
  });

  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
    if (e.code === "Space") state.keys["space"] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    // Lưu tọa độ thật trên màn hình thay vì gán thẳng vào thế giới
    state.mouse.screenX = e.clientX - rect.left;
    state.mouse.screenY = e.clientY - rect.top;

    // Ngay lập tức cập nhật vị trí chuột trong World Map dựa theo Camera
    state.mouse.x = state.mouse.screenX + state.camera.x;
    state.mouse.y = state.mouse.screenY + state.camera.y;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (state.gameState === "PLAYING") {
      state.mouse.isDown = true;
      state.mouse.clicked = true;
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    state.mouse.isDown = false;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    state.mouse.isDown = false;
  });
}
