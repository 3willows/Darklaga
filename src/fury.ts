import * as GL from "./webgl"
import * as S from "./sprites"
import * as Shot from "./shot"

class Fury {

    protected darken : number = 0
    protected timer : number = 0

    onStep(): void { 
        
        if (fuel > 64 && this.darken < 64) {
            ++this.darken;
        } else if (fuel < this.darken) {
            this.darken = fuel;
        }

        if (this.darken == 64) {
            ++this.timer;
            this.step();
        }
    }

    step(): void { /* */ }

    // Should we draw a background ? 
    background(): boolean { return true; }

    renderStart() {
        if (this.darken < 64) {
            GL.drawRect(0, 0, 240, 320, 0, 0, 0, this.darken/64)
        } else {
            const d = Math.abs((this.timer % 19) - 9) / 9 * 0.5;
            GL.drawRect(0, 0, 240, 320, 0, d, d, 1);
        }
    }

    renderEnd() {
        GL.drawSpriteAlpha(S.kanji, 75, 130, this.darken>>1)
    }
}

let fuel = 0
export function setFuel(f: number) { fuel = f; }

let px = 0
let py = 0
export function setPlayer(x: number, y: number) {
    px = x;
    py = y;
}

let current: Fury|undefined = undefined

export function isRunning() { return !!current; }

export function step() {
    if (current) current.onStep();
    if (fuel <= 0) current = undefined;
}

export function renderStart() {
    if (current) current.renderStart();
}

export function renderEnd() {
    if (current) current.renderEnd();
}

export function showBackground() {
    return !current || current.background();
}

class BlasterFury extends Fury {
    step() {
        if (++this.timer % 2 == 0) {
            const fire = (a: number, r: number, dx: number, dy: number) => {
                const x = px - 8 + Math.floor(r * Math.cos(a));
                const y = py - 8 + Math.floor(r * Math.sin(a));
                Shot.add(Shot.SHOT_FBLASTER, x, y, 64, 64, dx, dy); 
            }
            const t = this.timer * Math.PI / 16
            fire( t, 80, 0, 128);
            fire(-t, 40, 0, 128);
            fire(Math.PI - t, 80, 0, -128);
            fire(Math.PI + t, 40, 0, -128);
            fire(Math.PI/2 - t, 80, 128, 0);
            fire(Math.PI/2 + t, 40, 128, 0);
            fire(3*Math.PI/2 - t, 80, -128, 0);
            fire(3*Math.PI/2 + t, 40, -128, 0);
        }
    }
}

export function startBlaster() {
    if (!current) {
        fuel = 128
        current = new BlasterFury();
    }
}

function actionLine(x: number, y: number, t: number) {
    
    t -= 20;

    if (t <= 0) return;
    if (t >= 128) t = 128;

    t = t >> 2;

    let xa : number, xb : number, ya : number, yb : number;
    if (y <= 20 || y >= 300) {
        xa = x - t;
        xb = x + t;
        ya = yb = y;
    } else {
        xa = xb = x;
        ya = y - t;
        yb = y + t;
    }

    GL.drawPoly([
        xa, ya, 
        xb, yb, 
        120, 160
    ], 0.5, 1, 1, 1, 1);
}

class BladeFury extends Fury {

    step() {

        if (this.timer == 1) {
            for (let a = 0; a < 32; a++) {
                const dx = Math.round(32 * Math.cos(a * Math.PI / 16));
                const dy = Math.round(32 * Math.sin(a * Math.PI / 16));
                Shot.add(
                    Shot.SHOT_BLADE,
                    872 + 4*dx, 1196 +4*dy, 176, 176,
                    dx, dy); 
            }
            return;
        }

        if (this.timer < 40) return;
        

        if (this.timer % 4 == 0) {
            const a = Math.random() * 2 * Math.PI;
            const dx = Math.floor(24 * Math.cos(a));
            const dy = Math.floor(24 * Math.sin(a));
            Shot.add(
                Shot.SHOT_BLADE,
                872 + 4*dx, 1196 +4*dy, 176, 176,
                dx, dy); 
        }
    }

    renderEnd(): void {
        if (this.timer == 0) {
            const t = this.darken;
            actionLine(0, 75, t);
            actionLine(239, 240, t - 8);
            actionLine(0, 130, t - 18);
            actionLine(112, 0, t - 24);
            actionLine(0, 200, t - 30);
            actionLine(239, 300, t - 38);
            actionLine(0, 130, t - 44);
            actionLine(239, 10, t - 54);
            actionLine(0, 200, t - 58);
        } else if (this.timer < 40) {
            const a = Math.min(32, 40 - this.timer);
            GL.drawRect(0, 20, 240, 280, 1, 1, 1, a/32);
        }

        GL.drawSpriteAdditive(S.bigball, 48, 85, this.darken >> 1);        

        super.renderEnd();
    }
}

export function startBlades() {
    if (!current) {
        fuel = 128
        current = new BladeFury();
    }
}

class RocketFury extends Fury {
    
    constructor(
        private readonly mode: number
    ) {
        super()
    }

    background() { return this.darken < 64; }

    renderStart() {
        if (this.background())
            super.renderStart()
        else            
            GL.drawRect(0, 0, 240, 320, 0, 0, 0, 0.05);
    }
    
    step() {
        switch (this.mode) {
        case 0:
        {
            if (this.timer % 4 == 0) {
                const a = this.timer << 2;
                for (let i = 0; i < 512; i += 128)
                    Shot.add(
                        Shot.SHOT_OROCKET_FURY,
                        px - 120, py - 120, 64, 64,
                        a + i);
            }
            break;
        } 
        case 1:
        {
            if (this.timer % 4 == 0) {
                const a = this.timer;
                Shot.add(
                    Shot.SHOT_OROCKET_FURY,
                    px - 120, py - 120, 64, 64,
                    128 -64 - a*6);
                Shot.add(
                    Shot.SHOT_OROCKET_FURY,
                    px - 120, py - 120, 64, 64,
                    128-64 + a*6); 
                Shot.add(
                    Shot.SHOT_OROCKET_FURY,
                    px - 120, py - 120, 64, 64,
                    128+64 - a*6);
                Shot.add(
                    Shot.SHOT_OROCKET_FURY,
                    px - 120, py - 120, 64, 64,
                    128+64 + a*6);
            }
            break;
        } 
        case 2:
        {
            Shot.add(
                Shot.SHOT_OROCKET_FURY,
                px - 120, py - 120, 64, 64,
                this.timer << 3); 
            break;
        }
        case 3:
        {
            if (this.timer % 32 == 0) {
                for (let a = 0; a < 512; a += 32)
                    Shot.add(
                        Shot.SHOT_OROCKET_FURY,
                        px - 120, py - 120, 64, 64,
                        a); 
            }
            break;    
        }
        }
    }
}

export function startRocket() {
    if (!current) {
        fuel = 128
        current = new RocketFury(Math.floor(Math.random() * 4));
    }

}