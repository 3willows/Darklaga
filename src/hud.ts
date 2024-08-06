import * as GL from "./webgl"
import * as S from "./sprites"
import * as Float from "./float"
import * as Fury from "./fury"
import { opts } from "./options"
import { hasTarget } from "./shot"
import * as Snd from "./sound"
import * as Stats from "./stats"

export const ITEM_LASER = 0
export const ITEM_ROCKETS = 1
export const ITEM_BLADES = 2
export const ITEM_SPEED = 3
export const ITEM_MULTI = 4
export const ITEM_OFFP = 5
export const ITEM_SHIELD = 6
export const ITEM_FURY = 7
export const ITEM_DEFP = 8
export const ITEM_WNONE = 9
export const ITEM_ONONE = 10
export const ITEM_DNONE = 11

const COMBO_DELAY = 170
const GRAZE_DELAY = 170

type Hud = {
    score: number
    real_score: number
    timer: number
    frl1: number
    frl2: number
    frl3: number
    fury_progress: number
    displayed_fury: number
    combo: number
    combo_timer: number
    lives: number
    combo_fade: number
    combo_fade_value: number

    graze: number,
    graze_anim: number,
    graze_timer: number,

    weapon: number
    weapon_overload: number

    offense: number
    offense_overload: number
    
    defense: number
    defense_overload: number

    lastlife: number
    invulnerable: number
    danger: number
    death_alpha: number
    fire_timer: number
    tatk_lost_lives: number

    player_x: number,
    player_y: number
}

function empty() : Hud {
    return {
        score: 0,
        real_score: 0,
        timer: 0,
        frl1: 0,
        frl2: 0,
        frl3: 0,
        graze: 0,
        graze_anim: 0,
        graze_timer: 0,
        fury_progress: 0,
        displayed_fury: 0,
        combo: 0,
        combo_timer: COMBO_DELAY,
        lives: 3,
        combo_fade: 0,
        combo_fade_value: 1,
        weapon: ITEM_WNONE,
        weapon_overload: 0,
        offense: ITEM_ONONE,
        offense_overload: 0,
        defense: ITEM_DNONE,
        defense_overload: 0,
        lastlife: 0,
        invulnerable: 0,
        danger: 0,
        death_alpha: 0,
        fire_timer: 0,
        tatk_lost_lives: 0,
        player_x: 0,
        player_y: 0
    }
}

let hud : Hud = empty();

export function reset() {
    hud = empty();
}

// The score at which the next life is awarded
function nextlife() {

    if (opts.UseNewSchool)
        return Math.pow(hud.lastlife + 1, 3) * 10000;

    return (hud.lastlife + 1) * 12500;
}

function twoSide(s: S.Sprite[]) {
    return [s[1], s[2], s[1], s[0]];
}

const items = [
    twoSide(S.ilaser),
    twoSide(S.irocket),
    twoSide(S.iblade),
    twoSide(S.ispeed),
    twoSide(S.imulti),
    twoSide(S.ioplus),
    twoSide(S.ishield),
    twoSide(S.ifury),
    twoSide(S.idplus),
    [S.iw, S.iw, S.iw, S.iw],
    [S.io, S.io, S.io, S.io],
    [S.id, S.id, S.id, S.id],
]

export type Stuff = {
    readonly weapon: number
    readonly weapon_overload: number
    readonly offense: number
    readonly offense_overload: number
    readonly defense: number
    readonly defense_overload: number
}

export function stuff() : Stuff {
    return hud;
}

export function setPlayer(x: number, y: number) {
    hud.player_x = x;
    hud.player_y = y;
}

export function hasItem(item: number) {
    return item == hud.weapon || item == hud.offense || item == hud.defense;
}

export function disarm() {
    hud.weapon = ITEM_WNONE;
    hud.offense = ITEM_ONONE;
    hud.defense = ITEM_DNONE;
}

