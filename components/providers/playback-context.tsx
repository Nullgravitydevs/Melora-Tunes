"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { JioSaavnSong, getAudioUrl, getStation } from "@/lib/jiosaavn";
import { AudioPlayer, AudioPlayerRef } from "@/components/ui/audio-player";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { recordPlay } from "@/lib/stats";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getSkipSegments, SkipSegment } from "@/lib/sponsorblock";
import { useEqualizer } from "@/hooks/useEqualizer";
import { OfflineStore } from "@/lib/offline-store";

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red" | "blue" | "cyan" | "pink" | "teal" | "yellow" | "black";
    songs: JioSaavnSong[];
    currentSongIndex: number;
}

interface PlaybackContextType {
    // State
    mixes: Mix[];
    activeMixId: string | null; // The mix currently "inserted" in the player
    isPlaying: boolean;
    currentSong: JioSaavnSong | undefined;
    volume: number;
    progress: number;
    duration: number;
    shuffle: boolean;
    repeat: 'off' | 'one' | 'all';

    // Actions
    setMixes: (mixes: Mix[]) => void;
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

    // Queue
    queue: JioSaavnSong[];
    currentIndex: number;

    // Sleep Timer
    sleepTimer: { endTime: number; duration: number } | null;
    setSleepTimer: (timer: { endTime: number; duration: number } | null) => void;

    // Crossfade (Fade out/in duration in seconds)
    crossfadeDuration: number;
    setCrossfadeDuration: (duration: number) => void;

    // Audio Quality
    bitrate: 'flac' | '320' | '160' | '96' | '48' | '12';
    setBitrate: (bitrate: 'flac' | '320' | '160' | '96' | '48' | '12') => void;

    // Hi-Res Override
    forceLossless: boolean;
    setForceLossless: (val: boolean) => void;

    // End of Song Timer
    stopAtEndOfSong: boolean;
    setStopAtEndOfSong: (val: boolean) => void;

    // Desktop Notifications
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => void;

    // Liked Songs
    likedSongs: JioSaavnSong[];
    toggleLike: (song: JioSaavnSong) => void;
    isLiked: (songId: string) => boolean;

    // Recently Played
    // Recently Played
    recentlyPlayed: JioSaavnSong[];

    // Playback Speed
    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;

    // Equalizer
    eq: ReturnType<typeof useEqualizer>;

    // Offline / Downloads
    downloadSong: (song: JioSaavnSong) => Promise<boolean>;
    removeDownload: (songId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
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
    const [isLoaded, setIsLoaded] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
    const [bitrate, setSelectBitrate] = useState<'flac' | '320' | '160' | '96' | '48' | '12'>('320'); // Default 320 for init
    const [forceLossless, setForceLossless] = useState(false);
    const [sleepTimer, setSleepTimer] = useState<{ endTime: number; duration: number } | null>(null);
    const [crossfadeDuration, setCrossfadeDuration] = useState(0); // 0 = off
    const [stopAtEndOfSong, setStopAtEndOfSong] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [likedSongs, setLikedSongs] = useState<JioSaavnSong[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<JioSaavnSong[]>([]);

    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 0.75, 1, 1.25, 1.5, 2
    const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

    // EQ Hook
    const eq = useEqualizer();

    // Audio Hooks/Refs
    const audioPlayerRef = useRef<AudioPlayerRef>(null);

    // Derived State
    const activeMix = mixes.find(m => m.id === activeMixId);
    const currentSong = activeMix?.songs[activeMix.currentSongIndex];

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('melora-mixes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Sanitize: Remove mock songs and unwanted default playlists
                const sanitized = parsed.map((m: Mix) => ({
                    ...m,
                    songs: m.songs.filter(s => !s.id.startsWith('mock-') && !s.name.startsWith('Track '))
                })).filter((m: Mix) => !['Pawan Kalyan Hits', 'DSP Hits', 'Megastar Hits', 'Yuvan Shankar Raja'].includes(m.title));

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
    const toggleLike = useCallback((song: JioSaavnSong) => {
        setLikedSongs(prev => {
            const exists = prev.some(s => s.id === song.id);
            if (exists) {
                return prev.filter(s => s.id !== song.id);
            } else {
                return [song, ...prev];
            }
        });
    }, []);

    // --- Autoplay & Pre-fetch Logic ---
    // Tracks if we have already fetched recommendations for the current song to avoid duplicates
    const autoplayFetchedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeMixId || !isPlaying || duration <= 0 || !currentSong) return;

        // Reset fetcher if song changed
        if (autoplayFetchedRef.current !== currentSong.id) {
            autoplayFetchedRef.current = null;
        }

        // Trigger 20 seconds before end (or 50% for short songs)
        const threshold = Math.max(duration - 20, duration * 0.5);

        if (progress >= threshold && !autoplayFetchedRef.current) {
            const activeMix = mixes.find(m => m.id === activeMixId);
            // Only fetch if we are actually at the end of the queue
            if (activeMix && activeMix.currentSongIndex >= activeMix.songs.length - 1) {
                console.log("[Autoplay] Pre-fetching recommendations for:", currentSong.name);
                autoplayFetchedRef.current = currentSong.id; // Mark as fetching

                getStation(currentSong.id).then((stationSongs) => {
                    if (stationSongs && stationSongs.length > 0) {
                        const currentMix = mixesRef.current.find(m => m.id === activeMixId);
                        if (currentMix) {
                            // Filter duplicates
                            const newUnique = stationSongs.filter(s => !currentMix.songs.some(existing => existing.id === s.id));
                            if (newUnique.length > 0) {
                                console.log(`[Autoplay] Added ${newUnique.length} tracks to queue`);
                                updateMix(activeMixId, { songs: [...currentMix.songs, ...newUnique] });
                            }
                        }
                    }
                }).catch(err => {
                    console.error("[Autoplay] Failed to fetch station:", err);
                    autoplayFetchedRef.current = null; // Reset on failure to retry
                });
            }
        }
    }, [progress, duration, activeMixId, isPlaying, currentSong]);

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

