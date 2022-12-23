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

export function drawSprite(sprite: Sprite, x: number, y: number) {

    const {tt, tl, tr, tb, h, w} = sprite;
    
    // Allocate and fill positions buffer
    const positionsBuf = gl.createBuffer();
    if (!positionsBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuf);

    const x2 = x + w;
    const y2 = y + h;

    const positions = new Float32Array([
        x, y,   x2, y2,   x, y2,
        x, y,   x2, y2,   x2, y   ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Allocate and fill textures buffer
    const texturesBuf = gl.createBuffer();
    if (!texturesBuf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, texturesBuf);

    const textures = new Float32Array([
        tl, tt,   tr, tb,   tl, tb,
        tl, tt,   tr, tb,   tr, tt   ]);

    gl.bufferData(gl.ARRAY_BUFFER, textures, gl.STATIC_DRAW);

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

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteBuffer(positionsBuf);
    gl.deleteBuffer(texturesBuf);
}

export function startRender() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function endRender() {
    ;
}
