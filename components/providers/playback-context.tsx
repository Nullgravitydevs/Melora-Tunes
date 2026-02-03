"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { JioSaavnSong, getAudioUrl, getSongDetails, searchSongs } from "@/lib/jiosaavn";
import { getHiFiStream } from '@/lib/hifi-client';
import { searchHiFi } from '@/lib/hifi';
import { KeyVault } from '@/lib/key-vault';
import { AudioPlayer, AudioPlayerRef } from "@/components/ui/audio-player";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { recordPlay } from "@/lib/stats";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getSkipSegments, SkipSegment } from "@/lib/sponsorblock";
import { useEqualizer } from "@/hooks/useEqualizer";
import { OfflineStore } from "@/lib/offline-store";
import { HistoryStore } from "@/lib/history-store";
import { SignalStore } from "@/lib/signal-store";
import { DiscoveryEngine } from '@/lib/discovery-engine';

// --- Audio Quality Abstraction ---
import { AudioQuality, PlayableSource, PlayableTrack, isPlayableTrack } from "@/lib/types";

// --- Provider Capabilities ---
const PROVIDER_CAPABILITIES: Record<string, AudioQuality[]> = {
    'jiosaavn': ['320', '160', '96'],
    'ytmusic': [],
    'tidal': ['flac', 'hires'],
    'qobuz': ['flac', 'hires']
};


// Internal Toast Interface
interface ToastState {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}



// Upgrade helper
// [REFACTORED] Moved to lib/track-utils.ts to resolve circular dependency with DiscoveryEngine
import { ensurePlayableTrack } from "@/lib/track-utils";
export { ensurePlayableTrack };

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red" | "blue" | "cyan" | "pink" | "teal" | "yellow" | "black";
    songs: (JioSaavnSong | PlayableTrack)[];
    currentSongIndex: number;
    pinned?: boolean; // New: Sync with Deck
}


interface PlaybackContextType {
    // State
    mixes: Mix[];
    activeMixId: string | null; // The mix currently "inserted" in the player
    isPlaying: boolean;
    currentSong: JioSaavnSong | undefined; // Keep exposed as Song for UI compatibility
    currentTrack: PlayableTrack | undefined; // Internal track with sources
    volume: number;
    progress: number;
    shuffle: boolean;
    repeat: 'off' | 'one' | 'all';
    duration: number; // Restored

    // Actions
    setMixes: (mixes: Mix[]) => void;
    setQueue: (queue: (JioSaavnSong | PlayableTrack)[]) => void;
    loadMix: (mixId: string) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    seek: (amount: number) => void; // 0 to 1
    setVolume: (vol: number) => void;
    setShuffle: (val: boolean) => void;
    setRepeat: (val: 'off' | 'one' | 'all') => void;

    // Mix Management
    addMix: (mix: Mix) => boolean;
    updateMix: (mixId: string, updates: Partial<Mix>) => void;
    deleteMix: (mixId: string) => void;
    undoDeleteMix: () => void;
    deletedMixBackup: { mix: Mix; index: number } | null;
    addSongToMix: (mixId: string, song: JioSaavnSong | PlayableTrack) => void;
    isLoaded: boolean;
    activeMix: Mix | undefined;

    // Queue (Typed correctly)
    queue: JioSaavnSong[];
    currentIndex: number;

    // Sleep Timer
    sleepTimer: { endTime: number; duration: number } | null;
    setSleepTimer: (timer: { endTime: number; duration: number } | null) => void;

    // Crossfade (Fade out/in duration in seconds)
    // crossfadeDuration: number;
    // setCrossfadeDuration: (duration: number) => void;

    // Audio Quality
    qualityPreference: AudioQuality;
    setQualityPreference: (q: AudioQuality) => void;

    // Sync
    togglePin: (mixId: string) => void;
    // bitrate: AudioQuality; // REMOVED
    // setBitrate: (bitrate: AudioQuality) => void; // REMOVED

    // Hi-Res Override - REMOVED (Use bitrate: 'flac' instead)

    // End of Song Timer
    stopAtEndOfSong: boolean;
    setStopAtEndOfSong: (val: boolean) => void;

    // Desktop Notifications
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => void;

    // Liked Songs
    likedSongs: JioSaavnSong[];
    toggleLike: (song: JioSaavnSong | PlayableTrack) => void;
    isLiked: (songId: string) => boolean;

    // Recently Played
    recentlyPlayed: JioSaavnSong[];

    // Playback Speed
    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;

    // Equalizer
    eq: ReturnType<typeof useEqualizer>;

    // Offline / Downloads
    downloadSong: (song: JioSaavnSong | PlayableTrack) => Promise<boolean>;
    removeDownload: (songId: string, quality?: AudioQuality) => Promise<void>;
    isDownloaded: (songId: string, quality?: AudioQuality) => boolean;

    // Atomic Playback
    playInstantMix: (mix: Mix) => void;

    // Active Streaming Quality
    activeQuality: AudioQuality | null;

    // Library: Albums & Artists
    savedAlbums: any[];
    savedArtists: any[];
    toggleSaveAlbum: (album: any) => void;
    toggleFollowArtist: (artist: any) => void;
    isAlbumSaved: (id: string) => boolean;
    isArtistFollowed: (id: string) => boolean;

    // Toasts
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
    // --- State ---
    const [mixes, setMixes] = useState<Mix[]>([]);
    const [activeMixId, setActiveMixId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
    const [nextSongUrl, setNextSongUrl] = useState<string | null>(null); // New state for preloaded URL
    const [isLoaded, setIsLoaded] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
    const [qualityPreference, setQualityPreferenceState] = useState<AudioQuality>('320'); // Default 320 for init
    // forceLossless REMOVED - use qualityPreference: 'flac' instead
    const [sleepTimer, setSleepTimer] = useState<{ endTime: number; duration: number } | null>(null);
    // const [crossfadeDuration, setCrossfadeDuration] = useState(0); // REMOVED
    const [stopAtEndOfSong, setStopAtEndOfSong] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [likedSongs, setLikedSongs] = useState<JioSaavnSong[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<JioSaavnSong[]>([]);

    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 0.75, 1, 1.25, 1.5, 2
    const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
    const [downloadedState, setDownloadedState] = useState<Record<string, AudioQuality[]>>({});
    const [activeQuality, setActiveQuality] = useState<AudioQuality | null>(null);

    // Library State
    const [savedAlbums, setSavedAlbums] = useState<any[]>([]);
    const [savedArtists, setSavedArtists] = useState<any[]>([]);

    // Toast State
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Undo Delete State
    const [deletedMixBackup, setDeletedMixBackup] = useState<{ mix: Mix; index: number } | null>(null);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // EQ Hook
    const eq = useEqualizer();

    // Audio Hooks/Refs
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const loadRequestId = useRef(0); // Async guard
    const mixesRef = useRef<Mix[]>([]);
    const activeMixIdRef = useRef<string | null>(null);
    const isStationGenerating = useRef(false);
    const currentStreamKeyRef = useRef<string | null>(null); // Track which key provided the current stream
    const toastOnceRef = useRef(false); // [FIX Bug 10] Prevent toast spam
    const currentSongUrlRef = useRef<string | null>(null); // Track latest URL for sync comparison
    const nextPreloadRequestId = useRef(0); // [FIX Bug 15] Preload race condition guard
    const loadMixRequestId = useRef(0); // [FIX 2] loadMix race condition guard
    const downgradeToastRef = useRef<string | null>(null); // [FIX Bug 20] Throttle downgrade toasts
    useEffect(() => { currentSongUrlRef.current = currentSongUrl; }, [currentSongUrl]);

    // Toast Helper
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ id: Date.now(), message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }, []);

    // Cleanup Toast on unmount
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    // Derived State
    const activeMix = mixes.find(m => m.id === activeMixId);
    const rawCurrentItem = activeMix?.songs[activeMix.currentSongIndex];
    // Explicit return type to force narrowing
    const currentSong: JioSaavnSong | undefined = isPlayableTrack(rawCurrentItem) ? rawCurrentItem.song : rawCurrentItem;

