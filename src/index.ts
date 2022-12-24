import * as GL from "./webgl"
import * as Player from "./player"
import * as Shot from "./shot"
import * as Background from "./background"
import * as Enemy from "./enemy"
import { Suicide } from "enemy.types"

// Rendering happens every time setInterval() triggers.
function render() {
    GL.startRender();
    Background.render();
    Shot.render();
    Enemy.render();
    Player.render();
    GL.endRender();
}

// Simulation is based on a fixed-duration step
const stepDurationMilliseconds = 16.666; 
function step() {
    Background.step();
    Shot.step();
    Enemy.step();
    Player.step();
}

Enemy.add(new Suicide(256, 256));

Enemy.add(new Suicide(512, 256));

Enemy.add(new Suicide(768, 256));

Enemy.add(new Suicide(1024, 256));

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
