import * as S from "./sprites"
import * as L from "./levels"
import * as Snd from "./sound"
import * as Float from "./float"
import * as GL from "./webgl"
import * as Input from "./input"
import { opts } from "options"

type Shown = {
    label: string
    value: string
    texture: S.Sprite[]
    score: number
}

type Stats = {
    shots: number
    hit_shots: number
    graze: number
    combo: number
    enemy: number
    enemy_fled: number
    fury: number
    showing: number
    show: Shown[]
    display: number
    timer: number
    level: number
    start: number
    countdown: number
}

function newStats(level: number) : Stats {
    return {
        shots: 0,
        hit_shots: 0,
        graze: 0,
        combo: 0,
        enemy: 0,
        enemy_fled: 0,
        fury: 0,
        level,
        showing: 0,
        show: [],
        display: 0,
        timer: 0,
        countdown: 0,
        start: +new Date()
    }
}

let stats = newStats(0);

export function graze() { stats.graze++; }
export function shot() { stats.shots++; }
export function shotHit() { stats.hit_shots++; }
export function enemy() { stats.enemy++; }
export function enemyFled() { stats.enemy_fled++; }
export function fury() { stats.fury++; }
export function combo(count: number) { stats.combo = Math.max(stats.combo, count) }
export function countdown(frames: number) { stats.countdown = frames };

export function begin(level: number) {
    stats = newStats(level);
}

export function printTime(time: number) {
    const time_ms = time % 1000;
    const time_s = Math.floor(time / 1000) % 60;
    const time_m = Math.floor(time / 60000);
    return time_m.toFixed() + (time_s < 10 ? "'0" : "'") 
        + time_s.toFixed() 
        + (time_ms < 10 ? "\"00" : time_ms < 100 ? "\"0" : "\"")
        + time_ms.toFixed();
}

