import { opts } from "options";
import { blade, bladestar, bladet, blast, lasbme, lasbml, lasbmm, lasbse, lasbsl, lasbsm, lasoml, lasomm, lasosl, lasosm, orocket, rocket, rocketf, smaball, vblast } from "./sprites"
import * as GL from "./webgl"

// Shot data is encoded as consecutive Int32 values, 
// with the meanings:
const NEXT = 0; 
const TYPE = 1;
const PARAM0 = 2
const PARAM1 = 3
const PARAM2 = 4
const HIT = 5;
const TOP = 6;
const LEFT = 7;
const WIDTH = 8;
const HEIGHT = 9;
const TIMER = 10;

// All the various shot types
export const SHOT_DEAD			    = 0x0000
export const SHOT_BLASTER		    = 0x0001
export const SHOT_ROCKET_MOVE	    = 0x0002
export const SHOT_ROCKET			= 0x0003
export const SHOT_BLADE_SPAWN	    = 0x0004
export const SHOT_BLADE			    = 0x0005
export const SHOT_ROCKET_SPAWN	    = 0x0006
export const SHOT_OBLADE			= 0x0007
export const SHOT_BLADE_STAR		= 0x0008
export const SHOT_OBLADE_SPAWN	    = 0x0009
export const SHOT_OROCKET_SPAWN	    = 0x000A
export const SHOT_OROCKET		    = 0x000B
export const SHOT_OROCKET_DIE	    = 0x000C
export const SHOT_OROCKET_MOVE	    = 0x000D
export const SHOT_LASER			    = 0x000E
export const SHOT_LASER_DEAD		= 0x000F
export const SHOT_OLASER			= 0x0010
export const SHOT_OLASER_DEAD	    = 0x0011
export const SHOT_OROCKET_FURY	    = 0x0012
export const SHOT_OROCKET_FURY_D	= 0x0013
export const SHOT_DELAYED_BOOM	    = 0x0014
export const SHOT_BOOM_DIE		    = 0x0015
export const SHOT_FBLASTER		    = 0x0016
export const SHOT_FLASER			= 0x0017
export const SHOT_LASERM			= 0x0018
export const SHOT_OLASERM		    = 0x0019
export const SHOT_LASERM_DEAD	    = 0x001A
export const SHOT_OLASERM_DEAD	    = 0x001B
export const SHOT_INVISIBLE		    = 0x001C
export const SHOT_UFURY_BOOM		= 0x001D
export const SHOT_UFURY			    = 0x001E

const maxShotAmount = 200;
const shotSize = 11;

const shots = new Int32Array(maxShotAmount * shotSize);

// The first two spots are: 
//  - the start of the allocated list
//  - the start of the free list
shots[0] = -1
shots[1] = 2
for (let i = 0; i < maxShotAmount - 1; ++i) 
    shots[2 + i * shotSize + NEXT] = 2 + (i+1) * shotSize;
shots[2 + (maxShotAmount - 1) * shotSize + NEXT] = -1;

// STEPPING ==================================================================

