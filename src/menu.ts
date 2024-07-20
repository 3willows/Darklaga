import * as GL from "./webgl"
import * as S from "./sprites"
import * as Snd from "./sound";
import * as L from "./levels";
import * as Float from "./float";
import { key, mouse } from "input";
import { opts } from "options";

type Message = "up" | "down" | "action" | { x: number, y: number };

const margin = 4;

// Base class for all menu items.
class MenuItem {

    public readonly height : number
    public readonly width : number
    private textWidth : number
    public alpha : number

    constructor(
        public readonly draw: S.Sprite,
        public readonly drawsel: S.Sprite,
        public readonly center: boolean,
        public readonly font: S.Sprite[],
        private text: string)
    {
        this.height = draw[S.h];
        this.width = draw[S.w];
        this.alpha = 8;
        this.textWidth = GL.measureText(text, font);
    }

    activate() {}

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
            const tx = x + (this.center ? (this.width - this.textWidth) / 2 : 4);
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
            item.render(this.x, y, this.selected === i || mouse.down);
            y += item.height + 2 * margin;
        }
    }

    active() { return this.items[this.selected] }

    message(msg: Message) {

        if (msg == "up") {
            if (this.selected > 0) {
                --this.selected;
                Snd.rocketFire.play();
            }
            return;
        }

        if (msg == "down") {
                if (this.selected < this.items.length - 1) {
                ++this.selected;
                Snd.rocketFire.play();
            }
            return;
        }

        if (msg == "action") {
            this.activate(this.items[this.selected]);
            return;
        }

        const {x, y} = msg;
        if (x < this.x) return;

        let iy = this.y + margin;
        for (let item of this.items) {
            if (y < iy) return;
            if (y < iy + item.height && x < this.x + item.width) {
                this.activate(item);
                return;
            }

            iy += item.height + 2 * margin;
        }
    }
}

class MainMenu extends MenuWindow {

    private readonly btnNew : MenuItem
    private readonly btnOptions : MenuItem
    private readonly btnQuit : MenuItem

    constructor() {
        super((240-S.btn_l[S.w])/2, 195);
        this.add(this.btnNew = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "NEW GAME"));
        this.add(this.btnOptions = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "OPTIONS"));
        this.add(this.btnQuit = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "QUIT"));
    }

    activate(mi: MenuItem) {
        
        if (mi === this.btnNew) {
            Snd.furyBegin.play();
            wnd = new GameMenu();
        }

        if (mi === this.btnOptions) {
            Snd.furyBegin.play();
            wnd = new OptionsMenu();
        }

        if (mi === this.btnQuit) {
            Snd.pickup.play();
            document.getElementsByTagName("canvas")[0].remove();
        }
    }
}

function showShipTip() {
    setTimeout(() => 
        Float.addInfo(
            [S.player[2]], 
            ["Your ship. Move it with the arrow keys or",
            "drag it with your mouse, stylus or finger."]),
        5500);
}

class CheckboxItem extends MenuItem {

    constructor(
        label: string, 
        public readonly read: () => boolean, 
        public readonly toggle: () => void) {
        super(S.btn_l, S.btn_lsel, false, S.font, label);
    }

    activate() { this.toggle(); }

    render(x: number, y: number, selected: boolean) {
        super.render(x, y, selected);
        const cx = x + this.width - 2 - S.checkbox_l[S.w];
        const cy = y + ((this.height - S.checkbox_l[S.h]) >> 1);

        GL.drawSpriteAlpha(S.checkbox_l, cx, cy, this.alpha);
        if (this.read())
            GL.drawSpriteAlpha(S.check_l, cx, cy, this.alpha);
    }

}

class OptionsMenu extends MenuWindow {

    private readonly btnBack : MenuItem

    constructor() {
        super((240-S.btn_l[S.w])/2, 140);
        this.add(new CheckboxItem("PLAYER FRICTION", () => !!opts.ModPlayerFriction, () => {}));
        this.add(new CheckboxItem("PLAYER SPEED", () => !!opts.ModPlayerSpeed, () => {}));
        this.add(new CheckboxItem("AUTO-FIRE", () => !!opts.ModAutoFire, () => {}));  
        this.add(new CheckboxItem("GEO-DESTRUCTION", () => opts.UseGeoDestruct, () => opts.UseGeoDestruct = !opts.UseGeoDestruct));
        this.add(new CheckboxItem("OLD SCHOOL MODE", () => !opts.UseNewSchool, () => opts.UseNewSchool = !opts.UseNewSchool));
        this.add(new CheckboxItem("TIME ATTACK MODE", () => opts.UseTimeAttack, () => opts.UseTimeAttack = !opts.UseTimeAttack));
        this.add(this.btnBack = new MenuItem(S.btn_l, S.btn_lsel, true, S.font, "BACK"));
    }

