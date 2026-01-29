/**
 * Shared utility helpers for the app.
 * These were extracted from UI components to keep lib/ free of circular deps.
 */

/**
 * Deterministic Art Fetcher.
 * Extracts the highest quality album art URL from a JioSaavn item.
 */
export function getArt(item: any): string {
    if (!item) return '';

    // Direct image array (most common)
    if (item.image && Array.isArray(item.image)) {
        // Find highest quality (500x500 or last item usually)
        const best = item.image.find((img: any) =>
            img.quality === '500x500' || img.quality === '150x150'
        ) || item.image[item.image.length - 1];
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
export function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
