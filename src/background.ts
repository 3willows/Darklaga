import { back, planet1, planet2, planet3, planet4 } from "./sprites";
import * as GL from "./webgl"

function randomizeStars() : Int32Array {
    const stars = new Int32Array(3 * 100);
    // TODO
    return stars;
}

const LEVEL0 = 0
const LEVEL1 = 1
const LEVEL2 = 2
const LEVEL3 = 3
const BOSS1  = 4
const LEVEL4 = 5
const LEVEL5 = 6
const LEVEL6 = 7
const BOSS2  = 8
const LEVEL7 = 9
const LEVEL8 = 10
const LEVEL9 = 11
const BOSS3  = 12

const bg = {
    current: LEVEL1,
    next: 0,
    timer: 0,

    lfactor: 0,
    warpstate: 0,
    next_planet: 0,

    scrolla: 0,
    scrollb: 0,
    scrollc: 0, 
    scrolld: 0,

    // Stars are stored as [x, y, depth] triplets
    stars: randomizeStars()
}

export function render() {
    if (bg.current == LEVEL0) {
        GL.drawSprite(planet1, 120, 80);
    } else if (bg.current == LEVEL1) {
        GL.drawSprite(back, 0, 0);
        GL.drawSprite(planet2, 0, 0);
    } else {
        throw "Unknown background"
    }
}