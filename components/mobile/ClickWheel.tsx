"use client";

import { motion } from "framer-motion";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface ClickWheelProps {
    theme?: 'classic' | 'black' | 'silver' | 'dark';
    enableSounds?: boolean;
    onScroll: (direction: 1 | -1) => void;
    onSelect: () => void;
    onMenu: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export function ClickWheel({ theme = 'classic', enableSounds = true, onScroll, onSelect, onMenu, onPlayPause, onNext, onPrev }: ClickWheelProps) {
    const wheelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastAngle = useRef<number | null>(null);
    const accumulatedDelta = useRef(0);
    const lastVibration = useRef(0);
    const hasMoved = useRef(false);

    const getAngle = (clientX: number, clientY: number) => {
        if (!wheelRef.current) return 0;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = clientX - centerX;
        const y = clientY - centerY;
        return Math.atan2(y, x) * (180 / Math.PI);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // Prevent default touch actions like scrolling the page
        e.preventDefault();
        wheelRef.current?.setPointerCapture(e.pointerId);
        setIsDragging(true);
        lastAngle.current = getAngle(e.clientX, e.clientY);
        accumulatedDelta.current = 0;
        hasMoved.current = false;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || lastAngle.current === null) return;
        e.preventDefault();

        const currentAngle = getAngle(e.clientX, e.clientY);
        let delta = currentAngle - lastAngle.current;

        // Handle wrapping around 180/-180 boundary
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        accumulatedDelta.current += delta;
        lastAngle.current = currentAngle;

        // Mark as moved if threshold passed
        if (Math.abs(accumulatedDelta.current) > 6) {
            hasMoved.current = true;
        }

        // Threshold for one "tick" of scrolling (approx 20 degrees)
        const TICK_THRESHOLD = 20;

        if (Math.abs(accumulatedDelta.current) >= TICK_THRESHOLD) {
            const direction = accumulatedDelta.current > 0 ? 1 : -1;
            onScroll(direction);

            // Audio Feedback (Click Sound)
            playClickSound('tick');

            // Throttle Haptic Feedback (Prevent Android Lag)
            const now = Date.now();
            if (now - lastVibration.current > 40 && typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(3); // Ultra short vibration for crispness
                lastVibration.current = now;
            }

            // Reset accumulator but keep remainder for smoothness
            accumulatedDelta.current -= direction * TICK_THRESHOLD;
        }
    };

    // Synthetic Click Sound helper
    const playClickSound = (type: 'tick' | 'select' = 'tick') => {
        if (!enableSounds) return; // Respect user setting
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            if (type === 'tick') {
                // Synthesize a mechanical "Click" (Piezo style)
                // 1. Short burst of White Noise (Impact)
                const bufferSize = ctx.sampleRate * 0.005; // 5ms click
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                // Filter to make it "plastic/mechanical"
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, ctx.currentTime);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.004); // Fast decay

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start();

            } else {
                // Thud / Select sound (Deeper, Sine-based)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08); // Pitch drop

                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            }
        } catch (e) {
            // Ignore audio errors (e.g. user didn't interact yet)
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging && !hasMoved.current) {
            // It was a TAP! Determine button by Angle.
            const angle = lastAngle.current || getAngle(e.clientX, e.clientY);
            playClickSound('select'); // Sound for Tap

            // Normalize angle to -180 to 180
            // Top (-90 range), Right (0 range), Bottom (90 range), Left (180 range)

            // Menu (Top): -135 to -45
            if (angle > -135 && angle < -45) {
                onMenu();
                if (navigator.vibrate) navigator.vibrate(10);
            }
            // Play (Bottom): 45 to 135
            else if (angle > 45 && angle < 135) {
                onPlayPause();
                if (navigator.vibrate) navigator.vibrate(10);
            }
            // Next (Right): -45 to 45
            else if (angle >= -45 && angle <= 45) {
                onNext();
                if (navigator.vibrate) navigator.vibrate(10);
            }
            // Prev (Left): <-135 or >135
            else {
                onPrev();
                if (navigator.vibrate) navigator.vibrate(10);
            }
        }

        setIsDragging(false);
        lastAngle.current = null;
        wheelRef.current?.releasePointerCapture(e.pointerId);
    };

    // Center Button Refs
    const isCenterPressed = useRef(false);

    // Theme-based colors (matching real iPod designs)
    const getThemeColors = () => {
        switch (theme) {
            case 'black':
                return {
                    wheel: 'bg-[#2a2a2a]',
                    button: 'from-[#3a3a3a] to-[#2a2a2a]',
                    text: 'text-gray-500'
                };
            case 'silver':
                return {
                    wheel: 'bg-[#d0d0d0]',
                    button: 'from-[#f0f0f0] to-[#d0d0d0]',
                    text: 'text-gray-500'
                };
            case 'dark':
                return {
                    wheel: 'bg-[#3a3a3a]',
                    button: 'from-[#4a4a4a] to-[#3a3a3a]',
                    text: 'text-gray-400'
                };
            case 'classic':
            default:
                return {
                    wheel: 'bg-[#f2f2f2]',
                    button: 'from-[#fff] to-[#e0e0e0]',
                    text: 'text-gray-400'
                };
        }
    };

    const colors = getThemeColors();

    // Helper for preventing scroll interference while allowing clicks
    // Reverting to direct onPointerDown handler for instant mobile response
    const createButtonHandler = (action: () => void) => (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        action();
    };

    return (
        <div
            ref={wheelRef}
            className={`relative size-64 ${colors.wheel} rounded-full shadow-[inset_0_5px_10px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer active:brightness-95 transition-all select-none touch-none pointer-events-auto`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Visual Labels (Pointer Events None to let Wheel capture) */}
            <div className={`absolute top-4 font-bold ${colors.text} font-sans tracking-wide text-[11px] pointer-events-none`}>MENU</div>
            <div className={`absolute left-4 ${colors.text} pointer-events-none`}><Rewind size={18} fill="currentColor" /></div>
            <div className={`absolute right-4 ${colors.text} pointer-events-none`}><FastForward size={18} fill="currentColor" /></div>
            <div className={`absolute bottom-4 ${colors.text} flex gap-0.5 pointer-events-none`}>
                <Play size={10} fill="currentColor" />
                <Pause size={10} fill="currentColor" />
            </div>

            {/* Center Button (Distinct) */}
            <motion.div
                className={`size-24 bg-gradient-to-b ${colors.button} rounded-full shadow-[inset_0_2px_5px_rgba(255,255,255,1),0_2px_5px_rgba(0,0,0,0.1)] active:scale-95 transition-all z-20 relative`}
                whileTap={{ scale: 0.95 }}
                onPointerDown={(e) => {
                    e.stopPropagation(); // Stop propagation to wheel
                    e.preventDefault();
                    isCenterPressed.current = true;
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    if (isCenterPressed.current) {
                        onSelect();
                        if (navigator.vibrate) navigator.vibrate(10);
                    }
                    isCenterPressed.current = false;
                }}
                onPointerLeave={() => isCenterPressed.current = false}
            />
        </div>
    );
}
