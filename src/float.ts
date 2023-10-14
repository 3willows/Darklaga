import * as GL from "./webgl"
import * as S from "./sprites"

type Float = {
    render: (this: Float) => void
    step: (this: Float) => boolean
    x: number
    y: number
    timer: number
    value: number
    text: readonly string[]
    sprite?: readonly S.Sprite[]
}

const fl : Float[] = []

// update steps ==============================================================

function stepStandard(this: Float) {
    const t = ++this.timer;
    const y = this.y -= (t>>3);
    return t < 128 && y >= -80;
}

function stepInfo(this: Float) {
    const t = ++this.timer;
    if (t <= 16) this.x = 4 + (16-t) * 15;
    return t < 184; 
}

function stepGraze(this: Float) {
    const t = ++this.timer;
    return t < 32;
}

function stepExplosion(this: Float) {
    const t = ++this.timer;
    return t < 72;
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
    GL.drawText(this.text[0], S.mini, S.texgreen, x >> 3, this.y >> 3, a, a);
}

function renderInfo(this: Float) {
    const a = this.timer < 16 ? this.timer / 16 : 
              this.timer < 120 ? 1 : (184 - this.timer) / 64;
    let x = this.x >> 3;
    let y = this.y >> 3;
    
    if (this.sprite) {
        const s = this.sprite[(this.timer >> 4) % this.sprite.length];
        GL.drawSpriteAlpha(s, x, y, a*32);
        x += s.w;
    }

    x += 2;
    y += 2;

    for (let line of this.text) {
        GL.drawText(line, S.mini, S.texwhite, x, y, a, a);
        y += 8;
    }
}

function renderSprite(this: Float) {
    if (!this.sprite) return;    
    const x = this.x >> 3;
    const y = this.y >> 3;
    const a = (128 - this.timer)/128;
    const s = this.sprite[(this.timer >> 4) % this.sprite.length];
    GL.drawSpriteAlpha(s, x, y, a*32);
}

function renderGraze(this: Float) {
    const a = (32 - this.timer)/2;
    if (this.sprite) {
        const s = this.sprite[(10 * this.timer) >> 5];
        GL.drawSpriteAdditive(s, this.x >> 3, this.y >> 3, a);
    }
}

function renderExplosion(this: Float) {
    const x = (this.x >> 3) - 4;
    const y = (this.y >> 3) - 4;
    if (this.timer < 8) {
        const s = S.explon[this.timer];
        GL.drawSprite(s, x, y);
        GL.drawSpriteAdditive(s, x, y, 32);
    } else {        
        const s = S.explon[(this.timer + 8) >> 2]
        GL.drawSpriteAlpha(s, x, y, (72 - this.timer) >> 1);
        if (this.timer < 40) {
            const s2 = S.explon[(this.timer + 8) >> 1];
            GL.drawSpriteAdditive(s2, x, y, 40 - this.timer);
        }
    }
}

export function render() {
    for (let f of fl) f.render();
}

// Creation ==================================================================

export function addSprite(sprite: S.Sprite[], x: number, y: number) {
    fl.push({
        x, y, 
        value: 0, 
        timer: 0,
        text: [],
        sprite,
        render: renderSprite,
        step: stepStandard
    })
}

export function add(x: number, y: number, value: number) {
    fl.push({
        x, y, value, 
        timer: 0,
        text: ["+" + value.toFixed()],
        render: renderLive,
        step: stepStandard
    })
}

export function addInfo(
    sprite: S.Sprite[],
    text: string[]) 
{
    fl.push({
        x: 324,
        y: 2160, 
        value: 0,
        timer: 0,
        text,
        sprite,
        render: renderInfo,
        step: stepInfo
    })
}

export function addGraze(x: number, y: number, sprite: readonly S.Sprite[]) {
    fl.push({
        x, y, sprite, 
        value: 0, 
        timer: 0,
        text: [],
        render: renderGraze,
        step: stepGraze
    })
} 

export function addExplosion(x: number, y: number) {
    fl.push({
        x, y,         
        value: 0, timer: 0, text: [],
        render: renderExplosion,
        step: stepExplosion
    })
}