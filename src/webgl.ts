import * as S from "./sprites"

// Global rendering context used by all methods in this module
const gl : WebGLRenderingContext = (function() {
    
    const canvas = document.getElementById("gl") as HTMLCanvasElement; 
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});

    if (gl == null) {
        alert("WebGL is not supported by your browser, or could not be initialized");
        throw "WebGL not supported"
    }

    return gl;

}());

function compileShader(type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw "Could not allocate shader";
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(
            "An error occurred compiling the shaders: %o",
            gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw "Could not compile shader";
    }

    return shader;
}

let statAvgDur = 0
let statFrameStart = +new Date()
let statBatches = 0
let statPolys = 0
let statBytes = 0
let statCurrentSecond = 0
let statCurrentFrames = 0
let statLastFrames = 0

// COLORED POLYGONS ==========================================================

// Shader for drawing untextured, colored polygons. 
const colorProgram = (function() {

    // Vertex shader converts (X, Y) pixel positions, starting
    // at (0,0) top left and ending at (240, 320), to OpenGL 
    // positions starting at (-1, -1) bottom left and ending
    // at (1, 1).
    const vertexShader = compileShader(gl.VERTEX_SHADER, `
attribute vec2 aVertexPosition;
attribute vec3 aVertexColor;
attribute vec2 aAlphas;
varying highp vec2 vAlphas;
varying highp vec3 vColor;
void main() {
    gl_Position = vec4(
        (aVertexPosition.x / 120.0) - 1.0, 
        1.0 - (aVertexPosition.y / 160.0), 
        1.0, 
        1.0);
    vColor = aVertexColor;
    vAlphas = aAlphas;
}
`);

    const pixelShader = compileShader(gl.FRAGMENT_SHADER, `
varying highp vec2 vAlphas;
varying highp vec3 vColor;
void main() {
    gl_FragColor = vec4(
        vColor.r * vAlphas.y,
        vColor.g * vAlphas.y,
        vColor.b * vAlphas.y,
        vAlphas.x);
}
`);

    const program = gl.createProgram();
    if (!program) throw "Could not create program";

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, pixelShader);
    gl.linkProgram(program);

    return {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(program, "aVertexColor"),
            alphas: gl.getAttribLocation(program, "aAlphas") 
        }
    }

}());

// To minimize the number of WebGL calls, batch together renderings of the
// same type: up to 1000 triangles.
const coloredPositions = new Float32Array(6000);
const coloredColors    = new Float32Array(9000);
const coloredAlphas    = new Float32Array(6000);
let coloredBatched     = 0;

// Points are given as [x1, y1, x2, y2, ...] and there are at least 3 of them. Assumed
// to be given in order around the polygon, so they will be transformed into triangles
// with points (0,1,2) (0,2,3) .. (0,N-1,N)
export function drawPoly(points: number[], r: number, g: number, b: number, ax: number, ay: number) {

    // Just in case, draw any accumulated batches of the other types
    if (spritesBatched) drawBatchedSprites();

    function point(x: number, y: number) {
        coloredPositions[2 * coloredBatched + 0] = x
        coloredPositions[2 * coloredBatched + 1] = y
        coloredColors[3 * coloredBatched + 0] = r
        coloredColors[3 * coloredBatched + 1] = g
        coloredColors[3 * coloredBatched + 2] = b
        coloredAlphas[2 * coloredBatched + 0] = ax
        coloredAlphas[2 * coloredBatched + 1] = ay
        ++coloredBatched;
    }

    for (let i = 1; i < points.length/2 - 1; ++i)
    {
        point(points[0], points[1]);
        point(points[2*i], points[2*i+1]);
        point(points[2*i+2], points[2*i+3]);
    }
}

export function drawPolyAdditive(points: number[], r: number, g: number, b: number, a: number) {
    drawPoly(points, r, g, b, 0, a)
}

export function drawRectAdditive(
    x: number, y: number, w: number, h: number,
    r: number, g: number, b: number, a: number)
{
    drawPoly([
        x  , y  , 
        x  , y+h, 
        x+w, y+h, 
        x+w, y
    ], r, g, b, 0, a);    
}

