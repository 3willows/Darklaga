const fs = require("fs");

const darklagaJs = fs.readFileSync("dist/darklaga.js").toString();
const atlasJs = fs.readFileSync("dist/atlas.js").toString();
const soundsJs = fs.readFileSync("dist/sounds.js").toString();
const levelsJs = fs.readFileSync("dist/levels.js").toString();

let data = [];
let offset = 0;

const [darklagaJs2, levelsJs2, soundsJs2, atlasJs2] = [darklagaJs, levelsJs, soundsJs, atlasJs].map(js =>
{
    return js.replace(/new (Uint8Array|Float32Array)\((\[[0-9., ]+\])\)/g, (m, arrayType, json) => {

        const values = JSON.parse(json);
        const array = arrayType == "Uint8Array" 
            ? new Uint8Array(values).buffer
            : new Float32Array(values).buffer;

        const start = offset;
        data.push([offset, array]);
        offset += array.byteLength;
        const len = offset - start;
        while (offset % 4) ++offset;

        return arrayType == "Uint8Array" 
            ? "u8(0x" + start.toString(16) + "," + len.toFixed() + ")" 
            : "f32(0x" + start.toString(16) + "," + (len >> 2).toFixed() + ")";
    });
});

const outJs = atlasJs2+";"+soundsJs2+";"+levelsJs2+";"+darklagaJs2;
const outJsBin = Buffer.from(outJs);

const len = outJsBin.byteLength;

let startOff = len + 4;
while (startOff % 4) ++startOff;

const completeFileLen = startOff + offset + 4;
const completeFile = new Uint8Array(completeFileLen);

completeFile[0] = len & 0xFF;
completeFile[1] = (len >> 8) & 0xFF;
completeFile[2] = (len >> 16) & 0xFF;

completeFile.set(outJsBin, 4);

for (let [off, bin] of data) {
    completeFile.set(new Uint8Array(bin), off + startOff);
}

fs.writeFileSync("dist/darklaga.bin", completeFile);
fs.writeFileSync("dist/bin.js", outJs);
