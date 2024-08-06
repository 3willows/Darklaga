import * as GL from "./webgl"

const index = new Uint16Array(256);
for (let i = 0; i < index.length; ++i) index[i] = i;

const vertex = new Float32Array(5 * 256);
for (let i = 0; i < vertex.length; i += 5) {
    // set color to white
    vertex[i + 2] = vertex[i + 3] = vertex[i + 4] = 1;
}

const state = new Int32Array(128);

export function init() {
    for (let i = 0; i < state.length; ++i) {
        state[i] = 80 + Math.floor(Math.random() * 40);
    }
}

export function step() {
    for (let i = 0; i < state.length; ++i) {
        const t = state[i] - 1;
        state[i] = t <= 0 ? 30 + Math.floor(Math.random() * 20) : t;
    }
}

export function render(x: number, y: number) {

    for (let i = 0; i < state.length; ++i) {
        const angle = (i / state.length ) * 2 * Math.PI;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const r = 0.5 * state[i];
        const rs = r * r;
        const re = (r + 1) * (r + 1);
        const off = 10 * i;
        vertex[off + 0] = x + rs * dx;
        vertex[off + 1] = y + rs * dy;
        vertex[off + 5] = x + re * dx;
        vertex[off + 6] = y + re * dy;
    }

    GL.drawLines(vertex, index);
}

