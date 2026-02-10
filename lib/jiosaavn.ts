import { Capacitor, CapacitorHttp } from '@capacitor/core';
import CryptoJS from 'crypto-js';
import { musixmatch } from '@/lib/musixmatch';
import { decodeHtml } from './utils';
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

export interface LaunchData {
    new_trending: JioSaavnSong[];
    top_playlists: JioSaavnSong[];
    new_albums: JioSaavnSong[];
    browse_discover: JioSaavnSong[];
    charts: JioSaavnSong[];
    radio: JioSaavnSong[];
    artist_recos: JioSaavnSong[];
    quick_picks: JioSaavnSong[]; // NEW: Quick Picks
    // NEW SECTIONS
    moods: {
        love: JioSaavnSong[];
        party: JioSaavnSong[];
        workout: JioSaavnSong[];
        chill: JioSaavnSong[];
    };
    retro: JioSaavnSong[];
    top_charts: JioSaavnSong[];
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
                const title = item.title || item.name || item.listname || item.more_info?.firstname || `[Unknown Playlist]`;
                return {
                    id: item.id || item.listid,
                    name: decodeHtml(title),
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

export async function searchArtists(query: string, page: number = 1, limit: number = 10, language?: string): Promise<any[]> {
    try {
        const lang = normalizeLanguage(language);
        console.log(`[Search Artists] Query: "${query}"`);
        let data: any;
        const params = `__call=search.getArtistResults&_format=json&n=${limit}&p=${page}&q=${encodeURIComponent(query)}&ctx=wap6dot0&languages=${lang}`;

        if (Capacitor.isNativePlatform()) {
            const apiUrl = `https://www.jiosaavn.com/api.php?${params}`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?${params}`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            data = await fetchApi(params, true);
        }

        let list = [];
        if (data.results) {
            list = Array.isArray(data.results) ? data.results : [];
        }

        if (list.length > 0) {
            return list.map((item: any) => ({
                id: item.id || item.artistId,
                name: decodeHtml(item.name || item.title),
                type: 'artist',
                image: formatImage(item.image),
                url: item.perma_url,
                role: item.role
            }));
        }
        return [];
    } catch (e) {
        console.error("Error searching artists", e);
        return [];
    }
}

/**
 * Fetch Full Artist Details including Top Songs, Albums, and Bio
 */
export async function getArtistDetails(artistId: string, page: number = 1): Promise<any> {
    try {
        console.log(`[ArtistDetails] Fetching ID: ${artistId}`);
        const params = `__call=artist.getDetails&_format=json&artistId=${artistId}&ctx=wap6dot0&n_song=20&n_album=20&p=${page}`;

        let data: any;
        if (Capacitor.isNativePlatform() || isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?${params}`;
            if (Capacitor.isNativePlatform()) {
                const response = await CapacitorHttp.get({ url: apiUrl });
                data = response.data;
            } else {
                const response = await fetch(apiUrl);
                data = await response.json();
            }
        } else {
            data = await fetchApi(params, true);
        }

        if (!data) return null;

        return {
            id: data.artistId || data.id,
            name: decodeHtml(data.name),
            subtitle: decodeHtml(data.subtitle),
            image: formatImage(data.image),
            followerCount: data.follower_count,
            isVerified: data.is_verified || data.verified || true, // Most JioSaavn artists are verified
            bio: data.bio ? JSON.parse(data.bio) : [], // Bio is often a JSON array of blocks
            topSongs: (data.topSongs || []).map(mapToSong),
            topAlbums: (data.topAlbums || []).map(mapToSong), // Re-use mapToSong for layout stability
            similarArtists: (data.similarArtists || []).map((a: any) => ({
                id: a.id || a.artistId,
                name: decodeHtml(a.name),
                image: formatImage(a.image)
            }))
        };
    } catch (e) {
        console.error("Error fetching artist details", e);
        return null;
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
        const targetBitrate = bitrate;

        if (targetBitrate === 'flac') {
            return decryptedUrl.replace(/_(320|160|96|48|12)\.(mp4|m4a)/g, '_flac.flac');
        }
        return decryptedUrl.replace(/_(320|160|96|48|12)\./g, `_${targetBitrate}.`);
    } catch (e) {
        console.warn('Failed to decrypt URL for song:', song.name, e);
        return '';
    }
}

export function getThumbnailUrl(song: JioSaavnSong): string {
    if (!song || !song.image) return '';
    if (typeof song.image === 'string') return song.image;
    if (!Array.isArray(song.image)) return '';

    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
        const match = song.image.find(i => i && i.quality === quality);
        if (match && match.link) return match.link;
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
            return data.lyrics.replace(/<br\s*\/?>/gi, '\n');
        }
        return null;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return null;
    }
}

