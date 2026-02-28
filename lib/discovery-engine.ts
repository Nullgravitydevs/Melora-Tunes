import { PlayableTrack } from './types';
import { SignalStore } from './signal-store';
import { HistoryStore } from './history-store';
import { getTrending, searchSongs, getSongDetails } from './jiosaavn';
import { searchUnified } from './unified-search';
import { Mix } from '@/lib/types';
import { ensurePlayableTrack } from '@/lib/track-utils';

// --- STRICT NORMALIZATION ---
export function normalizeIdentity(title: string, artist: string): string {
    const clean = (s: string) => (s || '').toLowerCase()
        .replace(/\(feat.*?\)/g, '')
        .replace(/\[live\]/g, '')
        .replace(/remix/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    return `${clean(title)}|${clean(artist)}`;
}

export class DiscoveryEngine {

    // THE GOLDEN RATIO (Fixed)
    private static RATIOS = {
        TASTE: 0.3,    // 30% User Taste
        REGIONAL: 0.3, // 30% Regional/Trending
        ADJACENT: 0.2, // 20% Adjacent Artists
        WILDCARD: 0.2  // 20% High Quality Wildcards
    };

    /**
     * Generate a Session Mix (The DJ)
     * @param seed - The song that started the session
     * @param region - Optional region/language filter (e.g. 'telugu', 'hindi', 'english')
     */
    static async generateSessionMix(seed: PlayableTrack, region?: string): Promise<Mix> {
        console.log(`💿 The DJ: Spinning new mix for ${seed.title} [Region: ${region || 'Global'}]`);

        // INHERIT QUALITY
        const targetQuality = seed.preferredQuality || '320';

        // 1. Fetch Ingredients (Parallel)
        const [taste, regional, adjacent, wildcards] = await Promise.all([
            this.getTasteCandidates(targetQuality),
            this.getRegionalCandidates(targetQuality, region),
            this.getAdjacentCandidates(seed, targetQuality),
            this.getWildcardCandidates(targetQuality, region)
        ]);

        // 2. Mix Formulation (Target size ~20 songs)
        const pool: PlayableTrack[] = [];

        // Add Seed First (Always)
        pool.push(seed);

        // Fill buckets
        const fill = (source: PlayableTrack[], count: number) => {
            const added = source.slice(0, count);
            pool.push(...added);
        };

        const remaining = 19; // Target size 20 (minus seed)
        fill(taste, Math.ceil(remaining * this.RATIOS.TASTE));
        fill(regional, Math.ceil(remaining * this.RATIOS.REGIONAL));
        fill(adjacent, Math.ceil(remaining * this.RATIOS.ADJACENT));
        fill(wildcards, Math.ceil(remaining * this.RATIOS.WILDCARD));

        // 3. Post-Process (Smart Shuffle & Dedup)
        const finalMix = this.smartShuffle(pool, seed);

        // 4. Session Scoped Mix
        return {
            id: 'discovery-mix', // STABLE ID
            title: region ? `${region.charAt(0).toUpperCase() + region.slice(1)} Mix` : "Discovery Mix",
            color: 'blue',
            songs: finalMix,
            currentSongIndex: 0
        };
    }

    /**
     * Generate a Genre-Based Mix
     */
    static async generateGenreMix(genre: string, region?: string): Promise<Mix> {
        console.log(`💿 The DJ: Mixing Genre: ${genre}`);
        try {
            // 1. Find a seed
            const query = `${genre} Hits ${region || ''}`;
            const results = await searchUnified(query);

            if (results.length === 0) throw new Error("No seed found for genre");

            // Pick random top seed to avoid same start every time
            const seed = results[Math.floor(Math.random() * Math.min(5, results.length))];

            // 2. Generate Mix
            const mix = await this.generateSessionMix(seed, region);
            mix.title = `${genre} Mix`; // Override title
            mix.color = 'purple';
            return mix;
        } catch (e) {
            console.error("Genre Mix Failed", e);
            throw e;
        }
    }

    /**
     * Generate a Chart-Based Mix
     */
    static async generateChartMix(chartName: string, region?: string): Promise<Mix> {
        console.log(`💿 The DJ: Mixing Chart: ${chartName}`);
        try {
            const query = `${chartName} ${region || ''}`;
            const results = await searchUnified(query);

            if (results.length === 0) throw new Error("No seed found for chart");

            const seed = results[0]; // Chart usually implies order, pick top

            const mix = await this.generateSessionMix(seed, region);
            mix.title = `${chartName}`;
            mix.color = 'red';
            return mix;
        } catch (e) {
            throw e;
        }
    }

    // --- Ingredient Sourcing ---

    private static async getTasteCandidates(quality: any): Promise<PlayableTrack[]> {
        const topIds = SignalStore.getTopTaste(10);
        if (topIds.length === 0) return [];

        const candidates: PlayableTrack[] = [];
        // Only fetch top 5 for efficiency
        for (const id of topIds.slice(0, 5)) {
            try {
                const song = await getSongDetails(id);
                if (song) {
                    candidates.push(ensurePlayableTrack(song, quality));
                }
            } catch (e) { }
        }
        return candidates;
    }

    private static async getRegionalCandidates(quality: any, region?: string): Promise<PlayableTrack[]> {
        try {
            if (region && region.toLowerCase() !== 'global') {
                const query = `${region} Hit Songs`;
                const results = await searchUnified(query);
                return results.map(r => ensurePlayableTrack(r, quality));
            } else {
                // Pass region even for 'global' to respect language settings
                const trending = await getTrending(region || 'english');
                return trending.map(s => ensurePlayableTrack(s, quality));
            }
        } catch (e) { return []; }
    }

    private static async getAdjacentCandidates(seed: PlayableTrack, quality: any): Promise<PlayableTrack[]> {
        try {
            // Search for Artist Context
            const artist = seed.artist.split(',')[0].split('&')[0].trim();
            const query = `${artist} similar songs`;
            const results = await searchUnified(query);

            // Filter out seed
            const filtered = results.filter(s => s.id !== seed.id);

            // Minor shuffle for diversity
            return filtered
                .sort(() => 0.5 - Math.random())
                .map(s => ensurePlayableTrack(s, quality));
        } catch (e) { return []; }
    }

    private static async getWildcardCandidates(quality: any, region?: string): Promise<PlayableTrack[]> {
        // High Quality Wildcards - biased by Taste primarily
        const tasteIds = SignalStore.getTopTaste(3);

        let results: PlayableTrack[] = [];

        // 1. Try Taste-based discovery first
        if (tasteIds.length > 0) {
            const randomTasteId = tasteIds[Math.floor(Math.random() * tasteIds.length)];
            try {
                const song = await getSongDetails(randomTasteId);
                if (song) {
                    const artist = song.primaryArtists.split(',')[0];
                    const query = `${artist} radio`;
                    const tasteResults = await searchUnified(query);
                    results = tasteResults;
                }
            } catch (e) { }
        }

        // 2. Fallback to Keyword Wildcards
        if (results.length === 0) {
            const baseTerms = ['Top', 'Viral', 'New', 'Hifi', 'Master', 'Essential', 'Best of'];
            const term = baseTerms[Math.floor(Math.random() * baseTerms.length)];
            const query = region ? `${region} ${term}` : term;
            try {
                results = await searchUnified(query);
            } catch (e) { }
        }

        const clean = results.filter(track => {
            const name = track.title.toLowerCase();
            const junk = ['remix', 'lofi', 'slowed', 'reverb', 'cover', 'live at', 'demo'];
            if (junk.some(j => name.includes(j))) return false;
            return true;
        });

        return clean.sort(() => 0.5 - Math.random()).map(s => ensurePlayableTrack(s, quality));
    }

    // --- The Filter (Deduplication & Anti-Loop) ---

    private static smartShuffle(pool: PlayableTrack[], seed: PlayableTrack): PlayableTrack[] {
        const history = HistoryStore.getHistory();

        // STRICT 24H RULE: Only block last 24 tracks played
        // Actually, just last 24 items in history stack is good enough proxy.
        const recentHistory = history.slice(0, 24);
        const recentIdentities = new Set(recentHistory.map(h => normalizeIdentity(h.track.title, h.track.artist)));

        const unique = new Map<string, PlayableTrack>();
        const artistCounts = new Map<string, number>();

        // Add SEED first manually to ensure it exists
        unique.set(normalizeIdentity(seed.title, seed.artist), seed);

        const seedArtist = seed.artist.split(',')[0].split('&')[0].trim();
        artistCounts.set(seedArtist, 1);

        for (const track of pool) {
            const identity = normalizeIdentity(track.title, track.artist);

            // 1. Anti-Loop (Recent History Identity Check)
            if (recentIdentities.has(identity)) continue;

            // 2. Dedup in current mix
            if (unique.has(identity)) continue;

            // 3. Artist Cap (Max 2 per mix)
            const artist = track.artist.split(',')[0].split('&')[0].trim();
            const count = artistCounts.get(artist) || 0;
            if (count >= 2) continue; // Strict Cap

            // Add
            unique.set(identity, track);
            artistCounts.set(artist, count + 1);
        }

        // Convert to array
        const result = Array.from(unique.values());

        const seedIdentity = normalizeIdentity(seed.title, seed.artist);
        const seedTrack = unique.get(seedIdentity);

        // Remove seed from result to shuffle the rest
        const others = result.filter(t => t !== seedTrack);

        // Shuffle others
        others.sort(() => 0.5 - Math.random());

        // Return Seed + Others
        return [seedTrack!, ...others];
    }
}