export function step() {
    hud.timer++;
    hud.fire_timer++;

    let shouldClearDan = false;

    if (hud.weapon_overload) hud.weapon_overload--;
    if (hud.offense_overload) hud.offense_overload--;
    
    if (hud.defense_overload) {
        hud.defense_overload--;
        shouldClearDan = (hud.defense == ITEM_SHIELD);
    }

    if (hud.invulnerable) hud.invulnerable--;
    if (hud.death_alpha) hud.death_alpha--;
    if (hud.danger) hud.danger--;
    
    if (opts.UseScore) {
        
        if (hud.real_score > hud.score) {
            const delta = hud.real_score - hud.score;
            const add = Math.max(1, Math.floor(delta / 8));
            hud.score += add;
        }

        if (opts.UseClaque) {
            while (hud.score > nextlife()) {
                ++hud.lastlife;
                if (opts.UseWeapon && hud.defense == ITEM_DEFP) {
                    Float.addSprite([S.nolife], 170 << 3, 302 << 3);
                } else {
                    ++hud.lives;
                    if (opts.UseTourist) 
                        Float.addInfo(
                            [S.life],
                            ["You have gathered enough score to earn a life."])
                    else
                        Float.addSprite([S.life], 170 << 3, 302 << 3);
                }
            }
        }
    }

    if (opts.UseCombo) {
        if (hud.combo > 1 && hasTarget() && hud.combo_timer-- <= 1) {
            hud.combo_fade_value = hud.combo;
            hud.combo_fade = 128;
            hud.combo = 1;
        }
        if (hud.combo_fade > 0) hud.combo_fade--;
    }

    if (opts.UseGraze) {

        hud.graze_anim = hud.graze_anim == 0 
            ? 16 
            : hud.graze_anim - 1

        if (hud.graze > 1) {
            
            if (hasTarget() && hud.graze_timer-- <= 1) {
                addScoreBonus(hud.player_x, hud.player_y, 53*hud.graze - 52);
                hud.graze = 0;
            }

            if (hud.graze > 20 && (hasTarget() || 
                                    !hud.weapon_overload || 
                                    !hud.defense_overload || 
                                    !hud.offense_overload)) 
            {
                ++hud.weapon_overload;
                ++hud.offense_overload;
                ++hud.defense_overload;
            }
        }   

        // If disrupted, slowly time out.
        if (hud.graze < 0 && hud.graze_timer-- <= 1) hud.graze = 0;
    }

    if (opts.UseFury) {
        
		if( hud.displayed_fury > 87381 ) { ++hud.frl1; } else { --hud.frl1; }
		if( hud.frl1 > 64 ) { hud.frl1 = 64; }
		if( hud.frl1 < 0 ) { hud.frl1 = 0; }
		if( hud.displayed_fury > 2*87381 ) { ++hud.frl2; } else { --hud.frl2; }
		if( hud.frl2 > 64 ) { hud.frl2 = 64; }
		if( hud.frl2 < 0 ) { hud.frl2 = 0; }
		if( hud.displayed_fury > 262114 ) { ++hud.frl3; } else { --hud.frl3; }
		if( hud.frl3 > 64 ) { hud.frl3 = 64; }
		if( hud.frl3 < 0 ) { hud.frl3 = 0; }

        if (Fury.isRunning()) {
            hud.fury_progress = Math.max(0, hud.fury_progress - 512);
            Fury.setFuel(Math.floor(hud.fury_progress / 512));
            shouldClearDan = true;
        }

        if (hud.fury_progress > hud.displayed_fury) {
            const delta = hud.fury_progress - hud.displayed_fury;
            const add = Math.max(1, Math.floor(delta / 8));
            hud.displayed_fury += add;
        } else {
            hud.displayed_fury = hud.fury_progress;
        }
    }

    if (shouldClearDan)
        hud.invulnerable++;
}

// Compute the current score multiplier
function multiplier() {

    let multiplier = 1;
    if (opts.UseCombo) multiplier *= hud.combo;
    if (hud.offense == ITEM_OFFP)
        if (hud.offense_overload) multiplier *= 5;
        else multiplier *= 2;
    if (hud.defense == ITEM_DEFP)
        if (hud.defense_overload) multiplier *= 5;
        else multiplier *= 2;

    return multiplier;
}

export function addScoreRaw(value: number) {
    if (opts.UseScore) {
        hud.real_score += value;
    }
}

function addScoreBonus(
    x: number, 
    y: number, 
    value: number 
) {
    if (opts.UseScore) {
        hud.real_score += value;
        Float.add(x, y, value);
    }
}

function addScore(
    x: number, 
    y: number, 
    value: number, 
    log_value: number)
{
    let added : number;
    if (opts.UseNewSchool) {
        hud.real_score += (added = value * log_value * multiplier());
    } else {
        hud.real_score += (added = (2 * log_value - 10) * 50);
    }

    Float.add(x, y, added);
}

