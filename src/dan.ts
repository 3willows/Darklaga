// "Dan" is the "bullet" part of "Danmaku" (弾幕) meaning "bullet curtain"
// Enemy bullets are called "Dan" to distinguish them from player "shots"

import * as S from "./sprites"
import * as GL from "./webgl"
import * as Player from "./player"
import { Mode } from "enemy";

// Shot data is encoded as consecutive Int32 values, 
// with the meanings:
const NEXT = 0; 
const TYPE = 1;
const PARAM0 = 2
const PARAM1 = 3
const PARAM2 = 4
const PARAM3 = 5
const GRAZE = 6
const SPRITE = 7
const LEFT = 8
const TOP = 9
const WIDTH = 10
const HEIGHT = 11
const TIMER = 12
const ANIM = 13
const DIE = 14

// Enemy shot types
const DAN_DEAD			= 0x0000

// Standard bullet: 
//   Moves in a direction at constant speed
//   PARAMS0 = x-velocity
//   PARAMS1 = y-velocity
const DAN_STD			= 0x0001

// Carrier bullet: 
//   Seeks after the player's position for a while, then turns
//   into a CARB explosion.
//   PARAMS0 = x-velocity (x8)
//   PARAMS1 = y-velocity (x8)
const DAN_CARN			= 0x0002
const DAN_CARD			= 0x0003
const DAN_CARV			= 0x0004
const DAN_CARB			= 0x0005

// Delayed aim bullet:
//  Moves in a direction, slowing down to a halt, then
//  turns into a standard bullet moving toward the player
//  PARAMS0 = x-velocity
//  PARAMS1 = y-velocity
//  PARAMS2 = velocity of the standard bullet
const DAN_DAIM			= 0x0006
const DAN_ADN			= 0x0007

// Homing missile
//  Moves towards an angle, initially adjusts angle to aim at
//  the player
//  PARAMS3 = angle 
const DAN_MISL			= 0x0008

// Fireworks
//  Moves in a direction, slowing down to a halt, then explodes
//  into several standard bullets in all directions
//  PARAMS0 = x-velocity
//  PARAMS1 = y-velocity
//  PARAMS2 = id of the sprite of the created bullets
const DAN_FWOK			= 0x0009

const DAN_WDIA			= 0x000A
const DAN_WHOR			= 0x000B
const DAN_MISL2			= 0x000C
const DAN_BBNC			= 0x000D
const DAN_GRAV			= 0x000E
const DAN_FORK			= 0x000F
const DAN_SPIR			= 0x0010
const DAN_FWOK2			= 0x0011

// Given a shot sprite-set 01234, oscillates 23432101 ;
// given 012, oscillates 1210
function twoSide(s: S.Sprite[]): S.Sprite[] {
    if (s.length == 5)
        return [s[2], s[3], s[4], s[3], s[2], s[1], s[0], s[1]];
    return [s[1], s[2], s[1], s[0]];
}

// Bullet sprites (as animations)
const spriteNames = {
    "b1n": twoSide(S.bullet1n),
    "b1d": twoSide(S.bullet1d),
    "b1v": twoSide(S.bullet1v),
    "b2": [S.bullet2all],
    "b3n": twoSide(S.bullet3n),
    "b3d": twoSide(S.bullet3d),
    "b3v": twoSide(S.bullet3v),
    "b4n": [S.bullet4n],
    "b4d": [S.bullet4d],
    "b4v": [S.bullet4v],
    "b5n": twoSide(S.bullet5n),
    "b5d": twoSide(S.bullet5d),
    "b5v": twoSide(S.bullet5v),
    "exv": S.explov,
}

// Index and reverse-index sprite names
const spriteByName : {[key:string]: number }= {};
const sprites : S.Sprite[][] = [];
for (let k in spriteNames) {
    spriteByName[k] = sprites.length;
    sprites.push((spriteNames as { [key:string]: S.Sprite[] })[k]);
}

