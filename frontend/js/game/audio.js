// Khởi tạo các đối tượng Audio
export const sounds = {
  bgm: new Audio("assets/bgm.mp3"), // Nhạc nền khi chơi
  menuBgm: new Audio("assets/menu_bgm.mp3"), // Nhạc nền ở Menu
  shoot: new Audio("assets/shoot.wav"), // Tiếng bắn súng
  hit: new Audio("assets/hit.wav"), // Tiếng quái bị trúng đạn
  damage: new Audio("assets/damage.wav"), // Tiếng nhân vật bị thương
  gameOver: new Audio("assets/gameover.wav"), // Tiếng thua game
  button: new Audio("assets/button.wav"), // Tiếng click nút
};

// Cấu hình âm lượng và vòng lặp
sounds.bgm.loop = true;
sounds.bgm.volume = 0.4; // 40% âm lượng

sounds.menuBgm.loop = true;
sounds.menuBgm.volume = 0.3;

// Hàm phát hiệu ứng âm thanh (Effect)
export function playSound(name) {
  if (!sounds[name]) return;
  // Clone node giúp phát nhiều âm thanh (như tiếng súng bắn liên tục) chồng lên nhau mà không bị ngắt
  let s = sounds[name].cloneNode();
  s.volume = sounds[name].volume || 1;
  s.play().catch((e) =>
    console.log("Chưa thể phát âm thanh do trình duyệt chặn:", e),
  );
}

// Hàm quản lý Nhạc nền (BGM)
export function playBGM(type) {
  stopAllBGM();
  let track = type === "MENU" ? sounds.menuBgm : sounds.bgm;
  track
    .play()
    .catch((e) =>
      console.log("Trình duyệt yêu cầu tương tác trước khi phát nhạc"),
    );
}

export function stopAllBGM() {
  sounds.bgm.pause();
  sounds.bgm.currentTime = 0;
  sounds.menuBgm.pause();
  sounds.menuBgm.currentTime = 0;
}
