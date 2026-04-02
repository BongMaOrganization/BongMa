// Khởi tạo các đối tượng Audio
export const sounds = {
  bgm: new Audio("assets/bgm.mp3"), // Nhạc nền khi chơi
  menuBgm: new Audio("assets/menu_bgm.mp3"), // Nhạc nền ở Menu

  // Các bản nhạc riêng cho từng Boss
  bossBgm5: new Audio("assets/boss_bgm_5.mp3"), // Nhạc Boss màn 5
  bossBgm10: new Audio("assets/boss_bgm_10.mp3"), // Nhạc Boss màn 10
  bossBgm15: new Audio("assets/boss_bgm_15.mp3"), // Nhạc Boss màn 15
  bossBgm20: new Audio("assets/boss_bgm_20.mp3"), // Nhạc Boss màn 20
  bossBgmDefault: new Audio("assets/boss_bgm_5.mp3"), // Nhạc dự phòng nếu các Boss sau chưa có nhạc riêng

  // Nhạc cho khoảnh khắc nhận thưởng
  upgradeBgm: new Audio("assets/upgrade_bgm.mp3"), // Nhạc khi thẻ bài nâng cấp hiện ra
  rewardBgm: new Audio("assets/boss_reward_bgm.mp3"), // Nhạc chiến thắng khi diệt Boss xong và nhận rương

  damage: new Audio("assets/damage.wav"), // Tiếng nhân vật bị thương
  gameOver: new Audio("assets/gameover.wav"), // Tiếng thua game
  button: new Audio("assets/button.wav"), // Tiếng click nút
  fragment: new Audio("assets/boss_reward_bgm.mp3"), // Âm thanh nhận mảnh ghép boss
};

// Cấu hình âm lượng và vòng lặp
sounds.bgm.loop = true;
sounds.bgm.volume = 0.4; // 40% âm lượng

sounds.menuBgm.loop = true;
sounds.menuBgm.volume = 0.3;

sounds.bossBgm5.loop = true;
sounds.bossBgm5.volume = 0.4;
sounds.bossBgm10.loop = true;
sounds.bossBgm10.volume = 0.4;
sounds.bossBgmDefault.loop = true;
sounds.bossBgmDefault.volume = 0.4;

sounds.upgradeBgm.loop = true;
sounds.upgradeBgm.volume = 0.5;

sounds.rewardBgm.loop = true;
sounds.rewardBgm.volume = 0.5;

sounds.button.volume = 0.8;
sounds.damage.volume = 0.8;

// Hàm phát hiệu ứng âm thanh (Effect)
export function playSound(name) {
  if (!sounds[name]) return;
  sounds[name].currentTime = 0; // Đặt lại từ đầu để phát mượt mà
  sounds[name]
    .play()
    .catch((e) =>
      console.log("Chưa thể phát âm thanh do trình duyệt chặn:", e),
    );
}

// Hàm quản lý Nhạc nền (BGM)
export function playBGM(type) {
  stopAllBGM();

  let track;
  if (type === "MENU") {
    track = sounds.menuBgm;
  } else if (type === "UPGRADE") {
    track = sounds.upgradeBgm;
  } else if (type === "BOSS_REWARD") {
    track = sounds.rewardBgm;
  } else if (type.startsWith("BOSS_")) {
    // Trích xuất số màn (ví dụ "BOSS_5" -> "5")
    let level = type.split("_")[1];
    // Tìm nhạc của Boss đó, nếu không có thì dùng bài mặc định
    track = sounds[`bossBgm${level}`] || sounds.bossBgmDefault;
  } else {
    track = sounds.bgm; // Các màn bình thường
  }

  if (track) {
    track
      .play()
      .catch((e) =>
        console.log("Trình duyệt yêu cầu tương tác trước khi phát nhạc"),
      );
  }
}

export function stopAllBGM() {
  const bgmTracks = [
    "bgm",
    "menuBgm",
    "bossBgm5",
    "bossBgm10",
    "bossBgmDefault",
    "upgradeBgm",
    "rewardBgm",
  ];

  bgmTracks.forEach((key) => {
    if (sounds[key]) {
      sounds[key].pause();
      sounds[key].currentTime = 0;
    }
  });
}
