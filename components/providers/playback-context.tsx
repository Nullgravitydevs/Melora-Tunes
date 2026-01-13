"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { JioSaavnSong, getAudioUrl } from "@/lib/jiosaavn";
import { useAudio } from "@/hooks/use-audio";
import { AudioPlayer, AudioPlayerRef } from "@/components/ui/audio-player";
import { decodeHtml } from "@/lib/utils";
import { loadSettings, saveSettings } from "@/lib/settings";

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red";
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
    addMix: (mix: Mix) => void;
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
    bitrate: '320' | '160' | '96' | '48' | '12';
    setBitrate: (bitrate: '320' | '160' | '96' | '48' | '12') => void;

    // End of Song Timer
    stopAtEndOfSong: boolean;
    setStopAtEndOfSong: (val: boolean) => void;
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
    const [bitrate, setSelectBitrate] = useState<'320' | '160' | '96' | '48' | '12'>('320'); // Default 320 for init
    const [sleepTimer, setSleepTimer] = useState<{ endTime: number; duration: number } | null>(null);
    const [crossfadeDuration, setCrossfadeDuration] = useState(0); // 0 = off
    const [stopAtEndOfSong, setStopAtEndOfSong] = useState(false);

    // Audio Hooks/Refs
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const { playClick, playClunk, playEject, playInsert } = useAudio();

    // Derived State
    const activeMix = mixes.find(m => m.id === activeMixId);
    const currentSong = activeMix?.songs[activeMix.currentSongIndex];

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('melora-mixes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Sanitize: Remove mock songs from persistence
                const sanitized = parsed.map((m: Mix) => ({
                    ...m,
                    songs: m.songs.filter(s => !s.id.startsWith('mock-') && !s.name.startsWith('Track '))
                }));
                setMixes(sanitized);
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
            { id: "1", title: "Pawan Kalyan Hits", color: "orange", songs: [], currentSongIndex: 0 },
            { id: "2", title: "DSP Specials", color: "purple", songs: [], currentSongIndex: 0 },
        ]);
    };

    // --- Actions ---

    // Helpers defined first (hoisted manually) to be available for next/prev
    const addMix = (mix: Mix) => setMixes(prev => [...prev, mix]);

    const updateMix = useCallback((mixId: string, updates: Partial<Mix>) => {
        setMixes(prev => prev.map(m => m.id === mixId ? { ...m, ...updates } : m));
    }, []);

    const deleteMix = (mixId: string) => {
        setMixes(prev => prev.filter(m => m.id !== mixId));
        if (activeMixId === mixId) {
            setActiveMixId(null);
            setIsPlaying(false);
            playEject();
        }
    };

    const loadMix = useCallback((mixId: string) => {
        if (activeMixId === mixId) return; // Already loaded
        playInsert();
        setActiveMixId(mixId);
        setIsPlaying(true);
    }, [activeMixId, playInsert]);

    const play = useCallback(() => {
        if (!activeMixId) return;
        playClick();
        setIsPlaying(true);
    }, [activeMixId, playClick]);

    const pause = useCallback(() => {
        playClick();
        setIsPlaying(false);
    }, [playClick]);

    const togglePlay = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, pause, play]);

    const loadSongUrl = useCallback(async (song: JioSaavnSong, overrideBitrate?: string) => {
        // Validate song has encrypted URL before attempting to play
        if (!song?.encryptedMediaUrl) {
            console.warn('Song missing encryptedMediaUrl, skipping:', song?.name || 'Unknown');
            // Don't set URL, player will stay paused
            setCurrentSongUrl(null);
            return;
        }

        try {
            // Use provided bitrate or current state
            const targetBitrate = overrideBitrate || bitrate;
            const url = await getAudioUrl(song, targetBitrate as any);
            if (url) {
                setCurrentSongUrl(url);
            } else {
                console.warn("No URL found for song", song.name);
                setCurrentSongUrl(null);
            }
        } catch (err) {
            console.warn("Failed to load song URL", err);
            setCurrentSongUrl(null);
        }
    }, []);

    const setBitrate = useCallback((newBitrate: '320' | '160' | '96' | '48' | '12') => {
        setSelectBitrate(newBitrate);
        saveSettings({ bitrate: newBitrate });
        if (currentSong) {
            loadSongUrl(currentSong, newBitrate);
        }
    }, [currentSong, loadSongUrl]);

    // Effect to load URL when song changes
    useEffect(() => {
        if (currentSong) {
            loadSongUrl(currentSong);
        } else {
            setCurrentSongUrl(null);
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
        // End of Song Check
        if (stopAtEndOfSong) {
            pause();
            setStopAtEndOfSong(false); // Reset flag
            return;
        }

        if (!activeMix) return;
        playClick();

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
                    nextIndex = 0; // Reset to start but don't play? Or just stay at end?
                    // Typically iPod goes to menu or resets to 0. 
                    // Let's reset to 0 and stop.
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
    }, [activeMix, repeat, shuffle, isPlaying, updateMix]);  // Dependencies updated

    const prev = useCallback(() => {
        if (!activeMix) return;
        playClick();

        // If played > 3s, restart song
        if (audioPlayerRef.current && (audioPlayerRef.current.getCurrentTime() || 0) > 3) {
            audioPlayerRef.current.seekTo(0);
            return;
        }

        // Shuffle Previous: For now, just go to random or previous order. 
        // True iPod shuffle history is complex. 
        // Simple approach: if shuffle, pick random.
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
            bitrate, setBitrate
        }}>
            {children}

            {/* Global Audio Element */}
            <AudioPlayer
                ref={audioPlayerRef}
                url={currentSongUrl}
                playing={isPlaying}
                volume={volume}
                onEnded={next}
                onProgress={({ played }) => setProgress(played)}
                onDuration={setDuration}
                title={decodeHtml(currentSong?.name || "")}
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

