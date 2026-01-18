/**
 * Hi-Fi Music Service (Tidal + Qobuz)
 * Provides lossless audio streaming via public APIs
 * Ported from: chandradev28/streamed.app
 */

// ============================================================================
// Configuration
// ============================================================================

// Tidal API endpoints (public, no auth required)
// All return LOSSLESS quality (16-bit/44.1kHz FLAC)
const TIDAL_ENDPOINTS = [
    { name: 'hund', url: 'https://hund.qqdl.site' },
    { name: 'katze', url: 'https://katze.qqdl.site' },
    { name: 'maus', url: 'https://maus.qqdl.site' },
    { name: 'vogel', url: 'https://vogel.qqdl.site' },
    { name: 'wolf', url: 'https://wolf.qqdl.site' },
    { name: 'kinoplus', url: 'https://tidal.kinoplus.online' },
    { name: 'binimum', url: 'https://tidal-api.binimum.org' },
];

// Qobuz API endpoints (24-bit Hi-Res FLAC)
const QOBUZ_API = {
    search: 'https://qobuz.squid.wtf/api/get-music',
    album: 'https://qobuz.squid.wtf/api/get-album',
    stream: [
        { name: 'squid', url: 'https://qobuz.squid.wtf/api/download-music', paramName: 'track_id' },
        { name: 'dab', url: 'https://dab.yeet.su/api/stream', paramName: 'trackId', quality: '7' },
        { name: 'dabmusic', url: 'https://dabmusic.xyz/api/stream', paramName: 'trackId', quality: '7' },
    ],
};

// Track last working endpoints for faster retries
let lastWorkingTidalEndpoint = TIDAL_ENDPOINTS[0].url;
let lastWorkingQobuzStream = 0;

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

function getTidalCoverUrl(coverId: string | undefined | null, size: number = 320): string | null {
    if (!coverId) return null;
    const formatted = coverId.replace(/-/g, '/');
    return `https://resources.tidal.com/images/${formatted}/${size}x${size}.jpg`;
}

// ============================================================================
// Tidal Search
// ============================================================================

