"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface AudioPlayerProps {
    url: string | null;
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
    onPlayToggle?: () => void; // Using onPlayToggle to match PlayerProps naming convention if needed, or stick to standard
}

export interface AudioPlayerRef {
    seekTo: (amount: number) => void;
    getCurrentTime: () => number;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({
    url,
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
    onPlayToggle: onPlayPause // Mapping onPlayToggle prop to internal onPlayPause usage
}, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useImperativeHandle(ref, () => ({
        seekTo: (amount: number) => {
            if (audioRef.current) {
                if (audioRef.current.duration) {
                    audioRef.current.currentTime = amount * audioRef.current.duration;
                } else if (amount === 0) {
                    audioRef.current.currentTime = 0;
                }
            }
        },
        getCurrentTime: () => {
            return audioRef.current?.currentTime || 0;
        }
    }));

    // ... (useEffect hooks remain the same) ...

    // Handle URL changes
    useEffect(() => {
        if (!audioRef.current) return;

        if (url) {
            audioRef.current.src = url;
            audioRef.current.load();
        } else {
            audioRef.current.src = '';
        }
    }, [url]);

    // Handle play/pause
    useEffect(() => {
        if (!audioRef.current || !url) return;

        if (playing) {
            audioRef.current.play().catch(error => {
                console.error("Playback failed:", error);
                onError?.(`Playback failed: ${error.message}`);
            });
        } else {
            audioRef.current.pause();
        }
    }, [playing, url, onError]);

    // Handle volume changes
    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = volume;
    }, [volume]);

    // Setup progress tracking
    useEffect(() => {
        if (!audioRef.current || !playing) {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            return;
        }

        progressIntervalRef.current = setInterval(() => {
            if (audioRef.current && audioRef.current.duration) {
                const played = audioRef.current.currentTime / audioRef.current.duration;
                onProgress({
                    played,
                    playedSeconds: audioRef.current.currentTime,
                    loaded: audioRef.current.buffered.length > 0
                        ? audioRef.current.buffered.end(0) / audioRef.current.duration
                        : 0,
                    loadedSeconds: audioRef.current.buffered.length > 0
                        ? audioRef.current.buffered.end(0)
                        : 0
                });
            }
        }, 1000);

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [playing, onProgress]);

    // Media Session API Integration
    useEffect(() => {
        if (!playing || !url || !navigator.mediaSession) return;

        // Update Metadata
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            album: album || 'TFI Stereo',
            artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : []
        });

        // Update Action Handlers
        try {
            if (onPlayPause) {
                navigator.mediaSession.setActionHandler('play', () => onPlayPause());
                navigator.mediaSession.setActionHandler('pause', () => onPlayPause());
            }
            if (onPrev) {
                navigator.mediaSession.setActionHandler('previoustrack', () => onPrev());
            }
            if (onNext) {
                navigator.mediaSession.setActionHandler('nexttrack', () => onNext());
            }
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime && audioRef.current) {
                    audioRef.current.currentTime = details.seekTime;
                }
            });
        } catch (e) {
            console.error("MediaSession action error:", e);
        }

        return () => {
            if (navigator.mediaSession) {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('seekto', null);
            }
        };
    }, [playing, url, title, artist, album, artwork, onPlayPause, onNext, onPrev]);

    if (!url) {
        return null;
    }

    return (
        <audio
            ref={audioRef}
            onLoadedMetadata={(e) => {
                const target = e.currentTarget;
                onDuration(target.duration);
            }}
            onError={(e) => {
                const target = e.currentTarget;
                const error = target.error;
                if (error) {
                    console.error("Audio playback error:", {
                        code: error.code,
                        message: error.message
                    });
                    let errorMessage = "Unknown playback error";
                    switch (error.code) {
                        case 1: errorMessage = "Aborted"; break;
                        case 2: errorMessage = "Network error"; break;
                        case 3: errorMessage = "Decoding error"; break;
                        case 4: errorMessage = "Source not supported"; break;
                    }
                    onError?.(errorMessage);
                }
            }}
            onEnded={onEnded}
            preload="metadata"
            style={{ display: 'none' }}
        />
    );
});

AudioPlayer.displayName = "AudioPlayer";