const maxDanAmount = 200;
const danSize = 15;

const dan = new Int32Array(maxDanAmount * danSize);

// The first two spots are: 
//  - the start of the allocated list
//  - the start of the free list
dan[0] = -1
dan[1] = 2
for (let i = 0; i < maxDanAmount - 1; ++i) 
    dan[2 + i * danSize + NEXT] = 2 + (i+1) * danSize;
dan[2 + (maxDanAmount - 1) * danSize + NEXT] = -1;

// STEP ======================================================================

// Logic step for the shot referenced by the cell at position
// 'ref'. Returns true if the shot survives the step, false
// if it needs to be removed. 
function danStep(ref: number) {
    const off = dan[ref];

    if (dan[off + DIE] < 64) 
        if(--dan[off + DIE] <= 0)
            return false;
    
    // TODO: graze

    const type = dan[off + TYPE];
    if (type == DAN_DEAD) 
        return false;

    if (type == DAN_STD) {
        
        ++dan[off + ANIM];
        const x = (dan[off + LEFT] += dan[off + PARAM0]);
        const y = (dan[off + TOP]  += dan[off + PARAM1]);

        if (x <= -20-400 || x > 1920+400 || y <= -20-400 || y >= 2560+400) 
            // Die if out-of-bounds
            return false;

        return true;
    }

    if (type == DAN_DAIM) {
        ++dan[off + ANIM];
        const timer = (dan[off + TIMER] += 4);
        if (timer >= 128) {
            const pp = Player.pos();
            const x = pp.x + 80;
            const y = pp.y + 80;
            const dx = x - dan[off + LEFT];
            const dy = y - dan[off + TOP];
            const norm = Math.sqrt(dx * dx + dy * dy);
            dan[off + PARAM0] = Math.floor(dan[off + PARAM2] * dx / norm);
            dan[off + PARAM1] = Math.floor(dan[off + PARAM2] * dy / norm);
            dan[off + TYPE] = DAN_STD;
            return true;
        } 

        const mult = (128*128 - timer*timer) / (128*32);
        dan[off + LEFT] += Math.floor(mult * dan[off + PARAM0]);
        dan[off + TOP] += Math.floor(mult * dan[off + PARAM1]);
        return true;
    }

    if (type == DAN_FWOK) {
        ++dan[off + ANIM];
        const timer = (dan[off + TIMER] += 4);
        
        const mult = (128*128 - timer*timer) / (128*32);
        const x = dan[off + LEFT] += Math.floor(mult * dan[off + PARAM0]);
        const y = dan[off + TOP] += Math.floor(mult * dan[off + PARAM1]);
        
        if (timer >= 128) {
            for (let i = 0; i < 16; ++i) {
                const a = Math.PI * 2 * (i/16);
                fireStandard(x, y, 
                    Math.floor(10 * Math.cos(a)),
                    Math.floor(10 * Math.sin(a)),
                    dan[off + PARAM3])
            }
            return false;
        } 

        return true;
    }

    if (type == DAN_MISL) {
        ++dan[off + ANIM];
        const timer = ++dan[off + TIMER];
        const a = dan[off + PARAM3] / 256 * Math.PI;
        const left = dan[off + LEFT] += Math.floor(10 * Math.cos(a));
        const top = dan[off + TOP] += Math.floor(10 * Math.sin(a));
        if (timer < 100 && timer % 2 == 0) {
            const pp = Player.pos();
            const dx = pp.x - left;
            const dy = pp.y - top;
            const aim = Math.atan2(dy, dx);
            
            const adjaim = 
                Math.abs(aim - a) < Math.PI ? aim :
                Math.abs(aim - a + 2 * Math.PI) < Math.PI ? aim + 2 * Math.PI : 
                                                            aim - 2 * Math.PI; 
            
            dan[off + PARAM3] += a > adjaim ? -3 : 3;
        }

        if (timer >= 100)
            if (left <= -20-400 || left > 1920+400 || 
                    top <= -20-400 || top >= 2560+400) 
                // Die if out-of-bounds
                return false;

        return true;
    }

    if (type == DAN_CARN || type == DAN_CARD || type == DAN_CARV) {
        
        ++dan[off + ANIM];
        
        const maxSpeed = 1 << 6;
        
        // Shift direction towards player
        const pp = Player.pos();
        const x = pp.x + 80;
        const y = pp.y + 80;
        const dx = x - dan[off + LEFT];
        const dy = y - dan[off + TOP];
        const dux = (type == DAN_CARN ? 1 : 2) * (dx > 0 ? 1 : dx < 0 ? -1 : 0);
        const duy = (type == DAN_CARN ? 1 : 2) * (dy > 0 ? 1 : dy < 0 ? -1 : 0);

        const vx = (dan[off + PARAM0] = 
            Math.max(-maxSpeed, Math.min(maxSpeed, dan[off + PARAM0] + dux)));
            
        const vy = (dan[off + PARAM1] = 
            Math.max(-maxSpeed, Math.min(maxSpeed, dan[off + PARAM1] + duy)));

        // Use direction to move
        const sx = (dan[off + LEFT] += vx >> (type == DAN_CARV ? 2 : 3)); 
        const sy = (dan[off + TOP]  += vy >> (type == DAN_CARV ? 2 : 3));

        if (dan[off + ANIM] > 300 || sx <= 200 || sx >= 1720 || sy <= 200 || sy >= 2360) {

            dan[off + TYPE] = DAN_CARB;
            dan[off + SPRITE] = spriteByName["exv"];
            dan[off + TIMER] = 0;
        }

        return true;
    }

    if (type == DAN_CARB) {
        if (++dan[off + TIMER] >= 40) return false;
        return true;
    }

    throw "Unknown dan type"
}


