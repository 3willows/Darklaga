import { Enemy, Mode } from "./enemy"
import * as S from "./sprites"
import * as Player from "./player"
import * as Dan from "./dan"
import { opts } from "options"

// Given a ship sprite-set 01234, oscillates 23432101 ;
// given 012, oscillates 1210
function twoSide(s: S.Sprite[]): S.Sprite[] {
    if (s.length == 5)
        return [s[2], s[3], s[4], s[3], s[2], s[1], s[0], s[1]];
    return [s[1], s[2], s[1], s[0]];
}

const estatic = {
    n: twoSide(S.estaticn),
    d: twoSide(S.estaticd),
    v: twoSide(S.estaticv)
}

// Static enemy, moves down slowly
export class Static extends Enemy {

    // Initial X-position
    public readonly ix : number
    
    // Variant, 1 2 or 3
    public readonly variant: number

    // Angle, increases from 0 to 256 in variant=2
    public angle : number

    // Shot timer
    public stimer : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */ mode == "n" ? (params[0] < 3 ? 9 : 8) :
                         mode == "d" ? (params[0] < 3 ? 10 : 8) : 
                                       (params[0] < 2 ? 11 : 9),
            mode,
            estatic[mode],
            mode == "n" ? S.estaticnh :
            mode == "d" ? S.estaticdh : S.estaticvh);

        this.ix = x;
        this.variant = params[0];
        this.angle = 0;
        this.stimer = 75;
    }

    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        switch (this.variant) {
            case 1: 
                this.y += 4;
                break;
            case 2: 
                // Sinusoidal movement
                this.angle++;
                this.y += this.mode == "v" ? 16 : 8;
                if (this.y < 20) { this.angle = 0 }
                if (this.angle > 256) { this.angle = 256 }
                const angle = this.angle * Math.PI / 128 * 
                    (this.mode == "n" ? 0.5 : 
                     this.mode == "d" ? 1 : 2);
                this.x = 920 - (this.ix - 940) * Math.cos(angle);
                break;
            case 3: 
                this.y += 4;
                if (this.stimer-- < 0) {
                    this.stimer = 50;
                    const sprite = "b1" + this.mode;
                    Dan.fireStandard(this.cx(), this.cy(), -16, 0, sprite);
                    Dan.fireStandard(this.cx(), this.cy(), +16, 0, sprite);
                }
                break;
        }
     
        if (this.y >= 2560) return null;

        return this;
    }
}

const sniper = {
    n: twoSide(S.esnipern),
    d: twoSide(S.esniperd),
    v: twoSide(S.esniperv)
}

// Moves to firing position, shoots, then moves down
export class Sniper extends Enemy {

    public readonly variant : number

    // Horizontal speed for variant 2
    public dx: number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */mode == "n" ? 8 : 
                        mode == "d" ? 10 : 11,
            mode,
            sniper[mode],
            mode == "n" ? S.esnipernh :
            mode == "d" ? S.esniperdh : S.esnipervh);

        this.variant = params[0];
        this.dx = x < 0 ? 1 : -1;
    }

    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        const freq = this.mode == "v" ? 50 : 100; 
        const bs = this.mode == "v" ? 32 : 16;

        switch (this.variant) {
            case 1: 
            
                const target = this.mode == "v" ? 480 : 960;

                if (this.y <= 0) this.timer = 0;
                if (this.timer >= 256 || this.y <= target) this.y += 8;
                if (this.y > target && (this.timer % freq) == 0) 
                    Dan.fireStandard(this.cx(), this.cy(), 0, bs, "b4" + this.mode);
                
                break;
            case 2: 

                const speed = this.mode == "v" ? 8 : 4;
                
                this.x += this.dx * speed;
                
                if (this.x <= 10) this.dx = 1;
                else if (this.x >= 1714) this.dx = -1;
                else if (0 == (this.timer % freq)) {
                    Dan.fireStandard(this.cx(), this.cy(), 0, bs, "b4" + this.mode);                
                }

                break;
            case 3: 

                if (this.y <= (this.mode == "n" ? 960 : 256)) { this.y += 8; }
                else if (0 == (this.timer % (this.mode == "d" ? 100 : 75))) {
                    
                    const cx = this.cx();
                    const cy = this.cy();

                    if (this.mode == "n") {
                        Dan.fireStandard(cx, cy,  0,  8, "b5n");
                        Dan.fireStandard(cx, cy,  6,  6, "b5n");
                        Dan.fireStandard(cx, cy, -6,  6, "b5n");
                    } else if (this.mode == "d") {
                        Dan.fireBelowArc2Seek(cx, cy, "b5d");
                    } else {
                        Dan.fireBelowArcBig(cx, cy, "b5v");
                    }
                }
                

                break;
        }
     
        if (this.y >= 2560) return null;

        return this;
    }
}

