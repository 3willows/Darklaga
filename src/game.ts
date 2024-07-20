import * as Level from "./level"
import * as L from "./levels"
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
import * as Stats from "./stats"
import * as End from "./end"
import * as Snd from "./sound"

const GS_MAIN_MENU = 0
const GS_STARTING_LEVEL = 1
const GS_PLAY = 2
const GS_END_LEVEL = 3
const GS_END_GAME = 4

type Game = {
    state: number
    level: number
    specialscreen: number
    prerender: number
}

const g : Game = {
    state: GS_MAIN_MENU,
    level: L.gLEVEL1,
    prerender: 0,
    specialscreen: 0
}

// state transitions =========================================================

function startLevel(lvl: number) {
    
	g.state = GS_STARTING_LEVEL;
    Stats.begin(lvl);
    Dan.reset();

    switch (g.level = lvl) {
        case L.gLEVEL1:
        case L.gOSLEVEL1:
            g.specialscreen = 200;
        case L.gTOURIST1:
            Level.spawn(1);
            Background.set(Background.LEVEL0);
            Background.warp(Background.LEVEL1);
            g.prerender = 0;
            Music.playMusic(Music.music1);
            break;
        case L.gLEVEL2:
        case L.gOSLEVEL2:
        case L.gTOURIST2:
            Level.spawn(2);
            Background.set(Background.LEVEL1);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case L.gLEVEL3:
        case L.gOSLEVEL3:
        case L.gTOURIST3:
            Level.spawn(3);
            Background.set(Background.LEVEL2);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case L.gLEVEL4:
        case L.gOSLEVEL4:
            Level.spawn(4);
            Background.set(Background.LEVEL3)
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case L.gLEVEL5:
        case L.gOSLEVEL5:
            Level.spawn(5);
            Background.set(Background.LEVEL3);
            g.prerender = 64;
            Music.playMusic(Music.music1);
            break;
        case L.gBOSSMODE1:
            Pickup.generateChoices();
            Level.spawn(0);
            Boss.start(0);
            Background.warp(Background.BOSS1);
            g.prerender = 0;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gBOSS1:
            Level.spawn(0);
            Boss.start(0);
            Background.set(Background.BOSS1);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gLEVEL6:
        case L.gOSLEVEL6:
            Level.spawn(6);
            Background.warp(Background.LEVEL4);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case L.gLEVEL7:
        case L.gOSLEVEL7:
            Level.spawn(7);
            Background.set(Background.LEVEL5);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case L.gLEVEL8:
        case L.gOSLEVEL8:
            Level.spawn(8);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case L.gLEVEL9:
        case L.gOSLEVEL9:
            Level.spawn(9);
            Background.set(Background.LEVEL6);
            g.prerender = 64;
            Music.playMusic(Music.music2);
            break;
        case L.gLEVEL10:
        case L.gOSLEVEL10:
            Level.spawn(10);
            Background.set(Background.LEVEL6);
            g.prerender = 64; 
            Music.playMusic(Music.music2);
            break;
        case L.gBOSSMODE2:
            Pickup.generateChoices();
            Level.spawn(0);
            Boss.start(1);
            Background.warp(Background.BOSS2);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gBOSS2:
            Level.spawn(0);
            Boss.start(1);
            Background.set(Background.BOSS2);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gLEVEL11:
        case L.gOSLEVEL11:
            Level.spawn(11);
            Background.warp(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case L.gLEVEL12:
        case L.gOSLEVEL12:
            Level.spawn(12);
            Background.set(Background.LEVEL7);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case L.gLEVEL13:
        case L.gOSLEVEL13:
            Level.spawn(13);
            Background.set(Background.LEVEL8);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case L.gLEVEL14:
        case L.gOSLEVEL14:
            Level.spawn(14);
            Background.set(Background.LEVEL9);
            g.prerender = 64;
            Music.playMusic(Music.music3);
            break;
        case L.gLEVEL15:
        case L.gOSLEVEL15:
            Level.spawn(15);
            Background.set(Background.LEVEL9);
            g.prerender = 64; 
            Music.playMusic(Music.music3);
            break;
        case L.gBOSSMODE3:
            Pickup.generateChoices();
            Level.spawn(0);
            Boss.start(2);
            Background.warp(Background.BOSS3);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gBOSS3:
            Level.spawn(0);
            Boss.start(2);
            Background.set(Background.BOSS3);
            g.prerender = 64;
            Music.playMusic(Music.musicBoss);
            break;
        case L.gSECRET: 
            Level.spawn(16);
            Background.set(Background.WIRE);
            Pickup.generateChoices();
            break;
    }
}

function endLevel() {
    g.state = GS_END_LEVEL;
    Snd.shield.stop(); // annoying
    Music.setVolume(0.25);
    Stats.end();
    Player.setControllable(false);
}

function gameFinish() {
    g.state = GS_END_GAME;
    Snd.shield.stop(); // annoying
    Music.playMusic(Music.music1);
    End.enable(true, Hud.score());    
}

function loseGame() {
    g.state = GS_END_GAME;
    End.enable(false, Hud.score());
    Music.setVolume(0);
    Player.setControllable(false);
}

function nextLevel() {
    Music.setVolume(1);
    switch (g.level) {
        case L.gBOSS3:
        case L.gBOSSMODE3:
        case L.gTOURIST3:
        case L.gSECRET:
        case L.gOSLEVEL15:
            gameFinish();
            break;
        default:
            startLevel(g.level + 1);
    }
}

// stepping ==================================================================

function playStep() {
 
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
        Enemy.count() == 0 && 
        Boss.over() && 
        !Fury.isRunning()) 
    {
        endLevel();
    }

    if (Hud.dead()) {
        loseGame();
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
    Pickup.step(false);
    Dan.step();
    Float.step();
    Boss.step();
    Fury.step();

    Hud.addScoreRaw(Stats.step());

    if (Stats.isDone())
        nextLevel();
}

function startingLevelStep() {

    // During this step the player+hud come into view
    if (g.prerender < 64) {
        Background.step(false);
        if (++g.prerender == 64)
            Player.reset();
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
    Fury.step();

    // Wait for the background to finish warping
    // before starting play. Boss & level do not operate
    // while in this mode. 
    if (Background.warping()) return;

    g.state = GS_PLAY;
    Player.setControllable(true);
}

function endGameStep() {
    
    // Do not animate anything anymore.
    End.step();

    if (End.done()) {
        g.state = GS_MAIN_MENU;
        g.level = L.gLEVEL1,
        g.prerender = 0;
        g.specialscreen = 0;
        Background.set(Background.LEVEL0);
    }
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
        case GS_END_GAME:
            endGameStep();
            return;
        default:
            throw "Unknown state";
    }
}

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
    Stats.render();
    Float.render();
}

export function startingLevelRender() {
    Background.render();
    if (g.prerender < 64) {
        Player.prerender(g.prerender);
        Hud.prerender(g.prerender >> 1);    
    } else {
        Player.render();
        Pickup.render();
        Hud.render();
    }
}

export function endGameRender() {
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
    Stats.render();
    Float.render();
    End.render();
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
        case GS_END_GAME:
            endGameRender();
            break;
        default:
            throw "Unknown state";
    }
    GL.endRender();
}

Menu.callbacks.startOnLevel = (lvl) => {
    Hud.reset();
    Pickup.reset();
    Shot.reset();
    startLevel(lvl);
}