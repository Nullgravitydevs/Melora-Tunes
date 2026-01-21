"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';

interface AudioPlayerProps {
    url: string | null;
    nextUrl?: string | null;
    playing: boolean;
    volume: number;
    speed?: number;
    crossfadeDuration?: number; // seconds for crossfade (0 = off)
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
    // EQ Props
    eqBands?: number[]; // Array of 10 gains
}

export interface AudioPlayerRef {
    seekTo: (amount: number) => void;
    getCurrentTime: () => number;
    play: () => void;
    pause: () => void;
    setVolume: (vol: number) => void;
    // initAudioContext: () => void; // Call on first interaction
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({
    url,
    nextUrl,
    playing,
    volume,
    speed = 1,
    crossfadeDuration = 0,
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
    onPlayToggle: onPlayPause,
    eqBands
}, ref) => {
    const primaryRef = useRef<HTMLAudioElement>(null);
    const secondaryRef = useRef<HTMLAudioElement>(null);
    const [activeId, setActiveId] = useState<'primary' | 'secondary'>('primary');
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const crossfadeIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const isCrossfadingRef = useRef(false);

    // Audio Graph Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const filtersRef = useRef<BiquadFilterNode[]>([]);
    const sourceRefs = useRef<Map<HTMLAudioElement, MediaElementAudioSourceNode>>(new Map());
    const gainNodeRef = useRef<GainNode | null>(null);

    const getActive = useCallback(() => activeId === 'primary' ? primaryRef.current : secondaryRef.current, [activeId]);
    const getInactive = useCallback(() => activeId === 'primary' ? secondaryRef.current : primaryRef.current, [activeId]);

    // Initialize Audio Graph (Idempotent)
    const initAudioGraph = useCallback(() => {
        if (audioContextRef.current) return;

        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            audioContextRef.current = ctx;

            // Create Master Gain (for volume/crossfade if needed later, though native volume is cleaner for element)
            // Actually, we process AFTER element volume usually, but element source takes raw output.
            // Let's rely on element.volume for simple volume control, and use Graph purely for EQ.
            // Source -> EQ -> Dest

            // Create Filters
            const freqs = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
            const filters = freqs.map((f, i) => {
                const filter = ctx.createBiquadFilter();
                if (i === 0) filter.type = 'lowshelf';
                else if (i === freqs.length - 1) filter.type = 'highshelf';
                else filter.type = 'peaking';
                filter.frequency.value = f;
                filter.Q.value = 1.0; // wider curve usually sounds better
                filter.gain.value = 0;
                return filter;
            });

            // Connect chain
            for (let i = 0; i < filters.length - 1; i++) {
                filters[i].connect(filters[i + 1]);
            }
            filters[filters.length - 1].connect(ctx.destination);
            filtersRef.current = filters;

            // Connect Elements if they exist
            [primaryRef.current, secondaryRef.current].forEach(el => {
                if (el && !sourceRefs.current.has(el)) {
                    try {
                        const source = ctx.createMediaElementSource(el);
                        source.connect(filters[0]);
                        sourceRefs.current.set(el, source);
                    } catch (err) {
                        console.warn("Source creation failed (maybe already connected):", err);
                    }
                }
            });

            console.log("🎛️ Audio Graph Initialized");
        } catch (e) {
            console.error("Audio API Error:", e);
        }
    }, []);

    // Update EQ Bands
    useEffect(() => {
        if (!eqBands || !filtersRef.current.length) return;

        eqBands.forEach((gain, i) => {
            if (filtersRef.current[i]) {
                filtersRef.current[i].gain.setTargetAtTime(gain, audioContextRef.current?.currentTime || 0, 0.1);
            }
        });
    }, [eqBands]);

    // Handle User Interaction to Unlock AudioContext
    useEffect(() => {
        const unlock = () => {
            initAudioGraph();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            window.removeEventListener('click', unlock);
        };
        window.addEventListener('click', unlock);
        return () => window.removeEventListener('click', unlock);
    }, [initAudioGraph]);

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
                // Unload content
                active.pause();
                active.removeAttribute('src');
                active.src = ""; // Explicitly clear
                active.load();   // Force unload buffer
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

    // Handle Playback Speed
    useEffect(() => {
        const active = getActive();
        const inactive = getInactive();
        if (active) active.playbackRate = speed;
        if (inactive) inactive.playbackRate = speed;
    }, [speed, activeId]);

    // Progress Tracking + Crossfade Logic
    useEffect(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        if (!playing) return;

        progressIntervalRef.current = setInterval(() => {
            const active = getActive();
            const inactive = getInactive();
            if (active && active.duration) {
                const played = active.currentTime / active.duration;
                const remainingSeconds = active.duration - active.currentTime;

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

                // Crossfade Logic: Start fading when within crossfadeDuration of end
                if (crossfadeDuration > 0 && remainingSeconds <= crossfadeDuration && nextUrl && inactive && !isCrossfadingRef.current) {
                    isCrossfadingRef.current = true;
                    console.log("🎵 Starting crossfade...");

                    // Start playing next track at volume 0
                    inactive.volume = 0;
                    inactive.play().catch(() => { });

                    // Ramp volumes over crossfadeDuration
                    const fadeSteps = 20;
                    const stepDuration = (crossfadeDuration * 1000) / fadeSteps;
                    let step = 0;

                    crossfadeIntervalRef.current = setInterval(() => {
                        step++;
                        const fadeRatio = step / fadeSteps;
                        if (active) active.volume = Math.max(0, volume * (1 - fadeRatio));
                        if (inactive) inactive.volume = volume * fadeRatio;

                        if (step >= fadeSteps) {
                            clearInterval(crossfadeIntervalRef.current);
                            isCrossfadingRef.current = false;
                        }
                    }, stepDuration);
                }
            }
        }, 200);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [playing, onProgress, activeId, crossfadeDuration, nextUrl, volume]);

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

    const audioProps: React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> = {
        crossOrigin: "anonymous", // CRITICAL for Web Audio API with external/proxy sources
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
