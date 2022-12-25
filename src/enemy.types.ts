import { Enemy, Mode } from "./enemy"
import * as S from "./sprites"
import * as Player from "./player"
import * as GL from "./webgl"
import { opts } from "options"

// Given a ship sprite-set 01234, oscillates 23432101
function twoSide(s: S.Sprite[]): S.Sprite[] {
    return [s[2], s[3], s[4], s[3], s[2], s[1], s[0], s[1]];
}

const suicide = {
    n: twoSide(S.esuiciden),
    d: twoSide(S.esuicided),
    v: twoSide(S.esuicidev)
}

// Second stage of 'suicide' enemy, moves in an arc 
class Suicide2 extends Enemy {

    private readonly toLeft : boolean
    private readonly cy : number
    private readonly cx : number 
    private angle : number
    
    constructor(x: number, y: number, mode: Mode, health: number) {
        super(x, y, health, mode, suicide[mode], 
            mode == "n" ? S.esuicidenh :
            mode == "d" ? S.esuicidedh : S.esuicidevh);

        const {x:px} = Player.pos();

        this.toLeft = x > px;
        this.cy = y;
        this.cx = this.toLeft ? x - 640 : x + 640;
        
        // Angle starts negative but is only applied when positive, 
        // so this is a random delay.
        this.angle = -Math.PI * (0.156 + Math.random() * 0.5);
    }

    public step() {
    
        const self = super.step();
        if (self !== this) return self;
        
        this.angle += Math.PI / 64;
        if (this.angle < 0) return this;

        if (this.angle < Math.PI / 2) {
            this.x = this.cx + (this.toLeft ? 1 : -1) * 640 * Math.cos(this.angle);
            this.y = this.cy + (this.mode == "n" ? 1 : 2) * 640 * Math.sin(this.angle);
            return this;
        }

        this.x += (this.toLeft ? -32 : 32);
        if (this.x < -160 || this.x > 1930) return null;

        return this;
    }
}

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

    public step() {
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