export function increaseFury() {

    if (Fury.isRunning()) return;

    hud.fury_progress += 180;

    if (hud.fury_progress > 262144) {
        hud.fury_progress = 263000;
    }
}

function furyProgress(log_value: number) {

    if (Fury.isRunning()) return;

    let multiplier = 40;
    if (hud.fury_progress < 131072) multiplier = 180;
    if (hud.defense == ITEM_FURY) 
        multiplier *= hud.defense_overload ? 4 : 2.5;

    hud.fury_progress += multiplier * (log_value - 5) * (log_value - 5);

    if (hud.fury_progress > 262144) {
        hud.fury_progress = 263000;
    }
}

export function score() {
    return hud.score;
}

export function furyReady() {
    return hud.fury_progress > 262144;
}

// Invoked when an enemy dies
export function onEnemyDeath(
    x: number, 
    y: number, 
    value: number, 
    log_value: number)
{
    addScore(x, y, value, log_value)

    if (opts.UseCombo) {
        hud.combo_timer = COMBO_DELAY;
        Stats.combo(hud.combo++)
    }    

    if (opts.UseFury) {
        furyProgress(log_value);
        if (Fury.isRunning()) Stats.fury();
    }
}

// t in 0..31
export function prerender(t: number) {
    
    if (t > 24) {
        GL.drawRect(0, 0, 240, t-12, 0, 0, 0, 1);
        GL.drawRect(0, 332-t, 240, t-12, 0, 0, 0, 1);
    }

    if (t > 15) {
        GL.drawSprite(items[ITEM_WNONE][0], 112, 333-t);
        GL.drawSprite(items[ITEM_ONONE][0], 92, 333-t);
        GL.drawSprite(items[ITEM_DNONE][0], 132, 333-t);
    }
}

