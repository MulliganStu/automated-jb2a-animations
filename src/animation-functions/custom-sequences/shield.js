import { JB2APATREONDB } from "../databases/jb2a-patreon-database.js";
import { JB2AFREEDB } from "../databases/jb2a-free-database.js";
import { aaColorMenu } from "../databases/jb2a-menu-options.js";
import { aaDebugger } from "../../constants/constants.js";
import { AAanimationData } from "../../aa-classes/animation-data.js";

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function shieldSpell(handler, animationData) {
    function moduleIncludes(test) {
        return !!game.modules.get(test);
    }
    let obj01 = moduleIncludes("jb2a_patreon") === true ? JB2APATREONDB : JB2AFREEDB;

    let globalDelay = game.settings.get("autoanimations", "globaldelay");
    await wait(globalDelay);

    async function buildShieldFile(jb2a, baseColor, variant, endeffect) {
        //const spellVariant = handler.spellVariant || "01";
        let color = baseColor;
        color = color.replace(/\s+/g, '');
        function random_item(items) {
            return items[Math.floor(Math.random() * items.length)];
        }
        color = color === "random" ? random_item(Object.keys(aaColorMenu.static.spell.shieldspell[variant])) : color;
        //const shieldVar = handler.options.shieldVar || "outro_fade";

        const file01 = `autoanimations.static.spell.shieldspell.${variant}.${color}.intro`;
        const file02 = `autoanimations.static.spell.shieldspell.${variant}.${color}.loop`;
        const file03 = `autoanimations.static.spell.shieldspell.${variant}.${color}.${endeffect}`;

        return { file01, file02, file03 };
    }

    const data = animationData.primary;
    const sourceFX = animationData.sourceFX;

    //const shieldData =  handler.flags?.preset?.shield;
    const shieldData = data.isAuto ? handler.autorecObject?.shield : handler.flags?.preset?.shield;
    if (!shieldData) { return; }
    const cleanData = {
        variant: shieldData.variant || "01",
        color: shieldData.color || "blue",
        below: shieldData.below || false,
        endEffect: shieldData.endEffect || "outro_explode",
        scale: shieldData.scale || 1,
        persistent: shieldData.persistent || false,
        unbindAlpha: shieldData.unbindAlpha || false,
        unbindVisibility: shieldData.unbindVisibility || false
    }

    /*
    if (data.isAuto) {
        const autoOverridden = handler.autorecOverrides?.enable
        data.persistent = autoOverridden ? handler.autorecOverrides?.persistent : data.addCTA;
        data.endeffect = autoOverridden ? handler.autorecOverrides?.endEffect : data.endeffect;
    } else {
        data.endeffect = data.options.shieldVar ?? "outro_fade";
    }
    */
    const sourceToken = handler.sourceToken;
    const onToken = await buildShieldFile(obj01, cleanData.color, cleanData.variant, cleanData.endEffect);

    if (handler.debug) { aaDebugger("Shield Animation Start", animationData, onToken) }
    const checkAnim = Sequencer.EffectManager.getEffects({ object: sourceToken, origin: handler.itemUuid }).length > 0

    const sourceTokenGS = sourceToken.w / canvas.grid.size;

    async function cast() {
        let aaSeq = await new Sequence()
        // Play Macro if Awaiting
        if (data.playMacro && data.macro.playWhen === "1") {
            let userData = data.macro.args;
            aaSeq.macro(data.macro.name, handler.workflow, handler, ...userData)
        }
        // Extra Effects => Source Token if active
        if (sourceFX.enabled) {
            aaSeq.addSequence(sourceFX.sourceSeq)
        }
        if (data.playSound) {
            aaSeq.addSequence(await AAanimationData._sounds({ animationData }))
        }
        // Animation Start Hook
        aaSeq.thenDo(function () {
            Hooks.callAll("aa.animationStart", sourceToken, handler.allTargets)
        })
        aaSeq.effect()
            .file(onToken.file01)
            .size(sourceTokenGS * 1.75 * cleanData.scale, {gridUnits: true})
            .atLocation(sourceToken)
            .belowTokens(cleanData.below)
            .waitUntilFinished(-500)
        let persistSwitch = aaSeq.effect();
        persistSwitch.file(onToken.file02)
        persistSwitch.size(sourceTokenGS * 1.75 * cleanData.scale, {gridUnits: true})
        persistSwitch.atLocation(sourceToken)
        persistSwitch.belowTokens(cleanData.below)
        persistSwitch.fadeIn(300)
        persistSwitch.fadeOut(300)
        persistSwitch.origin(handler.itemUuid)
        if (cleanData.persistent) {
            if (handler.isActiveEffect) {
                persistSwitch.name(handler.itemName + `${sourceToken.id}`)
            } else {
                persistSwitch.name(`${sourceToken.id}`)
            }
            persistSwitch.attachTo(sourceToken, {bindAlpha: cleanData.unbindAlpha, bindVisibility: cleanData.unbindVisibility});
            persistSwitch.persist();
            persistSwitch.origin(handler.itemUuid)
        }
        else { persistSwitch.atLocation(sourceToken) }
        persistSwitch.waitUntilFinished(-1000)
        aaSeq.effect()
            .file(onToken.file03)
            .size(sourceTokenGS * 1.75 * cleanData.scale, {gridUnits: true})
            .belowTokens(cleanData.below)
            .atLocation(sourceToken)
        if (data.playMacro && data.macro.playWhen === "0") {
            let userData = data.macro.args;
            new Sequence()
                .macro(data.macro.name, handler.workflow, handler, ...userData)
                .play()
        }
        aaSeq.play()
        Hooks.callAll("aa.animationEnd", sourceToken, handler.allTargets)
    }
    if (!checkAnim) {
        cast()
    }
}
/*
function getVideoDimensionsOf(url) {
    return new Promise(resolve => {
        // create the video element
        const video = document.createElement('video');
        video.preload = "metadata";

        // place a listener on it
        video.addEventListener("loadedmetadata", function () {
            // retrieve dimensions
            const height = this.videoHeight;
            const width = this.videoWidth;
            const duration = this.duration
            // send back result
            resolve({ height, width, duration });
        }, false);
        video.src = url;

    });
}
*/