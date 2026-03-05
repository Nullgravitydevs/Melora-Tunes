/**
 * Discovery Engine — Continuous Playback DJ
 * 
 * 4-Layer Architecture:
 *   Layer 1: Session Context (via scoring-engine.ts)
 *   Layer 2: 3-Tier Candidate Fetching (album → artist → language search)
 *   Layer 3: Deterministic Scoring (via scoring-engine.ts)
 *   Layer 4: Diversity Filter (via scoring-engine.ts)
 * 
 * Emergency fallback: OfflineStore → HistoryStore → least-recent replay
 */

import { PlayableTrack } from './types';
import { SignalStore } from './signal-store';
import { HistoryStore } from './history-store';
import { getTrending, searchSongs, getSongDetails, getAlbumSongs } from './jiosaavn';
import { searchUnified } from './unified-search';
import { Mix } from '@/lib/types';
import { ensurePlayableTrack } from '@/lib/track-utils';
import { buildSessionContext, scoreCandidates, applyDiversityFilter, inferGenre } from './scoring-engine';
import { loadSettings } from '@/lib/settings';
import type { AudioQuality } from './types';

// --- STRICT NORMALIZATION (kept for backward compat) ---
export function normalizeIdentity(title: string, artist: string): string {
    const clean = (s: string) => (s || '').toLowerCase()
        .replace(/\(feat.*?\)/g, '')
        .replace(/\[live\]/g, '')
        .replace(/remix/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    return `${clean(title)}|${clean(artist)}`;
}

// Junk title filter — reject remixes, slowed, lofi, etc.
const JUNK_KEYWORDS = ['remix', 'lofi', 'slowed', 'reverb', 'cover', 'live at', 'demo', '8d audio', 'karaoke'];
function isCleanTrack(title: string): boolean {
    const lower = title.toLowerCase();
    return !JUNK_KEYWORDS.some(j => lower.includes(j));
}

export class DiscoveryEngine {

    // ──────────────────────────────────────────────
    // PUBLIC: Generate Session Mix (The DJ)
    // ──────────────────────────────────────────────

    /**
     * Generate a Session Mix for continuous playback.
     * 
     * Uses 4-layer architecture:
     * 1. Build session context from last 5 played tracks
     * 2. Fetch candidates from 3 tiers (album → artist → language)
     * 3. Score candidates against session context
     * 4. Apply diversity filter (artist cooldown, album spacing)
     * 
     * @param seed - The currently playing song
     * @param region - Optional language hint (used as fallback if no history)
     */
    static async generateSessionMix(seed: PlayableTrack, region?: string, currentQueueIds?: string[]): Promise<Mix> {
        const startTime = Date.now();
        const quality = seed.preferredQuality || '320';

        // ── Read user's preferred languages from Settings ──
        const userSettings = loadSettings();
        const userLanguages: string[] = userSettings?.languages || ['english'];
        const primaryUserLang = userLanguages[0] || 'english';

        // ── Layer 1: Session Context (Session Drift — 2G) ──
        const history = HistoryStore.getHistory();

        // [GAPLESS FIX] The currently playing 'seed' song is NOT in HistoryStore yet 
        // because it just started. If we don't inject it here, the engine 
        // will build its context exclusively around the user's PREVIOUS session.
        const seedHistoryItem = { id: 'seed', track: seed, playedAt: Date.now() };
        const contextHistory = [seedHistoryItem, ...history.slice(0, 4)];

        const context = buildSessionContext(contextHistory);

        // [BUG FIX #2] If context.language is empty, use the user's preferred language
        if (!context.language) {
            context.language = primaryUserLang;
        }

        // [BUG FIX #3] Never allow empty/unknown language — always fall back to user pref
        const seedLang = seed.song?.language?.toLowerCase() || context.language || primaryUserLang;
        const seedArtist = (seed.artist || '').split(/[,&]/)[0].trim();
        const seedAlbumId = seed.song?.album?.id || '';

        console.log(`🎧 [Autoplay] Session: lang=${context.language}, genre=${context.genre || 'none'}, artist=${seedArtist}, album=${seed.song?.album?.name || 'none'}, era=${context.avgYear}`);

        // ── Layer 2: Fetch Candidates (5 Tiers, parallel) ──
        const [albumTracks, artistTracks, languageTracks, trendingTracks, moodTracks] = await Promise.all([
            this.fetchAlbumCandidates(seedAlbumId, seed.id, quality),
            this.fetchArtistCandidates(seedArtist, seedLang, quality),
            this.fetchLanguageCandidates(seedLang, context.avgYear, quality),
            this.fetchTrendingCandidates(seedLang, quality),
            this.fetchMoodCandidates(seedLang, context.genre, quality),
        ]);

        const allRaw = [...albumTracks, ...artistTracks, ...languageTracks, ...trendingTracks, ...moodTracks];

        // Cross-tier dedup: prevent same track from being scored multiple times
        // Use semantic key so same song under different IDs does not leak through.
        const uniqueMap = new Map<string, PlayableTrack>();
        for (const t of allRaw) {
            const semanticKey = normalizeIdentity(
                t.title || t.song?.name || '',
                t.artist || t.song?.primaryArtists || ''
            );
            if (!uniqueMap.has(semanticKey)) uniqueMap.set(semanticKey, t);
        }
        const allCandidates = Array.from(uniqueMap.values());
        console.log(`🎧 [Autoplay] Candidates: album=${albumTracks.length}, artist=${artistTracks.length}, language=${languageTracks.length}, trending=${trendingTracks.length}, mood=${moodTracks.length}, unique=${allCandidates.length}`);

        // ── Layer 3: Score ──
        // 2E: Use last 200 played IDs (not 50) to prevent repeats in 3+ hour sessions
        const recentIds = new Set(history.slice(0, 200).map(h => h.track.id));
        const queueIds = new Set<string>(currentQueueIds || []);
        // Add seed to prevent it from appearing
        recentIds.add(seed.id);

        const scored = scoreCandidates(allCandidates, context, recentIds, queueIds);

        // ── Layer 4: Diversity Filter ──
        let finalTracks = applyDiversityFilter(scored, 10);

        // ── Emergency Fallback ──
        if (finalTracks.length === 0) {
            console.warn('🎧 [Autoplay] All fetchers empty — using emergency fallback');
            finalTracks = this.emergencyFallback(recentIds, quality);
        }

        const elapsed = Date.now() - startTime;
        console.log(`🎧 [Autoplay] Selected ${finalTracks.length} tracks in ${elapsed}ms`);

        // Return as Mix (compatible with existing playback-context.tsx caller)
        return {
            id: 'discovery-mix',
            title: context.language
                ? `${context.language.charAt(0).toUpperCase() + context.language.slice(1)} Mix`
                : 'Discovery Mix',
            color: 'blue',
            songs: finalTracks,
            currentSongIndex: 0,
        };
    }

    // ──────────────────────────────────────────────
    // PUBLIC: Genre & Chart Mixes (unchanged API)
    // ──────────────────────────────────────────────

    static async generateGenreMix(genre: string, region?: string): Promise<Mix> {
        console.log(`💿 The DJ: Mixing Genre: ${genre}`);
        try {
            const query = `${genre} Hits ${region || ''}`;
            const results = await searchUnified(query);
            if (results.length === 0) throw new Error("No seed found for genre");

            const seed = results[Math.floor(Math.random() * Math.min(5, results.length))];
            const mix = await this.generateSessionMix(seed, region);
            mix.title = `${genre} Mix`;
            mix.color = 'purple';
            return mix;
        } catch (e) {
            console.error("Genre Mix Failed", e);
            throw e;
        }
    }

    static async generateChartMix(chartName: string, region?: string): Promise<Mix> {
        console.log(`💿 The DJ: Mixing Chart: ${chartName}`);
        try {
            const query = `${chartName} ${region || ''}`;
            const results = await searchUnified(query);
            if (results.length === 0) throw new Error("No seed found for chart");

            const seed = results[0];
            const mix = await this.generateSessionMix(seed, region);
            mix.title = `${chartName}`;
            mix.color = 'red';
            return mix;
        } catch (e) {
            throw e;
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Tier 1 — Same Album Candidates
    // ──────────────────────────────────────────────

    private static async fetchAlbumCandidates(
        albumId: string,
        seedId: string,
        quality: AudioQuality,
    ): Promise<PlayableTrack[]> {
        if (!albumId) return [];

        try {
            const songs = await getAlbumSongs(albumId);
            return songs
                .filter(s => s.id !== seedId && isCleanTrack(s.name || ''))
                .slice(0, 20)
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) {
            console.warn('[Autoplay] Album fetch failed:', e);
            return [];
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Tier 2 — Same Artist Candidates
    // ──────────────────────────────────────────────

    private static async fetchArtistCandidates(
        artist: string,
        language: string,
        quality: AudioQuality,
    ): Promise<PlayableTrack[]> {
        if (!artist) return [];

        try {
            // Search with artist + language in both query and API param for strongest results
            const query = `${artist} ${language} songs`;
            const songs = await searchSongs(query, 1, 15, language);
            return (songs || [])
                .filter(s => isCleanTrack(s.name || ''))
                .slice(0, 20)
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) {
            console.warn('[Autoplay] Artist fetch failed:', e);
            return [];
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Tier 3 — Language + Era Search
    // ──────────────────────────────────────────────

    private static async fetchLanguageCandidates(
        language: string,
        avgYear: number,
        quality: AudioQuality,
    ): Promise<PlayableTrack[]> {
        if (!language) return [];

        try {
            // [V2 Fix 1] Pick language randomly from user's preferred languages
            const userSettings = loadSettings();
            const userLangs: string[] = userSettings?.languages || [language];
            const searchLang = userLangs[Math.floor(Math.random() * userLangs.length)] || language;

            // Build a query that targets the right era, pass language to API
            const currentYear = new Date().getFullYear();
            // [Phase 3] Randomize queries to break deterministic repetition loops
            const eraKeywords = avgYear >= currentYear - 2
                ? ['latest hits', 'new songs', 'popular songs', 'top songs']
                : [`${avgYear} hits`, `${avgYear} songs`, `best of ${avgYear}`, `${avgYear} popular`];
            const eraKeyword = eraKeywords[Math.floor(Math.random() * eraKeywords.length)];
            const page = 1 + Math.floor(Math.random() * 3); // Randomize page 1-3
            const query = `${searchLang} ${eraKeyword}`;

            const songs = await searchSongs(query, page, 20, searchLang);
            return (songs || [])
                .filter(s => isCleanTrack(s.name || ''))
                .slice(0, 20)
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) {
            console.warn('[Autoplay] Language fetch failed:', e);
            return [];
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Tier 4 — Trending in Language
    // ──────────────────────────────────────────────

    private static async fetchTrendingCandidates(
        language: string,
        quality: AudioQuality,
    ): Promise<PlayableTrack[]> {
        try {
            // [LOOPHOLE FIX #5] Also accept songs matching any of user's preferred languages
            const userSettings = loadSettings();
            const userLangs = new Set((userSettings?.languages || []).map((l: string) => l.toLowerCase()));
            if (language) userLangs.add(language);

            const trending = await getTrending();
            return (trending || [])
                .filter(s => {
                    const lang = (s as any).language?.toLowerCase() || '';
                    // Only allow songs whose language matches user's preferences (or has no tag)
                    return (userLangs.has(lang) || !lang) && isCleanTrack(s.name || '');
                })
                .slice(0, 15)
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) {
            console.warn('[Autoplay] Trending fetch failed:', e);
            return [];
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Tier 5 — Mood/Genre-Aware Search
    // ──────────────────────────────────────────────

    private static async fetchMoodCandidates(
        language: string,
        genre: string,
        quality: AudioQuality,
    ): Promise<PlayableTrack[]> {
        if (!genre) return []; // No mood detected, skip

        try {
            // Pick language randomly from user's preferred languages
            const userSettings = loadSettings();
            const userLangs: string[] = userSettings?.languages || [language];
            const searchLang = userLangs[Math.floor(Math.random() * userLangs.length)] || language;

            // Genre-specific search queries for richer results
            const moodQueries: Record<string, string[]> = {
                romantic: ['romantic songs', 'love songs', 'romantic melody'],
                sad: ['sad songs', 'heartbreak songs', 'emotional songs'],
                party: ['party songs', 'dance hits', 'party anthems'],
                devotional: ['devotional songs', 'bhakti songs', 'spiritual songs'],
                chill: ['chill songs', 'lo-fi songs', 'acoustic songs'],
                hiphop: ['hip hop songs', 'rap songs', 'rap hits'],
                retro: ['classic songs', 'evergreen hits', 'golden hits'],
                workout: ['workout songs', 'gym songs', 'motivation songs'],
                melody: ['melody songs', 'soulful songs', 'melodious hits'],
            };

            const queries = moodQueries[genre] || [`${genre} songs`];
            const query = `${searchLang} ${queries[Math.floor(Math.random() * queries.length)]}`;
            const page = 1 + Math.floor(Math.random() * 2);

            console.log(`🎧 [Autoplay] Mood search: "${query}" (genre: ${genre})`);
            const songs = await searchSongs(query, page, 15, searchLang);
            return (songs || [])
                .filter(s => isCleanTrack(s.name || ''))
                .slice(0, 15)
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) {
            console.warn('[Autoplay] Mood fetch failed:', e);
            return [];
        }
    }

    // ──────────────────────────────────────────────
    // PRIVATE: Emergency Fallback
    // ──────────────────────────────────────────────

    /**
     * When all API calls fail, use local data to keep playback alive.
     * Priority: HistoryStore unplayed → least-recent replay
     */
    private static emergencyFallback(
        recentIds: Set<string>,
        quality: AudioQuality,
    ): PlayableTrack[] {
        const history = HistoryStore.getHistory();

        // [BUG FIX #1] Title-level dedup to prevent "Gangsta's Paradise" x3
        const seenTitles = new Set<string>();
        const dedupByTitle = (tracks: PlayableTrack[]): PlayableTrack[] => {
            return tracks.filter(t => {
                const key = normalizeIdentity(t.title || '', t.artist || '');
                if (seenTitles.has(key)) return false;
                seenTitles.add(key);
                return true;
            });
        };

        // 1. Try unplayed history tracks (played before but not in recent 200)
        const unplayed = dedupByTitle(
            history
                .filter(h => !recentIds.has(h.track.id))
                .slice(0, 20)
                .map(h => h.track)
        ).slice(0, 10);

        if (unplayed.length > 0) {
            console.log(`🎧 [Autoplay] Emergency: using ${unplayed.length} unique unplayed history tracks`);
            return unplayed;
        }

        // 2. Last resort: replay least-recent tracks with dedup
        const leastRecent = dedupByTitle(
            history
                .slice(-20)
                .reverse()
                .map(h => h.track)
        ).slice(0, 10);

        if (leastRecent.length > 0) {
            console.log(`🎧 [Autoplay] Emergency: replaying ${leastRecent.length} unique least-recent tracks`);
            return leastRecent;
        }

        console.warn('🎧 [Autoplay] Emergency: no fallback available');
        return [];
    }
}
