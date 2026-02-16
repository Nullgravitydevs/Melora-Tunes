import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function decodeHtml(html: string) {
    if (typeof document === "undefined") return html;
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

export const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof document === 'undefined') {
            resolve();
            return;
        }
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
    });
};

export function parseLrc(lrc: string) {
    const lines = lrc.split('\n');
    const result: { time: number; text: string }[] = [];

    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                result.push({ time, text });
            }
        }
    }

    return result;
}

/**
 * Enhanced LRC Parser with Word-Level Timestamps
 * Supports Enhanced LRC format: [00:12.00]<00:12.00>Hello <00:12.50>World
 * Returns lines with individual word timings for karaoke-style highlighting
 */
export interface LrcWord {
    text: string;
    startTime: number;
    endTime: number;
}

export interface EnhancedLrcLine {
    time: number;
    text: string;
    words: LrcWord[];
}

export function parseEnhancedLrc(lrc: string): EnhancedLrcLine[] {
    const lines = lrc.split('\n');
    const result: EnhancedLrcLine[] = [];

    const lineTimeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    // Enhanced LRC word timing: <mm:ss.ms>word or <ss.ms>word
    const wordTimeRegex = /<(\d{1,2}):?(\d{2})\.(\d{2,3})>([^<\n]+)/g;

    for (const line of lines) {
        const lineMatch = line.match(lineTimeRegex);
        if (!lineMatch) continue;

        // Parse line timestamp
        const lineMinutes = parseInt(lineMatch[1]);
        const lineSeconds = parseInt(lineMatch[2]);
        const lineMs = parseInt(lineMatch[3].padEnd(3, '0'));
        const lineTime = lineMinutes * 60 + lineSeconds + lineMs / 1000;

        // Get text after line timestamp
        const textPart = line.replace(lineTimeRegex, '');

        // Try to parse word-level timestamps
        const words: LrcWord[] = [];
        let wordMatch;
        let lastEndTime = lineTime;

        // Reset regex
        wordTimeRegex.lastIndex = 0;

        while ((wordMatch = wordTimeRegex.exec(textPart)) !== null) {
            // Parse word timestamp
            let wordTime: number;
            if (wordMatch[1].length <= 2 && !wordMatch[2]) {
                // Format: <ss.ms>
                wordTime = parseInt(wordMatch[1]) + parseInt(wordMatch[3].padEnd(3, '0')) / 1000;
            } else {
                // Format: <mm:ss.ms>
                const wMin = parseInt(wordMatch[1]);
                const wSec = parseInt(wordMatch[2]);
                const wMs = parseInt(wordMatch[3].padEnd(3, '0'));
                wordTime = wMin * 60 + wSec + wMs / 1000;
            }

            const wordText = wordMatch[4].trim();
            if (wordText) {
                words.push({
                    text: wordText,
                    startTime: wordTime,
                    endTime: 0 // Will be set after collecting all words
                });
            }
            lastEndTime = wordTime;
        }

        // Set end times for words (each word ends when the next begins)
        for (let i = 0; i < words.length; i++) {
            if (i < words.length - 1) {
                words[i].endTime = words[i + 1].startTime;
            } else {
                // Last word ends 0.5s after start (or at next line)
                words[i].endTime = words[i].startTime + 0.5;
            }
        }

        // Clean text (remove word timestamps for display)
        const cleanText = textPart.replace(/<\d{1,2}:?\d{2}\.\d{2,3}>/g, '').trim();

        // If no word-level timing found, create single word from entire line
        if (words.length === 0 && cleanText) {
            words.push({
                text: cleanText,
                startTime: lineTime,
                endTime: lineTime + 3 // Default 3 second duration
            });
        }

        if (cleanText) {
            result.push({
                time: lineTime,
                text: cleanText,
                words
            });
        }
    }

    // Update end times based on next line start
    for (let i = 0; i < result.length - 1; i++) {
        const lastWord = result[i].words[result[i].words.length - 1];
        if (lastWord) {
            lastWord.endTime = Math.min(lastWord.endTime, result[i + 1].time);
        }
    }

    return result;
}

/**
 * Get currently active word based on playback time
 */
export function getCurrentWord(lines: EnhancedLrcLine[], currentTime: number): { lineIndex: number; wordIndex: number } | null {
    for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        for (let w = 0; w < line.words.length; w++) {
            const word = line.words[w];
            if (currentTime >= word.startTime && currentTime < word.endTime) {
                return { lineIndex: l, wordIndex: w };
            }
        }
    }
    return null;
}

/**
 * Sanitizes track titles by removing duplicate "Remix" tags and extra whitespace.
 * Example: "Song (Remix) (Remix)" -> "Song (Remix)"
 */
export function cleanTrackTitle(title: string): string {
    if (!title) return "";
    let clean = title.trim();

    // Remove duplicate (Remix) tags
    // This regex looks for repeated case-insensitive "(Remix)" or "- Remix" patterns
    const remixRegex = /(\(Remix\)\s*){2,}/gi;
    clean = clean.replace(remixRegex, '(Remix)');

    // Remove double spaces
    clean = clean.replace(/\s+/g, ' ');

    return clean;
}
