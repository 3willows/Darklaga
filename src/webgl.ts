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

export function render() {
    // BLUE SCREEN OF NOT IMPLEMENTED
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}
