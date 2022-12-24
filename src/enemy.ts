import { Sprite } from "./sprites";
import * as GL from "./webgl";

export class Enemy {
    
    private timer : number

    public w: number
    public h: number
    public flash: number
    
    constructor(
        public x: number, 
        public y: number,
        public sprites: Sprite[],
        public hit: Sprite) {       

        this.timer = 0
        this.flash = 0
        this.w = sprites[0].w << 3;
        this.h = sprites[0].h << 3;
    }

    public frame() {
        return (this.timer >> 3) % this.sprites.length;
    }

    public step() {
        this.timer++;
        const s = this.sprites[this.frame()];
        this.w = s.w << 3;
        this.h = s.h << 3;
    }

    public render() {
        const sprite = this.flash 
            ? this.hit
            : this.sprites[this.frame()];
        GL.drawSprite(sprite, this.x >> 3, this.y >> 3);
    }
}

const enemies : Enemy[] = [];

export function step() {
    for (let e of enemies) e.step();
}

export function render() {
    for (let e of enemies) e.render();
}

export function add(e: Enemy) {

    if (enemies.length < 40) {
        enemies.push(e);
        return true;
    }

    return false;
}
