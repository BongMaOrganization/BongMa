import { dist } from "../../utils.js";

export const ghost = {
    id: "ghost",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Ghost dùng Q để bất tử, điều này được kiểm tra bằng isInvulnSkill ở update chính.
    },

    draw: (state, ctx, canvas, buffs) => {
        // Ghost có cơ chế vẽ đặc biệt thay thế hoàn toàn thân thể khi dùng Q (Bất tử/Tàng hình).
        // Cơ chế này được xử lý trực tiếp ở phần vẽ "Player" trong file draw.js chính:
        // ctx.fillStyle = char === "ghost" ? "rgba(100,100,255,0.5)" : "white";
        // Do đó, ta không cần phải ghi đè lệnh vẽ ở đây trừ khi có VFX tách rời.
    }
};