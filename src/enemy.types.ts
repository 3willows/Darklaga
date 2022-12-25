import { Enemy, Mode } from "./enemy"
import * as S from "./sprites"
import * as Player from "./player"
import * as GL from "./webgl"
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

    public step(): Enemy|null {
        
        const self = super.step();
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
                    const sprite = this.mode == "n" ? 1 : 
                                   this.mode == "d" ? 2 : 3;
                    Dan.fireStandard(this.cx(), this.cy(), -16, 0, sprite);
                    Dan.fireStandard(this.cx(), this.cy(), +16, 0, sprite);
                }
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

    public step(): Enemy|null {
    
        const self = super.step();
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

        this.dir = params[0]
    }

    public step() : Enemy|null {
        const self = super.step();
        if (self !== this) return self;

        const {x:px, y:py} = Player.pos();

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
            return new Suicide2(this.x, this.y, this.mode, this.health)
        }

        return this;
    }
}

const sweep = {
    n: twoSide(S.esweepn),
    d: twoSide(S.esweepd),
    v: twoSide(S.esweepv)
}

// Moves in a square, sometimes shoots
export class Sweep extends Enemy {

    public shoots : boolean
    public dir : number
    public wait : number
    public stimer : number

    constructor(x: number, y: number, mode: Mode, params: number[]) {
        super(x, y - 1600, 
            /* health */ mode == "n" ? 6 : 
                         mode == "d" ? 7 : 8,
            mode,
            sweep[mode],
            mode == "n" ? S.esweepnh : 
            mode == "d" ? S.esweepdh : S.esweepvh);

        this.shoots = !!params[0];
        this.dir = 0;
        this.wait = 3200;
        this.stimer = 300 + Math.floor(300 * Math.random());
    }

    public step() : Enemy|null {

        const self = super.step();
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
            this.dir++;
            this.wait = 640;
        }

        if (this.stimer-- == 0) {
            this.stimer = this.mode == "n" ? 600 + Math.floor(Math.random() * 128) :
                          this.mode == "d" ? 50 + Math.floor(Math.random() * 128) :                  
                                             300 + Math.floor(Math.random() * 64);
            Dan.fireStandard(this.cx(), this.cy(), 0, 16, /* sprite */ 0);
        }

        return this;
    }    
}