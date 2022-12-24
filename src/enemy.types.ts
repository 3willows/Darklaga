import { Enemy, Mode } from "./enemy"
import * as S from "./sprites"
import * as GL from "./webgl"

export class Suicide1 extends Enemy {

    constructor(x: number, y: number, mode: Mode) {
        super(x, y, 
            /* health */ mode == "n" ? 5 :
                         mode == "d" ? 7 : 6, 
            mode,
            [   S.esuiciden2, 
                S.esuiciden3, 
                S.esuiciden4, 
                S.esuiciden3,
                S.esuiciden2,
                S.esuiciden1,
                S.esuiciden0,
                S.esuiciden1],
            S.esuicidenh);
    }

}