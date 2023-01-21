import * as GL from "./webgl"
import * as S from "./sprites"

type Float = {
    render: (this: Float) => void
    step: (this: Float) => boolean
    x: number
    y: number
    timer: number
    value: number
    text: string
}

const fl : Float[] = []

// update steps ==============================================================

function stepStandard(this: Float) {
    console.log("%o", this)
    const t = ++this.timer;
    const y = this.y -= (t>>3);
    return t < 128 && y >= -80;
}

export function step() {
    for (let i = 0; i < fl.length; ++i) {
        if (!fl[i].step()) {
            fl[i] = fl[fl.length - 1];
            fl.pop();
            i--;
        }
    }
}

// rendering =================================================================

function renderLive(this: Float) {
    const a = (128 - this.timer)/128;
    const x = this.value < 100 ? this.x + 64 : this.x;
    GL.drawText(this.text, S.mini, S.texgreen, x >> 3, this.y >> 3, a, a);
}

function renderRed(this: Float) {
    const a = (128 - this.timer)/128;
    GL.drawText(this.text, S.mini, S.texred, this.x >> 3, this.y >> 3, a, a);
}

export function render() {
    for (let f of fl) f.render();
}

// Creation ==================================================================

export function add(x: number, y: number, value: number) {
    fl.push({
        x, y, value, 
        timer: 0,
        text: "+" + value.toFixed(),
        render: renderLive,
        step: stepStandard
    })
}