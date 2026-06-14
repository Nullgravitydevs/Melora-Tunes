"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Shuffle, Repeat, Repeat1, ListMusic } from "lucide-react";
import { Visualizer } from "./visualizer";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { PlayableTrack, AudioQuality, isPlayableTrack } from "@/lib/types";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudio } from "@/hooks/use-audio";

export interface PlayerProps {
    isPlaying: boolean;
    hasCassette: boolean;
    cassetteTitle?: string;
    cassetteColor?: string;
    currentSong?: JioSaavnSong;
    currentTrack?: PlayableTrack | null; // Added for Quality Badges
    onPlayToggle: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    volume: number;
    onVolumeChange: (vol: number) => void;
    progress?: number;
    onSeek?: (val: number) => void;

    // Playback state
    shuffle?: boolean;
    onShuffleToggle?: () => void;
    repeat?: 'off' | 'one' | 'all';
    onRepeatToggle?: () => void;
    onOpenQueue?: () => void;

    activeQuality?: AudioQuality | null; // Actual resolved quality (source of truth)
    className?: string;
    dragConstraints?: React.RefObject<Element>;
    drag?: boolean;
    onEject?: () => void;
    currentTheme?: ThemeKey;
}

export type LayoutType = 'cassette' | 'studio' | 'zen' | 'bauhaus' | 'nordic' | 'opendeck' | 'boombox' | 'silverfrost' | 'glass';

export interface ThemeConfig {
    name: string;
    layout: LayoutType;
    bodyGradient: string;
    screenBg: string;
    cassetteBg: string;
    labelBg: string;
    lcdBg: string;
    buttonBg: string;
    playButtonBg: string;
    previewImage?: string; // URL for the theme preview image
}

export const THEMES: Record<string, ThemeConfig> = {


    METAL: {
        name: "Realistic Metal Edition",
        layout: 'studio',
        bodyGradient: "bg-black",
        screenBg: "bg-zinc-900",
        cassetteBg: "bg-zinc-800",
        labelBg: "bg-zinc-900",
        lcdBg: "bg-orange-500",
        buttonBg: "bg-zinc-800",
        playButtonBg: "bg-orange-600",
        previewImage: "/themes/theme-metal.png"
    },
    ZEN: {
        name: "Zen Minimalist Edition",
        layout: 'zen',
        bodyGradient: "bg-[#fcfbf9]",
        screenBg: "bg-[#fcfbf9]",
        cassetteBg: "bg-white",
        labelBg: "bg-[#F0EFEB]",
        lcdBg: "bg-white",
        buttonBg: "bg-white",
        playButtonBg: "bg-stone-900",
        previewImage: "/themes/theme-zen.png"
    },
    BAUHAUS: {
        name: "Bauhaus Aesthetic Edition",
        layout: 'bauhaus',
        bodyGradient: "bg-[#f4f4f0]",
        screenBg: "bg-[#f4f4f0]",
        cassetteBg: "bg-white",
        labelBg: "bg-white",
        lcdBg: "bg-neutral-900",
        buttonBg: "bg-white",
        playButtonBg: "bg-[#0052cc]",
        previewImage: "/themes/theme-bauhaus.png"
    },
    NORDIC: {
        name: "Nordic Noir Minimal",
        layout: 'nordic',
        bodyGradient: "bg-[#1a1c20]",
        screenBg: "bg-[#1a1c20]",
        cassetteBg: "bg-[#24272b]",
        labelBg: "bg-[#f0f2f5]",
        lcdBg: "bg-[#7b8577]",
        buttonBg: "bg-[#24272b]",
        playButtonBg: "bg-[#3b82f6]",
        previewImage: "/themes/theme-nordic.png"
    },
    OPENDECK: {
        name: "Zen Open Deck Edition",
        layout: 'opendeck',
        bodyGradient: "bg-[#f6f5f4]",
        screenBg: "bg-[#f6f5f4]",
        cassetteBg: "bg-white",
        labelBg: "bg-neutral-100",
        lcdBg: "bg-neutral-200",
        buttonBg: "bg-white",
        playButtonBg: "bg-[#2d8652]",
        previewImage: "/themes/theme-opendeck.png"
    },
    BOOMBOX: {
        name: "Sport Boombox Edition",
        layout: 'boombox',
        bodyGradient: "bg-yellow-400",
        screenBg: "bg-[#3e2f24]",
        cassetteBg: "bg-neutral-800",
        labelBg: "bg-yellow-100",
        lcdBg: "bg-[#9ea792]",
        buttonBg: "bg-zinc-700",
        playButtonBg: "bg-blue-500",
        previewImage: "/themes/theme-boombox.png"
    },
    SILVERFROST: {
        name: "Silver Frost Lab Edition",
        layout: 'silverfrost',
        bodyGradient: "bg-[#f7f7f8]",
        screenBg: "bg-[#f7f7f8]",
        cassetteBg: "bg-white/40",
        labelBg: "bg-white",
        lcdBg: "bg-black",
        buttonBg: "bg-white/40",
        playButtonBg: "bg-[#00aaff]",
        previewImage: "/themes/theme-silverfrost.png"
    },
    GLASS: {
        name: "Glass OS (Discovery Mode)",
        layout: 'glass',
        bodyGradient: "bg-black",
        screenBg: "bg-black",
        cassetteBg: "bg-transparent",
        labelBg: "bg-transparent",
        lcdBg: "bg-transparent",
        buttonBg: "bg-transparent",
        playButtonBg: "bg-transparent"
    }
};

