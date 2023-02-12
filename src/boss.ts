import { opts } from "./options"
import * as S from "./sprites"
import * as GL from "./webgl"

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
        }
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