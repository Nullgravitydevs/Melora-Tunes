/**
 * Hi-Fi Music Service (Tidal + Qobuz)
 * Provides lossless audio streaming via public APIs
 * Powered by Melora KeyVault (Smart Rotation)
 */

import { KeyVault } from './key-vault';

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

export async function searchTidal(query: string, signal?: AbortSignal): Promise<HiFiSearchResult | null> {
    console.log('[Tidal] Searching for:', query);

    // Get Healthy Endpoints sorted by reliability/speed
    const endpoints = KeyVault.getHealthyEndpoints('tidal');
    if (endpoints.length === 0) {
        console.error('[Tidal] No healthy endpoints available!');
        return null; // All dead?
    }

    // Try endpoints in order
    for (const endpoint of endpoints) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s God Speed Timeout

            if (signal) {
                signal.addEventListener('abort', () => controller.abort());
                if (signal.aborted) controller.abort();
            }

            const response = await fetch(`${endpoint.url}/search/?s=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                KeyVault.reportFailure(endpoint.name);
                continue;
            }

            const data = await response.json();
            const items = data?.data?.items || data?.items || [];

            if (items.length === 0) {
                // Empty result is effectively a "success" (endpoint worked, just no data)
                // But we don't want to boost score too much for empty results, 
                // just don't report failure.
                continue;
            }

            // Report Success!
            KeyVault.reportSuccess(endpoint.name, Date.now() - start);
            console.log(`[Tidal] Found ${items.length} tracks from ${endpoint.name}`);

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

            // Also try to get albums (Best Effort)
            let albums: HiFiAlbum[] = [];
            try {
                const albumRes = await fetch(`${endpoint.url}/search/?al=${encodeURIComponent(query)}`, {
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
            if (error.name !== 'AbortError') KeyVault.reportFailure(endpoint.name);
            if (error.name === 'AbortError') {
                console.log(`[Tidal] ${endpoint.name} timed out or aborted`);
            } else {
                console.log(`[Tidal] Search failed for ${endpoint.name}`);
            }
        }
    }

    return null;
}

// ============================================================================
// Tidal Stream URL
// ============================================================================

export async function getTidalStreamUrl(trackId: string, targetQuality: 'LOSSLESS' | 'HI_RES_LOSSLESS' | 'HIGH' = 'LOSSLESS', signal?: AbortSignal): Promise<{ url: string; quality: string; keyName: string } | null> {
    console.log(`[Tidal] Getting stream URL for track: ${trackId} (Target: ${targetQuality})`);

    const endpoints = KeyVault.getHealthyEndpoints('tidal');
    // Ensure triton is in the list effectively (KeyVault handles this now)

    for (const endpoint of endpoints) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s God Speed Timeout

            if (signal) {
                signal.addEventListener('abort', () => controller.abort());
                if (signal.aborted) controller.abort();
            }

            const response = await fetch(`${endpoint.url}/track/?id=${trackId}&quality=${targetQuality}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                KeyVault.reportFailure(endpoint.name);
                continue;
            }

            const data = await response.json();
            const trackData = data?.data || data;

            if (!trackData?.manifest) {
                // Valid response but no manifest? Could be track unavailable or region block.
                // Treat as "soft failure" - try next mirror.
                continue;
            }

            const manifestContent = atob(trackData.manifest);
            const actualQuality = trackData.audioQuality || targetQuality;

            let streamUrl: string | null = null;

            // 1. JSON Manifest (Direct URL)
            if (manifestContent.startsWith('{')) {
                try {
                    const manifestJson = JSON.parse(manifestContent);
                    if (manifestJson.urls && manifestJson.urls.length > 0) {
                        const directUrl = manifestJson.urls[0];
                        if (!directUrl.includes('.mpd')) {
                            streamUrl = directUrl;
                        }
                    }
                } catch (e) { /* Continue */ }
            }

            // 2. DASH Manifest (Try to extract direct FLAC/MP4)
            if (!streamUrl && manifestContent.includes('<MPD')) {
                // Method 1: Initialization URL
                const initMatch = manifestContent.match(/initialization="([^"]+)"/);
                if (initMatch && initMatch[1]) {
                    streamUrl = initMatch[1]
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');
                }

                // Method 2: Media Segment
                if (!streamUrl) {
                    const mediaMatch = manifestContent.match(/media="([^"]+)"/);
                    if (mediaMatch && mediaMatch[1]) {
                        streamUrl = mediaMatch[1]
                            .replace(/&amp;/g, '&')
                            .replace(/\$Number\$/g, '1');
                    }
                }

                // Method 3: Direct Regex
                if (!streamUrl) {
                    const urlMatch = manifestContent.match(/https?:\/\/[^"<>\s]+\.(?:flac|mp4)[^"<>\s]*/);
                    if (urlMatch) {
                        streamUrl = urlMatch[0].replace(/&amp;/g, '&');
                    }
                }
            }

            if (streamUrl && streamUrl.startsWith('http')) {
                KeyVault.reportSuccess(endpoint.name, Date.now() - start);
                console.log(`[Tidal] ✓ Got ${actualQuality} stream from ${endpoint.name}`);
                return { url: streamUrl, quality: actualQuality, keyName: endpoint.name };
            } else {
                console.warn(`[Tidal] Failed to parse stream from ${endpoint.name}`);
                // Don't report failure, the mirror worked but parsing failed.
            }

        } catch (error: any) {
            if (error.name !== 'AbortError') KeyVault.reportFailure(endpoint.name);
            if (error.name === 'AbortError') {
                console.log(`[Tidal] ${endpoint.name} timed out or aborted`);
            }
        }
    }

    console.error(`[Tidal] ✗ Could not get ${targetQuality} stream URL for track: ${trackId}`);
    return null;
}

