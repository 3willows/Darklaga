import * as Level from "./level"
import * as Background from "./background"
import * as Pickup from "./pickup"
import * as Player from "./player"
import * as Shot from "./shot"
import * as Enemy from "./enemy"
import * as Dan from "./dan"
import * as Hud from "./hud"
import * as Float from "./float"
import * as Boss from "./boss"
import * as GL from "./webgl"
import * as Fury from "./fury"
import * as Music from "./music"

const gLEVEL1 = 0
const gLEVEL2 = 1
const gLEVEL3 = 2
const gLEVEL4 = 3
const gLEVEL5 = 4
const gBOSS1 = 5
const gLEVEL6 = 6
const gLEVEL7 = 7
const gLEVEL8 = 8
const gLEVEL9 = 9
const gLEVEL10 = 10
const gBOSS2 = 11
const gLEVEL11 = 12
const gLEVEL12 = 13
const gLEVEL13 = 14
const gLEVEL14 = 15
const gLEVEL15 = 16
const gBOSS3 = 17
const gSECRET = 18
const gBOSSMODE1 = 19
const gBOSSMODE2 = 20
const gBOSSMODE3 = 21
const gTOURIST1 = 22
const gTOURIST2 = 23
const gTOURIST3 = 24
const gOSLEVEL1 = 25
const gOSLEVEL2 = 26
const gOSLEVEL3 = 27
const gOSLEVEL4 = 28
const gOSLEVEL5 = 29
const gOSLEVEL6 = 30
const gOSLEVEL7 = 31
const gOSLEVEL8 = 32
const gOSLEVEL9 = 33
const gOSLEVEL10 = 34
const gOSLEVEL11 = 35
const gOSLEVEL12 = 36
const gOSLEVEL13 = 37
const gOSLEVEL14 = 38
const gOSLEVEL15 = 39

const GS_MAIN_MENU = 0
const GS_STARTING_LEVEL = 1
const GS_PLAY = 2
const GS_END_LEVEL = 3

type Game = {
    state: number
    level: number
    player_enter: number
    specialscreen: number
    prerender: number
}

const g : Game = {
    state: GS_MAIN_MENU,
    level: gLEVEL1,
    prerender: 0,
    player_enter: 0,
    specialscreen: 0
}

// state transitions =========================================================

