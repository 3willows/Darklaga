import * as Enemy from "./enemy";
import * as E from "./enemy.types";

type EnemySeed = {
    readonly before: number,
    readonly type: number,
    readonly x: number,
    readonly y: number
}

function parseLevel(level: number): EnemySeed[] {

    const b = (window as unknown as {levels: Uint8Array[]})
        .levels[level - 1];

    if (typeof b === "undefined") throw ("Unknown level " + level);

    const result : EnemySeed[] = [];

    // First int32 is number of enemy seeds in level
    const count = b[0] + (b[1] << 8) + (b[2] << 16) + (b[3] << 24);

    function sint16(n: number) {
        return n > 32768 ? n - 65536 : n;
    } 

    while (result.length < count) {
        // Every entry is 6 bytes long
        const off = 6 * result.length + 4; 

        result.push({
            // uint8
            before: b[off + 0],
            // uint8
            type: b[off + 1],
            // sint16
            x: sint16(b[off + 2] + (b[off + 3] << 8)),
            // sint16
            y: sint16(b[off + 4] + (b[off + 5] << 8))
        })
    }

    return result;
}

const mode : Enemy.Mode[] = ["n", "d", "v"]

function enemyOfSeed(s: EnemySeed): Enemy.Enemy {
    const {x, y, type} = s;
    const m = mode[type % 3];
    switch (type)
    {
        case 3: 
        case 4: 
        case 5: return new E.Sweep(x, y, m, [0]);
        case 6: 
        case 7: 
        case 8: return new E.Sweep(x, y, m, [1]);
        case 9:
        case 10:
        case 11: return new E.Suicide(x, y, m, [1]);
        case 12: 
        case 13: 
        case 14: return new E.Suicide(x, y, m, [2]);
        case 15: 
        case 16: 
        case 17: return new E.Sweep(x, y, m, [2]);
        case 18: 
        case 19: 
        case 20: return new E.Suicide(x, y, m, [3]);
        case 21: 
        case 22: 
        case 23: return new E.Sweep(x, y, m, [3]);
        case 24:
        case 25: 
        case 26: return new E.Static(x, y, m, [1]);
        case 27:
        case 28: 
        case 29: return new E.Static(x, y, m, [2]);
        case 30: 
        case 31: 
        case 32: return new E.Static(x, y, m, [3]);
        case 33:
        case 34:
        case 35: return new E.Bounce(x, y, m, [1]);
        case 36: 
        case 37: 
        case 38: return new E.Bounce(x, y, m, [2]);
        case 39:
        case 40:
        case 41: return new E.Bounce(x, y, m, [3]);
        case 42: 
        case 43:
        case 44: return new E.Bounce(x, y, m, [4]);
        case 45: 
        case 46: 
        case 47: return new E.Sniper(x, y, m, [1]);
        case 48: 
        case 49:
        case 50: return new E.Sniper(x, y, m, [2]);
        case 51: 
        case 52: 
        case 53: return new E.Sniper(x, y, m, [3]);
        case 54: 
        case 55: 
        case 56: return new E.Warp1(x, y, m);
        case 57: 
        case 58: 
        case 59: return new E.Warp2(x, y, m);
        case 60: 
        case 61: 
        case 62: return new E.Warp3(x, y, m);
        case 63: 
        case 64: 
        case 65: return new E.Carrier(x, y, m, [1]);
        case 66:
        case 67: 
        case 68: return new E.Carrier(x, y, m, [2]);
        case 69: 
        case 70:
        case 71: return new E.Flyby(x, y, m, [1]);
        case 72:
        case 73:
        case 74: return new E.Flyby(x, y, m, [2]);
        case 75: 
        case 76:
        case 77: return new E.Tank(x, y, m);
        case 78:
        case 79:
        case 80: return new E.Group(x, y, m, [1]);
        case 81:
        case 82:
        case 83: return new E.Group(x, y, m, [2]);
        case 84: 
        case 85: 
        case 86: return new E.Hunter1(x, y, m);
        case 87: 
        case 88:
        case 89: return new E.Hunter2(x, y, m);
        case 90: 
        case 91: 
        case 92: return new E.Hunter3(x, y, m);
        default:
            throw "Unknown enemy type";
    }
}

let current = parseLevel(1);

export function step() {
    while (current.length > 0 && current[0].before <= (40 - Enemy.count())) {
        const enemy = enemyOfSeed(current.shift()!);
        console.log("Spawn %o", enemy   )
        Enemy.add(enemy);
    }
}