import type { Sprite } from "./sprites"

// Global rendering context used by all methods in this module
const gl : WebGLRenderingContext = (function() {
    
    const canvas = document.getElementById("gl") as HTMLCanvasElement; 
    const gl = canvas.getContext("webgl");

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
attribute vec4 aVertexColor;
varying lowp vec4 vColor;
void main() {
    gl_Position = vec4(
        (aVertexPosition.x / 120.0) - 1.0, 
        1.0 - (aVertexPosition.y / 160.0), 
        1.0, 
        1.0);
    vColor = aVertexColor;
}
`);

    const pixelShader = compileShader(gl.FRAGMENT_SHADER, `
varying lowp vec4 vColor;
void main() {
    gl_FragColor = vColor;
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
            texCoord: gl.getAttribLocation(program, "aVertexColor")
        }
    }

}());

// To minimize the number of WebGL calls, batch together renderings of the
// same type: up to 1000 triangles.
const coloredPositions = new Float32Array(6000);
const coloredColors    = new Float32Array(12000);
let coloredBatched     = 0;

// Points are given as [x1, y1, x2, y2, ...] and there are at least 3 of them. Assumed
// to be given in order around the polygon, so they will be transformed into triangles
// with points (0,1,2) (0,2,3) .. (0,N-1,N)
export function drawPolyAdditive(points: number[], r: number, g: number, b: number, a: number) {

    // Just in case, draw any accumulated batches of the other types
    if (spritesBatched) drawBatchedSprites();

    function point(x: number, y: number) {
        coloredPositions[2 * coloredBatched + 0] = x
        coloredPositions[2 * coloredBatched + 1] = y
        coloredColors[4 * coloredBatched + 0] = r
        coloredColors[4 * coloredBatched + 1] = g
        coloredColors[4 * coloredBatched + 2] = b
        coloredColors[4 * coloredBatched + 3] = a
        ++coloredBatched;
    }

    for (let i = 1; i < points.length/2 - 1; ++i)
    {
        point(points[0], points[1]);
        point(points[2*i], points[2*i+1]);
        point(points[2*i+2], points[2*i+3]);
    }
}

export function drawRectAdditive(
    x: number, y: number, w: number, h: number,
    r: number, g: number, b: number, a: number)
{
    drawPolyAdditive([
        x  , y  , 
        x  , y+h, 
        x+w, y+h, 
        x+w, y
    ], r, g, b, a);    
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
        coloredColors.subarray(0, 4*coloredBatched), 
        gl.STATIC_DRAW);

    statBytes += 4 * coloredBatched * 4;

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
        colorProgram.attribLocations.texCoord,
        /* size */ 4,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(colorProgram.attribLocations.texCoord);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.drawArrays(gl.TRIANGLES, 0, coloredBatched);

    statPolys += coloredBatched/3;
    statBatches += 1;

    gl.deleteBuffer(positionsBuf);
    gl.deleteBuffer(colorsBuf);

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
attribute vec2 aTexCoord;
attribute vec2 aAlphas;
varying highp vec2 vTexCoord;
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
varying highp vec2 vTexCoord;
varying highp vec2 vAlphas;
uniform sampler2D uTexData;
void main() {
    lowp vec4 texColor = texture2D(uTexData, vTexCoord);
    // Pre-multiplied alpha
    gl_FragColor = vec4(
        texColor.r * texColor.a * vAlphas.y,
        texColor.g * texColor.a * vAlphas.y,
        texColor.b * texColor.a * vAlphas.y,
        texColor.a * vAlphas.x);
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
const spriteTextures  = new Float32Array(maxSpriteData);
const spriteAlphas    = new Float32Array(maxSpriteData);
let spritesBatched    = 0;

function drawSpriteRaw(sprite: Sprite, x: number, y: number, srca: number, dsta: number) {

    if (coloredBatched) drawBatchedColored();

    const {tt, tl, tr, tb, h, w} = sprite;

    const x2 = x + w;
    const y2 = y + h;

    // First triangle
    spritePositions[spritesBatched +  0] = x;
    spritePositions[spritesBatched +  1] = y;
    spritePositions[spritesBatched +  2] = x2;
    spritePositions[spritesBatched +  3] = y2;
    spritePositions[spritesBatched +  4] = x;
    spritePositions[spritesBatched +  5] = y2;

    spriteTextures[spritesBatched +  0] = tl;
    spriteTextures[spritesBatched +  1] = tt;
    spriteTextures[spritesBatched +  2] = tr;
    spriteTextures[spritesBatched +  3] = tb;
    spriteTextures[spritesBatched +  4] = tl;
    spriteTextures[spritesBatched +  5] = tb;

    // Second triangle
    spritePositions[spritesBatched +  6] = x;
    spritePositions[spritesBatched +  7] = y;
    spritePositions[spritesBatched +  8] = x2;
    spritePositions[spritesBatched +  9] = y2;
    spritePositions[spritesBatched + 10] = x2;
    spritePositions[spritesBatched + 11] = y;
    
    spriteTextures[spritesBatched +  6] = tl;
    spriteTextures[spritesBatched +  7] = tt;
    spriteTextures[spritesBatched +  8] = tr;
    spriteTextures[spritesBatched +  9] = tb;
    spriteTextures[spritesBatched + 10] = tr;
    spriteTextures[spritesBatched + 11] = tt;

    // Additional alpha channels
    for (let i = 0; i < 12; i += 2) {
        spriteAlphas[spritesBatched + i] = dsta;
        spriteAlphas[spritesBatched + i + 1] = srca;
    }

    spritesBatched += 12;
}

export function drawSprite(sprite: Sprite, x: number, y: number) {
    drawSpriteRaw(sprite, x, y, 1, 1)
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
        spriteTextures.subarray(0, spritesBatched), 
        gl.STATIC_DRAW);

    statBytes += spritesBatched * 4;

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
        /* size */ 2,
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
export function drawSpriteAdditive(sprite: Sprite, x: number, y: number, mul: number) {
    drawSpriteRaw(sprite, x, y, (mul / 32), 0);
}

// mul is 0..32
export function drawSpriteAlpha(sprite: Sprite, x: number, y: number, mul: number) {
    drawSpriteRaw(sprite, x, y, (mul / 32), (mul / 32));
}

// GENERAL ===================================================================

export function startRender() {
    statFrameStart = +new Date();
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
        (statBytes / 1024).toFixed(1) + " KB"

    statBatches = 0
    statPolys = 0
    statBytes = 0
}
