import { blast, vblast } from "./sprites"
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
    if (type == SHOT_BLASTER) {
        if ((shots[off + TOP] -= 96) < -96)
            shots[off + TYPE] = SHOT_DEAD;
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
        if (shotStep(ref))
            ref = shots[ref + NEXT]

}

// RENDERING =================================================================

// Render a shot and return the offset of the next shot
function shotRender(ref: number): number {

    const off = shots[ref];
    
    const type = shots[off + TYPE];
    if (type == SHOT_BLASTER) {
        GL.drawSprite(blast, shots[off + LEFT] >> 3, shots[off + TOP] >> 3)
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
export function add(s: {
    type: number,
    x: number,
    y: number,
    w: number,
    h: number,
    p0?: number,
    p1?: number,
    p2?: number
}) {

    const off = shots[1];
    if (off < 0) return false;

    shots[1] = shots[off + NEXT];
    shots[off + NEXT] = shots[0];
    shots[0] = off;

    shots[off + TYPE] = s.type;
    shots[off + LEFT] = s.x;
    shots[off + TOP] = s.y;
    shots[off + WIDTH] = s.w;
    shots[off + HEIGHT] = s.h;
    shots[off + PARAM0] = s.p0 || 0;
    shots[off + PARAM1] = s.p1 || 0;
    shots[off + PARAM2] = s.p2 || 0;

    return true;
}
