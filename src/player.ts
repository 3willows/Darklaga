import * as GL from "./webgl"
import { SHIPSTR } from "./sprites"

type Player = {

    x: number
    y: number
    x_speed: number
    y_speed: number
    r_x_speed: number;
    r_y_speed: number;
    controllable: boolean
    cooldown: number
    shooting: number
    muzzle_flash: number
    timer: number
    mousedown: number
    anim: number
    modules1: number
    modules2: number
    
    // X-axis rotation level, [-20, 20]
    distance: number
}

const player : Player = {
    x: 880,
    y: 1960,
    x_speed: 0,
    y_speed: 0,
    controllable: false,
    r_x_speed: 0,
    r_y_speed: 0,
    cooldown: 0,
    shooting: 0,
    muzzle_flash: 0,
    timer: 0,
    mousedown: 0,
    anim: 0,
    modules1: 0,
    modules2: 0,
    distance: 0
}

export function step() {
}

export function render() {
    
    const {x, y, distance} = player;
    const frame = distance < -10 ? 0 :
                  distance < 0 ? 1 : 
                  distance == 0 ? 2 : 
                  distance <= 10 ? 3 : 4;

    GL.drawSprite(SHIPSTR[frame], x >> 3, y >> 3);
}