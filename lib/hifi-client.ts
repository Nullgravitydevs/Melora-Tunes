/**
 * HiFi Client - Browser-side API for Tidal/Qobuz
 * STRICT COMPLIANCE MODE:
 * 1. NO Server-Side Stream Proxying (Client-Only Mirrors)
 * 2. NO ID Leaking (Stable IDs handled by caller)
 * 3. NO Loose Qualities (HI_RES/LOSSLESS Only)
 */

import { Capacitor } from '@capacitor/core';
import { getHiFiStreamUrl } from './hifi'; // Client-side scraper

export interface HiFiTrack {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    album: string;
    albumId: string;
    duration: number;
    coverArt: string | null;
    quality: 'LOSSLESS' | 'HI_RES_LOSSLESS'; // STRICT: No HIGH/LOW
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
 * Note: Still uses server proxy for SEARCH METADATA only (Safe)
 */
export async function searchHiFi(query: string, source?: 'tidal' | 'qobuz'): Promise<HiFiSearchResult | null> {
    if (Capacitor.isNativePlatform()) return null; // HiFi disabled on mobile
    if (!query.trim()) return null;

    try {
        let url = `/api/hifi?type=search&q=${encodeURIComponent(query)}`;
        if (source) url += `&source=${source}`;

        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.success && data.tracks) {
            // STRICT FILTERING RULE:
            // 1. Allow ONLY 'tidal' and 'qobuz' sources
            // 2. Allow ONLY 'HI_RES_LOSSLESS' and 'LOSSLESS' qualities
            // Discard everything else (HIGH, LOW, AAC).
            const validTracks: HiFiTrack[] = [];

            for (const t of data.tracks) {
                if (t.source !== 'tidal' && t.source !== 'qobuz') continue;

                // Strict Quality Check
                if (t.quality === 'HI_RES_LOSSLESS' || t.quality === 'LOSSLESS') {
                    validTracks.push(t as HiFiTrack);
                }
            }

            return {
                ...data,
                tracks: validTracks
            };
        }
        return null;
    } catch (error) {
        console.error('[HiFi Client] Search error:', error);
        return null;
    }
}

/**
 * Get stream URL for a HiFi track
 * STRICT: CLIENT-SIDE ONLY via Mirror Scraper
 * NEVER calls /api/hifi?type=stream
 */
export async function getHiFiStream(trackId: string, source: 'tidal' | 'qobuz'): Promise<{ url: string; quality: string; keyName: string } | null> {
    try {
        console.log(`[HiFi Client] Resolving stream CLIENT-SIDE for ${source}:${trackId}`);
        // Use the client-side mirror scraper directly
        // This avoids the server proxy ban risk
        return await getHiFiStreamUrl(trackId, source);
    } catch (error) {
        console.error('[HiFi Client] Stream error:', error);
        return null;
    }
}

/**
 * Convert HiFi track to JioSaavnSong format for playback context
 * STRICT: Mark as SYNTHETIC. Do NOT trust ID for global identity.
 */
export function hifiTrackToSong(track: HiFiTrack): any {
    return {
        // ID is passed through but should be overridden by Stable ID in Unified Search
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
        hifiQuality: track.quality,
        isSynthetic: true // WARN: synthetic metadata
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
            // Apply strict filter here too
            const valid = data.tracks
                .filter((t: any) =>
                    (t.source === 'tidal' || t.source === 'qobuz') &&
                    (t.quality === 'HI_RES_LOSSLESS' || t.quality === 'LOSSLESS')
                )
                .map((t: any) => hifiTrackToSong(t as HiFiTrack));

            return valid;
        }
        return null;
    } catch (error) {
        console.error('[HiFi Client] Album error:', error);
        return null;
    }
}
