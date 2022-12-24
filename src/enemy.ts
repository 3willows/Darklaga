import * as S from "./sprites";
import * as Shot from "./shot";
import * as GL from "./webgl";

export type Mode = "n"|"v"|"d"

export class Enemy {
    
    public timer : number

    public w: number
    public h: number
    public flash: number

    constructor(
        public x: number, 
        public y: number,
        public health: number,
        public mode: Mode,
        public sprites: S.Sprite[],
        public hit: S.Sprite) {       

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
                if ((this.health -= dmg) <= 0)
                    return new Dying(this.x, this.y, this.hit, this.mode);
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

const explosions = {
    n: [    S.explon0,
            S.explon1,
            S.explon2,
            S.explon3,
            S.explon4,
            S.explon5,
            S.explon6,
            S.explon7,
            S.explon8,
            S.explon9,
            S.explon10,
            S.explon11,
            S.explon12,
            S.explon13,
            S.explon14,
            S.explon15,
            S.explon16,
            S.explon17,
            S.explon18,
            S.explon19,
            S.explon20,
            S.explon21,
            S.explon22,
            S.explon23 ],
    v: [] as S.Sprite[],
    d: [] as S.Sprite[]
}
    

export class Dying extends Enemy {

    private explo : S.Sprite[]

    constructor(x: number, y: number, sprite: S.Sprite, mode: "n"|"v"|"d") {
        super(x, y, 0, mode, [sprite], sprite)
        this.explo = explosions[mode];
    }

    public shootable(): boolean { return false; }

    public step() {
        super.step();
        if (this.timer >= 88) return null;
        return this;
    }

    public render() {
        if (this.timer < 8) {

            // The enemy sprite itself
            GL.drawSprite(this.hit, this.x >> 3, this.y >> 3);
            
            // An explosion sprite
            GL.drawSprite(
                this.explo[this.timer >> 1],
                (this.x >> 3) - 4,
                (this.y >> 3) - 4);
        
        } else {

            // Only the explosion sprite
            GL.drawSprite(
                this.explo[(this.timer+8)>>2], 
                (this.x >> 3) - 4, 
                (this.y >> 3) - 4);
        }
    }
}


const enemies : Enemy[] = [];

export function step() {
    for (let i = 0; i < enemies.length; ++i) {
        const next = enemies[i].step();
        if (!next) {
            // Enemy died: remove it
            enemies[i] = enemies[enemies.length - 1]
            enemies.pop();
            --i;
        } else {
            enemies[i] = next;
        }
    }
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
