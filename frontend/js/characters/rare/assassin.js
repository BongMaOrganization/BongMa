import { dist } from "../../utils.js";

export const assassin = {
    id: "assassin",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Kỹ năng Q của Assassin là tàng hình/bất tử (xử lý chung ở isInvulnSkill bên update chính)

        // Kỹ năng E: Kích hoạt đòn đánh đặc biệt (Tự động ngắm quái gần nhất hoặc Boss)
        if (buffs.e > 0) {
            // Gán cờ hiệu để hàm bắn đạn trong combat/update nhận diện
            state.assassinE_Active = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng E: Vòng tròn trắng lấy nét chuẩn bị ám sát
        if (buffs.e > 0) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
};