function startLevel() {
    
	g.state = GS_STARTING_LEVEL;

    switch (g.level) {
        case gLEVEL1:
        case gOSLEVEL1:
            g.specialscreen = 200;
        case gTOURIST1:
            Level.spawn(1);
            Background.set(Background.LEVEL0);
            Background.warp(Background.LEVEL1);
            g.prerender = 0;
            Music.playMusic(Music.music1);
            break;
        case gLEVEL2:
        case gOSLEVEL2:
        case gTOURIST2:
            Level.spawn(2);
            Background.set(Background.LEVEL1);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case gLEVEL3:
        case gOSLEVEL3:
        case gTOURIST3:
            Level.spawn(3);
            Background.set(Background.LEVEL2);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case gLEVEL4:
        case gOSLEVEL4:
            Level.spawn(4);
            Background.set(Background.LEVEL3)
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case gLEVEL5:
        case gOSLEVEL5:
            Level.spawn(5);
            Background.set(Background.LEVEL3);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case gBOSSMODE1:
            Pickup.generateChoices();
        case gBOSS1:
            Level.spawn(0);
            Boss.start(0);
            Background.set(Background.BOSS1);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case gLEVEL6:
        case gOSLEVEL6:
            Level.spawn(6);
            Background.warp(Background.LEVEL4);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case gLEVEL7:
        case gOSLEVEL7:
            Level.spawn(7);
            Background.set(Background.LEVEL5);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case gLEVEL8:
        case gOSLEVEL8:
            Level.spawn(8);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case gLEVEL9:
        case gOSLEVEL9:
            Level.spawn(9);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case gLEVEL10:
        case gOSLEVEL10:
            Level.spawn(10);
            Background.set(Background.LEVEL6);
            g.prerender = 64; 
            Music.playMusic(Music.music2);
            break;
        case gBOSSMODE2:
            Pickup.generateChoices();
        case gBOSS2:
            Level.spawn(0);
            Boss.start(1);
            Background.set(Background.BOSS2);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case gLEVEL11:
        case gOSLEVEL11:
            Level.spawn(11);
            Background.warp(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case gLEVEL12:
        case gOSLEVEL12:
            Level.spawn(12);
            Background.set(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case gLEVEL13:
        case gOSLEVEL13:
            Level.spawn(13);
            Background.set(Background.LEVEL8);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case gLEVEL14:
        case gOSLEVEL14:
            Level.spawn(14);
            Background.set(Background.LEVEL9);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case gLEVEL15:
        case gOSLEVEL15:
            Level.spawn(15);
            Background.set(Background.LEVEL9);
            g.prerender = 64; 
            Music.playMusic(Music.music3);
            break;
        case gBOSSMODE3:
            Pickup.generateChoices();
        case gBOSS3:
            Level.spawn(0);
            Boss.start(2);
            Background.set(Background.BOSS3);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
    }
}

function endLevel() {
    g.state = GS_END_LEVEL;
    Player.setControllable(false);
}

function gameFinish() {}

function nextLevel() {
    switch (g.level) {
        case gBOSS3:
        case gBOSSMODE3:
        case gTOURIST3:
        case gSECRET:
        case gOSLEVEL15:
            gameFinish();
            break;
        default:
            ++g.level;
            startLevel();
    }
}

// stepping ==================================================================

function playStep() {
 
    if (g.player_enter < 64) {
        if (++g.player_enter == 64) {
            Player.reset();
            Player.setControllable(true);
        }
    }

    Background.step();
    Enemy.step();
    Boss.step();
    Hud.step();
    Shot.step();
    Player.step();
    Pickup.step();
    Dan.step();
    Fury.step();
    Float.step();
    
    if (!Background.animated())
        Level.step();

    if (Level.over() && 
        g.player_enter == 64 && 
        Enemy.count() == 0 && 
        Boss.over() && 
        !Fury.isRunning()) 
    {
        endLevel();
    }
}

function menuStep() {
    Background.step();
}

function endLevelStep() {

    Background.step();
    Enemy.step();
    Hud.step();
    Shot.step();
    Player.step();
    Pickup.step();
    Dan.step();
    Float.step();
    Boss.step();
    Fury.step();

    nextLevel();
}

function startingLevelStep() {

    if (g.prerender < 64) {
        Background.step(false);
        g.prerender++;
        return;
    }

    Background.step();
    Enemy.step();
    Hud.step();
    Shot.step();
    Player.step();
    Pickup.step();
    Dan.step();
    Float.step();
    Boss.step();
    Fury.step();

    if (Background.warping()) return;

    g.state = GS_PLAY;
    Player.setControllable(true);
}

export function step() {
    switch (g.state) {
        case GS_PLAY: 
            playStep();
            return;
        case GS_MAIN_MENU:
            menuStep();
            return;
        case GS_STARTING_LEVEL: 
            startingLevelStep();
            return;
        case GS_END_LEVEL: 
            endLevelStep();
            return;
        default:
            throw "Unknown state";
    }
}

//startLevel();

// rendering =================================================================

export function playRender() {
    Background.render();
    Fury.renderStart();
    Enemy.render();
    Boss.render();
    Shot.render();
    Pickup.render();
    Player.render();
    Dan.render();
    Boss.renderTop();
    Fury.renderEnd();
    Hud.render();
    Float.render();
}

export function menuRender() {
    Background.render();
    Fury.renderStart();
    Enemy.render();
    Boss.render();
    Shot.render();
    Pickup.render();

    if (g.prerender < 64) 
        Player.prerender(g.prerender);
    else
        Player.render();

    Dan.render();
    Boss.renderTop();
    Fury.renderEnd();

    if (g.prerender < 64)
        Hud.prerender(g.prerender >> 1);    
    else
        Hud.render();
}

export function endLevelRender() {
    Background.render();
    Fury.renderStart();
    Enemy.render();
    Boss.render();
    Shot.render();
    Pickup.render();
    Player.render();
    Dan.render();
    Boss.renderTop();
    Fury.renderEnd();
    Hud.render();
    Float.render();
}

export function startingLevelRender() {
    Background.render();
    if (g.prerender < 64) {
        Player.prerender(g.prerender);
        Hud.prerender(g.prerender >> 1);    
    } else {
        Player.render();
        Hud.render();
    }
}

export function render() {
    GL.startRender();
    switch (g.state) {
        case GS_PLAY: 
            playRender();
            break;
        case GS_MAIN_MENU:
            menuRender();
            break;
        case GS_STARTING_LEVEL: 
            startingLevelRender();
            break;
        case GS_END_LEVEL: 
            endLevelRender();
            break;
        default:
            throw "Unknown state";
    }
    GL.endRender();
}