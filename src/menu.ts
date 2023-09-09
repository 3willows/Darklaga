import * as GL from "./webgl"
import * as S from "./sprites"
import * as Snd from "./sound";
import * as Lvl from "./level";
import { key } from "input";

type Message = "up" | "down" | "action" | { x: number, y: number };

const margin = 4;

// Base class for all menu items.
class MenuItem {

    public readonly height : number
    public readonly width : number
    private textWidth : number
    private alpha : number

    constructor(
        public readonly draw: S.Sprite,
        public readonly drawsel: S.Sprite,
        public readonly center: boolean,
        public readonly font: S.Sprite[],
        private text: string)
    {
        this.height = draw.h;
        this.width = draw.w;
        this.alpha = 8;
        this.textWidth = GL.measureText(text, font);
    }

    setText(text: string) {
        this.text = text;
        this.textWidth = GL.measureText(text, this.font);
    }

    step(selected: boolean) {
        if (selected) {
            if (this.alpha < 32) ++this.alpha;
        } else {
            if (this.alpha > 8) --this.alpha;
            if (this.alpha < 8) ++this.alpha;
        }
    }

    render(x: number, y: number, selected: boolean) {
        GL.drawSpriteAlpha(selected ? this.drawsel : this.draw, x, y, this.alpha);
        if (this.text) {
            const tx = x + (this.center ? (this.width - this.textWidth) / 2 : 0);
            const ty = y + 2;
            GL.drawText(this.text, this.font, S.texyellow, tx, ty, 1, 0);
        }
    }
}

// Base class for all menu windows.
class MenuWindow {

    private readonly items : MenuItem[] = []
    private selected : number = 0

    constructor(
        private readonly x : number,
        private readonly y : number)
    {
        
    }

    activate(mi: MenuItem) {}

    add(mi: MenuItem) {
        this.items.push(mi);
    }

    step() {
        for (let i = 0; i < this.items.length; ++i) {
            const item = this.items[i];
            item.step(this.selected === i);
        }
    }

    render() {
        let y = this.y + margin;
        for (let i = 0; i < this.items.length; ++i) {
            const item = this.items[i];
            item.render(this.x, y, this.selected === i);
            y += item.height + 2 * margin;
        }
    }

    message(msg: Message) {

        if (msg == "up" && this.selected > 0) {
            --this.selected;
            Snd.rocketFire.play();
        }

        if (msg == "down" && this.selected < this.items.length - 1) {
            ++this.selected;
            Snd.rocketFire.play();
        }

        if (msg == "action") {
            this.activate(this.items[this.selected]);
        }
    }
}

class MainMenu extends MenuWindow {

    private readonly btnNew : MenuItem
    private readonly btnOptions : MenuItem
    private readonly btnQuit : MenuItem

    constructor() {
        super((240-S.btn_l.w)/2, 195);
        this.add(this.btnNew = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "NEW GAME"));
        this.add(this.btnOptions = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "OPTIONS"));
        this.add(this.btnQuit = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "QUIT"));
    }

    activate(mi: MenuItem) {
        
        if (mi === this.btnNew) {
            Snd.furyBegin.play();
            wnd = new GameMenu();
        }

        if (mi === this.btnQuit) {
            Snd.pickup.play();
            document.getElementsByTagName("canvas")[0].remove();
        }
    }
}

class GameMenu extends MenuWindow {

    private readonly btnTourist : MenuItem
    private readonly btnNormal : MenuItem
    private readonly btnHard : MenuItem
    private readonly btnExtreme : MenuItem
    private readonly btnSecret : MenuItem
    private readonly btnBossMode : MenuItem
    private readonly btnBack : MenuItem

    constructor() {
        super((240-S.btn_l.w)/2, 140);
        this.add(this.btnTourist = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "TOURIST"));
        this.add(this.btnNormal = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "NORMAL"));
        this.add(this.btnHard = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "HARD"));
        this.add(this.btnExtreme = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "EXTREME"));
        this.add(this.btnBossMode = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "BOSS MODE"));
        this.add(this.btnSecret = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "SECRET LEVEL"));
        this.add(this.btnBack = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "BACK"));
    }

    activate(mi: MenuItem) {
        Snd.furyBegin.play();

        if (mi === this.btnTourist) {
            callbacks.startLevel(Lvl.gTOURIST1);
        }

        if (mi === this.btnNormal) {
            callbacks.startLevel(Lvl.gLEVEL1);
        }

        if (mi === this.btnHard) {
            callbacks.startLevel(Lvl.gLEVEL1);
        }

        if (mi === this.btnExtreme) {
            callbacks.startLevel(Lvl.gLEVEL1);    
        }

        if (mi === this.btnBossMode) {
            callbacks.startLevel(Lvl.gBOSSMODE1);    
        }

        if (mi === this.btnBack) {
            wnd = new MainMenu();
        }
    }
}

// Because of mutual recursive modules, Game.ts uses Menu.ts so we cannot
// access Game.ts from Menu.ts...
export const callbacks = {
    startLevel: (lvl: number) => {}
};

let wnd : MenuWindow|undefined = new MainMenu();

const prevkey = {
    up: false,
    down: false,
    action: false
}

export function step() {
    if (!wnd) return;
    
    if (key.up != prevkey.up) {
        prevkey.up = key.up;
        if (key.up) wnd.message("up");
    }

    if (key.down != prevkey.down) {
        prevkey.down = key.down;
        if (key.down) wnd.message("down");
    }
    
    if (key.action != prevkey.action) {
        prevkey.action = key.action;
        if (key.action) wnd.message("action");
    }

    wnd.step();
}

export function render() {
    if (wnd) wnd.render();
}
