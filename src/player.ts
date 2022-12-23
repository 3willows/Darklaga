import * as GL from "./webgl"
import { player0, player1, player2, player3, player4 } from "./sprites"
import { key } from "./input"
import { options } from "./options"

type Player = {

    x: number
    y: number
    
    // Requested speed, changes based on inputs
    r_x_speed: number;
    r_y_speed: number;

    // Actual speed, tends towards requested speed
    x_speed: number
    y_speed: number

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
    controllable: true,
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

    const friction = options.ModPlayerFriction * options.ModPlayerFriction * 4;
    const speed = 5 + options.ModPlayerSpeed;

    // user input
    
    player.r_x_speed = 0;
    player.r_y_speed = 0;

    if (player.controllable) {

        if (key.up) {
            player.r_y_speed = -3*speed;
        } else if (key.down) {
            player.r_y_speed = 3*speed;
        }

        if (key.left) {
            player.r_x_speed = -3*speed;
            player.distance = Math.max(-20, player.distance - 3);
        } else if (key.right) {
            player.r_x_speed = 3*speed;
            player.distance = Math.min(20, player.distance + 3);
        }
    }

    // controlled movement

    function adjustSpeed(realSpeed: number, requestedSpeed: number) {
        if (requestedSpeed >= 0 && realSpeed > requestedSpeed) 
            return Math.max(requestedSpeed, realSpeed - friction);
        if (requestedSpeed <= 0 && realSpeed < requestedSpeed)
            return Math.max(requestedSpeed, realSpeed + friction);
        if (requestedSpeed < 0 && realSpeed > requestedSpeed)
            return Math.max(requestedSpeed, realSpeed - speed);
        if (requestedSpeed > 0 && realSpeed < requestedSpeed)
            return Math.min(requestedSpeed, realSpeed + speed);
        return realSpeed;
    }

    player.x_speed = adjustSpeed(player.x_speed, player.r_x_speed);
    player.y_speed = adjustSpeed(player.y_speed, player.r_y_speed);

    if (player.distance > 0) --player.distance;
    if (player.distance < 0) ++player.distance;
    
    player.x += player.x_speed;
    player.y += player.y_speed;

    // clipping

    if (player.x < 32) {
        player.x = 32;
        player.x_speed *= (options.ModWallsBounce ? -1 : 0);
    } else if (player.x > 1696) {
        player.x = 1696;
        player.x_speed *= (options.ModWallsBounce ? -1 : 0);
    }

    if (player.y < 192) {
        player.y = 192;
        player.y_speed *= (options.ModWallsBounce ? -1 : 0);
    } else if (player.y > 2176) {
        player.y = 2176;
        player.y_speed *= (options.ModWallsBounce ? -1 : 0);
    }
}

export function render() {
    
    const {x, y, distance} = player;
    const frame = distance < -10 ? player0 :
                  distance < 0 ? player1 : 
                  distance == 0 ? player2 : 
                  distance <= 10 ? player3 : player4;

    GL.drawSprite(frame, x >> 3, y >> 3);
}