    // Use ref to track current mixes for synchronous checks in addMix
    const mixesRef = useRef(mixes);
    useEffect(() => {
        mixesRef.current = mixes;
    }, [mixes]);

    // Helpers defined first (hoisted manually) to be available for next/prev
    const addMix = useCallback((mix: Mix) => {
        console.log("Adding mix. Current count:", mixesRef.current.length);
        if (mixesRef.current.length >= 8) {
            console.log("Limit blocked.");
            return false;
        }
        setMixes(prev => [...prev, mix]);
        return true;
    }, []);

    const updateMix = useCallback((mixId: string, updates: Partial<Mix>) => {
        setMixes(prev => {
            const nextMixes = prev.map(m => {
                if (m.id !== mixId) return m;

                // If updating songs, check if we need to handle playback state
                if (updates.songs && activeMixId === mixId) {
                    const currentSong = m.songs[m.currentSongIndex];
                    const newSongs = updates.songs;

                    // If current song is no longer in the new list (deleted)
                    const stillExists = currentSong && newSongs.some(s => s.id === currentSong.id);

                    if (!stillExists) {
                        console.log("[updateMix] Current song deleted, stopping playback");
                        // We can't call setIsPlaying/setCurrentSongUrl here directly cleanly inside the updater
                        // but we can schedule it.
                        setTimeout(() => {
                            setIsPlaying(false);
                            setCurrentSongUrl(null);
                            if (audioPlayerRef.current) audioPlayerRef.current.seekTo(0);
                        }, 0);

                        // Also reset index to 0 or valid range
                        return { ...m, ...updates, currentSongIndex: 0 };
                    }
                }

                return { ...m, ...updates };
            });
            return nextMixes;
        });
    }, [activeMixId]);

