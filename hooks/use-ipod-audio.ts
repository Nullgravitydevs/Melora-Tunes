"use client";

import { useCallback, useRef, useEffect } from "react";
import { loadSettings } from "@/lib/settings";

export function useIpodAudio() {
    const clickRef = useRef<HTMLAudioElement | null>(null);
    const batteryRef = useRef<HTMLAudioElement | null>(null);
    const lockRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Init Audio Context for low-latency scrolling
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        const init = (path: string) => {
            const audio = new Audio(path);
            audio.volume = 0.4;
            return audio;
        };

        // Standard iPod Sounds
        clickRef.current = init('/sounds/ipod/click.mp3');   // Center Button
        batteryRef.current = init('/sounds/ipod/click.mp3'); // Low Battery 
        lockRef.current = init('/sounds/ipod/click.mp3');    // Lock/Unlock 
    }, []);

    const playSound = useCallback((ref: React.MutableRefObject<HTMLAudioElement | null>) => {
        const settings = loadSettings();
        if (!settings.clickSounds) return;

        if (ref.current) {
            ref.current.currentTime = 0;
            ref.current.play().catch(() => { });
        }
    }, []);

    const playSynthClick = useCallback(() => {
        const settings = loadSettings();
        if (!settings.clickSounds) return;

        if (!audioContextRef.current) return;
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 2500Hz Square Wave = Classic "Tick"
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.type = 'square';

        // Super short envelope (Piezo style)
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.03);
    }, []);

    const playClick = useCallback(() => playSound(clickRef), [playSound]);
    const playScroll = useCallback(() => playSynthClick(), [playSynthClick]);
    const playBattery = useCallback(() => playSound(batteryRef), [playSound]);
    const playLock = useCallback(() => playSound(lockRef), [playSound]);

    return { playClick, playScroll, playBattery, playLock };
}
