const fs = require("fs");
const sharp = require("sharp");

// Images ====================================================================

async function loadImages() {
    const result = {}
    const dir = fs.opendirSync("img")
    while (true)
    {
        const next = dir.readSync();
        if (!next) break;

        if (!next.isFile()) continue;

        const path = "img/" + next.name;

        const img = sharp(path);
        const meta = await img.metadata();
        const id = next.name.replace(".png", "");
        result[id] = { path, meta };
    }

    return result;
}

async function tryPackSlow(images, side) {

    const keys = Object.keys(images);
    const count = keys.length;
    const rects = new Int32Array(count * 4);

    keys.sort(function(k1, k2) {
        // Sort by ascending width and, if width equal, then 
        // ascending height
        const img1 = images[k1];
        const img2 = images[k2];
        if (img1.meta.width == img2.meta.width)
            return img2.meta.width - img1.meta.width;
        return img2.meta.height - img1.meta.height;
    })
    
    let atlas = sharp({
        create: {
            width: side,
            height: side,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const bindings = {};
    const composites = [];

    // True if the rectangle collides with any of the existing
    // rects. Allows for a one-pixel empty space between rectangles.
    function collides(x, y, w, h) {
        x = x - 1;
        y = y - 1;
        const x2 = x + w+2;
        const y2 = y + h+2;
        
        for (let i = 0; i < composites.length; ++i) {
            let off = 4*i;
            const rx1 = rects[off++];
            if (rx1 >= x2) continue;
            const ry1 = rects[off++];
            if (ry1 >= y2) continue;
            const rx2 = rects[off++];
            if (rx2 <= x) continue;
            const ry2 = rects[off];
            if (ry2 <= y) continue;
            return true;
        }

        return false;
    }

    let lastw = 0, lasth = 0, lastx = 0, lasty = 0

    for (let path of keys) {
        const img = images[path];
        const w = img.meta.width;
        const h = img.meta.height;

        if (lastw > w || lasth > h) {
            lastx = 0;
            lasty = 0;
        }

        function search() {
            for (let y = lasty; y < side - h; ++y) {
                for (let x = lastx; x < side - w; ++x) {
                    if (!collides(x, y, w, h)) {
                        return [x, y];
                    }
                }
                lastx = 0;
            }
            return null;
        }

        const found = search();
        if (!found) return null;

        const [x, y] = found;
        lastx = x;
        lasty = y;
        lastw = w;
        lasth = h;

        let off = composites.length * 4;
        rects[off++] = x;
        rects[off++] = y;
        rects[off++] = x + w;
        rects[off++] = y + h;

        composites.push({ input: img.path, left: x, top: y });

        bindings[path] = {
            x, 
            y, 
            w,
            h
        }
    }

    atlas = atlas.composite(composites)
        .png({compressionLevel: 9, palette: false});

    return [bindings, await atlas.toBuffer()];
}

async function packImages() {

    const images = await loadImages();

    for (let w = 1024; w < 4096; w *= 2) {
        const pack = await tryPackSlow(images, w);
        if (pack) return [pack[0], pack[1], w];
    }
}

// Find names like 'foo0' 'foo1' etc. and combine them as arrays of 
// values. 
function mergeBindings(bindings, side) {
    const out = {}
    for (let k in bindings) {
        const b = bindings[k];
        const value = {
            w: b.w,
            h: b.h,
            tl: b.x / side,
            tt: b.y / side,
            tr: (b.x + b.w) / side,
            tb: (b.y + b.h) / side
        }
        const ending = /\d+$/.exec(k);
        if (!ending) {
            out[k] = value;
        } else {
            const k2 = k.substring(0, k.length - ending[0].length)
            out[k2] = out[k2] || [];
            out[k2][Number(ending[0])] = value;
        }
    }
    return out;
}

async function emitImages() {

    const [bindings, atlas, side] = await packImages();

    fs.writeFileSync("dist/atlas.png", atlas);

    // Hack: for now, expose data as an array of constants ; this
    // will later be packed together with the JS file. 
    const asData = "window.atlas = new Uint8Array([" 
        + (new Uint8Array(atlas).map(b => b.toString()).join(","))
        + "])";
    fs.writeFileSync("dist/atlas.js", asData);

    const spriteType = `export type Sprite = Float32Array
export const w = 0;
export const h = 1;
export const tt = 2;
export const tl = 3;
export const tr = 4;
export const tb = 5;
`

    const bounds = mergeBindings(bindings, side);
    
    function toArray(bb) {
        return "new Float32Array([" + 
            [bb.w, bb.h, bb.tt, bb.tl, bb.tr, bb.tb].join(",")
            + "])";
    }

    const exportsStr = Object.keys(bounds).map(k => {
        const b = bounds[k];
        let s = "export const " + k + " : Sprite" + 
            (b.hasOwnProperty("length") ? "[]" : "") + 
            " = ";
        if (b.hasOwnProperty("length")) {
            let prev = "[";
            for (let bb of b) {
                s += prev + toArray(bb);;
                prev = ",";
            }
            s += "];\n";
        } else {
            s +=toArray(b) + ";\n";
        }
        return s;
    }).join("");

    fs.writeFileSync("src/sprites.ts", spriteType + "\n" + exportsStr);
}

emitImages();

// Sound =====================================================================

function loadSounds() {

    const sounds = {};
    const dir = fs.opendirSync("snd")
    while (true) {

        const next = dir.readSync();
        if (!next) break;

        if (!next.isFile()) continue;
        if (!/mp3$/.test(next.name)) continue;

        const path = "snd/" + next.name;
        const buf = fs.readFileSync(path);

        const id = next.name.replace(".mp3", "");
        sounds[id] = buf;
    }

    return sounds;
}

async function emitSounds() {

    const sounds = loadSounds();

    let accum = "window.sounds = {";

    for (let k of Object.keys(sounds)) {
        const sound = sounds[k];
        accum += "'" + k + "': new Uint8Array([";
        accum += new Uint8Array(sound).map(b => b.toString()).join(",");
        accum += "]),";
    }

    accum += "};"

    fs.writeFileSync("dist/sounds.js", accum);

    let loaded = "export const ac = new AudioContext();";
    
    for (let k of Object.keys(sounds)) {
        loaded += "export const " + k + " = ac.decodeAudioData(" + 
            "(window as unknown as {sounds: {" + k + ": Uint8Array}}).sounds." + k + 
            ".buffer)\n";
    }

    fs.writeFileSync("src/sounds.ts", loaded);
}

emitSounds();

// Levels ====================================================================

function loadLevels() {
    let count = 0;
    const levels = {}
    const dir = fs.opendirSync("levels")
    while (true)
    {
        const next = dir.readSync();
        if (!next) break;

        if (!next.isFile()) continue;

        const path = "levels/" + next.name;
        const buf = fs.readFileSync(path);

        const id = next.name.replace(".dlg", "");
        levels[id] = buf;
        ++count;
    }

    return {levels, count};
}

function emitLevels() {

    const {levels, count} = loadLevels();
    
    let accum = "window.levels = [";

    for (let n = 0; n < count; ++n) {
        const level = levels["level" + (n + 1)];
        accum += "new Uint8Array([";
        accum += new Uint8Array(level).map(b => b.toString()).join(",");
        accum += "]),";
    }

    accum += "];"

    fs.writeFileSync("dist/levels.js", accum);
}

emitLevels();