export async function searchTidal(query: string): Promise<HiFiSearchResult | null> {
    console.log('[Tidal] Searching for:', query);

    const endpoints = [lastWorkingTidalEndpoint, ...TIDAL_ENDPOINTS.map(e => e.url)];
    const uniqueEndpoints = [...new Set(endpoints)];

    for (const endpoint of uniqueEndpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`${endpoint}/search/?s=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();
            const items = data?.data?.items || data?.items || [];

            if (items.length === 0) continue;

            lastWorkingTidalEndpoint = endpoint;
            console.log(`[Tidal] Found ${items.length} tracks from ${endpoint}`);

            // Parse tracks
            const tracks: HiFiTrack[] = items.map((track: any) => ({
                id: String(track.id),
                title: track.title || 'Unknown',
                artist: track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist',
                artistId: String(track.artist?.id || track.artists?.[0]?.id || ''),
                album: track.album?.title || 'Unknown Album',
                albumId: String(track.album?.id || ''),
                duration: track.duration || 0,
                coverArt: getTidalCoverUrl(track.album?.cover, 640),
                quality: (track.audioQuality || 'LOSSLESS') as HiFiTrack['quality'],
                trackNumber: track.trackNumber,
                source: 'tidal' as const,
            }));

            // Also try to get albums
            let albums: HiFiAlbum[] = [];
            try {
                const albumRes = await fetch(`${endpoint}/search/?al=${encodeURIComponent(query)}`, {
                    headers: { 'Accept': 'application/json' },
                });
                if (albumRes.ok) {
                    const albumData = await albumRes.json();
                    const albumItems = albumData?.data?.albums?.items || [];
                    albums = albumItems.map((album: any) => ({
                        id: String(album.id),
                        name: album.title || 'Unknown Album',
                        artist: album.artist?.name || 'Unknown Artist',
                        artistId: String(album.artist?.id || ''),
                        coverArt: getTidalCoverUrl(album.cover, 640),
                        year: album.releaseDate ? parseInt(album.releaseDate.substring(0, 4)) : undefined,
                        trackCount: album.numberOfTracks,
                        source: 'tidal' as const,
                    }));
                }
            } catch (e) { /* Ignore album fetch errors */ }

            return { tracks, albums, source: 'tidal' };
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log(`[Tidal] ${endpoint} timed out`);
            } else {
                console.log(`[Tidal] Search failed for ${endpoint}`);
            }
        }
    }

    return null;
}

// ============================================================================
// Tidal Stream URL
// ============================================================================

export async function getTidalStreamUrl(trackId: string): Promise<{ url: string; quality: string } | null> {
    console.log('[Tidal] Getting stream URL for track:', trackId);

    const endpoints = [lastWorkingTidalEndpoint, ...TIDAL_ENDPOINTS.map(e => e.url)];
    const uniqueEndpoints = [...new Set(endpoints)];

    for (const endpoint of uniqueEndpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            // Request LOSSLESS quality (16-bit CD quality FLAC)
            const response = await fetch(`${endpoint}/track/?id=${trackId}&quality=LOSSLESS`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();
            const trackData = data?.data || data;

            if (!trackData?.manifest) continue;

            // Decode base64 manifest
            const manifestContent = atob(trackData.manifest);
            const audioQuality = trackData.audioQuality || 'LOSSLESS';

            // Parse JSON manifest (LOSSLESS returns direct URLs)
            if (manifestContent.startsWith('{')) {
                try {
                    const manifestJson = JSON.parse(manifestContent);
                    if (manifestJson.urls && manifestJson.urls.length > 0) {
                        lastWorkingTidalEndpoint = endpoint;
                        console.log(`[Tidal] ✓ Got ${audioQuality} stream`);
                        return { url: manifestJson.urls[0], quality: audioQuality };
                    }
                } catch (e) { /* Continue */ }
            }

            // Handle DASH manifest (for HI_RES)
            if (manifestContent.includes('<MPD')) {
                const urlMatch = manifestContent.match(/https:\/\/[^"<\s]+\.(mp4|flac)[^"<\s]*/);
                if (urlMatch) {
                    const streamUrl = urlMatch[0].replace(/&amp;/g, '&');
                    lastWorkingTidalEndpoint = endpoint;
                    console.log(`[Tidal] ✓ Got DASH ${audioQuality} stream`);
                    return { url: streamUrl, quality: audioQuality };
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log(`[Tidal] ${endpoint} timed out`);
            }
        }
    }

    console.error('[Tidal] ✗ Could not get stream URL for track:', trackId);
    return null;
}

// ============================================================================
// Qobuz Search
// ============================================================================

export async function searchQobuz(query: string): Promise<HiFiSearchResult | null> {
    console.log('[Qobuz] Searching for:', query);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${QOBUZ_API.search}?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log('[Qobuz] Search request failed:', response.status);
            return null;
        }

        const data = await response.json();
        const items = data?.tracks?.items || data?.items || [];

        if (items.length === 0) {
            console.log('[Qobuz] No results found');
            return null;
        }

        console.log(`[Qobuz] Found ${items.length} tracks`);

        const tracks: HiFiTrack[] = items.map((track: any) => ({
            id: String(track.id),
            title: track.title || 'Unknown',
            artist: track.performer?.name || track.album?.artist?.name || 'Unknown Artist',
            artistId: String(track.performer?.id || ''),
            album: track.album?.title || 'Unknown Album',
            albumId: String(track.album?.id || ''),
            duration: track.duration || 0,
            coverArt: track.album?.image?.large || track.album?.image?.small || null,
            quality: 'HI_RES_LOSSLESS' as const,
            trackNumber: track.track_number,
            source: 'qobuz' as const,
        }));

        return { tracks, albums: [], source: 'qobuz' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('[Qobuz] Search timed out');
        } else {
            console.error('[Qobuz] Search error:', error.message);
        }
        return null;
    }
}

// ============================================================================
// Qobuz Stream URL
// ============================================================================

export async function getQobuzStreamUrl(trackId: string): Promise<{ url: string; quality: string } | null> {
    console.log('[Qobuz] Getting stream URL for track:', trackId);

    // Try each stream endpoint
    const endpoints = [...QOBUZ_API.stream];
    // Start with last working endpoint
    if (lastWorkingQobuzStream > 0) {
        const last = endpoints.splice(lastWorkingQobuzStream, 1)[0];
        endpoints.unshift(last);
    }

    for (let i = 0; i < endpoints.length; i++) {
        const ep = endpoints[i];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            let url = `${ep.url}?${ep.paramName}=${trackId}`;
            if (ep.quality) url += `&quality=${ep.quality}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();
            const streamUrl = data?.url || data?.stream_url || data?.link;

            if (streamUrl) {
                lastWorkingQobuzStream = QOBUZ_API.stream.findIndex(e => e.name === ep.name);
                console.log(`[Qobuz] ✓ Got Hi-Res stream from ${ep.name}`);
                return { url: streamUrl, quality: 'HI_RES_LOSSLESS' };
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log(`[Qobuz] ${ep.name} timed out`);
            }
        }
    }

    console.error('[Qobuz] ✗ Could not get stream URL for track:', trackId);
    return null;
}

