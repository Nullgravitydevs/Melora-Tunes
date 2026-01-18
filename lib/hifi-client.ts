/**
 * HiFi Client - Browser-side API for Tidal/Qobuz
 */

export interface HiFiTrack {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    album: string;
    albumId: string;
    duration: number;
    coverArt: string | null;
    quality: 'LOSSLESS' | 'HI_RES_LOSSLESS' | 'HIGH' | 'LOW';
    source: 'tidal' | 'qobuz';
    trackNumber?: number;
}

export interface HiFiAlbum {
    id: string;
    name: string;
    artist: string;
    artistId: string;
    coverArt: string | null;
    year?: number;
    trackCount?: number;
    source: 'tidal' | 'qobuz';
}

export interface HiFiSearchResult {
    tracks: HiFiTrack[];
    albums: HiFiAlbum[];
    source: string;
}

/**
 * Search for HiFi music (Tidal + Qobuz)
 */
export async function searchHiFi(query: string, source?: 'tidal' | 'qobuz'): Promise<HiFiSearchResult | null> {
    if (!query.trim()) return null;

    try {
        let url = `/api/hifi?type=search&q=${encodeURIComponent(query)}`;
        if (source) url += `&source=${source}`;

        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        return data.success ? data : null;
    } catch (error) {
        console.error('[HiFi Client] Search error:', error);
        return null;
    }
}

/**
 * Get stream URL for a HiFi track
 */
export async function getHiFiStream(trackId: string, source: 'tidal' | 'qobuz'): Promise<{ url: string; quality: string } | null> {
    try {
        const res = await fetch(`/api/hifi?type=stream&id=${trackId}&source=${source}`);
        if (!res.ok) return null;

        const data = await res.json();
        return data.success ? { url: data.url, quality: data.quality } : null;
    } catch (error) {
        console.error('[HiFi Client] Stream error:', error);
        return null;
    }
}

/**
 * Convert HiFi track to JioSaavnSong format for playback context
 */
export function hifiTrackToSong(track: HiFiTrack): any {
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
        language: '',
        hasLyrics: '',
        url: '',
        copyright: '',
        image: track.coverArt ? [
            { quality: '500x500', link: track.coverArt },
            { quality: '150x150', link: track.coverArt },
            { quality: '50x50', link: track.coverArt }
        ] : [],
        downloadUrl: [],
        encryptedMediaUrl: '',
        // Custom fields for HiFi playback
        source: track.source,
        hifiQuality: track.quality
    };
}

/**
 * Get album tracks from HiFi (Tidal/Qobuz)
 */
export async function getHiFiAlbum(albumId: string, source: 'tidal' | 'qobuz'): Promise<any[] | null> {
    try {
        const res = await fetch(`/api/hifi?type=album&id=${albumId}&source=${source}`);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.success && Array.isArray(data.tracks)) {
            // Convert to JioSaavnSong format instantly for UI compatibility
            return data.tracks.map(hifiTrackToSong);
        }
        return null;
    } catch (error) {
        console.error('[HiFi Client] Album error:', error);
        return null;
    }
}
