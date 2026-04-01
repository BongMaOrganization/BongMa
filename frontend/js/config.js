export const FPS = 60;
export const GHOST_DATA_KEY = "AsynchronousEchoes_V4";

// 5 mảnh nguyên liệu đặc biệt rớt từ Boss (10% mỗi lần hạ boss)
// Thu thập đủ 5 mảnh khác nhau → đổi 1 nhân vật Legendary bất kỳ
export const BOSS_FRAGMENTS = [
  { id: "frag_fire", name: "Mảnh Lửa", icon: "🔥", desc: "Mảnh nguyên liệu từ boss lửa" },
  { id: "frag_ice", name: "Mảnh Băng", icon: "❄️", desc: "Mảnh nguyên liệu từ boss băng" },
  { id: "frag_storm", name: "Mảnh Sấm", icon: "⚡", desc: "Mảnh nguyên liệu từ boss sấm" },
  { id: "frag_shadow", name: "Mảnh Bóng Tối", icon: "🌑", desc: "Mảnh nguyên liệu từ boss bóng tối" },
  { id: "frag_spirit", name: "Mảnh Linh Hồn", icon: "👻", desc: "Mảnh nguyên liệu từ boss linh hồn" },
];
export const BOSS_FRAGMENT_DROP_RATE = 0.10; // 10% chance

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
    action: (p) => (p.multiShot = Math.min(10, p.multiShot + 1)),
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
    name: "Hồi Phục",
    desc: "Hồi 1 HP mỗi 10 giây",
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
    rarity: "common",
    baseStats: { hp: 3, speed: 6.5, fireRate: 18, multiShot: 1, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Gia Tốc",
        desc: "Tăng 50% tốc độ chạy trong 3 giây. (Hồi: 8s)",
        cooldown: 8,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Quá Tải",
        desc: "Xả đạn cực nhanh trong 4 giây. (Hồi: 15s)",
        cooldown: 15,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Bão Điện Từ",
        desc: "Bắn đạn liên hoàn ra mọi hướng. (Hồi: 40s - Khóa: 30s đầu)",
        cooldown: 40,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "tank",
    name: "Pháo Đài",
    price: 300,
    rarity: "rare",
    baseStats: { hp: 4, speed: 4, fireRate: 22, multiShot: 1, bounces: 1 },
    skills: [
      {
        key: "q",
        name: "Sửa Chữa",
        desc: "Hồi ngay lập tức 1 Khiên năng lượng. (Hồi: 15s)",
        cooldown: 15,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Bức Tường Thép",
        desc: "Bất tử, miễn nhiễm mọi sát thương trong 3 giây. (Hồi: 20s)",
        cooldown: 20,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Càn Quét",
        desc: "Xóa sổ toàn bộ đạn địch xung quanh. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "sharpshooter",
    name: "Xạ Thủ",
    price: 300,
    rarity: "legendary",
    baseStats: { hp: 4, speed: 5, fireRate: 15, multiShot: 2, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Bắn Xuyên",
        desc: "Đạn nảy thêm +2 lần trong 5 giây. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Mưa Đạn",
        desc: "Số lượng tia đạn +3 trong 4 giây. (Hồi: 18s)",
        cooldown: 18,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Tầm Nhìn Tử Thần",
        desc: "Khóa mục tiêu và gây sát thương diện rộng. (Hồi: 50s - Khóa: 30s đầu)",
        cooldown: 50,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "ghost",
    name: "Bóng Ma",
    price: 300,
    rarity: "common",
    baseStats: { hp: 3, speed: 4.5, fireRate: 16, multiShot: 1, bounces: 2 },
    skills: [
      {
        key: "q",
        name: "Tàng Hình",
        desc: "Bất tử không nhận sát thương 3 giây. (Hồi: 10s)",
        cooldown: 10,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Dịch Chuyển",
        desc: "Lướt tức thời đến vị trí trỏ chuột. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Đoạt Hồn",
        desc: "Hấp thụ đạn địch xung quanh để hồi 1 HP. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "mage",
    name: "Phù Thủy",
    price: 300,
    rarity: "rare",
    baseStats: { hp: 4, speed: 5, fireRate: 12, multiShot: 3, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Cầu Lửa",
        desc: "Phóng 1 vòng đạn lửa ra xung quanh. (Hồi: 8s)",
        cooldown: 8,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Hiến Tế",
        desc: "Trừ 1 HP để đổi lấy 50 Điểm kinh nghiệm. (Hồi: 20s)",
        cooldown: 20,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Ngưng Đọng",
        desc: "Đóng băng toàn bộ kẻ địch trong 4 giây. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "berserker",
    name: "Cuồng Chiến",
    price: 450,
    rarity: "legendary",
    baseStats: { hp: 5, speed: 4.5, fireRate: 20, multiShot: 1, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Máu Điên",
        desc: "Tăng 35% tốc độ bắn và 20% tốc độ chạy trong 4 giây. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Hút Máu",
        desc: "Bắn ra 1 đợt đạn cực gần người, gây sát thương lớn. (Hồi: 14s)",
        cooldown: 14,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Tử Chiến",
        desc: "Trong 5 giây, sát thương tăng mạnh nhưng chỉ còn 1 HP. (Hồi: 50s - Khóa: 30s đầu)",
        cooldown: 50,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "assassin",
    name: "Sát Thủ",
    price: 500,
    rarity: "rare",
    baseStats: { hp: 3, speed: 6.2, fireRate: 14, multiShot: 1, bounces: 1 },
    skills: [
      {
        key: "q",
        name: "Ảnh Bộ",
        desc: "Lướt nhanh một đoạn dài và xuyên qua đạn trong 2 giây. (Hồi: 9s)",
        cooldown: 9,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Đánh Dấu",
        desc: "Đòn bắn tiếp theo gây sát thương gấp đôi lên mục tiêu gần nhất. (Hồi: 10s)",
        cooldown: 10,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Kết Liễu",
        desc: "Xả 1 loạt đạn cực nhanh theo hình nón phía trước. (Hồi: 45s - Khóa: 30s đầu)",
        cooldown: 45,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "summoner",
    name: "Triệu Hồi Sư",
    price: 550,
    rarity: "legendary",
    baseStats: { hp: 4, speed: 4.3, fireRate: 17, multiShot: 2, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "LinHồn Hộ Vệ",
        desc: "Triệu hồi 2 bóng đạn bay vòng quanh bảo vệ bạn trong 6 giây. (Hồi: 14s)",
        cooldown: 14,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Hiến Tế",
        desc: "Đổi 1 HP để nhận +2 đạn trong 8 giây. (Hồi: 18s)",
        cooldown: 18,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Bầy Quỷ",
        desc: "Tạo một đợt đạn tự động bắn ra mọi hướng trong 5 giây. (Hồi: 55s - Khóa: 30s đầu)",
        cooldown: 55,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "warden",
    name: "Người Gác Cổng",
    price: 400,
    rarity: "common",
    baseStats: { hp: 6, speed: 3.8, fireRate: 22, multiShot: 1, bounces: 2 },
    skills: [
      {
        key: "q",
        name: "Khiên Đỡ",
        desc: "Chặn toàn bộ sát thương trong 2.5 giây. (Hồi: 14s)",
        cooldown: 14,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Phản Công",
        desc: "Trong 4 giây, đạn nảy thêm +2 lần. (Hồi: 16s)",
        cooldown: 16,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Thánh Giới",
        desc: "Tạo vùng an toàn lớn xung quanh người chơi trong 4 giây. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "alchemist",
    name: "Luyện Kim Sư",
    price: 450,
    rarity: "legendary",
    baseStats: { hp: 4, speed: 4.7, fireRate: 16, multiShot: 2, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Bình Nổ",
        desc: "Phóng ra một cụm đạn nổ tỏa tròn. (Hồi: 10s)",
        cooldown: 10,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Chưng Cất",
        desc: "Hồi 1 HP hoặc +50 XP tùy trạng thái hiện tại. (Hồi: 20s)",
        cooldown: 20,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Đại Phản Ứng",
        desc: "Biến toàn bộ đạn gần bạn thành đạn của người chơi trong 3 giây. (Hồi: 50s - Khóa: 30s đầu)",
        cooldown: 50,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "oracle",
    name: "Tiên Tri",
    price: 500,
    rarity: "rare",
    baseStats: { hp: 3, speed: 5.1, fireRate: 15, multiShot: 1, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Tầm Nhìn",
        desc: "Hiển thị đường đi của đạn địch rõ hơn trong 5 giây. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Dịch Chuyển",
        desc: "Lướt tới vị trí chuột và để lại một dư ảnh. (Hồi: 11s)",
        cooldown: 11,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Định Mệnh",
        desc: "Trong 4 giây, đạn của bạn tự bẻ lái nhẹ về phía địch. (Hồi: 48s - Khóa: 30s đầu)",
        cooldown: 48,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "sniper",
    name: "Bắn Tỉa",
    price: 500,
    rarity: "legendary",
    baseStats: { hp: 3, speed: 4.2, fireRate: 30, multiShot: 1, bounces: 2 },
    skills: [
      {
        key: "q",
        name: "Tụ Điểm",
        desc: "Giảm tốc độ di chuyển nhưng tăng mạnh sát thương đạn trong 5 giây. (Hồi: 12s)",
        cooldown: 12,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Một Phát",
        desc: "Bắn 1 viên đạn cực mạnh, xuyên mục tiêu. (Hồi: 9s)",
        cooldown: 9,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Chốt Hạ",
        desc: "Khóa chặt mục tiêu gần nhất và bắn liên tiếp 5 phát. (Hồi: 45s - Khóa: 30s đầu)",
        cooldown: 45,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "engineer",
    name: "Kỹ Sư",
    price: 420,
    rarity: "common",
    baseStats: { hp: 4, speed: 4.8, fireRate: 18, multiShot: 1, bounces: 1 },
    skills: [
      {
        key: "q",
        name: "Turret Mini",
        desc: "Triệu hồi 1 ụ súng tự bắn trong 6 giây. (Hồi: 15s)",
        cooldown: 15,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Gia Cường",
        desc: "Tăng tốc bắn và tốc độ di chuyển trong 4 giây. (Hồi: 13s)",
        cooldown: 13,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Pháo Đài Cơ Khí",
        desc: "Dựng lá chắn cơ khí lớn chặn đạn trong 5 giây. (Hồi: 60s - Khóa: 30s đầu)",
        cooldown: 60,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "spirit",
    name: "Thần Linh",
    price: 600,
    rarity: "legendary",
    baseStats: { hp: 3, speed: 5.5, fireRate: 13, multiShot: 2, bounces: 2 },
    skills: [
      {
        key: "q",
        name: "Hóa Hồn",
        desc: "Trong 3 giây, xuyên qua mọi đạn và giảm sát thương nhận vào. (Hồi: 10s)",
        cooldown: 10,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Truy Hồn",
        desc: "Đạn địch gần đó bị kéo lệch khỏi bạn trong 4 giây. (Hồi: 14s)",
        cooldown: 14,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Thiên Phạt",
        desc: "Gọi sấm sét xuống toàn màn hình gây sát thương diện rộng. (Hồi: 55s - Khóa: 30s đầu)",
        cooldown: 55,
        initialCooldown: 30,
      },
    ],
  },
  {
    id: "druid",
    name: "Thuật Sĩ Rừng",
    price: 380,
    rarity: "common",
    baseStats: { hp: 4, speed: 4.9, fireRate: 17, multiShot: 2, bounces: 0 },
    skills: [
      {
        key: "q",
        name: "Hạt Mầm",
        desc: "Tạo 3 đạn xoay tròn quanh người chơi trong 5 giây. (Hồi: 11s)",
        cooldown: 11,
        initialCooldown: 0,
      },
      {
        key: "e",
        name: "Tái Sinh",
        desc: "Hồi 1 HP và tăng tốc độ tạm thời. (Hồi: 18s)",
        cooldown: 18,
        initialCooldown: 0,
      },
      {
        key: "r",
        name: "Rừng Giận Dữ",
        desc: "Đạn bắn ra sẽ tỏa thêm nhánh phụ trong 4 giây. (Hồi: 50s - Khóa: 30s đầu)",
        cooldown: 50,
        initialCooldown: 30,
      },
    ],
  },
  // ===== COMMON =====
  {
    id: "brawler",
    name: "Đấu Sĩ",
    price: 380,
    rarity: "common",
    baseStats: { hp: 5, speed: 4.8, fireRate: 19, multiShot: 1, bounces: 0 },
    skills: [
      { key: "q", name: "Đấm Nổ", desc: "Đẩy lùi kẻ địch gần.", cooldown: 8 },
      { key: "e", name: "Tăng Lực", desc: "+30% tốc độ.", cooldown: 12 },
      {
        key: "r",
        name: "Chấn Động",
        desc: "Shockwave diện rộng.",
        cooldown: 40,
      },
    ],
  },
  {
    id: "scout",
    name: "Trinh Sát",
    price: 380,
    rarity: "common",
    baseStats: { hp: 3, speed: 6.2, fireRate: 16, multiShot: 1, bounces: 1 },
    skills: [
      { key: "q", name: "Scan", desc: "Hiện đạn rõ hơn.", cooldown: 10 },
      { key: "e", name: "Lướt", desc: "Dash nhanh.", cooldown: 8 },
      { key: "r", name: "Radar", desc: "Hiện địch toàn map.", cooldown: 40 },
    ],
  },
  {
    id: "medic",
    name: "Y Sĩ",
    price: 380,
    rarity: "common",
    baseStats: { hp: 4, speed: 5, fireRate: 17, multiShot: 1, bounces: 0 },
    skills: [
      { key: "q", name: "Hồi Máu", desc: "+1 HP.", cooldown: 12 },
      { key: "e", name: "Buff", desc: +"Tăng tốc nhẹ.", cooldown: 10 },
      { key: "r", name: "Cứu Sinh", desc: "Hồi full HP.", cooldown: 60 },
    ],
  },

  // ===== RARE =====
  {
    id: "hunter",
    name: "Thợ Săn",
    price: 450,
    rarity: "rare",
    baseStats: { hp: 4, speed: 5.5, fireRate: 14, multiShot: 2, bounces: 0 },
    skills: [
      { key: "q", name: "Bẫy", desc: "Đặt bẫy damage.", cooldown: 10 },
      { key: "e", name: "Truy Dấu", desc: "Tăng dmg.", cooldown: 12 },
      { key: "r", name: "Săn Đêm", desc: "Buff crit.", cooldown: 45 },
    ],
  },
  {
    id: "frost",
    name: "Băng Sư",
    price: 450,
    rarity: "rare",
    baseStats: { hp: 4, speed: 4.8, fireRate: 13, multiShot: 2, bounces: 0 },
    skills: [
      { key: "q", name: "Freeze", desc: "Đóng băng.", cooldown: 10 },
      { key: "e", name: "Băng Giáp", desc: "Shield nhỏ.", cooldown: 12 },
      { key: "r", name: "Bão Tuyết", desc: "Slow map.", cooldown: 50 },
    ],
  },
  {
    id: "gunner",
    name: "Xạ Kích",
    price: 450,
    rarity: "rare",
    baseStats: { hp: 4, speed: 5, fireRate: 10, multiShot: 3, bounces: 0 },
    skills: [
      { key: "q", name: "Burst", desc: "Bắn nhanh.", cooldown: 8 },
      { key: "e", name: "Overheat", desc: "Spam đạn.", cooldown: 12 },
      { key: "r", name: "Bullet Hell", desc: "Spam toàn màn.", cooldown: 50 },
    ],
  },

  // ===== LEGENDARY =====
  {
    id: "timekeeper",
    name: "Time Keeper",
    price: 550,
    rarity: "legendary",
    baseStats: { hp: 3, speed: 5, fireRate: 14, multiShot: 2, bounces: 1 },
    skills: [
      { key: "q", name: "Slow Time", desc: "Làm chậm đạn.", cooldown: 10 },
      { key: "e", name: "Rewind", desc: "Quay lại vị trí.", cooldown: 15 },
      { key: "r", name: "Stop Time", desc: "Dừng thời gian.", cooldown: 60 },
    ],
  },
  {
    id: "void",
    name: "Hư Không",
    price: 550,
    rarity: "legendary",
    baseStats: { hp: 4, speed: 5, fireRate: 12, multiShot: 3, bounces: 1 },
    skills: [
      { key: "q", name: "Hút", desc: "Hút đạn.", cooldown: 10 },
      { key: "e", name: "Nổ", desc: "AOE.", cooldown: 12 },
      { key: "r", name: "Black Hole", desc: "Hút map.", cooldown: 55 },
    ],
  },
  {
    id: "storm",
    name: "Thần Sấm",
    price: 550,
    rarity: "legendary",
    baseStats: { hp: 4, speed: 5.5, fireRate: 13, multiShot: 2, bounces: 2 },
    skills: [
      { key: "q", name: "Lightning", desc: "Sét đơn.", cooldown: 8 },
      { key: "e", name: "Chain", desc: "Sét lan.", cooldown: 12 },
      { key: "r", name: "Thunderstorm", desc: "Sét toàn map.", cooldown: 55 },
    ],
  },
  {
    id: "reaper",
    name: "Tử Thần",
    price: 550,
    rarity: "legendary",
    baseStats: { hp: 3, speed: 5.2, fireRate: 14, multiShot: 2, bounces: 0 },
    skills: [
      { key: "q", name: "Hút Hồn", desc: "Hút HP.", cooldown: 10 },
      { key: "e", name: "Chém", desc: "Damage lớn.", cooldown: 12 },
      { key: "r", name: "Harvest", desc: "Clear map.", cooldown: 60 },
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

export const SCROLLS = [
  {
    id: "scroll_common",
    name: "🟢 Vòng Quay Thường",
    price: 300,
    rarity: "common",
    desc: "Quay ngẫu nhiên. Trùng nhân vật → +1 NL Common. 5 NL Common = 1 Vòng Quay Rare.",
    probabilities: {
      common: 0.7,
      rare: 0.2,
      legendary: 0.1,
    },
  },
  {
    id: "scroll_rare",
    name: "🔵 Vòng Quay Rare",
    rarity: "rare",
    tradeFrom: "common",
    tradeCost: 5,
    desc: "100% nhân vật Rare. Trùng → +1 NL Rare. 5 NL Rare = 1 Vòng Quay Legendary.",
    probabilities: {
      rare: 1.0,
    },
  },
  {
    id: "scroll_legendary",
    name: "🟣 Vòng Quay Legendary",
    rarity: "legendary",
    tradeFrom: "rare",
    tradeCost: 5,
    desc: "100% nhân vật Legendary. Cơ hội sở hữu nhân vật huyền thoại!",
    probabilities: {
      legendary: 1.0,
    },
  },
];