export function render() {

    const dangerRed = (hud.danger << 2) / 256;
    GL.drawRect(0, 0, 240, 20, dangerRed, 0, 0, 1);
    GL.drawRect(0, 300, 240, 20, dangerRed, 0, 0, 1);

    if (hud.death_alpha > 0) 
        GL.drawRect(0, 20, 240, 280, 1, 1, 1, hud.death_alpha/64);

    // score =================================================================

    {
        let txtscore = "P1 - " + hud.score.toFixed();
        if (hud.score >= 1000) 
            txtscore = txtscore.slice(0, txtscore.length - 3) +
                       "." + 
                       txtscore.slice(txtscore.length - 3);
        if (hud.score >= 1000000) 
            txtscore = txtscore.slice(0, txtscore.length - 7) +
                       "." + 
                       txtscore.slice(txtscore.length - 7);

        GL.drawText(txtscore, S.font, S.texyellow, 4, 4, 1, 1);
    }

    // combo =================================================================

    if (opts.UseCombo) {

        if (hud.combo > 2) {

            const [w, h, tt, tl, tr, tb] = S.combo;
            const combow = Math.floor(w * hud.combo_timer / COMBO_DELAY);
            const combor = tl + (tr - tl) / w * combow;
            const combo = new Float32Array([combow, h, tt, tl, combor, tb]);

            GL.drawSprite(combo, 165, 3);

            const comboscore = "COMBO x" + (hud.combo - 1).toFixed();

            GL.drawText(comboscore, S.font, 
                S.texcombo[(hud.fire_timer >> 2) % S.texcombo.length],
                170, 4, 1, 1);

        } else if ((hud.combo_fade > 0) && (hud.combo_fade_value > 2)) {

            const comboscore = "COMBO x" + (hud.combo_fade_value - 1).toFixed();
            const alpha = hud.combo_fade/128;

            GL.drawText(comboscore, S.font, 
                S.texcombo[(hud.fire_timer >> 2) % S.texcombo.length],
                170, 4, alpha, alpha);
        }
    }

    // lives =================================================================

    if (hud.lives > 4) {
        GL.drawSprite(S.life, 170, 302);
        const lifetext = "x " + hud.lives.toFixed();
        GL.drawText(lifetext, S.font, S.texwhite, 200, 304, 1, 1);
    } else {
        for (let i = 0; i < hud.lives; ++i) {
            GL.drawSprite(S.life, 170 + i * 16, 302);
        }
    }

    // fury ==================================================================

    if (opts.UseFury) {

        // Display full bar and then cover unused part with black
        if (hud.displayed_fury <= 262114 && !Fury.isRunning()) {
            GL.drawSprite(S.furybar, 4, 306);
        } else {
            const tex = S.texfury[(hud.fire_timer >> 2) % S.texfury.length];
            GL.drawSprite(tex, 8, 306);
            GL.drawSprite(tex, 40, 306);
            GL.drawSpriteAdditive(S.furybar, 4, 306, 8);
        }

        const furyWidth = 4 + ((44 * hud.displayed_fury) >> 18);
        GL.drawRect(4 + furyWidth, 300, 64 - furyWidth, 20, dangerRed, 0, 0, 1);
        GL.drawSprite(S.furybox, 4, 306);

        GL.drawSpriteAdditive(S.furylight, 54, 307, hud.frl1 >> 1);
        GL.drawSpriteAdditive(S.furylight, 64, 307, hud.frl2 >> 1);
        GL.drawSpriteAdditive(S.furylight, 74, 307, hud.frl3 >> 1);
    }

    // multiplier ============================================================

    if (opts.UseScore) {
        const mul = multiplier();
        if (mul > 1) {
            const str = "x " + mul.toFixed();
            const tex = mul < 1000 ? S.texgreen : 
                        mul < 5000 ? S.texyellow : S.texred;
            GL.drawText(str, S.font, tex, 100, 4, 1, 1);
        }
    }

    // graze =================================================================

    if (opts.UseGraze) {
        const x = (hud.player_x + 96) >> 3;
        const y = (hud.player_y - 32) >> 3;
        if (hud.graze < 0) {
            const alpha = hud.graze_timer/128;
            GL.drawText("Disrupted", S.font, S.texred, x + 2, y - 2, 0, alpha);
        } else if (hud.graze > 0) {
            const anim = hud.graze_anim;
            const t = anim + 16 - GRAZE_DELAY;
            const txt = "x" + hud.graze.toFixed();
            const tex = S.texgraze[(anim >> 2) % S.texgraze.length];
            if (t <= 0) {
                GL.drawText("Graze", S.mini, tex, x+3, y-3, 1, 0);
                GL.drawText(txt, S.font, tex, x+27, y-2, 1, 0);
            } else {
                GL.drawText("Graze", S.mini, tex, x+3, y-3, 1, 0);
                if (hud.graze == 1) {
                    GL.drawText("Graze", S.mini, tex, x+3 + (t << 1), y-3, t/16, 0);
                    GL.drawText("Graze", S.mini, tex, x+3 - (t << 1), y-3, t/16, 0);
                }
                GL.drawText(txt, S.font, tex, x+27, y-2, 1, 0);
                GL.drawText(txt, S.font, tex, x+27 + (t << 1), y-2, t/16, 0);
                GL.drawText(txt, S.font, tex, x+27 - (t << 1), y-2, t/16, 0);
            }
            if (opts.UseScore) {
                const score = "+" + (53 * hud.graze - 52).toFixed();
                GL.drawText(score, S.mini, S.texyellow, x + 3, y + 4, 1, 0);
            }
        }
    }

    // items =================================================================

    GL.drawSprite(
        items[hud.weapon][hud.weapon_overload ? (hud.timer >> 3) % 4 : 0],
        112, 301);
        
    GL.drawSprite(
        items[hud.offense][hud.offense_overload ? (hud.timer >> 3) % 4 : 0],
        92, 301);

    GL.drawSprite(
        items[hud.defense][hud.defense_overload ? (hud.timer >> 3) % 4 : 0],
        132, 301);
}