export function drawRect(
    x: number, y: number, w: number, h: number,
    r: number, g: number, b: number, a: number)
{
    drawPoly([
        x  , y  , 
        x  , y+h, 
        x+w, y+h, 
        x+w, y
    ], r, g, b, a, a);    
}

function drawBatchedColored() {

    if (!coloredBatched) return;

    // Allocate and fill positions buffer
    const positionsBuf = gl.createBuffer();
    if (!positionsBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        coloredPositions.subarray(0, 2*coloredBatched), 
        gl.STATIC_DRAW);

    statBytes += 2 * coloredBatched * 4;

    // Allocate and fill colors buffer
    const colorsBuf = gl.createBuffer();
    if (!colorsBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        coloredColors.subarray(0, 3*coloredBatched), 
        gl.STATIC_DRAW);

    statBytes += 2 * coloredBatched * 4;
    
    // Allocate and fill alphas buffer
    const alphasBuf = gl.createBuffer();
    if (!alphasBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, alphasBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        coloredAlphas.subarray(0, 2*coloredBatched), 
        gl.STATIC_DRAW);

    statBytes += 2 * coloredBatched * 4;

    // Render buffer
    gl.useProgram(colorProgram.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);
    gl.vertexAttribPointer(
        colorProgram.attribLocations.vertexPosition,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(colorProgram.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuf);
    gl.vertexAttribPointer(
        colorProgram.attribLocations.vertexColor,
        /* size */ 3,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(colorProgram.attribLocations.vertexColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, alphasBuf);
    gl.vertexAttribPointer(
        colorProgram.attribLocations.alphas,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(colorProgram.attribLocations.alphas);

    // We use gl.ONE for the source and have our fragment shader produce
    // pre-multipled alpha ; this lets us support both normal alpha 
    // blending (with pre-multiplied alpha) and additive blending (set 
    // fragment alpha to 0, but leave color channel alone).
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, coloredBatched);

    statPolys += coloredBatched/3;
    statBatches += 1;

    gl.deleteBuffer(positionsBuf);
    gl.deleteBuffer(colorsBuf);
    gl.deleteBuffer(alphasBuf);

    coloredBatched = 0;
}

// SPRITES ===================================================================

// Shader for drawing sprites.
const spriteProgram = (function() {

    // Vertex shader converts (X, Y) pixel positions, starting
    // at (0,0) top left and ending at (240, 320), to OpenGL 
    // positions starting at (-1, -1) bottom left and ending
    // at (1, 1).
    // 
    // It also transfers to the pixel shader: 
    //  - the polygon alpha channels (identical for all three vertices of a triangle)
    //  - the texture coordinates
    const vertexShader = compileShader(gl.VERTEX_SHADER, `
attribute vec2 aVertexPosition;
attribute vec4 aTexCoord;
attribute vec2 aAlphas;
varying highp vec4 vTexCoord;
varying highp vec2 vAlphas;
void main() {
    gl_Position = vec4(
        (aVertexPosition.x / 120.0) - 1.0, 
        1.0 - (aVertexPosition.y / 160.0), 
        1.0, 
        1.0);
    vTexCoord = aTexCoord;
    vAlphas = aAlphas;
}
`);

    // Most of the work in the shader is dealing with the two alpha 
    // channels, stored in `vAlphas.x` and `vAlphas.y`. The final formula
    // for blending the color of the sprite with the color of the buffer
    // is: 
    //   buffer * (1 - x) + sprite * y
    // For alpha-blending 'x = y' ; for additive-blending 'x = 0'.
    const pixelShader = compileShader(gl.FRAGMENT_SHADER, `
varying highp vec4 vTexCoord;
varying highp vec2 vAlphas;
uniform sampler2D uTexData;
void main() {
    lowp vec4 texColor1 = texture2D(uTexData, vec2(vTexCoord.x, vTexCoord.y));
    lowp vec4 texColor2 = texture2D(uTexData, vec2(vTexCoord.z, vTexCoord.w));
    // Pre-multiplied alpha
    gl_FragColor = vec4(
        texColor1.r * texColor1.a * texColor2.r * vAlphas.y,
        texColor1.g * texColor1.a * texColor2.g * vAlphas.y,
        texColor1.b * texColor1.a * texColor2.b * vAlphas.y,
        texColor1.a * vAlphas.x);
}
`);

    const program = gl.createProgram();
    if (!program) throw "Could not create program";

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, pixelShader);
    gl.linkProgram(program);

    return {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
            texCoord: gl.getAttribLocation(program, "aTexCoord"),
            alphas: gl.getAttribLocation(program, "aAlphas")
        },
        uniformLocations: {
            texData: gl.getUniformLocation(program, "uTexData")
        }
    }

}());

