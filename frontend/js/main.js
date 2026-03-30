import { state } from "./state.js";
import { GHOST_DATA_KEY } from "./config.js";
import { UI } from "./ui.js";
import { setupInput } from "./input.js";
import { initAuth, syncRemoteState } from "./auth.js";
import { changeState, startGame, nextStage } from "./game/flow.js";
import { update } from "./game/update.js";
import { draw } from "./game/draw.js";
import { openShop } from "./characters/shop.js";
import { setupMenuButtons } from "./characters/select.js";
import { evolve } from "./game/evolutions.js";
import { handleSkillsUpdate } from "./game/skills.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function changeStateBound(newState) {
  changeState(newState, gameLoop);
}

function nextStageBound() {
  nextStage(gameLoop);
}

function gameLoop() {
  if (state.gameState !== "PLAYING") return;

  handleSkillsUpdate(canvas, changeStateBound);

  const result = update(ctx, canvas, changeStateBound);

  if (result === "BOSS_KILLED" || result === "STAGE_CLEAR") {
    nextStageBound();
    return;
  }

  if (state.gameState === "PLAYING") {
    draw(ctx, canvas);
    state.loopId = requestAnimationFrame(gameLoop);
  }
}

setupInput(canvas);
initAuth(() => syncRemoteState());

UI.btnStart.onclick = () => startGame(gameLoop);
setupMenuButtons(openShop, changeStateBound);

changeStateBound("MENU");

export { evolve };
