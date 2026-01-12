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

const DES_KEY = '38346591';

export async function searchSongs(query: string): Promise<JioSaavnSong[]> {
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data: SearchResponse = await response.json();

        if (data.results) {
            // V4 API returns results in 'results' key.
            const list = Array.isArray(data.results) ? data.results : [];
            if (list.length > 0) console.log("Search Result Item Sample:", list[0]);

            return list.map((item: any) => {
                // V4 API Field Mapping
                // DEBUG: If title is missing, show available keys to diagnose
                const title = item.title || item.name || item.song || `[DEBUG_KEYS: ${Object.keys(item).join(',')}]`;
                const encryptedUrl = item.more_info?.encrypted_media_url || item.encrypted_media_url || "";

                if (!encryptedUrl) {
                    console.warn("Missing Encrypted Media URL for:", title, item);
                }

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
            }).sort((a: any, b: any) => {
                const yearA = parseInt(a.year || '0');
                const yearB = parseInt(b.year || '0');
                return yearB - yearA;
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

export function getHighQualityUrl(song: JioSaavnSong): string {
    if (!song.encryptedMediaUrl) {
        console.warn("No encrypted media URL found for song:", song.name);
        return '';
    }

    try {
        const decryptedUrl = decryptUrl(song.encryptedMediaUrl);
        // Force 320kbps by replacing various quality suffixes
        return decryptedUrl.replace(/_(160|96|48|12)\./g, '_320.');
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
        const response = await fetch(`/api/lyrics?id=${songId}`);
        const data = await response.json();

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
        const response = await fetch(`/api/song?id=${songId}`);
        const data = await response.json();

        // JioSaavn returns an object where keys are IDs, or sometimes a list
        // We need to handle the specific format for song.getDetails
        const songData = data[songId];

        if (songData) {
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