    // Define currentTrack derived value correctly
    // If raw item is PlayableTrack, use it. If not, upgrade it with current Global Preference.
    const currentTrack = useMemo(() => {
        if (!rawCurrentItem) return undefined;
        if (isPlayableTrack(rawCurrentItem)) return rawCurrentItem;
        return ensurePlayableTrack(rawCurrentItem, qualityPreference as AudioQuality);
    }, [rawCurrentItem, qualityPreference]);

    // --- Persistence ---
    const DISCOVERY_MIX_ID = 'discovery-mix';

    useEffect(() => {
        const saved = localStorage.getItem('melora-mixes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Sanitize and Color Migration
                const sanitized = parsed.map((m: Mix) => {
                    const validColors = ["orange", "purple", "white", "green", "red", "blue", "cyan", "pink", "teal", "yellow", "black"];

                    // Validation only, no auto-assignment of random colors
                    let color = m.color;
                    if (m.color && !validColors.includes(m.color)) {
                        color = 'purple'; // Default fallback only if invalid
                    }

                    return {
                        ...m,
                        color,
                        songs: m.songs.filter(s => {
                            const song = isPlayableTrack(s) ? (s.song || s.original) : s;
                            if (!song) return false;
                            return !song.id.startsWith('mock-') && !song.name.startsWith('Track ');
                        })
                    };
                }).filter((m: Mix) => {
                    // Only filter duplicate Discovery Mix entries with wrong ID
                    if (m.title === 'Discovery Mix' && m.id !== DISCOVERY_MIX_ID) return false;
                    return true;
                });

                // Enforce Discovery Mix at Top
                const discIndex = sanitized.findIndex((m: Mix) => m.id === DISCOVERY_MIX_ID);
                if (discIndex === -1) {
                    // Create if missing
                    sanitized.unshift({
                        id: DISCOVERY_MIX_ID,
                        title: "Discovery Mix",
                        color: "blue",
                        songs: [],
                        currentSongIndex: 0
                    });
                } else if (discIndex > 0) {
                    // Move to front
                    const [disc] = sanitized.splice(discIndex, 1);
                    sanitized.unshift(disc);
                }

                if (sanitized.length === 0) {
                    setDefaults();
                } else {
                    setMixes(sanitized);
                }
            } catch (e) {
                console.error("Failed to parse mixes", e);
                setDefaults();
            }
        } else {
            setDefaults();
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('melora-mixes', JSON.stringify(mixes));
        }
    }, [mixes, isLoaded]);

    const setDefaults = () => {
        setMixes([
            {
                id: DISCOVERY_MIX_ID,
                title: "Discovery Mix",
                color: "blue",
                songs: [],
                currentSongIndex: 0,
                pinned: false
            }
        ]);
    };



    const addSongToMix = (mixId: string, song: JioSaavnSong | PlayableTrack) => {
        setMixes(prev => prev.map(mix => {
            if (mix.id === mixId) {
                return { ...mix, songs: [...mix.songs, song] };
            }
            return mix;
        }));
    };

    // Load liked songs and recently played from localStorage
    useEffect(() => {
        const savedLiked = localStorage.getItem('melora-liked-songs');
        if (savedLiked) {
            try { setLikedSongs(JSON.parse(savedLiked)); } catch (e) { console.error(e); }
        }
        const savedRecent = localStorage.getItem('melora-recently-played');
        if (savedRecent) {
            try { setRecentlyPlayed(JSON.parse(savedRecent)); } catch (e) { console.error(e); }
        }
        const savedAlb = localStorage.getItem('melora-saved-albums');
        if (savedAlb) {
            try { setSavedAlbums(JSON.parse(savedAlb)); } catch (e) { console.error(e); }
        }
        const savedArt = localStorage.getItem('melora-saved-artists');
        if (savedArt) {
            try { setSavedArtists(JSON.parse(savedArt)); } catch (e) { console.error(e); }
        }
    }, []);

    // Persist liked songs
    useEffect(() => {
        if (likedSongs.length > 0) {
            localStorage.setItem('melora-liked-songs', JSON.stringify(likedSongs));
        }
    }, [likedSongs]);

    // Persist recently played

    useEffect(() => {
        if (recentlyPlayed.length > 0) {
            localStorage.setItem('melora-recently-played', JSON.stringify(recentlyPlayed));
        }
    }, [recentlyPlayed]);

    useEffect(() => {
        localStorage.setItem('melora-saved-albums', JSON.stringify(savedAlbums));
    }, [savedAlbums]);

    useEffect(() => {
        localStorage.setItem('melora-saved-artists', JSON.stringify(savedArtists));
    }, [savedArtists]);

    // Toggle like function
    // Toggle like function
    // Toggle like function
    const toggleLike = useCallback((item: JioSaavnSong | PlayableTrack) => {
        // [FIX Bug 12] Normalize to PlayableTrack to preserve fidelity signals
        const track = ensurePlayableTrack(item);
        const song = track.song; // Extract the inner JioSaavnSong

        if (!track || !track.id) return;

        // Guard: If song is missing, abort (prevents TS error)
        if (!song) return;

        setLikedSongs(prev => {
            // Check against song ID (inner ID) because likedSongs is JioSaavnSong[]
            const exists = prev.some(s => s.id === song.id);
            if (exists) {
                return prev.filter(s => s.id !== song.id);
            } else {
                // Signal: Explicit Taste (LIKE) - Log the FULL track with quality info
                SignalStore.addSignal(track, 'LIKE');
                return [song, ...prev];
            }
        });
    }, []);



    // Check if song is liked
    const isLiked = useCallback((songId: string) => {
        return likedSongs.some(s => s.id === songId);
    }, [likedSongs]);

    // NEW: Album & Artist Helpers
    const toggleSaveAlbum = useCallback((album: any) => {
        setSavedAlbums(prev => {
            const exists = prev.some(a => a.id === album.id);
            if (exists) {
                showToast(`Removed "${album.name || album.title}" from Library`, 'info');
                return prev.filter(a => a.id !== album.id);
            }
            showToast(`Added "${album.name || album.title}" to Library`, 'success');
            return [album, ...prev];
        });
    }, [showToast]);

    const toggleFollowArtist = useCallback((artist: any) => {
        setSavedArtists(prev => {
            const exists = prev.some(a => a.id === artist.id);
            if (exists) {
                showToast(`Unfollowed ${artist.name}`, 'info');
                return prev.filter(a => a.id !== artist.id);
            }
            showToast(`Followed ${artist.name}`, 'success');
            return [artist, ...prev];
        });
    }, [showToast]);

    const isAlbumSaved = useCallback((id: string) => savedAlbums.some(a => a.id === id), [savedAlbums]);
    const isArtistFollowed = useCallback((id: string) => savedArtists.some(a => a.id === id), [savedArtists]);

    // [FIX Bug 20] Reset downgrade guard on song change
    useEffect(() => {
        if (currentTrack?.id) {
            downgradeToastRef.current = null;
        }
    }, [currentTrack?.id]);

    // Add to recently played (called on song play)
    const addToRecentlyPlayed = useCallback((track: PlayableTrack | JioSaavnSong) => {
        // [FIX Bug 18] Handle PlayableTrack to preserve quality info if passed
        const song = isPlayableTrack(track) ? track.song : track;

        if (!song) return; // Guard against undefined song

        setRecentlyPlayed(prev => {
            const filtered = prev.filter(s => s.id !== song.id);
            return [song, ...filtered].slice(0, 20); // Keep last 20
        });
    }, []);

    // --- Actions ---

    // Sync Refs for async access logic
    useEffect(() => { mixesRef.current = mixes; }, [mixes]);
    useEffect(() => { activeMixIdRef.current = activeMixId; }, [activeMixId]);

    // Helpers defined first (hoisted manually) to be available for next/prev
    const addMix = useCallback((mix: Mix) => {
        // Atomic Upsert to prevent race conditions (duplicates)
        let limitReached = false;

        setMixes(prev => {
            // 1. Check if exists - Update in place
            const existingIdx = prev.findIndex(m => m.id === mix.id);
            if (existingIdx >= 0) {
                console.log("[addMix] Atomic update:", mix.id);
                const newMixes = [...prev];
                newMixes[existingIdx] = mix;
                return newMixes;
            }

            // 2. Check Limit (if not system)
            const isSystem = mix.id === DISCOVERY_MIX_ID || mix.id === 'quick-play' || mix.id === 'search-results';
            const userTapeCount = prev.filter(m => m.id !== DISCOVERY_MIX_ID).length;

            // Limit Check REMOVED - User allows unlimited Discovery playlists
            // Visual Limit moved to DeckStage
            // if (!isSystem && userTapeCount >= 8) ... -> Removed

            // 3. Add new
            return [...prev, mix];
        });

        if (limitReached) {
            showToast("Mix limit reached (8)", 'error');
            return false;
        }
        return true;
    }, [showToast]);

    const updateMix = useCallback((mixId: string, updates: Partial<Mix>) => {
        setMixes(prev => {
            const nextMixes = prev.map(m => {
                if (m.id !== mixId) return m;

                // If updating songs, check if we need to handle playback state
                if (updates.songs && activeMixId === mixId) {
                    const currentSong = m.songs[m.currentSongIndex];
                    const newSongs = updates.songs;

                    // If current song is no longer in the new list (deleted)
                    const stillExists = currentSong && newSongs.some(s => {
                        const existingId = isPlayableTrack(s) ? s.id : s.id;
                        return existingId === (isPlayableTrack(currentSong) ? currentSong.id : currentSong.id);
                    });

                    if (!stillExists) {
                        console.log("[updateMix] Current song deleted, stopping playback");
                        setTimeout(() => {
                            setIsPlaying(false);
                            setCurrentSongUrl(null);
                            if (audioPlayerRef.current) audioPlayerRef.current.seekTo(0);
                        }, 0);

                        // Reset index
                        return { ...m, ...updates, currentSongIndex: 0 };
                    }
                }

                return { ...m, ...updates };
            });
            return nextMixes;
        });
    }, [activeMixId]);

    const deleteMix = (mixId: string) => {
        if (mixId === DISCOVERY_MIX_ID) {
            showToast("Cannot delete the Discovery Mix!", 'error');
            return;
        }

        // Find the mix and its position before deleting
        const mixIndex = mixes.findIndex(m => m.id === mixId);
        const mixToDelete = mixes[mixIndex];

        if (!mixToDelete) return;

        // Store backup for undo
        setDeletedMixBackup({ mix: mixToDelete, index: mixIndex });

        // Clear any existing undo timeout
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

        // Set 5-second timer to clear the backup
        undoTimeoutRef.current = setTimeout(() => {
            setDeletedMixBackup(null);
        }, 5000);

        // Delete the mix
        setMixes(prev => prev.filter(m => m.id !== mixId));

        if (activeMixId === mixId) {
            setActiveMixId(null);
            setIsPlaying(false);
        }

        showToast(`Deleted "${mixToDelete.title}" - Tap to Undo`, 'info');
    };

    const undoDeleteMix = () => {
        if (!deletedMixBackup) return;

        const { mix, index } = deletedMixBackup;

        // Restore mix at original position
        setMixes(prev => {
            const newMixes = [...prev];
            newMixes.splice(index, 0, mix);
            return newMixes;
        });

        // Clear backup and timeout
        setDeletedMixBackup(null);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

        showToast(`Restored "${mix.title}"`, 'success');
    };

    // --- Persistence Effects ---
    // Load settings
    useEffect(() => {
        const s = loadSettings();
        if (s.qualityPreference) setQualityPreferenceState(s.qualityPreference as AudioQuality);
        // Crossfade removed
    }, []);
    const togglePin = (mixId: string) => {
        setMixes(prev => prev.map(m => {
            if (m.id === mixId) {
                const newPinned = !m.pinned;
                showToast(newPinned ? `Pinned "${m.title}" to Deck` : `Unpinned "${m.title}"`, 'success');
                return { ...m, pinned: newPinned };
            }
            return m;
        }));
    };

    // Sync active mix song to currentSong - REMOVED (Computed state)

    // --- Autoplay & Pre-fetch Logic ---
    const autoplayFetchedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeMixId || !isPlaying || duration <= 0 || !currentSong) return;

        // Reset fetcher if song changed
        if (autoplayFetchedRef.current !== currentSong.id) {
            autoplayFetchedRef.current = null;
        }

        // Trigger 20 seconds before end
        const threshold = Math.max(duration - 20, duration * 0.5);

        if (progress >= threshold && !autoplayFetchedRef.current && !isStationGenerating.current) {
            const activeMix = mixes.find(m => m.id === activeMixId);
            // Only fetch if we are actually at the end of the queue
            if (activeMix && activeMix.currentSongIndex >= activeMix.songs.length - 1) {
                console.log("[Autoplay] Extending session via Discovery Engine for:", currentSong.name);
                autoplayFetchedRef.current = currentSong.id; // Mark as fetching
                isStationGenerating.current = true;

                // Use Discovery Engine to Extend
                // Use the current song as the seed for continuity
                const seed = ensurePlayableTrack(currentSong);

                // Infer region from Mix title? Weak heuristic but works for now.
                // e.g. "Telugu Mix" -> "telugu" (To be refined later)
                const inferredRegion = activeMix.title.includes('Mix') ? activeMix.title.replace(' Mix', '').toLowerCase() : undefined;

                DiscoveryEngine.generateSessionMix(seed, inferredRegion)
                    .then((newMix) => {
                        isStationGenerating.current = false;
                        // Use Ref to get latest state
                        const currentMix = mixesRef.current.find(m => m.id === activeMixIdRef.current);
                        if (currentMix && currentMix.id === activeMixIdRef.current) {

                            // Merge Strategy: Append new songs (excluding duplication)
                            // Merge Strategy: Append new songs (excluding duplication)
                            // Merge Strategy: Append new songs (excluding duplication)
                            const newSongs = newMix.songs
                                .map(s => ensurePlayableTrack(s, qualityPreference as AudioQuality)) // [FIX Bug 9] Normalize immediately
                                .filter(sTrack => {
                                    // [FIX Bug 19] Strict deduplication using PlayableTrack IDs
                                    if (sTrack.id === seed.id || (sTrack.song?.id === seed.song?.id && sTrack.song)) return false;

                                    return !currentMix.songs.some(existing => {
                                        const e = isPlayableTrack(existing) ? existing.id : ensurePlayableTrack(existing).id;
                                        return e === sTrack.id;
                                    });
                                });

                            if (newSongs.length > 0) {
                                console.log(`[Autoplay] Extended mix with ${newSongs.length} songs`);
                                updateMix(currentMix.id, { songs: [...currentMix.songs, ...newSongs] });
                            } else {
                                console.warn("[Autoplay] Discovery Engine returned no new unique songs.");
                            }
                        }
                    })
                    .catch(err => {
                        console.error("[Autoplay] Failed to extend session:", err);
                        isStationGenerating.current = false;
                        // Allow retry?
                    });
            }
        }
    }, [progress, duration, activeMixId, isPlaying, currentSong, updateMix, qualityPreference]);

    const loadMix = useCallback((mixId: string) => {
        // FIX 2: Request ID to prevent race condition on rapid taps
        const requestId = ++loadMixRequestId.current;
        console.log("[loadMix] Called with:", mixId, "current:", activeMixId, "requestId:", requestId);

        // Eject: If loading empty mixId, pause and clear
        if (!mixId || mixId === "") {
            console.log("[loadMix] Ejecting - stopping playback");
            setIsPlaying(false);
            setActiveMixId(null);
            setCurrentSongUrl(null);
            audioPlayerRef.current?.pause();
            return;
        }

        // If same mix, just start playing if stopped
        if (activeMixId === mixId) {
            console.log("[loadMix] Same mix, resuming");
            setIsPlaying(true);
            return;
        }

        // New mix - stop current, load new
        console.log("[loadMix] Switching to new mix:", mixId);
        setIsPlaying(false); // Stop current
        setCurrentSongUrl(null); // Clear old URL
        audioPlayerRef.current?.pause(); // Explicitly pause audio engine
        if (audioPlayerRef.current) {
            audioPlayerRef.current.seekTo(0); // Reset progress
        }

        // Reset the new mix to start from song 0
        setMixes(prev => prev.map(m =>
            m.id === mixId ? { ...m, currentSongIndex: 0 } : m
        ));

        setActiveMixId(mixId);

        // FIX 2: Guard setTimeout with requestId to prevent ghost playback
        setTimeout(() => {
            if (loadMixRequestId.current === requestId) {
                setIsPlaying(true);
            }
        }, 150);
    }, [activeMixId]);

    const playInstantMix = useCallback((mix: Mix) => {
        if (!mix.songs.length) return;
        console.log("[playInstantMix] Atomic play for:", mix.title);

        // 1. Normalize songs FIRST
        const normalizedSongs = mix.songs.map(s =>
            isPlayableTrack(s) ? s : ensurePlayableTrack(s, qualityPreference as AudioQuality)
        );

        const safeMix: Mix = {
            ...mix,
            songs: normalizedSongs,
            currentSongIndex: 0
        };

        // 2. Refactor to Single "Discovery Mix" Logic
        setMixes(prev => {
            // Keep pinned playlist tapes
            const pinned = prev.filter(m => m.pinned);

            // Find existing Discovery Mix or create fresh
            const existingDiscovery = prev.find(m => m.id === DISCOVERY_MIX_ID);

            // Merge Songs: New Mix songs + Existing Discovery songs
            // Deduplicate: If song exists, remove old instance (MRU behavior)
            const newSongIds = new Set(safeMix.songs.map(s => isPlayableTrack(s) ? s.id : ensurePlayableTrack(s).id));

            const oldSongs = existingDiscovery ? existingDiscovery.songs.filter(s => {
                const id = isPlayableTrack(s) ? s.id : ensurePlayableTrack(s).id;
                return !newSongIds.has(id);
            }) : [];

            // Combine: New Songs at TOP, followed by history
            const mergedSongs = [...safeMix.songs, ...oldSongs].slice(0, 100); // Limit queue history?

            const updatedDiscoveryMix: Mix = {
                id: DISCOVERY_MIX_ID,
                title: "Discovery Mix", // Always keep this name
                color: "blue",
                songs: mergedSongs,
                currentSongIndex: 0,
                pinned: false
            };

            // Result: Pinned Tapes + Single Discovery Tape
            return [...pinned, updatedDiscoveryMix];
        });

        // 3. Set active mix
        setActiveMixId(DISCOVERY_MIX_ID);

        // 4. HARD RESET PLAYER
        setIsPlaying(false);
        setCurrentSongUrl(null);
        audioPlayerRef.current?.pause();
        audioPlayerRef.current?.seekTo(0);

        // 5. PLAY AFTER STATE SETTLES
        setTimeout(() => {
            setShuffle(false);
            setIsPlaying(true);
        }, 200);
    }, [qualityPreference]);



    const play = useCallback(async () => {
        console.log("[play] Called, activeMixId:", activeMixId);
        if (!activeMixId) return;

        // Ensure we have a playable track with sources
        const trackToPlay = currentTrack || await ensurePlayableTrack(currentSong, qualityPreference);

        // Quality Fallback Check
        if (trackToPlay && trackToPlay.preferredQuality !== qualityPreference) {
            // Logic: If user wants HI-RES/FLAC but we got 320/160
            if ((qualityPreference === 'hires' || qualityPreference === 'flac') &&
                (trackToPlay.preferredQuality === '320' || trackToPlay.preferredQuality === '160')) {
                showToast(`Playing ${trackToPlay.preferredQuality}kbps (${qualityPreference.toUpperCase()} unavailable)`, 'info');
            }
        }

        // [New Feature] Sync Play to Discovery Mix (Recents)
        // If we are playing from a non-Discovery mix context, should we add it?
        // User wants "Discovery Mix" to show "Recents".
        if (trackToPlay) {
            // Logic: Update Discovery Mix with this track
            setMixes(prev => {
                const pinned = prev.filter(m => m.pinned);
                // Discovery Mix Handling
                const existing = prev.find(m => m.id === DISCOVERY_MIX_ID) || {
                    id: DISCOVERY_MIX_ID,
                    title: "Discovery Mix",
                    color: "blue",
                    songs: [],
                    currentSongIndex: 0,
                    pinned: false
                };

                const trackId = trackToPlay.id;
                // Remove existing instance of this song to move it to top
                const cleanSongs = existing.songs.filter(s => {
                    const id = isPlayableTrack(s) ? s.id : ensurePlayableTrack(s).id;
                    return id !== trackId;
                });

                // Add to TOP
                const normalizeTrack = isPlayableTrack(trackToPlay) ? trackToPlay : ensurePlayableTrack(trackToPlay);
                const newSongs = [normalizeTrack, ...cleanSongs].slice(0, 50);

                const updatedDiscovery: Mix = { ...existing, songs: newSongs };

                // Return Logic:
                // If the current active mix IS Discovery Mix, we just updated it.
                // If active mix is Playlists, we still update Discovery Mix in background.
                const otherMixes = prev.filter(m => m.id !== DISCOVERY_MIX_ID && !m.pinned);

                return [...pinned, updatedDiscovery, ...otherMixes.filter(m => m.id !== existing.id)];
            });
        }

        setIsPlaying(true);
        audioPlayerRef.current?.play();
    }, [activeMixId, currentSong, currentTrack, qualityPreference, showToast]);

    const pause = useCallback(() => {
        console.log("[pause] Called");
        setIsPlaying(false);
        audioPlayerRef.current?.pause();
    }, []);

    const togglePlay = useCallback(() => {
        console.log("[togglePlay] isPlaying:", isPlaying);
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, pause, play]);

    // --- Offline Management ---
    useEffect(() => {
        // Hydrate downloaded state on mount (Fix 9)
        OfflineStore.getDownloadedState().then(state => {
            setDownloadedState(state);
        });
    }, []);

    const isDownloaded = useCallback((songId: string, quality?: AudioQuality) => {
        const qualities = downloadedState[songId];
        if (!qualities) return false;
        if (quality) return qualities.includes(quality);
        return qualities.length > 0;
    }, [downloadedState]);

    const downloadSong = async (songOrTrack: JioSaavnSong | PlayableTrack) => {
        // Always derive "track" first to resolve the proper preferences
        // Note: For pure JioSaavnSong input, ensurePlayableTrack creates a wrapper but ID might be provider ID.
        // Unified Search results passed here are PlayableTracks with STABLE IDs.
        const currentQualityPreference = qualityPreference as AudioQuality;
        const track = ensurePlayableTrack(songOrTrack, currentQualityPreference);

        const songMetadata = track.song;
        if (!songMetadata) {
            console.error("[Download] Failed: Missing song metadata in PlayableTrack");
            return false;
        }

        try {
            const targetQuality = track.preferredQuality;
            console.log(`[Download] Attempting strict download: ${songMetadata.name} at ${targetQuality} (ID: ${track.id})`);

            // Strict Rule 2: Downloads must NEVER silently downgrade.
            const result = await resolvePlayableUrl(track); // Use resolver to find BEST url (Online check phase essentially)

            // We specifically want the TARGET quality. resolvePlayableUrl falls back.
            // We must verify the result quality matches strictly.
            if (!result || result.quality !== targetQuality) {
                if (result && result.quality !== targetQuality) {
                    console.error(`[Download] Strict failure. Quality mismatch: Requested ${targetQuality} vs Resolved ${result.quality}`);
                    showToast(`Download Failed: ${targetQuality} unavailable (Found ${result.quality})`, 'error');
                } else {
                    console.error(`[Download] Strict failure. Quality ${targetQuality} unavailable for ${songMetadata.name}`);
                    showToast(`Download Failed: ${targetQuality} unavailable`, 'error');
                }
                return false;
            }

            if (result.url) {
                // Critical: Save using the STABLE ID (track.id) so we can find it later
                const songToSave = { ...songMetadata, id: track.id };
                await OfflineStore.saveSong(songToSave, result.url, targetQuality);

                // Update local state (Fix 2)
                setDownloadedState(prev => {
                    const newState = { ...prev };
                    if (!newState[track.id]) newState[track.id] = [];
                    if (!newState[track.id].includes(targetQuality)) {
                        newState[track.id] = [...newState[track.id], targetQuality];
                    }
                    return newState;
                });
                showToast(`Downloaded ${songMetadata.name} in ${targetQuality}`, 'success');
                return true;
            }
            return false;
        } catch (e) {
            console.error("Download failed", e);
            return false;
        }
    };

    const removeDownload = useCallback(async (songId: string, quality?: AudioQuality) => {
        await OfflineStore.removeSong(songId, quality);
        setDownloadedState(prev => {
            const newState = { ...prev };
            if (quality) {
                // Remove specific quality
                if (newState[songId]) {
                    newState[songId] = newState[songId].filter(q => q !== quality);
                    if (newState[songId].length === 0) delete newState[songId];
                }
            } else {
                // Remove all
                delete newState[songId];
            }
            return newState;
        });
    }, []);

    // --- HELPER: Try JioSaavn ---
    const tryJioSaavn = async (song: JioSaavnSong, quality: AudioQuality): Promise<{ url: string, quality: AudioQuality } | null> => {
        try {
            const qMap: Record<string, '320' | '160' | '96'> = { '320': '320', '160': '160', '96': '96' };
            if (!qMap[quality]) return null;

            // JIT Repair: If encryptedMediaUrl is missing, fetch fresh details
            let targetSong = song;
            if (!song.encryptedMediaUrl) {
                console.log(`[JioSaavn] Missing encrypted URL for ${song.name}. Fetching fresh details...`);
                try {
                    // Method A: Direct ID Refresh
                    const freshDetails = await getSongDetails(song.id);
                    if (freshDetails && freshDetails.encryptedMediaUrl) {
                        console.log(`[JioSaavn] Metadata Repaired: Found encrypted URL via ID.`);
                        targetSong = freshDetails;
                    } else {
                        // Method B: Aggressive Search Repair
                        console.warn(`[JioSaavn] ID Repair Failed. Attempting Search Repair for "${song.name}"...`);
                        const query = `${song.name} ${song.primaryArtists || ""}`;
                        const searchResults = await searchSongs(query);

                        if (searchResults && searchResults.length > 0) {
                            // Use first match that has a URL
                            const match = searchResults.find(s => s.encryptedMediaUrl);
                            if (match) {
                                console.log(`[JioSaavn] Search Repair Success: Switched to ${match.id}`);
                                targetSong = match;
                            } else {
                                console.warn(`[JioSaavn] Search Repair Failed: No results with media.`);
                            }
                        } else {
                            console.warn(`[JioSaavn] Search Repair Failed: No results.`);
                        }
                    }
                } catch (e) {
                    console.warn(`[JioSaavn] Repair exception:`, e);
                }
            }

            let url = getAudioUrl(targetSong, qMap[quality]);

            // If still empty, maybe it really is missing?
            if (!url && !targetSong.encryptedMediaUrl) {
                // Try one last fetch if we haven't already
                // (This logic needs the import).
                return null;
            }

            if (url) return { url, quality };
        } catch (e) { /* ignore */ }
        return null;
    };

    // --- HELPER: Try HiFi (Tidal/Qobuz) ---
    const tryHiFi = async (track: PlayableTrack, allowSearch = true): Promise<{ url: string, quality: AudioQuality, keyName?: string } | null> => {
        // 1. Try existing sources first
        const hifiSource = track.sources.find(s => s.provider === 'tidal' || s.provider === 'qobuz');
        if (hifiSource) {
            try {
                const stream = await getHiFiStream(hifiSource.songId, hifiSource.provider as 'tidal' | 'qobuz');
                if (stream?.url) {
                    return { url: stream.url, quality: 'flac', keyName: stream.keyName };
                }
            } catch (e) {
                console.warn("[HiFi] Source failed:", e);
            }
        }

        // 2. Search Fallback
        if (allowSearch) {
            try {
                const query = `${track.title} ${track.artist}`;
                const searchResult = await searchHiFi(query);
                if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
                    const match = searchResult.tracks[0];
                    const stream = await getHiFiStream(match.id, match.source);
                    if (stream?.url) {
                        return { url: stream.url, quality: 'flac', keyName: stream.keyName };
                    }
                }
            } catch (e) {
                console.warn("[HiFi] Search failed:", e);
            }
        }
        return null;
    };

    // --- MASTER RESOLVER (Melora Explicit Truth) ---
    const resolvePlayableUrl = useCallback(async (track: PlayableTrack): Promise<{ url: string, quality: AudioQuality, keyName?: string } | null> => {
        const songName = track.title;
        // 1. Strict Request: Use explicit preference if set, otherwise default to context qualityPreference
        // The track.preferredQuality is populated by the Caller (e.g. Search Click or PlaybackEngine defaults)
        const targetQ = track.preferredQuality || '320';

        console.log(`[Resolver] Explicit Request: ${songName} @ ${targetQ}`);

        // Define Degradation Paths
        const pathMap: Record<AudioQuality, AudioQuality[]> = {
            'hires': ['hires', 'flac', '320', '160', '96'], // Full cascade
            'flac': ['flac', '320', '160', '96'],
            '320': ['320', '160', '96'],
            '160': ['160', '96'],
            '96': ['96']
        };
        // If unknown quality, fallback to 320 path
        const degradationPath = pathMap[targetQ] || pathMap['320'];

        // --- PHASE 1: OFFLINE (Exact -> Lower) ---
        for (const q of degradationPath) {
            try {
                if (await OfflineStore.isDownloaded(track.id, q)) {
                    const url = await OfflineStore.getSongUrl(track.id, q);
                    if (url) {
                        console.log(`[Resolver] ✓ Offline hit (${q})`);
                        // Toast only if downgrade
                        if (q !== targetQ && !toastOnceRef.current) {
                            showToast(`Playing Offline ${q} (Requested ${targetQ})`, 'info');
                            toastOnceRef.current = true;
                        }
                        return { url, quality: q };
                    }
                }
            } catch { /* ignore */ }
        }

        // --- PHASE 2: ONLINE (Exact -> Lower) ---
        let hiFiResolved = false; // [FIX Bug 4] Lock to prevent overwrite

        for (const q of degradationPath) {
            // Check if this quality step requires HiFi or JioSaavn
            // HiFi: hires, flac
            // JioSaavn: 320, 160, 96
            const isHiFi = q === 'hires' || q === 'flac';

            let result: { url: string, quality: AudioQuality, keyName?: string } | null = null;

            // Optimization: If Hi-Res already succeeded in a previous loop cycle (e.g. strict match),
            // but we are still looping? Actually, if it succeeded, we return.
            // But if Hi-Res succeeded but returned 'flac' when we asked 'hires', we might loop to 'flac'.
            // If we are now at 'flac' and hiFiResolved is true, we should reuse that result?
            // Simpler: If Hi-Fi succeeded, we are good.
            if (hiFiResolved) break;

            if (isHiFi) {
                // Try HiFi Source
                result = await tryHiFi(track, true); // Allow search
                // Verify result matches q (search might return diff quality)
                if (result && result.quality !== q && degradationPath.indexOf(result.quality) === -1) {
                    // Mismatch logic...
                    result = null;
                }

                if (result?.url) {
                    hiFiResolved = true;
                    // Strict return here? YES.
                    // If we found ANY HiFi stream, we trust it over JioSaavn.
                    // Even if we asked for HiRes and got FLAC, and checks passed.
                }
            } else {
                // Try JioSaavn
                // [FIX Bug 4] Do NOT downgrade to Saavn if we already found HiFi (shouldn't happen due to break, but safety)
                if (!hiFiResolved && track.song) {
                    result = await tryJioSaavn(track.song, q);
                }
            }

            if (result) {
                console.log(`[Resolver] ✓ Online Success: ${result.quality}`);

                // --- TRUTH TOAST ---
                if (result.quality !== targetQ && !toastOnceRef.current) {
                    // [FIX Bug 20] Throttle duplicate downgrade toasts
                    const songName = track.title;
                    const key = `${songName}:${targetQ}:${result.quality}`;

                    if (downgradeToastRef.current !== key) {
                        downgradeToastRef.current = key;
                        const prettyReq = targetQ === 'flac' ? 'FLAC' : targetQ === 'hires' ? 'Hi-Res' : targetQ;
                        const prettyGot = result.quality === 'flac' ? 'FLAC' : result.quality === 'hires' ? 'Hi-Res' : result.quality;
                        showToast(`Streaming ${prettyGot} (${prettyReq} unavailable)`, 'info');
                        toastOnceRef.current = true;
                    }
                }

                return result;
            }
        }

        // --- PHASE 3: LAST RESORT (Hail Mary) ---
        // If specific ID/Quality lookup failed, the ID might be dead.
        // Try to find ANY version of this song that works.
        try {
            console.log(`[Resolver] Phase 3: Hail Mary for "${songName}"...`);
            const query = `${songName} ${track.song?.primaryArtists || ''}`;
            const results = await searchSongs(query);

            if (results && results.length > 0) {
                // Find first with media
                const match = results.find(s => s.encryptedMediaUrl);
                if (match) {
                    // Normalize names to verify it's not a totally different song
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const n1 = normalize(match.name);
                    const n2 = normalize(songName);

                    // Allow substring match or fuzzy match
                    if (n1.includes(n2) || n2.includes(n1)) {
                        console.log(`[Resolver] ✓ Hail Mary Success: Swapped ID ${track.id} -> ${match.id}`);
                        // Use standard 160kbps for safety
                        const url = getAudioUrl(match, '160');
                        if (url) {
                            if (!toastOnceRef.current) {
                                showToast("Source repaired automatically", 'info');
                                toastOnceRef.current = true;
                            }
                            return { url, quality: '160' };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[Resolver] Hail Mary failed:", e);
        }

        console.error(`[Resolver] ✗ All Resolvers Failed`);
        return null;
    }, [showToast]);

    const loadSongUrl = useCallback(async (songOrTrack: JioSaavnSong | PlayableTrack | undefined, overrideQuality?: AudioQuality) => {
        // Cleanup old URL if it's a blob to prevent memory leaks
        setCurrentSongUrl((prevUrl) => {
            if (prevUrl && prevUrl.startsWith('blob:')) {
                OfflineStore.revokeUrl(prevUrl);
            }
            return null; // Temporarily clear while loading
        });
        setActiveQuality(null); // Reset quality badge while resolving
        currentStreamKeyRef.current = null; // Reset key ref

        if (!songOrTrack) {
            return;
        }

        const requestId = ++loadRequestId.current;
        const targetQualityPreference = (overrideQuality as AudioQuality) || (qualityPreference as AudioQuality);

        // Ensure we have a PlayableTrack
        let track = ensurePlayableTrack(songOrTrack, targetQualityPreference);

        // --- PREFERENCE LOGIC ---
        // 1. If overrideQuality is passed (e.g. user toggled setting while playing), force it.
        if (overrideQuality) {
            track = { ...track, preferredQuality: targetQualityPreference, isExplicitPreference: true };
        }
        // 2. If it's a PlayableTrack (from Unified Search or Queue) and we DID NOT just convert it from a raw song
        //    AND it has a specific preference that differs from global default...
        //    WE SHOULD RESPECT IT if it was explicitly chosen.
        //    However, distinguishing "explicitly chosen" vs "defaulted" is hard without a flag.
        //    Use heuristic: If the track source list implies verified qualities, rely on track preference.
        //    Actually, simpler: If provided object IS PlayableTrack, assume its preferredQuality is intentional.
        // 2. PlayableTrack (Queue / Search)
        else if (isPlayableTrack(songOrTrack)) {
            // Fix 5: Explicit Preference Flag
            if (songOrTrack.isExplicitPreference) {
                track = songOrTrack; // Respect manual choice
            } else {
                track = { ...songOrTrack, preferredQuality: targetQualityPreference }; // Apply global default
            }
        } else {
            // Raw song: Apply global targetQualityPreference
            track = { ...track, preferredQuality: targetQualityPreference };
        }

        const songSource = `${track.title} (${track.id}) [${track.preferredQuality}]`;

        // 3. FETCH URL (Unified via Resolver now)
        try {
            // 4. Fallback to Stream API for non-standard tracks (e.g. video types)
            const isVideo = track.song?.type === 'video';

            if (isVideo) {
                // Video logic placeholder
            }

            // CRITICAL FIX: Always resolve URL just-in-time
            console.log(`[Playback] Resolving JIT URL for: ${track.title} (Preferred: ${track.preferredQuality})`);

            // Using UNSPLIT Resolver (Handles both Offline and Online phases internally)
            const result = await resolvePlayableUrl(track);

            // Guard: If request ID changed during await, discard result
            if (loadRequestId.current !== requestId) return;

            if (result && result.url) {
                console.log(`[Playback] Loaded: ${result.quality} | ${result.url.substring(0, 50)}...`);
                // Check for silent downgrade (Bug #10)
                if (result.quality !== track.preferredQuality) {
                    console.warn(`[Playback] Quality Downgrade: Requested ${track.preferredQuality}, got ${result.quality}`);
                    showToast(`Playing in ${result.quality} (Requested: ${track.preferredQuality})`, 'info');
                }
                if (result.url !== currentSongUrlRef.current) {
                    console.log(`[LoadSong] Setting URL: ${result.url.substring(0, 50)}...`);
                    setCurrentSongUrl(result.url);
                    setActiveQuality(result.quality);
                    setIsPlaying(true); // Sync Fix: Ensure playback resumes

                    if (result.keyName) {
                        currentStreamKeyRef.current = result.keyName;
                        // KeyVault.recordUsage(result.keyName); // Optional stats
                    }
                }
            } else {
                throw new Error("All qualities failed");
            }
        } catch (error) {
            if (loadRequestId.current !== requestId) return;

            console.warn(`[Playback] Load Failed for ${songSource}:`, error);

            // Don't call handlePlaybackError here - it creates circular dependency.
            // Instead, set an empty URL which will trigger audio element error,
            // which in turn calls handlePlaybackError.
            setCurrentSongUrl(''); // Empty string triggers error in AudioPlayer
        }

    }, [qualityPreference, resolvePlayableUrl, showToast]);


    const setQualityPreference = useCallback((newQualityPreference: AudioQuality) => {
        setQualityPreferenceState(newQualityPreference);
        saveSettings({ qualityPreference: newQualityPreference });
        showToast(`Audio Quality set to ${newQualityPreference.toUpperCase()}`, 'info');

        // [FIX Bug 16] Reload using currentTrack to preserve source metadata
        if (currentTrack) {
            loadSongUrl(currentTrack, newQualityPreference);
        }
    }, [currentTrack, loadSongUrl, showToast]);

    // Effect to load URL when song changes
    // MOVED: To line 1390+ to respect currentTrack scope


    // Sleep Timer Countdown
    useEffect(() => {
        if (!sleepTimer) return;

        const interval = setInterval(() => {
            const remaining = sleepTimer.endTime - Date.now();

            if (remaining <= 0) {
                pause();
                setSleepTimer(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sleepTimer, pause]);



    const next = useCallback(() => {
        // forceLossless removed - quality is now controlled by qualityPreference setting only

        // Use Refs for latest state to prevent closure staleness on rapid clicks
        const currentActiveMixId = activeMixIdRef.current;
        const currentMixes = mixesRef.current;

        if (!currentActiveMixId) {
            console.warn("[NEXT] No activeMixId (Ref)");
            return;
        }

        const activeMix = currentMixes.find(m => m.id === currentActiveMixId);
        if (!activeMix) {
            console.warn("[NEXT] Active mix not found in Ref state");
            return;
        }

        console.log("[NEXT] Called", {
            mix: activeMix.title,
            idx: activeMix.currentSongIndex,
            len: activeMix.songs.length
        });

        // End of Song Check
        if (stopAtEndOfSong) {
            pause();
            setStopAtEndOfSong(false); // Reset flag
            return;
        }

        // 1. Repeat One Logic
        if (repeat === 'one') {
            audioPlayerRef.current?.seekTo(0);
            audioPlayerRef.current?.play(); // Force play restart
            return;
        }

        const len = activeMix.songs.length;
        if (len === 0) return;

        // 1.5 Handle Single Song Case (Reset to 0 if 1 song)
        if (len === 1) {
            audioPlayerRef.current?.seekTo(0);
            if (!isPlaying) setIsPlaying(true);
            return;
        }

        let nextIndex = activeMix.currentSongIndex;

        // 2. Shuffle Logic
        if (shuffle) {
            // Pick random index different from current
            let randomIndex = Math.floor(Math.random() * len);
            // Simple protection against same song if len > 1
            if (randomIndex === nextIndex && len > 1) {
                randomIndex = (randomIndex + 1) % len;
            }
            nextIndex = randomIndex;
        } else {
            // 3. Normal Logic
            nextIndex = nextIndex + 1;

            // 4. Repeat All / Off Logic
            if (nextIndex >= len) {
                if (repeat === 'off') {
                    // Stop playback at end
                    console.log("End of playlist (Repeat Off). Stopping.");
                    setIsPlaying(false);
                    // Reset to 0 but don't play? Or just stop?
                    // Typically 'Stop' means stop. But we update index to 0 so next play starts at 0?
                    updateMix(activeMix.id, { currentSongIndex: 0 });
                    return;
                } else {
                    // Repeat All -> Loop
                    nextIndex = 0;
                }
            }
        }

        const nextItem = activeMix.songs[nextIndex];
        const nextTitle = isPlayableTrack(nextItem) ? nextItem.title : nextItem.name;

        console.log("[Next] Advancing to:", nextTitle);

        // Optimistic update
        updateMix(activeMix.id, { currentSongIndex: nextIndex });

        // [SignalStore] Record Skip/Next Action
        if (currentTrack) {
            const durationPlayed = audioPlayerRef.current?.getCurrentTime() || 0;
            // Pass duration to let store decide if it's Early/Late skip
            SignalStore.addSignal(currentTrack, 'SKIP', 'discovery', durationPlayed);
        }

        // Use timeout to allow state to settle? Not strictly needed if `updateMix` triggers effect.
        if (!isPlaying) setIsPlaying(true);
    }, [repeat, shuffle, isPlaying, updateMix, stopAtEndOfSong, pause, currentTrack]);

    const prev = useCallback(() => {
        // Use Refs for latest state
        const currentActiveMixId = activeMixIdRef.current;
        const currentMixes = mixesRef.current;

        if (!currentActiveMixId) return;
        const activeMix = currentMixes.find(m => m.id === currentActiveMixId);
        if (!activeMix) return;

        // If played > 3s, restart song
        if (audioPlayerRef.current && (audioPlayerRef.current.getCurrentTime() || 0) > 3) {
            audioPlayerRef.current.seekTo(0);
            return;
        }

        // Shuffle Previous
        let prevIndex = activeMix.currentSongIndex;
        const len = activeMix.songs.length;

        if (len <= 1) {
            audioPlayerRef.current?.seekTo(0);
            return;
        }

        if (shuffle) {
            let randomIndex = Math.floor(Math.random() * len);
            if (randomIndex === prevIndex) randomIndex = (randomIndex - 1 + len) % len;
            prevIndex = randomIndex;
        } else {
            prevIndex = prevIndex - 1;
            if (prevIndex < 0) prevIndex = len - 1;
        }

        updateMix(activeMix.id, { currentSongIndex: prevIndex });
        setIsPlaying(true);
    }, [shuffle, updateMix]);

    // Lazarus Loop: Simplified (3 Strikes Rule)
    const retryCount = useRef(0);
    const handlePlaybackError = useCallback((msg: string) => {
        // Guard: If no song is loaded or URL is explicitly empty, ignore errors.
        if (!currentSong) return;

        // CRITICAL FIX: Ignore "Empty src" errors. These happen during transition or when resolver hasn't finished.
        // Also ignore "The element has no supported sources" if we are still resolving.
        if (msg.includes("Empty src") || msg.includes("no supported sources")) {
            // console.warn("[Lazarus] Ignoring transient empty src error.");
            return;
        }

        console.warn(`[Lazarus] Playback Error for ${currentSong?.name}: ${msg}`);

        // "3 Strikes" Rule
        if (retryCount.current < 3) {
            retryCount.current++;
            console.log(`[Lazarus] Auto-Retry (${retryCount.current}/3)...`);

            // Only show toast on first retry
            if (retryCount.current === 1) showToast("Refreshing Stream...", 'info');

            // Quick retry - simple reload
            setTimeout(() => {
                loadSongUrl(currentSong, undefined);
                setIsPlaying(true);
            }, 1000);

        } else {
            // STOP. Don't loop forever.
            console.error("[Lazarus] 3 Strikes. Moving to next song.");
            setIsPlaying(false);
            showToast("Song unavailable. Skipping...", 'error');

            retryCount.current = 0; // Reset for next song

            // Wait a moment then skip
            setTimeout(() => {
                next();
            }, 1500);
        }
    }, [currentSong, loadSongUrl, next, showToast]);

    // Reset retry count on song change
    useEffect(() => {
        retryCount.current = 0;

        // Add to History (with 5s delay to filter skips)
        if (currentSong && isPlaying) {
            const timer = setTimeout(() => {
                // Fix: Save the full PlayableTrack (rawCurrentItem) to persist FLAC preference
                const trackToSave = rawCurrentItem ? ensurePlayableTrack(rawCurrentItem) : ensurePlayableTrack(currentSong);
                HistoryStore.addToHistory(trackToSave);
                addToRecentlyPlayed(trackToSave); // [FIX Bug 18] Pass PlayableTrack

                // Signal: Verified Play (>10s)
                // Pass arbitrary >10 duration to satisfy signature, though verified play implies positive weight anyway
                SignalStore.addSignal(trackToSave, 'PLAY', 'discovery', 30);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [currentSong?.id, isPlaying, rawCurrentItem]);

    const seek = useCallback((amount: number) => {
        // Fix: Explicitly specify 'seconds' to prevent ReactPlayer from interpreting <1 as fraction (percentage)
        // This stops accidental jumps to 90% when seeking to 0.9s
        audioPlayerRef.current?.seekTo(amount, 'seconds');
    }, []);


    // We also need to ensure currentSong matches what's actually playing if we are in a mix
    // The state `currentSong` is set by effects, but let's trust it.

    // Ensure currentSong derived from mix is unwrapped if needed?
    // Actually currentSong is state. We need to make sure wherever setCurrentSong is called, we unwrap.
    // Check `loadMix`, `next`, `prev` etc.
    // We already fixed `next` logic earlier.


    // [FIX Bug 5] Reset load request ID when switching mixes to prevent old mix's pending load from overwriting new mix state
    useEffect(() => {
        loadRequestId.current++;
        nextPreloadRequestId.current++; // [FIX Bug 15] Also reset preload guard
    }, [activeMixId]);

    // Fix nextSongUrl logic to be async-safe
    useEffect(() => {
        // Optimization: Only preload if current song is actually loaded/playing.
        // This prevents race conditions where we preload while still struggling to resolve current song.
        if (!currentSongUrl) {
            setNextSongUrl(null);
            return;
        }

        const activeMixForNext = mixes.find(m => m.id === activeMixId);
        if (!activeMixForNext) {
            setNextSongUrl(null);
            return;
        }

        const nextIndex = (activeMixForNext.currentSongIndex + 1) % activeMixForNext.songs.length;
        // Don't preload if valid next index is same as current (1 song loop) unless specific requirement?
        // Actually fine to preload same song if repeating.

        const nextItem = activeMixForNext.songs[nextIndex];
        if (!nextItem) {
            setNextSongUrl(null);
            return;
        }

        let cancelled = false;
        const requestId = ++nextPreloadRequestId.current; // [FIX Bug 15]

        const loadNext = async () => {
            try {
                // [FIX Bug 6] Inherit quality from current track if possible
                // If I am listening to FLAC, preload next song in FLAC too.
                const targetQ = currentTrack?.preferredQuality || (qualityPreference as AudioQuality);
                const track = ensurePlayableTrack(nextItem, targetQ);

                // Use Resolver
                const result = await resolvePlayableUrl(track);

                // [FIX Bug 15] Preload Guard
                if (cancelled || requestId !== nextPreloadRequestId.current) return;

                if (result?.url) {
                    setNextSongUrl(result.url);
                }
            } catch (e) {
                console.warn("Failed to preload next song", e);
            }
        };

        loadNext();

        return () => { cancelled = true; };
    }, [activeMixId, mixes, qualityPreference, resolvePlayableUrl, currentSong?.id, currentSongUrl, currentTrack]); // Added currentTrack dep





    // Effect to load URL when song changes
    useEffect(() => {
        // [FIX - Bug 3] Use currentTrack to preserve rich metadata (quality/sources)
        if (currentTrack) {
            toastOnceRef.current = false; // [FIX Bug 10] Reset toast guard on new song
            loadSongUrl(currentTrack);

            // SponsorBlock: Fetch segments if it looks like a YouTube ID
            // [FIX Bug 14] Use inner song ID to avoid compound IDs (e.g. 123:tidal)
            const ytId = currentTrack.song?.id;
            setSkipSegments([]);
            if (ytId && ytId.length === 11 && !ytId.includes('-') && !ytId.includes(' ')) {
                getSkipSegments(ytId).then(segs => {
                    if (segs.length > 0) console.log(`Loaded ${segs.length} skip segments`);
                    setSkipSegments(segs);
                });
            } else if (currentTrack.song?.type === 'video') {
                getSkipSegments(ytId || currentTrack.id).then(setSkipSegments);
            }
        } else {
            setCurrentSongUrl(null);
            setSkipSegments([]);
        }
    }, [currentTrack, loadSongUrl]);


    // Normalize queue for UI
    const normalizedQueue = useMemo(() => {
        return (activeMix?.songs || []).map(s =>
            isPlayableTrack(s) ? s.song : s
        );
    }, [activeMix]);

    const currentIndex = activeMix?.currentSongIndex || 0;

    // We also need to ensure currentSong matches what's actually playing if we are in a mix

    // FIX 3: Use constant ID to prevent memory leak from infinite mixes
    const QUEUE_MIX_ID = 'queue-mix';
    const setQueue = useCallback((newQueue: (JioSaavnSong | PlayableTrack)[]) => {
        if (!newQueue || newQueue.length === 0) {
            setIsPlaying(false);
            setActiveMixId(null);
            setCurrentSongUrl(null);
            audioPlayerRef.current?.pause();
            return;
        }

        const mix: Mix = {
            id: QUEUE_MIX_ID,
            title: 'Queue',
            color: 'blue',
            songs: newQueue.map(s => ensurePlayableTrack(s)),
            currentSongIndex: 0
        };

        playInstantMix(mix);
    }, [playInstantMix]);

    const value = {
        mixes, activeMixId, isPlaying, currentSong, currentTrack, volume, progress, duration, shuffle, repeat,
        setMixes,
        setQueue,
        loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,

        addMix,
        updateMix,
        deleteMix,
        undoDeleteMix,
        deletedMixBackup,
        addSongToMix,
        isLoaded,
        activeMix,

        queue: normalizedQueue.filter((s): s is JioSaavnSong => !!s),
        currentIndex: activeMix?.currentSongIndex || 0,

        sleepTimer, setSleepTimer,
        // crossfadeDuration, setCrossfadeDuration,
        qualityPreference, setQualityPreference, // This will reference the function we define
        togglePin,
        activeQuality: currentTrack ? currentTrack.preferredQuality : null,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        likedSongs, toggleLike, isLiked,
        recentlyPlayed,
        playbackSpeed, setPlaybackSpeed,
        eq,
        downloadSong, removeDownload, isDownloaded,
        playInstantMix,
        savedAlbums,
        savedArtists,
        toggleSaveAlbum,
        toggleFollowArtist,
        isAlbumSaved,
        isArtistFollowed,
        showToast
    };

    return (
        <PlaybackContext.Provider value={value}>
            {children}

            {/* Global Audio Element */}
            <AudioPlayer
                ref={audioPlayerRef}
                url={currentSongUrl}
                nextUrl={nextSongUrl}
                playing={isPlaying}
                volume={volume}
                speed={playbackSpeed}
                // crossfadeDuration={crossfadeDuration}
                eqBands={eq.isEnabled ? eq.bands : undefined} // Only pass bands if enabled
                onEnded={() => {
                    // [SignalStore] Full Listen
                    if (currentTrack) {
                        SignalStore.addSignal(currentTrack, 'PLAY', 'discovery', duration);
                    }
                    next();
                }}
                onProgress={({ played, playedSeconds }) => {
                    setProgress(played);

                    // SponsorBlock Check
                    if (skipSegments.length > 0 && duration > 0) {
                        for (const seg of skipSegments) {
                            // Check if inside segment (with slight buffer at start to allow seek)
                            if (playedSeconds >= seg.segment[0] && playedSeconds < seg.segment[1]) {
                                // console.log(`Skipping ${seg.category} (${seg.segment[0]} -> ${seg.segment[1]})`);
                                const seekRatio = seg.segment[1] / duration;
                                if (seekRatio < 1) {
                                    audioPlayerRef.current?.seekTo(seekRatio);
                                    // Prevent bouncing back by updating UI state immediately? 
                                    // seekTo usually handles it.
                                    break; // Only skip one at a time
                                }
                            }
                        }
                    }
                }}
                onDuration={setDuration}
                // [FIX Bug 17] Use currentTrack props for UI consistency (fixes compound ID flashing)
                title={cleanTrackTitle(decodeHtml(currentTrack?.song?.name || ""))}
                artist={decodeHtml(currentTrack?.song?.primaryArtists || "")}
                album={decodeHtml(currentTrack?.song?.album?.name || "")}
                artwork={currentTrack?.song?.image?.[0]?.link}
                onError={(msg) => handlePlaybackError(msg)}
            />

            {/* Minimal Toast UI */}
            {
                toast && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-zinc-800/90 text-white text-xs font-bold rounded-full border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 transition-all">
                        {toast.type === 'error' && <span className="text-red-400">⚠️</span>}
                        {toast.type === 'info' && <span className="text-amber-400">ℹ️</span>}
                        {toast.message}
                    </div>
                )
            }
        </PlaybackContext.Provider >
    );
}
export function usePlayback() {
    const context = useContext(PlaybackContext);
    if (context === undefined) {
        throw new Error("usePlayback must be used within a PlaybackProvider");
    }
    return context;
}

