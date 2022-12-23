import * as GL from "./webgl"

export function run() {

    setInterval(function() {
        console.log("Frame!")
        GL.render();
    }, 16);

}
