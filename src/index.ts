import * as GL from "./webgl"
import * as Player from "./player"
import * as Shot from "./shot"
import * as Background from "./background"
import * as Enemy from "./enemy"
import * as Dan from "./dan"
import { Static } from "enemy.types"

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

Enemy.add(new Static(256, -480, "n", [3]));

Enemy.add(new Static(256, -360, "n", [3]));

Enemy.add(new Static(256, -240, "d", [3]));

Enemy.add(new Static(256, -120, "v", [3]));

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