// Logic step for the shot referenced by the cell at position
// 'ref'. Returns true if the shot survives the step, false
// if it's removed. 
function shotStep(ref: number): boolean {

    const off = shots[ref]

    const type = shots[off + TYPE];
    if (type == SHOT_DEAD) {

        // Nothing, will be removed at end of step.

    } else if (type == SHOT_BLASTER) {

        if ((shots[off + TOP] -= 96) < -96)
            shots[off + TYPE] = SHOT_DEAD;

    } else if (type == SHOT_ROCKET_SPAWN ||
               type == SHOT_OROCKET_SPAWN) {

        const p0 = shots[off + PARAM0];
        shots[off + TIMER] = Math.abs(p0) * 6;
        shots[off + PARAM0] = p0 > 0 ? 38 - 4 * p0 : - 38 - 4 * p0;
        shots[off + TYPE] = type == SHOT_ROCKET_SPAWN 
            ? SHOT_ROCKET_MOVE
            : SHOT_OROCKET_MOVE; 

    } else if (type == SHOT_ROCKET_MOVE ||
               type == SHOT_OROCKET_MOVE) {
                
        const t = shots[off + TIMER]--;
        shots[off + LEFT] += shots[off + PARAM0] * ((t >> 3) + 1);
        
        if (type == SHOT_OROCKET_MOVE)
            shots[off + TOP] += 8;

        if (t <= 1) {
            if (type == SHOT_ROCKET_MOVE) {
                shots[off + TYPE] = SHOT_ROCKET;
                shots[off + PARAM1] = 0;
            } else {
                shots[off + TYPE] = SHOT_OROCKET;
                shots[off + TOP] -= 8<<3 
                shots[off + LEFT] -= 8<<3;
                shots[off + PARAM0] = -128;
                shots[off + PARAM1] = 0;
            }
        }

    } else if (type == SHOT_ROCKET) {
        
        const p = shots[off + PARAM1];
        
        if (p < 64) 
            shots[off + PARAM1] = p + 1;
        
        if ((shots[off + TOP] -= p) < -120) 
            shots[off + TYPE] = SHOT_DEAD;

        shots[off + TIMER]++;

    } else if (type == SHOT_OROCKET) {

        const t = shots[off + TIMER]++;
        const a = shots[off + PARAM0] / 256 * Math.PI;
        const p = shots[off + PARAM1];
        
        if (p < 64)
            shots[off + PARAM1] = p + 1;

        const x = shots[off + LEFT] += Math.floor(p * Math.cos(a));
        const y = shots[off + TOP] += Math.floor(p * Math.sin(a));

        if (t > 16 && tx != 0 && ty != 0) {
            // Track the current target
            const cx = x + shots[off + WIDTH]/2;
            const cy = y + shots[off + HEIGHT]/2;
            const aim = Math.atan2(ty - cy, tx - cx);

            const adjaim = 
                Math.abs(aim - a) < Math.PI ? aim :
                Math.abs(aim - a + 2 * Math.PI) < Math.PI ? aim + 2 * Math.PI : 
                                                            aim - 2 * Math.PI; 
            
            shots[off + PARAM0] += a > adjaim ? -3 : 3;
        }

        if (t > 64)
            if (x < -120 || x > 1920 || y < -120 || y > 2560) 
                shots[off + TYPE] = SHOT_DEAD;

    } else if (type == SHOT_OROCKET_DIE) {

        if (shots[off + PARAM0]-- <= 1)
            shots[off + TYPE] = SHOT_DEAD;
    
    } else if (type == SHOT_BLADE_SPAWN ||
               type == SHOT_OBLADE_SPAWN) {

        switch (shots[off + PARAM0]) {
            case -3: 
                shots[off + PARAM0] = -42;
                shots[off + PARAM1] = -42;
                break;
            case -2:
                shots[off + PARAM0] = -52;
                shots[off + PARAM1] = -30;
                break;
            case -1:
                shots[off + PARAM0] = -58;
                shots[off + PARAM1] = -16;
                break;
            case 1:
                shots[off + PARAM0] = -58;
                shots[off + PARAM1] = 16;
                break;
            case 2:
                shots[off + PARAM0] = -52;
                shots[off + PARAM1] = 30;
                break;
            case 3:
                shots[off + PARAM0] = -42;
                shots[off + PARAM1] = 42;
                break;
            default:
                shots[off + PARAM0] = -60;
                shots[off + PARAM1] = -0;
                break;
        }
        shots[off + TYPE] = type == SHOT_OBLADE_SPAWN ? SHOT_OBLADE : SHOT_BLADE;
        shots[off + LEFT] += 4 * shots[off + PARAM1];
        shots[off + TOP]  += 4 * shots[off + PARAM0];

    } else if (type == SHOT_BLADE || 
               type == SHOT_OBLADE || 
               type == SHOT_FBLASTER) {

        const left = shots[off + LEFT] += shots[off + PARAM1];
        const top = shots[off + TOP]  += shots[off + PARAM0];
        if (left < -120 || left > 1920 || top < -120 || top > 2560) 
            shots[off + TYPE] = SHOT_DEAD;

    } else if (type == SHOT_BLADE_STAR) {

        if (++shots[off + TIMER] >= 30) 
            shots[off + TYPE] = SHOT_DEAD;

    } else if (type == SHOT_LASER) {
        shots[off + TOP] -= 16;
        shots[off + HEIGHT] += 16; 
        shots[off + TYPE] = SHOT_LASER_DEAD;
    } else if (type == SHOT_LASERM) {
        shots[off + TOP] -= 16;
        shots[off + HEIGHT] += 16;
        shots[off + TYPE] = SHOT_LASERM_DEAD;
    } else if (type == SHOT_LASER_DEAD ||
               type == SHOT_OLASER_DEAD ||
               type == SHOT_LASERM_DEAD ||
               type == SHOT_OLASERM_DEAD ||
               type == SHOT_INVISIBLE) {

        shots[off + TYPE] = SHOT_DEAD;
    } else if (type == SHOT_OLASER) {
        shots[off + TYPE] = SHOT_OLASER_DEAD;
        const x = shots[off + LEFT];
        const y = shots[off + TOP] >> 3;
        const h = shots[off + HEIGHT] >> 3;
        const p0 = shots[off + PARAM0];
        const p1 = shots[off + PARAM1];
        let dec = 0;
        for (let j = y; j < y + h; j += 3) dec += p1;
        for (let i = y; i < y + h - 3; i += 36) {
            let o = addRaw(SHOT_INVISIBLE, x - 32 + (dec>>2), i << 3, lasosl.w << 3, 36<<3, p0 << 3);
            if (o >= 0) shots[o + HIT] = 1;
            dec -= 12*p1;
        }
    } else if (type == SHOT_OLASERM) {
        shots[off + TYPE] = SHOT_OLASERM_DEAD;
        const x = shots[off + LEFT];
        const y = shots[off + TOP] >> 3;
        const h = shots[off + HEIGHT] >> 3;
        const p0 = shots[off + PARAM0];
        const p1 = shots[off + PARAM1];
        let dec = 0;
        for (let j = y; j < y + h; j += 3) dec += p1;
        for (let i = y; i < y + h - 3; i += 54) {
            let o = addRaw(SHOT_INVISIBLE, x - 32 + (dec>>2), i << 3, lasosm.w << 3, 54<<3, p0 << 2);
            if (o >= 0) shots[o + HIT] = 1;
            dec -= 18*p1;
        }
    } else {
        throw "Unknown shot type"
    }

    if (shots[off + TYPE] == SHOT_DEAD) {
        // Shot has died during this step, so remove it from
        // the live shot list and append it to the free shot list.
        shots[ref] = shots[off + NEXT];
        shots[off + NEXT] = shots[1];
        shots[1] = off;
        return false;
    }

    return true;
}

