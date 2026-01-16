import { JioSaavnSong } from "./jiosaavn";

export interface SongStats {
    id: string;
    name: string;
    artist: string;
    image: string;
    plays: number;
    lastPlayed: number;
}

export interface GlobalStats {
    totalPlays: number;
    totalTime: number; // in seconds
    topSongs: Record<string, SongStats>;
    topArtists: Record<string, number>;
}

const STORAGE_KEY = 'melora-stats-v1';

export function getStats(): GlobalStats {
    if (typeof window === 'undefined') return { totalPlays: 0, totalTime: 0, topSongs: {}, topArtists: {} };

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) { console.error(e); }

    return { totalPlays: 0, totalTime: 0, topSongs: {}, topArtists: {} };
}

export function recordPlay(song: JioSaavnSong, duration: number) {
    if (typeof window === 'undefined') return;

    const stats = getStats();
    stats.totalPlays += 1;
    stats.totalTime += duration;

    // Song Stats
    if (!stats.topSongs[song.id]) {
        stats.topSongs[song.id] = {
            id: song.id,
            name: song.name,
            artist: song.primaryArtists,
            image: song.image[1]?.link || '',
            plays: 0,
            lastPlayed: 0
        };
    }
    stats.topSongs[song.id].plays += 1;
    stats.topSongs[song.id].lastPlayed = Date.now();

    // Artist Stats
    // Split artists by comma or &
    const artists = song.primaryArtists.split(/,|&/).map(a => a.trim());
    artists.forEach(artist => {
        if (!stats.topArtists[artist]) stats.topArtists[artist] = 0;
        stats.topArtists[artist] += 1;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function getTopSongs(limit = 10): SongStats[] {
    const stats = getStats();
    return Object.values(stats.topSongs)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, limit);
}

export function getTopArtists(limit = 5): { name: string, plays: number }[] {
    const stats = getStats();
    return Object.entries(stats.topArtists)
        .map(([name, plays]) => ({ name, plays }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, limit);
}
