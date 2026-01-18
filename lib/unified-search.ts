import { searchSongs, searchAlbums, JioSaavnSong } from './jiosaavn';
import { searchHiFi, HiFiSearchResult, HiFiTrack, HiFiAlbum } from './hifi-client';

export type QualityType = '24-bit' | 'FLAC' | '320kbps' | '128kbps';

export interface GroupedSong {
    type: 'song' | 'album';
    key: string;
    name: string;
    primaryArtists: string;
    image: any;
    duration: number;
    year?: string;          // Added year for strict matching
    qualities: {
        '24-bit'?: JioSaavnSong;
        'FLAC'?: JioSaavnSong;
        '320kbps'?: JioSaavnSong;
        '128kbps'?: JioSaavnSong;
    };
    bestQuality: QualityType;
    source: string;
    availableSources: string[]; // Track all available providers
    id: string;
    album?: {
        id: string;
        name: string;
        url: string;
    };
}

export type SearchType = 'all' | 'song' | 'album' | 'artist';

// --- Normalization Helpers ---

function normalizeStr(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/(original|mix|remaster|remastered|stereo|mono|version|edit|radio)/g, '');
}

function areSameEntity(a: { name: string, artist: string, duration: number, type: string, year?: string }, b: { name: string, artist: string, duration: number, type: string, year?: string }): boolean {
    if (a.type !== b.type) return false;

    const titleA = normalizeStr(a.name);
    const titleB = normalizeStr(b.name);
    const artistA = normalizeStr(a.artist);
    const artistB = normalizeStr(b.artist);

    // 1. Strict Title Match
    if (!titleA.includes(titleB) && !titleB.includes(titleA)) return false;

    // 2. Artist Match
    if (!artistA.includes(artistB) && !artistB.includes(artistA)) return false;

    // 3. Type-Specific Checks
    if (a.type === 'album') {
        // Strict Year Match for Albums (if both have year)
        if (a.year && b.year && a.year !== b.year) return false;
        return true;
    } else {
        // Duration Fuzzy Match for Songs
        if (a.duration > 0 && b.duration > 0) {
            if (Math.abs(a.duration - b.duration) > 10) return false;
        }
        return true;
    }
}

// --- Converters ---

