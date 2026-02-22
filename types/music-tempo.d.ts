declare module 'music-tempo' {
    class MusicTempo {
        constructor(audioData: Float32Array, params?: any);
        tempo: string | number;
        beats: number[];
        spectralFlux: number[];
        peaks: number[];
    }
    export = MusicTempo;
}
