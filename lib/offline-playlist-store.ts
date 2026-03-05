import { JioSaavnSong } from './jiosaavn';
import { safeSetItem } from './safe-storage';

export interface OfflinePlaylist {
    id: string;
    name: string;
    description?: string;
    songs: JioSaavnSong[]; // Storing basic metadata, blob comes from OfflineStore when played
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'melora_offline_playlists';

class OfflinePlaylistDB {
    private getAll(): OfflinePlaylist[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    private saveAll(playlists: OfflinePlaylist[]) {
        if (typeof window === 'undefined') return;
        const success = safeSetItem(STORAGE_KEY, JSON.stringify(playlists));
        if (!success) {
            console.error('[OfflinePlaylistStore] Failed to save — storage full');
        }
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('melora-offline-playlists-update'));
    }

    /** Get all playlists */
    getPlaylists(): OfflinePlaylist[] {
        return this.getAll();
    }

    /** Get a single playlist by ID */
    getPlaylist(id: string): OfflinePlaylist | undefined {
        return this.getAll().find(p => p.id === id);
    }

    /** Create a new playlist */
    createPlaylist(name: string, description?: string): OfflinePlaylist {
        const playlists = this.getAll();
        const newPlaylist: OfflinePlaylist = {
            id: `offline-playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            description,
            songs: [],
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

    /** Add a song to a playlist */
    addSong(playlistId: string, song: JioSaavnSong) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            // Prevent duplicates in offline playlist
            if (!playlist.songs.find(s => s.id === song.id)) {
                playlist.songs.push(song);
                playlist.updatedAt = Date.now();
                this.saveAll(playlists);
            }
        }
    }

    /** Remove a song from a playlist */
    removeSong(playlistId: string, songId: string) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.songs = playlist.songs.filter(t => t.id !== songId);
            playlist.updatedAt = Date.now();
            this.saveAll(playlists);
        }
    }

    /** Clear all songs from a playlist */
    clearPlaylist(playlistId: string) {
        const playlists = this.getAll();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.songs = [];
            playlist.updatedAt = Date.now();
            this.saveAll(playlists);
        }
    }
}

export const OfflinePlaylistStore = new OfflinePlaylistDB();
