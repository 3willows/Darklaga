import { pos } from "player"
import { opts } from "./options"
import * as S from "./sprites"
import * as GL from "./webgl"
import * as Dan from "./dan"
import * as Shot from "shot"
import * as Hud from "./hud"
import * as Float from "./float"

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
    public lives : number = 2

    constructor(
        public baseHealth : number,
        public x : number,
        public y : number,
        // X- and Y-coordinate offset for collision
        private cdx : number,
        private cdy : number,
        // Width and height offsets for collision
        private cdw : number, 
        private cdh : number,
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

        if (this.shootable()) {
            if (Shot.collideEnemy(
                this.x + this.cdx, 
                this.y + this.cdy,
                this.cdw,
                this.cdh))
            {
                if (!this.suffering) {
                    this.hit = true;
                }
            }
        }

        if (++this.hitTimer >= 25) {
            this.hitPrev = this.hit;
            this.hit = false;
            this.hitTimer = 0;
        }

        if (this.hitPrev && !this.suffering && this.shootable()) {

            this.health -= 16;
            if (Hud.stuff().offense_overload > 0) 
                this.health -= 16;

            if (this.health <= 0)
                this.die();
        }

        if (this.suffering > 0) {
            --this.suffering;
        }
    }

    public die() {}

    public shootable() { return false; }

    // Rendered in the enemy layer.
    public render() {
        if (this.health < (1 << this.baseHealth) || this.lives < 2) {
            const healthx = 20;
            const healthy = 30;
            
            if (this.lives > 0) {
                const back = S.bossbartex[this.lives - 1];
                for (let x = 0; x < 198; x += back.w)
                    GL.drawSprite(back, healthx + 1 + x, healthy + 3);
            }

            const front = S.bossbartex[this.lives];
            const maxx = (this.health * 198) >> this.baseHealth;
            for (let x = 0; x < maxx; x += front.w) 
                GL.drawSprite(front, healthx + 1 + x, healthy + 3);
            
            GL.drawSprite(S.bossbar, healthx, healthy);
        }
    }

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

        if (this.suffering > 150) {
            const a = (300 - this.suffering) / 256;
            GL.drawRectAdditive(0, 20, 240, 280, a, a, a, 1);
        } else if (this.suffering > 0) {
            const a = this.suffering / 256;
            GL.drawRectAdditive(0, 20, 240, 280, a, a, a, 1);
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
            /* xy */ 960, -820, 
            /* collision offset */ -120, -120,
            /* collision box */ 
                S.halfboss[0].w << 3, 
                S.halfboss[0].h << 3,
            /* timer */ 45)
    }

    public shootable(): boolean {
        return this.stage > 0;
    }

    public die() {
        if (this.stage < 4) {
            ++this.stage;
            --this.lives;
            this.baseHealth = 
                (this.stage == 2 ? 12 : 14)
                + (opts.UseStrongerEnemies ? 1 : 0);
            this.health = 1 << this.baseHealth;
            this.suffering = 300;
            this.timer = this.mstimer1 = this.mstimer2 = 
                this.ctimer = this.stimer = this.srtimer1 = 
                this.srtimer2 = 0;
        }
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
                    Dan.fireAimed(this.x+18, this.y+18, 10, "hb4");
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
                    Dan.fireStandard(this.x+18, this.y+18, vx, vy, "hb4"); 
                }
            }

            if (this.rstimer2 < 256) {
                const rs2 = this.rstimer2 += 2;
                if (rs2 > 128 && rs2 % 8 == 0) {
                    const a = Math.PI * (rs2 - 128) / 128;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a));
                    Dan.fireStandard(this.x+18, this.y+18, vx, vy, "hb4"); 
                }
            }

            break;
        }
        case 2:
        {
            if (this.timer % (this.suffering ? 30 : 50) == 0) {
                Float.addExplosion(
                    Math.floor(this.x + Math.random() * 256 - 140),
                    Math.floor(this.y + Math.random() * 256 - 140));
            }

            if (this.suffering) break;

            const {x: px, y: py} = pos();

            const speed = 6;

            const dx = this.x - px + 60;
            const dy = this.y - py + 60;
            const n  = Math.sqrt(dx * dx + dy * dy);
            this.x -= Math.floor(dx / n * speed);
            this.y -= Math.floor(dy / n * speed);

            if (++this.srtimer1 > 80) {
                this.srtimer1 = 0;
                this.stimer = 40;
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
            
            // Normal fire
            if (this.stimer > 0) {
                if (--this.stimer == 0)
                    Dan.fireAimed(this.x+18, this.y+18, 20, "hb5");
            }

            // Rotating fire 
            if (++this.rstimer1 >= 20) {
                this.rstimer1 = 0;

                const x1 = - Math.floor(dx / n * 12);
                const y1 = - Math.floor(dy / n * 12);
                Dan.fireStandard(this.x+18, this.y+18, x1, y1, "hb4");
                Dan.fireStandard(this.x+18, this.y+18, y1, -x1, "hb4");
                Dan.fireStandard(this.x+18, this.y+18, -x1, -y1, "hb4");
                Dan.fireStandard(this.x+18, this.y+18, -y1, x1, "hb4");
            }
            break;
        }
        case 3:
        {
            if (this.timer % (this.suffering ? 10 : 20) == 0) {
                Float.addExplosion(
                    Math.floor(this.x + Math.random() * 256 - 140),
                    Math.floor(this.y + Math.random() * 256 - 140));
            }

            if (this.suffering) break;
            
            const {x: px, y: py} = pos();

            const period = this.timer % 128;
            if (period < 12) {
                this.ctimer = Math.floor(period/3);
            }
            
            if (period <= 64) {
                const tx = px + 32;
                const ty = 320 + ((2560 - py) >> 2);
        
                if (Math.abs(ty - this.y) >= 8) 
                    this.y += ty < this.y ? -8 : 8;
            
                if (Math.abs(tx - this.x) >= 8)
                    this.x += tx < this.x ? -8 : 8;
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

            if (period > 64 && period < 76) {
                this.ctimer = 3 - Math.floor((period - 64) / 3)
                console.log("%d", this.ctimer);
            }

            // Shoot when not moving
            if (period > 76) {
                
                if (this.timer % 8 == 0) {
                    Dan.fireAdn(this.x + 32, this.y + 76, "hb3",  255);
                    Dan.fireAdn(this.x + 32, this.y + 76, "hb3", -255);
                }

                if (this.timer % 3 == 0 && opts.UseStrongerEnemies) {
                    const a = Math.random() * Math.PI;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a)); 
                    Dan.fireStandard(this.x + 18, this.y + 18, vx, vy, "hb4");
                }

            }

            break;
        }
        }
    }

    public render() {
        super.render();
        const sprite = S.halfboss[3 - this.ctimer];
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