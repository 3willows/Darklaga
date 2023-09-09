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
import * as Menu from "./menu"

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
    level: Level.gLEVEL1,
    prerender: 0,
    player_enter: 0,
    specialscreen: 0
}

// state transitions =========================================================

function startLevel(lvl: number) {
    
	g.state = GS_STARTING_LEVEL;

    switch (g.level = lvl) {
        case Level.gLEVEL1:
        case Level.gOSLEVEL1:
            g.specialscreen = 200;
        case Level.gTOURIST1:
            Level.spawn(1);
            Background.set(Background.LEVEL0);
            Background.warp(Background.LEVEL1);
            g.prerender = 0;
            Music.playMusic(Music.music1);
            break;
        case Level.gLEVEL2:
        case Level.gOSLEVEL2:
        case Level.gTOURIST2:
            Level.spawn(2);
            Background.set(Background.LEVEL1);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case Level.gLEVEL3:
        case Level.gOSLEVEL3:
        case Level.gTOURIST3:
            Level.spawn(3);
            Background.set(Background.LEVEL2);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case Level.gLEVEL4:
        case Level.gOSLEVEL4:
            Level.spawn(4);
            Background.set(Background.LEVEL3)
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case Level.gLEVEL5:
        case Level.gOSLEVEL5:
            Level.spawn(5);
            Background.set(Background.LEVEL3);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case Level.gBOSSMODE1:
            Pickup.generateChoices();
        case Level.gBOSS1:
            Level.spawn(0);
            Boss.start(0);
            Background.set(Background.BOSS1);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case Level.gLEVEL6:
        case Level.gOSLEVEL6:
            Level.spawn(6);
            Background.warp(Background.LEVEL4);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case Level.gLEVEL7:
        case Level.gOSLEVEL7:
            Level.spawn(7);
            Background.set(Background.LEVEL5);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case Level.gLEVEL8:
        case Level.gOSLEVEL8:
            Level.spawn(8);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case Level.gLEVEL9:
        case Level.gOSLEVEL9:
            Level.spawn(9);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case Level.gLEVEL10:
        case Level.gOSLEVEL10:
            Level.spawn(10);
            Background.set(Background.LEVEL6);
            g.prerender = 64; 
            Music.playMusic(Music.music2);
            break;
        case Level.gBOSSMODE2:
            Pickup.generateChoices();
        case Level.gBOSS2:
            Level.spawn(0);
            Boss.start(1);
            Background.set(Background.BOSS2);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case Level.gLEVEL11:
        case Level.gOSLEVEL11:
            Level.spawn(11);
            Background.warp(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case Level.gLEVEL12:
        case Level.gOSLEVEL12:
            Level.spawn(12);
            Background.set(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case Level.gLEVEL13:
        case Level.gOSLEVEL13:
            Level.spawn(13);
            Background.set(Background.LEVEL8);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case Level.gLEVEL14:
        case Level.gOSLEVEL14:
            Level.spawn(14);
            Background.set(Background.LEVEL9);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case Level.gLEVEL15:
        case Level.gOSLEVEL15:
            Level.spawn(15);
            Background.set(Background.LEVEL9);
            g.prerender = 64; 
            Music.playMusic(Music.music3);
            break;
        case Level.gBOSSMODE3:
            Pickup.generateChoices();
        case Level.gBOSS3:
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
        case Level.gBOSS3:
        case Level.gBOSSMODE3:
        case Level.gTOURIST3:
        case Level.gSECRET:
        case Level.gOSLEVEL15:
            gameFinish();
            break;
        default:
            startLevel(g.level + 1);
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
    Menu.step();
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

    Menu.render();
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

Menu.callbacks.startLevel = startLevel;