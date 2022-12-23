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

async function tryPack(images, w) {

    let atlas = sharp({
        create: {
            width: w,
            height: w,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const bindings = {};
    const composites = [];

    let y = 0;
    let x = 0;
    let maxY = 0;

    for (let path in images) {
        
        const img = images[path]

        if (img.meta.width + x > w) {
            x = 0;
            y = maxY;
        }

        if (img.meta.height + y > w) 
            return null;

        composites.push({ input: img.path, left: x, top: y });

        bindings[path] = {
            x, 
            y, 
            w: img.meta.width,
            h: img.meta.height
        }

        x += img.meta.width;
        maxY = Math.max(maxY, y + img.meta.height);
    }

    atlas = atlas.composite(composites)
                 .png({compressionLevel: 9, palette: true});

    return [bindings, await atlas.toBuffer()];
}

async function packImages() {

    const images = await loadImages();

    for (let w = 128; w < 4096; w *= 2) {
        const pack = await tryPack(images, w);
        if (pack) return [pack[0], pack[1], w];
    }
}

async function emit() {

    const [bounds, atlas, w] = await packImages();

    fs.writeFileSync("dist/atlas.png", atlas);

    // Hack: for now, expose data as an array of constants ; this
    // will later be packed together with the JS file. 
    const asData = "window.atlas = new Uint8Array([" 
        + (new Uint8Array(atlas).map(b => b.toString()).join(","))
        + "])";
    fs.writeFileSync("dist/atlas.js", asData);

    const boundsStr = Object.keys(bounds).map(k => {
        const b = bounds[k];
        return "export const " + k + " : Sprite = " + JSON.stringify({
            w: b.w,
            h: b.h,
            tl: b.x / w,
            tt: b.y / w,
            tr: (b.x + b.w - 1) / w,
            tb: (b.y + b.h - 1) / w
        }) + ";\n"
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
