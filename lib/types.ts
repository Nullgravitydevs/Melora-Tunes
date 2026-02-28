
import { JioSaavnSong } from "@/lib/jiosaavn";

// --- Audio Quality Abstraction ---
export type AudioQuality = 'hires' | 'flac' | '320' | '160' | '96';
export type QualityFilterType = 'auto' | 'hires' | 'flac' | '320';

export interface PlayableSource {
    provider: 'jiosaavn' | 'ytmusic' | 'tidal' | 'qobuz';
    songId: string;
    quality: AudioQuality;
}

export interface PlayableTrack {
    id: string; // Helper for easy access, matches song.id

    // STRICT FLATTENED METADATA (User Requirement)
    title: string;
    artist: string;
    duration: number;
    art: string;

    // Optional Backward Compatibility / Raw Source
    song?: JioSaavnSong;
    original?: any; // The raw object keys

    sources: PlayableSource[];
    preferredQuality: AudioQuality;
    isExplicitPreference?: boolean;
}

// Helper to check if an object is likely a PlayableTrack (duck typing)
export function isPlayableTrack(obj: any): obj is PlayableTrack {
    return obj && typeof obj === 'object' && 'sources' in obj && 'title' in obj;
}

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red" | "blue" | "cyan" | "pink" | "teal" | "yellow" | "black";
    songs: (JioSaavnSong | PlayableTrack)[];
    currentSongIndex: number;
    pinned?: boolean; // New: Sync with Deck
}
