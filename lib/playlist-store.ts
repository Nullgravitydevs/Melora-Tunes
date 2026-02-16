import { PlayableTrack } from './types';
import { safeSetItem } from './safe-storage';

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    tracks: PlayableTrack[];
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'melora_playlists';

class PlaylistDB {
    private getAll(): Playlist[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    private saveAll(playlists: Playlist[]) {
        if (typeof window === 'undefined') return;
        const success = safeSetItem(STORAGE_KEY, JSON.stringify(playlists));
        if (!success) {
            console.error('[PlaylistStore] Failed to save — storage full');
        }
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('melora-playlists-update'));
    }

    /** Get all playlists */
    getPlaylists(): Playlist[] {
        return this.getAll();
    }

    /** Get a single playlist by ID */
    getPlaylist(id: string): Playlist | undefined {
        return this.getAll().find(p => p.id === id);
    }

    /** Create a new playlist */
    createPlaylist(name: string, description?: string): Playlist {
        const playlists = this.getAll();
        const newPlaylist: Playlist = {
            id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            description,
            tracks: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        playlists.push(newPlaylist);
        this.saveAll(playlists);
        return newPlaylist;
    }

    /** Delete a playlist */
    deletePlaylist(id: string) {
        const playlists = this.getAll().filter(p => p.id !== id);
        this.saveAll(playlists);
    }

    /** Rename a playlist */
    renamePlaylist(id: string, name: string) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === id);
        if (playlist) {
            playlist.name = name;
            playlist.updatedAt = Date.now();
            this.saveAll(playlists);
        }
    }

    /** Add a track to a playlist */
    addTrack(playlistId: string, track: PlayableTrack) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            if (playlist) {
                // Allow duplicates - User requested feature
                playlist.tracks.push(track);
                playlist.updatedAt = Date.now();
                this.saveAll(playlists);
            }
        }
    }

    /** Remove a track from a playlist */
    removeTrack(playlistId: string, trackId: string) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
            playlist.updatedAt = Date.now();
            this.saveAll(playlists);
        }
    }

    /** Clear all tracks from a playlist */
    clearPlaylist(playlistId: string) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.tracks = [];
            playlist.updatedAt = Date.now();
            this.saveAll(playlists);
        }
    }
}

export const PlaylistStore = new PlaylistDB();