export async function getLyricsWithFallback(song: JioSaavnSong): Promise<string | null> {
    const jiosaavnLyrics = await getLyrics(song.id);
    if (jiosaavnLyrics && jiosaavnLyrics.trim().length > 0) {
        return jiosaavnLyrics;
    }

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
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&pids=${songId}&ctx=wap6dot0`;
            const response = await CapacitorHttp.get({ url: apiUrl });
            data = response.data;
        } else if (isElectron) {
            const apiUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&pids=${songId}&ctx=wap6dot0`;
            const response = await fetch(apiUrl);
            data = await response.json();
        } else {
            const response = await fetch(`/api/song?id=${songId}`);
            data = await response.json();
        }

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

export async function getAlbumDetails(albumId: string): Promise<any> {
    try {
        const params = `__call=content.getAlbumDetails&_format=json&albumid=${albumId}&ctx=wap6dot0`;
        const data = await fetchApi(params, true);

        if (data && data.songs) {
            return {
                ...data,
                songs: data.songs.map(mapToSong)
            };
        }
        if (Array.isArray(data)) return data.map(mapToSong);
        return data;
    } catch (e) {
        console.error("Error fetching album details", e);
        return null;
    }
}

export async function getPlaylistDetails(listId: string): Promise<JioSaavnSong[]> {
    try {
        // Direct API call for robustness
        // Note: search results give us 'id' which is 'listid'
        const params = `__call=playlist.getDetails&_format=json&listid=${listId}&ctx=wap6dot0`;
        const data = await fetchApi(params, true);

        if (data && data.songs) {
            return data.songs.map(mapToSong);
        }
        if (data && data.list) return data.list.map(mapToSong);

        return [];
    } catch (e) {
        console.error("Error fetching playlist details", e);
        return [];
    }
}

export async function getRadioSongs(stationId: string): Promise<JioSaavnSong[]> {
    // Simplifying radio fetch
    const params = `__call=webradio.getSong&_format=json&stationid=${stationId}&k=20&p=1&ctx=wap6dot0`;
    const data = await fetchApi(params, false); // Don't cache radio
    if (data && data[stationId]) {
        return data[stationId].map(mapToSong);
    }
    return [];
}

// --- CACHE IMPLEMENTATION ---
const CACHE_DURATION = 1000 * 60 * 15; // 15 Minutes
const CACHE_KEY_PREFIX = 'melora_cache_';
interface CacheEntry { timestamp: number; data: any; }
class ApiCache {
    private memoryCache = new Map<string, CacheEntry>();
    get(key: string): any | null {
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key)!;
            if (Date.now() - entry.timestamp < CACHE_DURATION) return entry.data;
            this.memoryCache.delete(key);
        }
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(CACHE_KEY_PREFIX + key);
                if (stored) {
                    const entry: CacheEntry = JSON.parse(stored);
                    if (Date.now() - entry.timestamp < CACHE_DURATION) {
                        this.memoryCache.set(key, entry);
                        if (entry.data?.length === 0) return null;
                        return entry.data;
                    }
                    localStorage.removeItem(CACHE_KEY_PREFIX + key);
                }
            } catch (e) { }
        }
        return null;
    }
    set(key: string, data: any) {
        if (!data || (Array.isArray(data) && data.length === 0)) return;
        const entry: CacheEntry = { timestamp: Date.now(), data };
        this.memoryCache.set(key, entry);
        if (typeof window !== 'undefined') {
            try { localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry)); } catch (e) { }
        }
    }
}
export const apiCache = new ApiCache();

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
            const url = `/api/proxy?${urlStr}`;
            const res = await fetch(url);
            if (res.status === 429) {
                if (typeof window !== 'undefined') {
                    const stored = localStorage.getItem(CACHE_KEY_PREFIX + params);
                    if (stored) return JSON.parse(stored).data;
                }
                throw new Error("429 Rate Limit");
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            resData = await res.json();
        }
        if (useCache && resData) apiCache.set(params, resData);
        return resData;
    } catch (e) {
        console.error("API Fetch Error:", e);
        return null;
    }
}

// Deprecated: Legacy getLaunchData, mapped to strict for compatibility but we prefer explicit usage
export async function getLaunchData(language?: string): Promise<LaunchData> {
    return getStrictLaunchData(language);
}

// Mobile Compatibility Wrappers
export async function getTopCharts(language?: string): Promise<JioSaavnSong[]> {
    try {
        const lang = normalizeLanguage(language);
        const primaryLang = lang.split(',')[0].trim().toLowerCase();
        return await searchPlaylists(`${primaryLang} Top 50`, 1, 10, lang);
    } catch (e) {
        return [];
    }
}

