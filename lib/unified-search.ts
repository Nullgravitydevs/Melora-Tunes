import { searchSongs, JioSaavnSong } from './jiosaavn';
import { getArt } from './helpers';
import { searchHiFi, HiFiSearchResult } from './hifi-client';
import { PlayableTrack, PlayableSource, AudioQuality, QualityFilterType } from './types';

// ... (Normalization Helpers remain same, importing from types changed)

// --- Normalization Helpers ---

/**
 * Normalize a string for fuzzy matching.
 * Strips punctuation, common version keywords, etc.
 */
function normalizeStr(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/(original|mix|remaster|remastered|stereo|mono|version|edit|radio)/g, '');
}

/**
 * Aggressively normalize artist name for better merging.
 * Strips feat/ft/featuring, extra collaborators, and keeps only primary artist.
 */
function normalizeArtist(artist: string): string {
    if (!artist) return '';
    return artist
        .toLowerCase()
        // Remove everything after feat/ft/featuring/with/&/x
        .split(/\s*(?:feat\.?|ft\.?|featuring|with|\&|\sx\s)/i)[0]
        // Remove everything after comma (extra collaborators)
        .split(',')[0]
        // Remove punctuation and extra whitespace
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '');
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

export async function searchUnified(
    query: string,
    language?: string,
    type: SearchType = 'song',
    qualityPreference: QualityFilterType = 'auto'
): Promise<PlayableTrack[]> {
    // 1. Clean Query
    const cleanQuery = query.trim();
    console.log(`[UnifiedSearch] Query: "${cleanQuery}" | Pref: ${qualityPreference} (Lang: ${language})`);

    // 2. Determine Search Strategy (Optimization)
    const shouldSearchHiFi = qualityPreference !== '320'; // SKIP HiFi if HQ explicit
    const shouldSearchSaavn = true; // Always search Saavn as base/backup

    const promises: Promise<any>[] = [];

    // Saavn Request
    if (shouldSearchSaavn) {
        promises.push(searchSongs(cleanQuery, 1, 10, language).catch(err => {
            console.error('[UnifiedSearch] Saavn Error:', err);
            return [];
        }));
    } else {
        promises.push(Promise.resolve([]));
    }

    // HiFi Request
    if (shouldSearchHiFi) {
        promises.push(searchHiFi(cleanQuery).catch(err => {
            // console.error('[UnifiedSearch] HiFi Error:', err); // Silent fail allowed
            return null;
        }));
    } else {
        promises.push(Promise.resolve(null));
    }

    // 3. Parallel Fetch
    const [saavnResults, hifiResult] = await Promise.all(promises);

    const rawSaavn: JioSaavnSong[] = Array.isArray(saavnResults) ? saavnResults : [];
    const rawHiFi: HiFiSearchResult | null = hifiResult;

    // 4. Deduplication Logic (Strict Merging)
    const uniqueTracks: PlayableTrack[] = [];

    // Helper: Find existing track using Fuzzy Match
    const findMatch = (title: string, artist: string, duration: number): PlayableTrack | undefined => {
        const normTitle = normalizeStr(title);
        const normArtist = normalizeArtist(artist);

        return uniqueTracks.find(t => {
            if (!t.song) return false;
            const tTitle = normalizeStr(t.song.name);
            const tArtist = normalizeArtist(t.song.primaryArtists);

            // 1. Title Match
            if (tTitle !== normTitle) return false;

            // 2. Artist Match
            if (tArtist !== normArtist) return false;

            // 3. Anti-Merge Guard
            const keywords = ['live', 'remix', 'demo', 'acoustic', 'cover', 'reprised', 'edited'];
            const tHasKeyword = keywords.some(k => tTitle.includes(k));
            const newHasKeyword = keywords.some(k => normTitle.includes(k));

            if (tHasKeyword !== newHasKeyword) return false;

            // 4. Duration Match (10s)
            const diff = Math.abs((parseInt(String(t.song.duration)) || 0) - duration);
            return diff <= 10;
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
                if (source.quality === 'flac' || source.quality === 'hires') {
                    console.log(`[UnifiedSearch] 🔀 MERGED: "${metadata.name}" got ${source.quality}`);
                }
            }

            // UPGRADE PREFERENCE (Only if Auto)
            if (qualityPreference === 'auto') {
                if (QUALITY_ORDER.indexOf(source.quality) < QUALITY_ORDER.indexOf(existing.preferredQuality)) {
                    // console.log(`[UnifiedSearch] ⬆️ UPGRADE: "${metadata.name}" ${existing.preferredQuality} → ${source.quality}`);
                    existing.preferredQuality = source.quality;
                    existing.isExplicitPreference = true;
                }
            }
        } else {
            // CREATE NEW
            // Determine Preference: Explicit > Source Quality > Default
            let prefQ: AudioQuality = '320';
            let explicit = false;

            if (qualityPreference !== 'auto') {
                prefQ = qualityPreference as AudioQuality;
                explicit = true;
            } else {
                prefQ = source.quality === 'hires' || source.quality === 'flac' ? source.quality : '320';
                explicit = source.quality === 'hires' || source.quality === 'flac';
            }

            uniqueTracks.push({
                id: metadata.id,
                title: metadata.name,
                artist: metadata.primaryArtists,
                duration: metadata.duration,
                art: getArt(metadata),
                song: metadata,
                sources: [source],
                preferredQuality: prefQ,
                isExplicitPreference: explicit
            });
        }
    };

    // A. Process JioSaavn (Base)
    rawSaavn.forEach(song => {
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

    // Force Explicit Preference on Merged Items 
    // (If existing item was created with '320' but then merged with HiFi in strict mode, we need to ensure pref is strict)
    if (qualityPreference !== 'auto') {
        uniqueTracks.forEach(t => {
            t.preferredQuality = qualityPreference as AudioQuality;
            t.isExplicitPreference = true;
        });
    }

    console.log(`[UnifiedSearch] Merged ${uniqueTracks.length} from Saavn:${rawSaavn.length} HiFi:${rawHiFi?.tracks?.length || 0}`);
    return uniqueTracks;
}
