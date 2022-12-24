import { Enemy } from "./enemy"
import * as S from "./sprites"

export class Suicide extends Enemy {

    constructor(x: number, y: number) {
        super(x, y, [
            S.esuiciden2, 
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