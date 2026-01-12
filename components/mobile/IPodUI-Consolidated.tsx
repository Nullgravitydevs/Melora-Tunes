/**
 * CONSOLIDATED iPOD UI FILE
 * 
 * This file contains all the main iPod UI components combined into one place
 * for easier styling and visual improvements.
 * 
 * Contains:
 * - Theme Definitions (Colors, Shadows, Gradients)
 * - Click Wheel Component
 * - Screen Component  
 * - Main iPod Shell
 * 
 * After making improvements, share this file back for integration.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, FastForward, Rewind, Music, Battery, Clock } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

type ThemeType = 'classic' | 'black' | 'silver' | 'dark';

/**
 * iPod Case Theme Styles
 * Customize these gradients and shadows for different iPod looks
 */
const CASE_THEMES = {
    black: {
        // Glossy Black (U2 Edition / Video style)
        gradient: 'bg-gradient-to-b from-[#2a2a2a] via-[#111] to-[#050505]',
        border: 'border-[#1a1a1a]',
        shadow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
        branding: 'text-white/20'
    },
    silver: {
        // Anodized Aluminum (Classic 6G/7G style)
        gradient: 'bg-gradient-to-b from-[#f0f0f0] via-[#dcdcdc] to-[#b0b0b0]',
        border: 'border-[#b0b0b0]',
        shadow: 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]',
        branding: 'text-zinc-500/80'
    },
    dark: {
        // Modern Matte Dark
        gradient: 'bg-[#181818]',
        border: 'border-[#222]',
        shadow: 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)]',
        branding: 'text-white/20'
    },
    classic: {
        // Classic Polycarbonate White (Glossy)
        gradient: 'bg-gradient-to-b from-[#ffffff] via-[#f5f5f5] to-[#e8e8e8]',
        border: 'border-[#dcdcdc]',
        shadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)]',
        branding: 'text-zinc-500/80'
    }
};

/**
 * Click Wheel Theme Styles
 * Wheel and center button colors for each theme
 */
const WHEEL_THEMES = {
    black: {
        wheel: 'bg-[#1a1a1a] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]',
        button: 'from-[#2a2a2a] to-[#111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.5)]',
        text: 'text-zinc-600'
    },
    silver: {
        wheel: 'bg-[#e0e0e0] shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]',
        button: 'from-[#f5f5f5] to-[#dcdcdc] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)]',
        text: 'text-zinc-500'
    },
    dark: {
        wheel: 'bg-[#222] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]',
        button: 'from-[#333] to-[#222] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)]',
        text: 'text-zinc-500'
    },
    classic: {
        wheel: 'bg-[#f5f5f5] shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]',
        button: 'from-[#fff] to-[#e8e8e8] shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.1)]',
        text: 'text-zinc-400'
    }
};

// ============================================================================
// CLICK WHEEL COMPONENT
// ============================================================================

interface ClickWheelProps {
    theme?: ThemeType;
    onScroll: (direction: 1 | -1) => void;
    onSelect: () => void;
    onMenu: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
}

function ClickWheel({
    theme = 'classic',
    onScroll,
    onSelect,
    onMenu,
    onPlayPause,
    onNext,
    onPrev
}: ClickWheelProps) {
    const wheelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastAngle = useRef<number | null>(null);
    const accumulatedDelta = useRef(0);

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
        e.preventDefault();
        wheelRef.current?.setPointerCapture(e.pointerId);
        setIsDragging(true);
        lastAngle.current = getAngle(e.clientX, e.clientY);
        accumulatedDelta.current = 0;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || lastAngle.current === null) return;
        e.preventDefault();

        const currentAngle = getAngle(e.clientX, e.clientY);
        let delta = currentAngle - lastAngle.current;

        // Handle wrap-around
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        accumulatedDelta.current += delta;
        lastAngle.current = currentAngle;

        // Trigger scroll every 15 degrees
        const threshold = 15;
        if (Math.abs(accumulatedDelta.current) >= threshold) {
            const direction = accumulatedDelta.current > 0 ? 1 : -1;
            onScroll(direction);
            accumulatedDelta.current = 0;
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;

        // Check if it was a tap (no movement)
        if (Math.abs(accumulatedDelta.current) < 5) {
            const angle = getAngle(e.clientX, e.clientY);

            // Menu (Top)
            if (angle > -135 && angle < -45) onMenu();
            // Play (Bottom)
            else if (angle > 45 && angle < 135) onPlayPause();
            // Next (Right)
            else if (angle >= -45 && angle <= 45) onNext();
            // Prev (Left)
            else onPrev();
        }

        setIsDragging(false);
        lastAngle.current = null;
        wheelRef.current?.releasePointerCapture(e.pointerId);
    };

    const colors = WHEEL_THEMES[theme];

    return (
        <div
            ref={wheelRef}
            className={`relative size-64 ${colors.wheel} rounded-full flex items-center justify-center cursor-pointer active:brightness-95 transition-all select-none touch-none pointer-events-auto`}
            style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Visual Labels */}
            <div className={`absolute top-4 font-bold ${colors.text} font-sans tracking-wide text-[11px] pointer-events-none`}>MENU</div>
            <div className={`absolute left-4 ${colors.text} pointer-events-none`}><Rewind size={18} fill="currentColor" /></div>
            <div className={`absolute right-4 ${colors.text} pointer-events-none`}><FastForward size={18} fill="currentColor" /></div>
            <div className={`absolute bottom-4 ${colors.text} flex gap-0.5 pointer-events-none`}>
                <Play size={10} fill="currentColor" />
                <Pause size={10} fill="currentColor" />
            </div>

            {/* Center Button */}
            <motion.div
                className={`size-24 bg-gradient-to-b ${colors.button} rounded-full active:scale-95 transition-all z-20 relative will-change-transform outline-none focus:outline-none`}
                style={{ contain: 'layout', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
            />
        </div>
    );
}

