import { pos } from "player"
import { opts } from "./options"
import * as S from "./sprites"
import * as GL from "./webgl"
import * as Dan from "./dan"

class BossBase {

    public healthGhost : number
    public health : number
    public hit : boolean = false
    public hitPrev : boolean = false
    public hitTimer : number = 0
    public suffering : number = 0
    public countdown : number = 0
    public stage : number = 0
    public warningTimer : number = 0
    public timer : number = 0

    constructor(
        public baseHealth : number,
        public x : number,
        public y : number,
        seconds: number) 
    {
        this.health = this.healthGhost = 1 << this.baseHealth;
        this.countdown = seconds * 60;
    }    

    public step() {

        ++this.timer;

        if (this.suffering > 0) {
            if (this.suffering != 150) this.suffering--;
        }

    }

    // Rendered in the enemy layer.
    public render() {}

    // Rendered on top of everything else but the HUD. 
    public renderTop() {
        if (this.stage == 0) {
            const dy = this.warningTimer >> 1;
            GL.drawSpriteAdditive(S.warningback, 0, 300 - dy, 32);
            const alpha = ((this.timer >> 1)&15)+17;
            const bigx = 240 - (this.timer % S.warningbig.w);
            GL.drawSpriteAdditive(S.warningbig, bigx - S.warningbig.w, 310 - dy, alpha);
            GL.drawSpriteAdditive(S.warningbig, bigx, 310 - dy, alpha);
            const smax = 240 - ((this.timer << 1) % S.warningsma.w);
            GL.drawSpriteAdditive(S.warningsma, smax - S.warningsma.w, 350 - dy, alpha);
            GL.drawSpriteAdditive(S.warningsma, smax, 350 - dy, alpha);
        } 
    }
}

class HalfBoss1 extends BossBase {

    // 'close' animation timer
    private ctimer = 0;

    // shooting-reload timer 1 
    private srtimer1 = 0;

    // shooting-reload timer 2
    private srtimer2 = 0;

    // main shooting timer
    private stimer = 0;

    // missile shooting timers
    private mstimer1 = 0;
    private mstimer2 = 0;

    // rotating shots timers
    private rstimer1 = 0;
    private rstimer2 = 0;

    constructor() {
        super(/* Health */ 14 + (opts.UseStrongerEnemies ? 1 : 0),
            960, -820, 
            /* timer */ 45)
    }

    public step() {
        super.step();
        switch (this.stage) {
        case 0: 
        {
            if (this.y < 410) {
                this.y += 4;
                this.warningTimer = Math.min(1 + this.warningTimer, S.warningback.h);
            } else if (this.warningTimer > 0) {
                --this.warningTimer;
            } else {
                this.stage = 1;
            }
            break;
        }
        case 1:
        {
            const {x: px, y: py} = pos();
            const tx = this.srtimer2 >= 480 ? px : 1920 - px;
            const ty = 320 + ((2560 - py) >> 2);

            if (Math.abs(ty - this.y) >= 4) 
                this.y += ty < this.y ? -4 : 4;
            
            if (Math.abs(tx - this.x) >= 4)
                this.x += tx < this.x ? -4 : 4;

            if (++this.srtimer1 > 90) {
                this.srtimer1 = 0;
                this.stimer += 45;
            }

            if (++this.srtimer2 >= 960) {
                this.srtimer2 = 0;
                this.stimer += 360;
            }

            // Proximity gun
            if (this.timer % 3 == 0) {
                if ((py - this.y) * (py - this.y) + (px - this.x) * (px - this.x) < 50000) {
                    const a = Math.random() * Math.PI;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a)); 
                    Dan.fireCarrier(this.x, this.y, vx, vy, "v", "hb3");
                }
            }

            // Shooting missiles
            let missiles = false;
            if (++this.mstimer1 >= 1920) {
                this.mstimer1 = 960;
                missiles = true;
            }
            if (++this.mstimer2 >= 2840) {
                this.mstimer2 = 1900;
                missiles = true;
            }
            if (missiles) {
                for (let a = 0; a < 2 * Math.PI; a += Math.PI / 8) {
                    const vx = Math.floor(50 * Math.cos(a));
                    const vy = Math.floor(50 * Math.sin(a)); 
                    Dan.fireCarrier(this.x, this.y, vx, vy, "d", "hb3");
                }
            }
           
            // Normal fire
            if (this.stimer > 0) {
                this.stimer--;
                if (this.timer % 16 == 1) 
                    Dan.fireAimed(this.x, this.y, 10, "hb4");
            }

            // Rotating shots
            if (this.timer % 320 == 0) {
                this.rstimer1 = 128;
                this.rstimer2 = 0;
            }

            if (this.rstimer1 > 0) {
                const rs1 = this.rstimer1 -= 2;
                if (rs1 % 16 == 0) {
                    const a = Math.PI * rs1 / 128;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a));
                    Dan.fireStandard(this.x, this.y, vx, vy, "hb4"); 
                }
            }

            if (this.rstimer2 < 256) {
                const rs2 = this.rstimer2 += 2;
                if (rs2 > 128 && rs2 % 8 == 0) {
                    const a = Math.PI * (rs2 - 128) / 128;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a));
                    Dan.fireStandard(this.x, this.y, vx, vy, "hb4"); 
                }
            }

            break;
        }
        }
    }

    public render() {
        const sprite = S.halfboss[3 - (this.ctimer >> 2)];
        GL.drawSprite(sprite, (this.x >> 3) - 15, (this.y >> 3) - 15);
    }
}

let active : BossBase|undefined = new HalfBoss1();

export function step() {
    if (active) active.step();
}

export function render() {
    if (active) active.render();
}

export function renderTop() {
    if (active) active.renderTop();
}

export function over() {
    return !active;
}