export async function getTrending(language?: string): Promise<JioSaavnSong[]> {
    return getStrictLanguageTrending(language || 'english');
}

export async function getNewReleases(limit: number = 10, language?: string): Promise<JioSaavnSong[]> {
    const data = await getStrictLanguageAlbums(language || 'english');
    return data.slice(0, limit);
}

export async function getSyncedLyrics(song: JioSaavnSong): Promise<{ synced: boolean; text: string | null }> {
    try {
        const text = await getLyricsWithFallback(song);
        if (!text) return { synced: false, text: null };

        // Check if it looks like LRC
        const isSynced = /\[\d{2}:\d{2}\.\d{2,3}\]/.test(text);
        return { synced: isSynced, text };
    } catch (e) {
        return { synced: false, text: null };
    }
}

// Fallback logic helpers... (Kept implicitly if needed but cleaning up exports)

// --- STRICT SEARCH-BASED IMPLEMENTATION ---

async function getStrictLanguageTrending(lang: string): Promise<JioSaavnSong[]> {
    try {
        const primaryLang = lang.split(',')[0].trim().toLowerCase();
        const queries: Record<string, string> = {
            telugu: "telugu hits",
            tamil: "tamil hits",
            hindi: "bollywood hits",
            malayalam: "malayalam hits",
            kannada: "kannada hits",
            english: "global top hits",
            punjabi: "punjabi hits",
            marathi: "marathi hits",
            bhojpuri: "bhojpuri hits",
            gujarati: "gujarati hits",
            bengali: "bengali hits",
            rajasthani: "rajasthani hits",
        };
        const q = queries[primaryLang] || `${primaryLang} hits`;
        const results = await searchSongs(q, 1, 26, primaryLang);
        if (primaryLang === 'english') return results;
        return results.filter(s => {
            const l = (s.language || '').toLowerCase();
            return l.includes(primaryLang);
        });
    } catch (e) {
        return [];
    }
}

async function getStrictLanguageAlbums(lang: string): Promise<JioSaavnSong[]> {
    try {
        const primaryLang = lang.split(',')[0].trim().toLowerCase();
        const currentYear = new Date().getFullYear();

        // Strategy: Search for "Year" specifically first
        let q = `${primaryLang} ${currentYear} albums`;
        // Fetch a larger pool to filter
        let results = await searchAlbums(q, 1, 50, primaryLang);

        // If results are sparse, fallback to generic "new albums" but strict filter later
        if (results.length < 10) {
            const fallbackQ = `${primaryLang} new albums`;
            const fallbackResults = await searchAlbums(fallbackQ, 1, 50, primaryLang);
            results = [...results, ...fallbackResults];
            // Deduplicate by ID
            const seen = new Set();
            results = results.filter(item => {
                const duplicate = seen.has(item.id);
                seen.add(item.id);
                return !duplicate;
            });
        }

        // Filtering: Must be strictly from currentYear or (currentYear - 1)
        const filtered = results.filter(s => {
            const albumYear = parseInt(s.year || "0");
            const isFresh = albumYear >= (currentYear - 1); // Allow last year essentially (for early new year context)

            if (primaryLang === 'english') return isFresh;
            const l = (s.language || '').toLowerCase();
            return l.includes(primaryLang) && isFresh;
        });

        // Sort descending by Year -> then by ID (pseudo-random/time)
        return filtered.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    } catch (e) {
        console.error("Error getting strict albums:", e);
        return [];
    }
}

