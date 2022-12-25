import * as S from "./sprites";
import * as Shot from "./shot";
import * as GL from "./webgl";
import { opts } from "options";

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
    n: S.explon,
    v: S.explov,
    d: S.explod
}
    

export class Dying extends Enemy {

    private explo : S.Sprite[]
    private angle : number

    constructor(x: number, y: number, sprite: S.Sprite, mode: "n"|"v"|"d") {
        super(x, y, 0, mode, [sprite], sprite)
        this.explo = explosions[mode];
        this.angle = Math.random()
    }

    public shootable(): boolean { return false; }

    public step() {
        super.step();
        if (this.timer >= 40) return null;
        return this;
    }

    public render() {

        const ex = (this.x >> 3) - 4;
        const ey = (this.y >> 3) - 4;

        // Center the flash
        const bx = (this.x >> 3) - (S.boomlight.w - this.hit.w)/2;
        const by = (this.y >> 3) - (S.boomlight.h - this.hit.h)/2;

        let alpha;

        if (this.timer < 8) {

            // The enemy sprite itself
            GL.drawSprite(this.hit, this.x >> 3, this.y >> 3);

            // A two-layer explosion sprite
            if (opts.LodExplosions)
                GL.drawSprite(this.explo[this.timer >> 1], ex, ey);            
            GL.drawSpriteAdditive(this.explo[this.timer >> 1], ex, ey, 32);
            
            // An additive flash of light
            if (opts.LodExplosions >= 2)
                GL.drawSpriteAdditive(S.boomlight, bx, by, this.timer << 2);

            alpha = this.timer << 1;

        } else {

            const factor = 40 - this.timer;

            if (factor > 0) {
                // Only the two-layer explosion sprite
                if (opts.LodExplosions)
                    GL.drawSpriteAlpha(this.explo[(this.timer+8)>>2], ex, ey, factor);
                GL.drawSpriteAdditive(this.explo[(this.timer+8)>>2], ex, ey, factor);
            }

            if (opts.LodExplosions >= 2 && this.timer < 24)
                GL.drawSpriteAdditive(S.boomlight, bx, by, (24 - this.timer) << 1);

            alpha = 24 - this.timer;
        }

        // Three triangles centered on the explosion, additive
        if (opts.LodExplosions >= 3 && alpha > 0) {
            for (let i = 0; i < 3; ++i) {
                const cx = (this.x >> 3) + (this.w >> 4);
                const cy = (this.y >> 3) + (this.h >> 4);
                const ia = Math.PI * (this.angle + this.timer / 255 + i * 0.66);
                const ix = cx + 370 * Math.cos(ia);
                const iy = cy + 370 * Math.sin(ia);
                const ja = ia + Math.PI / 64;
                const jx = cx + 370 * Math.cos(ja);
                const jy = cy + 370 * Math.sin(ja);
                GL.drawPolyAdditive(
                    [cx, cy, ix, iy, jx, jy],
                    1, 1, 1, alpha/32);
            }
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