export function end() {

    const time = +new Date() - stats.start;
    const time_str = printTime(time);
    const cd_str = printTime(stats.countdown * 1000 / 60);

    // ITEM 1: level/boss finished ==========================================

    function pushLevel(l: number) {

        const score = l * 3000;
        const prefix = "  LEVEL " + l.toFixed()

        stats.show.push({
            label: "LEVEL COMPLETE",
            value: opts.UseScore 
                 ? prefix + " : + " + score.toFixed() 
                 : opts.UseTimeAttack
                 ? prefix + " : " + time_str
                 : prefix, 
            score,
            texture: [S.texgreen]
        });
    }

    function pushBoss(b: number) {

        const score = b * 20000;
        const prefix = "  BOSS " + b.toFixed()

        stats.show.push({
            label: "BOSS DEFEATED",
            value: opts.UseScore 
                 ? prefix + " : + " + score.toFixed() 
                 : opts.UseTimeAttack
                 ? prefix + " : " + time_str
                 : prefix, 
            score,
            texture: [S.texgreen]
        });
    }

    function pushSecretLevel() {
        const score = 1000000;
        const prefix = "  SECRET LEVEL"

        stats.show.push({
            label: "LEVEL COMPLETE",
            value: opts.UseScore 
                 ? prefix + " : + " + score.toFixed() 
                 : opts.UseTimeAttack
                 ? prefix + " : " + time_str
                 : prefix, 
            score,
            texture: [S.texgreen]
        });
    }

    switch (stats.level) {
        case L.gTOURIST1:
        case L.gOSLEVEL1:
        case L.gLEVEL1: pushLevel(1); break;
        case L.gTOURIST2:
        case L.gOSLEVEL2:
        case L.gLEVEL2: pushLevel(2); break;
        case L.gTOURIST3:
        case L.gOSLEVEL3:
        case L.gLEVEL3: pushLevel(3); break;
        case L.gOSLEVEL4:
        case L.gLEVEL4: pushLevel(4); break;
        case L.gOSLEVEL5:
        case L.gLEVEL5: pushLevel(5); break;
        case L.gOSLEVEL6:
        case L.gLEVEL6: pushLevel(6); break;
        case L.gOSLEVEL7:
        case L.gLEVEL7: pushLevel(7); break;
        case L.gOSLEVEL8:
        case L.gLEVEL8: pushLevel(8); break;
        case L.gOSLEVEL9:
        case L.gLEVEL9: pushLevel(9); break;
        case L.gOSLEVEL10:
        case L.gLEVEL10: pushLevel(10); break;
        case L.gOSLEVEL11:
        case L.gLEVEL11: pushLevel(11); break;
        case L.gOSLEVEL12:
        case L.gLEVEL12: pushLevel(12); break;
        case L.gOSLEVEL13:
        case L.gLEVEL13: pushLevel(13); break;
        case L.gOSLEVEL14:
        case L.gLEVEL14: pushLevel(14); break;
        case L.gOSLEVEL15:
        case L.gLEVEL15: pushLevel(15); break;
        case L.gBOSS1:
        case L.gBOSSMODE1: pushBoss(1); break;
        case L.gBOSS2:
        case L.gBOSSMODE2: pushBoss(2); break;
        case L.gBOSS3:
        case L.gBOSSMODE3: pushBoss(3); break;
        case L.gSECRET: pushSecretLevel(); break;
    }

    // Item 2: extermination/time bonus ======================================
    
    if (stats.enemy > 0) {
        const percent = 100 - Math.round(stats.enemy_fled * 100 / stats.enemy);
        const score = percent < 10 ? 0 : 
                      percent < 100 ? 100 * percent : 
                                      500 * percent;
        const prefix = "  " + percent.toFixed() + "%";
        stats.show.push({
            label: "EXTERMINATOR ( kill % )",
            value: opts.UseScore 
                 ? prefix + " : + " + score.toFixed()
                 : prefix, 
            score,
            texture: [S.texgreen]
        })
    } else {
        const score = 4000 * Math.round(stats.countdown / 100);
        const prefix = "  " + cd_str;
        stats.show.push({
            label: "TIME BONUS",
            value: opts.UseScore 
                 ? prefix + " : + " + score.toFixed()
                 : prefix, 
            score,
            texture: [S.texgreen]
        })
    }

    // Item 3: hit% ==========================================================

    if (stats.shots > 0) {
        const percent = Math.round(stats.hit_shots * 100 / stats.shots);
        const score = percent < 40 ? 0 : 
                      percent < 100 ? percent * percent * 3 : 
                                      percent * percent * 150;
        const prefix =  "  " + percent.toFixed() + "%"                            
        stats.show.push({
            label: "SNIPER BONUS ( hit % )",
            value: opts.UseScore 
                    ? prefix + " : + " + score.toFixed()
                    : prefix, 
            score,
            texture: [S.texgreen]
        })
    }

    // item 4: fury score ====================================================

    if (stats.fury > 1) {
        const award = Math.round(Math.pow(stats.fury, 0.66));
        const score = award * 1500;
        const prefix = "  x " + stats.fury.toFixed();
        stats.show.push({
            label: "FURY MASTER",
            value: opts.UseScore 
                    ? prefix + " : + " + score.toFixed()
                    : prefix, 
            score,
            texture: S.texfury
        })
    }

    // item 5: max combo =====================================================

    if (stats.combo > 40) {
        const score = stats.combo * 100;
        const prefix = "  max " + stats.combo.toFixed();
        stats.show.push({
            label: "COMBO KING",
            value: opts.UseScore 
                    ? prefix + " : + " + score.toFixed()
                    : prefix, 
            score,
            texture: S.texcombo
        })
    }

    // item 6: total graze ===================================================
    
    if (stats.graze > 20) {
        const score = stats.graze * 200;
        const prefix = "  " + stats.graze.toFixed() + " graze"
        stats.show.push({
            label: "DAREDEVIL",
            value: opts.UseScore 
                    ? prefix + " : + " + score.toFixed()
                    : prefix, 
            score,
            texture: S.texgraze
        })
    }
}

function ypos(nth: number) { return 25 + nth * 45}

// Returns a value to add to the score.
export function step() {

    if ((++stats.timer % 60) != 0) return 0;
    if (stats.showing >= stats.show.length) return 0;
    
    ++stats.showing;
    Snd.statsPop.play();
    if (!opts.UseScore) return 0;

    const score = stats.show[stats.showing - 1].score;
    if (opts.LodScoreFloat)
        Float.add(40 << 3, (ypos(stats.showing - 1) + 15) << 3, score);
    return score;
}

export function render() {
    for (let i = 0; i < stats.showing; ++i) {
        const stat = stats.show[i];
        const y = ypos(i);
        GL.drawSpriteAlpha(S.statsbar, 54, y + 4, 16);
        GL.drawSprite(S.win, 30, y + 10);
        GL.drawText(stat.label, S.font, S.texyellow, 80, y + 12, 1, 1);
        const tex = stat.texture[(stats.timer >> 2) % stat.texture.length];
        GL.drawText(stat.value, S.font, tex, 80, y + 28, 1, 1);
    }
}

export function isDone() {
    return stats.showing >= stats.show.length && (
        Input.key.action ||
        Input.key.action2 ||
        Input.mouse.down)
}