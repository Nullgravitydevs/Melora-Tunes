/**
 * Scoring Engine — Continuous Playback Brain
 * 
 * 4-Layer Architecture:
 *   Layer 1: Session Context (recency-weighted last 5 tracks)
 *   Layer 2: Candidate Pool (fed by discovery-engine.ts)
 *   Layer 3: Deterministic Scoring (language hard-block, artist/album/era affinity)
 *   Layer 4: Diversity Filter (artist cooldown, album spacing)
 * 
 * Pure functions. No side effects. No async. No state.
 */

import { PlayableTrack, isPlayableTrack } from './types';
import { JioSaavnSong } from './jiosaavn';
import { HistoryItem } from './history-store';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SessionContext {
    language: string;                       // Dominant language (e.g. "telugu")
    artists: Map<string, number>;           // Artist → weighted frequency (0-1)
    albums: Map<string, number>;            // Album → weighted frequency (0-1)
    avgYear: number;                        // Weighted average release year
    avgDuration: number;                    // Weighted average duration (seconds)
}

export interface ScoredTrack {
    track: PlayableTrack;
    score: number;
    breakdown: {
        language: number;
        artist: number;
        album: number;
        era: number;
        duration: number;
        popularity: number;
        dedup: number;
    };
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

// Recency weights for last 5 tracks (latest → oldest)
const RECENCY_WEIGHTS = [0.40, 0.25, 0.15, 0.10, 0.10];

// Scoring weights
const SCORE_WEIGHTS = {
    LANGUAGE: 40,     // Hard block if mismatch
    ARTIST: 20,     // 0-20
    ALBUM: 15,     // 0 or 15
    ERA: 10,     // 0-10 (±3 year window)
    DURATION: 5,     // 0-5 (within ±60s)
    POPULARITY: 5,     // 0-5
    RECENCY: 5,     // 0-5 (favor recent releases)
};

const DEDUP_PENALTY = 100;

// Diversity rules
const DIVERSITY = {
    MAX_SAME_ARTIST_CONSECUTIVE: 1,         // No back-to-back same artist
    MAX_ALBUM_PER_WINDOW: 2,                // Max 2 from same album in 5-track window
    WINDOW_SIZE: 5,
    FORCED_DIVERSITY_INTERVAL: 4,           // Every 4th must be different artist
};

// ──────────────────────────────────────────────
// Layer 1: Build Session Context
// ──────────────────────────────────────────────

/**
 * Build a weighted session context from the last N played tracks.
 * Most recent track gets 40% influence, oldest gets 10%.
 */
export function buildSessionContext(history: HistoryItem[]): SessionContext {
    const recent = history.slice(0, 5);

    if (recent.length === 0) {
        return {
            language: 'english',
            artists: new Map(),
            albums: new Map(),
            avgYear: new Date().getFullYear(),
            avgDuration: 240,
        };
    }

    const artists = new Map<string, number>();
    const albums = new Map<string, number>();
    let totalYear = 0;
    let totalDuration = 0;
    let totalWeight = 0;
    const langVotes = new Map<string, number>();

    for (let i = 0; i < recent.length; i++) {
        const weight = RECENCY_WEIGHTS[i] ?? 0.05;
        const track = recent[i].track;
        const song = track.song;
        totalWeight += weight;

        // Language
        const lang = song?.language?.toLowerCase() || 'english';
        langVotes.set(lang, (langVotes.get(lang) || 0) + weight);

        // Artist (first artist only, cleaned)
        const artist = cleanArtistName(track.artist);
        if (artist) {
            artists.set(artist, (artists.get(artist) || 0) + weight);
        }

        // Album
        const albumName = song?.album?.name?.toLowerCase();
        if (albumName) {
            albums.set(albumName, (albums.get(albumName) || 0) + weight);
        }

        // Year
        const year = parseInt(song?.year || '') || new Date().getFullYear();
        totalYear += year * weight;

        // Duration
        totalDuration += (track.duration || song?.duration || 240) * weight;
    }

    // Normalize weights
    const normFactor = totalWeight > 0 ? 1 / totalWeight : 1;
    for (const [k, v] of artists) artists.set(k, v * normFactor);
    for (const [k, v] of albums) albums.set(k, v * normFactor);

    // Dominant language (highest weighted vote)
    let dominantLang = 'english';
    let maxLangWeight = 0;
    for (const [lang, w] of langVotes) {
        if (w > maxLangWeight) {
            dominantLang = lang;
            maxLangWeight = w;
        }
    }

    return {
        language: dominantLang,
        artists,
        albums,
        avgYear: Math.round(totalYear * normFactor),
        avgDuration: Math.round(totalDuration * normFactor),
    };
}

// ──────────────────────────────────────────────
// Layer 3: Score Candidates
// ──────────────────────────────────────────────

/**
 * Score every candidate against the session context.
 * Language mismatch = -Infinity (hard block).
 * Returns sorted array (highest score first).
 */
export function scoreCandidates(
    candidates: PlayableTrack[],
    context: SessionContext,
    recentIds: Set<string>,       // Last 50 played IDs (dedup)
    queueIds: Set<string>,        // Current mix song IDs (dedup)
): ScoredTrack[] {
    const scored: ScoredTrack[] = [];

    for (const track of candidates) {
        const song = track.song;
        const breakdown = {
            language: 0,
            artist: 0,
            album: 0,
            era: 0,
            duration: 0,
            popularity: 0,
            dedup: 0,
        };

        // --- Language (HARD BLOCK) ---
        const trackLang = song?.language?.toLowerCase() || '';
        if (trackLang && trackLang !== context.language) {
            // Wrong language = impossible to select
            breakdown.language = -Infinity;
            scored.push({ track, score: -Infinity, breakdown });
            continue;
        }
        breakdown.language = trackLang ? SCORE_WEIGHTS.LANGUAGE : 0;

        // --- Artist Affinity (0-20) ---
        const artist = cleanArtistName(track.artist);
        const artistWeight = artist ? (context.artists.get(artist) || 0) : 0;
        breakdown.artist = Math.min(artistWeight * SCORE_WEIGHTS.ARTIST, SCORE_WEIGHTS.ARTIST);

        // --- Album Affinity (0 or 15) ---
        const albumName = song?.album?.name?.toLowerCase();
        const albumWeight = albumName ? (context.albums.get(albumName) || 0) : 0;
        breakdown.album = albumWeight > 0 ? SCORE_WEIGHTS.ALBUM : 0;

        // --- Era Proximity (0-10) ---
        const trackYear = parseInt(song?.year || '') || 0;
        if (trackYear > 0 && context.avgYear > 0) {
            const diff = Math.abs(trackYear - context.avgYear);
            // Within 3 years = full score, degrades linearly to 0 at 10 years
            breakdown.era = diff <= 3
                ? SCORE_WEIGHTS.ERA
                : Math.max(0, SCORE_WEIGHTS.ERA * (1 - (diff - 3) / 7));
        }

        // --- Duration Similarity (0-5) ---
        const trackDuration = track.duration || song?.duration || 0;
        if (trackDuration > 0 && context.avgDuration > 0) {
            const durationDiff = Math.abs(trackDuration - context.avgDuration);
            // Within 60s = full score, degrades to 0 at 180s
            breakdown.duration = durationDiff <= 60
                ? SCORE_WEIGHTS.DURATION
                : Math.max(0, SCORE_WEIGHTS.DURATION * (1 - (durationDiff - 60) / 120));
        }

        // --- Popularity (0-5) ---
        const playCount = song?.playCount || 0;
        if (playCount > 0) {
            // Logarithmic scale: 100K+ plays = full score
            const logPop = Math.log10(Math.max(playCount, 1));
            breakdown.popularity = Math.min(logPop / 5 * SCORE_WEIGHTS.POPULARITY, SCORE_WEIGHTS.POPULARITY);
        }

        // --- Dedup Penalty ---
        if (recentIds.has(track.id) || queueIds.has(track.id)) {
            breakdown.dedup = -DEDUP_PENALTY;
        }

        // --- Total ---
        const score = breakdown.language
            + breakdown.artist
            + breakdown.album
            + breakdown.era
            + breakdown.duration
            + breakdown.popularity
            + breakdown.dedup;

        scored.push({ track, score, breakdown });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
}

// ──────────────────────────────────────────────
// Layer 4: Diversity Filter
// ──────────────────────────────────────────────

/**
 * Apply diversity rules to prevent artist spam and album dumps.
 * 
 * Rules:
 * 1. No same artist back-to-back
 * 2. Max 2 songs from same album in any 5-track window
 * 3. Every 4th pick must be a different artist
 * 
 * If filter removes too many, relax album rule.
 */
export function applyDiversityFilter(
    scored: ScoredTrack[],
    targetCount: number = 10,
): PlayableTrack[] {
    // Only consider positive-score candidates
    const viable = scored.filter(s => s.score > 0);

    if (viable.length === 0) return [];
    if (viable.length <= 3) return viable.map(s => s.track);

    const selected: PlayableTrack[] = [];
    const albumWindow = new Map<string, number[]>(); // album → positions selected
    let lastArtist = '';
    let consecutiveSameArtist = 0;

    for (const { track } of viable) {
        if (selected.length >= targetCount) break;

        const artist = cleanArtistName(track.artist);
        const album = track.song?.album?.name?.toLowerCase() || '';
        const pos = selected.length;

        // Rule 1: No same artist back-to-back
        if (artist === lastArtist && selected.length > 0) {
            continue;
        }

        // Rule 2: Max 2 from same album in 5-track window
        if (album) {
            const albumPositions = albumWindow.get(album) || [];
            const recentInWindow = albumPositions.filter(p => pos - p < DIVERSITY.WINDOW_SIZE);
            if (recentInWindow.length >= DIVERSITY.MAX_ALBUM_PER_WINDOW) {
                continue;
            }
        }

        // Rule 3: Every 4th must be different from the preceding 3
        if (pos > 0 && pos % DIVERSITY.FORCED_DIVERSITY_INTERVAL === 0) {
            const recentArtists = selected.slice(-3).map(s => cleanArtistName(s.artist));
            if (recentArtists.includes(artist)) {
                continue; // Force a different artist
            }
        }

        // Passed all rules — select this track
        selected.push(track);
        lastArtist = artist;

        if (album) {
            const positions = albumWindow.get(album) || [];
            positions.push(pos);
            albumWindow.set(album, positions);
        }
    }

    // Fallback: if diversity rules were too strict, fill remaining from top scores
    if (selected.length < targetCount && selected.length < viable.length) {
        const selectedIds = new Set(selected.map(s => s.id));
        for (const { track } of viable) {
            if (selected.length >= targetCount) break;
            if (!selectedIds.has(track.id)) {
                selected.push(track);
                selectedIds.add(track.id);
            }
        }
    }

    return selected;
}

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────

/**
 * Clean and normalize artist name for comparison.
 * "Thaman S, Shreya Ghoshal" → "thaman s"
 */
function cleanArtistName(raw: string): string {
    if (!raw) return '';
    return raw
        .split(/[,&]/)[0]          // First artist only
        .replace(/\(.*?\)/g, '')    // Remove parentheses
        .trim()
        .toLowerCase();
}