export function step() {

    // Traverse all live shots while updating them.
    let ref = 0;
    while (shots[ref] > 0)
    {
        const next = shots[ref + NEXT];
        if (shotStep(ref)) ref = next;
    }

    // Reset the target enemy ; it will be provided again on 
    // the next step if there are enemies.
    tx = 0; ty = 0;

}

// RENDERING =================================================================

function renderOLaser(off: number) {

    const t = shots[off + TYPE];
    const x = shots[off + LEFT] >> 3;
    const p1 = shots[off + PARAM1];
    const p2 = shots[off + PARAM2];

    let y = shots[off + TOP] >> 3;
    const h = shots[off + HEIGHT] >> 3;
    if (y < 0) y = 0;
    const max = y + h;

    let dec = 0;
    for (let j = y - ((p2>>1)&3); j < max; j += 3)
        dec += p1;

    if (t == SHOT_OLASER_DEAD) {

        for (let i = y - ((p2>>1)&3); i < max; i += 3) 
        {
            if (i+3 > y)
                GL.drawSprite(lasosl, x-5+(dec>>5), i);
            dec -= p1;
        }

        GL.drawSprite(lasosm, x-7, max-8);

    } else {

        for (let i = y - ((p2>>1)&3); i < max; i += 3) 
        {
            if (i+3 > y)
                GL.drawSprite(lasoml, x+(dec>>5), i);
            dec -= p1;
        }

        GL.drawSprite(lasomm, x-2, max-8);

    }
}

