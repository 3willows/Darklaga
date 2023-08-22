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

        const now = +new Date();

        while (this.playing.length > this.maxCount) 
            this.playing.shift()!.stop();

        const node = new AudioBufferSourceNode(S.ac);
        node.buffer = this.buffer;
        node.connect(S.ac.destination);
        node.start();
    }

    stop() {
        while (this.playing.length)
            this.playing.shift()!.stop()
    }
}

export const blasterFire = new Sound(S.n_fire, 4);
export const laserFire = new Sound(S.l_fire, 1);
export const bladeFire = new Sound(S.b_fire, 4);
export const rocketFire = new Sound(S.r_fire, 4);
export const boom = new Sound(S.boom, 4);