import { Capacitor, CapacitorHttp } from '@capacitor/core';
import CryptoJS from 'crypto-js';

export interface JioSaavnSong {
    id: string;
    name: string;
    type: string;
    album: {
        id: string;
        name: string;
        url: string;
    };
    year: string;
    releaseDate: string;
    duration: number;
    label: string;
    primaryArtists: string;
    featuredArtists: string;
    explicitContent: number;
    playCount: number;
    language: string;
    hasLyrics: string;
    url: string;
    copyright: string;
    image: {
        quality: string;
        link: string;
    }[];
    downloadUrl: {
        quality: string;
        link: string;
    }[];
    encryptedMediaUrl: string;
}

export interface SearchResponse {
    results: any[];
}

const DES_KEY = process.env.NEXT_PUBLIC_DES_KEY || '38346591';

const isElectron = typeof window !== 'undefined' && /Electron/i.test(window.navigator.userAgent);

export async function searchSongs(query: string, page: number = 1, limit: number = 10): Promise<JioSaavnSong[]> {
    try {
        console.log(`[Search] Query: "${query}", Mode: ${isElectron ? 'ELECTRON' : 'WEB'}`);
        let data: any;

        const STATIC_QUERIES = ['Trending', 'Telugu Hits', 'New Releases'];
        const useCache = STATIC_QUERIES.some(q => query.includes(q));

        if (useCache) {
            data = await fetchApi(`__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0`, true);
        } else {
            // Normal Search - No Aggressive Caching
            if (Capacitor.isNativePlatform()) {
                const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0`;
                const response = await CapacitorHttp.get({ url: apiUrl });
                data = response.data;
            } else if (isElectron) {
                const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0`;
                const response = await fetch(apiUrl);
                data = await response.json();
            } else {
                const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
                data = await response.json();
            }
        }

        let list = [];
        if (data.results) {
            list = Array.isArray(data.results) ? data.results : [];
        } else if (Array.isArray(data)) {
            list = data;
        }

        if (list.length > 0) {
            return list.map((item: any) => {
                const title = item.title || item.name || item.song || `[Unknown]`;
                const encryptedUrl = item.more_info?.encrypted_media_url || item.encrypted_media_url || "";

                return {
                    id: item.id,
                    name: title,
                    type: item.type,
                    album: {
                        id: item.more_info?.album_id || '',
                        name: item.more_info?.album || '',
                        url: item.more_info?.album_url || ''
                    },
                    year: item.year || item.more_info?.year || '',
                    releaseDate: item.more_info?.release_date || '',
                    duration: parseInt(item.more_info?.duration || item.duration || '0'),
                    label: item.more_info?.label || '',
                    primaryArtists: item.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(', ') || item.subtitle || '',
                    featuredArtists: '',
                    explicitContent: item.explicit_content,
                    playCount: parseInt(item.play_count || '0'),
                    language: item.language,
                    hasLyrics: item.more_info?.has_lyrics,
                    url: item.perma_url,
                    copyright: item.more_info?.copyright_text || '',
                    image: [
                        { quality: '500x500', link: (item.image || '').replace(/150x150|50x50/g, '500x500') },
                        { quality: '150x150', link: (item.image || '').replace(/50x50/g, '150x150') },
                        { quality: '50x50', link: (item.image || '').replace(/150x150/g, '50x50') }
                    ],
                    downloadUrl: [],
                    encryptedMediaUrl: encryptedUrl
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error searching songs:', error);
        return [];
    }
}

export function decryptUrl(encryptedUrl: string): string {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const encrypted = CryptoJS.enc.Base64.parse(encryptedUrl);

    const decrypted = CryptoJS.DES.decrypt(
        { ciphertext: encrypted } as any,
        key,
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
}

export function getAudioUrl(song: JioSaavnSong, bitrate: '320' | '160' | '96' | '48' | '12' = '320'): string {
    if (!song.encryptedMediaUrl) {
        console.warn("No encrypted media URL found for song:", song.name);
        return '';
    }

    try {
        const decryptedUrl = decryptUrl(song.encryptedMediaUrl);
        // Replace suffix with requested bitrate
        return decryptedUrl.replace(/_(160|96|48|12)\./g, `_${bitrate}.`);
    } catch (e) {
        console.warn('Failed to decrypt URL for song:', song.name, e);
        return '';
    }
}

export function getThumbnailUrl(song: JioSaavnSong): string {
    const qualities = ['500x500', '150x150', '50x50'];

    for (const quality of qualities) {
        const link = song.image.find(i => i.quality === quality)?.link;
        if (link) return link;
    }

    return song.image[0]?.link || '';
}

export async function getLyrics(songId: string): Promise<string | null> {
    try {
        let data: any;
        if (Capacitor.isNativePlatform()) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&_format=json&ctx=wap6dot0&api_version=4&n=1&p=1&q=${songId}&lyrics_id=${songId}`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&_format=json&ctx=wap6dot0&api_version=4&n=1&p=1&q=${songId}&lyrics_id=${songId}`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            const response = await fetch(`/api/lyrics?id=${songId}`);
            data = await response.json();
        }

        if (data.lyrics) {
            // JioSaavn returns lyrics with <br> tags, replace them with newlines
            return data.lyrics.replace(/<br\s*\/?>/gi, '\n');
        }
        return null;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return null;
    }
}

export async function getLyricsWithFallback(song: JioSaavnSong): Promise<string | null> {
    // Try JioSaavn first
    const jiosaavnLyrics = await getLyrics(song.id);
    if (jiosaavnLyrics && jiosaavnLyrics.trim().length > 0) {
        return jiosaavnLyrics;
    }

    // Fallback to LRCLib
    try {
        console.log('JioSaavn failed, trying LRCLib fallback...');
        const response = await fetch(
            `/api/lyrics-fallback?track=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.primaryArtists)}`
        );
        const data = await response.json();

        if (data.lyrics && data.lyrics.trim().length > 0) {
            console.log('Found lyrics from LRCLib!');
            return data.lyrics;
        }
    } catch (error) {
        console.error('LRCLib fallback failed:', error);
    }

    return null;
}

export async function getSongDetails(songId: string): Promise<JioSaavnSong | null> {
    try {
        let data: any;

        if (Capacitor.isNativePlatform()) {
            // 🚀 NATIVE MODE: Direct fetch to JioSaavn (Bypasses Proxy)
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&pids=${songId}&ctx=wap6dot0`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            // 🚀 ELECTRON MODE: Direct fetch
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&pids=${songId}&ctx=wap6dot0`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            // 🐢 WEB MODE: Use Next.js Proxy
            const response = await fetch(`/api/song?id=${songId}`);
            data = await response.json();
        }

        // JioSaavn returns an object where keys are IDs, or sometimes a list
        // We need to handle the specific format for song.getDetails
        const songData = data[songId] || (data.songs && data.songs[0]) || data;

        if (songData && (songData.id || songData.song)) {
            return {
                id: songData.id,
                name: songData.song || songData.title || songData.name || "Unknown Details Title",
                type: songData.type,
                album: {
                    id: songData.albumid,
                    name: songData.album,
                    url: songData.album_url
                },
                year: songData.year,
                releaseDate: songData.release_date,
                duration: parseInt(songData.duration),
                label: songData.label,
                primaryArtists: songData.primary_artists,
                featuredArtists: songData.featured_artists,
                explicitContent: songData.explicit_content,
                playCount: parseInt(songData.play_count),
                language: songData.language,
                hasLyrics: songData.has_lyrics,
                url: songData.perma_url,
                copyright: songData.copyright_text,
                image: [
                    { quality: '500x500', link: (songData.image || '').replace(/150x150|50x50/g, '500x500') },
                    { quality: '150x150', link: (songData.image || '').replace(/50x50/g, '150x150') },
                    { quality: '50x50', link: (songData.image || '').replace(/150x150/g, '50x50') }
                ],
                downloadUrl: [],
                encryptedMediaUrl: songData.encrypted_media_url || ''
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching song details:', error);
        return null;
    }
}

// --- CACHE IMPLEMENTATION ---
const CACHE_DURATION = 1000 * 60 * 15; // 15 Minutes
const CACHE_KEY_PREFIX = 'melora_cache_';

interface CacheEntry {
    timestamp: number;
    data: any;
}

class ApiCache {
    private memoryCache = new Map<string, CacheEntry>();

    get(key: string): any | null {
        // 1. Try Memory
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key)!;
            if (Date.now() - entry.timestamp < CACHE_DURATION) {
                console.log(`[Cache] Hit (Memory): ${key}`);
                return entry.data;
            } else {
                this.memoryCache.delete(key);
            }
        }

        // 2. Try LocalStorage (Client Side Only)
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(CACHE_KEY_PREFIX + key);
                if (stored) {
                    const entry: CacheEntry = JSON.parse(stored);
                    if (Date.now() - entry.timestamp < CACHE_DURATION) {
                        console.log(`[Cache] Hit (Disk): ${key}`);
                        // Hydrate memory
                        this.memoryCache.set(key, entry);
                        if (entry.data?.length === 0) return null; // Don't return empty cached arrays
                        return entry.data;
                    } else {
                        localStorage.removeItem(CACHE_KEY_PREFIX + key);
                    }
                }
            } catch (e) { console.warn("[Cache] Read Failed", e); }
        }
        return null;
    }

    set(key: string, data: any) {
        if (!data || (Array.isArray(data) && data.length === 0)) return; // Don't cache empty

        const entry: CacheEntry = { timestamp: Date.now(), data };
        this.memoryCache.set(key, entry);

        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
            } catch (e) {
                console.warn("[Cache] Write Failed (Quota?)", e);
                // Clear old cache if full?
                try { localStorage.clear(); } catch { }
            }
        }
    }
}