export function pickup(pickup: number) {
    switch (pickup) {
        case ITEM_ROCKETS: 
            Snd.pickupRockets.play();
            if (opts.UseTourist)
                Float.addInfo(S.irocket, [
                    "Rockets equipment. Low damage, good fire rate,",
                    "slow projectiles."
                ])
            hud.weapon = pickup;
            return;
        case ITEM_BLADES: 
            Snd.pickupBlades.play();
            if (opts.UseTourist)
                Float.addInfo(S.iblade, [
                    "Blade equipment. Wide spray, slow fire rate,",
                    "bouncing projectiles"
                ])
            hud.weapon = pickup;
            return;
        case ITEM_LASER: 
            Snd.pickupLaser.play();
            if (opts.UseTourist)
                Float.addInfo(S.ilaser, [
                    "Laser equipment. High damage, narrow spray,",
                    "instant hit."
                ])
            hud.weapon = pickup; 
            return;
        case ITEM_MULTI:
            Snd.pickupMulti.play();
            if (opts.UseTourist)
                Float.addInfo(S.imulti, [
                    "Multi-shot equipment. Widens weapon spray."
                ])
            hud.offense = pickup; 
            return;
        case ITEM_SPEED: 
            Snd.pickupSpeed.play();
            if (opts.UseTourist)
                Float.addInfo(S.ispeed, [
                    "Fire rate equipment. Increases weapon fire rate."
                ])
            hud.offense = pickup; 
            return;
        case ITEM_OFFP: 
            Snd.pickup.play();
            if (opts.UseTourist)
                Float.addInfo(S.ioplus, [
                    "Bonus equipment. Increases score multiplier."
                ])
            hud.offense = pickup; 
            return;
        case ITEM_SHIELD:
            Snd.pickupShield.play();
            if (opts.UseTourist)
                Float.addInfo(S.ishield, [
                    "Shield equipment. Protects from enemy ships,",
                    "but not from enemy fire."
                ])
            hud.defense = pickup;
            return;
        case ITEM_FURY:
            Snd.pickupFury.play();
            if (opts.UseTourist)
                Float.addInfo(S.ifury, [
                    "Fury equipment. Fury bar fills faster."
                ])
            hud.defense = pickup;
            return;
        case ITEM_DEFP:
            Snd.pickup.play();
            if (opts.UseTourist)
                Float.addInfo(S.idplus, [
                    "Bonus equipment. Increases score,",
                    "but you cannot gain lives."
                ])
            hud.defense = pickup;
            return;
        case ITEM_WNONE: 
            Snd.pickup.play();
            if (opts.UseTourist)
                Float.addInfo(S.iwover, ["Overload! Temporary equipment enhancer."])
            hud.weapon_overload += 100;
            return;
        case ITEM_ONONE:
            Snd.pickup.play(); 
            if (opts.UseTourist)
                Float.addInfo(S.ioover, ["Overload! Temporary equipment enhancer."])
            hud.offense_overload += 100;
            return;
        case ITEM_DNONE:
            Snd.pickup.play();
            if (opts.UseTourist)
                Float.addInfo(S.idover, ["Overload! Temporary equipment enhancer."])
            hud.defense_overload += 100;
            return;
        default:            
            if (opts.UseTourist)
                Float.addInfo(
                    [S.iwover[0], S.idover[0], S.ioover[0]], 
                    ["Overload! Temporary equipment enhancer."])
            hud.weapon_overload += 100;
            hud.offense_overload += 100;
            hud.defense_overload += 100;
            return;
    }
}

export function playerHit(px: number, py: number, isDan: boolean) {

    if (invulnerable()) return;
    if (!isDan && hud.defense == ITEM_SHIELD) return;

    if (opts.UseGraze && hud.graze > 0) {
        hud.graze = -1;
        hud.graze_timer = 128;
        hud.graze_anim = 0;
    }

    Snd.disrupt.play();

    if (opts.UseFury && opts.UseFuryShield && hud.fury_progress > 87381) {
        hud.fury_progress -= 87381;
        hud.invulnerable = 100;
        hud.danger = 31;
    } else if (hud.lives > 0) {
        hud.death_alpha = 48;
        hud.invulnerable = 100;
        hud.danger = 63;
        hud.lives--;
        Float.addSprite([hud.lives ? S.life : S.nolife ], px, py);
    } else {
        // Cause dead() to return true
        hud.lives--;
    }
}

export function makeInvulnerable(duration: number) {
    hud.invulnerable += duration;
}

export function dead() {
    return hud.lives < 0;
}

export function graze(x: number, y: number) {
    
    if (!opts.UseGraze) return;

    const g = ++hud.graze;
    Stats.graze();
    
    if (g != 20) Snd.graze.play();
    else Snd.pickup.play();

    hud.graze_timer = Math.max(1, GRAZE_DELAY - (3 * g));
    hud.graze_anim = GRAZE_DELAY;

    Float.addGraze(
        x - (S.grazeb[0][S.w] << 2), y - (S.grazeb[0][S.h] << 2), 
        g > 20 ? S.grazer : S.grazeb);
}

export function invulnerable() {
    return !!hud.invulnerable;
}
