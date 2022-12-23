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

// Vertex shader converts (X, Y) pixel positions, starting
// at (0,0) top left and ending at (240, 320), to OpenGL 
// positions starting at (-1, -1) bottom left and ending
// at (1, 1).
const vertexShader = compileShader(gl.VERTEX_SHADER, `
attribute vec2 aVertexPosition;
attribute vec2 aTexCoord;
varying highp vec2 vTexCoord;
void main() {
    gl_Position = vec4(
        (aVertexPosition.x / 120.0) - 1.0, 
        1.0 - (aVertexPosition.y / 160.0), 
        1.0, 
        1.0);
    vTexCoord = aTexCoord;
}
`);

const pixelShader = compileShader(gl.FRAGMENT_SHADER, `
varying highp vec2 vTexCoord;
uniform sampler2D uTexData;
void main() {
    gl_FragColor = texture2D(uTexData, vTexCoord);
}
`);

const program = (function() {
    
    const program = gl.createProgram();
    if (!program) throw "Could not create program";

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, pixelShader);
    gl.linkProgram(program);

    return {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
            texCoord: gl.getAttribLocation(program, "aTexCoord")
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
let spritesBatched = 0;

export function drawSprite(sprite: Sprite, x: number, y: number) {

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

    spritesBatched += 12;
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

    // Allocate and fill textures buffer
    const texturesBuf = gl.createBuffer();
    if (!texturesBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, texturesBuf);

    gl.bufferData(
        gl.ARRAY_BUFFER, 
        spriteTextures.subarray(0, spritesBatched), 
        gl.STATIC_DRAW);

    // Render buffer
    gl.useProgram(program.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);
    gl.vertexAttribPointer(
        program.attribLocations.vertexPosition,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(program.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, texturesBuf);
    gl.vertexAttribPointer(
        program.attribLocations.texCoord,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(program.attribLocations.texCoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.uniform1i(program.uniformLocations.texData, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, spritesBatched/2);

    gl.deleteBuffer(positionsBuf);
    gl.deleteBuffer(texturesBuf);

    spritesBatched = 0;
}

// TODO: implement additive blending ! 
// mul is 0..32
export function drawSpriteAdditive(sprite: Sprite, x: number, y: number, mul: number) {
    drawSprite(sprite, x, y)
}

export function startRender() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function endRender() {
    drawBatchedSprites();
}
