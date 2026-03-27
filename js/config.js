export const FPS = 60;
export const GHOST_DATA_KEY = "AsynchronousEchoes_V4";

export const UPGRADES = [
  {
    id: "spd",
    name: "Giày Gió",
    desc: "+10% Tốc độ di chuyển",
    action: (p) => (p.speed *= 1.1),
  },
  {
    id: "fire",
    name: "Kích Thích",
    desc: "Giảm 20% thời gian nạp đạn",
    action: (p) => (p.fireRate = Math.max(5, p.fireRate * 0.8)),
  },
  {
    id: "multi",
    name: "Đạn Kép",
    desc: "Bắn thêm 1 tia đạn (Tối đa 5)",
    action: (p) => (p.multiShot = Math.min(5, p.multiShot + 1)),
  },
  {
    id: "bounce",
    name: "Đạn Nẩy",
    desc: "Đạn nẩy vào tường 1 lần",
    action: (p) => p.bounces++,
  },
  {
    id: "dash",
    name: "Lướt Nhanh",
    desc: "Giảm 30% hồi chiêu Lướt",
    action: (p) => (p.dashMaxCooldown *= 0.7),
  },
];

export const BOSS_REWARDS = [
  {
    id: "hp",
    name: "Trái Tim",
    desc: "+1 Máu tối đa & Hồi đầy máu",
    action: (p) => {
      p.maxHp++;
      p.hp = p.maxHp;
    },
  },
  {
    id: "shield",
    name: "Khiên Năng Lượng",
    desc: "Chặn 1 đòn tấn công bất kỳ và tự hồi sau 5s",
    action: (p) => {
      p.maxShield = (p.maxShield || 0) + 1;
      p.shield = p.maxShield;
      p.shieldRegenTimer = 0;
    },
  },
  {
    id: "coin",
    name: "Túi Tiền",
    desc: "+100 Tiền (Chưa có shop)",
    action: (p) => (p.coins = (p.coins || 0) + 100),
  },
];
