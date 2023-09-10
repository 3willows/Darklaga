import { back, cityb, cityl, cityr, colu, metalla, metallb, metalra, metalrb, olla, ollb, olra, olrb, orgab, orgal, orgar, planet, Sprite } from "./sprites";
import * as Fury from "./fury"
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

export const LEVEL0 = 0
export const LEVEL1 = 1
export const LEVEL2 = 2
export const LEVEL3 = 3
export const BOSS1  = 4
export const LEVEL4 = 5
export const LEVEL5 = 6
export const LEVEL6 = 7
export const BOSS2  = 8
export const LEVEL7 = 9
export const LEVEL8 = 10
export const LEVEL9 = 11
export const BOSS3  = 12

const bg = {
    current: LEVEL0,
    next: 0,
    timer: 0,

    lfactor: 0,
    warpstate: 0,
    next_planet: 0,

    // Stars are stored as [x, y, depth] triplets
    stars: randomizeStars()
}

const coluback: { 
    readonly s: Sprite, 
    readonly x: number,
    readonly v: number,
    readonly h: number,
    o: number
}[] = (function() {
    
    let nextx = 0;
    return colu.map(function(s, i) {
        const x = nextx;
        nextx += s.w;
        return {
            s, x, h: s.h, v: (1 + Math.abs(3 - i)) << 6, o: 0
        }
    })
})()

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

function renderColuBack() {
    for (let cb of coluback) 
        for (let y = (cb.o>>6) - cb.h; y < 320; y += cb.h)
            GL.drawSprite(cb.s, cb.x, y);
}

function renderCityBack(bringin: boolean, bringout: boolean) {
    
    let xoff = 0;
    if (bringin && bg.timer < 128) {
        const f = (128 - bg.timer) / 128;
        xoff = Math.floor(f * f * cityl.w);
    }
    if (bringout && bg.timer >= 32) {
        const f = (bg.timer - 32) / 128;
        xoff = Math.floor(f * f * cityl.w);
    }

    const yoff = (2 * bg.timer) % cityl.h;

    if (!(bringin && bg.timer < 128) && !(bringout && bg.timer >= 32)) 
        for (let y = yoff/2 - cityb.h; y < 320; y += cityb.h)
            GL.drawSprite(cityb, 120 - cityb.w/2, y);

    if (bringin && bg.timer < 256) 
        GL.drawRect(0, 20, 240, 280, 0, 0, 0, 1 - Math.abs(bg.timer - 128)/128);

    if (bringout && bg.timer < 32)
        GL.drawRect(0, 20, 240, 280, 0, 0, 0, bg.timer/32);

    for (let y = yoff - cityl.h; y < 320; y += cityl.h) {
        GL.drawSprite(cityl, -xoff, y);
        GL.drawSprite(cityr, 240+xoff - cityr.w, y);
    }
}

function renderOrga() {

    if (bg.timer < 32) return;

    const a = bg.timer < 192 ? 0 : 
              bg.timer > 256 ? 32 : (bg.timer - 192) / 2
        
    const sa = (1.5 * bg.timer) % orgal.h;
    const sb = (0.75 * bg.timer) % orgab.h;

    const x2 = orgal.w;
    const x3 = 240 - orgar.w;

    if (a < 32)
        GL.drawRect(0, 20, 240, 280, 0, 0, 0, 1);

    for (let y = sb - orgab.h; y < 320; y += orgab.h) 
        GL.drawSpriteAlpha(orgab, x2, y, a);
    
    for (let y = sa - orgal.h; y < 320; y += orgal.h) {
        GL.drawSpriteAlpha(orgal, 0, y, a);
        GL.drawSpriteAlpha(orgar, x3, y, a);
        GL.drawSpriteAdditive(olla, 20, y + 28, 32 - (bg.timer % 32));
        GL.drawSpriteAdditive(ollb, 41, y + 30, 32 - ((bg.timer - 16) % 32));
        GL.drawSpriteAdditive(olra, x3 + 23, y + 28, 32 - (bg.timer % 32));
        GL.drawSpriteAdditive(olrb, x3 + 2, y + 30, 32 - ((bg.timer - 16) % 32));
    }
}

function renderMetalBack(bringin: boolean) {
    
    let xoff1 = 0;
    let xoff2 = 0;
    if (bringin && bg.timer < 128) {
        if (bg.timer < 64) {
            const f1 = (64 - bg.timer) / 64;
            xoff1 = Math.floor(f1 * f1 * metalla.w);
            xoff2 = metallb.w;
        } else {
            const f2 = (128 - bg.timer) / 64;
            xoff2 = Math.floor(f2 * f2 * metallb.w);
        }
    }

    const yoff1 = (2 * bg.timer) % metalla.h;
    const yoff2 = (bg.timer) % metallb.h;

    const rl = metalla.w + metallb.w - xoff1 - xoff2;

    GL.drawRect(rl, 20, 240 - rl, 280, 0, 0, 0, Math.min(1, bg.timer/128));

    if (!bringin || bg.timer > 64) {
        for (let y = yoff2 - metallb.h; y < 320; y += metallb.h) {
            GL.drawSprite(metallb, metalla.w - xoff2, y);
            GL.drawSprite(metalrb, 240+xoff2 - metalrb.w - metalra.w, y);
        }
    }

    for (let y = yoff1 - metalla.h; y < 320; y += metalla.h) {
        GL.drawSprite(metalla,- xoff1, y);
        GL.drawSprite(metalra, 240+xoff1 - metalra.w, y);
    }
}


