export const speedster = {
    id: "speedster",
    update: (state, ctx, canvas, buffs, changeStateFn) => {

        if (buffs.q > 0) {
            let isSpeedsterQ = player.characterId === "speedster" && buffs.q > 0;
            state.playerSpeedModifier = isSpeedsterQ ? 1.5 : 1;
        }
        if (buffs.e > 0) {
            let isSpeedsterE = player.characterId === "speedster" && buffs.e > 0;
            state.playerFireRateModifier = isSpeedsterE ? 4 : player.fireRate;
        }
    },
};