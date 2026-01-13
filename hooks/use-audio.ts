"use client";

import { useCallback, useRef, useEffect } from "react";

export function useAudio() {
    const audioContextRef = useRef<AudioContext | null>(null);

    // Audio file refs
    const clickSoundRef = useRef<HTMLAudioElement | null>(null);
    const clunkSoundRef = useRef<HTMLAudioElement | null>(null);
    const whirSoundRef = useRef<HTMLAudioElement | null>(null);
    const ejectSoundRef = useRef<HTMLAudioElement | null>(null);
    const insertSoundRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Initialize audio elements with error handling
        const initAudio = (path: string) => {
            const audio = new Audio(path);
            audio.volume = 0.6;
            return audio;
        };

        clickSoundRef.current = initAudio('/sounds/click.wav');
        clunkSoundRef.current = initAudio('/sounds/clunk.wav');
        whirSoundRef.current = initAudio('/sounds/click.wav'); // Using click.wav as fallback until whir.wav is added
        if (whirSoundRef.current) whirSoundRef.current.loop = true;

        ejectSoundRef.current = initAudio('/sounds/eject.wav');
        insertSoundRef.current = initAudio('/sounds/insert.wav');

        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    const playSound = useCallback((soundRef: React.MutableRefObject<HTMLAudioElement | null>, fallback: () => void) => {
        if (soundRef.current) {
            // Try to play file, if it fails (404 or other), run fallback
            const playPromise = soundRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    // console.log("File play failed, using fallback:", error);
                    fallback();
                });
            }
        } else {
            fallback();
        }
    }, []);

    const playClick = useCallback(() => {
        playSound(clickSoundRef, () => {
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;
            const t = ctx.currentTime;

            // Crunchy mechanical click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "square";
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(3000, t);
            filter.frequency.exponentialRampToValueAtTime(500, t + 0.08);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

            osc.start(t);
            osc.stop(t + 0.08);

            // Metallic resonance
            const metalOsc = ctx.createOscillator();
            const metalGain = ctx.createGain();
            metalOsc.connect(metalGain);
            metalGain.connect(ctx.destination);

            metalOsc.type = "triangle";
            metalOsc.frequency.setValueAtTime(2000, t);
            metalGain.gain.setValueAtTime(0.05, t);
            metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            metalOsc.start(t);
            metalOsc.stop(t + 0.15);
        });
    }, [playSound]);

    const playClunk = useCallback(() => {
        playSound(clunkSoundRef, () => {
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;
            const t = ctx.currentTime;

            // Heavy mechanical thud
            const bufferSize = ctx.sampleRate * 0.2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = "lowpass";
            noiseFilter.frequency.value = 600;
            const noiseGain = ctx.createGain();

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noiseGain.gain.setValueAtTime(0.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            noise.start(t);

            // Low frequency impact
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "triangle";
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

            osc.start(t);
            osc.stop(t + 0.2);
        });
    }, [playSound]);

    const playWhir = useCallback(() => {
        // For loopable sounds, logic is slightly different
        if (whirSoundRef.current) {
            const playPromise = whirSoundRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Fallback if file fails
                    // We need to return a cleanup function for the synthesized sound
                });
            }
            return () => {
                if (whirSoundRef.current) {
                    whirSoundRef.current.pause();
                    whirSoundRef.current.currentTime = 0;
                }
            };
        }

        // Synthesized fallback
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.value = 60;

        filter.type = "lowpass";
        filter.frequency.value = 300; // Higher cutoff for more "motor" sound

        gain.gain.value = 0.05;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Add some noise for texture
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.03;

        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        osc.start();
        noise.start();

        return () => {
            const t = ctx.currentTime;
            gain.gain.setTargetAtTime(0, t, 0.1);
            noiseGain.gain.setTargetAtTime(0, t, 0.1);
            setTimeout(() => {
                osc.stop();
                noise.stop();
            }, 200);
        };
    }, []);

    const playEject = useCallback(() => {
        playSound(ejectSoundRef, () => {
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;
            const t = ctx.currentTime;

            // Servo/Spring sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.linearRampToValueAtTime(100, t + 0.2);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.2);

            osc.start(t);
            osc.stop(t + 0.2);

            // Mechanical latch
            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickOsc.connect(clickGain);
            clickGain.connect(ctx.destination);

            clickOsc.type = "square";
            clickOsc.frequency.setValueAtTime(800, t + 0.1);
            clickGain.gain.setValueAtTime(0.0, t);
            clickGain.gain.setValueAtTime(0.2, t + 0.1);
            clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            clickOsc.start(t);
            clickOsc.stop(t + 0.2);
        });
    }, [playSound]);

    const playInsert = useCallback(() => {
        playSound(insertSoundRef, () => {
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;
            const t = ctx.currentTime;

            // Plastic slide
            const bufferSize = ctx.sampleRate * 0.3;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = "bandpass";
            noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain();

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noiseGain.gain.setValueAtTime(0.4, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

            noise.start(t);

            // Final click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "square";
            osc.frequency.setValueAtTime(600, t + 0.2);
            gain.gain.setValueAtTime(0, t);
            gain.gain.setValueAtTime(0.2, t + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

            osc.start(t);
            osc.stop(t + 0.3);
        });
    }, [playSound]);

    return { playClick, playClunk, playWhir, playEject, playInsert };
}