const flyby = {
    n: twoSide(S.eflybyn),
    d: twoSide(S.eflybyd),
    v: twoSide(S.eflybyv)
}

export class Flyby extends Enemy {

    // Rotation angular speed
    private readonly dir : number

    // Rotation center
    private readonly px : number
    private readonly py : number

    // True if this is variant 1
    private readonly isVar1 : boolean
    
    // Duration before rotation phase
    private readonly t1 : number 

    // Speed before rotation phase
    private readonly v1 : number

    // Duration of rotation phase
    private readonly t2 : number

    // VX after rotation phase
    private readonly v3 : number

    // Fire rate (after rotation phase starts)
    private readonly fr : number

    // Angle during rotation phase
    private angle : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */mode == "n" ? 8 : 
                        mode == "d" ? 9 : 10,
            mode, 
            flyby[mode],
            mode == "n" ? S.eflybynh : 
            mode == "d" ? S.eflybydh : S.eflybyvh);

        const m = mode == "v" ? 2 : 1;

        if (x < 880) {
            this.dir = - Math.PI / 128;
            this.px = x + 320;
            this.angle = Math.PI;
        } else {
            this.dir = Math.PI / 128;   
            this.px = x - 320;
            this.angle = 0;
        }

        const isVar1 = this.isVar1 = params[0] == 1;

        if (!isVar1 || mode == "v") this.dir *= 2;

        this.py = isVar1 ? y + 1600 : 1600;
        this.t1 = isVar1 ? 200/m : 100;
        this.v1 = isVar1 ? 8 * m : 16;
        this.t2 = isVar1 ? (mode == "v" ? 1120 : 1220) : 163;
        this.v3 = isVar1 ? m * 32 : -16;
        this.fr = isVar1 ? 20/m : (mode == "v" ? 50 : 20); 
    }

    public step(px: number, py: number) : Enemy|null {
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.timer <= this.t1) {        
            if (!this.isVar1 && this.y < 0) 
                this.timer = 0;
            this.y += this.v1; 
        } else if (this.timer <= this.t2) {
            this.angle += this.dir;
            this.x = this.px + Math.floor(320 * Math.cos(this.angle));
            this.y = this.py + Math.floor(320 * Math.sin(this.angle));
            if (0 == (this.timer % this.fr)) {
                const a = Math.random() * 2 * Math.PI;
                if (this.mode == "n") 
                    Dan.fireStandard(
                        this.cx(), this.cy(), 
                        Math.floor(20 * Math.cos(a)),
                        Math.floor(20 * Math.sin(a)),
                        "b3n");
                else if (this.mode == "d")
                    Dan.fireSeek(
                        this.cx(), this.cy(), 
                        Math.floor(4 * Math.cos(a)),
                        Math.floor(4 * Math.sin(a)),
                        6, "b3d");
                else
                    Dan.fireMissile(
                        this.cx(), this.cy(), a, "b3v");
            }
        } else {
            this.y += this.v3;
            if (this.y >= 2560 || this.y <= -240) return null;
        }

        return this;
    }
}

// Formerly "Flyby" version 3, now uses "Static" image
export class Tank extends Enemy {

    // Shoot whenever health goes under this threshold
    private threshold : number

    // Speed multiplier
    private readonly m : number
    
    // Health regeneration if wounded
    private readonly regen : number

    // Threshold regen if wounded
    private readonly tregen : number

    constructor(x: number, y: number, mode: Mode) {
        super(x, y, 
            /* health */ mode == "v" ? 11 : 10,
            mode, 
            estatic[mode],
            mode == "n" ? S.estaticnh : 
            mode == "d" ? S.estaticdh : S.estaticvh);

        this.threshold = this.basehealth;
        this.m = mode == "n" ? 1 : 2;

        this.regen = mode == "v" ? 2 : 1;
        this.tregen = mode == "n" ? 0 : this.regen;
    }

    public step(px: number, py: number) : Enemy|null {
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.timer * this.m <= 200)
            this.y += this.m * 8;
        
