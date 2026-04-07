// Import toàn bộ các nhân vật đã được tách file

// Common
import { brawler } from "./common/brawler.js";
import { druid } from "./common/druid.js";
import { engineer } from "./common/engineer.js";
import { ghost } from "./common/ghost.js";
import { medic } from "./common/medic.js";
import { speedster } from "./common/speedster.js";
import { warden } from "./common/warden.js";

// Rare
import { assassin } from "./rare/assassin.js";
import { frost } from "./rare/frost.js";
import { gunner } from "./rare/gunner.js";
import { hunter } from "./rare/hunter.js";
import { knight } from "./rare/knight.js";
import { mage } from "./rare/mage.js";
import { oracle } from "./rare/oracle.js";
import { tank } from "./rare/tank.js";

// Legendary
import { berserker } from "./legendary/berserker.js";
import { alchemist } from "./legendary/alchemist.js";
import { reaper } from "./legendary/reaper.js";
import { sharpshooter } from "./legendary/sharpshooter.js";
import { sniper } from "./legendary/sniper.js";
import { spirit } from "./legendary/spirit.js";
import { storm } from "./legendary/storm.js";
import { summoner } from "./legendary/summoner.js";
import { timekeeper } from "./legendary/timekeeper.js";
import { voidChar } from "./legendary/void.js";
// Mythical
import { phoenix } from "./mythical/phoenix.js";
import { necromancer } from "./mythical/necromancer.js";
import { destroyer } from "./mythical/destroyer.js";
import { creator } from "./mythical/creator.js";
import { elementalist } from "./mythical/elementalist.js";
import { painter } from "./mythical/painter.js";
import { scout } from "./mythical/scout.js";

export const Characters = {
    assassin,
    berserker,
    elementalist,
    ghost,
    mage,
    painter,
    sharpshooter,
    speedster,
    summoner,
    tank,
    voidChar,
    warden,
    alchemist,
    engineer,
    sniper,
    oracle,
    brawler,
    druid,
    spirit,
    hunter,
    medic,
    scout,
    frost,
    gunner,
    timekeeper,
    storm,
    reaper,
    phoenix,
    necromancer,
    destroyer,
    creator,
    knight
};

export function triggerCharacterSkill(charId, key, state, canvas, changeStateFn) {
    const char = Characters[charId];
    if (char && typeof char.onTrigger === "function") {
        return char.onTrigger(key, state, canvas, changeStateFn);
    }
    return true;
}


export function updateActiveCharacter(state, ctx, canvas, buffs, changeStateFn) {
    const charId = state.player.characterId;
    const char = Characters[charId];
    if (char && typeof char.update === "function") {
        char.update(state, ctx, canvas, buffs, changeStateFn);
    }
}

export function drawActiveCharacter(state, ctx, canvas, buffs) {
    const charId = state.player.characterId;
    const char = Characters[charId];
    if (char && typeof char.draw === "function") {
        char.draw(state, ctx, canvas, buffs);
    }
}