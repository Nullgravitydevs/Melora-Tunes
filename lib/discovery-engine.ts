import { PlayableTrack, isPlayableTrack } from './types';
import { SignalStore, WEIGHTS } from './signal-store';
import { HistoryStore } from './history-store';
import { getTrending, searchSongs, getSongDetails } from './jiosaavn';
import { searchUnified } from './unified-search';
import { Mix } from '@/components/providers/playback-context';

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
        console.log(`💿 The DJ: Spinning new mix for ${seed.song.name} [Region: ${region || 'Global'}]`);

        // 1. Fetch Ingredients (Parallel)
        const [taste, regional, adjacent, wildcards] = await Promise.all([
            this.getTasteCandidates(),
            this.getRegionalCandidates(region),
            this.getAdjacentCandidates(seed),
            this.getWildcardCandidates(region)
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
            id: `discovery-mix-${Date.now()}`, // UNIQUE SESSION ID
            title: region ? `${region.charAt(0).toUpperCase() + region.slice(1)} Mix` : "Discovery Mix",
            color: 'blue',
            songs: finalMix,
            currentSongIndex: 0
        };
    }

    // --- Ingredient Sourcing ---

    private static async getTasteCandidates(): Promise<PlayableTrack[]> {
        const topIds = SignalStore.getTopTaste(10);
        if (topIds.length === 0) return [];

        const candidates: PlayableTrack[] = [];
        // Only fetch top 5 for efficiency
        for (const id of topIds.slice(0, 5)) {
            try {
                const song = await getSongDetails(id);
                if (song) candidates.push({ song, id: song.id, preferredQuality: '320', sources: [] });
            } catch (e) { }
        }
        return candidates;
    }

    private static async getRegionalCandidates(region?: string): Promise<PlayableTrack[]> {
        try {
            // If region is provided, search for "Trending [Region]" or use a specific chart?
            // Since we don't have direct regional chart API exposed easily, we can use search 
            // or if we had a regional trending endpoint.
            // For now, let's use searchUnified with a regional query or fallback to global trending.
            if (region && region.toLowerCase() !== 'global') {
                const query = `${region} Hit Songs`;
                const results = await searchUnified(query);
                return results;
            } else {
                const trending = await getTrending();
                return trending.map(s => ({ song: s, id: s.id, preferredQuality: '320', sources: [] }));
            }
        } catch (e) { return []; }
    }

    private static async getAdjacentCandidates(seed: PlayableTrack): Promise<PlayableTrack[]> {
        try {
            // Search for Artist
            const artist = seed.song.primaryArtists.split(',')[0].trim();
            const results = await searchUnified(artist);
            // Filter out the seed itself
            return results.filter(s => s.id !== seed.id);
        } catch (e) { return []; }
    }

    private static async getWildcardCandidates(region?: string): Promise<PlayableTrack[]> {
        // High Quality Wildcards - biased by region if present
        const baseTerms = ['Top', 'Viral', 'New', 'Hifi', 'Master'];
        const term = baseTerms[Math.floor(Math.random() * baseTerms.length)];
        const query = region ? `${region} ${term}` : term;

        try {
            const results = await searchUnified(query);
            return results.sort(() => 0.5 - Math.random()); // Randomize
        } catch (e) { return []; }
    }

    // --- The Filter (Deduplication & Anti-Loop) ---

    private static smartShuffle(pool: PlayableTrack[], seed: PlayableTrack): PlayableTrack[] {
        const history = HistoryStore.getHistory(); // Last 50
        // Filter out recent history (Last 24h)
        const recentIds = new Set(history.slice(0, 20).map(h => h.id));

        const unique = new Map<string, PlayableTrack>();
        const artistCounts = new Map<string, number>();

        // Normalize helper
        const normalize = (str: string) => str?.toLowerCase().split('(')[0].replace(/[^a-z0-9]/g, '') || '';

        // Add SEED first manually to ensure it exists
        unique.set(seed.id, seed);
        const seedArtist = seed.song.primaryArtists.split(',')[0];
        artistCounts.set(seedArtist, 1);

        for (const track of pool) {
            // SKIP Seed (already added)
            if (track.id === seed.id) continue;

            // 1. Anti-Loop (Recent History)
            if (recentIds.has(track.id)) continue;

            // 2. Exact Deduplication
            if (unique.has(track.id)) continue;

            // 3. Fuzzy Deduplication (Same Title)
            const normTitle = normalize(track.song.name);
            const duplicateTitle = Array.from(unique.values()).some(t => normalize(t.song.name) === normTitle);
            if (duplicateTitle) continue;

            // 4. Artist Cap (Max 2 per mix)
            const artist = track.song.primaryArtists.split(',')[0];
            const count = artistCounts.get(artist) || 0;
            if (count >= 2) continue;

            // Add
            unique.set(track.id, track);
            artistCounts.set(artist, count + 1);
        }

        // Convert to array and Shuffle
        const result = Array.from(unique.values());

        // Ensure Seed is #1
        const seedIndex = result.findIndex(s => s.id === seed.id);
        if (seedIndex > -1) result.splice(seedIndex, 1);

        // Shuffle rest
        result.sort(() => 0.5 - Math.random());

        // Prepend Seed
        return [seed, ...result];
    }
}
