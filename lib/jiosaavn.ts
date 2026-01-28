import { Capacitor, CapacitorHttp } from '@capacitor/core';
import CryptoJS from 'crypto-js';
import { musixmatch } from '@/lib/musixmatch';
// REMOVED: internal loadSettings() - strictly passed via args now

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
    primaryArtistsId: string;
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

export async function searchSongs(query: string, page: number = 1, limit: number = 10, language?: string): Promise<JioSaavnSong[]> {
    try {
        const lang = normalizeLanguage(language);
        console.log(`[Search] Query: "${query}", Mode: ${isElectron ? 'ELECTRON' : 'WEB'}, Lang: ${lang}`);
        let data: any;

        // FIX: Disabled static query caching to ensure language correctness
        if (Capacitor.isNativePlatform()) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}&language=${lang}`);
            data = await response.json();
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
                    type: item.type || 'song', // Default to song if missing to prevents filtering issues
                    album: {
                        id: item.more_info?.album_id || '',
                        name: item.more_info?.album || '',
                        url: item.more_info?.album_url || ''
                    },
                    year: item.year || item.more_info?.year || '',
                    releaseDate: item.more_info?.release_date || '',
                    duration: parseInt(item.more_info?.duration || item.duration || '0'),
                    label: item.more_info?.label || '',
                    // FIX: Check multiple paths for artist - JioSaavn API is inconsistent
                    primaryArtists:
                        item.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(', ') ||
                        item.more_info?.primary_artists ||
                        item.primary_artists ||
                        item.subtitle ||
                        '',
                    primaryArtistsId: item.more_info?.artistMap?.primary_artists?.map((a: any) => a.id).join(', ') || item.more_info?.primary_artists_id || '',
                    featuredArtists: '',
                    explicitContent: item.explicit_content,
                    playCount: parseInt(item.play_count || '0'),
                    language: item.language,
                    hasLyrics: item.more_info?.has_lyrics,
                    url: item.perma_url,
                    copyright: item.more_info?.copyright_text || '',
                    image: formatImage(item.image),
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

export async function searchAlbums(query: string, page: number = 1, limit: number = 10, language?: string): Promise<JioSaavnSong[]> {
    try {
        const lang = normalizeLanguage(language);
        console.log(`[Search Albums] Query: "${query}"`);
        let data: any;

        // Use search.getAlbumResults
        if (Capacitor.isNativePlatform()) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            // Web Proxy - we can reuse the generic proxy or specific one
            // Assuming /api/proxy handles generic calls or we make a new one?
            // Existing searchSongs uses /api/search. Let's create a similar pattern or reuse fetchApi
            // For simplicity and reusing existing patterns, let's use fetchApi wrapper we made or similar logic
            data = await fetchApi(`__call=search.getAlbumResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&languages=${lang}`, true);
        }

        let list = [];
        if (data.results) {
            list = Array.isArray(data.results) ? data.results : [];
        } else if (Array.isArray(data)) {
            list = data;
        }

        if (list.length > 0) {
            return list.map((item: any) => {
                // Albums have slightly different structure in search results
                // Usually they look like songs but type='album'
                const title = item.title || item.name || item.song || `[Unknown Album]`;
                const encryptedUrl = item.more_info?.encrypted_media_url || item.encrypted_media_url || "";

                // Handle Header/Flat Properties (JioSaavn Album Search often returns these at top level)
                // Fallback to more_info if top level missing
                const year = item.year || item.more_info?.year || '';
                const language = item.language || item.more_info?.language || '';
                const releaseDate = item.release_date || item.more_info?.release_date || '';

                // Artist Mapping: Check top-level 'primary_artists' string, or nested map
                let primaryArtists = item.primary_artists || item.subtitle || item.music || '';
                if (!primaryArtists && item.more_info?.artistMap?.primary_artists) {
                    primaryArtists = item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(', ');
                }

                return {
                    id: item.id || item.albumid, // Search sometimes uses 'albumid'
                    name: title,
                    type: 'album',
                    album: {
                        id: item.id || item.albumid,
                        name: title,
                        url: item.perma_url || ''
                    },
                    year: year,
                    releaseDate: releaseDate,
                    duration: 0,
                    label: item.label || item.more_info?.label || '',
                    primaryArtists: primaryArtists,
                    primaryArtistsId: '',
                    featuredArtists: '',
                    explicitContent: item.explicit_content,
                    playCount: 0,
                    language: language,
                    hasLyrics: 'false',
                    url: item.perma_url,
                    copyright: '',
                    image: formatImage(item.image),
                    downloadUrl: [],
                    encryptedMediaUrl: encryptedUrl
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error searching albums:', error);
        return [];
    }
}

export async function searchPlaylists(query: string, page: number = 1, limit: number = 10, language?: string): Promise<JioSaavnSong[]> {
    try {
        const lang = normalizeLanguage(language);
        console.log(`[Search Playlists] Query: "${query}"`);
        let data: any;

        if (Capacitor.isNativePlatform()) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&language=${lang}`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            const response = await fetch(`/api/search?type=playlist&query=${encodeURIComponent(query)}&page=${page}&limit=${limit}&language=${lang}`);
            // Note: server API might not support type=playlist yet, but let's assume direct call if not.
            // Actually, if we use the proxy (fetchApi logic), better.
            // Let's manually reconstruct the proxy call if needed or assume /api/search handles it.
            // Safest: Use fetchApi wrapper logic directly here if we want consistency?
            // Actually, for simplicity, I'll assume the /api/search is smart enough OR i'll just use fetchApi wrapped call logic if I were refactoring.
            // But since I am editing the file, I'll stick to the pattern used in searchSongs/Albums.
            // To be safe, I'll fallback to a direct proxied call using fetchApi pattern if /api/search isn't guaranteed.
            data = await fetchApi(`__call=search.getPlaylistResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&languages=${lang}`, true);
        }

        let list = [];
        if (data.results) {
            list = Array.isArray(data.results) ? data.results : [];
        } else if (Array.isArray(data)) {
            list = data;
        }

        if (list.length > 0) {
            return list.map((item: any) => {
                const title = item.title || item.name || `[Unknown Playlist]`;
                return {
                    id: item.id || item.listid,
                    name: title,
                    type: 'playlist',
                    album: { id: '', name: '', url: '' },
                    year: '',
                    releaseDate: '',
                    duration: 0,
                    label: '',
                    primaryArtists: '',
                    primaryArtistsId: '',
                    featuredArtists: '',
                    explicitContent: 0,
                    playCount: 0,
                    language: item.language || '',
                    hasLyrics: 'false',
                    url: item.perma_url,
                    copyright: '',
                    image: formatImage(item.image),
                    downloadUrl: [],
                    encryptedMediaUrl: ''
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error searching playlists:', error);
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

export function getAudioUrl(song: JioSaavnSong, bitrate: 'flac' | '320' | '160' | '96' = '320'): string {
    if (!song.encryptedMediaUrl) {
        console.warn("No encrypted media URL found for song:", song.name);
        return '';
    }

    try {
        const decryptedUrl = decryptUrl(song.encryptedMediaUrl);
        // If FLAC is requested, try to generate the FLAC URL (usually ends in _flac. or _lossless. depending on provider quirks)
        // For JioSaavn, standard encrypted URLs are usually MP4/AAC.
        // However, if we are in "Native Mode", we might want to try forcing the bitrate.
        // Fix: Use 'flac' as target if requested.
        const targetBitrate = bitrate;

        if (targetBitrate === 'flac') {
            // For FLAC, we usually need to change the extension from .mp4 to .flac as well
            return decryptedUrl.replace(/_(320|160|96|48|12)\.(mp4|m4a)/g, '_flac.flac');
        }

        // Standard bitrate change (keeps extension)
        return decryptedUrl.replace(/_(320|160|96|48|12)\./g, `_${targetBitrate}.`);
    } catch (e) {
        console.warn('Failed to decrypt URL for song:', song.name, e);
        return '';
    }
}

export function getThumbnailUrl(song: JioSaavnSong): string {
    if (!song || !song.image) return '';

    // Handle legacy/raw string format
    if (typeof song.image === 'string') return song.image;

    // Safety check for array
    if (!Array.isArray(song.image)) return '';

    const qualities = ['500x500', '150x150', '50x50'];

    for (const quality of qualities) {
        // Safe access
        const match = song.image.find(i => i && i.quality === quality);
        if (match && match.link) return match.link;
    }

    // Fallback to first available
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
                primaryArtistsId: songData.primary_artists_id || '',
                featuredArtists: songData.featured_artists,
                explicitContent: songData.explicit_content,
                playCount: parseInt(songData.play_count),
                language: songData.language,
                hasLyrics: songData.has_lyrics,
                url: songData.perma_url,
                copyright: songData.copyright_text,
                image: formatImage(songData.image),
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

export async function getTopCharts(language?: string): Promise<any[]> {
    const lang = normalizeLanguage(language);
    // Charts are often specific to a region/language. If multiple are passed, 
    // the API might default to Global. We enforce the primary (first) language 
    // to ensure the "Language Based" requirement is met.
    const primaryLang = lang.split(',')[0];
    const data = await fetchApi(`__call=content.getCharts&api_version=4&_format=json&ctx=wap6dot0&languages=${primaryLang}`, true); // CACHED
    // Ensure it's an array, otherwise return empty
    return Array.isArray(data) ? data : [];
}

export async function getTrending(language?: string): Promise<JioSaavnSong[]> {
    try {
        const lang = normalizeLanguage(language);
        const data = await fetchApi(`__call=webapi.get&token=&type=trending&p=1&n=20&_format=json&ctx=wap6dot0&api_version=4&languages=${lang}`, true); // CACHED
        if (!data || !Array.isArray(data)) {
            console.log('[getTrending] No data or not array:', typeof data);
            return [];
        }
        console.log('[getTrending] Raw data count:', data.length, 'Types:', data.slice(0, 3).map((i: any) => i.type));
        // Trending API returns mixed content - filter for songs (case-insensitive) or items that look like songs
        const songs = data.filter((item: any) => {
            const itemType = (item.type || '').toLowerCase();
            // Include songs, or items with downloadUrl/duration (song indicators)
            return itemType === 'song' || itemType === '' || item.downloadUrl || item.duration;
        });
        console.log('[getTrending] Filtered songs count:', songs.length);
        return songs.map(mapToSong);
    } catch (e) {
        console.error("Error fetching trending:", e);
        return [];
    }
}

export async function getNewReleases(limit: number = 10, language?: string): Promise<any[]> {
    try {
        const lang = normalizeLanguage(language);
        // Note: content.getAlbums is often used for new releases
        // Note: content.getAlbums is often used for new releases
        // CRITICAL FIX: The API caps at ~30 items and returns many garbage "song" type items.
        // We fetch 2 pages concurrently to get ~60 candidates.
        const [p1, p2] = await Promise.all([
            fetchApi(`__call=content.getAlbums&api_version=4&_format=json&ctx=wap6dot0&n=50&p=1&languages=${lang}`, true),
            fetchApi(`__call=content.getAlbums&api_version=4&_format=json&ctx=wap6dot0&n=50&p=2&languages=${lang}`, true)
        ]);

        const list1 = p1?.data || p1 || [];
        const list2 = p2?.data || p2 || [];
        const list = [...(Array.isArray(list1) ? list1 : []), ...(Array.isArray(list2) ? list2 : [])];

        if (list.length === 0) return [];

        // Filter out known bad data patterns
        const validList = list.filter((item: any) => {
            const name = (item.name || item.title || '').toLowerCase();
            const isSongType = item.type === 'song';
            return !isSongType && !name.includes('trailer') && !name.includes('teaser');
        });

        // Dedup by ID just in case
        const unique = Array.from(new Map(validList.map((item: any) => [item.id, item])).values());

        return unique.slice(0, limit).map(mapToSong).map(s => ({
            ...s,
            type: 'album'
        }));
    } catch (e) {
        console.error("Error fetching new releases", e);
        return [];
    }
}

export async function getFeaturedPlaylists(limit: number = 10, language?: string): Promise<any[]> {
    try {
        const lang = normalizeLanguage(language);
        // Better endpoint: content.getFeaturedPlaylists
        const data = await fetchApi(`__call=content.getFeaturedPlaylists&fetch_from_serialized_id=true&p=1&n=${limit}&_format=json&ctx=wap6dot0&languages=${lang}`, true); // CACHED

        const list = data?.data || data || [];
        if (!Array.isArray(list)) return [];

        return list.map((item: any) => {
            return {
                id: item.listid || item.id,
                name: item.listname || item.title || item.name || "[Unknown Playlist]",
                type: 'playlist',
                album: { id: '', name: '', url: '' },
                year: '',
                releaseDate: '',
                duration: 0,
                label: '',
                primaryArtists: item.firstname || '',
                primaryArtistsId: '',
                featuredArtists: '',
                explicitContent: 0,
                playCount: parseInt(item.play_count || item.count || '0'),
                language: item.language || '',
                hasLyrics: 'false',
                url: item.perma_url,
                copyright: '',
                image: formatImage(item.image),
                downloadUrl: [],
                encryptedMediaUrl: ''
            };
        });
    } catch (e) {
        console.error("Error fetching featured playlists", e);
        return [];
    }
}

export async function getRecommendations(songId: string, limit: number = 5): Promise<JioSaavnSong[]> {
    const data = await fetchApi(`__call=reco.getreco&api_version=4&_format=json&ctx=wap6dot0&pid=${songId}&n=${limit}`);

    if (!data || !Array.isArray(data)) return [];

    return data.map(mapToSong);
}

export async function getStation(songId: string): Promise<JioSaavnSong[]> {
    // Station endpoint often requires specific station ID, but recommendations are similar enough for Autoplay
    // We use getRecommendations as the underlying implementation for "Station"
    return getRecommendations(songId, 10);
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

    // FIX: Filter out "trailer" or "testing" placeholder tracks that clutter production albums
    return list
        .filter((item: any) => {
            const name = (item.title || item.name || '').toLowerCase();
            return !name.includes('trailer') && !name.includes('testing') && !name.includes('teaser');
        })
        .map(mapToSong);
}

export async function getArtistDetails(artistId: string): Promise<any> {
    const data = await fetchApi(`__call=artist.getArtistPageDetails&api_version=4&_format=json&ctx=wap6dot0&artistId=${artistId}`);
    return data;
}

export async function getArtistTopSongs(artistId: string, page: number = 1, limit: number = 10): Promise<JioSaavnSong[]> {
    const data = await fetchApi(`__call=artist.getArtistPageDetails&api_version=4&_format=json&ctx=wap6dot0&artistId=${artistId}&n=${limit}&p=${page}`);
    const songs = data.topSongs || [];
    return Array.isArray(songs) ? songs.map(mapToSong) : [];
}

export async function getArtistStation(artistId: string): Promise<JioSaavnSong[]> {
    try {
        console.log(`[ArtistRadio] Generating station for ${artistId}...`);

        // 1. Fetch Artist Details (Parallel: Details + Top Songs + Albums + Similar)
        const artist = await getArtistDetails(artistId);
        if (!artist) throw new Error("Artist not found");

        const topSongsRaw = artist.topSongs || [];
        const albumsRaw = artist.albums || [];
        const similarArtistsRaw = artist.similarArtists || [];

        // 2. Pool Generation

        // A. Target Artist Pools (High Familiarity)
        const topSongs = Array.isArray(topSongsRaw) ? topSongsRaw.map(mapToSong) : [];
        console.log(`[ArtistRadio] Found ${topSongs.length} top songs`);

        // B. Related Artist Pool (High Relevance)
        const relatedSongs: JioSaavnSong[] = [];
        if (similarArtistsRaw.length > 0) {
            // Take top 3 similar artists
            const targets = similarArtistsRaw.slice(0, 3);
            console.log(`[ArtistRadio] Fetching hits from: ${targets.map((a: any) => a.name).join(', ')}`);

            const promises = targets.map((a: any) => getArtistTopSongs(a.id, 1, 5)); // Fetch Top 5 from each
            const results = await Promise.all(promises);
            results.forEach(list => relatedSongs.push(...list));
        }
        console.log(`[ArtistRadio] Found ${relatedSongs.length} related songs`);

        // C. Deep Cuts Pool (Surprise Factor)
        const deepCuts: JioSaavnSong[] = [];
        if (albumsRaw.length > 0) {
            // Pick 2 random albums
            const randomAlbums = albumsRaw.sort(() => 0.5 - Math.random()).slice(0, 2);
            console.log(`[ArtistRadio] Digging deep into albums: ${randomAlbums.map((a: any) => a.name).join(', ')}`);

            const promises = randomAlbums.map((a: any) => getAlbumDetails(a.id));
            const results = await Promise.all(promises);
            results.forEach(list => {
                // Pick random 2 songs from each album to avoid spamming one album
                if (list.length > 0) deepCuts.push(...list.sort(() => 0.5 - Math.random()).slice(0, 2));
            });
        }
        console.log(`[ArtistRadio] Found ${deepCuts.length} deep cuts`);

        // 3. Mixing Logic (The Golden Ratio)
        // Target: 20 Songs -> 8 Top (40%), 8 Related (40%), 4 Deep (20%)

        const selectedTop = topSongs.slice(0, 8);
        const selectedRelated = relatedSongs.sort(() => 0.5 - Math.random()).slice(0, 8);
        const selectedDeep = deepCuts.sort(() => 0.5 - Math.random()).slice(0, 4);

        // Combine
        let station = [...selectedTop, ...selectedRelated, ...selectedDeep];

        // Ensure we have at least something
        if (station.length === 0) {
            console.warn("[ArtistRadio] Station generation failed (no tracks), falling back to simple station");
            return getStation(topSongs[0]?.id || "");
        }

        // Shuffle slightly but keep Top song first for instant gratification
        const firstSong = selectedTop[0] || station[0];
        const rest = station.filter(s => s.id !== firstSong.id).sort(() => 0.5 - Math.random());

        return [firstSong, ...rest];

    } catch (e) {
        console.error("[ArtistRadio] Algorithm Failed:", e);
        return [];
    }
}

// Helper for language normalization
function normalizeLanguage(language: string | undefined): string {
    return (language || 'english,hindi')
        .toLowerCase()
        .split(',')
        .filter(Boolean)
        .join(',');
}

// Helper to standardize image handling (handles string vs array API ambiguity)
function formatImage(image: any): { quality: string, link: string }[] {
    const qualities = ['500x500', '150x150', '50x50'];
    let baseImage = '';

    if (typeof image === 'string') {
        baseImage = image;
    } else if (Array.isArray(image) && image.length > 0) {
        // Find highest quality or just take the last one (usually highest)
        const highest = image.find((i: any) => i.quality === '500x500') || image[image.length - 1];
        baseImage = highest?.link || '';
    }

    if (!baseImage) return [];

    return qualities.map(q => ({
        quality: q,
        link: baseImage.replace(/150x150|50x50|500x500/g, q)
    }));
}

// Helper to map API response to JioSaavnSong
function mapToSong(item: any): JioSaavnSong {
    const title = item.title || item.name || item.song || `[Unknown]`;
    const encryptedUrl = item.more_info?.encrypted_media_url || item.encrypted_media_url || "";

    return {
        id: item.id,
        name: title,
        type: item.type || 'song', // Default to song as safeguard
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
        primaryArtistsId: item.more_info?.artistMap?.primary_artists?.map((a: any) => a.id).join(', ') || item.primary_artists_id || '',
        featuredArtists: '',
        explicitContent: item.explicit_content,
        playCount: parseInt(item.play_count || '0'),
        language: item.language,
        hasLyrics: item.more_info?.has_lyrics,
        url: item.perma_url,
        copyright: item.more_info?.copyright_text || '',
        image: formatImage(item.image),
        downloadUrl: [],
        encryptedMediaUrl: encryptedUrl
    };
}

// Enhanced Lyrics Fetcher
export async function getSyncedLyrics(song: JioSaavnSong): Promise<{ synced: boolean, text: string }> {
    const trackName = song.name;
    const artistName = song.primaryArtists;
    const albumName = song.album?.name || "";
    const duration = song.duration;

    // CLEANING LOGIC (Inspired by SuvMusic/TheMusicApp)
    const cleanString = (str: string) => {
        return str
            .replace(/\s*\(.*?\)\s*/g, " ")
            .replace(/\s*\[.*?\]\s*/g, " ")
            .replace(/\s*-\s*.*$/g, "")
            .replace(/[^\w\s\u00C0-\u00FF'-]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };

    const cleanTrackName = cleanString(trackName);
    const cleanArtistName = artistName.split(',')[0].trim();

    console.log(`[Lyrics] Fetching for: "${cleanTrackName}" by "${cleanArtistName}"`);

    // --- PARALLEL FETCHING STRATEGY ---
    const searchTerms = [cleanTrackName];
    // If original is different, try it as fallback (e.g. for Japanese/Complex titles)
    if (cleanTrackName !== trackName) searchTerms.push(trackName);

    // Define Fetchers (now accepting term argument cleanly)
    const fetchLrcLib = async (term: string) => {
        try {
            const query = `track_name=${encodeURIComponent(term)}&artist_name=${encodeURIComponent(cleanArtistName)}&duration=${duration}`;
            const res = await fetch(`https://lrclib.net/api/get?${query}`);
            if (res.ok) {
                const data = await res.json();
                if (data.syncedLyrics) return { source: 'lrclib', type: 'synced', text: data.syncedLyrics };
                if (data.plainLyrics) return { source: 'lrclib', type: 'plain', text: data.plainLyrics };
            }
            // Search Fallback
            const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(term + " " + cleanArtistName)}`);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (Array.isArray(searchData) && searchData.length > 0) {
                    const best = searchData.sort((a: any, b: any) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))[0];
                    if (Math.abs(best.duration - duration) < 15) {
                        if (best.syncedLyrics) return { source: 'lrclib', type: 'synced', text: best.syncedLyrics };
                        if (best.plainLyrics) return { source: 'lrclib', type: 'plain', text: best.plainLyrics };
                    }
                }
            }
        } catch (e) { /* Quiet fail */ }
        return null; // Return null if nothing useful found
    };

    const fetchMusixmatch = async (term: string) => {
        try {
            const mxRes = await musixmatch.getSyncedLyrics(term, cleanArtistName, duration);
            if (mxRes) return { source: 'musixmatch', type: mxRes.synced ? 'synced' : 'plain', text: mxRes.text };
        } catch (e) { /* Quiet fail */ }
        return null;
    };

    // --- "RACE TO SYNCED" LOGIC ---
    // We launch ALL requests at once. The moment ANY source returns SYNCED lyrics, we abort/return immediately.
    // If no synced found after all finish, we return the best Plain lyrics.

    const allPromises = searchTerms.flatMap(term => [
        fetchLrcLib(term),
        fetchMusixmatch(term)
    ]);

    let bestPlain: { synced: boolean, text: string } | null = null;

    // We wrap promises to ensure they don't reject (already handled inside, but extra safety)
    const safePromises = allPromises.map(p => p.catch(() => null));

    // Custom Race Loop
    const results = await Promise.all(safePromises);

    // Prioritize Synced
    for (const res of results) {
        if (res?.type === 'synced') return { synced: true, text: res.text };
        if (res?.type === 'plain' && !bestPlain) bestPlain = { synced: false, text: res.text };
    }

    if (bestPlain) return bestPlain;

    // 4. Fallback: JioSaavn Native
    try {
        const nativeAmt = await getLyrics(song.id);
        if (nativeAmt && nativeAmt.trim().length > 0) {
            return { synced: false, text: nativeAmt };
        }
    } catch (e) {
        // Quiet fail
    }

    return { synced: false, text: "" };
}