// Texture atlas: a single texture that contains all the sprites
const atlas = (function() {

    const texture = gl.createTexture();

    // Expect the atlas to be already loaded as 'window.atlas' as a 
    // PNG file exposed as an Uint8Array
    
    const atlasData = (window as unknown as {atlas: Uint8Array}).atlas;
    const atlasUrl = URL.createObjectURL(new Blob([atlasData], {type: "image/png"}));

    // There is no synchronous API to load an in-memory PNG, so we 
    // create a temporary 1-pixel texture which will be replaced 
    // with the actual atlas once it is loaded.

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        /* level          */ 0,
        /* internalFormat */ gl.RGBA,
        /* width          */ 1,
        /* height         */ 1,
        /* border         */ 0,
        /* format         */ gl.RGBA,
        /* type           */ gl.UNSIGNED_BYTE,
        /* pixels         */ new Uint8Array([0, 0, 0, 255]));

    // Asynchronous image loading. 

    const image = new Image();
    image.onload = e => {
        //URL.revokeObjectURL(atlasUrl);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            /* level          */ 0,
            /* internalFormat */ gl.RGBA,
            /* format         */ gl.RGBA,
            /* type           */ gl.UNSIGNED_BYTE,
            /* pixels         */ image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    };

    image.src = atlasUrl; 

    return texture;
}())

// We try to batch as many sprite renders as possible
// together. At 12 values per sprite, our batches contain
// 1000 sprites each.
const maxSpriteData   = 12000;
const spritePositions = new Float32Array(maxSpriteData);
const spriteTextures  = new Float32Array(2*maxSpriteData);
const spriteAlphas    = new Float32Array(maxSpriteData);
let spritesBatched    = 0;