        if (this.threshold > this.health) {
            this.threshold = this.health;
            const a = Math.random() * 2 * Math.PI;
            if (this.mode == "n") 
                Dan.fireStandard(
                    this.cx(), this.cy(), 
                    Math.floor(20 * Math.cos(a)),
                    Math.floor(20 * Math.sin(a)),
                    "b3n");
            else if (this.mode == "d")
                Dan.fireSeek(
                    this.cx(), this.cy(), 
                    Math.floor(4 * Math.cos(a)),
                    Math.floor(4 * Math.sin(a)),
                    6, "b3d");
            else
                Dan.fireMissile(
                    this.cx(), this.cy(), a, "b3v");
        }

        if (this.health < this.basehealth) {
            this.health += this.regen;
            this.threshold += this.tregen;
        }

        return this;
    }
}

const group = {
    n: twoSide(S.egroupn),
    d: twoSide(S.egroupd),
    v: twoSide(S.egroupv)
}

// Spreads 3 or 5 copies of itself
export class Group extends Enemy {

    private spread: number
    private copy: number

    private readonly initx : number
    private readonly copies: number
    private readonly speed: number
    private readonly rf : number
    
    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y - 800, 
            /* health */mode == "v" ? 13 : 11,
            mode, 
            group[mode],
            mode == "n" ? S.egroupnh : 
            mode == "d" ? S.egroupdh : S.egroupvh);

        this.initx = x;
        this.spread = 0;
        this.copy = 0;
        this.speed = mode == "v" ? 2 : 1;
        this.copies = mode == "v" ? 5 : 3;
        this.rf = mode == "v" ? 49 : 
                  mode == "n" ? 29 : 74;
    }

    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.timer * this.speed < 100) {
            // Descend mode
            this.y += this.speed * 8;
        } else if (this.timer < 1384) {
            // Spread and fire mode.
            if (this.spread < 128) {
                ++this.spread;
            } else {
                if (0 == (this.timer % this.rf)) {
                    const a = Math.random() * 2 * Math.PI;
                    if (this.mode == "n") 
                        Dan.fireStandard(
                            this.cx(), this.cy(), 
                            Math.floor(20 * Math.cos(a)),
                            16,
                            "b5n");
                    else if (this.mode == "d")
                        Dan.fireSeek(
                            this.cx(), this.cy(), 
                            Math.floor(4 * Math.cos(a)),
                            4,
                            6, "b5d");
                    else
                        Dan.fireWorks(
                            this.cx(), this.cy(), 
                            Math.floor(4 * Math.cos(a)),
                            4,
                            "b5v", "b3v");
                }
            }
        } else {
            // Contract and leave mode
            if (this.spread > 0) {
                --this.spread;
            } else {
                this.y += this.speed * 8;
                if (this.y >= 2560) return null;
            }
        }

        this.copy = (this.copy + 1)%this.copies;
        this.x = this.initx + 
            (((this.copy - Math.floor(this.copies/2)) 
                * 300
                * this.spread) >> 7);
                
        return this;
    }
}

// Shoots in a spiral, previously 'Group2'
export class Spiral extends Enemy {

    private readonly t1 : number
    private readonly vy : number;

    private stimer : number
    private firing : number

    private readonly va : number;
    private readonly fm : number;
    private readonly fe : number;

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */mode == "v" ? 14 : 11,
            mode, 
            group[mode],
            mode == "n" ? S.egroupnh : 
            mode == "d" ? S.egroupdh : S.egroupvh);

        this.t1 = mode == "v" ? 100 : 200;
        this.vy = mode == "v" ? 16 : 8;
        this.stimer = 0;
        this.firing = 0;
        this.va = mode == "n" ? Math.PI / 8 : 
                  mode == "d" ? Math.PI / 2 : Math.PI / 4; 
        this.fm = mode == "n" ? 16 : 
                  mode == "d" ? 16 : 8;
        this.fe = mode == "n" ? 32 : 
                  mode == "d" ? 2000 : 65;
    }
 
    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.timer < this.t1) {
            this.y += this.vy; 
        } else if (this.timer < this.t1 + 1000) {
            if (this.stimer-- <= 0) {
                ++this.firing;
                if ((this.firing % this.fm) == 0) {
                    for (let a = 0; a < 2 * Math.PI; a += this.va) {
                        const angle = a + this.firing * Math.PI / 128;
                        const dx = Math.floor(8 * Math.cos(angle));
                        const dy = Math.floor(8 * Math.sin(angle));
                        if (this.mode == "n") {
                            Dan.fireStandard(this.cx(), this.cy(), 
                                dx, dy, "b3n")    
                        } else if (this.mode == "d") {
                            Dan.fireStandard(this.cx(), this.cy(), 
                                dx, dy, "b3d")    
                        } else {
                            Dan.fireMissile(this.cx(), this.cy(), 
                                angle, "b3v")
                        }
                    }
                }
                if (this.firing == this.fe) {
                    this.firing = 0;
                    this.stimer = 50;
                }
            }
        } else {
            if ((this.y += this.vy) >= 2560) return null;
        }

        return this;
    }
}

