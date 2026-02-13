/**
 * Shared utility helpers for the app.
 * These were extracted from UI components to keep lib/ free of circular deps.
 */

/**
 * Deterministic Art Fetcher.
 * Extracts the highest quality album art URL from a JioSaavn item.
 * @param item  Any object with image/coverArt/art fields
 * @param quality  Preferred image quality (default: '500x500')
 */
export function getArt(item: any, quality: '500x500' | '150x150' = '500x500'): string {
    if (!item) return '';

    // Direct image array (most common)
    if (item.image && Array.isArray(item.image)) {
        // Prefer requested quality, then fall back to last (highest res)
        const best = item.image.find((img: any) => img.quality === quality)
            || item.image[item.image.length - 1];
        return best?.link || best?.url || '';
    }

    // Direct image string
    if (typeof item.image === 'string') {
        return item.image;
    }

    // Fallback: coverArt field (HiFi format)
    if (item.coverArt) {
        return item.coverArt;
    }

    // Fallback: art field (some components)
    if (item.art) {
        return item.art;
    }

    return '';
}

/**
 * SSR-Safe HTML Decoder.
 * Decodes HTML entities in strings (e.g., &amp; -> &).
 */
export function decodeHtml(html: string): string {
    if (typeof window === 'undefined') {
        // SSR fallback
        return html
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#39;/g, "'");
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/**
 * Duration Formatter.
 * Converts seconds to MM:SS format.
 */
export function formatDuration(seconds: number | string | undefined): string {
    const s = typeof seconds === 'string' ? parseInt(seconds) : seconds;
    if (!s || isNaN(s)) return '';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Human-Readable Duration Formatter.
 * Converts total seconds to "X hr Y min" or "X min" format.
 */
export function formatDurationHuman(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds)) return '';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    return `${mins} min`;
}

/**
 * Fisher-Yates Shuffle.
 * Returns a new array with elements in random order. Unbiased.
 */
export function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Get art URL from a PlayableTrack-shaped object.
 * Handles both raw JioSaavn items and wrapped PlayableTrack { song: ... } shapes.
 */
export function getArtFromTrack(item: any): string {
    if (!item) return '';
    // PlayableTrack wrapper: { song: { image: ... }, art: '...' }
    if (item.song) return getArt(item.song) || item.art || '';
    // Direct item
    return getArt(item);
}

/**
 * Identity Normalizer for track matching.
 * Creates a consistent identity string for deduplication.
 */
export function normalizeTrackIdentity(title: string, artist: string): string {
    const cleanTitle = (title || '')
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheticals
        .replace(/[^a-z0-9]/g, '');

    const cleanArtist = (artist || '')
        .toLowerCase()
        .split(/[,&]/)[0] // Primary artist only
        .replace(/[^a-z0-9]/g, '');

    return `${cleanTitle}|${cleanArtist}`;
}
