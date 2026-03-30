import { state } from "../state.js";
import { CHARACTERS, GHOST_DATA_KEY } from "../config.js";
import { saveGame } from "../utils.js";
import { persistState } from "../auth.js";

export function openShop(changeStateFn) {
  changeStateFn("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-shop").classList.remove("hidden");
  renderShop();
}

export function renderShop() {
  document.getElementById("shop-coins").innerText =
    `Tiền: ${state.player?.coins || 0}`;
  let container = document.getElementById("shop-cards");
  container.innerHTML = "";

  CHARACTERS.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let card = document.createElement("div");
    card.className = "card";
    card.style.width = "190px";

    let skillsHtml = char.skills
      .map((s) => {
        let keyPrefix = s.key ? `[${s.key.toUpperCase()}] ` : "";
        return `• <b style="color: #00ffcc">${s.name}</b>: ${keyPrefix}${s.desc}`;
      })
      .join("<br><br>");

    card.innerHTML = `
      <h3>${char.name}</h3>
      <p style="margin-bottom: 5px; color: #ffd700;">Giá: ${char.price}</p>
      <p style="margin-bottom: 5px; color: #ffaa00; font-weight: bold;">HP: ${char.baseStats.hp} | Tốc độ: ${char.baseStats.speed} | Tia đạn: ${char.baseStats.multiShot} | Đạn nẩy: ${char.baseStats.bounces}</p>
      <div class="char-skills" style="font-size: 0.9em; margin-bottom: 10px; height: 110px; overflow-y: auto; text-align: left; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 5px;">
        ${skillsHtml}
      </div>
    `;

    let btn = document.createElement("button");
    btn.innerText = owned ? "Đã mở khóa" : "Mua";
    btn.disabled = owned || (state.player?.coins || 0) < char.price;
    btn.onclick = () => {
      if (!owned && state.player.coins >= char.price) {
        state.player.coins -= char.price;
        state.ownedCharacters.push(char.id);
        saveGame(state, GHOST_DATA_KEY);
        persistState();
        renderShop();
      }
    };

    card.appendChild(btn);
    container.appendChild(card);
  });
}