// ============================================================================
// Qobuz Search
// ============================================================================

export async function searchQobuz(query: string, signal?: AbortSignal): Promise<HiFiSearchResult | null> {
    console.log('[Qobuz] Searching for:', query);

    // Qobuz Search is tricky. Only 'squid' (qobuz.squid.wtf) supports robust searching usually.
    // 'dab' mirrors are often stream-only.
    // We try to find a key that supports search.
    // However, KeyVault returns all Qobuz keys as 'stream' usually.
    // We'll filter or try specialized endpoint.
    // Actually, `qobuz.squid.wtf` IS in our vault as 'squid'.

    // For now, let's try strict endpoint: qobuz.squid.wtf/api/get-music
    // If that's down, we might be out of lookup options unless we use the Backup App ID (which we don't have full search implementation for yet).

    // Hardcoded logic for SEARCH specifically to 'squid' (most reliable searcher)
    const searchEndpoint = 'https://qobuz.squid.wtf/api/get-music';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        if (signal) {
            signal.addEventListener('abort', () => controller.abort());
            if (signal.aborted) controller.abort();
        }

        const response = await fetch(`${searchEndpoint}?query=${encodeURIComponent(query)}`, {
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
            console.log('[Qobuz] Search timed out or aborted');
        } else {
            console.warn('[Qobuz] Search warning:', error.message); // Warn instead of Error for network glitches
        }
        return null;
    }
}

// ============================================================================
// Qobuz Stream URL
// ============================================================================

