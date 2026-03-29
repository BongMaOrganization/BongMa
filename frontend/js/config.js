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
  {
    id: "regen",
    name: "Regeneration",
    desc: "Regenerate 1 HP every 10 seconds",
    action: (p) => {
      if (!p.regenActive) {
        p.regenActive = true;
        setInterval(() => {
          if (p.hp < p.maxHp) {
            p.hp++;
            console.log("Regenerated 1 HP.");
          }
        }, 10000); // Regenerate every 10 seconds
      }
    },
  },
];

export const CHARACTERS = [
  {
    id: "speedster",
    name: "Tia Chớp",
    price: 300,
    baseStats: { hp: 3, speed: 6.5, fireRate: 18, multiShot: 1, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Gia Tốc",
        desc: "[Q] Tăng 50% tốc độ chạy trong 3 giây. (Hồi: 8s)",
        cooldown: 8,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Quá Tải",
        desc: "[E] Xả đạn cực nhanh trong 4 giây. (Hồi: 15s)",
        cooldown: 15,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Bão Điện Từ",
        desc: "[R] Bắn đạn liên hoàn ra mọi hướng. (Hồi: 40s - Khóa: 30s đầu)",
        cooldown: 40,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "tank",
    name: "Pháo Đài",
    price: 300,
    baseStats: { hp: 4, speed: 4, fireRate: 22, multiShot: 1, bounces: 1 },
    skills: [
      {
        key: "q",
        name: "Sửa Chữa",
        desc: "[Q] Hồi ngay lập tức 1 Khiên năng lượng. (Hồi: 15s)",
        cooldown: 15,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Bức Tường Thép",
        desc: "[E] Bất tử, miễn nhiễm mọi sát thương trong 3 giây. (Hồi: 20s)",
        cooldown: 20,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Càn Quét",
        desc: "[R] Xóa sổ toàn bộ đạn địch xung quanh. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "sharpshooter",
    name: "Xạ Thủ",
    price: 300,
    baseStats: { hp: 4, speed: 5, fireRate: 15, multiShot: 2, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Bắn Xuyên",
        desc: "[Q] Đạn nảy thêm +2 lần trong 5 giây. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Mưa Đạn",
        desc: "[E] Số lượng tia đạn +3 trong 4 giây. (Hồi: 18s)",
        cooldown: 18,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Tầm Nhìn Tử Thần",
        desc: "[R] Khóa mục tiêu và gây sát thương diện rộng. (Hồi: 50s - Khóa: 30s đầu)",
        cooldown: 50,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "ghost",
    name: "Bóng Ma",
    price: 300,
    baseStats: { hp: 3, speed: 4.5, fireRate: 16, multiShot: 1, bounces: 2 },
    skills: [
      {
        key: "q",
        name: "Tàng Hình",
        desc: "[Q] Bất tử không nhận sát thương 3 giây. (Hồi: 10s)",
        cooldown: 10,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Dịch Chuyển",
        desc: "[E] Lướt tức thời đến vị trí trỏ chuột. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Đoạt Hồn",
        desc: "[R] Hấp thụ đạn địch xung quanh để hồi 1 HP. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "mage",
    name: "Phù Thủy",
    price: 300,
    baseStats: { hp: 4, speed: 5, fireRate: 12, multiShot: 3, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Cầu Lửa",
        desc: "[Q] Phóng 1 vòng đạn lửa ra xung quanh. (Hồi: 8s)",
        cooldown: 8,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Hiến Tế",
        desc: "[E] Trừ 1 HP để đổi lấy 50 Điểm kinh nghiệm. (Hồi: 20s)",
        cooldown: 20,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Ngưng Đọng",
        desc: "[R] Đóng băng toàn bộ kẻ địch trong 4 giây. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
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
    desc: "+100 Tiền",
    action: (p) => (p.coins = (p.coins || 0) + 100),
  },
];