export async function getStrictLaunchData(language?: string): Promise<LaunchData> {
    try {
        const lang = normalizeLanguage(language);
        const primaryLang = lang.split(',')[0].trim().toLowerCase();
        const displayLang = primaryLang.charAt(0).toUpperCase() + primaryLang.slice(1);
        console.log('[getLaunchData] Fetching Ultimate Content for:', lang);

        // EXPANDED PARALLEL FETCHING
        // We use Promise.all to execute refined searches for every section.
        // This guarantees data presence and language relevance unlike the legacy launch API.

        const [
            // 1. Trending & Albums (Existing)
            trending,
            albums,
            // 2. Moods (Existing)
            moodLove, moodParty, moodWorkout, moodChill,
            // 3. Retro (Existing)
            retro,
            // 4. Charts (Existing)
            charts,
            // 5. NEW: Quick Picks (Radio Proxy replaced with Songs)
            quickPicks,
            // 6. NEW: Language Playlists (Best of...)
            langPlaylists
        ] = await Promise.all([
            getStrictLanguageTrending(lang),
            getStrictLanguageAlbums(lang),
            // Moods
            searchPlaylists(`${primaryLang} Love Songs`, 1, 5, lang),
            searchPlaylists(`${primaryLang} Party`, 1, 5, lang),
            searchPlaylists(`${primaryLang} Workout`, 1, 5, lang),
            searchPlaylists(`${primaryLang} Chill`, 1, 5, lang),
            // Retro
            searchSongs(`${primaryLang} 90s hits`, 1, 15, lang),
            // Charts
            searchPlaylists(`${primaryLang} Top 50`, 1, 10, lang),
            // Quick Picks: Fetch songs for the "Quick Picks" section
            searchSongs(`${primaryLang} songs`, 1, 16, lang),
            // Language Playlists
            searchPlaylists(`Best of ${primaryLang}`, 1, 10, lang)
        ]);

        return {
            new_trending: trending,
            new_albums: albums,
            moods: {
                love: moodLove,
                party: moodParty,
                workout: moodWorkout,
                chill: moodChill,
            },
            retro: retro,
            top_charts: charts,

            // Search-based replacements for reliability
            top_playlists: langPlaylists.length > 0 ? langPlaylists : [],
            radio: [], // Deprecated in favor of quick_picks for now
            quick_picks: quickPicks.length > 0 ? quickPicks : [],

            // Legacy fallbacks (empty)
            browse_discover: [],
            charts: [],
            artist_recos: []
        };
    } catch (e) {
        console.error("Error fetching launch data", e);
        return {
            new_trending: [], top_playlists: [], new_albums: [], browse_discover: [], charts: [], radio: [], artist_recos: [], quick_picks: [],
            moods: { love: [], party: [], workout: [], chill: [] }, retro: [], top_charts: []
        };
    }
}

// --- HELPERS ---

export function normalizeLanguage(lang?: string | string[]): string {
    if (!lang) return 'english';
    if (Array.isArray(lang)) return lang.map(l => l.toLowerCase()).join(',');
    return lang.toLowerCase();
}

export function fixImageUrl(url: string, quality: string): string {
    if (!url) return '';
    if (url.includes('jioimages.cdn.jio.com')) return url; // Don't touch Jio cdn

    // Ensure https
    let finalUrl = url;
    if (finalUrl.startsWith('http://')) {
        finalUrl = finalUrl.replace('http://', 'https://');
    }

    // Generic replacement for saavncdn
    return finalUrl.replace(/150x150|50x50|500x500/g, quality);
}

export function formatImage(image: any): { quality: string; link: string }[] {
    if (!image) return [];

    // Find a base URL (prefer highest quality if array)
    let baseUrl = '';
    if (typeof image === 'string') {
        baseUrl = image;
    } else if (Array.isArray(image)) {
        // Try to find the best existing one to use as base
        const best = image.find((i: any) => i.quality === '500x500') || image[0];
        baseUrl = best?.link || best?.url || '';
    }

    if (!baseUrl) return [];

    // Generate strict qualities
    // This fixes "low quality" by forcing the URL pattern to match the requested size
    return [
        { quality: '500x500', link: fixImageUrl(baseUrl, '500x500') },
        { quality: '150x150', link: fixImageUrl(baseUrl, '150x150') },
        { quality: '50x50', link: fixImageUrl(baseUrl, '50x50') }
    ];
}

export function mapToSong(item: any): JioSaavnSong {
    const title = item.title || item.name || item.song || '[Unknown]';
    return {
        id: item.id || item.song_id || item.pid || '',
        name: decodeHtml(title),
        type: item.type || 'song',
        album: {
            id: item.albumid || item.album_id || '',
            name: decodeHtml(item.album || item.album_name || ''),
            url: item.album_url || ''
        },
        year: item.year || '',
        releaseDate: item.release_date || '',
        duration: parseInt(item.duration || '0'),
        label: item.label || '',
        primaryArtists: decodeHtml(item.primary_artists || item.more_info?.primary_artists || ''),
        primaryArtistsId: item.primary_artists_id || '',
        featuredArtists: decodeHtml(item.featured_artists || ''),
        explicitContent: item.explicit_content || 0,
        playCount: parseInt(item.play_count || '0'),
        language: item.language || '',
        hasLyrics: item.has_lyrics || 'false',
        url: item.perma_url || '',
        copyright: item.copyright_text || '',
        image: formatImage(item.image),
        downloadUrl: [],
        encryptedMediaUrl: item.encrypted_media_url || item.more_info?.encrypted_media_url || ''
    };
}
