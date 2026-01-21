import { useState, useEffect, useCallback } from 'react';
import { saveSettings, loadSettings } from '@/lib/settings';

export type EQBand = {
    frequency: number;
    gain: number; // -12 to 12 dB
    type: 'lowshelf' | 'peaking' | 'highshelf';
};

export const FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export const PRESETS: Record<string, number[]> = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Bass Boost': [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 6, 6],
    'Pop': [-1.5, 3, 5, 5.5, 3, -1, -2, -2, -1.5, -1.5],
    'Rock': [5, 3, 1.5, 0, -2, -3, 0.5, 2.5, 3.5, 4.5],
    'Classical': [4, 3, 2, 1, -1, -1, 0, 2, 3, 3],
    'Jazz': [3.5, 2.5, 1, 2, -2, -2, 0, 1.5, 3, 3.5],
    'Vocal': [-2, -2, -1, 2, 5, 4, 3, 0, -1, -2]
};

export function useEqualizer() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [currentPreset, setCurrentPreset] = useState('Flat');
    const [bands, setBands] = useState<number[]>(PRESETS['Flat']);

    // Load saved settings
    useEffect(() => {
        const saved = localStorage.getItem('melora-eq');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setIsEnabled(parsed.isEnabled ?? false);
                setCurrentPreset(parsed.preset ?? 'Flat');
                setBands(parsed.bands ?? PRESETS['Flat']);
            } catch (e) {
                console.error("Failed to load EQ settings", e);
            }
        }
    }, []);

    // Save settings
    useEffect(() => {
        localStorage.setItem('melora-eq', JSON.stringify({
            isEnabled,
            preset: currentPreset,
            bands
        }));
    }, [isEnabled, currentPreset, bands]);

    const setBand = useCallback((index: number, gain: number) => {
        setBands(prev => {
            const next = [...prev];
            next[index] = gain;
            return next;
        });
        setCurrentPreset('Custom');
    }, []);

    const setPreset = useCallback((name: string) => {
        if (PRESETS[name]) {
            setBands(PRESETS[name]);
            setCurrentPreset(name);
        }
    }, []);

    return {
        isEnabled,
        setIsEnabled,
        bands,
        setBand,
        currentPreset,
        setPreset,
        presets: Object.keys(PRESETS)
    };
}
