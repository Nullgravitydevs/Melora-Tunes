import { useState, useEffect } from 'react';
import { JioSaavnSong, getSyncedLyrics } from '@/lib/jiosaavn';

export interface LyricLine {
    time: number;
    text: string;
}

export function useLyrics(currentSong: JioSaavnSong | undefined) {
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState<number>(0); // Sync offset in seconds

    useEffect(() => {
        if (!currentSong) {
            setLyrics([]);
            setPlainLyrics(null);
            return;
        }

        let cancelled = false;

        const fetchLyrics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { synced, text } = await getSyncedLyrics(currentSong);

                if (cancelled) return;

                if (synced && text) {
                    const parsed = parseLRC(text);
                    setLyrics(parsed);
                    setIsSynced(true);
                    setPlainLyrics(null);
                } else {
                    setLyrics([]);
                    setIsSynced(false);
                    setPlainLyrics(text || "No lyrics available.");
                }

            } catch (err) {
                if (cancelled) return;
                console.error("Lyrics fetch failed", err);
                setError("Failed to load lyrics");
                setLyrics([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchLyrics();

        return () => { cancelled = true; };
    }, [currentSong?.id]);

    return { lyrics, plainLyrics, isSynced, isLoading, error, offset, setOffset };
}

function parseLRC(lrc: string): LyricLine[] {
    const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0').substring(0, 3)); // Normalize ms to 3 digits
            const text = match[4].trim();
            const time = min * 60 + sec + ms / 1000;

            if (text) {
                result.push({ time, text });
            }
        }
    }

    return result;
}
