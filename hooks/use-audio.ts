"use client";

import { useCallback, useRef, useEffect } from "react";

export function useAudio() {
    // Audio file refs
    const clickSoundRef = useRef<HTMLAudioElement | null>(null);
    const clunkSoundRef = useRef<HTMLAudioElement | null>(null);
    const whirSoundRef = useRef<HTMLAudioElement | null>(null);
    const ejectSoundRef = useRef<HTMLAudioElement | null>(null);
    const insertSoundRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initialize audio elements with error handling
        const initAudio = (path: string) => {
            const audio = new Audio(path);
            audio.volume = 0.6;
            return audio;
        };

        clickSoundRef.current = initAudio('/sounds/click.wav');
        clunkSoundRef.current = initAudio('/sounds/clunk.wav');
        whirSoundRef.current = initAudio('/sounds/click.wav'); // Fallback

        if (whirSoundRef.current) {
            whirSoundRef.current.loop = true;
        }

        ejectSoundRef.current = initAudio('/sounds/eject.wav');
        insertSoundRef.current = initAudio('/sounds/insert.wav');

        return () => {
            // Cleanup
        };
    }, []);

    const playSound = useCallback((soundRef: React.MutableRefObject<HTMLAudioElement | null>) => {
        if (soundRef.current) {
            soundRef.current.currentTime = 0; // Reset to start for rapid re-play
            soundRef.current.play().catch((error) => {
                // console.error("Audio play failed", error);
            });
        }
    }, []);

    const playClick = useCallback(() => {
        playSound(clickSoundRef);
    }, [playSound]);

    const playClunk = useCallback(() => {
        playSound(clunkSoundRef);
    }, [playSound]);

    const playWhir = useCallback(() => {
        // Simple loop handling for whir
        if (whirSoundRef.current) {
            whirSoundRef.current.loop = true;
            whirSoundRef.current.play().catch(() => { });

            return () => {
                if (whirSoundRef.current) {
                    whirSoundRef.current.pause();
                    whirSoundRef.current.currentTime = 0;
                }
            };
        }
        return () => { };
    }, []);

    const playEject = useCallback(() => {
        playSound(ejectSoundRef);
    }, [playSound]);

    const playInsert = useCallback(() => {
        playSound(insertSoundRef);
    }, [playSound]);

    return { playClick, playClunk, playWhir, playEject, playInsert };
}
