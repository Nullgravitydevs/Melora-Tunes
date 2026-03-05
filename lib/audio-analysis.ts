import Meyda from 'meyda';
import MusicTempo from 'music-tempo';
import { JioSaavnSong } from './jiosaavn';
import { PlayableTrack } from './types';

// Types
export interface AudioAnalysisResult {
    bpm: number;
    key: string;
}

// Basic Pitch Class to Key mapping heuristic (Camelot scale approximation)
// This is a naive implementation; full key detection from raw chromagrams is a PhD thesis.
// We map the dominant pitch class (0-11) to a relative major/minor key.
const PITCH_CLASSES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function estimateKeyFromChroma(chroma: number[]): string {
    // Find the bin with the highest energy
    let maxVal = -1;
    let maxIdx = -1;
    for (let i = 0; i < chroma.length; i++) {
        if (chroma[i] > maxVal) {
            maxVal = chroma[i];
            maxIdx = i;
        }
    }

    // Very naive: Just return the dominant pitch class. 
    // Real detection requires correlating the 12-dimensional chroma vector against major/minor profile matrices.
    return maxIdx !== -1 ? PITCH_CLASSES[maxIdx] : 'Unknown';
}


export async function analyzeAudioOffline(url: string, signal?: AbortSignal): Promise<AudioAnalysisResult | null> {
    try {
        console.log(`[AudioAnalysis] Starting offline analysis for: ${url}`);

        // 1. Fetch audio (abortable if user skips, bypass SW cache)
        const response = await fetch(url, { signal, cache: 'no-store' });
        if (!response.ok) throw new Error("Failed to fetch audio for analysis");

        const arrayBuffer = await response.arrayBuffer();

        // 2. Decode Audio Data
        // We need an OfflineAudioContext to decode the buffer without playing it
        const audioCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100 * 40, 44100); // 1 channel, 40 seconds max, 44.1kHz
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // 3. Extract channel data (mix to mono if stereo)
        let channelData = audioBuffer.getChannelData(0);

        // 4. Calculate BPM using MusicTempo
        // music-tempo requires the sample rate and the floating point array
        const mt = new MusicTempo(channelData);
        // Sometimes mt.tempo is a string '120.00' or number. Parse it safely.
        const bpm = Math.round(parseFloat(mt.tempo as any));

        // 5. Calculate Key using Meyda (Chromagram)
        // Meyda needs a power of 2 buffer size. We slice a representative chunk from the middle.
        const bufferSize = 4096;
        const startIdx = Math.floor(channelData.length / 2); // Middle of the track
        const slice = channelData.slice(startIdx, startIdx + bufferSize);

        // Ensure exact buffer size for Meyda
        if (slice.length === bufferSize) {
            const features = Meyda.extract('chroma', slice) as number[];
            const key = estimateKeyFromChroma(features);

            return { bpm, key };
        }

        return { bpm, key: 'Unknown' };

    } catch (e: any) {
        if (e.name !== 'AbortError') {
            console.error("[AudioAnalysis] Failed:", e);
        }
        return null; // Silent fail, don't break playback
    }
}
