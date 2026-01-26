import { searchSongs, JioSaavnSong } from './jiosaavn';
import { getArt } from '../components/discovery/DiscoveryShared';
import { searchHiFi, HiFiSearchResult } from './hifi-client';
import { PlayableTrack, PlayableSource, AudioQuality } from './types';

// --- Normalization Helpers ---

function normalizeStr(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/(original|mix|remaster|remastered|stereo|mono|version|edit|radio)/g, '');
}

/**
 * Generates a stable ID for deduplication.
 * Format: title|artist|duration_bucket
 * Duration bucket: 5 seconds
 */
function generateStableId(title: string, artist: string, duration: number): string {
    const t = normalizeStr(title);
    const a = normalizeStr(artist);
    // Use 10s bucket for looser duration matching, or 5s as requested (±5s implication)
    const d = duration > 0 ? Math.round(duration / 5) * 5 : 0;
    return `${t}|${a}|${d}`;
}

// --- Converters ---

function hifiTrackToSaavn(track: any): JioSaavnSong {
    return {
        id: track.id,
        name: track.title,
        type: 'song',
        album: {
            id: track.albumId,
            name: track.album,
            url: ''
        },
        year: '',
        releaseDate: '',
        duration: track.duration,
        label: '',
        primaryArtists: track.artist,
        primaryArtistsId: track.artistId,
        featuredArtists: '',
        explicitContent: 0,
        playCount: 0,
        language: 'English',
        hasLyrics: 'false',
        url: '',
        copyright: '',
        image: track.coverArt ? [
            { quality: '500x500', link: track.coverArt },
            { quality: '150x150', link: track.coverArt.replace('640x640', '320x320') },
            { quality: '50x50', link: track.coverArt.replace('640x640', '80x80') }
        ] : [],
        downloadUrl: [],
        encryptedMediaUrl: ''
    };
}

// --- Main Search Function ---

export type SearchType = 'song' | 'album' | 'artist' | 'all';

const QUALITY_ORDER: AudioQuality[] = ['hires', 'flac', '320', '160', '96'];

