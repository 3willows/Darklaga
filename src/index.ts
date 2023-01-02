import * as GL from "./webgl"
import * as Player from "./player"
import * as Shot from "./shot"
import * as Background from "./background"
import * as Enemy from "./enemy"
import * as Dan from "./dan"
import { Warp2 } from "enemy.types"

// Rendering happens every time setInterval() triggers.
function render() {
    GL.startRender();
    Background.render();
    Shot.render();
    Enemy.render();
    Player.render();
    Dan.render();
    GL.endRender();
}

// Simulation is based on a fixed-duration step
const stepDurationMilliseconds = 16.666; 
function step() {
    Background.step();
    Shot.step();
    Enemy.step();
    Player.step();
    Dan.step();
}

Enemy.add(new Warp2(256, 256, "n"));

Enemy.add(new Warp2(512, 512, "n"));

Enemy.add(new Warp2(768, 768, "d"));

Enemy.add(new Warp2(1024, 1024, "v"));

export function run() {
    let nextFrame = +new Date();

    function frame() {
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

        requestAnimationFrame(frame);
    }
    
    requestAnimationFrame(frame);

}
