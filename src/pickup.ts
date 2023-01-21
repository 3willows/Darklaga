import { opts } from "options"
import * as S from "./sprites"
import * as Hud from "./hud"
import * as Player from "./player"
import * as GL from "./webgl"
import * as Float from "./float"

type Pickups = {
    timer: number
    until_next: number
    did_weapon: boolean
    did_offense: boolean
    did_defense: boolean
    all: Pickup[]
}

const pickups : Pickups = {
    timer: 0,
    until_next: 3,
    did_weapon: false,
    did_offense: false,
    did_defense: false,
    all: []
}


const BONUS_LASER	= Hud.ITEM_LASER
const BONUS_ROCKETS	= Hud.ITEM_ROCKETS
const BONUS_BLADES	= Hud.ITEM_BLADES
const BONUS_SPEED	= Hud.ITEM_SPEED
const BONUS_MULTI	= Hud.ITEM_MULTI
const BONUS_OFFP	= Hud.ITEM_OFFP
const BONUS_SHIELD	= Hud.ITEM_SHIELD
const BONUS_UNK		= Hud.ITEM_FURY
const BONUS_DEFP	= Hud.ITEM_DEFP
const BONUS_WO		= 9
const BONUS_OO		= 10
const BONUS_DO		= 11
const BONUS_SUPER	= 12

function twoSide(s: S.Sprite[]) {
    return [s[1], s[2], s[1], s[0]];
}

const anim = [
    twoSide(S.ilaser),
    twoSide(S.irocket),
    twoSide(S.iblade),
    twoSide(S.ispeed),
    twoSide(S.imulti),
    twoSide(S.ioplus),
    twoSide(S.ishield),
    twoSide(S.ifury),
    twoSide(S.idplus),
    twoSide(S.iwover),
    twoSide(S.ioover),
    twoSide(S.idover),
    [S.iwover[0], S.ioover[0], S.idover[0]],
]

const next : number[] = []

next[BONUS_SUPER] = BONUS_SUPER;

next[BONUS_ROCKETS] = BONUS_BLADES;
next[BONUS_BLADES] = BONUS_LASER;
next[BONUS_LASER] = BONUS_ROCKETS;

next[BONUS_SPEED] = BONUS_MULTI;
next[BONUS_MULTI] = BONUS_OFFP;
next[BONUS_OFFP] = BONUS_SPEED;

next[BONUS_SHIELD] = BONUS_UNK;
next[BONUS_UNK] = BONUS_DEFP;
next[BONUS_DEFP] = BONUS_SHIELD;

next[BONUS_WO] = BONUS_WO
next[BONUS_OO] = BONUS_OO
next[BONUS_DO] = BONUS_DO

type Pickup = {
    kind: number,
    anim: S.Sprite[],
    x: number,
    y: number,
    change: number
}

function stepPickup(p: Pickup, pp: {x: number, y: number}) : boolean {

    if ((p.change += opts.ModChangePickup) >= 128) {
        p.change = 0;
        if (Hud.hasItem(p.kind = next[p.kind]))
            p.kind = next[p.kind]; 
        p.anim = anim[p.kind];
    }

    if ((p.y += 4) >= 2560) return false;
    
    if (p.y < pp.y + 160 && p.y + 320 > pp.y + 160 && 
        p.x < pp.x + 160 && p.x + 320 > pp.x + 160) {
        
        // PICKUP!
        Hud.pickup(p.kind);
        return false;
    }

    return true;
}

export function step() {
    
    if (pickups.all.length == 0) return;

    pickups.timer++;
    const pp = Player.pos()
    for (let i = 0; i < pickups.all.length; ++i) {
        if (!stepPickup(pickups.all[i], pp)) {
            pickups.all[i] = pickups.all[pickups.all.length - 1];
            pickups.all.pop();
            i--;
        }
    }
}

export function render() {
    for (let p of pickups.all) {
        const frame = p.anim[(pickups.timer >> 4) % p.anim.length];
        GL.drawSprite(frame, p.x >> 3, p.y >> 3);
    }
}

export function throwback() {
    for (let p of pickups.all) p.y -= 1600;
}

export function reset() {
    pickups.all = []
    pickups.did_weapon = pickups.did_offense = pickups.did_offense = false;
    pickups.until_next = 3;
}

function add(x: number, y: number, type: number) {
    pickups.all.push({
        x,
        y,
        anim: anim[type],
        kind: type,
        change: 128
    })
}

// An enemy died at a specific position
export function onEnemyDeath(x: number, y: number) {

    if (x < 16 || x > 1760 || y > 1920) return;

    if (--pickups.until_next > 0) return;
    
    pickups.until_next = 10;

    if (!pickups.did_offense) {
        pickups.did_offense = true;
        add(x, y, BONUS_MULTI);
        if (opts.UseTourist) {
            Float.addInfo(S.imulti[0], ["Equipment. Touch it to pick it up."])
        }
    } else if (!pickups.did_weapon) {
        pickups.did_weapon = true;
        add(x, y, BONUS_ROCKETS);
    } else if (!pickups.did_defense) {
        pickups.did_defense = true;
        add(x, y, BONUS_SHIELD);
    } else if (Math.random() < 1/16) {
        add(x, y, BONUS_SUPER);
    } else if (Math.random() < 1/2) {
        add(x, y, [BONUS_WO, BONUS_OO, BONUS_DO][Math.floor(Math.random() * 3)]);
    } else {
        add(x, y, [BONUS_MULTI, BONUS_ROCKETS, BONUS_SHIELD][Math.floor(Math.random() * 3)]);
    }
}