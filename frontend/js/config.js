export const FPS = 60;
export const GHOST_DATA_KEY = "AsynchronousEchoes_V4";
export const BOSS_FRAGMENT_DROP_RATE = 0.1; // 10% chance

export const BOSS_FRAGMENTS = [
  { id: "frag_fire", name: "Mảnh Lửa", icon: "🔥", desc: "Mảnh nguyên liệu từ Fire Lord", bossType: "fireBoss" },
  { id: "frag_ice", name: "Mảnh Băng", icon: "❄️", desc: "Mảnh nguyên liệu từ Ice Queen", bossType: "iceBoss" },
  { id: "frag_storm", name: "Mảnh Sấm", icon: "⚡", desc: "Mảnh nguyên liệu từ Thunder King", bossType: "thunderBoss" },
  { id: "frag_shadow", name: "Mảnh Đất", icon: "🪨", desc: "Mảnh nguyên liệu từ Earth Titan", bossType: "earthBoss" },
  { id: "frag_spirit", name: "Mảnh Gió", icon: "🌪️", desc: "Mảnh nguyên liệu từ Wind Spirit", bossType: "windBoss" },
];

export const BOSS_ARENA_REWARDS = {
  fireBoss: { coins: 150, rareTicket: 0.15 },
  iceBoss: { coins: 130, rareTicket: 0.12 },
  thunderBoss: { coins: 180, rareTicket: 0.18 },
  earthBoss: { coins: 200, rareTicket: 0.2 },
  windBoss: { coins: 160, rareTicket: 0.15 },
  omni: { coins: 1000, rareTicket: 0.80 },
};

export const UPGRADES = [
  { id: "spd", name: "Giày Gió", desc: "+10% Tốc độ di chuyển", action: (p) => (p.speed *= 1.1) },
  { id: "fire", name: "Kích Thích", desc: "Giảm 20% thời gian nạp đạn", action: (p) => (p.fireRate = Math.max(5, p.fireRate * 0.8)) },
  { id: "multi", name: "Đạn Kép", desc: "Bắn thêm 1 tia đạn (Tối đa 5)", action: (p) => (p.multiShot = Math.min(10, p.multiShot + 1)) },
  { id: "bounce", name: "Đạn Nẩy", desc: "Đạn nẩy vào tường 1 lần", action: (p) => p.bounces++ },
  { id: "dash", name: "Lướt Nhanh", desc: "Giảm 30% hồi chiêu Lướt", action: (p) => (p.dashMaxCooldown *= 0.7) },
  {
    id: "regen",
    name: "Hồi Phục",
    desc: "Hồi 1 HP mỗi 10 giây",
    action: (p) => {
      if (!p.regenActive) {
        p.regenActive = true;
        setInterval(() => { if (p.hp < p.maxHp) p.hp++; }, 10000);
      }
    },
  },
];

export const BOSS_REWARDS = [
  { id: "hp", name: "Trái Tim", desc: "+1 Máu tối đa & Hồi đầy máu", action: (p) => { p.maxHp++; p.hp = p.maxHp; } },
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
  { id: "coin", name: "Túi Tiền", desc: "+100 Tiền", action: (p) => (p.coins = (p.coins || 0) + 100) },
];

export const SCROLLS = [
  { id: "scroll_common", name: "🟢 Vòng Quay Thường", price: 300, rarity: "common", desc: "Quay ngẫu nhiên. Trùng nhân vật → +1 NL Common.", probabilities: { common: 1, rare: 0, legendary: 0 } },
  { id: "scroll_rare", name: "🔵 Vòng Quay Rare", rarity: "rare", tradeFrom: "common", tradeCost: 5, desc: "100% nhân vật Rare.", probabilities: { rare: 1.0 } },
  { id: "scroll_legendary", name: "🟣 Vòng Quay Legendary", rarity: "legendary", tradeFrom: "rare", tradeCost: 5, desc: "100% nhân vật Legendary.", probabilities: { legendary: 1.0 } },
];