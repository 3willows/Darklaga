import * as GL from "./webgl"
import * as Player from "./player"
import * as Shot from "./shot"
import * as Background from "./background"
import * as Enemy from "./enemy"
import * as Dan from "./dan"
import * as Pickup from "./pickup"
import * as Hud from "./hud"
import { Sweep } from "enemy.types"

// Rendering happens every time requestAnimationFrame() triggers.
function render() {
    GL.startRender();
    Background.render();
    Enemy.render();
    Shot.render();
    Pickup.render();
    Player.render();
    Dan.render();
    Hud.render();
    GL.endRender();
}

// Simulation is based on a fixed-duration step
const stepDurationMilliseconds = 16.666; 
function step() {
    Background.step();
    Enemy.step();
    Shot.step();
    Player.step();
    Pickup.step();
    Hud.step();
    Dan.step();

    if (Enemy.count() == 0) {        
        for (var i = 0; i < 6; ++i) {
            Enemy.add(new Sweep(256 + 256*i, 256, "n", [1]));
            Enemy.add(new Sweep(256 + 256*i, 512, "n", [1]));
            Enemy.add(new Sweep(256 + 256*i, 768, "d", [1]));
            Enemy.add(new Sweep(256 + 256*i, 1024, "v", [1]));
        }
    }
}

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