export type ThemeKey = keyof typeof THEMES;

// --- Sub-Components ---

function CassetteDeck({ theme, ...props }: PlayerProps & { theme: ThemeConfig }) {
    const {
        isPlaying, hasCassette, cassetteTitle, cassetteColor = "orange", currentSong,
        onPlayToggle, onNext, onPrev, volume, onVolumeChange,
        progress = 0, onSeek, shuffle, onShuffleToggle, repeat = 'off', onRepeatToggle,
        onOpenQueue, className, dragConstraints, drag = true, onEject, currentTrack,
        activeQuality
    } = props;

    const { playClick, playClunk, playEject } = useAudio();

    const cassetteColors: Record<string, string> = {
        orange: "#ff6600", purple: "#9933ff", white: "#e0e0e0", green: "#00cc66", red: "#ff0055",
        blue: "#2563eb", yellow: "#eab308", cyan: "#06b6d4", pink: "#db2777", black: "#27272a"
    };
    const displayColor = cassetteColors[cassetteColor] || cassetteColor || "#ff6600";

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const songDuration = currentSong?.duration ? parseInt(currentSong.duration.toString()) : 0;
    const currentTime = progress * songDuration;

    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                className={clsx(
                    "relative w-[360px] h-[500px] shrink-0 rounded-xl bg-gradient-to-b p-5 shadow-2xl border border-gray-300 dark:border-gray-600 select-none",
                    theme.bodyGradient,
                    className
                )}
                drag={drag}
                dragConstraints={dragConstraints}
                dragMomentum={false}
                dragElastic={0.1}
            >
                {/* Corner Screws */}
                <div className="absolute top-2 left-2 size-2 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center shadow-sm">
                    <div className="absolute w-px h-1.5 bg-gray-500 dark:bg-gray-400"></div>
                    <div className="absolute w-1.5 h-px bg-gray-500 dark:bg-gray-400"></div>
                </div>
                <div className="absolute top-2 right-2 size-2 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center shadow-sm">
                    <div className="absolute w-px h-1.5 bg-gray-500 dark:bg-gray-400"></div>
                    <div className="absolute w-1.5 h-px bg-gray-500 dark:bg-gray-400"></div>
                </div>
                <div className="absolute bottom-2 left-2 size-2 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center shadow-sm">
                    <div className="absolute w-px h-1.5 bg-gray-500 dark:bg-gray-400"></div>
                    <div className="absolute w-1.5 h-px bg-gray-500 dark:bg-gray-400"></div>
                </div>
                <div className="absolute bottom-2 right-2 size-2 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center shadow-sm">
                    <div className="absolute w-px h-1.5 bg-gray-500 dark:bg-gray-400"></div>
                    <div className="absolute w-1.5 h-px bg-gray-500 dark:bg-gray-400"></div>
                </div>

                <div className="flex flex-col h-full justify-between text-center">
                    {/* Title */}
                    <div>
                        <h3 className="text-gray-800 dark:text-gray-200 tracking-tight text-xl font-bold leading-tight">
                            MELORA STEREO PLAYER
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] font-normal leading-normal">
                            AUTO REVERSE
                        </p>
                    </div>

                    {/* Cassette Window */}
                    <div className="bg-[#1a1a1a] rounded-lg p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] relative overflow-hidden border-b border-gray-700">
                        {/* Glass Reflection */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20"></div>
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-10 mix-blend-overlay"></div>

                        {hasCassette ? (
                            <div
                                className="rounded p-3 text-center shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-colors duration-500 relative z-10 ring-1 ring-black/20"
                                style={{ backgroundColor: cassetteColor || displayColor }}
                            >
                                {/* Screw / Mechanical details */}
                                <div className="absolute top-1 left-1 size-1.5 rounded-full bg-black/30"></div>
                                <div className="absolute top-1 right-1 size-1.5 rounded-full bg-black/30"></div>
                                <div className="absolute bottom-1 left-1 size-1.5 rounded-full bg-black/30"></div>
                                <div className="absolute bottom-1 right-1 size-1.5 rounded-full bg-black/30"></div>

                                {/* White Label */}
                                <div className="bg-[#f0f0f0] p-2 border border-gray-300 shadow-sm transform rotate-180 relative mx-1">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500/10"></div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500/10"></div>

                                    <p className="text-black text-xs font-black leading-tight tracking-tighter truncate font-mono transform rotate-180 uppercase scale-y-[0.9]">
                                        {currentSong ? decodeHtml(currentSong.name) : cassetteTitle || "Untitled"}
                                    </p>
                                    <p className="text-gray-500 text-[9px] font-bold leading-normal truncate transform rotate-180 font-mono tracking-widest pt-0.5">
                                        {currentSong ? decodeHtml(currentSong.primaryArtists) : "MELORA"}
                                    </p>
                                </div>

                                {/* Tape Reels Area */}
                                <div className="flex justify-around items-center mt-3 px-3 relative">
                                    {/* Trapezoid Window Cutout Background */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[120%] bg-black/20 rounded-lg blur-sm"></div>

                                    {/* Left Reel */}
                                    <div className={clsx(
                                        "size-12 rounded-full flex items-center justify-center relative shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] bg-black",
                                        isPlaying && "animate-spin"
                                    )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                        <div className="absolute w-[95%] h-[95%] rounded-full border-[6px] border-[#3a2c2c] box-border"></div>
                                        <div className="absolute w-[65%] h-[65%] rounded-full bg-[#f0f0f0] flex items-center justify-center z-30 shadow-md">
                                            <div className="absolute w-1.5 h-full bg-[#333]"></div>
                                            <div className="absolute w-full h-1.5 bg-[#333]"></div>
                                            <div className="absolute size-2.5 bg-[#111] rounded-full border border-gray-600 z-40"></div>
                                        </div>
                                    </div>

                                    {/* Tape Window (Transparent center) */}
                                    <div className="h-8 flex-1 mx-1 bg-[#1a1a1a] rounded border-[0.5px] border-white/20 flex items-center justify-center overflow-hidden relative shadow-inner">
                                        <div className="w-full h-px bg-red-500/50 absolute top-1/2 -translate-y-1/2"></div>
                                        <div className="w-full h-4 bg-[#2a1d1d] opacity-90"></div>
                                    </div>

                                    {/* Right Reel */}
                                    <div className={clsx(
                                        "size-12 rounded-full flex items-center justify-center relative shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] bg-black",
                                        isPlaying && "animate-spin"
                                    )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                        <div className="absolute w-[95%] h-[95%] rounded-full border-[6px] border-[#3a2c2c] box-border"></div>
                                        <div className="absolute w-[65%] h-[65%] rounded-full bg-[#f0f0f0] flex items-center justify-center z-30 shadow-md">
                                            <div className="absolute w-1.5 h-full bg-[#333]"></div>
                                            <div className="absolute w-full h-1.5 bg-[#333]"></div>
                                            <div className="absolute size-2.5 bg-[#111] rounded-full border border-gray-600 z-40"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#1a1a1a] rounded p-3 h-32 flex items-center justify-center shadow-inner">
                                <p className="text-gray-600 font-mono text-xs tracking-widest uppercase">No Cassette</p>
                            </div>
                        )}
                    </div>

                    {/* LCD Display */}
                    <div className="bg-[#9da8a3] rounded p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] text-left overflow-hidden border border-black/20 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-2 relative z-10 w-full">
                            <p className="text-black font-bold font-mono text-sm leading-normal whitespace-nowrap opacity-80 tracking-tight flex-1 min-w-0 truncate">
                                {currentSong ? (
                                    <span className="animate-pulse">▶ {decodeHtml(currentSong.name).substring(0, 20)}</span>
                                ) : "READY"}
                            </p>
                            {/* LCD Quality Badge */}
                            {/* [MODIFIED] Use Unified QualityBadge (Full Variant) */}
                            <div className="absolute top-6 right-6 transform scale-75 origin-right">
                                <QualityBadge quality={activeQuality} variant="full" />
                            </div>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="px-1 py-1">
                        <Visualizer isPlaying={isPlaying} accentColor="#00d8ff" className="w-full h-8 rounded opacity-80" />
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-1 px-2 pt-2">
                        <div className="flex gap-4 justify-between">
                            <p className="text-gray-400 text-[10px] font-mono tracking-widest">
                                {formatTime(currentTime)}
                            </p>
                            <p className="text-gray-400 text-[10px] font-mono tracking-widest">
                                {formatTime(songDuration)}
                            </p>
                        </div>
                        <div
                            className="rounded-full bg-[#111] border-b border-white/10 h-3 group cursor-pointer relative shadow-inner overflow-hidden"
                            onClick={handleProgressBarClick}
                        >
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 relative transition-all duration-300"
                                style={{ width: `${progress * 100}%` }}
                                animate={isPlaying ? {
                                    boxShadow: [
                                        "0 0 10px rgba(255,100,0,0.4)",
                                        "0 0 20px rgba(255,100,0,0.8)",
                                        "0 0 10px rgba(255,100,0,0.4)"
                                    ]
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Shuffle & Repeat Controls */}
                    <div className="flex items-center justify-center gap-2 px-2" onPointerDown={(e) => e.stopPropagation()}>
                        <motion.button
                            onClick={() => { playClick(); onShuffleToggle?.(); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className={clsx(
                                "flex items-center justify-center rounded-full size-9 shadow-md transition-all duration-300",
                                shuffle
                                    ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:shadow-[0_0_16px_rgba(6,182,212,0.8)]"
                                    : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:shadow-lg"
                            )}
                            title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                            aria-label="Toggle Shuffle"
                        >
                            <Shuffle className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onRepeatToggle?.(); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className={clsx(
                                "flex items-center justify-center rounded-full size-9 shadow-md transition-all duration-300",
                                repeat !== 'off'
                                    ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:shadow-[0_0_16px_rgba(6,182,212,0.8)]"
                                    : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:shadow-lg"
                            )}
                            title={repeat === 'off' ? 'Repeat: Off' : repeat === 'all' ? 'Repeat: All' : 'Repeat: One'}
                            aria-label="Toggle Repeat"
                        >
                            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onOpenQueue?.(); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="flex items-center justify-center rounded-full size-9 shadow-md transition-all duration-300 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white hover:shadow-lg"
                            title="View Queue"
                            aria-label="View Queue"
                        >
                            <ListMusic className="w-4 h-4" />
                        </motion.button>

                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-4 py-2" onPointerDown={(e) => e.stopPropagation()}>
                        <motion.button
                            onClick={() => { playClick(); onPrev?.(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200")}
                            aria-label="Previous"
                        >
                            <SkipBack className="w-5 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => { playClunk(); onPlayToggle(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            className={clsx(theme.playButtonBg, "flex shrink-0 items-center justify-center rounded-full size-16 text-white shadow-lg hover:shadow-xl active:shadow-inner transition-all duration-200")}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onNext?.(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200")}
                            aria-label="Next"
                        >
                            <SkipForward className="w-6 h-6" />
                        </motion.button>
                    </div>

                    {/* Eject Button (Small, discreet) */}
                    <div className="flex justify-center pb-2" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => { playEject(); onEject?.(); }}
                            className="text-[10px] font-bold text-gray-500 hover:text-red-500 tracking-widest uppercase flex items-center gap-1 transition-colors"
                        >
                            <LogOut size={12} /> EJECT
                        </button>
                    </div>

                </div>

                {/* LEDs and Volume */}
                <div className="flex justify-between items-center gap-2 px-2 py-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className={clsx(
                                "size-2.5 rounded-full",
                                isPlaying ? "bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]" : "bg-gray-400"
                            )}></div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">REC</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="size-2.5 rounded-full bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">BATT</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 tracking-wider font-mono shrink-0">VOL</span>
                        <Volume2 className="text-gray-600 dark:text-gray-400 size-5" />
                        <div className="w-16 h-1 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const newVol = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                                onVolumeChange(newVol);
                            }}
                        >
                            <div className="h-1 rounded-full bg-cyan-500" style={{ width: `${volume * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function StudioDeck({ theme, ...props }: PlayerProps & { theme: ThemeConfig }) {
    const {
        isPlaying, hasCassette, currentSong,
        onPlayToggle, onNext, onPrev, volume, onVolumeChange,
        progress = 0, onSeek, onEject, currentTrack, activeQuality
    } = props;

    const { playClick, playClunk, playEject } = useAudio();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const songDuration = currentSong?.duration ? parseInt(currentSong.duration.toString()) : 0;
    const currentTime = progress * songDuration;

    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                className={clsx(
                    "relative w-[360px] h-[580px] shrink-0 rounded-[2rem] bg-player-body text-gray-800 p-6 shadow-2xl border-4 border-gray-300 dark:border-gray-600 ring-1 ring-black/5 flex flex-col justify-between overflow-hidden select-none",
                    props.className
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                drag={props.drag}
                dragConstraints={props.dragConstraints}
            >
                {/* Screws */}
                <div className="absolute top-4 left-4 text-gray-400"><span className="material-icons-round text-sm">add</span></div>
                <div className="absolute top-4 right-4 text-gray-400"><span className="material-icons-round text-sm">add</span></div>
                <div className="absolute bottom-4 left-4 text-gray-400"><span className="material-icons-round text-sm">add</span></div>
                <div className="absolute bottom-4 right-4 text-gray-400"><span className="material-icons-round text-sm">add</span></div>

                {/* Header */}
                <div className="text-center mt-2 mb-4">
                    <h2 className="font-display text-gray-400 text-lg uppercase tracking-tighter shadow-white drop-shadow-md">Stereo Cassette</h2>
                    <p className="text-[10px] font-mono text-gray-400 tracking-[0.2em] mt-1">AUTO REVERSE</p>
                </div>

                {/* Screen / Cassette Window */}
                <div className="bg-player-screen w-full aspect-[16/10] rounded-xl shadow-inset-deep relative mb-4 border-b-2 border-gray-700 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1))] bg-[length:100%_4px] opacity-20 pointer-events-none z-10"></div>
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent z-10"></div>

                    {hasCassette ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 z-0">
                            {/* Simple Cassette Animation for Studio Deck - Abstracted */}
                            <div className="w-full h-full bg-black/50 rounded flex items-center justify-center gap-4">
                                <div className={clsx("w-12 h-12 rounded-full border-4 border-gray-700 bg-black flex items-center justify-center", isPlaying && "animate-spin")} style={{ animationDuration: '3s' }}>
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                        <div className="w-3 h-1 bg-black"></div>
                                        <div className="w-1 h-3 bg-black absolute"></div>
                                    </div>
                                </div>
                                <div className={clsx("w-12 h-12 rounded-full border-4 border-gray-700 bg-black flex items-center justify-center", isPlaying && "animate-spin")} style={{ animationDuration: '3s' }}>
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                        <div className="w-3 h-1 bg-black"></div>
                                        <div className="w-1 h-3 bg-black absolute"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="font-mono text-gray-600 text-sm tracking-widest z-0">NO CASSETTE</p>
                    )}
                </div>

                {/* Status Strip */}
                <div className="bg-gray-400/50 dark:bg-gray-500/50 h-10 w-full rounded-md shadow-inner mb-4 flex items-center px-4 border border-gray-400/30 overflow-hidden text-gray-800 dark:text-black">
                    <span className="font-mono font-bold tracking-widest text-base truncate flex-1">
                        {currentSong ? decodeHtml(currentSong.name) : "READY"}
                    </span>

                    {/* Studio Quality Indicator */}
                    {activeQuality && (
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* [MODIFIED] Use Unified QualityBadge (Full Variant) */}
                            <div className="absolute top-2 right-4 transform scale-90 origin-right">
                                <QualityBadge quality={activeQuality} variant="full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Visualizer (Simulated LED) */}
                <div className="bg-gray-800 h-8 w-full rounded mb-4 p-1 flex gap-0.5 items-end shadow-inner opacity-80">
                    <div className="w-full h-full bg-transparent flex items-end justify-between px-1">
                        {[40, 60, 30, 80, 50, 90, 70, 40, 60, 30, 50, 80].map((h, i) => (
                            <motion.div
                                key={i}
                                className={clsx("w-1.5 rounded-sm", h > 80 ? "bg-red-500" : h > 60 ? "bg-yellow-500" : "bg-green-500")}
                                animate={isPlaying ? { height: [`${Math.max(10, h - 20)}%`, `${h}%`, `${Math.max(10, h - 30)}%`] } : { height: '10%' }}
                                transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5, repeatType: "reverse" }}
                            />
                        ))}
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-6 px-2">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(songDuration)}</span>
                    </div>
                    <div
                        className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const newP = (e.clientX - rect.left) / rect.width;
                            if (onSeek) onSeek(newP);
                        }}
                    >
                        <motion.div className="h-full bg-gray-800 dark:bg-black" style={{ width: `${progress * 100}%` }} />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-6 mb-6">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { playClick(); onPrev?.(); }}
                        className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-metal-button active:shadow-inner flex items-center justify-center group border-2 border-blue-300"
                    >
                        <span className="material-icons-round text-2xl drop-shadow-md">skip_previous</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { playClick(); onPlayToggle(); }}
                        className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-metal-button active:shadow-inner flex items-center justify-center group border-4 border-blue-300 z-10"
                    >
                        <span className="material-icons-round text-4xl ml-1 drop-shadow-md">
                            {isPlaying ? "pause" : "play_arrow"}
                        </span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { playClick(); onNext?.(); }}
                        className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-metal-button active:shadow-inner flex items-center justify-center group border-2 border-blue-300"
                    >
                        <span className="material-icons-round text-2xl drop-shadow-md">skip_next</span>
                    </motion.button>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-2 text-xs font-mono text-gray-500 font-bold">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <div className={clsx("w-2 h-2 rounded-full shadow-inner", isPlaying ? "bg-red-500 animate-pulse" : "bg-gray-300")}></div>
                            <span>REC</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            <span>BATT</span>
                        </div>
                    </div>

                    <button
                        onClick={() => { playEject(); onEject?.(); }}
                        className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <span className="material-icons-round text-sm">eject</span>
                        <span className="mt-0.5 tracking-widest text-[9px]">EJECT</span>
                    </button>

                    <div className="flex items-center gap-2 w-24">
                        <span className="text-[9px] font-bold text-gray-400 font-mono shrink-0">VOL</span>
                        <span className="material-icons-round text-base text-gray-400">volume_up</span>
                        <div
                            className="h-1 flex-grow bg-gray-300 rounded-full relative cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const newVol = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                                onVolumeChange(newVol);
                            }}
                        >
                            <div className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full" style={{ width: `${volume * 100}%` }}></div>
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-400 rounded-full shadow-sm" style={{ left: `${volume * 100}%` }}></div>
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}

export function DesktopPlayer(props: PlayerProps) {
    const { currentTheme = 'ZEN', currentTrack } = props;
    const theme = THEMES[currentTheme];

    if (theme.layout === 'studio') {
        return <StudioDeck {...props} theme={theme} />;
    }

    return <CassetteDeck {...props} theme={theme} />;
}
