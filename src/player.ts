import * as GL from "./webgl"
import { blast, muzzle, player0, player1, player2, player3, player4 } from "./sprites"
import { key } from "./input"
import { opts } from "./options"
import * as Shot from "./shot"

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

const pl : Player = {
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

function shoot() {

    pl.muzzle_flash = 2;
    pl.cooldown = 6;
    Shot.add({
        type: Shot.SHOT_BLASTER,
        x: pl.x + 80,
        y: pl.y + 8,
        w: blast.w << 3,
        h: blast.h << 3
    })

}

export function step() {

    const friction = opts.ModPlayerFriction * opts.ModPlayerFriction * 4;
    const speed = 5 + opts.ModPlayerSpeed;

    // user input
    
    pl.r_x_speed = 0;
    pl.r_y_speed = 0;

    if (pl.controllable) {

        if (key.up) {
            pl.r_y_speed = -3*speed;
        } else if (key.down) {
            pl.r_y_speed = 3*speed;
        }

        if (key.left) {
            pl.r_x_speed = -3*speed;
            pl.distance = Math.max(-20, pl.distance - 3);
        } else if (key.right) {
            pl.r_x_speed = 3*speed;
            pl.distance = Math.min(20, pl.distance + 3);
        }

        if (key.action) {
            pl.shooting = 5;
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

    pl.x_speed = adjustSpeed(pl.x_speed, pl.r_x_speed);
    pl.y_speed = adjustSpeed(pl.y_speed, pl.r_y_speed);

    if (pl.distance > 0) --pl.distance;
    if (pl.distance < 0) ++pl.distance;
    
    pl.x += pl.x_speed;
    pl.y += pl.y_speed;

    // clipping

    if (pl.x < 32) {
        pl.x = 32;
        pl.x_speed *= (opts.ModWallsBounce ? -1 : 0);
    } else if (pl.x > 1696) {
        pl.x = 1696;
        pl.x_speed *= (opts.ModWallsBounce ? -1 : 0);
    }

    if (pl.y < 192) {
        pl.y = 192;
        pl.y_speed *= (opts.ModWallsBounce ? -1 : 0);
    } else if (pl.y > 2176) {
        pl.y = 2176;
        pl.y_speed *= (opts.ModWallsBounce ? -1 : 0);
    }

    // Shots

    if (pl.cooldown) --pl.cooldown;
    if (pl.shooting) --pl.shooting;
    if (pl.muzzle_flash) --pl.muzzle_flash;

    if (pl.controllable && !pl.cooldown && (opts.ModAutoFire || pl.shooting))
        shoot()
}

export function render() {
    
    const {x, y, distance, muzzle_flash} = pl;
    const frame = distance < -10 ? player0 :
                  distance < 0 ? player1 : 
                  distance == 0 ? player2 : 
                  distance <= 10 ? player3 : player4;

    GL.drawSprite(frame, x >> 3, y >> 3);

    if (muzzle_flash && opts.UseNewSchool)
        GL.drawSpriteAdditive(muzzle, (x >> 3) + 2, (y >> 3) - 22, 32);

}