    activate(mi: MenuItem) {
        
        if (mi === this.btnBack) {
            Snd.furyBegin.play();
            wnd = new MainMenu();
        } else {
            Snd.blasterFire.play();
            mi.activate();
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
        super((240-S.btn_l[S.w])/2, 140);
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
            callbacks.startOnLevel(L.gTOURIST1);
            opts.UseTourist = true;
            opts.UseScore = true;
            opts.UseGraze = false;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = true;
            opts.UseStrongerEnemies = false;
            opts.UseAggressiveEnemies = false;
            showShipTip();            
        }

        if (mi === this.btnNormal) {
            callbacks.startOnLevel(L.gLEVEL1);
            opts.UseTourist = false;
            opts.UseScore = true;
            opts.UseGraze = true;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = false;
            opts.UseStrongerEnemies = false;
            opts.UseAggressiveEnemies = false;
            if (opts.WaitForInput) showShipTip();
        }

        if (mi === this.btnHard) {
            callbacks.startOnLevel(L.gLEVEL1);
            opts.UseTourist = false;
            opts.UseScore = true;
            opts.UseGraze = true;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = false;
            opts.UseStrongerEnemies = true;
            opts.UseAggressiveEnemies = false;
            if (opts.WaitForInput) showShipTip();
        }

        if (mi === this.btnExtreme) {
            callbacks.startOnLevel(L.gLEVEL1);
            opts.UseTourist = false;
            opts.UseScore = true;
            opts.UseGraze = true;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = false;
            opts.UseStrongerEnemies = true;
            opts.UseAggressiveEnemies = true;
            if (opts.WaitForInput) showShipTip();
        }

        if (mi === this.btnBossMode) {
            callbacks.startOnLevel(L.gBOSSMODE1);
            opts.UseTourist = false;
            opts.UseScore = true;
            opts.UseGraze = true;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = false;
            opts.UseStrongerEnemies = true;
            opts.UseAggressiveEnemies = false;
        }

        if (mi == this.btnSecret) {
            callbacks.startOnLevel(L.gSECRET);
            opts.UseTourist = false;
            opts.UseScore = true;
            opts.UseGraze = true;
            opts.UseNewSchool = true;
            opts.UseVertical = true;
            opts.UseWeapon = true;
            opts.UseFury = true;
            opts.UseFuryShield = true;
            opts.UseCombo = true;
            opts.UseWeakerEnemies = false;
            opts.UseStrongerEnemies = true;
            opts.UseAggressiveEnemies = true;
        }

        if (mi === this.btnBack) {
            wnd = new MainMenu();
        }
    }

    render() {
        super.render();

        const text : string[] = [];
        const sel = this.active(); 

        if (sel === this.btnTourist) {
            text.push(
                "Tourist mode",
                "For beginners",
                "50% enemy health",
                "Less game complexity",
                "Three levels only"
            );
        }

        if (sel === this.btnNormal) {
            text.push(
                "Normal game"
            );
        }

        if (sel === this.btnHard) {
            text.push(
                "Hard game",
                "200% enemy health"
            );
        }

        if (sel === this.btnExtreme) {
            text.push(
                "Extreme game!",
                "200% enemy health",
                "Enemies are more aggressive",
                "Earn more score from enemies"
            );
        }

        if (sel == this.btnSecret) {
            text.push(
                "Secret level",
                "Geo-Destruction effects",
                "200% enemy health",
                "Enemies are more aggressive",
                "Start with upgrades"
            );
        }

        if (sel == this.btnBossMode) {
            text.push(
                "Boss Mode game",
                "Play against bosses only",
                "Receive upgrades before each boss"
            );
        }

        let y = 16;
        for (let line of text) {
            GL.drawText(line, S.mini, y == 16 ? S.texwhite : S.texgreen, 40, y, 1, 0);
            y += (y == 16 ? 16 : 12);
        }
    }
}

// Because of mutual recursive modules, Game.ts uses Menu.ts so we cannot
// access Game.ts from Menu.ts...
export const callbacks = {
    startOnLevel: (lvl: number) => {}
};

let wnd : MenuWindow|undefined = new MainMenu();

const prevkey = {
    up: false,
    down: false,
    action: false,
    mouse: false
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

    if (mouse.down != prevkey.mouse) {
        prevkey.mouse = mouse.down;
        if (mouse.down) wnd.message(mouse)
    }

    wnd.step();
}

export function render() {
    if (wnd) wnd.render();
}