export async function getQobuzStreamUrl(trackId: string, signal?: AbortSignal): Promise<{ url: string; quality: string; keyName: string } | null> {
    console.log('[Qobuz] Getting stream URL for track:', trackId);

    const endpoints = KeyVault.getHealthyEndpoints('qobuz');

    for (const ep of endpoints) {
        if (!ep.paramName) continue; // Skip non-stream endpoints

        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            if (signal) {
                signal.addEventListener('abort', () => controller.abort());
                if (signal.aborted) controller.abort();
            }

            let url = `${ep.url}?${ep.paramName}=${trackId}`;
            if (ep.qualityParam) url += `&quality=${ep.qualityParam}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                KeyVault.reportFailure(ep.name);
                continue;
            }

            const data = await response.json();
            const streamUrl = data?.url || data?.stream_url || data?.link;

            if (streamUrl) {
                KeyVault.reportSuccess(ep.name, Date.now() - start);
                console.log(`[Qobuz] ✓ Got Hi-Res stream from ${ep.name}`);
                return { url: streamUrl, quality: 'HI_RES_LOSSLESS', keyName: ep.name };
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') KeyVault.reportFailure(ep.name);
            if (error.name === 'AbortError') {
                console.log(`[Qobuz] ${ep.name} timed out or aborted`);
            }
        }
    }

    console.error('[Qobuz] ✗ Could not get stream URL for track:', trackId);
    return null;
}

// ============================================================================
// Unified Search (Tidal + Qobuz)
// ============================================================================

export async function searchHiFi(query: string, signal?: AbortSignal): Promise<HiFiSearchResult | null> {
    if (!query.trim()) return null;

    console.log('[HiFi] Starting Unified Parallel Search (God Mode)...');

    // Run BOTH engines in parallel for maximum redundancy
    const [qobuzResult, tidalResult] = await Promise.all([
        searchQobuz(query, signal).catch(e => {
            console.error('[HiFi] Qobuz Search Error:', e);
            return null;
        }),
        searchTidal(query, signal).catch(e => {
            console.error('[HiFi] Tidal Search Error:', e);
            return null;
        })
    ]);

    // Merge results
    const combinedTracks: HiFiTrack[] = [];
    const combinedAlbums: HiFiAlbum[] = [];

    if (qobuzResult) {
        combinedTracks.push(...qobuzResult.tracks);
        combinedAlbums.push(...qobuzResult.albums);
    }
    if (tidalResult) {
        combinedTracks.push(...tidalResult.tracks);
        combinedAlbums.push(...tidalResult.albums);
    }

    if (combinedTracks.length === 0) return null;

    console.log(`[HiFi] Merged Result: ${qobuzResult?.tracks.length || 0} Qobuz + ${tidalResult?.tracks.length || 0} Tidal tracks`);

    return {
        tracks: combinedTracks,
        albums: combinedAlbums,
        source: 'unified-hifi'
    };
}

// ============================================================================
// Unified Stream URL
// ============================================================================

export async function getHiFiStreamUrl(trackId: string, source: 'tidal' | 'qobuz', signal?: AbortSignal): Promise<{ url: string; quality: string; keyName: string } | null> {
    if (source === 'qobuz') {
        return await getQobuzStreamUrl(trackId, signal);
    } else {
        // Try LOSSLESS first
        let result = await getTidalStreamUrl(trackId, 'LOSSLESS', signal);
        if (result) return result;

        // Fallback to HIGH (320kbps AAC) if Lossless fails - "Best Effort"
        console.log('[HiFi] Lossless failed, trying HIGH fallback...');
        result = await getTidalStreamUrl(trackId, 'HIGH', signal);
        if (result) return { ...result, quality: 'HIGH', keyName: result.keyName }; // Explicitly mark as 320 equivalent

        return null;
    }
}

// ============================================================================
// Album Details
// ============================================================================

export async function getHiFiAlbum(albumId: string, source: 'tidal' | 'qobuz'): Promise<HiFiTrack[]> {
    if (source === 'qobuz') {
        const key = KeyVault.getQobuzMetadataKey(); // Backup ID logic or just proxy

        // For album tracks, the 'squid' proxy (get-album) is best.
        // Similar to search, we rely on the primary proxy availability.
        // Can fallback to metadata key if needed, but parsing is complex.

        console.log('[Qobuz] Getting album tracks for:', albumId);
        try {
            const response = await fetch(`https://qobuz.squid.wtf/api/get-album?id=${albumId}`);

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

    if (source === 'tidal') {
        // Use vault for Tidal
        const endpoints = KeyVault.getHealthyEndpoints('tidal');

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(`${endpoint.url}/album/?id=${albumId}`);
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
                } else {
                    KeyVault.reportFailure(endpoint.name);
                }
            } catch (e) {
                KeyVault.reportFailure(endpoint.name);
            }
        }
    }

    return [];
}
