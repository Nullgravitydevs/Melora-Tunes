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
    onPlaying?: () => void; // Fires when audio element actually starts playing
    onWaiting?: () => void; // Buffering
    onStalled?: () => void; // Network stalled
    onNext?: () => void;
    onPrev?: () => void;
    onPlayToggle?: () => void;
    // EQ Props
    eqBands?: number[]; // Array of 10 gains
}

export interface AudioPlayerRef {
    seekTo: (amount: number, type?: 'seconds' | 'fraction') => void;
    getCurrentTime: () => number;
    play: () => void;
    pause: () => void;
    setVolume: (vol: number) => void;
    getAnalyser: () => AnalyserNode | null;
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
    onPlaying,
    onWaiting,
    onStalled,
    onNext,
    onPrev,
    onPlayToggle: onPlayPause,
    eqBands
}, ref) => {
    const primaryRef = useRef<HTMLAudioElement>(null);
    const secondaryRef = useRef<HTMLAudioElement>(null);
    const [activeId, setActiveId] = useState<'primary' | 'secondary'>('primary');
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const switchingRef = useRef(false); // Guards against onEnded during gapless switch

    // Audio Graph Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const filtersRef = useRef<BiquadFilterNode[]>([]);
    const sourceRefs = useRef<Map<HTMLAudioElement, MediaElementAudioSourceNode>>(new Map());
    const gainRefs = useRef<Map<HTMLAudioElement, GainNode>>(new Map());
    const analyserRef = useRef<AnalyserNode | null>(null);

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

            // Analyser Node
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256; // 128 frequency bins
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            // Connect chain
            for (let i = 0; i < filters.length - 1; i++) {
                filters[i].connect(filters[i + 1]);
            }
            // Connect last filter to analyser, then to destination
            filters[filters.length - 1].connect(analyser);
            analyser.connect(ctx.destination);

            filtersRef.current = filters;

            // Connect Elements if they exist
            [primaryRef.current, secondaryRef.current].forEach(el => {
                if (el && !sourceRefs.current.has(el)) {
                    try {
                        const source = ctx.createMediaElementSource(el);
                        const fadeGain = ctx.createGain();

                        source.connect(fadeGain);
                        fadeGain.connect(filters[0]);

                        sourceRefs.current.set(el, source);
                        gainRefs.current.set(el, fadeGain);
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

    // MediaSession API — lock screen / OS-level media controls
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        // Update metadata when track info changes
        if (title) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title || 'Unknown',
                artist: artist || 'Unknown Artist',
                album: album || '',
                artwork: artwork ? [
                    { src: artwork, sizes: '96x96', type: 'image/jpeg' },
                    { src: artwork.replace('150x150', '500x500').replace('50x50', '500x500'), sizes: '512x512', type: 'image/jpeg' },
                ] : []
            });
        }
    }, [title, artist, album, artwork]);

    // MediaSession action handlers
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
            ['play', () => onPlayPause?.()],
            ['pause', () => onPlayPause?.()],
            ['previoustrack', () => onPrev?.()],
            ['nexttrack', () => onNext?.()],
            ['seekto', (details) => {
                const active = getActive();
                if (active && details.seekTime !== undefined) {
                    active.currentTime = details.seekTime;
                }
            }],
        ];

        for (const [action, handler] of handlers) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch {
                // Some actions may not be supported on all platforms
            }
        }

        return () => {
            for (const [action] of handlers) {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch { }
            }
        };
    }, [onPlayPause, onNext, onPrev, getActive]);

    // Update MediaSession playback state
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }, [playing]);

    // Synchronize HTML Audio Element with React `playing` prop
    // This catches edge cases where URL resolves before playback is un-paused
    useEffect(() => {
        const active = getActive();
        // Browser sometimes resolves empty `src` to `window.location.href`, so we check the raw attribute.
        if (!active || !active.getAttribute('src') || active.getAttribute('src') === "") return;

        if (playing && active.paused) {
            // Guard against AbortError when rapidly switching
            const playPromise = active.play();
            if (playPromise) {
                playPromise.catch((e) => {
                    if (e.name !== 'AbortError') console.warn('Sync play() error:', e);
                });
            }
        } else if (!playing && !active.paused) {
            active.pause();
        }
    }, [playing, getActive]);

    // Update MediaSession position state
    useEffect(() => {
        if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

        const active = getActive();
        if (active && active.duration && isFinite(active.duration)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: active.duration,
                    playbackRate: speed,
                    position: Math.min(active.currentTime, active.duration),
                });
            } catch { }
        }
    }, [playing, speed, activeId]);

    useImperativeHandle(ref, () => ({
        seekTo: (amount: number, type?: 'seconds' | 'fraction') => {
            const active = getActive();
            if (active) {
                if (type === 'seconds') {
                    active.currentTime = amount;
                } else {
                    // Default: Fraction
                    if (active.duration) {
                        active.currentTime = amount * active.duration;
                    } else if (amount === 0) {
                        active.currentTime = 0;
                    }
                }
            }
        },
        getCurrentTime: () => getActive()?.currentTime || 0,
        play: () => { const el = getActive(); if (el && el.getAttribute('src') && el.getAttribute('src') !== "") el.play().catch(e => { if (e.name !== 'AbortError') console.warn('play() error:', e); }); },
        pause: () => getActive()?.pause(),
        setVolume: (vol: number) => {
            const active = getActive();
            if (active) active.volume = vol;
        },
        getAnalyser: () => analyserRef.current
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
            console.log("⚡ Gapless Switch!", crossfadeDuration > 0 ? `(Crossfading ${crossfadeDuration}s)` : "");

            // CRITICAL: Block onEnded events during switch to prevent race condition
            switchingRef.current = true;
            setActiveId(prev => prev === 'primary' ? 'secondary' : 'primary');

            const oldActive = active;
            const newActive = inactive;

            if (playing) {
                if (crossfadeDuration > 0) {
                    const ctx = audioContextRef.current;
                    const oldGain = gainRefs.current.get(oldActive);
                    const newGain = gainRefs.current.get(newActive);
                    const durationMs = crossfadeDuration * 1000;

                    if (ctx && oldGain && newGain && ctx.state === 'running') {
                        // Web Audio API Ramping (Runs beautifully in background tabs)
                        newActive.volume = 1.0;
                        oldActive.volume = 1.0;

                        const now = ctx.currentTime;

                        oldGain.gain.cancelScheduledValues(now);
                        newGain.gain.cancelScheduledValues(now);

                        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
                        newGain.gain.setValueAtTime(0, now);

                        oldGain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
                        newGain.gain.linearRampToValueAtTime(volume, now + durationMs / 1000);

                        newActive.play().catch(e => console.error(e));

                        setTimeout(() => {
                            oldActive.pause();
                            oldActive.currentTime = 0;
                            if (oldActive.src.startsWith('blob:')) URL.revokeObjectURL(oldActive.src);
                            // Release switch guard after old player is fully cleaned up
                            setTimeout(() => { switchingRef.current = false; }, 200);
                        }, durationMs + 100);
                    } else {
                        // Fallback if Context isn't ready
                        newActive.volume = volume;
                        newActive.play().catch(e => console.error(e));
                        oldActive.pause();
                        oldActive.currentTime = 0;
                        if (oldActive.src.startsWith('blob:')) URL.revokeObjectURL(oldActive.src);
                    }
                } else {
                    newActive.volume = volume;
                    newActive.play().catch(e => console.error(e));
                    oldActive.pause();
                    oldActive.currentTime = 0;
                    if (oldActive.src.startsWith('blob:')) {
                        URL.revokeObjectURL(oldActive.src);
                    }
                    // Release switch guard after cleanup
                    setTimeout(() => { switchingRef.current = false; }, 200);
                }
            } else {
                newActive.volume = volume;
                oldActive.pause();
                oldActive.currentTime = 0;
                if (oldActive.src.startsWith('blob:')) {
                    URL.revokeObjectURL(oldActive.src);
                }
                // Release switch guard after cleanup
                setTimeout(() => { switchingRef.current = false; }, 200);
            }
        } else {
            // Standard load
            if (url) {
                // Cleanup current active blob before replacing
                if (active.src.startsWith('blob:') && active.src !== url) {
                    URL.revokeObjectURL(active.src);
                }
                active.pause(); // Always pause before changing src to prevent AbortError
                active.src = url;
                active.load();
                if (playing) {
                    // Yield a microtask to let the pause() settle before play()
                    const playPromise = active.play();
                    if (playPromise) playPromise.catch(e => { if (e.name !== 'AbortError') console.error(e); });
                }
            } else {
                // Unload content
                active.pause();
                if (active.src.startsWith('blob:')) {
                    URL.revokeObjectURL(active.src);
                }
                active.removeAttribute('src');
                active.src = "";
                active.load();
            }
        }
    }, [url]);

    // Handle Component Unmount Cleanup
    useEffect(() => {
        return () => {
            if (primaryRef.current?.src.startsWith('blob:')) URL.revokeObjectURL(primaryRef.current.src);
            if (secondaryRef.current?.src.startsWith('blob:')) URL.revokeObjectURL(secondaryRef.current.src);

            // Critical: Close context to prevent AudioContext exhaustion limit (6 on Chrome/Safari)
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.warn('AudioContext close failed', e));
                audioContextRef.current = null;
            }
        };
    }, []); // Intentionally not including deps that would trigger unnecessary re-runs

    // Handle Next URL (Preloading)
    useEffect(() => {
        const inactive = getInactive();
        if (!inactive || !nextUrl) return;

        // Prevent reloading if already loaded
        if (inactive.src === nextUrl || inactive.src.endsWith(nextUrl)) return;

        // Cleanup inactive blob before preloading new one
        if (inactive.src.startsWith('blob:') && inactive.src !== nextUrl) {
            URL.revokeObjectURL(inactive.src);
        }

        console.log("Preloading next:", nextUrl);
        inactive.src = nextUrl;
        inactive.load();
    }, [nextUrl, activeId]); // When activeId changes, inactive changes, so we might need to preload active's old content? No, nextUrl stays same usually.

    // Handle Play/Pause
    useEffect(() => {
        const active = getActive();
        if (!active || !url) return;

        if (playing) {
            // Use a microtask delay to avoid interrupting a pending pause()
            const timer = setTimeout(() => {
                if (!active.paused && active.src) return; // Already playing
                const playPromise = active.play();
                if (playPromise) {
                    playPromise.catch(error => {
                        if (error.name === 'AbortError') return; // Swallow — another state change interrupted us
                        onError?.(`Playback failed: ${error.message}`);
                    });
                }
            }, 50); // 50ms lets any pending pause() settle
            return () => clearTimeout(timer);
        } else {
            active.pause();
        }
    }, [playing, activeId]);

    // Handle Volume
    useEffect(() => {
        const active = getActive();
        const inactive = getInactive();

        const ctx = audioContextRef.current;
        if (ctx && active && gainRefs.current.has(active) && ctx.state === 'running') {
            // Apply volume via Gain Node smoothly
            const gain = gainRefs.current.get(active)!;
            gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);

            // Force hardware volume to 1 since graph handles attenuation
            if (active) active.volume = 1;
            if (inactive) inactive.volume = 1;
        } else {
            // Native fallback
            if (active) active.volume = volume;
            if (inactive) inactive.volume = volume;
        }
    }, [volume, activeId]);

    // Handle Playback Speed
    useEffect(() => {
        const active = getActive();
        const inactive = getInactive();
        if (active) active.playbackRate = speed;
        if (inactive) inactive.playbackRate = speed;
    }, [speed, activeId]);

    // Progress Tracking
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

                // Safety: If we are effectively at the end (> 99.5%) and playing, trigger end.
                // This prevents cases where browser doesn't fire 'ended' event due to floating point precision.
                if (played >= 0.995 && active.duration > 10) { // Only for songs > 10s
                    // We rely on native onEnded for main logic, but this acts as a failsafe?
                    // Actually, calling onEnded here might cause double-skip if native fires too.
                    // Better to let native handle it, but maybe force a seek to end?
                    // Or just leave it. Most modern browsers are fine. 
                    // The user reported "not playing continuous". 
                    // Let's NOT force it yet, as it might cause premature skips. 
                    // Instead, let's ensure 'loop' attribute isn't set? It defaults false.
                }
            }
        }, 200);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [playing, onProgress, activeId, nextUrl]);

    // Event Handlers helper
    const handleEvent = (e: React.SyntheticEvent<HTMLAudioElement>, type: 'ended' | 'duration' | 'error' | 'playing') => {
        const target = e.currentTarget;
        // Verify this event comes from the ACTIVE player
        // We use refs comparison
        const isPrimary = target === primaryRef.current;
        const isActivePrimary = activeId === 'primary';

        if (isPrimary !== isActivePrimary) return; // Ignore events from inactive player

        if (type === 'ended') {
            if (switchingRef.current) {
                console.log('[AudioPlayer] Blocked stale onEnded during gapless switch');
                return;
            }
            onEnded();
        }
        if (type === 'playing') onPlaying?.();
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
        onPlaying: (e: any) => handleEvent(e, 'playing'),
        onLoadedMetadata: (e: any) => handleEvent(e, 'duration'),
        onError: (e: any) => handleEvent(e, 'error'),
        onWaiting: () => onWaiting?.(),
        onStalled: () => onStalled?.(),
    };

    return (
        <>
            <audio ref={primaryRef} {...audioProps} />
            <audio ref={secondaryRef} {...audioProps} />
        </>
    );
});

AudioPlayer.displayName = "AudioPlayer";
