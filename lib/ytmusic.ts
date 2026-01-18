
import { apiCache } from "./jiosaavn";

export interface YTMHomeSection {
    title: string;
    type: 'carousel' | 'immersive';
    items: YTMItem[];
}

export interface YTMItem {
    title: string;
    id: string;
    subtitle: string;
    image: string;
    type: 'song' | 'album' | 'playlist' | 'video';
}

export async function getYTMusicHome(): Promise<YTMHomeSection[]> {
    const CACHE_KEY = 'ytm_home_data';

    // Check Cache
    const cached = apiCache.get(CACHE_KEY);
    if (cached) return cached;

    try {
        const res = await fetch('/api/ytmusic?type=home');
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || res.statusText || 'Unknown Error';
            throw new Error(`Failed to fetch YTMS: ${res.status} ${msg}`);
        }

        const data = await res.json();
        if (data.success && data.sections) {
            apiCache.set(CACHE_KEY, data.sections);
            return data.sections;
        }
        return [];
    } catch (e) {
        console.error("YTMS Fetch Error", e);
        return [];
    }
}

export async function searchYTMusic(query: string): Promise<YTMHomeSection[]> {
    // No caching for search to keep real-time relevant
    if (!query) return [];

    try {
        const res = await fetch(`/api/ytmusic?type=search&q=${encodeURIComponent(query)}`);

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || res.statusText || 'Unknown Error';
            throw new Error(`Failed to fetch YTMS Search: ${res.status} ${msg}`);
        }

        const data = await res.json();
        if (data.success && data.results) {
            return data.results;
        }
        return [];

    } catch (e) {
        console.warn("YTMS Search Error", e);
        return [];
    }
}
