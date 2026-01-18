import { decodeHtml } from "./utils";

export interface SkipSegment {
    segment: [number, number]; // [start, end]
    UUID: string;
    category: 'sponsor' | 'intro' | 'outro' | 'interaction' | 'selfpromo' | 'music_offtopic';
    videoDuration: number;
    actionType: 'skip' | 'mute';
}

const SPONSOR_BLOCK_API = 'https://sponsor.ajay.app/api/skipSegments';
const CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'music_offtopic'];

export async function getSkipSegments(videoId: string): Promise<SkipSegment[]> {
    if (!videoId || videoId.length !== 11) return [];

    try {
        const url = new URL(SPONSOR_BLOCK_API);
        url.searchParams.append('videoID', videoId);
        CATEGORIES.forEach(cat => url.searchParams.append('category', cat));
        url.searchParams.append('actionType', 'skip');

        const res = await fetch(url.toString());

        if (res.status === 404) return []; // No segments found
        if (!res.ok) throw new Error(`SponsorBlock Error: ${res.status}`);

        const data = await res.json();
        return data as SkipSegment[];
    } catch (error) {
        // console.warn("SponsorBlock fetch failed:", error);
        return [];
    }
}