const carrier = {
    n: twoSide(S.ecarriern),
    d: twoSide(S.ecarrierd),
    v: twoSide(S.ecarrierv)
}

// Fires seeking missiles
export class Carrier extends Enemy {

    public readonly variant : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */mode == "n" ? 10 : 11,
            mode, 
            carrier[mode],
            mode == "n" ? S.ecarriernh : 
            mode == "d" ? S.ecarrierdh : S.ecarriervh);
        
        this.variant = params[0];
        if (this.variant == 2) this.alpha = 0;
    }

    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        let ready = false;
        let freq = this.mode == "n" ? 100 : 
                   this.mode == "d" ? 75 : 50;
        if (this.variant == 1) {
            if (this.y <= 960) { this.y += 8; }
            else ready = true;
        } else {
            if (this.alpha < 33) { this.alpha++; }
            else ready = true;   
        }

        if (!ready) return this;

        if (this.timer > 64 && (this.timer % freq) == 0) {
            Dan.fireCarrier6(this.cx(), this.cy(), this.mode, "b1v");
        }
        
        return this;
    }
}

const bounce = {
    n: twoSide(S.ebouncen),
    d: twoSide(S.ebounced),
    v: twoSide(S.ebouncev)
}

// Bounces around the border of the screen
export class Bounce extends Enemy {

    public readonly variant : number
    public vx : number
    public vy : number
    public stimer : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */mode == "n" ? 8 : 
                        mode == "d" ? 9 : 10,
            mode,
            bounce[mode],
            mode == "n" ? S.ebouncenh :
            mode == "d" ? S.ebouncedh : S.ebouncevh);

        this.variant = params[0];
        this.stimer = 0;
        const speed = mode == "v" ? 16 : 8;
        this.vx = (x >= 960) ? -speed : speed;
        this.vy = speed;
    }
    
    public step(px: number, py: number): Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.y > 0) this.x += this.vx;
        this.y += this.vy;

        const m = this.mode;
        function pick(base: number, rand: number) {
            return Math.floor(Math.random()*rand) + base + (m == "v" ? 8 : 0)
        }

        switch (this.variant) {
            case 1: 
                if (this.y <= 220) this.vy = pick(8,0);
                if (this.y >= 2144) this.vy = -pick(8,0);
                if (this.x <= 60) this.vx = pick(8,0);
                if (this.x >= 1664) this.vx = -pick(8,0);
                if (this.y > 0 && this.stimer-- <= 0) {
                    this.stimer = m == "n" ? 25 : 20;
                    Dan.fireStandard(this.cx(), this.cy(), 0, 16, "b4" + m);
                }
                break;
            case 2: 
                if (this.y <= 220) this.vy = pick(8,0);
                if (this.y >= 2144) this.vy = -pick(8,0);
                if (this.x <= 60) this.vx = pick(8,0);
                if (this.x >= 1664) this.vx = -pick(8,0);
                break;
            case 3: 
                if (this.y <= 220) this.vy = pick(0,8);
                if (this.y >= 2144) this.vy = -pick(0,8);
                if (this.x <= 60) this.vx = pick(0,8);
                if (this.x >= 1664) this.vx = -pick(0,8);
                break;
            case 4: 
                if (this.y <= 220) this.vy = pick(8,0);
                if (this.y >= 2144) this.vy = -pick(8,0);
                if (this.x <= 60) this.vx = pick(8,0);
                if (this.x >= 1664) this.vx = -pick(8,0);
                if (Math.random() < 0.016) this.vx = -this.vx;
                if (Math.random() < 0.016) this.vy = -this.vy;
                break;
        }
     
        if (this.y >= 2560) return null;

        return this;
    }
}

const suicide = {
    n: twoSide(S.esuiciden),
    d: twoSide(S.esuicided),
    v: twoSide(S.esuicidev)
}

// Second stage of 'suicide' enemy, moves in an arc 
class Suicide2 extends Enemy {

