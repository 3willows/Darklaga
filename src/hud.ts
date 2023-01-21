import * as GL from "./webgl"
import * as S from "./sprites"
import { opts } from "options"
import { hasTarget } from "shot"

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
    frenzied: number
    timer: number
    frl1: number
    frl2: number
    frl3: number
    frenzy_progress: number
    displayed_frenzy: number
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
    fire_timer: number
    tatk_lost_lives: number

    player_x: number,
    player_y: number
}

function empty() : Hud {
    return {
        score: 0,
        real_score: 0,
        frenzied: 0,
        timer: 0,
        frl1: 0,
        frl2: 0,
        frl3: 0,
        graze: 1,
        graze_anim: 0,
        graze_timer: 0,
        frenzy_progress: 0,
        displayed_frenzy: 0,
        combo: 1,
        combo_timer: COMBO_DELAY,
        lives: 3,
        combo_fade: 0,
        combo_fade_value: 1,
        weapon: ITEM_LASER,
        weapon_overload: 0,
        offense: ITEM_ONONE,
        offense_overload: 0,
        defense: ITEM_DNONE,
        defense_overload: 0,
        lastlife: 0,
        invulnerable: 0,
        danger: 0,
        fire_timer: 0,
        tatk_lost_lives: 0,
        player_x: 0,
        player_y: 0
    }
}

let hud : Hud = empty();

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

export function step() {
    hud.timer++;
    hud.fire_timer++;
    if (hud.weapon_overload) hud.weapon_overload--;
    if (hud.offense_overload) hud.offense_overload--;
    if (hud.defense_overload) hud.defense_overload--;
    
    if (opts.UseScore) {
        
        if (hud.real_score > hud.score) {
            const delta = hud.real_score - hud.score;
            const add = Math.max(1, Math.floor(delta / 8));
            hud.score += add;
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

function addScoreBonus(
    x: number, 
    y: number, 
    value: number 
) {
    if (opts.UseScore) {
        hud.real_score += value;
    }
}

function addScore(
    x: number, 
    y: number, 
    value: number, 
    log_value: number)
{
    if (opts.UseNewSchool) {
        hud.real_score += value * log_value * multiplier();
    } else {
        hud.real_score += (2 * log_value - 10) * 50;
    }
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
        hud.combo++;
    }    
}

export function render() {
    GL.drawRect(0, 0, 240, 20, (hud.danger << 2) / 256, 0, 0, 1);
    GL.drawRect(0, 300, 240, 20, (hud.danger << 2) / 256, 0, 0, 1);

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

            const combow = Math.floor(S.combo.w * hud.combo_timer / COMBO_DELAY);
            const combor = S.combo.tl + (S.combo.tr - S.combo.tl) / S.combo.w * combow;
            const combo = {
                tl: S.combo.tl,
                tr: combor,
                tt: S.combo.tt,
                tb: S.combo.tb,
                w: combow,
                h: S.combo.h
            };

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
        case ITEM_BLADES: 
        case ITEM_LASER: 
            hud.weapon = pickup; 
            return;
        case ITEM_MULTI: 
        case ITEM_SPEED: 
        case ITEM_OFFP: 
            hud.offense = pickup; 
            return;
        case ITEM_SHIELD:
        case ITEM_FURY:
        case ITEM_DEFP:
            hud.defense = pickup;
            return;
        case ITEM_WNONE: 
            hud.weapon_overload += 100;
            return;
        case ITEM_ONONE: 
            hud.offense_overload += 100;
            return;
        case ITEM_DNONE:
            hud.defense_overload += 100;
            return;
        default:
            hud.weapon_overload += 100;
            hud.offense_overload += 100;
            hud.defense_overload += 100;
    }
}

export function playerHit() {}

export function graze(x: number, y: number) {

    const g = ++hud.graze;
    hud.graze_timer = Math.max(1, GRAZE_DELAY - (3 * g));
    hud.graze_anim = GRAZE_DELAY;
}