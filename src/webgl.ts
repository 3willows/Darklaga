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
attribute vec4 aVertexPosition;
void main() {
    gl_Position = vec4(
        (aVertexPosition.x / 120.0) - 1.0, 
        1.0 - (aVertexPosition.y / 160.0), 
        1.0, 
        1.0);
}
`);

const pixelShader = compileShader(gl.FRAGMENT_SHADER, `
void main() {
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
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
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition")
        }
    }

}());

export function drawSprite(sprite: Sprite, x: number, y: number) {

    // Allocate and fill buffer
    const buf = gl.createBuffer();
    if (!buf) throw "Could not allocate buffer";

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    const x2 = x + sprite.w;
    const y2 = y + sprite.h;

    const positions = new Float32Array([
        x, y,   x2, y2,   x, y2,
        x, y,   x2, y2,   x2, y   ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Render buffer
    gl.useProgram(program.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(
        program.attribLocations.vertexPosition,
        /* size */ 2,
        /* type */ gl.FLOAT,
        /* normalize */ false,
        /* stride */ 0,
        /* offset */ 0);

    gl.enableVertexAttribArray(program.attribLocations.vertexPosition);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function startRender() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

export function endRender() {
    ;    
}
