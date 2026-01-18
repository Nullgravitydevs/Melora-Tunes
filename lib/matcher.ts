/**
 * Smart Matching Algorithm (Ported from Spotube)
 * Ranks YouTube search results to find the best match for a given track.
 */

export interface TrackQuery {
    title: string;
    artists: string[]; // Array of artist names
    album?: string;
    duration?: number; // seconds
}

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string; // Often contains artist info
    channelName?: string;
    duration?: number;
    [key: string]: any; // Allow extra fields
}

const OFFICIAL_MUSIC_REGEX = /official\s(video|audio|music\svideo|lyric\svideo|visualizer)/i;

export function rankResults(results: SearchResult[], query: TrackQuery): SearchResult[] {
    return results
        .map(result => {
            let score = 0;
            const resultTitleLower = result.title.toLowerCase();
            const resultSubtitleLower = (result.subtitle || '').toLowerCase();
            const channelLower = (result.channelName || result.subtitle || '').toLowerCase();

            // 1. Artist Matching
            for (const artist of query.artists) {
                const artistLower = artist.toLowerCase();

                // Channel name matches artist
                if (channelLower.includes(artistLower)) {
                    score += 1;
                }

                // Title contains artist name
                if (resultTitleLower.includes(artistLower)) {
                    score += 1;
                }
            }

            // 2. Track Name Match (High Value)
            const queryTitleLower = query.title.toLowerCase();
            if (resultTitleLower.includes(queryTitleLower)) {
                score += 3;
            }

            // 3. Official Flag
            const hasOfficialFlag = OFFICIAL_MUSIC_REGEX.test(result.title);
            if (hasOfficialFlag) {
                score += 1;
            }

            // 4. Bonus: Official + Title Match
            if (hasOfficialFlag && resultTitleLower.includes(queryTitleLower)) {
                score += 2;
            }

            // 5. Duration Match (Optional, penalty for large mismatch)
            if (query.duration && result.duration) {
                const durationDiff = Math.abs(query.duration - result.duration);
                if (durationDiff <= 5) {
                    score += 2; // Bonus for close match
                } else if (durationDiff > 30) {
                    score -= 1; // Penalty for large mismatch (likely remix/extended)
                }
            }

            return { result, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(({ result }) => result);
}

/**
 * Best Match Selector
 * Returns the top result after ranking, or null if no results.
 */
export function findBestMatch(results: SearchResult[], query: TrackQuery): SearchResult | null {
    if (results.length === 0) return null;
    const ranked = rankResults(results, query);
    return ranked[0];
}