    private readonly toLeft : boolean
    private readonly cty : number
    private readonly ctx : number 
    private angle : number
    
    constructor(x: number, y: number, mode: Mode, health: number) {
        super(x, y, health, mode, suicide[mode], 
            mode == "n" ? S.esuicidenh :
            mode == "d" ? S.esuicidedh : S.esuicidevh);

        const {x:px} = Player.pos();

        this.toLeft = x > px;
        this.cty = y;
        this.ctx = this.toLeft ? x - 640 : x + 640;
        
        // Angle starts negative but is only applied when positive, 
        // so this is a random delay.
        this.angle = -Math.PI * (0.156 + Math.random() * 0.5);
    }

    public step(px: number, py: number): Enemy|null {
    
        const self = super.step(px, py);
        if (self !== this) return self;
        
        this.angle += Math.PI / 64;
        if (this.angle < 0) return this;

        if (this.angle < Math.PI / 2) {
            this.x = this.ctx + (this.toLeft ? 1 : -1) * 640 * Math.cos(this.angle);
            this.y = this.cty + (this.mode == "n" ? 1 : 2) * 640 * Math.sin(this.angle);
            return this;
        }

        this.x += (this.toLeft ? -32 : 32);
        if (this.x < -160 || this.x > 1930) return null;

        return this;
    }
}

// Flies downwards, then arcs to a faster horizontal trajectory
// that intersects the player's position
export class Suicide extends Enemy {

    private dir : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y, 
            /* health */ mode == "n" ? 5 :
                         mode == "d" ? 7 : 6, 
            mode,
            suicide[mode],
            mode == "n" ? S.esuicidenh :
            mode == "d" ? S.esuicidedh : S.esuicidevh);

        this.dir = params[0] == 1 ? 0 : 
                   x < 0 ? 8 : -8;
    }

    public step(px: number, py: number) : Enemy|null {
        const self = super.step(px, py);
        if (self !== this) return self;

        const mv = opts.UseVertical 
            ? this.mode == "v" ? 16 : 8 
            : 4;

        if ((this.y += mv) >= 2600) return null;

        if ((px - this.x) * (px - this.x) > 9216 && 
            (this.dir <= 0 || this.x <= 1720) &&
            (this.dir >= 0 || this.x >= 200)) 
        {
            // Move horizontally unless too close to the player
            // or to a wall.
            this.x += this.dir;
        }

        const radius = this.mode == "n" ? 640 : 1280;
        if (this.y + radius > py) {
            return new Suicide2(
                this.x, this.y, this.mode, 
                this.mode == "n" ? 5 :
                this.mode == "d" ? 7 : 6)
        }

        return this;
    }
}

const warp = {
    n: twoSide(S.ewarpn),
    d: twoSide(S.ewarpd),
    v: twoSide(S.ewarpv)
}

export class Warp extends Enemy {
    
    private readonly speed : number
    
    constructor(x: number, y: number, mode: Mode, health: number) {
        super(x, y,
            health,
            mode, 
            warp[mode],
            mode == "n" ? S.ewarpnh : 
            mode == "d" ? S.ewarpdh : S.ewarpvh);
     
        this.alpha = 0;
        this.speed = mode == "v" ? 1 : 0.5;
    }

    public present() {}
    public end() : Enemy|null { return null }

    public step(px: number, py: number) : Enemy|null {

        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.timer * this.speed <= 32) {
            this.alpha = Math.floor(this.timer * this.speed);
        } else if (this.timer < 256) {
            if (this.sprites.length > 1)
                this.sprites = [warp[this.mode][0]];
            this.present();
        } else if (this.alpha > 0) {
            if (this.sprites.length == 1) 
                this.sprites = warp[this.mode];
            this.alpha = 32 - Math.floor((this.timer - 256) * this.speed);
        } else {
            return this.end();
        }

        return this;
    }
}

// Teleports around the screen
export class Warp3 extends Warp {

