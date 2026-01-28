
import { AudioQuality, PlayableTrack, isPlayableTrack } from "@/lib/types";
import { JioSaavnSong } from "@/lib/jiosaavn";

// Upgrade helper
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
    const stableId = (song as any).stableId || (String(song.id).includes(':') ? song.id : `${song.id}:${sourceProvider}`);

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
