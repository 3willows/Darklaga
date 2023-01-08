const fs = require("fs");
const sharp = require("sharp");

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
        .png({compressionLevel: 9, palette: true});

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

async function emit() {

    const [bindings, atlas, side] = await packImages();

    fs.writeFileSync("dist/atlas.png", atlas);

    // Hack: for now, expose data as an array of constants ; this
    // will later be packed together with the JS file. 
    const asData = "window.atlas = new Uint8Array([" 
        + (new Uint8Array(atlas).map(b => b.toString()).join(","))
        + "])";
    fs.writeFileSync("dist/atlas.js", asData);

    const bounds = mergeBindings(bindings, side);
    const boundsStr = Object.keys(bounds).map(k => {
        const b = bounds[k];
        return "export const " + k + " : Sprite" + 
            (b.hasOwnProperty("length") ? "[]" : "") + 
            " = " + JSON.stringify(b, null, 4) + ";\n"
    }).join("");

    const sprites = `export type Sprite = {
    w: number, 
    h: number, 
    tt: number, 
    tl: number, 
    tr: number, 
    tb: number 
}`
    fs.writeFileSync("src/sprites.ts", sprites + "\n" + boundsStr);
}

emit();