    private spot : number
    private stimer : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "n" ? 7 : 9)
        this.spot = 0;
        this.stimer = 0;
    }

    present() {
        if (this.stimer-- > 0) return;

        if (this.mode == "n") {
            Dan.fireStandard(this.cx(), this.cy(),  16,   0, "b5n");
            Dan.fireStandard(this.cx(), this.cy(), -16,   0, "b5n");
            Dan.fireStandard(this.cx(), this.cy(),   0,  16, "b5n");
            Dan.fireStandard(this.cx(), this.cy(),   0, -16, "b5n");
            this.stimer = 50;
        } else if (this.mode == "d") {
            Dan.fireStandard(this.cx(), this.cy(),   4,   12, "b5d");
            Dan.fireStandard(this.cx(), this.cy(),   4,  -12, "b5d");
            Dan.fireStandard(this.cx(), this.cy(),  -4,   12, "b5d");
            Dan.fireStandard(this.cx(), this.cy(),  -4,  -12, "b5d");
            this.stimer = 30;
        } else {
            Dan.fireStandard(this.cx(), this.cy(),   0,  -16, "b5v");
            Dan.fireStandard(this.cx(), this.cy(),   0,   16, "b5v");
            Dan.fireStandard(this.cx(), this.cy(),  12,   12, "b5v");
            Dan.fireStandard(this.cx(), this.cy(),  12,  -12, "b5v");
            Dan.fireStandard(this.cx(), this.cy(), -12,   12, "b5v");
            Dan.fireStandard(this.cx(), this.cy(), -12,  -12, "b5v");
            Dan.fireStandard(this.cx(), this.cy(),  16,    0, "b5v");
            Dan.fireStandard(this.cx(), this.cy(), -16,    0, "b5v");
            this.stimer = 30;
        }
    }

    public end() : Enemy|null { 
        this.timer = 0;
        switch (this.spot++ % 4) {
            case 0: this.x += 640; break;
            case 1: this.y += 480; break;
            case 2: this.x -= 640; break;
            case 3: this.y -= 480; break;
        }
        return this;
    }
}

// Appears, moves to player position, disappears
export class Warp2 extends Warp {

    private readonly tx : number
    private readonly ty : number

    private readonly spd : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "n" ? 7 : 8)
        this.spd = mode == "v" ? 16 : 8;

        const pp = Player.pos();
        this.tx = pp.x;
        this.ty = pp.y;
    }

    present() {

        const dx = this.x > this.tx + this.spd ? -this.spd :
                   this.x < this.tx - this.spd ? this.spd : 0;
                
        const dy = this.y > this.ty + this.spd ? -this.spd : 
                   this.y < this.ty - this.spd ? this.spd : 0;

        if (!dx && !dy) return;

        // Freeze time and move
        this.timer--;
        this.x += dx;
        this.y += dy;
    }
}

// Appears, shoots, disappears
export class Warp1 extends Warp {

    private stimer : number = 0
    private readonly rstimer : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "v" ? 10 : 8)
        this.rstimer = mode == "v" ? 30 : 200;
    }

    public present() {
        if (this.stimer-- > 0) return;
        this.stimer = this.rstimer;
        if (this.mode == "n") {
            Dan.fireAround(this.cx(), this.cy(), "b5n")
        } else if (this.mode == "d") {
            Dan.fireAroundSeek(this.cx(), this.cy(), "b5d")
        } else {
            Dan.fireMissile(this.cx(), this.cy(), 0, "b5v");
            Dan.fireMissile(this.cx(), this.cy(), Math.PI / 2, "b5v");
            Dan.fireMissile(this.cx(), this.cy(), Math.PI, "b5v");
            Dan.fireMissile(this.cx(), this.cy(), Math.PI * 3 / 2, "b5v");
        }
    }
}

const sweep = {
    n: twoSide(S.esweepn),
    d: twoSide(S.esweepd),
    v: twoSide(S.esweepv)
}

// Moves in a square, sometimes shoots
export class Sweep extends Enemy {

    public dir : number
    public rot : number
    public wait : number
    public stimer : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y - 1600, 
            /* health */ mode == "n" ? 7 : 
                         mode == "d" ? 8 : 9,
            mode,
            sweep[mode],
            mode == "n" ? S.esweepnh : 
            mode == "d" ? S.esweepdh : S.esweepvh);

        this.rot = params[0] == 1 ? -1 : 1;
        this.dir = 65536;
        this.wait = 3200;
        this.stimer = 300 + Math.floor(300 * Math.random());
    }

    public step(px: number, py: number) : Enemy|null {

        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.wait > 0) {
            this.wait -= 16 + 8*(this.dir % 2);
            switch (this.dir % 4) {
                case 0: this.y += 8; break;
                case 1: this.x -= 8; break;
                case 2: this.y -= 8; break;
                default: this.x += 8; break;
            }
        } else {
            this.dir += this.rot;
            this.wait = 640;
        }

        if (this.stimer-- == 0) {
            this.stimer = this.mode == "n" ? 600 + Math.floor(Math.random() * 128) :
                          this.mode == "d" ? 50 + Math.floor(Math.random() * 128) :                  
                                             300 + Math.floor(Math.random() * 64);
            Dan.fireStandard(this.cx(), this.cy(), 0, 16, "b2");
        }

        return this;
    }    
}