function renderLaser(off: number) {

    const t = shots[off + TYPE];
    const x = shots[off + LEFT] >> 3;
    const p = shots[off + PARAM2];

    let y = shots[off + TOP] >> 3;
    let h = shots[off + HEIGHT] >> 3;
    if (shots[off + HIT]) h++;
    const max = y + h;
    if (y < 0) y = 0;

    const alpha = Math.floor(24 + Math.sin(p / 4) * 8);

    if (t == SHOT_LASER_DEAD) {
        for (let i = y - (p&3); i <= max-6; i += 3) 
        {
            const a = (i + p * 4) / 16;
            const xoff = Math.floor(
                Math.cos(a) *
                Math.min(8, (i - y)/4, (max-6-i)/4));
            
            if (i + 3 > y)
                GL.drawSpriteAdditive(lasbsl, x-1+xoff, i, alpha);
        }

        if (y != 0 && h > 0)
            GL.drawSpriteAdditive(lasbse, x-6, y-8, alpha);

        GL.drawSpriteAdditive(lasbsm, x-7, max-9, alpha);

    } else {
        
        for (let i = y ; i <= max-4; i += 2) 
        {
            const a = (i + p * 4) / 16;
            const xoff = Math.floor(
                Math.cos(a) *
                Math.min(6, (i - y)/4, (max-6-i)/4));
            
            if (i + 3 > y)
                GL.drawSpriteAdditive(lasbml, x+2+xoff, i, alpha);
        }

        if (y != 0 && h > 0)
            GL.drawSpriteAdditive(lasbme, x-2, y-8, alpha);

        GL.drawSpriteAdditive(lasbmm, x-2, max-6, alpha);
    }
}