export async function searchUnified(query: string, language?: string, type: SearchType = 'song'): Promise<PlayableTrack[]> {
    // 1. Clean Query
    // [FIX] Don't strip "flac" or "hi-res" as they might be part of the user's intent to find specific versions
    // const cleanQuery = query.replace(/\b(flac|lossless|hi-res|high quality|320kbps|320|128kbps|128)\b/gi, '').trim();
    const cleanQuery = query.trim();
    console.log(`[UnifiedSearch] Query: "${query}" -> Clean: "${cleanQuery}" (Lang: ${language})`);

    // 2. Parallel Fetch (Strictly Concurrent)
    console.log(`[UnifiedSearch] Starting parallel search for: ${cleanQuery}`);
    const [saavnResults, hifiResult] = await Promise.all([
        searchSongs(cleanQuery, 1, 10, language).catch(err => {
            console.error('[UnifiedSearch] Saavn Error:', err);
            return [];
        }),
        searchHiFi(cleanQuery).catch(err => {
            console.error('[UnifiedSearch] HiFi Error:', err);
            return null;
        })
    ]);

    const rawSaavn: JioSaavnSong[] = Array.isArray(saavnResults) ? saavnResults : [];
    const rawHiFi: HiFiSearchResult | null = hifiResult;

    // 3. Deduplication Logic (Strict Merging)
    const uniqueTracks: PlayableTrack[] = [];

    // Helper: Find existing track using Fuzzy Match
    const findMatch = (title: string, artist: string, duration: number): PlayableTrack | undefined => {
        const normTitle = normalizeStr(title);
        const normArtist = normalizeStr(artist);

        return uniqueTracks.find(t => {
            if (!t.song) return false;
            const tTitle = normalizeStr(t.song.name);
            const tArtist = normalizeStr(t.song.primaryArtists);

            // 1. Text Match
            if (tTitle !== normTitle || tArtist !== normArtist) return false;

            // 2. Anti-Merge Guard (Keyword Check)
            // If one has { "Live", "Remix", "Demo", "Acoustic" } and the other doesn't, DO NOT MERGE.
            const keywords = ['live', 'remix', 'demo', 'acoustic', 'cover', 'reprised', 'edited'];
            const tHasKeyword = keywords.some(k => tTitle.includes(k));
            const newHasKeyword = keywords.some(k => normTitle.includes(k));

            if (tHasKeyword !== newHasKeyword) {
                console.log(`[UnifiedSearch] Anti-Merge Triggered: "${t.song.name}" vs "${title}" (Keyword Mismatch)`);
                return false;
            }

            // 3. Duration Match (Diff < 5s)
            // If either duration is 0, skip check (or require exact text match only?)
            // Assumption: Valid songs have duration.
            const diff = Math.abs(t.song.duration - duration);
            return diff < 5; // Strictly less than 5s
        });
    };

    // Helper: Add or Merge Logic
    const processResult = (source: PlayableSource, metadata: JioSaavnSong) => {
        // Enforce songs only
        if (metadata.type && !['song'].includes(metadata.type)) return;

        // Try to find a match
        const existing = findMatch(metadata.name, metadata.primaryArtists, parseInt(metadata.duration as any) || 0);

        if (existing) {
            // MERGE SOURCE
            const hasSource = existing.sources.some(s => s.provider === source.provider && s.quality === source.quality);
            if (!hasSource) {
                existing.sources.push(source);
            }

            // UPGRADE PREFERENCE (Conservative)
            // If new source is higher quality than current preferred, should we upgrade?
            // User Rule: "Results are merged into ONE logical song... A single song card with real quality badges only"
            // The UI determines badges from sources.
            // But we need to ensure the `preferredQuality` defaults to the best available?
            // Or just '320' default?
            // Let's keep '320' default unless HI-RES is found.
            if (QUALITY_ORDER.indexOf(source.quality) < QUALITY_ORDER.indexOf(existing.preferredQuality)) {
                existing.preferredQuality = source.quality;
                if (source.provider !== 'jiosaavn') {
                    // Upgrade metadata only if it's a significant visual upgrade? 
                    // Actually, keep Saavn metadata as base usually better for Indian context.
                    // But for English, Qobuz might be better.
                    // Current: Keep existing metadata to be stable.
                }
            }
        } else {
            // CREATE NEW
            uniqueTracks.push({
                id: metadata.id, // Use Provider ID as base ID
                title: metadata.name,
                artist: metadata.primaryArtists,
                duration: metadata.duration,
                art: getArt(metadata),
                song: metadata,
                sources: [source],
                preferredQuality: source.quality === 'hires' || source.quality === 'flac' ? source.quality : '320'
            });
        }
    };

    // A. Process JioSaavn (Base)
    rawSaavn.forEach(song => {
        // Capability: 320/160/96
        ['320', '160', '96'].forEach(q => {
            processResult({ provider: 'jiosaavn', songId: song.id, quality: q as AudioQuality }, song);
        });
    });

    // B. Process HiFi (Premium Layer)
    if (rawHiFi && rawHiFi.tracks) {
        rawHiFi.tracks.forEach(hifiTrack => {
            let quality: AudioQuality | null = null;
            if (hifiTrack.quality === 'HI_RES_LOSSLESS') quality = 'hires';
            else if (hifiTrack.quality === 'LOSSLESS') quality = 'flac';

            if (quality) {
                const metadata = hifiTrackToSaavn(hifiTrack);
                processResult({ provider: hifiTrack.source as any, songId: hifiTrack.id, quality }, metadata);
            }
        });
    }

    console.log(`[UnifiedSearch] Merged ${uniqueTracks.length} unique tracks from ${rawSaavn.length} Saavn + ${rawHiFi?.tracks?.length || 0} HiFi results.`);
    return uniqueTracks;
}
