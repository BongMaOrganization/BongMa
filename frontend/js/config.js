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

export const CHARACTERS = [
  {
    id: "speedster",
    name: "Tia Chớp",
    price: 300,
    baseStats: { hp: 3, speed: 6.5, fireRate: 18, multiShot: 1, bounces: 0 },
    skills: [
      {
        name: "Thân Pháp Kilowatt",
        desc: "Tốc độ di chuyển cơ bản cực kỳ nhanh.",
      },
      { name: "Đạn Ánh Sáng", desc: "Độ trễ khi bắn thấp, xả đạn mượt mà." },
      { name: "Nhanh Nhẹn", desc: "Dễ dàng luồn lách để né tránh sát thương." },
    ],
  },
  {
    id: "tank",
    name: "Pháo Đài",
    price: 300,
    baseStats: { hp: 4, speed: 4, fireRate: 22, multiShot: 1, bounces: 1 },
    skills: [
      {
        name: "Giáp Titanium",
        desc: "Lượng Máu (HP) tối đa khởi đầu lớn hơn.",
      },
      {
        name: "Lõi Năng Lượng",
        desc: "Sở hữu 1 lớp khiên chặn sát thương, có thể tự hồi.",
      },
      {
        name: "Đạn Đập Mảnh",
        desc: "Đạn có khả năng nảy bật vào tường 1 lần.",
      },
    ],
  },
  {
    id: "sharpshooter",
    name: "Xạ Thủ",
    price: 300,
    baseStats: { hp: 4, speed: 5, fireRate: 15, multiShot: 2, bounces: 0 },
    skills: [
      { name: "Súng Đôi", desc: "Mỗi lần bắn phóng ra 2 tia đạn cùng lúc." },
      { name: "Cò Nhạy", desc: "Tốc độ xả đạn cơ bản ở mức rất cao." },
      {
        name: "Mắt Ưng",
        desc: "Đường đạn bay sát nhau, dễ tập trung sát thương.",
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
        name: "Đạn Linh Hồn",
        desc: "Đạn bay có khả năng nảy dội tường tối đa 2 lần.",
      },
      {
        name: "Thoắt Ẩn",
        desc: "Thời gian bất tử (chớp nháy) sau khi bị thương lâu hơn.",
      },
      {
        name: "Góc Khuất",
        desc: "Cực kỳ nguy hiểm khi chiến đấu trong không gian hẹp.",
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
        name: "Mưa Sao Băng",
        desc: "Khởi đầu phóng ra 3 tia đạn tỏa theo hình nón.",
      },
      {
        name: "Tụ Năng Lượng",
        desc: "Tốc độ bắn liên tục (Fire Rate) nhanh nhất game.",
      },
      {
        name: "Tri Thức",
        desc: "Sinh ra để dọn dẹp số lượng lớn kẻ thù cùng lúc.",
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
    desc: "+100 Tiền (Chưa có shop)",
    action: (p) => (p.coins = (p.coins || 0) + 100),
  },
];
