"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';

interface AudioPlayerProps {
    url: string | null;
    nextUrl?: string | null;
    playing: boolean;
    volume: number;
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
    onEnded: () => void;
    onProgress: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
    onDuration: (duration: number) => void;
    onError?: (message: string) => void;
    onNext?: () => void;
    onPrev?: () => void;
    onPlayToggle?: () => void;
}

export interface AudioPlayerRef {
    seekTo: (amount: number) => void;
    getCurrentTime: () => number;
    play: () => void;
    pause: () => void;
    setVolume: (vol: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({
    url,
    nextUrl,
    playing,
    volume,
    title,
    artist,
    album,
    artwork,
    onEnded,
    onProgress,
    onDuration,
    onError,
    onNext,
    onPrev,
    onPlayToggle: onPlayPause
}, ref) => {
    const primaryRef = useRef<HTMLAudioElement>(null);
    const secondaryRef = useRef<HTMLAudioElement>(null);
    const [activeId, setActiveId] = useState<'primary' | 'secondary'>('primary');
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const getActive = useCallback(() => activeId === 'primary' ? primaryRef.current : secondaryRef.current, [activeId]);
    const getInactive = useCallback(() => activeId === 'primary' ? secondaryRef.current : primaryRef.current, [activeId]);

    useImperativeHandle(ref, () => ({
        seekTo: (amount: number) => {
            const active = getActive();
            if (active) {
                if (active.duration) {
                    active.currentTime = amount * active.duration;
                } else if (amount === 0) {
                    active.currentTime = 0;
                }
            }
        },
        getCurrentTime: () => getActive()?.currentTime || 0,
        play: () => getActive()?.play().catch(() => { }),
        pause: () => getActive()?.pause(),
        setVolume: (vol: number) => {
            const active = getActive();
            if (active) active.volume = vol;
        }
    }));

    // Handle URL changes (The core Gapless Logic)
    useEffect(() => {
        const active = getActive();
        const inactive = getInactive();

        if (!active || !inactive) return;

        // Check if the requested URL is already loaded in the inactive player (Preloaded)
        // We compare checks cleanly to avoid relative/absolute URL mismatches
        const isPreloaded = inactive.src === url || (url && inactive.src.endsWith(url));

        if (isPreloaded && url) {
            console.log("⚡ Gapless Switch!");
            // Swap roles
            setActiveId(prev => prev === 'primary' ? 'secondary' : 'primary');
            // Play immediately if supposed to be playing
            if (playing) {
                inactive.play().catch(e => console.error(e));
            }
            // Reset old active
            active.pause();
            active.currentTime = 0;
        } else {
            // Standard load
            if (url) {
                active.src = url;
                active.load();
                if (playing) active.play().catch(e => console.error(e));
            } else {
                active.removeAttribute('src');
            }
        }
    }, [url]); // Intentionally not including deps that would trigger unnecessary re-runs

    // Handle Next URL (Preloading)
    useEffect(() => {
        const inactive = getInactive();
        if (!inactive || !nextUrl) return;

        // Prevent reloading if already loaded
        if (inactive.src === nextUrl || inactive.src.endsWith(nextUrl)) return;

        console.log("Preloading next:", nextUrl);
        inactive.src = nextUrl;
        inactive.load();
    }, [nextUrl, activeId]); // When activeId changes, inactive changes, so we might need to preload active's old content? No, nextUrl stays same usually.

    // Handle Play/Pause
    useEffect(() => {
        const active = getActive();
        if (!active || !url) return;

        if (playing) {
            active.play().catch(error => {
                if (error.name === 'AbortError') return;
                onError?.(`Playback failed: ${error.message}`);
            });
        } else {
            active.pause();
        }
    }, [playing, activeId]);

    // Handle Volume
    useEffect(() => {
        const active = getActive();
        const inactive = getInactive();
        if (active) active.volume = volume;
        if (inactive) inactive.volume = volume;
    }, [volume, activeId]);

    // Progress Tracking - Only from Active
    useEffect(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        if (!playing) return;

        progressIntervalRef.current = setInterval(() => {
            const active = getActive();
            if (active && active.duration) {
                const played = active.currentTime / active.duration;
                onProgress({
                    played,
                    playedSeconds: active.currentTime,
                    loaded: active.buffered.length > 0
                        ? active.buffered.end(0) / active.duration
                        : 0,
                    loadedSeconds: active.buffered.length > 0
                        ? active.buffered.end(0)
                        : 0
                });
            }
        }, 200);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [playing, onProgress, activeId]);

    // Event Handlers helper
    const handleEvent = (e: React.SyntheticEvent<HTMLAudioElement>, type: 'ended' | 'duration' | 'error') => {
        const target = e.currentTarget;
        // Verify this event comes from the ACTIVE player
        // We use refs comparison
        const isPrimary = target === primaryRef.current;
        const isActivePrimary = activeId === 'primary';

        if (isPrimary !== isActivePrimary) return; // Ignore events from inactive player

        if (type === 'ended') onEnded();
        if (type === 'duration') onDuration(target.duration);
        if (type === 'error') {
            const error = target.error;
            if (error) onError?.(error.message);
        }
    };

    // Shared Props for audio elements
    const audioProps = {
        preload: "auto",
        style: { display: 'none' },
        onEnded: (e: any) => handleEvent(e, 'ended'),
        onLoadedMetadata: (e: any) => handleEvent(e, 'duration'),
        onError: (e: any) => handleEvent(e, 'error'),
    };

    return (
        <>
            <audio ref={primaryRef} {...audioProps} />
            <audio ref={secondaryRef} {...audioProps} />
        </>
    );
});

AudioPlayer.displayName = "AudioPlayer";