export function render() {

    if (!Fury.showBackground()) return;

    GL.clear();

    switch (bg.current) {
    case LEVEL0:
    {
        GL.drawSprite(planet[0], 120, 80);
        renderStars();
        break;
    }
    case LEVEL1: 
    {
        GL.drawSprite(back, 0, 0);
        GL.drawSprite(planet[1], 0, 0);
        renderStars();
        break;
    }
    case LEVEL2:
    {
        if (bg.timer < 128) {
            GL.drawSprite(back, 0, 0);
            GL.drawSprite(planet[1], 0, 0);
            renderStars();
            GL.drawRect(0, 20, 240, 280, 0, 0, 0, bg.timer/128);
        } else {
            renderColuBack();
			if( bg.timer < 256 )
				GL.drawRect(0, 20, 240, 280, 0, 0, 0, (256-bg.timer)/128);
        }
        break;
    }
    case LEVEL3:
    case BOSS1: 
    {
        renderColuBack();
        break;
    } 
    case LEVEL4: 
    {
        GL.drawSprite(back, 0, 0);
        GL.drawSprite(planet[2], 0, 0);
        renderStars();
        break;
    }
    case LEVEL5: 
    {
        if (bg.timer < 128) {
            GL.drawSprite(back, 0, 0);
            GL.drawSprite(planet[2], 0, 0);
            renderStars();
        } 
        renderCityBack(true, false);
        break;
    }
    case LEVEL6:
    {
        renderCityBack(false, false);
        break;
    }
    case BOSS2:
    {
        renderOrga();
        if (bg.timer < 160)
            renderCityBack(false, true);
        break;
    } 
    case LEVEL7: 
    {
        GL.drawSprite(back, 0, 0);
        GL.drawSprite(planet[3], 0, 0);
        renderStars();
        break;
    }
    case LEVEL8: 
    {
        if (bg.timer < 128) {
            GL.drawSprite(back, 0, 0);
            GL.drawSprite(planet[3], 0, 0);
            renderStars();
        } 
        renderMetalBack(true);
        break;
    }
    case LEVEL9:
    case BOSS3: 
    {
        renderMetalBack(false);
        break;
    }
    }

    if (bg.lfactor) {
        GL.drawRect(0, 0, 240, 320, 0, 1/16, 1/4, bg.lfactor/255);
        renderStars();
    }
}

function stepColuBack() {
    for (let col of coluback)
        col.o = (col.o + col.v) % (col.h << 6);
}

export function warp(planet: number) {
    bg.warpstate = 1;
    bg.next = planet;
} 

export function set(planet: number) {
    bg.warpstate = 0;
    bg.current = planet;
    bg.timer = 0;
}

function stepWarp()
{
    switch (bg.warpstate) 
    {
        case 0: break;
        case 1: 
            if (bg.lfactor < 255) {
                bg.lfactor += 3;
            } else {
                bg.warpstate = 2;
                bg.timer = -64;
                bg.current = bg.next;
            }
            break;
        case 64: 
            if (bg.lfactor) {
                bg.lfactor -= 3;
            } else {
                bg.warpstate = 0;
            }
            break;
        default: 
            ++bg.warpstate;
            break;
    }
}

export function warping() {
    return !!bg.warpstate;
} 

export function animated() {
    if (bg.timer >= 256) return false;
    switch (bg.current) {
    case LEVEL2:
    case LEVEL5:
    case BOSS2: 
    case LEVEL8: 
        return true;
    default:
        return false;
    }
} 

export function step(canWarp: boolean = true) {

    if (canWarp)
        stepWarp();

    bg.timer++;

    for (let i = 0; i < 300; i += 3) {
        const y = bg.stars[i+1] += (bg.lfactor >> 2) + (STAR_SPEED >> (1 + bg.stars[i+2]));
        
        if ((y >> 3) + (STAR_SPEED >> (4 + bg.stars[i+2])) > 319) {
            bg.stars[i  ] = 10 + Math.floor(Math.random() * 220);
            const depth = bg.stars[i+2] = bg.lfactor ? 0 : Math.floor(Math.random()*3);
            const y = -(1 + Math.random()) * ((bg.lfactor + STAR_SPEED) / 3 / (1 + depth)); 
            bg.stars[i+1] = Math.floor(y) << 3;   
        }
    }

    if (bg.current >= LEVEL2 && bg.current <= BOSS1)
        stepColuBack();
}