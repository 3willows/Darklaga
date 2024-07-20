import * as GL from "webgl"

const X = 0;
const Y = 1;
const Z = 2;
const W = 3;

const HN = 28;
const VN = 38;
const S = 10;
const stride = 4 * HN;

const points = new Int32Array(4 * HN * VN);
let scroll = 0;

let active = false;

function reset(lines: number = VN) {
    for (let y = 0; y < lines; ++y) {
        for (let x = 0; x < HN; ++x) {
            const p = x * 4 + y * stride;
            points[p + X] = (S * x) << 8;
            points[p + Y] = (S * y) << 8;
            points[p + Z] = points[p + W] = 0;
        }
    }
}

function rollnext() {
    for (let p = points.length - 4; p >= 0; p -= 4) {
        points[p + X] = points[p - stride + X];
        points[p + Y] = points[p - stride + Y] + scroll;
        points[p + Z] = points[p - stride + Z];
        points[p + W] = points[p - stride + W];
    }
    reset(1);
    scroll = 0;
}

function moveback(normal: number, current: number, min: number) {
    const d = normal - current;
    if (d == 0) return current;
    if (d > -min && d < min) return current;
    if (d > 0) return current + (d >> 5);
    return current - (-d >> 5);
}

export function stop() {
    active = false;
}

export function step() {

    if (!active) {
        active = true;
        reset();
    }

    for (let y = 0; y < VN; ++y) {
        for (let x = 0; x < HN; ++x) {
            const p = x * 4 + y * stride;
            const ny = (S * y) << 8;
            const nx = (S * x) << 8;
            const z = points[p + Z] << 2;
            points[p + X] = moveback(nx, points[p + X], z);
            points[p + Y] = moveback(ny, points[p + Y], z);
            points[p + W] = moveback(0, points[p + W], 0);
        }
    }

    scroll += (1 << 7);
    if (scroll >= S << 8) rollnext();
}

// Layout of vertices array always stays the same, so the indices
// array can be pre-filled during initialization
const verticesXYRGB = new Float32Array(5 * HN * VN);
const indices = (function() {
    const a = new Uint16Array(4 * (HN * VN - HN - VN));
    let i = 0;
    for (let y = 0; y < VN; ++y) {
        for (let x = 0; x < HN; ++x) {
            const p = x + y * HN;
            if (x + 1 < HN) {
                a[i++] = p;
                a[i++] = p + 1;
            }
            if (y + 1 < VN) {
                a[i++] = p;
                a[i++] = p + HN;
            }
        }
    }
    return a;
})();

function norm(n: number) { return n / 256; }
function c256(n: number) { return Math.min(255, Math.max(0, n)); }

const XOFF = 15;
const YOFF = 25;

export function render() {
    
    for (let p = 0; p < points.length; p += 4) {
        const v = (p / 4) * 5;

        const z = points[p + Z];
        const w = points[p + W];
        const c = c256(c256(w)-((z-127)<<1))

        verticesXYRGB[v    ] = (points[p + X] >> 8) - XOFF;
        verticesXYRGB[v + 1] = ((points[p + Y] + scroll + ((z * z) >> 3)) >> 8) - YOFF;
        verticesXYRGB[v + 2] = norm(z < 127 
            ? c256((z<<1)+w) 
            : c256(c + ((255-z)<<1)));
        verticesXYRGB[v + 3] = norm(z < 127
            ? c256(w + 255 - (z<<1))
            : c);
        verticesXYRGB[v + 4] = norm(z < 127 
            ? c256(w)
            : c);
    }

    GL.drawLines(verticesXYRGB, indices);
}

function coordBlast(
    value: number, 
    center: number, 
    distance: number, 
    radiusLog: number, 
    force: number) 
{
    const d2 = value - center;
    return value + force * ((((1 << radiusLog) - distance) * d2) >> radiusLog);
}

function colorBlast(
    value: number,
    distance: number,
    radiusLog: number)
{
    const base = ((1 << radiusLog) - distance);
    const div = radiusLog > 7 ? base >> (radiusLog - 7) : base << (7 - radiusLog);
    return value + Math.min(255, div);
}

export function blast(nx: number, ny: number, nr: number, force: number) {

    if (!active) return;

    nx = (nx << 5) + (XOFF << 3);
    ny = (ny << 5) + (YOFF << 3);

    for (let y = 0; y < VN; ++y) {
        for (let x = 0; x < HN; ++x) {

            const p = x * 4 + y * stride;
            const cx = points[p + X];
            const cy = points[p + Y];
            const dx = (cx - nx) >> 9, dy = (cy - ny) >> 9;
            const d2 = dx * dx + dy * dy;
            
            if (d2 > (1<<(nr<<1))) continue;

            const d = Math.round(Math.sqrt(d2));
            points[p + X] = coordBlast(cx, nx, d, nr, force);
            points[p + Y] = coordBlast(cy, ny, d, nr, force);
            points[p + Z] = colorBlast(points[p + Z], d, nr);
            points[p + W] = colorBlast(points[p + W], d, nr);
        }
    }
}
