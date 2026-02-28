"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { JioSaavnSong } from '@/lib/jiosaavn';
import { PlayableTrack, isPlayableTrack, AudioQuality, Mix } from '@/lib/types';
import { ensurePlayableTrack } from '@/lib/track-utils';
import { loadSettings } from '@/lib/settings';
import { useUI } from './ui-context';
import { OfflineStore } from '@/lib/offline-store';
// For download song we need resolvePlayableUrl, which we'll import or pass down.
// For Phase 2, let's keep it clean.

export interface LibraryContextType {
    mixes: Mix[];
    setMixes: React.Dispatch<React.SetStateAction<Mix[]>>;
    addMix: (mix: Mix) => boolean;
    updateMix: (mixId: string, updates: Partial<Mix>) => void;
    deleteMix: (mixId: string) => void;
    undoDeleteMix: () => void;
    deletedMixBackup: { mix: Mix; index: number } | null;
    addSongToMix: (mixId: string, song: JioSaavnSong | PlayableTrack) => void;

    savedAlbums: any[];
    savedArtists: any[];
    toggleSaveAlbum: (album: any) => void;
    toggleFollowArtist: (artist: any) => void;
    isAlbumSaved: (id: string) => boolean;
    isArtistFollowed: (id: string) => boolean;

    likedSongs: JioSaavnSong[];
    toggleLike: (song: JioSaavnSong | PlayableTrack, e?: React.MouseEvent) => void;
    isLiked: (id: string) => boolean;
    recentlyPlayed: JioSaavnSong[];
    addToRecentlyPlayed: (track: PlayableTrack | JioSaavnSong) => void;

    downloadedState: Record<string, AudioQuality[]>;
    refreshDownloadedState: () => void;
    removeDownload: (songId: string, quality?: AudioQuality) => void;
    isDownloaded: (songId: string, targetQuality?: AudioQuality) => boolean;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useUI();

