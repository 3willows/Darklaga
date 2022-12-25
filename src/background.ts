import { back, planet } from "./sprites";
import * as GL from "./webgl"

function randomizeStars() : Int32Array {
    const stars = new Int32Array(3 * 100);
    for (let i = 0; i < 300; i += 3) {
        stars[i  ] = 10 + Math.floor(Math.random() * 220);
        stars[i+1] = Math.floor(Math.random() * 320) << 3;
        stars[i+2] = Math.floor(Math.random() * 5); 
    }
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

const STAR_SPEED = 100

function renderStars() {
    for (let i = 0; i < 300; i += 3) {
        const c = (((64 / (1 + bg.stars[i+2])) | bg.lfactor) & 255) / 255.0;
        GL.drawRectAdditive(
            /* x, y */ bg.stars[i], bg.stars[i+1] >> 3, 
            /* w, h */ 1, ((bg.lfactor + STAR_SPEED) / 3 / (1 + bg.stars[i+2])),
            /* rgba */ c, c, c, 1);
    }
}

export function render() {
    if (bg.current == LEVEL0) {
        GL.drawSprite(planet[0], 120, 80);
    } else if (bg.current == LEVEL1) {
        GL.drawSprite(back, 0, 0);
        GL.drawSprite(planet[1], 0, 0);
        renderStars();
    } else {
        throw "Unknown background"
    }
}

export function step() {

    for (let i = 0; i < 300; i += 3) {
        const y = bg.stars[i+1] += (bg.lfactor >> 2) + (STAR_SPEED >> (1 + bg.stars[i+2]));
        
        if ((y >> 3) + (STAR_SPEED >> (4 + bg.stars[i+2])) > 319) {
            bg.stars[i  ] = 10 + Math.floor(Math.random() * 220);
            const depth = bg.stars[i+2] = bg.lfactor ? 0 : Math.floor(Math.random()*3);
            const y = -(1 + Math.random()) * ((bg.lfactor + STAR_SPEED) / 3 / (1 + depth)); 
            bg.stars[i+1] = Math.floor(y) << 3;
            
        }
    }

}