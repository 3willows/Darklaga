import { pos } from "player"
import { opts } from "./options"
import * as S from "./sprites"
import * as GL from "./webgl"
import * as Dan from "./dan"
import * as Shot from "shot"
import * as Hud from "./hud"
import * as Float from "./float"
import * as Snd from "./sound"
import * as Stats from "./stats"

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
    // The boss is in its dying phase
    public dead : boolean = false
    // The boss can be targeted by homing missiles
    public alive: boolean = true
    public self: BossBase[] = []

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

    public addCountdown(seconds: number) {
        if (this.countdown > 0)
            this.countdown += seconds * 60;
    }

    public step() {

        ++this.timer;
        
        if (this.alive = this.shootable()) {

            Shot.setTargets(this.self);
            if (this.self.length == 0) this.self.push(this);

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

            if (this.suffering == 0 && this.countdown > 0) {
                --this.countdown;
            }

        } else {
            this.self.length = 0;
        }

        if (++this.hitTimer >= 25) {
            this.hitPrev = this.hit;
            this.hit = false;
            this.hitTimer = 0;
        }

        if (this.hitPrev && !this.suffering && this.alive) {

            this.health -= 16;
            if (Hud.stuff().offense_overload > 0) 
                this.health -= 16;

            if (this.health <= 0)
                this.die();
        }

        if (this.suffering > 0) {
            --this.suffering;
        }

        if (this.suffering == 0 && this.dead)
            active = undefined;
    }

    public die() {
        Stats.countdown(this.countdown);
        this.dead = true;
    }

    public shootable() { return false; }

    // Rendered in the enemy layer.
    public render() {
        if (!this.dead && (this.health < (1 << this.baseHealth) || this.lives < 2)) {
            const healthx = 20;
            const healthy = 30;
            
            if (this.lives > 0) {
                const back = S.bossbartex[this.lives - 1];
                for (let x = 0; x < 198; x += back[S.w])
                    GL.drawSprite(back, healthx + 1 + x, healthy + 3);
            }

            const front = S.bossbartex[this.lives];
            const maxx = (this.health * 198) >> this.baseHealth;
            for (let x = 0; x < maxx; x += front[S.w]) 
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
            const bigx = 240 - (this.timer % S.warningbig[S.w]);
            GL.drawSpriteAdditive(S.warningbig, bigx - S.warningbig[S.w], 310 - dy, alpha);
            GL.drawSpriteAdditive(S.warningbig, bigx, 310 - dy, alpha);
            const smax = 240 - ((this.timer << 1) % S.warningsma[S.w]);
            GL.drawSpriteAdditive(S.warningsma, smax - S.warningsma[S.w], 350 - dy, alpha);
            GL.drawSpriteAdditive(S.warningsma, smax, 350 - dy, alpha);
        } else {
            if (this.countdown > 0) {
                const t = Stats.printTime(this.countdown * 1000 / 60);
                GL.drawText(t, S.font, S.texwhite, 20, 55, 1, 0);
            }
        }

        if (this.suffering > 150) {
            const a = (300 - this.suffering) / 256;
            GL.drawRectAdditive(0, 20, 240, 280, a, a, a, 1);
        } else if (this.suffering > 0) {
            const a = this.suffering / 256;
            GL.drawRectAdditive(0, 20, 240, 280, a, a, a, 1);
        }
    }

    // Shoot bullets if close to the player 
    protected proximityGun(px: number, py: number) {
        if (this.timer % 3 == 0) {
            if ((py - this.y) * (py - this.y) + (px - this.x) * (px - this.x) < 50000) {
                const a = Math.random() * Math.PI;
                const vx = Math.floor(10 * Math.cos(a));
                const vy = Math.floor(10 * Math.sin(a)); 
                Dan.fireCarrier(this.x, this.y, vx, vy, "v", "hb3");
            }
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
                S.halfboss[0][S.w] << 3, 
                S.halfboss[0][S.h] << 3,
            /* timer */ 45)
    }

    public shootable(): boolean {
        return this.stage > 0 && !this.dead;
    }

    public die() {
        this.suffering = 300;
        if (this.stage++ < 3) { 
            --this.lives;
            this.baseHealth = 
                (this.stage == 2 ? 12 : 14)
                + (opts.UseStrongerEnemies ? 1 : 0);
            this.health = 1 << this.baseHealth;
            this.mstimer1 = this.mstimer2 = 
                this.ctimer = this.stimer = this.srtimer1 = 
                this.srtimer2 = 0;
            this.timer = 76; // because of phase 3 animation
            this.addCountdown(this.stage == 2 ? 30 : 45);
        } else {
            Snd.bossboom1.play();
            super.die();
        }
    }

    public step() {
        super.step();
        switch (this.stage) {
        case 0: 
        {
            if (this.y < 410) {
                this.y += 4;
                this.warningTimer = Math.min(1 + this.warningTimer, S.warningback[S.h]);
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

            this.proximityGun(px, py);

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

            this.proximityGun(px, py);
            
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

            this.proximityGun(px, py);

            if (period > 64 && period < 76) {
                this.ctimer = 3 - Math.floor((period - 64) / 3)
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
        if (!this.dead || this.suffering > 150) {
            const sprite = S.halfboss[3 - this.ctimer];
            GL.drawSprite(sprite, (this.x >> 3) - 15, (this.y >> 3) - 15);        
        }
    }

    public renderTop(): void {
        if (this.dead) {
            const alpha = Math.min(
                this.suffering, 
                300 - this.suffering,
                128);

            GL.drawSpriteAdditive(
                S.bigball, 
                (this.x >> 3) - 70, 
                (this.y >> 3) - 70,
                alpha >> 2);
        }
        super.renderTop();
    }
}

class HalfBoss2 extends BossBase 
{
    private yy : number = -820

    constructor() {
        super(/* Health */ 13 + (opts.UseStrongerEnemies ? 1 : 0),
            /* xy */ 240, -820, 
            /* collision offset */ 
                3 * S.halfbossb[S.w], 
                5 * S.halfbossb[S.h],
            /* collision box */ 
                2 * S.halfbossb[S.w], 
                2 * S.halfbossb[S.h],
            /* timer */ 30)
        this.lives = 3;
    }

    private angle() {
        return this.timer * Math.PI / 128;
    }

    public shootable(): boolean {
        return this.stage > 0 && !this.dead;
    }

    public die() {
        this.suffering = 300;
        if (this.stage++ < 4) { 
            --this.lives;
            this.baseHealth = 14 + (opts.UseStrongerEnemies ? 1 : 0);
            this.health = 1 << this.baseHealth;
            this.addCountdown(this.stage == 4 ? 60 : 30);
        } else {
            Snd.bossboom2.play();
            super.die();
        }
    }

    public step() {
        super.step();
        const a = this.angle();

        this.x = (120 - S.halfbossb[S.w] / 2)
            + Math.floor(42 * Math.cos(a))
            + Math.floor(10 * Math.cos(a * 0.27)) << 3;
        this.y = this.yy + 
            (Math.floor(12 * Math.sin(a * 0.63)) << 3);

        if (this.dead) {
            this.timer++;
            if (this.suffering < 200) {
                this.yy -= 8;
            }
            if (this.suffering-- == 0) {
                active = undefined;
            }
        }

        switch (this.stage) {
        case 0: 
        {
            if (this.yy < 600) {
                this.yy += 4;
                this.warningTimer = Math.min(1 + this.warningTimer, S.warningback[S.h]);
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
            
            this.proximityGun(px, py);

            if ((this.timer % 158) < 128 && (this.timer % 158) % 6 == 0) {
                Dan.fireAdn(this.x + 256, this.y + 256, "hb4",  255);
                Dan.fireAdn(this.x + 256, this.y + 256, "hb4", -255);
            }

            break;
        }
        case 2: 
        {
            if (this.timer % (this.suffering ? 20 : 30) == 0) {
                Float.addExplosion(
                    Math.floor(this.x + Math.random() * 256 - 140),
                    Math.floor(this.y + Math.random() * 256 - 140));
            }

            if (this.suffering > 30) {
                this.timer++;
            }

            if (this.suffering) break;

            const {x: px, y: py} = pos();

            this.proximityGun(px, py);

            if ((this.timer % 100) == 0 || (this.timer % 100) == 8) {
                Dan.fireAroundSeek(
                    this.x + 256, 
                    this.y + 256,
                    "hb5");
            }

            if (this.hitPrev && (this.timer % 6) == 0) {
                Dan.fireAdn(this.x + 256, this.y + 256, "hb4",  255);
                Dan.fireAdn(this.x + 256, this.y + 256, "hb4", -255);
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

            if (this.suffering > 30) {
                this.timer++;
            }
            
            if (this.suffering) break;

            if ((this.timer % 200) == 0) {
                for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4)
                    Dan.fireMissile(this.x + 256, this.y + 256, a, "hb5");
            }

            if ((this.timer % 158) == 0) {
                for (let a = 0; a < Math.PI; a += Math.PI / 4)
                    Dan.fireWorks(this.x + 256, this.y + 256, 
                        Math.floor(8 * Math.cos(a)),
                        Math.floor(8 * Math.sin(a)),
                        "hb3", "hb4");
            }
            break;
        }
        case 4: 
        {
            if (this.timer % (this.suffering ? 5 : 10) == 0) {
                Float.addExplosion(
                    Math.floor(this.x + Math.random() * 256 - 140),
                    Math.floor(this.y + Math.random() * 256 - 140));
            }

            if (this.suffering > 30) {
                this.timer += 2;
            }

            if (this.suffering) break;
            if (this.timer % 3 != 0) break;

            const cx = this.x + 256;
            const cy = this.y + 256;

            const {y: py} = pos();

            if (py < cy) {
                Dan.fireCarrier(cx, cy, -10, 0, "v", "hb3");
            }

            Dan.fireStandard(cx, cy + 64, 0, 64, "hbv");
            Dan.fireStandard(cx - 32, cy + 48, -32, 48, "hbl");
            Dan.fireStandard(cx + 32, cy + 48, 32, 48, "hbr");

            if ((this.timer % 128) < 50 && (this.timer % 128) % 10 == 0) {
                const a = Math.random() * Math.PI;
                Dan.fireWorks(this.x + 256, this.y + 256, 
                    Math.floor(8 * Math.cos(a)),
                    Math.floor(8 * Math.sin(a)),
                    "hb3", "hb4");
            }

            break;
        }
        }
    }

    public render() {
        
        const dying = this.dead 
            ? Math.min(40, (300 - this.suffering)) 
            : 0;

        const a = this.angle();
        for (let i = 9; i >= 0; --i) {
            const aa = a + i * Math.PI / 8;
            const x = 120 - S.halfbossb[S.w] / 2 
                + Math.floor((42 - 2 * i) * Math.cos(aa))
                + Math.floor(10 * Math.cos(aa * 0.27))
                + Math.floor(dying * Math.cos(aa * 0.73))
            const y = (this.yy >> 3) - 8 * i + Math.floor((12 - i) * Math.sin(aa * 0.63));
            GL.drawSprite(S.halfbossb, x, y);
        }

        super.render();
    }
}

class Boss2 extends BossBase 
{
    constructor(cd: number) {
        super(/* Health */ 14 + (opts.UseStrongerEnemies ? 1 : 0),
            /* xy */ 860, 860, 
            /* collision offset */ 
                64, 
                64,
            /* collision box */ 
                144, 
                256,
            cd / 60 + 90);
        this.lives = 1;
        this.stage = 1;
    }

    private angle() {
        return this.timer * Math.PI / 128;
    }

    public shootable(): boolean {
        return this.stage == 2 || this.stage == 4;
    }

    public die() {
        
        if (this.stage == 2) {
            Snd.disrupt.play();
            Hud.disarm();
        }

        this.stage = 3; 
    }

    public step() {

        super.step();

        switch (this.stage) {
        case 1:
        {
            if (this.timer > 96) { this.stage = 2; }
            break;
        }
        case 2: 
        case 4: 
        {
            const {x:px, y:py} = pos();
            const tx = 1200 - (px >> 2) - 96;
            const ty = 320 + ((2560 - py) >> 2);

            if (tx - this.x > 4) {
                this.x += 4;
            } else if (this.x - tx > 4) {
                this.x -= 4;
            } else if (ty - this.y > 4) {
                this.y += 4;
            } else if (this.y - ty > 4) {
                this.y -= 4;
            }

            if (this.stage == 4) {
                Hud.increaseFury();
                if (this.timer % 10 == 0) {
                    const angle = Math.random() * 2 * Math.PI;
                    Dan.fireBossMissile(this.x + 96, this.y + 96, angle, "bs3");
                }
            }

            if (this.timer % 3 == 0) {
                const angle = (this.timer >> 4) + (Math.random() * 0.25) * Math.PI;
                const vx = Math.round(8 * Math.cos(angle));
                const vy = Math.round(8 * Math.sin(angle));
                Dan.fireSeek(this.x + 96, this.y + 96, vx, vy, 9, "bs1");
            }

            break;
        }
        case 3:
        {
            const max = 1 << this.baseHealth;
            this.health += 64;
            if (this.health > max) {
                this.health = max;
                this.stage = 4;
            }
            break;
        }
        }
    }

    public render() {
        
        const draw = (s: Float32Array, x: number, y: number) => {
            if (this.stage == 3) {
                GL.drawSpriteAdditive(s, x, y, 32);
                GL.drawSpriteAdditive(s, x, y, 16);
            } else {
                GL.drawSprite(s, x, y);
            }
        }

        draw(S.bossbody, (this.x >> 3), this.y >> 3);

        const w = 80;
        const a = this.angle();
        for (let i = 0; i < 12; ++i) {
            const d = 96 + Math.floor(w * ((i + 1) / 12) * Math.cos(a + i / 5));
            const xr = this.x + 96 + d;
            const xl = this.x + 96 - d;
            const y = this.y + 140 + 32*i;
            draw(i == 11 ? S.bossrtene : S.bossrten, xr >> 3, y >> 3);
            draw(i == 11 ? S.bossltene : S.bosslten, xl >> 3, y >> 3);
        }

        super.render();
    }

    public renderTop(): void {
        super.renderTop();
        if (this.stage > 0) return;

        const alpha = Math.max(0, 32 - (this.timer >> 2));
        GL.drawRectAdditive(0, 0, 240, 320, 1, 1, 1, alpha/32);
    }
}

class Boss1 extends BossBase
{
    private s1accrue : number = 0
    private s1time : number = 0

    private s2windup : number = 0

    private s3wave1 : number = 256
    private s3wave2 : number = 0

    private s4tick : number = 0

    constructor() {
        super(/* Health */ 14 + (opts.UseStrongerEnemies ? 1 : 0),
            /* xy */ 860, -1638, 
            /* collision offset */ 
                64, 
                64,
            /* collision box */ 
                144, 
                256,
            /* timer */ 45)
        this.lives = 3;
    }

    private angle() {
        return this.timer * Math.PI / 128;
    }
    
    public shootable(): boolean {
        return this.stage > 0 && this.stage < 5;
    }

    public die() {
        this.suffering = 300;
        if (this.stage++ < 4) { 
            --this.lives;
            this.baseHealth = 14 + (opts.UseStrongerEnemies ? 1 : 0);
            this.health = 1 << this.baseHealth;
            this.addCountdown(45);
        } else {
            Snd.bossboom1.play();
            Hud.makeInvulnerable(10);
        }
    }

    public step() {
        super.step();

        const rx = 960 - (S.bosshead[S.w] << 2);
        this.x = rx + Math.floor(120 * Math.cos(this.angle()));

        if (this.suffering) {
            this.timer++; 
            return;
        }

        switch (this.stage) {
        case 0: 
        {
            if (this.y < 410) {
                this.y += 4;
                this.warningTimer = Math.min(1 + this.warningTimer, S.warningback[S.h]);
            } else if (this.warningTimer > 0) {
                --this.warningTimer;
            } else {
                this.stage = 1;
            }
            break;
        }
        case 1: 
        {
            if (--this.s1time <= 0) {
                if (this.s1accrue < 9) ++this.s1accrue;
                this.s1time = 50 * this.s1accrue;

                const {x: px, y: py} = pos();
                         
                let dx = px - this.x - 96;
                let dy = py - this.y - 64;
                const norm = Math.sqrt(dx * dx + dy * dy);
                dx = Math.round(dx / norm * 10);
                dy = Math.round(dy / norm * 10);

                Dan.fireFork(this.x + 96, this.y + 64, dx, dy, "b1v", this.s1accrue - 1);
            }
            break;
        }
        case 2:
        {
            if (++this.s2windup > 160) this.s2windup = 0;
            const early = this.s2windup < 128;
            if ((this.s2windup % (early ? 16 : 4) == 0)) {
                const x = this.x + 64;
                const y = this.y + 96;
                const dx = Math.random() > 0.5 ? 16 : -16;
                const dy = Math.floor(Math.random() * 32);

                if (early) 
                    Dan.fireDiagonal(x, y, dx, dy - 8, "bs3");
                else
                    Dan.fireHorizontal(x, y, dx, dy/2 + 8, "bs1");
            }

            break;
        }
        case 3: 
        {
            if (this.y < 1000) this.y += 2;

            const cx = this.x + 96;
            const cy = this.y + 96;

            if (this.s3wave1 > 0) {
                const s3wave1 = this.s3wave1 -= 3;
                if (s3wave1 % 8 == 0) {
                    const a = Math.PI * s3wave1 / 256;
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a));
                    Dan.fireStandard(cx, cy, vx, vy, "bs1")
                }
                if (s3wave1 <= 0) this.s3wave2 = 256; 
            }

            if (this.s3wave2 > 0) {
                const s3wave2 = this.s3wave2 -= 4;
                if (s3wave2 % 16 == 0) {
                    const a = Math.PI * (1 - s3wave2 / 256);
                    const vx = Math.floor(10 * Math.cos(a));
                    const vy = Math.floor(10 * Math.sin(a));
                    Dan.fireStandard(cx, cy, vx, vy, "bs1")
                }
                if (s3wave2 <= 0) { this.s3wave1 = 256; }
            }

            const t = this.timer % 64;
            if (t <= 24 && t % 8 == 0) {
                Dan.fireMissile(cx, cy, (5 * t) / 256 * Math.PI, "bs2", 25);
                Dan.fireMissile(cx, cy, (256 - 5 * t) / 256 * Math.PI, "bs2", 25);
            }

            break;
        }
        case 4:
        {
            ++this.s4tick;

            if (this.s4tick % 30 == 0)
            {
                const cx = this.x + 96;
                const cy = this.y + 96;
                const d = this.s4tick % 60 == 0 ? 1 : -1;
                const a = 512 + this.timer;
                for (let i = 0; i < 32; i += 8) {
                    Dan.fireSpiral(cx, cy, a + i, d, "bs2");
                    Dan.fireSpiral(cx, cy, a + 64 + i, d, "bs2");
                    Dan.fireSpiral(cx, cy, a + 128 + i, d, "bs2");
                    Dan.fireSpiral(cx, cy, a + 192 + i, d, "bs2");
                }
            }
            break;
        }
        case 5: 
        {
            active = new Boss2(this.countdown);
            break;
        }
        }
    }

    public render() {
        super.render();

        const rx = 960 - (S.bosshead[S.w] << 2) + 32;
        const w = 120;
        const a = this.angle();
        for (let i = 0; i < 6; ++i) {
            const x = rx + Math.floor(w * (i / 6) * Math.cos(a + (i - 6) / 10));
            const y = this.y + 870 - 80*i;
            GL.drawSprite(S.bosstail, x >> 3, y >> 3);
            GL.drawSpriteAlpha(S.bosstaild, x >> 3, y >> 3, (5 - i) * 6);
        }

        const hx = rx + Math.floor(w * Math.cos(a));
        GL.drawSprite(S.bosshead, (hx >> 3) - 4, this.y >> 3); 
    }

    public renderTop(): void {
        super.renderTop();
        if (this.stage < 5) return;

        const alpha = Math.min(32, (300 - this.suffering) >> 3);
        GL.drawRectAdditive(0, 0, 240, 320, 1, 1, 1, alpha/32);
    }
}

let active : BossBase|undefined = undefined;

export function step() {
    if (active) active.step();
}

export function render() {
    if (active) active.render();
}

export function renderTop() {
    if (active) active.renderTop();
}

export function start(n: number) {
    active = n == 0 ? new HalfBoss1() : 
             n == 1 ? new HalfBoss2() : new Boss1();
}

export function over() {
    return !active;
}

export function reset() {
    active = undefined;
} 