function hifiTrackToSaavn(track: HiFiTrack): JioSaavnSong {
    return {
        id: track.id,
        name: track.title,
        type: 'song',
        album: {
            id: track.albumId,
            name: track.album,
            url: ''
        },
        year: '',       // Track year usually not needed for song matching, but good to have
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

function hifiAlbumToSaavn(album: HiFiAlbum): JioSaavnSong {
    return {
        id: album.id,
        name: album.name,
        type: 'album',
        album: {
            id: album.id,
            name: album.name,
            url: ''
        },
        year: album.year ? String(album.year) : '',
        releaseDate: '',
        duration: 0,
        label: '',
        primaryArtists: album.artist,
        primaryArtistsId: album.artistId,
        featuredArtists: '',
        explicitContent: 0,
        playCount: 0,
        language: 'English',
        hasLyrics: 'false',
        url: '',
        copyright: '',
        image: album.coverArt ? [
            { quality: '500x500', link: album.coverArt },
            { quality: '150x150', link: album.coverArt },
            { quality: '50x50', link: album.coverArt }
        ] : [],
        downloadUrl: [],
        encryptedMediaUrl: ''
    };
}

// --- Main Search Function ---

export async function searchUnified(query: string, type: SearchType = 'all'): Promise<GroupedSong[]> {
    console.log(`[UnifiedSearch] Query: "${query}" Type: ${type}`);

    // 1. Parallel Fetch
    const promises: Promise<any>[] = [];

    // Always fetch JioSaavn
    if (type === 'album') {
        promises.push(searchAlbums(query));
    } else {
        promises.push(searchSongs(query));
    }

    promises.push(searchHiFi(query));

    const [saavnResults, hifiResult] = await Promise.all(promises);

    const rawSaavn: JioSaavnSong[] = Array.isArray(saavnResults) ? saavnResults : [];
    const rawHiFi: HiFiSearchResult | null = hifiResult;

    // 2. Flatten & Normalize
    let allTracks: { data: JioSaavnSong, source: 'saavn' | 'tidal' | 'qobuz', quality: string }[] = [];

    // Process Saavn
    rawSaavn.forEach(song => {
        // If searching albums, Saavn returns albums. Correct filter:
        if (type !== 'album' && (type === 'artist' || song.type === 'album')) return;

        allTracks.push({
            data: song,
            source: 'saavn',
            quality: '320kbps'
        });
    });

    // Process HiFi
    if (rawHiFi) {
        if (type === 'album') {
            rawHiFi.albums.forEach(album => {
                const quality = album.source === 'qobuz' ? '24-bit' : 'FLAC';
                const saavnAlbum = hifiAlbumToSaavn(album);
                (saavnAlbum as any).source = album.source; // Critical: Inject source for playback context

                allTracks.push({
                    data: saavnAlbum,
                    source: album.source as any,
                    quality
                });
            });
        } else {
            rawHiFi.tracks.forEach(track => {
                if (type === 'artist') return;

                const quality = track.quality === 'HI_RES_LOSSLESS' ? '24-bit' : 'FLAC';
                const saavnTrack = hifiTrackToSaavn(track);
                (saavnTrack as any).source = track.source; // Critical: Inject source for playback context

                allTracks.push({
                    data: saavnTrack,
                    source: track.source,
                    quality
                });
            });
        }
    }

    // 3. Grouping & Deduplication
    const groupedMap = new Map<string, GroupedSong>();

    for (const item of allTracks) {
        const normKey = normalizeStr(item.data.name);

        // Find existing match
        let foundMatchKey: string | null = null;

        for (const [key, existing] of groupedMap.entries()) {
            if (areSameEntity(
                { name: item.data.name, artist: item.data.primaryArtists, duration: item.data.duration, type: item.data.type || 'song', year: item.data.year },
                { name: existing.name, artist: existing.primaryArtists, duration: existing.duration, type: existing.type, year: existing.year }
            )) {
                foundMatchKey = key;
                break;
            }
        }

        const songKey = foundMatchKey || `${normKey}-${normalizeStr(item.data.primaryArtists)}`;

        if (!groupedMap.has(songKey)) {
            // Create New Group
            groupedMap.set(songKey, {
                key: songKey,
                type: (item.data.type as 'song' | 'album') || 'song',
                name: item.data.name,
                primaryArtists: item.data.primaryArtists,
                image: item.data.image,
                duration: item.data.duration,
                year: item.data.year,
                album: item.data.album,
                id: item.data.id,
                source: item.source,
                availableSources: [item.source], // Init source list
                qualities: {
                    [item.quality]: item.data
                } as any,
                bestQuality: item.quality as QualityType
            });
        } else {
            // Merge into Existing Group
            const existing = groupedMap.get(songKey)!;

            existing.qualities[item.quality as QualityType] = item.data;
            if (!existing.availableSources.includes(item.source)) {
                existing.availableSources.push(item.source);
            }

            // Update Best Quality & Metadata
            const qualityOrder = ['24-bit', 'FLAC', '320kbps', '128kbps'];
            const currentBestIdx = qualityOrder.indexOf(existing.bestQuality);
            const newIdx = qualityOrder.indexOf(item.quality);

            if (newIdx < currentBestIdx && newIdx !== -1) {
                existing.bestQuality = item.quality as QualityType;

                // Upgrade metadata if better source, but keep ID stable if it was already Saavn
                if (item.source === 'tidal' || item.source === 'qobuz') {
                    existing.name = item.data.name;
                    existing.image = item.data.image && item.data.image.length > 0 ? item.data.image : existing.image;
                    existing.primaryArtists = item.data.primaryArtists;
                    existing.id = item.data.id;
                    existing.source = item.source; // Default click action to best source
                    existing.album = item.data.album;
                    if (item.data.year) existing.year = item.data.year;
                }
            }
        }
    }

    // 4. Convert Map to Array
    const results = Array.from(groupedMap.values());

    // 5. Sort by Quality (Best First) then Relevance?
    // Actually search engine order is usually by relevance.
    // Since we merged, the list is implicitly ordered by when the FIRST result appeared (usually relevance).
    // So we assume the insertion order is correct.

    return results;
}