// Render a shot and return the offset of the next shot
function shotRender(ref: number): number {

    const off = shots[ref];
    const x = shots[off+LEFT] >> 3;
    const y = shots[off+TOP] >> 3;

    const type = shots[off + TYPE];
    
    if (type == SHOT_DEAD || 
        type == SHOT_LASER ||
        type == SHOT_LASERM ||
        type == SHOT_INVISIBLE ||
        type == SHOT_OLASER ||
        type == SHOT_OLASERM) {
        // Nothing
    } else if (type == SHOT_LASER_DEAD || type == SHOT_LASERM_DEAD) {
        renderLaser(off);
    } else if (type == SHOT_OLASER_DEAD || type == SHOT_OLASERM_DEAD) {
        renderOLaser(off);
    } else if (type == SHOT_BLASTER) {
        GL.drawSprite(blast, x, y)
    } else if (type == SHOT_ROCKET_MOVE || type == SHOT_OROCKET_MOVE) {
        GL.drawSprite(rocket, x, y);
    } else if (type == SHOT_ROCKET) {
        if (opts.LodWeaponDetail) {
            const t = shots[off + TIMER];            
			GL.drawSpriteAlpha(rocketf[(t>>2)&1], x+1, y+15, 24 );
			GL.drawSpriteAlpha(rocketf[(1+(t>>2))&1], x+1, y+15, 8 );
        }
        GL.drawSprite(rocket, x, y);
    } else if (type == SHOT_OROCKET) {
        const a = shots[off + PARAM0] / 256 * Math.PI + Math.PI/2;
        GL.drawSpriteAngle(orocket, x, y, a);
    } else if (type == SHOT_OROCKET_DIE) {
        const w = smaball.w;
        GL.drawSpriteAdditive(smaball, x-1-w/2, y+1-w/2, shots[off + PARAM0]);
    } else if (type == SHOT_BLADE_SPAWN || type == SHOT_OBLADE_SPAWN ||
               type == SHOT_ROCKET_SPAWN || type == SHOT_OROCKET_SPAWN) {
        // Nothing
    } else if (type == SHOT_BLADE || type == SHOT_OBLADE) {

        if (type == SHOT_OBLADE) {
            GL.drawSpriteAlpha(bladet, 
                (shots[off + LEFT] - 2*shots[off + PARAM1]) >> 3,
                (shots[off + TOP]  - 2*shots[off + PARAM0]) >> 3,
                opts.LodWeaponDetail ? 16 : 32);
            GL.drawSpriteAlpha(bladet, 
                (shots[off + LEFT] - 4*shots[off + PARAM1]) >> 3,
                (shots[off + TOP]  - 4*shots[off + PARAM0]) >> 3,
                opts.LodWeaponDetail ? 8 : 32);
        }

        if (opts.LodWeaponDetail)
            GL.drawSpriteAdditive(blade, x, y, 32)
        else
            GL.drawSprite(blade, x, y)
    } else if (type == SHOT_BLADE_STAR) {
        const timer = shots[off + TIMER];
        if (opts.LodExplosions) {
            GL.drawSpriteAdditive(blade, x, y, 32 - timer)
            GL.drawSpriteAdditive(bladestar[timer >> 1], x-26, y-32, 32 - timer);
        } else if (opts.LodWeaponDetail) {
            GL.drawSpriteAdditive(blade, x, y, 32 - timer)
        }
    } else {
        throw "Unknown shot type"
    }

    return off + NEXT;
}

export function render() {

    // Traverse all live shots while rendering them.
    let ref = 0;
    while (shots[ref] > 0)
        ref = shotRender(ref);
}

// CREATION ==================================================================

// Add a shot, return true if the shot was added, false otherwise. 
export function add(
    type: number,
    x: number,
    y: number,
    w: number,
    h: number,
    p0?: number,
    p1?: number,
    p2?: number): boolean 
{ 
    return addRaw(type, x, y, w, h, p0, p1, p2) >= 0 
}

// Add a shot, return its offset if added, -1 otherwise
function addRaw(
    type: number,
    x: number,
    y: number,
    w: number,
    h: number,
    p0?: number,
    p1?: number,
    p2?: number
) {

    const off = shots[1];
    if (off < 0) return -1;

    shots[1] = shots[off + NEXT];
    shots[off + NEXT] = shots[0];
    shots[0] = off;

    shots[off + TYPE] = type;
    shots[off + LEFT] = x;
    shots[off + TOP] = y;
    shots[off + WIDTH] = w;
    shots[off + HEIGHT] = h;
    shots[off + PARAM0] = p0 || 0;
    shots[off + PARAM1] = p1 || 0;
    shots[off + PARAM2] = p2 || 0;
    shots[off + HIT] = 0;
    shots[off + TIMER] = 0;

    return off;
}


// COLLISION =================================================================