// ============================================================================
// Unified Search (Tidal + Qobuz)
// ============================================================================

export async function searchHiFi(query: string): Promise<HiFiSearchResult | null> {
    if (!query.trim()) return null;

    // Try Qobuz first (higher quality: 24-bit Hi-Res)
    const qobuzResult = await searchQobuz(query);
    if (qobuzResult && qobuzResult.tracks.length > 0) {
        return qobuzResult;
    }

    // Fallback to Tidal (16-bit Lossless)
    console.log('[HiFi] Qobuz has no results, trying Tidal...');
    return await searchTidal(query);
}

// ============================================================================
// Unified Stream URL
// ============================================================================

export async function getHiFiStreamUrl(trackId: string, source: 'tidal' | 'qobuz'): Promise<{ url: string; quality: string } | null> {
    if (source === 'qobuz') {
        return await getQobuzStreamUrl(trackId);
    } else {
        return await getTidalStreamUrl(trackId);
    }
}

// ============================================================================
// Album Details
// ============================================================================

export async function getQobuzAlbum(albumId: string): Promise<HiFiTrack[]> {
    console.log('[Qobuz] Getting album tracks for:', albumId);
    try {
        // Qobuz Proxy Endpoint for Album Tracks
        // Endpoint: https://qobuz.squid.wtf/api/get-album?id={id}
        const response = await fetch(`${QOBUZ_API.album}?id=${albumId}`);

        if (!response.ok) {
            console.error('[Qobuz] Album fetch failed:', response.status);
            return [];
        }

        const data = await response.json();
        const tracks = data?.tracks?.items || data?.tracks || [];

        return tracks.map((track: any) => ({
            id: String(track.id),
            title: track.title || 'Unknown',
            artist: track.performer?.name || track.album?.artist?.name || 'Unknown Artist',
            artistId: String(track.performer?.id || ''),
            album: data.title || track.album?.title || 'Unknown Album',
            albumId: String(data.id || track.album?.id || albumId),
            duration: track.duration || 0,
            coverArt: data.image?.large || data.image?.small || track.album?.image?.large || null,
            quality: 'HI_RES_LOSSLESS',
            trackNumber: track.track_number,
            source: 'qobuz'
        }));

    } catch (e) {
        console.error('[Qobuz] Error getting album:', e);
        return [];
    }
}

export async function getTidalAlbum(albumId: string): Promise<HiFiTrack[]> {
    // Tidal Proxy Album implementation is experimental
    // Try standard endpoints on cache
    const endpoints = [lastWorkingTidalEndpoint, ...TIDAL_ENDPOINTS.map(e => e.url)];
    const uniqueEndpoints = [...new Set(endpoints)];

    for (const endpoint of uniqueEndpoints) {
        try {
            // Try /album/?id=... or /albums/?id=... common in these proxies
            const res = await fetch(`${endpoint}/album/?id=${albumId}`);
            if (res.ok) {
                const data = await res.json();
                const items = data?.items || data?.tracks?.items || [];
                if (items.length > 0) {
                    return items.map((track: any) => ({
                        id: String(track.id),
                        title: track.title || 'Unknown',
                        artist: track.artist?.name || 'Unknown Artist',
                        artistId: String(track.artist?.id || ''),
                        album: track.album?.title || 'Unknown Album',
                        albumId: String(track.album?.id || albumId),
                        duration: track.duration || 0,
                        coverArt: getTidalCoverUrl(track.album?.cover, 640),
                        quality: (track.audioQuality || 'LOSSLESS') as HiFiTrack['quality'],
                        trackNumber: track.trackNumber,
                        source: 'tidal'
                    }));
                }
            }
        } catch (e) { }
    }

    return [];
}