export function step() {
    // Traverse all live shots while updating them.
    let ref = 0;
    while (dan[ref] > 0) {
        if (danStep(ref)) {
            ref = dan[ref] + NEXT
        } else {
            // Remove shot
            const off = dan[ref];
            dan[ref] = dan[off + NEXT];
            dan[off + NEXT] = dan[1];
            dan[1] = off;
        }
    }
}

// RENDER ====================================================================

// Render a shot and return the offset of the next shot
function danRender(ref: number) {
    
    const off = dan[ref];
    
    const type = dan[off + TYPE];
    if (type == DAN_DEAD) {
        // Nothing
    } else if (type == DAN_CARB) {
        
        const anim = dan[off + TIMER];
        if (anim < 8) {
            const sprite = sprites[dan[off + SPRITE]][anim];
            GL.drawSprite(sprite, 
                (dan[off + LEFT] >> 3) - (sprite.w >> 1), 
                (dan[off + TOP] >> 3) - (sprite.h >> 1));
        } else {
            const sprite = sprites[dan[off + SPRITE]][(anim+8)>>1];
            GL.drawSpriteAlpha(sprite, 
                (dan[off + LEFT] >> 3) - (sprite.w >> 1), 
                (dan[off + TOP] >> 3) - (sprite.h >> 1),
                40 - anim);
        }

    } else {
        const anim = sprites[dan[off + SPRITE]];
        const sprite = anim[(dan[off + ANIM] >> 3) % anim.length];
        const alpha = dan[off + DIE] >> 1;
        GL.drawSpriteAlpha(sprite, 
            (dan[off + LEFT] >> 3) - (sprite.w >> 1), 
            (dan[off + TOP] >> 3) - (sprite.h >> 1),
            alpha);
    }

    return off + NEXT;
}


export function render() {

    // Traverse all live shots while rendering them.
    let ref = 0;
    while (dan[ref] > 0)
        ref = danRender(ref);
}