function drawSpriteRaw(
    sprite: S.Sprite, 
    mult: S.Sprite,
    x: number, y: number,
    srca: number, dsta: number, 
    angle: number) {

    if (coloredBatched) drawBatchedColored();

    const [w, h, tt, tl, tr, tb] = sprite;
    const [ ,  , mt, ml, mr, mb] = mult;

    // A --- B
    // |     |
    // |     |
    // D --- C

    let rax: number, ray: number, 
        rbx: number, rby: number,
        rcx: number, rcy: number,
        rdx: number, rdy: number;

    if (angle == 0) {
        rax = x;
        ray = y;
        rbx = x + w;
        rby = y;
        rcx = rbx;
        rcy = y + h;
        rdx = x;
        rdy = rcy;
    } else {

        // Find center of rotation.
        const cx = x + w/2, cy = y + w/2;

        const xrotx = Math.cos(angle);
        const xroty = Math.sin(angle);

        const yrotx = -xroty;
        const yroty = xrotx;

        rax = cx + (- w/2 * xrotx - h/2 * yrotx);
        ray = cy + (- w/2 * xroty - h/2 * yroty);
        
        rbx = cx + (+ w/2 * xrotx - h/2 * yrotx);
        rby = cy + (+ w/2 * xroty - h/2 * yroty);
        
        rcx = cx + (+ w/2 * xrotx + h/2 * yrotx);
        rcy = cy + (+ w/2 * xroty + h/2 * yroty);
        
        rdx = cx + (- w/2 * xrotx + h/2 * yrotx);
        rdy = cy + (- w/2 * xroty + h/2 * yroty);
    }

    // First triangle
    spritePositions[spritesBatched +  0] = rax;
    spritePositions[spritesBatched +  1] = ray;
    spritePositions[spritesBatched +  2] = rcx;
    spritePositions[spritesBatched +  3] = rcy;
    spritePositions[spritesBatched +  4] = rdx;
    spritePositions[spritesBatched +  5] = rdy;

    spriteTextures[2*spritesBatched +  0] = tl;
    spriteTextures[2*spritesBatched +  1] = tt;
    spriteTextures[2*spritesBatched +  2] = ml;
    spriteTextures[2*spritesBatched +  3] = mt;
    spriteTextures[2*spritesBatched +  4] = tr;
    spriteTextures[2*spritesBatched +  5] = tb;
    spriteTextures[2*spritesBatched +  6] = mr;
    spriteTextures[2*spritesBatched +  7] = mb;
    spriteTextures[2*spritesBatched +  8] = tl;
    spriteTextures[2*spritesBatched +  9] = tb;
    spriteTextures[2*spritesBatched + 10] = ml;
    spriteTextures[2*spritesBatched + 11] = mb;

    // Second triangle
    spritePositions[spritesBatched +  6] = rax;
    spritePositions[spritesBatched +  7] = ray;
    spritePositions[spritesBatched +  8] = rcx;
    spritePositions[spritesBatched +  9] = rcy;
    spritePositions[spritesBatched + 10] = rbx;
    spritePositions[spritesBatched + 11] = rby;
    
    spriteTextures[2*spritesBatched + 12] = tl;
    spriteTextures[2*spritesBatched + 13] = tt;
    spriteTextures[2*spritesBatched + 14] = ml;
    spriteTextures[2*spritesBatched + 15] = mt;
    spriteTextures[2*spritesBatched + 16] = tr;
    spriteTextures[2*spritesBatched + 17] = tb;
    spriteTextures[2*spritesBatched + 18] = mr;
    spriteTextures[2*spritesBatched + 19] = mb;
    spriteTextures[2*spritesBatched + 20] = tr;
    spriteTextures[2*spritesBatched + 21] = tt;
    spriteTextures[2*spritesBatched + 22] = mr;
    spriteTextures[2*spritesBatched + 23] = mt;

    // Additional alpha channels
    for (let i = 0; i < 12; i += 2) {
        spriteAlphas[spritesBatched + i] = dsta;
        spriteAlphas[spritesBatched + i + 1] = srca;
    }

    spritesBatched += 12;
}

export function drawSprite(sprite: S.Sprite, x: number, y: number) {
    drawSpriteRaw(sprite, S.texwhite, x, y, 1, 1, 0)
}

export function drawSpriteAngle(sprite: S.Sprite, x: number, y: number, angle: number) {
    drawSpriteRaw(sprite, S.texwhite, x, y, 1, 1, angle)
}

