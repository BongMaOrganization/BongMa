// ============================================================================
// ECHO CODEC — nén record Bóng Ma cho localStorage + truyền qua server.
// Runtime vẫn dùng mảng thô [[x,y],[x,y,tx,ty],...]; chỉ nén khi LƯU/GỬI.
//
// Định dạng v1: { v: 1, sx, sy, n, d }
//   - sx, sy : tọa độ frame đầu (tuyệt đối)
//   - n      : tổng số frame (sanity check)
//   - d      : chuỗi frame nối bằng ";"
//       "dx,dy"          — di chuyển (delta so với frame trước)
//       "dx,dy,tx,ty"    — có bắn (tx,ty là target chuột TUYỆT ĐỐI)
//       "z<k>"           — k frame đứng yên liên tiếp (RLE)
// Delta thường 1-2 chữ số thay vì 4 → nhỏ ~3-5× tùy run.
// ============================================================================

export function encodeRecord(record) {
  if (!Array.isArray(record) || record.length === 0) return null;

  const sx = record[0][0];
  const sy = record[0][1];
  const parts = [];
  let px = sx;
  let py = sy;
  let zeroRun = 0;

  for (let i = 0; i < record.length; i++) {
    const f = record[i];
    const dx = f[0] - px;
    const dy = f[1] - py;
    px = f[0];
    py = f[1];
    const isShot = f.length === 4;

    if (dx === 0 && dy === 0 && !isShot) {
      zeroRun++;
      continue;
    }
    if (zeroRun > 0) {
      parts.push("z" + zeroRun);
      zeroRun = 0;
    }
    parts.push(
      isShot ? `${dx},${dy},${f[2]},${f[3]}` : `${dx},${dy}`,
    );
  }
  if (zeroRun > 0) parts.push("z" + zeroRun);

  return { v: 1, sx, sy, n: record.length, d: parts.join(";") };
}

export function decodeRecord(enc) {
  if (!enc) return null;
  // Định dạng cũ (mảng thô, chưa nén) — đọc thẳng để không mất save cũ
  if (Array.isArray(enc)) return enc;
  if (enc.v !== 1 || typeof enc.d !== "string") return null;

  const out = [];
  let x = enc.sx;
  let y = enc.sy;

  for (const p of enc.d.split(";")) {
    if (!p) continue;
    if (p[0] === "z") {
      const k = parseInt(p.slice(1), 10) || 0;
      for (let i = 0; i < k; i++) out.push([x, y]);
    } else {
      const a = p.split(",");
      x += parseInt(a[0], 10) || 0;
      y += parseInt(a[1], 10) || 0;
      if (a.length === 4) {
        out.push([x, y, parseInt(a[2], 10) || 0, parseInt(a[3], 10) || 0]);
      } else {
        out.push([x, y]);
      }
    }
  }

  // Sanity: lệch số frame quá xa → record hỏng, bỏ
  if (enc.n && Math.abs(out.length - enc.n) > 2) return null;
  return out;
}
