import * as GL from "./webgl"
import * as Player from "./player"

// Rendering happens every time setInterval() triggers.
function render() {
    GL.startRender();
    Player.render();
    GL.endRender();
}

// Simulation is based on a fixed-duration step
const stepDurationMilliseconds = 16.666; 
function step() {
    Player.step();
}

export function run() {
    let nextFrame = +new Date();

    setInterval(function() {

        const now = +new Date();
        
        if (now - nextFrame > 10000) 
            // The simulation is lagging more than 10 seconds,
            // give up on catching up: this was probably because
            // the tab was out-of-focus. 
            nextFrame = now;

        // Step based on actual time elapsed, rather than expecting
        // setInterval to be precise. 
        while (now > nextFrame) {
            step();
            nextFrame += stepDurationMilliseconds;
        } 

        // Render once per wake-up
        render();

    }, stepDurationMilliseconds/2);

}
