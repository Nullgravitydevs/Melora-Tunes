
import { JioSaavnSong } from "@/lib/jiosaavn";

// --- Audio Quality Abstraction ---
export type AudioQuality = 'hires' | 'flac' | '320' | '160' | '96';

export interface PlayableSource {
    provider: 'jiosaavn' | 'ytmusic' | 'tidal' | 'qobuz';
    songId: string;
    quality: AudioQuality;
}

export interface PlayableTrack {
    id: string; // Helper for easy access, matches song.id
    song: JioSaavnSong; // Metadata
    sources: PlayableSource[];
    preferredQuality: AudioQuality;
    isExplicitPreference?: boolean; // If true, overrides global 'Force Lossless'
}

// Helper to check if an object is likely a PlayableTrack (duck typing)
export function isPlayableTrack(obj: any): obj is PlayableTrack {
    return obj && typeof obj === 'object' && 'sources' in obj && 'song' in obj;
}