    const deleteMix = (mixId: string) => {
        setMixes(prev => prev.filter(m => m.id !== mixId));
        if (activeMixId === mixId) {
            setActiveMixId(null);
            setIsPlaying(false);
        }
    };

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
        // Hydrate downloaded state on mount
        OfflineStore.getAllDownloadedSongs().then(songs => {
            setDownloadedIds(new Set(songs.map(s => s.id)));
        });
    }, []);

    const isDownloaded = useCallback((songId: string) => downloadedIds.has(songId), [downloadedIds]);

    const downloadSong = useCallback(async (song: JioSaavnSong) => {
        try {
            // Get URL - force 320 or best available
            const url = await getAudioUrl(song, '320');
            if (url) {
                await OfflineStore.saveSong(song, url);
                setDownloadedIds(prev => new Set(prev).add(song.id));
                return true;
            }
            return false;
        } catch (e) {
            console.error("Download failed", e);
            return false;
        }
    }, []);

    const removeDownload = useCallback(async (songId: string) => {
        await OfflineStore.removeSong(songId);
        setDownloadedIds(prev => {
            const next = new Set(prev);
            next.delete(songId);
            return next;
        });
    }, []);

    const loadSongUrl = useCallback(async (song: JioSaavnSong, overrideBitrate?: string) => {
        // 1. Check Offline Storage FIRST
        if (downloadedIds.has(song.id)) {
            console.log(`[Playback] Playing from Offline Storage: ${song.name}`);
            const blobUrl = await OfflineStore.getSongUrl(song.id);
            if (blobUrl) {
                setCurrentSongUrl(blobUrl);
                return;
            }
        }

        // Helper to detect YouTube ID (11 chars, alphanumeric + underscore/hyphen)
        const isYouTubeId = (id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id);

        // Check for HiFi tracks (Tidal/Qobuz)
        // Check explicit source OR quality tags (for legacy mixes where source might be missing)
        let songSource = (song as any)?.source as string | undefined;
        const qualityTag = (song as any)?._quality;
        const isHiFi = songSource === 'tidal' || songSource === 'qobuz' || qualityTag === 'FLAC' || qualityTag === '24-bit';

        if (isHiFi) {
            // Fallback: If source is missing but we know it's HiFi, default to Tidal (common) 
            // or we could check ID pattern eventually.
            if (!songSource) {
                console.warn("[Playback] HiFi track missing source, defaulting to Tidal");
                songSource = 'tidal';
            }

            console.log(`[Playback] Loading ${songSource?.toUpperCase()} LOSSLESS stream for:`, song.name, { id: song.id, quality: qualityTag });
            try {
                const res = await fetch(`/api/hifi?type=stream&id=${song.id}&source=${songSource}`);
                if (!res.ok) throw new Error(`HiFi API error: ${res.status}`);
                const data = await res.json();
                if (data.url) {
                    console.log(`[Playback] ✓ Got ${data.quality} stream`);
                    setCurrentSongUrl(data.url);
                    return;
                }
            } catch (err) {
                console.warn(`[Playback] ${songSource} stream failed:`, err);
                // FALLBACK LOGIC
                // Check if we have a fallback ID injected by the smart engine
                const fallbackId = (song as any).saavnFallbackId;
                if (fallbackId) {
                    console.log("[Playback] ⚠️ Falling back to JioSaavn 320kbps...", fallbackId);
                    // Create a mock song object for the fallback request
                    // We reuse the existing metadata but with the fallback ID
                    const fallbackSong = { ...song, id: fallbackId, encryptedMediaUrl: "FETCH_REQUIRED" };
                    // Fetch actual details to get encrypted url
                    // But getAudioUrl expects the object to have it.
                    // We need to fetch details first? 
                    // Actually, we can just call loadSongUrl recursively if we had the full object
                    // But we don't. We just have ID.
                    // Quickest path: Call getSongDetails or just try to getAudioUrl if we have the MediaUrl (we don't)

                    // Optimization: If we can, we should have injected the MediaURL too.
                    // But for now, let's just fail gracefully to "Web Search" fallback 
                    // OR better: Just skip to next if we can't play? 
                    // No, "Smart Engine" promised fallback.

                    // Let's rely on the native scraper to get the fallback link quickly?
                    // Or just try to construct the URL if we had it?
                    // We don't have encryptedURL.
                    // So we must fetch it.

                    // IMPLEMENTATION:
                    // 1. Fetch JioSaavn Details for fallbackId
                    // 2. Play that.
                    try {
                        // Import dynamically or assume global fetch to our API? 
                        // We are in Context. We can use our /api/song route.
                        const fbRes = await fetch(`/api/song?id=${fallbackId}`);
                        const fbData = await fbRes.json();
                        if (fbData.encrypted_media_url) {
                            const { getAudioUrl } = require('@/lib/jiosaavn'); // Dynamic import to avoid cycles/issues? 
                            // Or just use the imported one at top of file
                            const fbUrl = await getAudioUrl({ ...fbData, encryptedMediaUrl: fbData.encrypted_media_url }, '320');
                            if (fbUrl) {
                                console.log("[Playback] Fallback success!");
                                setCurrentSongUrl(fbUrl);
                                return;
                            }
                        }
                    } catch (e) { console.error("Fallback failed too", e); }
                }

                setCurrentSongUrl(null);
                setIsPlaying(false);
                return;
            }
        }

        // Check if this is a YouTube track (no encrypted URL but valid YT ID, or explicit video type)
        const isYouTubeTrack = !song?.encryptedMediaUrl && isYouTubeId(song?.id || '') || song?.type === 'video';

        if (isYouTubeTrack && song?.id) {
            // Fetch from YouTube stream API
            console.log("[Playback] Loading YouTube stream for:", song.name);
            try {
                const res = await fetch(`/api/stream?id=${song.id}`);
                if (!res.ok) throw new Error(`Stream API error: ${res.status}`);
                const data = await res.json();
                if (data.url) {
                    setCurrentSongUrl(data.url);
                    return;
                }
            } catch (err) {
                console.warn("[Playback] YouTube stream failed, track may be unavailable:", err);
                setCurrentSongUrl(null);
                setIsPlaying(false);
                return;
            }
        }

        // JioSaavn track - validate encrypted URL
        if (!song?.encryptedMediaUrl) {
            console.warn('Song missing encryptedMediaUrl, skipping:', song?.name || 'Unknown');
            setCurrentSongUrl(null);
            setIsPlaying(false);
            return;
        }

        try {
            // Use provided bitrate or current state.
            // If forceLossless is true (Hi-Res track detected), prefer 'flac'.
            // Otherwise respect user setting.
            const targetBitrate = forceLossless ? 'flac' : (overrideBitrate || bitrate);
            const url = await getAudioUrl(song, targetBitrate as any);
            if (url) {
                setCurrentSongUrl(url);
            } else {
                console.warn("No URL found for song", song.name);
                setCurrentSongUrl(null);
                setIsPlaying(false);
            }
        } catch (err) {
            console.warn("Failed to load song URL", err);
            setCurrentSongUrl(null);
            setIsPlaying(false);
        }
    }, [bitrate]);

    const setBitrate = useCallback((newBitrate: 'flac' | '320' | '160' | '96' | '48' | '12') => {
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
        setForceLossless(false); // Reset Hi-Res override on auto-play
        console.log("[NEXT] Called", {
            activeMix: activeMix?.title,
            songCount: activeMix?.songs?.length,
            currentIndex: activeMix?.currentSongIndex,
            activeMixId,
            stopAtEndOfSong
        });

        // End of Song Check
        if (stopAtEndOfSong) {
            pause();
            setStopAtEndOfSong(false); // Reset flag
            return;
        }

        if (!activeMix) {
            console.warn("[NEXT] No activeMix, returning");
            return;
        }

        console.log("NEXT called", {
            current: activeMix.currentSongIndex,
            len: activeMix.songs.length,
            shuffle,
            repeat
        });

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
                    nextIndex = 0; // Reset to start
                    updateMix(activeMix.id, { currentSongIndex: 0 });
                    return;
                } else {
                    // Repeat All -> Loop
                    nextIndex = 0;
                }
            }
        }

        console.log("Going to index:", nextIndex);
        updateMix(activeMix.id, { currentSongIndex: nextIndex });
        if (!isPlaying) setIsPlaying(true); // Ensure play continues
    }, [activeMix, repeat, shuffle, isPlaying, updateMix, stopAtEndOfSong, pause]);

    const prev = useCallback(() => {
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
    }, [activeMix, shuffle, updateMix]);

    const seek = useCallback((amount: number) => {
        audioPlayerRef.current?.seekTo(amount);
    }, []);



    const nextIndex = activeMix ? (activeMix.currentSongIndex + 1) % activeMix.songs.length : 0;
    const nextSong = activeMix?.songs[nextIndex];
    const nextSongUrl = nextSong?.downloadUrl?.find((d: any) => d.quality === bitrate)?.link || nextSong?.downloadUrl?.[4]?.link || nextSong?.downloadUrl?.[0]?.link || null;

    return (
        <PlaybackContext.Provider value={{
            mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
            setMixes, loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
            addMix, updateMix, deleteMix, isLoaded, activeMix,
            shuffle, setShuffle, repeat, setRepeat,
            queue: activeMix?.songs || [],
            currentIndex: activeMix?.currentSongIndex || 0,
            sleepTimer, setSleepTimer,
            crossfadeDuration, setCrossfadeDuration,
            stopAtEndOfSong, setStopAtEndOfSong,
            bitrate, setBitrate,
            forceLossless, setForceLossless,
            notificationsEnabled, setNotificationsEnabled,
            likedSongs, toggleLike, isLiked,
            recentlyPlayed,
            playbackSpeed, setPlaybackSpeed,
            eq,
            downloadSong, removeDownload, isDownloaded
        }}>
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
                title={cleanTrackTitle(decodeHtml(currentSong?.name || ""))}
                artist={decodeHtml(currentSong?.primaryArtists || "")}
                album={decodeHtml(currentSong?.album?.name || "")}
                artwork={currentSong?.image?.[0]?.link}
            />
        </PlaybackContext.Provider>
    );
}

export function usePlayback() {
    const context = useContext(PlaybackContext);
    if (context === undefined) {
        throw new Error("usePlayback must be used within a PlaybackProvider");
    }
    return context;
}

