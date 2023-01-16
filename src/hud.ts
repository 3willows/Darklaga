import * as GL from "./webgl"
import * as S from "./sprites"

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
        frenzy_progress: 0,
        displayed_frenzy: 0,
        combo: 1,
        combo_timer: 0,
        lives: 3,
        combo_fade: 0,
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

export function stuff() : { 
    readonly weapon: number
    readonly weapon_overload: number
    readonly offense: number
    readonly offense_overload: number
    readonly defense: number
    readonly defense_overload: number
} {
    return hud;
}

export function hasItem(item: number) {
    return item == hud.weapon || item == hud.offense || item == hud.defense;
}

export function step() {
    hud.timer++;
    if (hud.weapon_overload) hud.weapon_overload--;
    if (hud.offense_overload) hud.offense_overload--;
    if (hud.defense_overload) hud.defense_overload--;
}

export function render() {
    GL.drawRect(0, 0, 240, 20, (hud.danger << 2) / 256, 0, 0, 1);
    GL.drawRect(0, 300, 240, 20, (hud.danger << 2) / 256, 0, 0, 1);

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