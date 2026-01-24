"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { JioSaavnSong, getAudioUrl, getStation, getSongDetails, searchSongs } from "@/lib/jiosaavn";
import { getHiFiStream } from '@/lib/hifi-client';
import { searchHiFi } from '@/lib/hifi'; // God Mode Search
import { KeyVault } from '@/lib/key-vault'; // Lazarus Loop Feedback
import { AudioPlayer, AudioPlayerRef } from "@/components/ui/audio-player";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { recordPlay } from "@/lib/stats";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getSkipSegments, SkipSegment } from "@/lib/sponsorblock";
import { useEqualizer } from "@/hooks/useEqualizer";
import { OfflineStore } from "@/lib/offline-store";
import { HistoryStore } from "@/lib/history-store";
import { SignalStore } from "@/lib/signal-store";

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
export function ensurePlayableTrack(song: JioSaavnSong | PlayableTrack, defaultQuality: AudioQuality = '320'): PlayableTrack {
    if (isPlayableTrack(song)) {
        // [STRICT] If it's already a PlayableTrack, DO NOT touch it.
        // It might have Hi-Res sources or explicit quality selection.
        return song;
    }

    // Convert legacy JioSaavnSong to PlayableTrack
    return {
        id: song.id,
        song: song,
        preferredQuality: defaultQuality,
        sources: [
            { provider: 'jiosaavn', songId: song.id, quality: '320' },
            { provider: 'jiosaavn', songId: song.id, quality: '160' },
            { provider: 'jiosaavn', songId: song.id, quality: '96' }
        ]
    };
}

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red" | "blue" | "cyan" | "pink" | "teal" | "yellow" | "black";
    songs: (JioSaavnSong | PlayableTrack)[];
    currentSongIndex: number;
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
    isLoaded: boolean;
    activeMix: Mix | undefined;

    // Queue (Typed correctly)
    queue: (JioSaavnSong | PlayableTrack)[];
    currentIndex: number;

    // Sleep Timer
    sleepTimer: { endTime: number; duration: number } | null;
    setSleepTimer: (timer: { endTime: number; duration: number } | null) => void;

    // Crossfade (Fade out/in duration in seconds)
    crossfadeDuration: number;
    setCrossfadeDuration: (duration: number) => void;

    // Audio Quality
    bitrate: 'flac' | '320' | '160' | '96';
    setBitrate: (bitrate: 'flac' | '320' | '160' | '96') => void;

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
    const [bitrate, setSelectBitrate] = useState<'flac' | '320' | '160' | '96'>('320'); // Default 320 for init
    // forceLossless REMOVED - use bitrate: 'flac' instead
    const [sleepTimer, setSleepTimer] = useState<{ endTime: number; duration: number } | null>(null);
    const [crossfadeDuration, setCrossfadeDuration] = useState(0); // 0 = off
    const [stopAtEndOfSong, setStopAtEndOfSong] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [likedSongs, setLikedSongs] = useState<JioSaavnSong[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<JioSaavnSong[]>([]);

    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 0.75, 1, 1.25, 1.5, 2
    const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
    const [downloadedState, setDownloadedState] = useState<Record<string, AudioQuality[]>>({});

    // Toast State
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // EQ Hook
    const eq = useEqualizer();

    // Audio Hooks/Refs
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const loadRequestId = useRef(0); // Async guard
    const mixesRef = useRef<Mix[]>([]);
    const activeMixIdRef = useRef<string | null>(null);
    const isStationGenerating = useRef(false);
    const currentStreamKeyRef = useRef<string | null>(null); // Track which key provided the current stream

    // Toast Helper
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ id: Date.now(), message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }, []);

    // Derived State
    const activeMix = mixes.find(m => m.id === activeMixId);
    const rawCurrentItem = activeMix?.songs[activeMix.currentSongIndex];
    // Explicit return type to force narrowing
    const currentSong: JioSaavnSong | undefined = isPlayableTrack(rawCurrentItem) ? rawCurrentItem.song : rawCurrentItem;

    // --- Persistence ---
    const DISCOVERY_MIX_ID = 'discovery-mix';

    useEffect(() => {
        const saved = localStorage.getItem('melora-mixes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Sanitize
                const sanitized = parsed.map((m: Mix) => ({
                    ...m,
                    songs: m.songs.filter(s => {
                        const song = isPlayableTrack(s) ? s.song : s;
                        return !song.id.startsWith('mock-') && !song.name.startsWith('Track ');
                    })
                })).filter((m: Mix) => {
                    if (m.title === 'Discovery Mix' && m.id !== DISCOVERY_MIX_ID) return false;
                    return !['Pawan Kalyan Hits', 'DSP Hits', 'Megastar Hits', 'Yuvan Shankar Raja'].includes(m.title);
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
                currentSongIndex: 0
            },
            { id: "1", title: "My Tape", color: "orange", songs: [], currentSongIndex: 0 }
        ]);
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

    // Toggle like function
    const toggleLike = useCallback((item: JioSaavnSong | PlayableTrack) => {
        const song = 'song' in item ? item.song : item;
        setLikedSongs(prev => {
            const exists = prev.some(s => s.id === song.id);
            if (exists) {
                return prev.filter(s => s.id !== song.id);
            } else {
                // Signal: Explicit Taste (LIKE)
                const s = 'song' in item ? item.song : item;
                const track = ensurePlayableTrack(s);
                SignalStore.addSignal(track, 'LIKE');
                return [song, ...prev];
            }
        });
    }, []);



    // Check if song is liked
    const isLiked = useCallback((songId: string) => {
        return likedSongs.some(s => s.id === songId);
    }, [likedSongs]);

    // Add to recently played (called on song play)
    const addToRecentlyPlayed = useCallback((song: JioSaavnSong) => {
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
        console.log("Adding mix. Current count:", mixesRef.current.length);

        // Count only USER tapes (exclude Discovery Mix)
        const userTapeCount = mixesRef.current.filter(m => m.id !== DISCOVERY_MIX_ID).length;

        // Allow "Discovery Mix" to bypass limit
        const isSystem = mix.id === DISCOVERY_MIX_ID;

        if (!isSystem && userTapeCount >= 8) {
            console.log("Limit blocked.");
            showToast("Mix limit reached (8)", 'error');
            return false;
        }
        setMixes(prev => [...prev, mix]);
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
        setMixes(prev => prev.filter(m => m.id !== mixId));
        if (activeMixId === mixId) {
            setActiveMixId(null);
            setIsPlaying(false);
        }
    };

    // --- Persistence Effects ---
    // Load settings
    useEffect(() => {
        const s = loadSettings() as any; // Cast to allow new settings like crossfade
        if (s.bitrate) setSelectBitrate(s.bitrate);
        if (s.crossfadeDuration !== undefined) setCrossfadeDuration(s.crossfadeDuration);
    }, []);

    // Sync active mix song to currentSong - REMOVED (Computed state)

    // --- Autoplay & Pre-fetch Logic ---(Moved after Actions) ---
    const autoplayFetchedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeMixId || !isPlaying || duration <= 0 || !currentSong) return;

        // Reset fetcher if song changed or mix changed
        if (autoplayFetchedRef.current !== currentSong.id) {
            autoplayFetchedRef.current = null;
        }

        // Trigger 20 seconds before end (or 50% for short songs)
        const threshold = Math.max(duration - 20, duration * 0.5);

        if (progress >= threshold && !autoplayFetchedRef.current && !isStationGenerating.current) {
            const activeMix = mixes.find(m => m.id === activeMixId);
            // Only fetch if we are actually at the end of the queue
            if (activeMix && activeMix.currentSongIndex >= activeMix.songs.length - 1) {
                console.log("[Autoplay] Pre-fetching recommendations for:", currentSong.name);
                autoplayFetchedRef.current = currentSong.id; // Mark as fetching
                isStationGenerating.current = true;

                getStation(currentSong.id).then((stationSongs) => {
                    isStationGenerating.current = false;
                    if (stationSongs && stationSongs.length > 0) {
                        // Use Ref to get latest state
                        const currentMix = mixesRef.current.find(m => m.id === activeMixIdRef.current);
                        if (currentMix && currentMix.id === activeMixIdRef.current) {
                            // Double check we haven't navigated away
                            const newUnique = stationSongs.filter(s => !currentMix.songs.some(existing => {
                                const e = isPlayableTrack(existing) ? existing.song : existing;
                                // 1. Strict ID Match
                                if (e.id === s.id) return true;
                                // 2. Fuzzy Match (Name + Artist) to catch duplicates with different IDs
                                // Normalized comparision
                                const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (normalize(e.name) === normalize(s.name) &&
                                    normalize(e.primaryArtists) === normalize(s.primaryArtists)) {
                                    return true;
                                }
                                return false;
                            }));
                            if (newUnique.length > 0) {
                                console.log(`[Autoplay] Added ${newUnique.length} tracks to queue`);
                                // Wrap new songs as PlayableTracks with current global settings
                                console.log(`[Autoplay] Added ${newUnique.length} tracks to queue`);
                                // Wrap new songs as PlayableTracks with current global settings
                                // Fix 6: Station tracks default to 320. No Hi-Res implication.
                                const wrappedSongs = newUnique.map(s => ensurePlayableTrack(s, '320'));
                                updateMix(currentMix.id, { songs: [...currentMix.songs, ...wrappedSongs] });
                            }
                        }
                    }
                }).catch(err => {
                    console.error("[Autoplay] Failed to fetch station:", err);
                    isStationGenerating.current = false;
                    autoplayFetchedRef.current = null; // Retry capable?
                });
            }
        }
    }, [progress, duration, activeMixId, isPlaying, currentSong, updateMix, bitrate]);

    const loadMix = useCallback((mixId: string) => {
        console.log("[loadMix] Called with:", mixId, "current:", activeMixId);

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

        // Delay to let state update and audio engine clear
        setTimeout(() => setIsPlaying(true), 150);
    }, [activeMixId]);

    const playInstantMix = useCallback((mix: Mix) => {
        console.log("[playInstantMix] Atomic play for:", mix.title);

        // 1. Update Mixes (Add or Replace)
        setMixes(prev => {
            const exists = prev.some(m => m.id === mix.id);
            if (exists) {
                return prev.map(m => m.id === mix.id ? mix : m);
            }
            // Logic to maintain 8 mix limit could be here, but for "Instant Play" (usually On-the-Go), we force it.
            return [...prev, mix];
        });

        // 2. Set Active Mix
        setActiveMixId(mix.id);

        // 3. Reset Player State immediately
        setIsPlaying(false);
        setCurrentSongUrl(null);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.seekTo(0);
            audioPlayerRef.current.pause();
        }

        // 4. Schedule Play (Need short tick for React state to propagate)
        setTimeout(() => {
            setIsPlaying(true);
        }, 100);
    }, []);

    const play = useCallback(() => {
        console.log("[play] Called, activeMixId:", activeMixId);
        if (!activeMixId) return;
        setIsPlaying(true);
        audioPlayerRef.current?.play();
    }, [activeMixId]);

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
        const currentBitrate = bitrate as AudioQuality;
        const track = ensurePlayableTrack(songOrTrack, currentBitrate);

        const songMetadata = track.song;

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
                const query = `${track.song.name} ${track.song.primaryArtists}`;
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
        const songName = track.song.name;
        // 1. Strict Request: Use explicit preference if set, otherwise default to context bitrate
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
                        if (q !== targetQ) {
                            showToast(`Playing Offline ${q} (Requested ${targetQ})`, 'info');
                        }
                        return { url, quality: q };
                    }
                }
            } catch { /* ignore */ }
        }

        // --- PHASE 2: ONLINE (Exact -> Lower) ---
        for (const q of degradationPath) {
            // Check if this quality step requires HiFi or JioSaavn
            // HiFi: hires, flac
            // JioSaavn: 320, 160, 96
            const isHiFi = q === 'hires' || q === 'flac';

            let result: { url: string, quality: AudioQuality, keyName?: string } | null = null;

            if (isHiFi) {
                // Try HiFi Source
                result = await tryHiFi(track, true); // Allow search
                // Verify result matches q (search might return diff quality)
                if (result && result.quality !== q && degradationPath.indexOf(result.quality) === -1) {
                    // Result implies success but quality might be lower than current step? 
                    // tryHiFi returns what it found. If we are asking for 'flac' and it finds 'flac', good.
                    // If we ask for 'hires' and it finds 'flac', that corresponds to the NEXT step in loop.
                    // So we should only accept if it matches Q, OR if we rely on loop to find it naturally?
                    // Optimization: If tryHiFi found *something* valid in our path, take it.
                    if (degradationPath.includes(result.quality)) {
                        // Accept it, but let the loop logic/toast handle exact match check?
                        // Actually, if we found 'flac' while looking for 'hires', we can just return it 
                        // and let the downgrade toast trigger below.
                    } else {
                        result = null;
                    }
                }
            } else {
                // Try JioSaavn
                result = await tryJioSaavn(track.song, q);
            }

            if (result) {
                console.log(`[Resolver] ✓ Online Success: ${result.quality}`);

                // --- TRUTH TOAST ---
                if (result.quality !== targetQ) {
                    const prettyReq = targetQ === 'flac' ? 'FLAC' : targetQ === 'hires' ? 'Hi-Res' : targetQ;
                    const prettyGot = result.quality === 'flac' ? 'FLAC' : result.quality === 'hires' ? 'Hi-Res' : result.quality;
                    showToast(`Streaming ${prettyGot} (${prettyReq} unavailable)`, 'info');
                }

                return result;
            }
        }

        console.error(`[Resolver] ✗ All Resolvers Failed`);
        return null;
    }, [showToast]);

    const loadSongUrl = useCallback(async (songOrTrack: JioSaavnSong | PlayableTrack | undefined, overrideQuality?: string) => {
        // Cleanup old URL if it's a blob to prevent memory leaks
        setCurrentSongUrl((prevUrl) => {
            if (prevUrl && prevUrl.startsWith('blob:')) {
                OfflineStore.revokeUrl(prevUrl);
            }
            return null; // Temporarily clear while loading
        });
        currentStreamKeyRef.current = null; // Reset key ref

        if (!songOrTrack) {
            return;
        }

        const requestId = ++loadRequestId.current;
        const targetBitrate = (overrideQuality as AudioQuality) || (bitrate as AudioQuality);

        // Ensure we have a PlayableTrack
        let track = ensurePlayableTrack(songOrTrack, targetBitrate);

        // --- PREFERENCE LOGIC ---
        // 1. If overrideQuality is passed (e.g. user toggled setting while playing), force it.
        if (overrideQuality) {
            track = { ...track, preferredQuality: targetBitrate, isExplicitPreference: true };
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
                track = { ...songOrTrack, preferredQuality: targetBitrate }; // Apply global default
            }
        } else {
            // Raw song: Apply global targetBitrate
            track = { ...track, preferredQuality: targetBitrate };
        }

        const songSource = `${track.song.name} (${track.id}) [${track.preferredQuality}]`;

        // 3. FETCH URL (Unified via Resolver now)
        try {
            // 4. Fallback to Stream API for non-standard tracks (e.g. video types)
            const isVideo = track.song.type === 'video';

            if (isVideo) {
                // Video logic placeholder
            }

            // CRITICAL FIX: Always resolve URL just-in-time
            console.log(`[Playback] Resolving JIT URL for: ${track.song.name} (Preferred: ${track.preferredQuality})`);

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
                setCurrentSongUrl(result.url);
                if (result.keyName) {
                    currentStreamKeyRef.current = result.keyName;
                    console.log(`[Playback] Active Key: ${result.keyName}`);
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

    }, [bitrate, resolvePlayableUrl]);







    const setBitrate = useCallback((newBitrate: 'flac' | '320' | '160' | '96') => {
        setSelectBitrate(newBitrate);
        saveSettings({ bitrate: newBitrate });
        if (currentSong) {
            // Check if we need to reload logic or just URL
            // Simply re-loading URL with new bitrate preference
            loadSongUrl(currentSong, newBitrate);
        }
    }, [currentSong, loadSongUrl]);

    // Effect to load URL when song changes
    useEffect(() => {
        if (currentSong) {
            loadSongUrl(currentSong);

            // SponsorBlock: Fetch segments if it looks like a YouTube ID
            setSkipSegments([]);
            if (currentSong.id && currentSong.id.length === 11 && !currentSong.id.includes('-') && !currentSong.id.includes(' ')) {
                getSkipSegments(currentSong.id).then(segs => {
                    if (segs.length > 0) console.log(`Loaded ${segs.length} skip segments`);
                    setSkipSegments(segs);
                });
            } else if (currentSong.type === 'video') {
                // Explicit video type from my hybrid search
                getSkipSegments(currentSong.id).then(setSkipSegments);
            }
        } else {
            setCurrentSongUrl(null);
            setSkipSegments([]);
        }
    }, [currentSong, loadSongUrl]);

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

    // Crossfade Logic
    useEffect(() => {
        if (!audioPlayerRef.current || crossfadeDuration === 0 || !isPlaying) return;

        // Ensure we have valid numbers
        if (!duration || !progress) return;

        const remaining = duration - progress;

        // Fade Out at end
        if (remaining <= crossfadeDuration) {
            const fadeVol = volume * (remaining / crossfadeDuration);
            audioPlayerRef.current.setVolume(Math.max(0, fadeVol));
        }
        // Fade In at start
        else if (progress <= crossfadeDuration) {
            const fadeVol = volume * (progress / crossfadeDuration);
            audioPlayerRef.current.setVolume(Math.min(volume, fadeVol));
        }
        else {
            // Normal volume check (simple throttle could be added but this is OK for 5Hz)
            audioPlayerRef.current.setVolume(volume);
        }
    }, [progress, duration, crossfadeDuration, volume, isPlaying]);

    const next = useCallback(() => {
        // forceLossless removed - quality is now controlled by bitrate setting only

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
        const nextSong = isPlayableTrack(nextItem) ? nextItem.song : nextItem;

        console.log("[Next] Advancing to:", nextSong.name);

        // Optimistic update
        updateMix(activeMix.id, { currentSongIndex: nextIndex });
        // Use timeout to allow state to settle? Not strictly needed if `updateMix` triggers effect.
        if (!isPlaying) setIsPlaying(true);
    }, [repeat, shuffle, isPlaying, updateMix, stopAtEndOfSong, pause]);

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

                // Signal: Verified Play (>10s)
                SignalStore.addSignal(trackToSave, 'PLAY');

                // LOOPHOLE FIX: Sync to "Discovery Mix" (Global History Tape)
                // If the user has a Discovery Mix tape, we append this song to it so it tracks ALL playback.
                setMixes(prev => {
                    const discMix = prev.find(m => m.id === DISCOVERY_MIX_ID);
                    if (!discMix) return prev; // Don't force-create if deleted

                    // Prevent duplicate tail (Stop "Double Song" echo)
                    const lastSong = discMix.songs[discMix.songs.length - 1];
                    // Normalize for fuzzy comparison logic
                    const normalize = (str: string) => str?.toLowerCase().split('(')[0].replace(/[^a-z0-9]/g, '') || '';

                    if (lastSong) {
                        const lastId = isPlayableTrack(lastSong) ? lastSong.id : lastSong.id;
                        if (lastId === trackToSave.id) return prev;

                        // Fuzzy Check
                        const s1 = isPlayableTrack(lastSong) ? lastSong.song : lastSong;
                        const s2 = trackToSave.song;
                        const k1 = normalize(s1.name) + normalize(s1.primaryArtists);
                        const k2 = normalize(s2.name) + normalize(s2.primaryArtists);
                        if (k1 === k2) return prev;
                    }

                    // Append and slice to last 50
                    const newSongs = [...discMix.songs, trackToSave].slice(-50); // Keep last 50

                    return prev.map(m => m.id === DISCOVERY_MIX_ID ? {
                        ...m,
                        songs: newSongs,
                        // Update index so we are at the end? 
                        // If we are currently playing FROM this mix, currentIndex updates automatically via logic?
                        // If we are playing "My Tape 1", activeMix is "My Tape 1".
                        // modifying "discovery-mix" (inactive) doesn't affect playback.
                        // If we ARE playing "discovery-mix", this update might cause re-render?
                        // If activeMixId === 'discovery-mix', we are appending to current mix.
                        // Playback engine handles index. We shouldn't mess up currentSongIndex if active.
                        // If active, we probably shouldn't slice off the *currently playing* song.
                        // Safe logic: Just append.
                    } : m);
                });

            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [currentSong?.id, isPlaying, rawCurrentItem]);

    const seek = useCallback((amount: number) => {
        audioPlayerRef.current?.seekTo(amount);
    }, []);


    // We also need to ensure currentSong matches what's actually playing if we are in a mix
    // The state `currentSong` is set by effects, but let's trust it.

    // Ensure currentSong derived from mix is unwrapped if needed?
    // Actually currentSong is state. We need to make sure wherever setCurrentSong is called, we unwrap.
    // Check `loadMix`, `next`, `prev` etc.
    // We already fixed `next` logic earlier.

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

        const loadNext = async () => {
            try {
                // We want to preload the NEXT song with the SAME quality settings as current? Or per its pref?
                // Logic: Resolve using same robust logic as loadSongUrl but simplified for preloading string.
                const track = ensurePlayableTrack(nextItem, bitrate as AudioQuality);

                // Use Resolver
                const result = await resolvePlayableUrl(track);
                if (!cancelled && result?.url) {
                    setNextSongUrl(result.url);
                }
            } catch (e) {
                console.warn("Failed to preload next song", e);
            }
        };

        loadNext();

        return () => { cancelled = true; };
    }, [activeMixId, mixes, bitrate, resolvePlayableUrl, currentSong?.id, currentSongUrl]); // Re-run when current song changes (index shift) or settings change

    // Define currentTrack derived value correctly
    // If raw item is PlayableTrack, use it. If not, upgrade it with current Global Preference.
    const currentTrack = useMemo(() => {
        if (!rawCurrentItem) return undefined;
        if (isPlayableTrack(rawCurrentItem)) return rawCurrentItem;
        return ensurePlayableTrack(rawCurrentItem, bitrate as AudioQuality);
    }, [rawCurrentItem, bitrate]);



    // Normalize queue for UI
    const queue = (activeMix?.songs || []).map(s => isPlayableTrack(s) ? s.song : s);
    const currentIndex = activeMix?.currentSongIndex || 0;

    // We also need to ensure currentSong matches what's actually playing if we are in a mix

    const setQueue = useCallback((newQueue: (JioSaavnSong | PlayableTrack)[]) => {
        if (newQueue.length === 0) {
            setIsPlaying(false);
            setActiveMixId(null);
            setCurrentSongUrl(null);
            audioPlayerRef.current?.pause();
        }
    }, []);

    const value = {
        mixes, activeMixId, isPlaying, currentSong, currentTrack, volume, progress, duration, shuffle, repeat,
        setMixes,
        setQueue,
        loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,

        addMix,
        updateMix,
        deleteMix,
        isLoaded: true,
        activeMix,

        queue: activeMix?.songs || [],
        currentIndex: activeMix?.currentSongIndex || 0,

        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration,
        bitrate, setBitrate,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        likedSongs, toggleLike, isLiked,
        recentlyPlayed,
        playbackSpeed, setPlaybackSpeed,
        eq,
        downloadSong, removeDownload, isDownloaded,
        playInstantMix
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
                crossfadeDuration={crossfadeDuration}
                eqBands={eq.isEnabled ? eq.bands : undefined} // Only pass bands if enabled
                onEnded={() => {
                    if (currentSong) recordPlay(currentSong, duration);
                    next();
                }}
                onProgress={({ played, playedSeconds }) => {
                    setProgress(playedSeconds);

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
                title={cleanTrackTitle(decodeHtml(currentSong?.name || ""))}
                artist={decodeHtml(currentSong?.primaryArtists || "")}
                album={decodeHtml(currentSong?.album?.name || "")}
                artwork={currentSong?.image?.[0]?.link}
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