// Moves left-right
export class Sweep3 extends Enemy {

    public vx : number
    public stimer : number

    constructor(x: number, y: number, mode: Mode) {
        super(x, y, 
            /* health */ mode == "n" ? 9 : 
                         mode == "d" ? 10 : 11,
            mode,
            sweep[mode],
            mode == "n" ? S.esweepnh : 
            mode == "d" ? S.esweepdh : S.esweepvh);

        this.vx = 8;
        this.stimer = 0;
    }

    public step(px: number, py: number) : Enemy|null {

        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.x <= 10) this.vx = 8;
        if (this.x >= 1714) this.vx = -8;

        this.x += this.vx;

        if (this.mode == "n") {
            if (this.stimer-- == 0) 
                this.stimer = 300;
            
            if (this.stimer < 75 && (this.stimer & 15) == 0)
                Dan.fireAimed(this.cx(), this.cy(), 20, "b5n");
            
        } else if (this.mode == "d") {
            
            if (this.stimer-- == 0) {
                this.stimer = 20;
                Dan.fireAimed(this.cx(), this.cy(), 20, "b1d");
            }
            
        } else {
            
            if (this.stimer-- == 0) {
                this.stimer = 100;
                Dan.fireAimedTrine(this.cx(), this.cy(), 20, Math.PI * 0.15, "b1v");
            }
            
        }

        return this;
    }    
}

// Moves left-right, and up/down when outside the screen
export class Sweep4 extends Enemy {

    public vx : number
    public tx : number
    public dy : number
    public stimer : number
    public angle : number

    constructor(x: number, y: number, mode: Mode) {
        super(x, y, 
            /* health */ mode == "v" ? 14 : 9,
            mode,
            sweep[mode],
            mode == "n" ? S.esweepnh : 
            mode == "d" ? S.esweepdh : S.esweepvh);

        this.tx = 1728 - x;
        this.dy = mode == "n" ? 200 : 400;
        this.vx = 8;
        this.alpha = 0;
        this.stimer = 0;
        this.angle = 0;
    }

    public step(px: number, py: number) : Enemy|null {

        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.mode == "v") {
            if (this.alpha < 32) ++this.alpha;
            if (this.x < 900) {
                this.x += 16;
            } else if (this.alpha == 32 && this.stimer-- == 0) {
                this.stimer = 3;
                const cx = this.cx();
                const cy = this.cy();
                Dan.fireQuad(cx, cy, "b1v", this.angle);
                Dan.fireQuad(cx, cy, "b1v", -this.angle);
                this.angle += Math.PI * 5 / 128;
            }
            return self;
        }

        const dx = this.x - this.tx;

        if (dx < 0) this.x += 8;
        if (dx > 0) this.x -= 8;
        if (dx == 0) {
            this.tx = 1728 - this.x;
            this.y += this.dy;
            this.dy = - this.dy;
        }

        if (dx * dx <= (32 << 10)) 
            this.alpha = (dx * dx) >> 10;
        else if (this.alpha < 32)
            ++this.alpha;

        if (this.alpha == 32 && this.stimer-- == 0) {
            this.stimer = 100;
            Dan.fireStandard(this.cx(), this.cy(), 0, 16, "b2");
        }

        return this;
    }    
}

const hunter = {
    n: twoSide(S.ehuntern),
    d: twoSide(S.ehunterd),
    v: twoSide(S.ehunterv)
}

class Hunter extends Enemy {
    constructor(x: number, y: number, mode: Mode, health: number) {
        super(x, y, health, mode, hunter[mode], 
                mode == "n" ? S.ehunternh : 
                mode == "d" ? S.ehunterdh : S.ehuntervh);
    }
}

