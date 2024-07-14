import * as GL from "./webgl"
import * as S from "./sprites"
import { key } from "./input"

const end : {
    win: boolean
    timer: number
    score: number
    text: [string, (t: number) => S.Sprite][]
    done: boolean
} = {
    win: false,
    timer: 0,
    score: 0,
    text: [],
    done: false
}

export function done() {
    return end.done;
}

export function enable(win: boolean, score: number) {
    end.win = win;
    end.timer = 0;
    end.done = false;
    end.score = score;

    if (win) {

        let txtscore = score.toFixed();
        if (score >= 1000) 
            txtscore = txtscore.slice(0, txtscore.length - 3) +
                       "." + 
                       txtscore.slice(txtscore.length - 3);
        if (score >= 1000000) 
            txtscore = txtscore.slice(0, txtscore.length - 7) +
                       "." + 
                       txtscore.slice(txtscore.length - 7);

        end.text = [
            ["      CONGRATULATIONS!\n\n", _ => S.texyellow],
            ["Thank you for playing Darklaga.\n", _ => S.texwhite],
            ["Try out the other game modes!\n\n", _ => S.texwhite],
            ["Darklaga was released in 2004\n", _ => S.texwhite],
            ["for PocketPC and other PDAs.\n", _ => S.texwhite],
            ["This version was released on\n", _ => S.texwhite],
            ["the 20th anniversary, in 2024.\n\n", _ => S.texwhite],
            ["Graphics  ", _ => S.texwhite],
            [          "              Ronan\n", n => S.texcombo[n%S.texcombo.length]],
            ["Music", _ => S.texwhite],
            [     "                   Cyril\n", n => S.texcombo[n%S.texcombo.length]],
            ["Programming", _ => S.texwhite],
            [           "            Victor\n", n => S.texcombo[n%S.texcombo.length]],
            ["Fonts     ", _ => S.texwhite],
            [          "             France\n", n => S.texcombo[n%S.texcombo.length]],
            ["Engine (2004)", _ => S.texwhite],
            [             "         Stephane\n", n => S.texcombo[n%S.texcombo.length]],
            ["Engine (2024)", _ => S.texwhite],
            [             "           Victor\n\n\n", n => S.texcombo[n%S.texcombo.length]],
            ["~     Your final score is\n", _ => S.texwhite],
            ["       " + txtscore + "\n", _ => S.texyellow]
        ]
    }
} 

export function step() {
    ++end.timer;
    if (end.timer > 128 && (key.action || key.action2))
        end.done = true;
}

export function render() {

    if (end.win) {

        const alpha = Math.min(1, end.timer/64);
        GL.drawRect(0, 0, 240, 320, 0, 0, 0, alpha);

        const xbase = 40;
        let x = xbase;
        let y = 60 - (end.timer >> 4);
        let t = end.timer - 64;
        let skipline = 0;
        let drawShip = false;

        for (const piece of end.text) {
            if (t < 0) break;
            const [line, ftex] = piece;
            const tex = ftex(t >> 1);
            
            let str = "";
            for (let c = 0; c < line.length; ++c) {
                if (t < 0) break;

                const char = line.charAt(c);
                if (char == "\n") {
                    t -= 6;
                    ++skipline;
                } else if (char == "~") {
                    drawShip = true;
                } else {
                    str += char;
                    t -= 2;
                }

                if (t < 0) break;
            }

            if (drawShip) {
                let anim = (end.timer >> 2) % 8;
                if (anim > 4) anim = 8 - anim;
                GL.drawSprite(S.player[anim], x, y);
                drawShip = false;
            }

            GL.drawText(str, S.font, tex, x, y, 1, 0);
            x += GL.measureText(str, S.font);
            if (skipline > 0) {
                x = xbase;
                y += 16 * skipline;
                skipline = 0;
            }
        }

    } else {

        const alpha = Math.min(0.5, end.timer/128);
        GL.drawRect(0, 0, 240, 320, 0, 0, 0, alpha);

        const sprite = S.gameover;
        const mx = (240 - sprite[S.w])/2;
        const my = (320 - sprite[S.h])/2;

        const t = Math.min(64, Math.max(end.timer - 64, 0));
        const d = (64 - t) * 4;
        const a = t >> 1;

        GL.drawSpriteAlpha(sprite, mx - d, my, a);
        GL.drawSpriteAlpha(sprite, mx + d, my, a);    
    }
}