// ============================================================================
// SCREEN COMPONENT
// ============================================================================

interface ScreenProps {
    title: string;
    menuItems: string[];
    selectedIndex: number;
    theme: ThemeType;
}

function Screen({ title, menuItems, selectedIndex, theme }: ScreenProps) {
    const VISIBLE_COUNT = 9; // Number of visible menu items

    return (
        <div className="w-full h-full bg-gradient-to-b from-[#E8F4FF] via-[#F0F8FF] to-[#E0F0FF] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="w-full bg-gradient-to-b from-[#D0E8FF] to-[#E0F0FF] border-b border-[#B8D4E8] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Music size={14} className="text-[#4A90E2]" />
                    <span className="text-xs font-semibold text-[#2C3E50] tracking-wide">{title}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Battery size={14} className="text-[#4A90E2]" />
                    <Clock size={14} className="text-[#4A90E2]" />
                </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col justify-start py-2 px-1">
                    {menuItems.slice(0, VISIBLE_COUNT).map((item, index) => (
                        <div
                            key={index}
                            className={`px-4 py-2 text-sm font-medium transition-all ${selectedIndex === index
                                    ? 'bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white rounded-md shadow-sm'
                                    : 'text-[#2C3E50] hover:bg-white/30'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="truncate">{item}</span>
                                {selectedIndex === index && (
                                    <span className="text-white/80">›</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Info */}
            <div className="w-full bg-gradient-to-b from-[#E0F0FF] to-[#D0E8FF] border-t border-[#B8D4E8] px-4 py-1">
                <div className="text-[10px] text-[#4A90E2] font-medium text-center">
                    {selectedIndex + 1} of {menuItems.length}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN iPOD COMPONENT
// ============================================================================

export function IPodUIConsolidated() {
    const [theme, setTheme] = useState<ThemeType>('classic');
    const [menuItems] = useState([
        "Music",
        "Cover Flow",
        "Cinema Mode",
        "Games",
        "Settings",
        "Now Playing"
    ]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleScroll = (direction: 1 | -1) => {
        setSelectedIndex(prev => {
            const newIndex = prev + direction;
            if (newIndex < 0) return menuItems.length - 1;
            if (newIndex >= menuItems.length) return 0;
            return newIndex;
        });
    };

    const caseTheme = CASE_THEMES[theme];

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-zinc-900 p-4 overflow-hidden pointer-events-none">
            {/* iPod Case */}
            <motion.div
                className={`relative w-full max-w-[450px] aspect-[1/1.65] ${caseTheme.gradient} rounded-[3.5rem] shadow-2xl flex flex-col items-center p-6 border-[6px] ${caseTheme.border} ring-1 ring-black/5 will-change-transform contain-layout pointer-events-auto select-none touch-manipulation`}
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                }}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
                {/* Metallic Sheen */}
                <div className="absolute inset-0 rounded-[2.6rem] bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

                {/* Screen Area (Top 48%) */}
                <div className="w-full h-[48%] bg-black rounded-lg border-[3px] border-[#333] shadow-inner mb-4 overflow-hidden relative z-10">
                    <Screen
                        title="TFI Stereo"
                        menuItems={menuItems}
                        selectedIndex={selectedIndex}
                        theme={theme}
                    />
                </div>

                {/* Branding */}
                <div className="w-full flex justify-center items-center mb-6 relative z-10">
                    <span className={`text-[10px] font-bold tracking-[0.2em] font-sans ${caseTheme.branding}`}>
                        TFI STEREO
                    </span>
                </div>

                {/* Glass Reflections */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none" />

                {/* Click Wheel Area */}
                <div className="flex-1 w-full flex items-start justify-center relative z-10">
                    <ClickWheel
                        theme={theme}
                        onScroll={handleScroll}
                        onSelect={() => console.log('Select')}
                        onMenu={() => console.log('Menu')}
                        onPlayPause={() => console.log('Play/Pause')}
                        onNext={() => console.log('Next')}
                        onPrev={() => console.log('Prev')}
                    />
                </div>
            </motion.div>

            {/* Theme Switcher (For Testing) */}
            <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
                {(['classic', 'black', 'silver', 'dark'] as ThemeType[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-1 rounded text-xs font-medium ${theme === t
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>
    );
}