    const [mixes, setMixes] = useState<Mix[]>([]);
    const [likedSongs, setLikedSongs] = useState<JioSaavnSong[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<JioSaavnSong[]>([]);
    const [savedAlbums, setSavedAlbums] = useState<any[]>([]);
    const [savedArtists, setSavedArtists] = useState<any[]>([]);
    const [downloadedState, setDownloadedState] = useState<Record<string, AudioQuality[]>>({});

    const [deletedMixBackup, setDeletedMixBackup] = useState<{ mix: Mix; index: number } | null>(null);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load
    useEffect(() => {
        try {
            const savedMixes = localStorage.getItem('melora-mixes');
            if (savedMixes) setMixes(JSON.parse(savedMixes));

            const savedLiked = localStorage.getItem('melora-liked-songs');
            if (savedLiked) setLikedSongs(JSON.parse(savedLiked));

            const savedRecent = localStorage.getItem('melora-recently-played');
            if (savedRecent) setRecentlyPlayed(JSON.parse(savedRecent));

            const savedA = localStorage.getItem('melora-saved-albums');
            if (savedA) setSavedAlbums(JSON.parse(savedA));

            const savedArt = localStorage.getItem('melora-saved-artists');
            if (savedArt) setSavedArtists(JSON.parse(savedArt));
        } catch (e) { console.error("Error loading library state", e); }
    }, []);

    // Persist
    useEffect(() => { localStorage.setItem('melora-mixes', JSON.stringify(mixes)); }, [mixes]);
    useEffect(() => { localStorage.setItem('melora-liked-songs', JSON.stringify(likedSongs)); }, [likedSongs]);
    useEffect(() => { localStorage.setItem('melora-recently-played', JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);
    useEffect(() => { localStorage.setItem('melora-saved-albums', JSON.stringify(savedAlbums)); }, [savedAlbums]);
    useEffect(() => { localStorage.setItem('melora-saved-artists', JSON.stringify(savedArtists)); }, [savedArtists]);

    const refreshDownloadedState = useCallback(async () => {
        const state = await OfflineStore.getDownloadedState();
        setDownloadedState(state);
    }, []);

    useEffect(() => { refreshDownloadedState(); }, [refreshDownloadedState]);

    const removeDownload = useCallback(async (songId: string, quality?: AudioQuality) => {
        try {
            await OfflineStore.removeSong(songId, quality);
            showToast(`Removed from offline storage`, 'info');
            refreshDownloadedState();
        } catch (e) {
            console.error(e);
            showToast("Failed to remove download", "error");
        }
    }, [refreshDownloadedState, showToast]);

    const isDownloaded = useCallback((songId: string, targetQuality?: AudioQuality) => {
        const qualities = downloadedState[songId];
        if (!qualities || qualities.length === 0) return false;
        if (targetQuality) return qualities.includes(targetQuality);
        return true;
    }, [downloadedState]);

    const toggleLike = useCallback((trackOrSong: JioSaavnSong | PlayableTrack, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const song = isPlayableTrack(trackOrSong) ? trackOrSong.song : trackOrSong;
        if (!song) return;

        const exists = likedSongs.some((s: JioSaavnSong) => s.id === song.id);
        if (exists) {
            showToast("Removed from Liked Songs", 'info');
        } else {
            showToast("Added to Liked Songs", 'success');
        }

        setLikedSongs(prev => {
            const isCurrentlyLiked = prev.some((s: JioSaavnSong) => s.id === song.id);
            if (isCurrentlyLiked) {
                return prev.filter((s: JioSaavnSong) => s.id !== song.id);
            }
            return [song, ...prev];
        });
    }, [likedSongs, showToast]);

    const isLiked = useCallback((id: string) => likedSongs.some((s: JioSaavnSong) => s.id === id), [likedSongs]);

    const addToRecentlyPlayed = useCallback((track: PlayableTrack | JioSaavnSong) => {
        const song = isPlayableTrack(track) ? track.song : track;
        if (!song) return;
        setRecentlyPlayed(prev => {
            const filtered = prev.filter((s: JioSaavnSong) => s.id !== song.id);
            return [song, ...filtered].slice(0, 20);
        });
    }, []);

    const toggleSaveAlbum = useCallback((album: any) => {
        const exists = savedAlbums.some(a => a.id === album.id);
        if (exists) {
            showToast(`Removed ${album.name || album.title} from Library`, 'info');
        } else {
            showToast(`Saved ${album.name || album.title} to Library`, 'success');
        }

        setSavedAlbums(prev => {
            const isCurrentlySaved = prev.some(a => a.id === album.id);
            if (isCurrentlySaved) {
                return prev.filter(a => a.id !== album.id);
            }
            return [album, ...prev];
        });
    }, [savedAlbums, showToast]);

    const toggleFollowArtist = useCallback((artist: any) => {
        const exists = savedArtists.some(a => a.id === artist.id);
        if (exists) {
            showToast(`Unfollowed ${artist.name}`, 'info');
        } else {
            showToast(`Followed ${artist.name}`, 'success');
        }

        setSavedArtists(prev => {
            const isCurrentlySaved = prev.some(a => a.id === artist.id);
            if (isCurrentlySaved) {
                return prev.filter(a => a.id !== artist.id);
            }
            return [artist, ...prev];
        });
    }, [savedArtists, showToast]);

    const isAlbumSaved = useCallback((id: string) => savedAlbums.some(a => a.id === id), [savedAlbums]);
    const isArtistFollowed = useCallback((id: string) => savedArtists.some(a => a.id === id), [savedArtists]);

    const addMix = useCallback((mix: Mix) => {
        setMixes(prev => {
            const existingIdx = prev.findIndex(m => m.id === mix.id);
            if (existingIdx >= 0) {
                const newMixes = [...prev];
                newMixes[existingIdx] = mix;
                return newMixes;
            }
            return [...prev, mix];
        });
        return true;
    }, []);

    const updateMix = useCallback((mixId: string, updates: Partial<Mix>) => {
        setMixes(prev => {
            return prev.map(m => {
                if (m.id !== mixId) return m;
                // Note: We leave the activeMixId handling to QueueProvider/AudioEngine!
                return { ...m, ...updates };
            });
        });
    }, []);

    const deleteMix = useCallback((mixId: string) => {
        const mixToDelete = mixes.find(m => m.id === mixId);
        if (!mixToDelete) return;

        const index = mixes.indexOf(mixToDelete);
        setDeletedMixBackup({ mix: mixToDelete, index });

        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = setTimeout(() => {
            setDeletedMixBackup(null);
        }, 6000);

        showToast(`Deleted "${mixToDelete.title}" - Tap to Undo`, 'info');

        setMixes(prev => prev.filter(m => m.id !== mixId));
    }, [mixes, showToast]);

    const undoDeleteMix = useCallback(() => {
        if (!deletedMixBackup) return;
        const { mix, index } = deletedMixBackup;
        setMixes(prev => {
            const newMixes = [...prev];
            newMixes.splice(index, 0, mix);
            return newMixes;
        });
        setDeletedMixBackup(null);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        showToast(`Restored "${mix.title}"`, 'success');
    }, [deletedMixBackup, showToast]);

    const addSongToMix = useCallback((mixId: string, song: JioSaavnSong | PlayableTrack) => {
        const m = mixes.find(mix => mix.id === mixId);
        if (!m) return;
        const track = isPlayableTrack(song) ? song : ensurePlayableTrack(song);
        const isDuplicate = m.songs.some(s => (isPlayableTrack(s) ? s.id : s.id) === track.id);

        if (isDuplicate) {
            showToast("Song already in mix", "info");
        } else {
            showToast("Added to mix", "success");
        }

        setMixes(prev => prev.map(mix => {
            if (mix.id === mixId) {
                const dup = mix.songs.some(s => (isPlayableTrack(s) ? s.id : s.id) === track.id);
                if (dup) return mix;
                return { ...mix, songs: [...mix.songs, track] };
            }
            return mix;
        }));
    }, [mixes, showToast]);

    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        };
    }, []);

    const value = useMemo(() => ({
        mixes, setMixes, addMix, updateMix, deleteMix, undoDeleteMix, deletedMixBackup, addSongToMix,
        savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isAlbumSaved, isArtistFollowed,
        likedSongs, toggleLike, isLiked, recentlyPlayed, addToRecentlyPlayed,
        downloadedState, refreshDownloadedState, removeDownload, isDownloaded
    }), [
        mixes, setMixes, addMix, updateMix, deleteMix, undoDeleteMix, deletedMixBackup, addSongToMix,
        savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isAlbumSaved, isArtistFollowed,
        likedSongs, toggleLike, isLiked, recentlyPlayed, addToRecentlyPlayed,
        downloadedState, refreshDownloadedState, removeDownload, isDownloaded
    ]);

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (!context) throw new Error("useLibrary must be used within a LibraryProvider");
    return context;
}