// Add a shot, return true if the shot was added, false otherwise. 
function add(s: {
    type: number,
    sprite: string|number,
    x: number,
    y: number,
    life: number, // 64=infinite
    p0?: number,
    p1?: number,
    p2?: number,
    p3?: number
}) {

    const off = dan[1];
    if (off < 0) return false;

    dan[1] = dan[off + NEXT];
    dan[off + NEXT] = dan[0];
    dan[0] = off;

    const sprite = typeof s.sprite == "string" ? spriteByName[s.sprite] : s.sprite;
    dan[off + TYPE] = s.type;
    dan[off + SPRITE] = sprite;
    dan[off + LEFT] = s.x;
    dan[off + TOP] = s.y;
    dan[off + WIDTH] = sprites[sprite][0].w;
    dan[off + HEIGHT] = sprites[sprite][0].h;
    dan[off + PARAM0] = s.p0 || 0;
    dan[off + PARAM1] = s.p1 || 0;
    dan[off + PARAM2] = s.p2 || 0;
    dan[off + PARAM3] = s.p3 || 0;
    dan[off + DIE] = s.life;
    dan[off + TIMER] = 0;
    dan[off + ANIM] = 0;

    return true;
}

export function fireStandard(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    sprite: string|number) 
{
    add({
        type: DAN_STD,
        sprite,
        x,
        y,
        life: 64,
        p0: vx,
        p1: vy,
    })
}

export function fireSeek(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    delay: number,
    sprite: string) 
{
    add({
        type: DAN_DAIM,
        sprite,
        x,
        y,
        life: 64,
        p0: vx,
        p1: vy,
        p2: delay
    })
}

export function fireMissile(
    x: number, 
    y: number, 
    a: number,
    sprite: string) 
{
    add({
        type: DAN_MISL,
        sprite,
        x,
        y,
        life: 64,
        p3: Math.floor(a / Math.PI * 256)
    })
}

export function fireWorks(
    x: number, 
    y: number, 
    vx: number,
    vy: number,
    sprite: string,
    subsprite: string) 
{
    add({
        type: DAN_FWOK,
        sprite,
        x,
        y,
        life: 64,
        p0: vx,
        p1: vy, 
        p2: 3,
        p3: spriteByName[subsprite]
    })
}

// Fire six delayed-aim bullets in two arcs below the position
export function fireBelowArc2Seek(x: number, y: number, sprite: string) {
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0:  8, p1:  0, p2: 20 })
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0:  6, p1:  6, p2: 20 })
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0: -6, p1:  6, p2: 20 })
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0:  4, p1:  0, p2: 10 })
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0:  3, p1:  3, p2: 10 })
    add({ type: DAN_DAIM, sprite, x, y, life: 64, p0: -3, p1:  3, p2: 10 })
}

// Fires seven bullets below
export function fireBelowArcBig(x: number, y: number, sprite: string) {
    fireStandard(x, y,  0, 8, sprite);
    fireStandard(x, y,  6, 6, sprite);
    fireStandard(x, y, -6, 6, sprite);
    fireStandard(x, y,  7, 3, sprite);
    fireStandard(x, y, -7, 3, sprite);
    fireStandard(x, y,  3, 7, sprite);
    fireStandard(x, y, -3, 7, sprite);
}

export function fireCarrier(x: number, y: number, mode: Mode) {
    const type = mode == "n" ? DAN_CARN :
                 mode == "d" ? DAN_CARD : DAN_CARV;
    const sprite = "b1v";
    add({ type, sprite, x, y, life: 64, p0: -80, p1:   0 })
    add({ type, sprite, x, y, life: 64, p0:  80, p1:   0 })
    add({ type, sprite, x, y, life: 64, p0: -60, p1:  60 })
    add({ type, sprite, x, y, life: 64, p0:  60, p1:  60 })
    add({ type, sprite, x, y, life: 64, p0: -60, p1: -60 })
    add({ type, sprite, x, y, life: 64, p0:  60, p1: -60 })
}