export const apiCache = new ApiCache();

// --- HELPER FUNCTION FOR ALL PLATFORMS ---
async function fetchApi(params: string, useCache: boolean = false): Promise<any> {
    try {
        if (useCache) {
            const cached = apiCache.get(params);
            if (cached) return cached;
        }

        const urlStr = params.startsWith('?') ? params.slice(1) : params;
        let resData: any = null;

        if (Capacitor.isNativePlatform()) {
            const url = `https://www.jiosaavn.com/api.php?${urlStr}`;
            const res = await CapacitorHttp.get({ url });
            resData = res.data;
        } else if (isElectron) {
            const url = `https://www.jiosaavn.com/api.php?${urlStr}`;
            const res = await fetch(url);
            resData = await res.json();
        } else {
            // Web Proxy
            const url = `/api/proxy?${urlStr}`;
            const res = await fetch(url);
            if (res.status === 429) {
                console.error("API Rate Limit (429) - Returning cached stale if available");
                // Aggressive fallback: try to find ANYTHING in cache for this key even if expired
                if (typeof window !== 'undefined') {
                    const stored = localStorage.getItem(CACHE_KEY_PREFIX + params);
                    if (stored) return JSON.parse(stored).data;
                }
                throw new Error("429 Rate Limit");
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            resData = await res.json();
        }

        if (useCache && resData) {
            apiCache.set(params, resData);
        }

        return resData;

    } catch (e) {
        console.error("API Fetch Error:", e);
        return null;
    }
}

export async function getTopCharts(): Promise<any[]> {
    const data = await fetchApi('__call=content.getCharts&api_version=4&_format=json&ctx=wap6dot0', true); // CACHED
    // Ensure it's an array, otherwise return empty
    return Array.isArray(data) ? data : [];
}

export async function getTrending(): Promise<JioSaavnSong[]> {
    try {
        const data = await fetchApi('__call=webapi.get&token=&type=trending&p=1&n=20&_format=json&ctx=wap6dot0&api_version=4', true); // CACHED
        if (!data || !Array.isArray(data)) return [];
        // Trending API returns a slightly different structure sometimes, but usually list of songs/albums
        // We filter for songs only for now
        const songs = data.filter((item: any) => item.type === 'song');
        return songs.map(mapToSong);
    } catch (e) {
        console.error("Error fetching trending:", e);
        return [];
    }
}

export async function getRecommendations(songId: string, limit: number = 5): Promise<JioSaavnSong[]> {
    const data = await fetchApi(`__call=reco.getreco&api_version=4&_format=json&ctx=wap6dot0&pid=${songId}&n=${limit}`);

    if (!data || !Array.isArray(data)) return [];

    return data.map(mapToSong);
}

export async function getPlaylistDetails(id: string): Promise<JioSaavnSong[]> {
    const data = await fetchApi(`__call=playlist.getDetails&api_version=4&_format=json&ctx=wap6dot0&listid=${id}`);

    // Playlist structure can vary
    const list = data?.list || data?.songs || [];
    if (!Array.isArray(list)) return [];

    return list.map(mapToSong);
}

export async function getAlbumDetails(id: string): Promise<JioSaavnSong[]> {
    const data = await fetchApi(`__call=content.getAlbumDetails&api_version=4&_format=json&ctx=wap6dot0&albumid=${id}`);

    // Album structure can vary
    const list = data?.list || data?.songs || [];
    if (!Array.isArray(list)) return [];

    return list.map(mapToSong);
}

export async function getArtistDetails(artistId: string): Promise<any> {
    const data = await fetchApi(`__call=artist.getArtistPageDetails&api_version=4&_format=json&ctx=wap6dot0&artistId=${artistId}`);
    return data;
}

// Helper to map API response to JioSaavnSong
function mapToSong(item: any): JioSaavnSong {
    const title = item.title || item.name || item.song || `[Unknown]`;
    const encryptedUrl = item.more_info?.encrypted_media_url || item.encrypted_media_url || "";

    return {
        id: item.id,
        name: title,
        type: item.type,
        album: {
            id: item.more_info?.album_id || '',
            name: item.more_info?.album || '',
            url: item.more_info?.album_url || ''
        },
        year: item.year || item.more_info?.year || '',
        releaseDate: item.more_info?.release_date || '',
        duration: parseInt(item.more_info?.duration || item.duration || '0'),
        label: item.more_info?.label || '',
        primaryArtists: item.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(', ') || item.subtitle || '',
        featuredArtists: '',
        explicitContent: item.explicit_content,
        playCount: parseInt(item.play_count || '0'),
        language: item.language,
        hasLyrics: item.more_info?.has_lyrics,
        url: item.perma_url,
        copyright: item.more_info?.copyright_text || '',
        image: [
            { quality: '500x500', link: (item.image || '').replace(/150x150|50x50/g, '500x500') },
            { quality: '150x150', link: (item.image || '').replace(/50x50/g, '150x150') },
            { quality: '50x50', link: (item.image || '').replace(/150x150/g, '50x50') }
        ],
        downloadUrl: [],
        encryptedMediaUrl: encryptedUrl
    };
}

export async function getSyncedLyrics(trackName: string, artistName: string, albumName: string, duration: number): Promise<{ synced: boolean, text: string }> {
    try {
        const query = `track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}&album_name=${encodeURIComponent(albumName)}&duration=${duration}`;
        const res = await fetch(`https://lrclib.net/api/get?${query}`);

        if (!res.ok) {
            // Try search fallback if direct match fails
            const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(trackName + " " + artistName)}`);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (Array.isArray(searchData) && searchData.length > 0) {
                    // Pick the best match (closest duration)
                    const best = searchData.sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))[0];
                    if (Math.abs(best.duration - duration) < 10) { // Tolerance 10s
                        return {
                            synced: !!best.syncedLyrics,
                            text: best.syncedLyrics || best.plainLyrics || "No lyrics found."
                        };
                    }
                }
            }
            throw new Error("Lyrics not found");
        }

        const data = await res.json();

        if (data.syncedLyrics) {
            return { synced: true, text: data.syncedLyrics };
        }
        return { synced: false, text: data.plainLyrics || "No lyrics found" };
    } catch (e) {
        return { synced: false, text: "Lyrics not available" };
    }
}
