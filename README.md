Asynchronous Echoes (Bóng Ma Quá Khứ) 🎮

Đây là một tựa game sinh tồn góc nhìn từ trên xuống (Top-down Survival Shooter) được viết hoàn toàn bằng HTML5 Canvas và JavaScript thuần (Vanilla JS).

Điểm nổi bật của game là cơ chế "Bóng Ma" (Asynchronous Multiplayer): Lối chơi của bạn ở các ván trước sẽ được ghi hình lại và biến thành những "Bóng ma" sát thủ đuổi theo bạn ở các ván chơi tiếp theo.

📁 Cấu trúc Thư mục và Chức năng File

Dự án được chia module hóa (Component-based) để dễ dàng quản lý và mở rộng.

1. File Gốc (Root)

index.html: Giao diện chính của game, chứa <canvas> và các lớp UI tĩnh (Menu, Cửa hàng, Nâng cấp...).

style.css: Chứa toàn bộ phong cách thiết kế, bố cục, hiệu ứng (UI/UX) cho trò chơi.

main.js: Điểm neo (Entry point) của ứng dụng. Gắn kết các sự kiện chuột/phím, khởi chạy vòng lặp game (gameLoop) và quản lý Đăng nhập/Đăng ký.

state.js: Nơi lưu trữ trạng thái toàn cục (Global State) của trò chơi: thông tin người chơi, mảng đạn, quái, thời gian, kỹ năng... Mọi file khác đều đọc/ghi vào đây.

config.js: Cấu hình tĩnh như FPS, thông số các Nhân vật (Máu, Tốc, Kỹ năng), thông số Thẻ nâng cấp, và Rương thưởng Boss.

utils.js: Các hàm hỗ trợ dùng chung (tính khoảng cách dist), và đặc biệt là các API giao tiếp với Server (Đăng ký, Đăng nhập, Lưu/Tải dữ liệu Cloud).

ui.js: Chuyên xử lý việc thao tác với DOM (Cập nhật thanh Máu, thanh XP, render thẻ bài Nâng Cấp...).

entities.js: Nơi định nghĩa và tạo ra các thực thể ban đầu: Khởi tạo Player, sinh Đạn (spawnBullet), sinh Dummy, và các chuỗi tấn công của Boss.

auth.js (Nếu có): Logic xác thực tài khoản và gọi hàm đồng bộ dữ liệu.

2. Thư mục characters/ (Quản lý Nhân Vật)

manager.js: Quản lý việc áp dụng các chỉ số cơ bản của nhân vật (từ config.js) cộng dồn với các chỉ số Nâng cấp ngoài màn hình để đưa vào game.

select.js: Logic render giao diện "Chọn Nhân Vật" và trang "Nâng Cấp Chi Tiết" (tăng Máu/Tốc độ bằng Tiền).

shop.js: Logic render giao diện "Cửa Hàng", mua nhân vật mới bằng số Tiền kiếm được trong trận.

3. Thư mục game/ (Lõi Trò Chơi)

flow.js: Trái tim của hệ thống luồng. Xử lý việc chuyển đổi màn hình (Menu -> Vào Game -> Nâng Cấp -> Boss), khởi tạo lại các biến khi qua màn (initGame).

update.js: Logic tính toán diễn ra ở mỗi khung hình. Xử lý di chuyển, lướt (dash), sinh quái, đếm ngược thời gian và điều khiển bóng ma.

draw.js: Logic Vẽ đồ họa. Chỉ làm một nhiệm vụ: Lấy dữ liệu từ state.js và tô vẽ lên <canvas>.

combat.js: Xử lý logic va chạm, tính sát thương, cọ xát đạn, trừ máu và cộng kinh nghiệm.

input.js: Lắng nghe sự kiện bàn phím và chuột để lưu vào state.keys và state.mouse.

skills.js: Xử lý Kỹ năng đặc biệt của các nhân vật (Q, E, R), tính toán thời gian hồi chiêu và hiển thị giao diện Cooldown lên màn hình.

audio.js: Trình quản lý toàn bộ Âm thanh (Nhạc nền, tiếng súng, tiếng click chuột, tiếng thua cuộc...).

evolutions.js: Xử lý việc "Tiến hóa" (Hóa Thần) khi một thẻ Nâng Cấp đạt đến cấp tối đa (Cấp 5).

🎮 Hướng Dẫn Chơi (Gameplay Guide)

Điều khiển Cơ bản

W, A, S, D hoặc Phím mũi tên: Di chuyển nhân vật.

Chuột trái (Giữ / Click): Xả đạn về phía con trỏ chuột.

Phím SPACE: Lướt (Dash) về hướng di chuyển hiện tại. Khi lướt, nhân vật sẽ rơi vào trạng thái bất tử tạm thời.

Kỹ Năng Nhân Vật (Q, E, R)

Mỗi nhân vật có một bộ 3 kỹ năng độc nhất:

Q: Kỹ năng phụ trợ / Tự vệ (Hồi chiêu ngắn).

E: Kỹ năng đặc biệt / Bất tử / Xả sát thương (Hồi chiêu trung bình).

R: Chiêu Cuối (Ultimate) - Khóa trong 30 giây đầu tiên của ván chơi. Hiệu ứng cực mạnh bao trùm màn hình.

Mục Tiêu

Sinh tồn: Sống sót qua thời gian quy định của mỗi màn. Né tránh các "Bóng ma" (Chính là đường đi của bạn ở ván trước).

Nâng cấp: Nhặt Kinh nghiệm để lên cấp -> Mở khóa sức mạnh (Đạn nảy, Đạn kép, Máu, Tốc độ). Khi một kỹ năng đạt mốc 5/5 -> Có cơ hội Hóa Thần.

Đánh Boss: Mỗi 5 màn sẽ xuất hiện 1 con Boss với lượng máu trâu và các chuỗi đạn dày đặc (Bullet Hell). Đánh bại Boss sẽ nhận được Rương thưởng siêu giá trị.

Mở Khóa: Dùng tiền kiếm được mang ra Cửa Hàng để mua những Nhân vật xịn xò hơn.

⚙️ Hướng dẫn Cài đặt & Chạy Game

Game chỉ sử dụng HTML/CSS/JS tĩnh nên rất dễ chạy:

Cách 1 (Nhanh nhất): Sử dụng Extension Live Server trong VS Code. Click chuột phải vào file index.html và chọn Open with Live Server.

Cách 2: Chạy qua localhost. Tránh mở file .html trực tiếp bằng trình duyệt (giao thức file://) vì có thể gây lỗi nạp file âm thanh hoặc Module hệ thống (lỗi CORS).

Server Backend (Tùy chọn): Nếu bạn có chạy kèm một server Node.js/Express cục bộ tại http://localhost:3000, game sẽ tự động lưu dữ liệu lên Cloud. Nếu không có Server, game sẽ lưu tiến trình ở bộ nhớ tạm của trình duyệt (localStorage).

Chúc bạn chơi game vui vẻ và sống sót lâu nhất có thể!