// Draw all sprites accumulated into the current batch 
function drawBatchedSprites() {

    if (!spritesBatched) 
        return;

    // Allocate and fill positions buffer
    const positionsBuf = gl.createBuffer();
    if (!positionsBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        spritePositions.subarray(0, spritesBatched), 
        gl.STATIC_DRAW);

    statBytes += spritesBatched * 4;

    // Allocate and fill textures buffer
    const texturesBuf = gl.createBuffer();
    if (!texturesBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, texturesBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        spriteTextures.subarray(0, 2*spritesBatched), 
        gl.STATIC_DRAW);

    statBytes += spritesBatched * 8;

    // Allocate and fill alphas buffer
    const alphasBuf = gl.createBuffer();
    if (!alphasBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, alphasBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        spriteAlphas.subarray(0, spritesBatched), 
        gl.STATIC_DRAW);

    statBytes += spritesBatched * 4;
    
    // Render buffer
    gl.useProgram(spriteProgram.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);
    gl.vertexAttribPointer(
        spriteProgram.attribLocations.vertexPosition,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(spriteProgram.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, texturesBuf);
    gl.vertexAttribPointer(
        spriteProgram.attribLocations.texCoord,
        /* size */ 4,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(spriteProgram.attribLocations.texCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, alphasBuf);
    gl.vertexAttribPointer(
        spriteProgram.attribLocations.alphas,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(spriteProgram.attribLocations.alphas);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.uniform1i(spriteProgram.uniformLocations.texData, 0);

    // We use gl.ONE for the source and have our fragment shader produce
    // pre-multipled alpha ; this lets us support both normal alpha 
    // blending (with pre-multiplied alpha) and additive blending (set 
    // fragment alpha to 0, but leave color channel alone).
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, spritesBatched/2);

    statPolys += spritesBatched/6;
    statBatches += 1;

    gl.deleteBuffer(positionsBuf);
    gl.deleteBuffer(texturesBuf);

    spritesBatched = 0;
}

// mul is 0..32
export function drawSpriteAdditive(sprite: S.Sprite, x: number, y: number, mul: number) {
    drawSpriteRaw(sprite, S.texwhite, x, y, (mul / 32), 0, 0);
}

// mul is 0..32
export function drawSpriteAlpha(sprite: S.Sprite, x: number, y: number, mul: number) {
    drawSpriteRaw(sprite, S.texwhite, x, y, (mul / 32), (mul / 32), 0);
}

// Use 'fontmap[s.charCodeAt(i)]' to get the sprite for character i. 
const fontmap = (function(){
    const s = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}'
    const a : number[] = [];
    for (let i = 0; i < s.length; ++i)
        a[s.charCodeAt(i)] = i;
    return a;
}());

export function drawText(
    text: string, 
    font: S.Sprite[], 
    texture: S.Sprite, 
    x: number, 
    y: number, 
    srca: number, 
    dsta: number)
{
    const [h, w, tt, tl, tr, tb] = texture;
    const tpw = (tr - tl)/w;
    const tph = (tb - tt)/h;

    // Mutable texture used to pass in the actual values.
    let tex = new Float32Array([
        0, 0, tt, tl, 0, 0
    ]);

    for (let i = 0; i < text.length; ++i) {
        
        const s = fontmap[text.charCodeAt(i)];
        
        if (typeof s !== "number") {
            // For unknown characters (including whitespace), 
            // skip ahead by width of '-' character 
            x += font[45][S.w] - 1; 
            continue;     
        }

        const letter = font[s];
        const [lw, lh, ltt, ltl, ltr, ltb] = letter;
        
        tex[S.tr] = lw >= w ? tr : tl + tpw * lw;
        tex[S.tb] = lh >= h ? tb : tt + tph * lh;
        
        drawSpriteRaw(letter, tex, x, y, srca, dsta, 0);
        
        x += letter[S.w] - 1;
    }
}

// Measure the width of a piece of text, in pixels
export function measureText(text: string, font: S.Sprite[]) {
    
    let x = 0;
    for (let i = 0; i < text.length; ++i) {
        
        let s = fontmap[text.charCodeAt(i)];
        
        // For unknown characters (including whitespace), 
        // use width of '-' character 
        if (typeof s !== "number") s = 45;
        
        x += font[s][S.w] - 1;
    }

    return x;
}

// GENERAL ===================================================================

export function startRender() {
    statFrameStart = +new Date();
}

export function clear() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function endRender() {
    drawBatchedSprites();
    drawBatchedColored();

    
    const now = +new Date();
    const dur = now - statFrameStart;

    const nowSec = Math.floor(now / 1000);
    if (nowSec > statCurrentSecond) {
        statLastFrames = statCurrentFrames / (nowSec - statCurrentSecond);
        statCurrentFrames = 0;
        statCurrentSecond = nowSec;
    }

    ++statCurrentFrames;

    statAvgDur = 0.9 * statAvgDur + 0.1 * dur;
    document.getElementById("log")!.innerText =
        dur.toFixed() + " ms (avg " + statAvgDur.toFixed(2) + " ms) " + 
        statLastFrames + " FPS\n" +  
        statBatches.toFixed() + " batches\n" +
        statPolys.toFixed() + " triangles\n" + 
        (statBytes / 1024).toFixed(1) + " KB\n" + 
        window.innerWidth.toFixed() + " x " + window.innerHeight.toFixed();

    statBatches = 0
    statPolys = 0
    statBytes = 0
}
