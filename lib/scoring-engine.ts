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
import { cleanArtistName, normalizeSongTitle, checkArtistOverlap } from './track-utils';
import { HistoryItem } from './history-store';
import { loadSettings } from './settings';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SessionContext {
    language: string;                       // Dominant language (e.g. "telugu")
    artists: Map<string, number>;           // Artist → weighted frequency (0-1)
    albums: Map<string, number>;            // Album → weighted frequency (0-1)
    avgYear: number;                        // Weighted average release year
    avgDuration: number;                    // Weighted average duration (seconds)
    genre: string;                          // Inferred genre/mood (e.g. "romantic", "sad", "party")
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
        recency: number;
        genre: number;
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
    ERA: 15,     // 0-15 (±3 year window) — BOOSTED from 10 for stronger era grouping
    DURATION: 5,     // 0-5 (within ±60s)
    POPULARITY: 5,     // 0-5
    RECENCY: 5,     // 0-5 (favor recent releases)
    GENRE: 10,     // 0-10 (mood/genre match bonus)
};

// ──────────────────────────────────────────────
// Genre/Mood Inference from Metadata
// ──────────────────────────────────────────────

/** Genre keyword patterns — matched against song name + album name (lowercase) */
const GENRE_KEYWORDS: Record<string, string[]> = {
    romantic: ['love', 'romantic', 'romance', 'ishq', 'pyaar', 'prema', 'priya', 'heart', 'dil', 'valentine'],
    sad: ['sad', 'broken', 'pain', 'cry', 'tears', 'miss', 'alone', 'lonely', 'virah', 'bewafa', 'heartbreak', 'lost'],
    party: ['party', 'dance', 'club', 'bass', 'dj', 'remix', 'beat', 'groov', 'edm', 'peppy'],
    devotional: ['bhakti', 'devotional', 'bhajan', 'aarti', 'mantra', 'prayer', 'god', 'temple', 'spiritual'],
    chill: ['chill', 'lofi', 'lo-fi', 'relax', 'calm', 'peace', 'acoustic', 'unplugged', 'soft', 'soothing'],
    hiphop: ['rap', 'hip hop', 'hiphop', 'trap', 'bars', 'flow', 'freestyle'],
    retro: ['retro', 'classic', 'golden', 'evergreen', 'old', 'nostalg', 'vintage', 'timeless'],
    workout: ['workout', 'gym', 'pump', 'motivation', 'energy', 'power', 'run', 'beast'],
    melody: ['melody', 'melodious', 'melodic', 'soulful', 'sufi', 'ghazal', 'classical'],
};

/** Infer genre/mood from song name + album name */
export function inferGenre(songName: string, albumName: string): string {
    const text = `${songName} ${albumName}`.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
        for (const kw of keywords) {
            if (text.includes(kw)) return genre;
        }
    }
    return ''; // No genre detected
}

const DEDUP_PENALTY = 100;

