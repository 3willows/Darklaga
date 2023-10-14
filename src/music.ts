import * as S from "./sounds"

const music = S.ac.createGain();
music.connect(S.ac.destination);
music.gain.value = 0.5;

export class Music {
    
    private buffer : AudioBuffer|undefined
    private node : AudioBufferSourceNode|undefined
    private loopStart : number = 0

    constructor(audio: Promise<AudioBuffer>[], initial = 1) {

        const self = this;
        async function prepare() {
            
            // Wait for all buffers to be decoded
            let length = 0;
            const buffers = [];
            for (let promise of audio) {
                const track = await promise;
                length += track.length;
                buffers.push(track);
            }

            // Create a buffer that will contain them all
            const buffer = new AudioBuffer({
                numberOfChannels: buffers[0].numberOfChannels,
                sampleRate: buffers[0].sampleRate,
                length
            });

            let offset = 0;
            for (let track of buffers) {
                for (let channel = 0; channel < track.numberOfChannels; ++channel) 
                    buffer.copyToChannel(track.getChannelData(channel), channel, offset);
                offset += track.length;
            }
            
            self.loopStart = 0;
            for (let i = 0; i < initial; ++i)
                self.loopStart += buffers[i].duration;
            
            // Assign the buffer to mark the music as available.
            self.buffer = buffer;
        }

        prepare();
    }

    start() {
        if (!this.buffer) return false;
        this.node = new AudioBufferSourceNode(S.ac);
        this.node.buffer = this.buffer;
        this.node.connect(music);
        this.node.loopEnd = this.buffer.duration;
        this.node.loopStart = this.loopStart;
        this.node.loop = true;
        this.node.start();
        return true;
    }

    stop() {
        if (this.node) {
            this.node.stop();
            this.node = undefined;
        }
    }
}

export const music1 = new Music([ 
    S.m1i, 
    S.m1b1, 
    S.m1b1, 
    S.m1b2 
])

export const music2 = new Music([ 
    S.m2i, 
    S.m2b4, 
    S.m2b1, 
    S.m2b4, 
    S.m2b2, 
    S.m2b4, 
    S.m2b3 
])

export const music3 = new Music([ 
    S.m3i, 
    S.m3b1, S.m3b1,
    S.m3b2, S.m3b2,
    S.m3b3, S.m3b3,
    S.m3b4, 
    S.m3b5, 
]);

export const musicBoss = new Music([ 
    S.warning,
    S.warning,
    S.warning,
    S.m4i, 
    S.m4b ], 4);

let current : Music|undefined = undefined

export function playMusic(music: Music) {

    if (current === music) return;
    
    if (current) current.stop();
    
    if (music.start()) 
        current = music;
    else
        setTimeout(() => playMusic(music), 10);
}

export function setVolume(fraction: number) {
    music.gain.linearRampToValueAtTime(fraction * 0.5, music.context.currentTime + 0.5);
}