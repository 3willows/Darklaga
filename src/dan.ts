// "Dan" is the "bullet" part of "Danmaku" (弾幕) meaning "bullet curtain"
// Enemy bullets are called "Dan" to distinguish them from player "shots"

import * as S from "./sprites"
import * as GL from "./webgl"

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
const DAN_CARN			= 0x0002
const DAN_CARD			= 0x0003
const DAN_CARV			= 0x0004
const DAN_CARB			= 0x0005
const DAN_DAIM			= 0x0006
const DAN_ADN			= 0x0007
const DAN_MISL			= 0x0008
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
const sprites = [
    [S.bullet2all],
    twoSide(S.bullet1n),
    twoSide(S.bullet1d),
    twoSide(S.bullet1v),
]

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
    sprite: number,
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

    dan[off + TYPE] = s.type;
    dan[off + SPRITE] = s.sprite;
    dan[off + LEFT] = s.x;
    dan[off + TOP] = s.y;
    dan[off + WIDTH] = sprites[s.sprite][0].w;
    dan[off + HEIGHT] = sprites[s.sprite][0].h;
    dan[off + PARAM0] = s.p0 || 0;
    dan[off + PARAM1] = s.p1 || 0;
    dan[off + PARAM2] = s.p2 || 0;
    dan[off + PARAM3] = s.p3 || 0;
    dan[off + DIE] = s.life;
    dan[off + TIMER] = 0;

    return true;
}

export function fireStandard(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    sprite: number) 
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