// Diversity rules
const DIVERSITY = {
    MAX_SAME_ARTIST_CONSECUTIVE: 1,         // No back-to-back same artist
    MAX_ALBUM_PER_WINDOW: 2,                // Max 2 from same album in 5-track window
    WINDOW_SIZE: 5,
    FORCED_DIVERSITY_INTERVAL: 4,           // Every 4th must be different artist
    ARTIST_COOLDOWN_WINDOW: 8,              // 2F: Look back 8 songs for artist cooldown
    MAX_SAME_ARTIST_IN_WINDOW: 2,           // 2F: Max 2 same artist in 8-song window
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
            genre: '',
        };
    }

    const artists = new Map<string, number>();
    const albums = new Map<string, number>();
    let totalYear = 0;
    let yearWeightSum = 0;
    let totalDuration = 0;
    let totalWeight = 0;
    const langVotes = new Map<string, number>();

    for (let i = 0; i < recent.length; i++) {
        const weight = RECENCY_WEIGHTS[i] ?? 0.05;
        const track = recent[i].track;
        const song = track.song;
        totalWeight += weight;

        // Language — only vote if language metadata exists
        const lang = song?.language?.toLowerCase();
        if (lang) {
            langVotes.set(lang, (langVotes.get(lang) || 0) + weight);
        }

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

        // Year - Ignore blank years [Phase 5]
        const year = parseInt(song?.year || '');
        if (year && year > 1900 && year <= new Date().getFullYear()) {
            totalYear += year * weight;
            yearWeightSum += weight;
        }

        // Duration
        totalDuration += (track.duration || song?.duration || 240) * weight;
    }

    // Normalize weights
    const normFactor = totalWeight > 0 ? 1 / totalWeight : 1;
    for (const [k, v] of artists) artists.set(k, v * normFactor);
    for (const [k, v] of albums) albums.set(k, v * normFactor);

    // Dominant language (highest weighted vote)
    let dominantLang = '';
    let maxLangWeight = 0;
    for (const [lang, w] of langVotes) {
        if (w > maxLangWeight) {
            dominantLang = lang;
            maxLangWeight = w;
        }
    }

    // [LOOPHOLE FIX #6] If no language votes, use user's preferred language
    if (!dominantLang) {
        const settings = loadSettings();
        dominantLang = settings?.languages?.[0]?.toLowerCase() || '';
    }

    // Handle edge case where no year was valid
    const finalYear = yearWeightSum > 0 ? Math.round(totalYear / yearWeightSum) : new Date().getFullYear();

    // Infer dominant genre from recent tracks
    const genreVotes = new Map<string, number>();
    for (let i = 0; i < recent.length; i++) {
        const weight = RECENCY_WEIGHTS[i] ?? 0.05;
        const track = recent[i].track;
        const song = track.song;
        const g = inferGenre(track.title || song?.name || '', song?.album?.name || '');
        if (g) genreVotes.set(g, (genreVotes.get(g) || 0) + weight);
    }
    let dominantGenre = '';
    let maxGenreWeight = 0;
    for (const [g, w] of genreVotes) {
        if (w > maxGenreWeight) { dominantGenre = g; maxGenreWeight = w; }
    }

    return {
        language: dominantLang,
        artists,
        albums,
        avgYear: Math.round(finalYear),
        avgDuration: Math.round(totalDuration * normFactor),
        genre: dominantGenre,
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
            recency: 0,
            genre: 0,
            dedup: 0,
        };

        // --- Language (SOFT BLOCK) ---
        // [V2 Fix 1b] Accept ANY of user's preferred languages, not just context.language
        const userSettings = loadSettings();
        const userLangs = new Set<string>((userSettings?.languages || []).map((l: string) => l.toLowerCase()));
        if (context.language) userLangs.add(context.language);

        const trackLang = song?.language?.toLowerCase() || '';
        if (trackLang && !userLangs.has(trackLang) && trackLang !== 'english') {
            breakdown.language = -Infinity;
            scored.push({ track, score: -Infinity, breakdown });
            continue;
        } else if (!trackLang) {
            breakdown.language = 0;
        } else if (trackLang === context.language) {
            breakdown.language = SCORE_WEIGHTS.LANGUAGE; // Full score for session language
        } else {
            breakdown.language = SCORE_WEIGHTS.LANGUAGE * 0.7; // Slight penalty for non-dominant user language
        }

        // --- [V2 Fix 4] Popularity Floor — block garbage (nursery rhymes etc.) ---
        const trackPlayCount = song?.playCount || 0;
        const seedArtistMatch = context.artists.get(cleanArtistName(track.artist)) || 0;
        if (trackPlayCount > 0 && trackPlayCount < 10000 && seedArtistMatch === 0) {
            breakdown.language = -Infinity;
            scored.push({ track, score: -Infinity, breakdown });
            continue;
        }

        // --- Artist Affinity (0-20) ---
        const artist = cleanArtistName(track.artist);
        const artistWeight = artist ? (context.artists.get(artist) || 0) : 0;
        breakdown.artist = Math.min(artistWeight * SCORE_WEIGHTS.ARTIST, SCORE_WEIGHTS.ARTIST);

        // --- Album Affinity (0-15, weighted) ---
        const albumName = song?.album?.name?.toLowerCase();
        const albumWeight = albumName ? (context.albums.get(albumName) || 0) : 0;
        breakdown.album = albumWeight * SCORE_WEIGHTS.ALBUM;

        // --- Era Proximity (0-10) ---
        const currentYear = new Date().getFullYear();
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

        // --- Recency Boost (0-5) ---
        if (trackYear > 0 && currentYear - trackYear <= 2) {
            breakdown.recency = SCORE_WEIGHTS.RECENCY;
        }

        // --- Genre/Mood Match (0-10) ---
        if (context.genre) {
            const trackGenre = inferGenre(track.title || song?.name || '', song?.album?.name || '');
            if (trackGenre === context.genre) {
                breakdown.genre = SCORE_WEIGHTS.GENRE; // Full match
            } else if (trackGenre && trackGenre !== context.genre) {
                breakdown.genre = -SCORE_WEIGHTS.GENRE * 0.3; // Mild penalty for clashing mood
            }
        }

        // --- Dedup HARD BLOCK (recently played or already in queue) ---
        if (recentIds.has(track.id) || queueIds.has(track.id)) {
            breakdown.dedup = -Infinity;
            scored.push({ track, score: -Infinity, breakdown });
            continue;
        }

        // --- Total ---
        const score = breakdown.language
            + breakdown.artist
            + breakdown.album
            + breakdown.era
            + breakdown.duration
            + breakdown.popularity
            + breakdown.recency
            + breakdown.genre
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

    for (const { track, breakdown } of viable) {
        if (selected.length >= targetCount) break;

        const artist = cleanArtistName(track.artist || (track.song as any)?.primaryArtists || '');
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

        const tName = normalizeSongTitle(track.title || (track.song as any)?.name || (track.song as any)?.title || '');
        const targetRawArtist = track.artist || (track.song as any)?.primaryArtists || '';

        // Skip if we already selected a different version of this same song
        const isDuplicate = selected.some(s => {
            const eName = normalizeSongTitle(s.title || (s.song as any)?.name || (s.song as any)?.title || '');
            if (eName !== tName) return false;

            const eRawArtist = s.artist || (s.song as any)?.primaryArtists || '';
            return checkArtistOverlap(eRawArtist, targetRawArtist);
        });

        if (isDuplicate) continue;

        // Count how many from this artist are already selected
        const artistCount = selected.filter(s => {
            const sArtist = cleanArtistName((s.song as any)?.primaryArtists || s.artist || '');
            return sArtist === cleanArtistName(targetRawArtist);
        }).length;

        // Diversity bounds: max 2 songs from same artist within a 10-song batch
        if (artistCount < 2) {
            selected.push(track);
            lastArtist = artist;

            if (album) {
                const positions = albumWindow.get(album) || [];
                positions.push(pos);
                albumWindow.set(album, positions);
            }

            if (track.song) {
                (track.song as any).recommendationReason = breakdown;
            } else {
                (track as any).recommendationReason = breakdown;
            }
        }
    }

    // Fallback: if diversity rules were too strict, fill remaining from top scores
    if (selected.length < targetCount && selected.length < viable.length) {
        for (const { track } of viable) {
            if (selected.length >= targetCount) break;

            const tName = normalizeSongTitle(track.title || (track.song as any)?.name || (track.song as any)?.title || '');
            const targetRawArtist = track.artist || (track.song as any)?.primaryArtists || '';

            const isDuplicate = selected.some(s => {
                const eName = normalizeSongTitle(s.title || (s.song as any)?.name || (s.song as any)?.title || '');
                if (eName !== tName) return false;

                const eRawArtist = s.artist || (s.song as any)?.primaryArtists || '';
                return checkArtistOverlap(eRawArtist, targetRawArtist);
            });

            if (!isDuplicate) {
                selected.push(track);
            }
        }
    }

    return selected;
}


// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
