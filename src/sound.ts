import * as S from "./sounds"

export class Sound {

    // buffer, becomes available when loaded
    private buffer : AudioBuffer|undefined

    // last played instance, if any
    private playing : AudioBufferSourceNode[] = []

    constructor(
        audio: Promise<AudioBuffer>,
        private readonly maxCount : number) {
        audio.then(buffer => this.buffer = buffer);
    }

    play() {
        if (!this.buffer) return;

        while (this.playing.length > this.maxCount) 
            this.playing.shift()!.stop();

        const node = new AudioBufferSourceNode(S.ac);
        node.buffer = this.buffer;
        node.connect(S.ac.destination);
        node.start();
        this.playing.push(node);
    }

    stop() {
        while (this.playing.length)
            this.playing.shift()!.stop()
    }

    loop() {
        if (!this.buffer) return;

        if (this.playing.length == 0) {
            const node = new AudioBufferSourceNode(S.ac);
            node.buffer = this.buffer;
            node.connect(S.ac.destination);
            node.loop = true;
            node.start();
            this.playing.push(node);
        }
    }
}

export const blasterFire = new Sound(S.n_fire, 4);
export const laserFire = new Sound(S.l_fire, 1);
export const bladeFire = new Sound(S.b_fire, 4);
export const rocketFire = new Sound(S.r_fire, 4);
export const boom = new Sound(S.boom, 4);
export const graze = new Sound(S.graze, 4);
export const bossboom1 = new Sound(S.bossboom1, 1);
export const bossboom2 = new Sound(S.bossboom2, 1);
export const furyBegin = new Sound(S.furybegin, 1);
export const pickup = new Sound(S.pickup, 1);
export const pickupLaser = new Sound(S.vlaser, 1);
export const pickupRockets = new Sound(S.vrockets, 1);
export const pickupBlades = new Sound(S.vblade, 1);
export const pickupMulti = new Sound(S.vpeacemaker, 1);
export const pickupSpeed = new Sound(S.vfirerate, 1);
export const pickupShield = new Sound(S.vshield, 1);
export const pickupFury = new Sound(S.vfury, 1);