// A collision has occurred with the shot at the specified position. Return
// the amount of damage, and apply per-shot on-hit behavior. 
function onShotCollide(off: number, tx: number, ty: number, tw: number, th: number): number {

    const type = shots[off + TYPE];
    
    if (type == SHOT_BLASTER || type == SHOT_FBLASTER) {
        shots[off + TYPE] = SHOT_DEAD;
        shots[off + HIT] = 1;
        return 64;
    }

    if (type == SHOT_ROCKET) {
        shots[off + HIT] = 1;
        shots[off + TYPE] = SHOT_OROCKET_DIE;
        shots[off + PARAM0] = 32;
        return 200;
    }

    if (type == SHOT_OROCKET) {
        shots[off + HIT] = 1;
        shots[off + TYPE] = SHOT_OROCKET_DIE;
        shots[off + PARAM0] = 32;
        return 400;
    }

    if (type == SHOT_OROCKET_DIE) {
        return 3;
    }

    if (type == SHOT_BLADE) {

        const tcx = tx + tw/2;
        const tcy = ty + th/2;

        shots[off + HIT] = 1;
        
        // Vector to target
        let ttx = tcx - shots[off + LEFT] - shots[off + WIDTH]/2;
        let tty = tcy - shots[off + TOP] - shots[off + HEIGHT]/2;
        const tsize = Math.sqrt(ttx * ttx + tty * tty);
        ttx /= tsize;
        tty /= tsize;

        // Project speed along vector to target
        const vx = shots[off+PARAM1], vy = shots[off+PARAM0];
        const dot = ttx * vx + tty * vy;

        // Apply reflection vector in order to 'bounce'
        shots[off + PARAM1] -= Math.floor(2 * ttx * dot);
        shots[off + PARAM0] -= Math.floor(2 * tty * dot);

        const o = addRaw(
            SHOT_BLADE_STAR,
            shots[off+LEFT],
            shots[off+TOP],
            shots[off+WIDTH],
            shots[off+HEIGHT]);
                
        if (o >= 0)
            shots[o + HIT] = 1;

        return 400; 
    }

    if (type == SHOT_OBLADE) {

        shots[off + HIT] = 1;

        let a = Math.random();
        
        for (let i = 0; i < 3; ++i) {
            const o = addRaw(
                SHOT_BLADE,
                shots[off + LEFT],
                shots[off + TOP],
                shots[off + WIDTH],
                shots[off + HEIGHT],
                Math.floor(60 * Math.cos((a + i/3) * 2 * Math.PI)),
                Math.floor(60 * Math.sin((a + i/3) * 2 * Math.PI)));
            
            if (o >= 0)
                shots[o + HIT] = 1;
        }

        shots[off + TYPE] = SHOT_DEAD;

        return 200;
    }

    if (type == SHOT_BLADE_STAR) {
        return (32 - shots[off + TIMER]) >> 4;
    }

    if (type == SHOT_LASER || type == SHOT_LASERM) {
        shots[off + HIT] = 1;
        const top = shots[off + TOP];
        if (top <= (ty + th)) {
            shots[off + HEIGHT] -= (ty+th) - top;
            shots[off + TOP] = ty+th;
        }
        return 0;
    }

    if (type == SHOT_LASER_DEAD || type == SHOT_LASERM_DEAD) {
        shots[off + HIT] = 1;
        shots[off + PARAM1] = 1;
        return shots[off + PARAM2];
    }
 
    if (type == SHOT_INVISIBLE) {
        shots[off + HIT] = 1;
        return shots[off + PARAM0];
    }

    return 0;
}

// Center of an enemy target, if any. Otherwise (0, 0)
let tx = 0, ty = 0;

// Specify a target for homing shots.
export function setTarget(x: number, y: number) {
    tx = x;
    ty = y;
}

// Return the damage amount if at least one shot intersects the rectangle, or
// zero if no shots intersect it. 
// Triggers enemy-hit behavior for colliding shots (which usually causes the shot
// to become dead, at which point it will be removed on the next step).
export function collideEnemy(x: number, y: number, w: number, h: number) {

    const x2 = x + w;
    const y2 = y + h;

    let damage = 0;

    // Traverse all live shots while testing for collision.
    let ref = 0;
    while (shots[ref] > 0) {

        const off = shots[ref];
        ref = off + NEXT;

        // Do we collide ? 
        const sx = shots[off + LEFT];
        if (sx >= x2) continue;
        const sy = shots[off + TOP];
        if (sy >= y2) continue;
        const sw = shots[off + WIDTH];
        if (sw + sx <= x) continue;
        const sh = shots[off + HEIGHT];
        if (sh + sy <= y) continue;
        
        // We do collide, but does it register as such ?
        damage += onShotCollide(off, x, y, w, h);
    }

    return damage;
}