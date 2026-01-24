import { PlayableTrack, isPlayableTrack } from './types';
import { SignalStore, WEIGHTS } from './signal-store';
import { HistoryStore } from './history-store';
import { getTrending, searchSongs, getSongDetails } from './jiosaavn';
import { searchUnified } from './unified-search';
import { Mix } from '@/components/providers/playback-context';

// --- STRICT NORMALIZATION ---
export function normalizeIdentity(title: string, artist: string): string {
    const t = title.toLowerCase()
        .split('(')[0] // Remove brackets
        .split('[')[0]
        .split('-')[0] // Remove hyphens (Risk: "Song - Remix" -> "Song") - Acceptable for dedup
        .replace(/[^a-z0-9]/g, '')
        .trim();
    const a = artist.toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '').trim();
    return `${t}|${a}`;
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
        const baseTerms = ['Top', 'Viral', 'New', 'Hifi', 'Master', 'Essential', 'Best of'];
        const term = baseTerms[Math.floor(Math.random() * baseTerms.length)];
        const query = region ? `${region} ${term}` : term;

        try {
            const results = await searchUnified(query);
            // Strict Filter: Remove Junk
            const clean = results.filter(track => {
                const name = track.song.name.toLowerCase();
                const junk = ['remix', 'lofi', 'slowed', 'reverb', 'cover', 'live at', 'demo'];
                if (junk.some(j => name.includes(j))) return false;
                return true;
            });

            return clean.sort(() => 0.5 - Math.random()); // Randomize
        } catch (e) { return []; }
    }

    // --- The Filter (Deduplication & Anti-Loop) ---

    private static smartShuffle(pool: PlayableTrack[], seed: PlayableTrack): PlayableTrack[] {
        const history = HistoryStore.getHistory(); // Full available history
        // STRICT 24H RULE: Filter out ALL recent history available in store
        const recentIds = new Set(history.map(h => h.id));

        const unique = new Map<string, PlayableTrack>();
        const artistCounts = new Map<string, number>();

        // Add SEED first manually to ensure it exists
        unique.set(normalizeIdentity(seed.song.name, seed.song.primaryArtists), seed);

        const seedArtist = seed.song.primaryArtists.split(',')[0].trim();
        artistCounts.set(seedArtist, 1);

        for (const track of pool) {
            // SKIP Seed (already added)
            // if (track.id === seed.id) continue; // ID check might fail if different providers

            // 1. Anti-Loop (Recent History)
            if (recentIds.has(track.id)) continue;

            // 2. Normalization Identity Check
            const identity = normalizeIdentity(track.song.name, track.song.primaryArtists);
            if (unique.has(identity)) continue;

            // 3. Artist Cap (Max 2 per mix)
            const artist = track.song.primaryArtists.split(',')[0].trim();
            const count = artistCounts.get(artist) || 0;
            if (count >= 2) continue; // Strict Cap

            // Add
            unique.set(identity, track);
            artistCounts.set(artist, count + 1);
        }

        // Convert to array
        const result = Array.from(unique.values());

        // Ensure Seed is #1
        // (It was added first to the map, but Map order is insertion order usually.
        // But let's be explicit)
        const seedIdentity = normalizeIdentity(seed.song.name, seed.song.primaryArtists);
        const seedTrack = unique.get(seedIdentity);

        // Remove seed from result to shuffle the rest
        const others = result.filter(t => t !== seedTrack);

        // Shuffle others
        others.sort(() => 0.5 - Math.random());

        // Return Seed + Others
        return [seedTrack!, ...others];
    }
}
