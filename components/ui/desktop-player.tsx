"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Palette, Volume2, LogOut } from "lucide-react";
import { Visualizer } from "./visualizer";
import { useState } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { useAudio } from "@/hooks/use-audio";

interface PlayerProps {
    isPlaying: boolean;
    hasCassette: boolean;
    cassetteTitle?: string;
    cassetteColor?: string;
    currentSong?: JioSaavnSong;
    onPlayToggle: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    volume: number;
    onVolumeChange: (vol: number) => void;
    progress?: number;
    onSeek?: (val: number) => void;

    className?: string;
    dragConstraints?: React.RefObject<Element>;
    drag?: boolean;
    onEject?: () => void;
}

interface ThemeConfig {
    name: string;
    bodyGradient: string;
    screenBg: string;
    cassetteBg: string;
    labelBg: string;
    lcdBg: string;
    buttonBg: string;
    playButtonBg: string;
}

const THEMES: Record<string, ThemeConfig> = {
    STITCH: {
        name: "Stitch Edition",
        bodyGradient: "bg-white",
        screenBg: "bg-gray-900",
        cassetteBg: "bg-gray-100",
        labelBg: "bg-white",
        lcdBg: "bg-[#D6F0F9]", // Light cyan/blue LCD
        buttonBg: "bg-[#478ECC]", // Stitch Blue
        playButtonBg: "bg-[#2A6BB0]" // Darker Stitch Blue
    },
};

type ThemeKey = keyof typeof THEMES;

export function DesktopPlayer({
    isPlaying,
    hasCassette,
    cassetteTitle,
    cassetteColor = "orange",
    currentSong,
    onPlayToggle,
    onNext,
    onPrev,
    volume,
    onVolumeChange,
    progress = 0,
    onSeek,
    className,
    dragConstraints,
    drag = true,
    onEject
}: PlayerProps) {
    const [currentTheme] = useState<ThemeKey>('STITCH');
    const theme = THEMES[currentTheme];
    const { playClick, playClunk, playEject } = useAudio(); // Cassette sounds

    const cassetteColors: Record<string, string> = {
        orange: "#ff6600", purple: "#9933ff", white: "#e0e0e0", green: "#00cc66", red: "#ff0055"
    };
    // If cassetteColor is a key, use the mapped hex. Otherwise, assume it's a valid hex/string itself.
    const displayColor = cassetteColors[cassetteColor] || cassetteColor || "#ff6600";

    const getCassetteTextColor = (color: string) => {
        switch (color) {
            case 'purple':
            case 'red':
                return "text-white";
            default:
                return "text-gray-800 dark:text-gray-100";
        }
    };
    const cassetteTextColor = getCassetteTextColor(cassetteColor);

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

    const songDuration = currentSong?.duration ? parseInt(currentSong.duration.toString()) : 200;
    const currentTime = progress * songDuration;

    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                className={clsx(
                    "relative w-[360px] h-[500px] shrink-0 rounded-xl bg-gradient-to-b p-5 shadow-2xl border border-gray-300 dark:border-gray-600",
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
                                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500/10"></div> {/* Label Pattern */}
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
                                        {/* Tape Pack (Dark Brown) */}
                                        <div className="absolute w-[95%] h-[95%] rounded-full border-[6px] border-[#3a2c2c] box-border"></div>

                                        {/* 4-Notch White Ring Design */}
                                        <div className="absolute w-[65%] h-[65%] rounded-full bg-[#f0f0f0] flex items-center justify-center z-30 shadow-md">
                                            {/* Notches (Dark Grey Rectangles) */}
                                            <div className="absolute w-1.5 h-full bg-[#333]"></div>
                                            <div className="absolute w-full h-1.5 bg-[#333]"></div>

                                            {/* Center Hole (Hollow) */}
                                            <div className="absolute size-2.5 bg-[#111] rounded-full border border-gray-600 z-40"></div>
                                        </div>
                                    </div>

                                    {/* Tape Window (Transparent center) */}
                                    <div className="h-8 flex-1 mx-1 bg-[#1a1a1a] rounded border-[0.5px] border-white/20 flex items-center justify-center overflow-hidden relative shadow-inner">
                                        <div className="w-full h-px bg-red-500/50 absolute top-1/2 -translate-y-1/2"></div>
                                        {/* Tape passing through */}
                                        <div className="w-full h-4 bg-[#2a1d1d] opacity-90"></div>
                                    </div>

                                    {/* Right Reel */}
                                    <div className={clsx(
                                        "size-12 rounded-full flex items-center justify-center relative shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] bg-black",
                                        isPlaying && "animate-spin"
                                    )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                        {/* Tape Pack (Dark Brown - Slightly smaller to simulate played side?) - Keeping symmetrical for now */}
                                        <div className="absolute w-[95%] h-[95%] rounded-full border-[6px] border-[#3a2c2c] box-border"></div>

                                        {/* Reel Spoke */}
                                        <div className="absolute w-[65%] h-[65%] rounded-full bg-[#f0f0f0] flex items-center justify-center z-30 shadow-md">
                                            {/* Notches */}
                                            <div className="absolute w-1.5 h-full bg-[#333]"></div>
                                            <div className="absolute w-full h-1.5 bg-[#333]"></div>

                                            {/* Center Hole */}
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
                        <div className="flex items-center gap-2 relative z-10">
                            <p className="text-black font-bold font-mono text-sm leading-normal whitespace-nowrap opacity-80 tracking-tight">
                                {currentSong ? (
                                    <span className="animate-pulse">▶ {decodeHtml(currentSong.name).substring(0, 20)}</span>
                                ) : "READY"}
                            </p>
                        </div>
                    </div>

                    {/* Visualizer - Reduced Size */}
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
                            <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 relative transition-all shadow-[0_0_10px_rgba(255,100,0,0.5)]" style={{ width: `${progress * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-4 py-2" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => { playClick(); onPrev?.(); }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md active:shadow-inner hover:bg-gray-600 transition-all")}
                            aria-label="Previous"
                        >
                            <SkipBack className="w-5 h-4" />
                        </button>
                        <button
                            onClick={() => { playClunk(); onPlayToggle(); }}
                            className={clsx(theme.playButtonBg, "flex shrink-0 items-center justify-center rounded-full size-16 text-white shadow-lg active:shadow-inner transform active:scale-95 transition-transform")}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={() => { playClick(); onNext?.(); }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md active:shadow-inner hover:bg-gray-600 transition-all")}
                            aria-label="Next"
                        >
                            <SkipForward className="w-6 h-6" />
                        </button>
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
