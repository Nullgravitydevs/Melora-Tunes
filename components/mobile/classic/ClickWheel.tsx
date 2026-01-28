"use client";

import { motion } from "framer-motion";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useIpodAudio } from "@/hooks/use-ipod-audio";

interface ClickWheelProps {
    theme?: 'classic' | 'black' | 'silver' | 'dark' | 'blue' | 'rosegold' | 'blush';
    enableSounds?: boolean;
    onScroll: (direction: 1 | -1) => void;
    onSelect: () => void;
    onLongSelect?: () => void;
    onMenu: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    children?: React.ReactNode;
}

export function ClickWheel({ theme = 'classic', enableSounds = true, onScroll, onSelect, onLongSelect, onMenu, onPlayPause, onNext, onPrev, children }: ClickWheelProps) {
    const { playClick, playScroll } = useIpodAudio();
    const wheelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastAngle = useRef<number | null>(null);
    const accumulatedDelta = useRef(0);
    const activePointerId = useRef<number | null>(null);
    const lastVibration = useRef(0);
    const lastScrollSound = useRef(0);
    const hasMoved = useRef(false);

    // Feedback Helpers
    const triggerHaptic = (duration: number | number[]) => {
        if (typeof navigator === 'undefined' || !navigator.vibrate) return;
        const now = Date.now();
        if (now - lastVibration.current > 50) { // Global throttle 50ms
            navigator.vibrate(duration);
            lastVibration.current = now;
        }
    };

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
        e.stopPropagation(); // Ensure we claim it

        if (activePointerId.current !== null) return; // Ignore multi-touch

        wheelRef.current?.setPointerCapture(e.pointerId);
        activePointerId.current = e.pointerId;
        setIsDragging(true);
        lastAngle.current = getAngle(e.clientX, e.clientY);
        accumulatedDelta.current = 0;
        hasMoved.current = false;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || activePointerId.current !== e.pointerId || lastAngle.current === null) return;
        e.preventDefault();

        const currentAngle = getAngle(e.clientX, e.clientY);
        let delta = currentAngle - lastAngle.current;

        // Handle wrapping around 180/-180 boundary
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        accumulatedDelta.current += delta;
        lastAngle.current = currentAngle;

        // Mark as moved if threshold passed (increased to 10 deg to avoid jitter)
        if (Math.abs(accumulatedDelta.current) > 10) {
            hasMoved.current = true;
        }

        processDelta();
    };

    // Helper to process accumulated rotation delta
    const processDelta = () => {
        // Threshold for one "tick" of scrolling (approx 20 degrees)
        const TICK_THRESHOLD = 20;

        if (Math.abs(accumulatedDelta.current) >= TICK_THRESHOLD) {
            const direction = accumulatedDelta.current > 0 ? 1 : -1;

            // Execute scroll
            onScroll(direction);

            // Audio Feedback (Throttled)
            if (enableSounds) {
                const now = Date.now();
                if (now - lastScrollSound.current > 40) {
                    playScroll();
                    lastScrollSound.current = now;
                }
            }

            // Haptic Feedback
            triggerHaptic(3);

            // Reset accumulator but keep remainder for smoothness
            accumulatedDelta.current -= direction * TICK_THRESHOLD;
        }
    }

    // Mouse Wheel Support (Desktop)
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();

        // Reset pointer-based state to avoid conflicts
        if (isDragging) {
            setIsDragging(false);
            activePointerId.current = null;
        }

        // Map scrollY to rotation delta
        const SENSITIVITY = 0.35;
        const MAX_SPEED = 60;

        let delta = e.deltaY * SENSITIVITY;

        // Clamp for safety/control
        if (delta > MAX_SPEED) delta = MAX_SPEED;
        if (delta < -MAX_SPEED) delta = -MAX_SPEED;

        accumulatedDelta.current += delta;
        processDelta();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (activePointerId.current !== e.pointerId) return;

        if (isDragging && !hasMoved.current) {
            // It was a TAP! Determine button by Angle.
            // Recalculate angle to be safe, or use last known
            const angle = getAngle(e.clientX, e.clientY);

            if (enableSounds) playClick();

            // Normalize angle logic
            // Menu (Top): -135 to -45
            if (angle > -135 && angle < -45) {
                onMenu();
                triggerHaptic(10);
            }
            // Play (Bottom): 45 to 135
            else if (angle > 45 && angle < 135) {
                onPlayPause();
                triggerHaptic(10);
            }
            // Next (Right): -45 to 45
            else if (angle >= -45 && angle <= 45) {
                onNext();
                triggerHaptic(10);
            }
            // Prev (Left): <-135 or >135
            else {
                onPrev();
                triggerHaptic(10);
            }
        }

        // Reset
        setIsDragging(false);
        lastAngle.current = null;
        activePointerId.current = null;
        wheelRef.current?.releasePointerCapture(e.pointerId);
    };

    // Center Button Refs
    const isCenterPressed = useRef(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    // Theme-based colors (matching real iPod designs)
    const getThemeColors = () => {
        switch (theme) {
            case 'black':
                return {
                    wheel: 'bg-[#1a1a1a] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]',
                    button: 'from-[#2a2a2a] to-[#111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]',
                    text: 'text-zinc-600'
                };
            case 'silver':
                // EXACT MATCH: Conic Gradient + Etched Text
                return {
                    wheel: 'bg-[conic-gradient(from_180deg_at_50%_50%,#f3f4f6_0deg,#e5e7eb_180deg,#f3f4f6_360deg)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.5)]',
                    button: 'from-[#f3f4f6] to-[#d1d5db] shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,1)]',
                    text: 'text-neutral-500 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]' // Etched effect
                };
            case 'blue':
                return {
                    wheel: 'bg-[radial-gradient(circle,#ffffff_0%,#f0f0f0_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_2px_5px_rgba(255,255,255,0.8)]',
                    button: 'bg-[radial-gradient(circle,#f8f8f8_0%,#e0e0e0_100%)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.05)] border border-slate-200',
                    text: 'text-slate-400 font-bold uppercase tracking-widest'
                };
            case 'rosegold':
                return {
                    wheel: 'bg-[#fcfcfc] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.8)] border border-[#d49a89]/10',
                    button: 'bg-gradient-to-b from-[#f4d0c5] to-[#d49a89] shadow-[0_4px_10px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.6)]',
                    text: 'text-[#b76e79]/80 font-bold tracking-[0.15em]'
                };
            case 'blush':
                return {
                    wheel: 'bg-[#fffcf2] shadow-[inset_0_2px_5px_rgba(0,0,0,0.05),0_4px_10px_rgba(0,0,0,0.1)] border-4 border-white/20',
                    button: 'bg-white border border-black/5 shadow-md',
                    text: 'text-[#d4a373] font-black tracking-widest uppercase'
                };
            case 'dark':
                return {
                    wheel: 'bg-[#1e2329] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]',
                    button: 'from-[#2b3036] to-[#1e2329] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]',
                    text: 'text-neutral-500'
                };
            case 'classic':
            default:
                return {
                    wheel: 'bg-[#f5f5f5] shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]',
                    button: 'from-[#fff] to-[#e8e8e8] shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.1)]',
                    text: 'text-zinc-400'
                };
        }
    };

    const colors = getThemeColors();

    return (
        <div
            ref={wheelRef}
            className={`relative size-64 ${colors.wheel} rounded-full shadow-[inset_0_5px_10px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer active:brightness-95 transition-all select-none touch-none pointer-events-auto`}
            style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
        >
            {children}
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
                className={`size-24 bg-gradient-to-b ${colors.button} rounded-full shadow-[inset_0_2px_5px_rgba(255,255,255,1),0_2px_5px_rgba(0,0,0,0.1)] active:scale-95 transition-all z-20 relative will-change-transform outline-none focus:outline-none`}
                style={{ contain: 'layout', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    isCenterPressed.current = true;
                    // Reset consumed flag
                    // We need a ref for consumed state if we want to block the UP event
                    // However, we are setting isCenterPressed to false in the timeout, so that should block UP action.

                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    longPressTimer.current = setTimeout(() => {
                        if (isCenterPressed.current) {
                            if (onLongSelect) {
                                onLongSelect();
                                triggerHaptic([15, 30, 15]);
                                if (enableSounds) playClick();
                            }
                            isCenterPressed.current = false; // Mark as consumed so release doesn't trigger select
                        }
                    }, 800);
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                    }
                    // Only trigger if still pressed (not consumed by long press)
                    if (isCenterPressed.current) {
                        onSelect();
                        triggerHaptic(10);
                        if (enableSounds) playClick();
                    }
                    isCenterPressed.current = false;
                }}
                onPointerLeave={() => {
                    isCenterPressed.current = false;
                    if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                    }
                }}
            />
        </div>
    );
}