export class Hunter1 extends Hunter {
    private stimer : number
    private arrived : boolean
    private readonly dy : number
    private readonly spd : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "n" ? 10 : 11)
        this.stimer = 0;
        this.arrived = false;
        this.dy = mode == "n" ? 320 : 
                  mode == "d" ? 480 : 640;
        this.spd = mode == "v" ? 16 : 8;
    }

    step(px: number, py: number) : Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        this.stimer--;

        if (this.arrived) 
        {
            if (this.stimer <= 0) {
                if (this.mode == "n") {
                    Dan.fireStandard(this.cx(), this.cy(), 0, 8, "b1n")
                    this.stimer = 40;
                } else if (this.mode == "d") {
                    Dan.fireStandard(this.cx(), this.cy(), 0, 16, "b1d")
                    this.stimer = 30;
                } else {
                    Dan.fireStandard(this.cx(), this.cy(), 0, 16, "b1v")
                    this.stimer = 20;
                }
            }
            this.arrived = false;
        }

        const pp = Player.pos();
        const tx = pp.x;
        const ty = pp.y - this.dy;

        const spd = this.spd;

        const dx = tx - this.x;
        const dy = ty - this.y;

        if (dx * dx < 6400) this.arrived = true;

        if (dx > -spd && dx < spd) 
            if (dy > -spd && dy < spd)
                this.arrived = true;
            
        if (dy <= -spd) this.y -= spd;
        if (dy >= spd) this.y += spd; 
        if (dx <= -spd) this.x -= spd;
        if (dx >= spd) this.x += spd;

        return this;
    }
}

export class Hunter2 extends Hunter {
    private arrived : boolean
    private tx : number
    private ty : number
    private readonly spd : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "n" ? 10 : 11)
        this.tx = x;
        this.ty = y;
        this.arrived = true;
        this.spd = mode == "v" ? 16 : 8;
    }

    step(px: number, py: number) : Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.arrived) 
        {
            const pp = Player.pos();
            this.tx = pp.x;
            this.ty = pp.y;
            this.arrived = false;
        }

        const tx = this.tx;
        const ty = this.ty;

        const spd = this.spd;

        const dx = tx - this.x;
        const dy = ty - this.y;

        if (dx > -spd && dx < spd) 
            if (dy > -spd && dy < spd)
                this.arrived = true;
            
        if (dy <= -spd) this.y -= spd;
        if (dy >= spd) this.y += spd; 
        if (dx <= -spd) this.x -= spd;
        if (dx >= spd) this.x += spd;

        return this;
    }
}


export class Hunter3 extends Hunter {
    private angle : number
    private radius : number
    private stimer : number
    private readonly mrad : number
    private readonly aspd : number
    constructor(x: number, y: number, mode: Mode) {
        super(x, y, mode, mode == "d" ? 9 : 8)
        this.aspd = (mode == "v" ? 2 : 1) * 
                    (Math.random() > 0.5 ? 1 : -1) *
                    (opts.UseNewSchool ? 2 : 1) *
                    Math.PI / 128;
        this.stimer = 0;
        this.angle = 0;
        this.radius = 150;
        this.mrad = mode == "v" ? 48 : 64;
    }

    step(px: number, py: number) : Enemy|null {
        
        const self = super.step(px, py);
        if (self !== this) return self;

        if (this.radius > this.mrad) this.radius--;

        const pp = Player.pos();

        this.angle += this.aspd;
        this.x = pp.x + Math.floor(this.radius * 8 * Math.cos(this.angle));
        this.y = pp.y + Math.floor(this.radius * 8 * Math.sin(this.angle));

        if (this.stimer-- < 0) {
            if (this.mode == "n") {
                this.stimer = 80;
                Dan.fireStandard(this.cx(), this.cy(), 
                    -Math.floor(8 * Math.cos(this.angle)),
                    -Math.floor(8 * Math.sin(this.angle)),
                    "b1n");
            } else if (this.mode == "d") {                
                this.stimer = 80;
                Dan.fireSeek(this.cx(), this.cy(), 
                    -Math.floor(4 * Math.cos(this.angle)),
                    -Math.floor(4 * Math.sin(this.angle)),
                    3, "b1d");
                Dan.fireSeek(this.cx(), this.cy(), 
                    -Math.floor(4 * Math.cos(this.angle-0.2)),
                    -Math.floor(4 * Math.sin(this.angle-0.2)),
                    3, "b1d");
                Dan.fireSeek(this.cx(), this.cy(), 
                    -Math.floor(4 * Math.cos(this.angle+0.2)),
                    -Math.floor(4 * Math.sin(this.angle+0.2)),
                    3, "b1d");
            } else {
                this.stimer = 50;
                for (let off of [-0.4,-0.2,0,0.2,0.4])
                    Dan.fireStandard(this.cx(), this.cy(), 
                        -Math.floor(8 * Math.cos(this.angle+off)),
                        -Math.floor(8 * Math.sin(this.angle+off)),
                        "b1v");
            }
        }

        return this;
    }
}