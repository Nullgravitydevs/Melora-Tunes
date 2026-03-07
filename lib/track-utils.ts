
import { AudioQuality, PlayableTrack, isPlayableTrack } from "@/lib/types";
import { JioSaavnSong } from "@/lib/jiosaavn";

/**
 * Clean and normalize a song title for semantic comparison.
 * Removes common trailing junk like "- Telugu", "(From Movie)", etc.
 * Examples:
 * "Sahana Sahana (From The Rajasaab) - Telugu" -> "sahana sahana"
 * "Chuttamalle" -> "chuttamalle"
 */
export function normalizeSongTitle(title: string): string {
    if (!title) return '';

    let cleaned = title.toLowerCase().trim();

    // 1. Remove anything after a hyphen if it looks like a language or version tag
    // e.g. "Song Name - Telugu", "Song Name - Lofi Flip"
    const dashIndex = cleaned.lastIndexOf('-');
    if (dashIndex > 0) {
        cleaned = cleaned.substring(0, dashIndex).trim();
    }

    // 2. Remove parenthetical phrases at the end (often movies or features)
    // e.g. "Song Name (From Movie)", "Song Name (feat. Artist)"
    cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/g, '').trim();

    // 3. Remove bracket phrases at the end
    cleaned = cleaned.replace(/\s*\[[^\]]+\]\s*$/g, '').trim();

    return cleaned;
}

/**
 * Clean and normalize artist name for comparison.
 * "Thaman S, Shreya Ghoshal" → "thaman s"
 */
export function cleanArtistName(raw: string): string {
    if (!raw) return '';
    return raw
        .split(/[,&;|-]/)[0]        // First artist only
        .replace(/\(.*?\)/g, '')    // Remove parentheses
        .trim()
        .toLowerCase();
}

/**
 * Check if two raw artist strings have any overlapping artists.
 * Used for semantic deduplication (e.g. duet flips).
 */
export function checkArtistOverlap(raw1: string, raw2: string): boolean {
    if (!raw1 || !raw2) return false;
    const list1 = raw1.toLowerCase().split(/[,&;|-]/).map(s => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
    const list2 = raw2.toLowerCase().split(/[,&;|-]/).map(s => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
    return list1.some(a => list2.includes(a));
}

/**
 * Deduplicate an array of tracks (PlayableTrack or JioSaavnSong) semantically.
 * Keeps the FIRST occurrence of a track and removes subsequent semantic duplicates.
 */
export function deduplicateQueue<T>(tracks: T[]): T[] {
    const unique: T[] = [];

    for (const track of tracks) {
        const tAny = track as any;
        // Extract inner song object safely
        const innerSong = tAny?.song || tAny;

        const title = normalizeSongTitle(tAny.title || innerSong?.name || innerSong?.title || '');
        const artist = innerSong?.primaryArtists || tAny.artist || '';

        // To deduplicate efficiently, we check against already added unique tracks.
        const isDuplicate = unique.some(existing => {
            const eAny = existing as any;
            const eInner = eAny?.song || eAny;
            const eTitle = normalizeSongTitle(eAny.title || eInner?.name || eInner?.title || '');
            if (eTitle !== title) return false;

            const eArtist = eInner?.primaryArtists || eAny.artist || '';
            return checkArtistOverlap(eArtist, artist);
        });

        if (!isDuplicate) {
            unique.push(track);
        }
    }
    return unique;
}

export function ensurePlayableTrack(song: any, defaultQuality: AudioQuality = '320'): PlayableTrack {
    // 1. If it's explicitly a PlayableTrack (Strict Check)
    if (isPlayableTrack(song)) {
        // [FIX] Enforce inheritance: If we are asking for a specific quality context (e.g. Discovery),
        // we should override the track's default preference.
        return {
            ...song,
            preferredQuality: defaultQuality
        };
    }

    // 2. ROBUST RECOVERY: Check for "soft" PlayableTrack (missing strict props or prototype issues)
    // If it has 'preferredQuality' and 'sources', treat it as valid even if 'title' check failed.
    if (song && song.preferredQuality && Array.isArray(song.sources)) {
        return song as PlayableTrack;
    }

    // 3. Convert Legacy/Raw Object (JioSaavnSong or malformed)
    // Robust extraction: Handle .name vs .title mismatch
    const title = song.title || song.name || 'Unknown Track';
    const artist = song.artist || song.primaryArtists || 'Unknown Artist';
    const duration = typeof song.duration === 'string' ? parseInt(song.duration) : (song.duration || 0);

    // Resolve Art
    let art = song.art || '';
    if (!art && song.image) {
        if (typeof song.image === 'string') art = song.image;
        else if (Array.isArray(song.image)) {
            art = song.image.find((i: any) => i.quality === '500x500')?.link || song.image[0]?.link || '';
        }
    }

    // ROBUST ID GENERATION
    // If it already has a compound ID (e.g. from OfflineStore), use it. 
    // Otherwise, bind it to the source provider to prevent collision.
    const sourceProvider = (song as any).source || 'jiosaavn';
    let stableId = (song as any).stableId || String(song.id);

    // Don't append provider suffix if it's an Audiophile/Apple Music ID or already has one
    if (!stableId.includes(':') && !stableId.startsWith('am_')) {
        stableId = `${stableId}:${sourceProvider}`;
    }

    return {
        id: stableId,
        title: title,
        artist: artist,
        duration: duration,
        art: art,
        original: song,
        song: song.song || song, // Preserve nested song if it exists

        // If 'preferredQuality' exists on input, KEEP IT! Don't downgrade.
        preferredQuality: song.preferredQuality || defaultQuality,

        sources: song.sources || (() => {
            const inferred = (song.sources && song.sources[0]?.provider) || song.source || 'jiosaavn';
            if (inferred === 'jiosaavn') {
                return [
                    { provider: 'jiosaavn', songId: song.id, quality: '320' },
                    { provider: 'jiosaavn', songId: song.id, quality: '160' },
                    { provider: 'jiosaavn', songId: song.id, quality: '96' }
                ];
            }
            return [];
        })()
    };
}
