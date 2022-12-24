import { Sprite } from "./sprites";
import * as Shot from "./shot";
import * as GL from "./webgl";

export class Enemy {
    
    private timer : number

    public w: number
    public h: number
    public flash: number

    constructor(
        public x: number, 
        public y: number,
        public health: number,
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

    // Can this enemy be shot ?
    public shootable() : boolean { return true; }

    // Execute a simulation step. Returns the new version of the
    // enemy (usually it's the same instance, but it may change
    // when an enemy changes to a different type), or null if the 
    // enemy is dead and should be removed. 
    public step() : Enemy|null {
        
        this.timer++;
        if (this.flash) this.flash--;

        if (this.shootable()) {
            const dmg = Shot.collideEnemy(this.x, this.y, this.w, this.h);
            if (dmg > 0) {
                if (this.flash <= 30) this.flash = 34; 
                this.health -= dmg;
            }
        }

        return this;
    }

    public render() : void {
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
