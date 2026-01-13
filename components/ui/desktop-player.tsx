"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Palette, Volume2, LogOut, Shuffle, Repeat, Repeat1, ListMusic, Music2 } from "lucide-react";
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

    // Playback state
    shuffle?: boolean;
    onShuffleToggle?: () => void;
    repeat?: 'off' | 'one' | 'all';
    onRepeatToggle?: () => void;
    onOpenQueue?: () => void;
    onOpenLyrics?: () => void;

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
    "Stitch Edition": {
        name: "Stitch Edition",
        bodyGradient: "from-blue-600 to-indigo-900",
        screenBg: "bg-blue-950/80",
        cassetteBg: "bg-blue-800",
        labelBg: "bg-gradient-to-r from-blue-400 to-indigo-400",
        lcdBg: "bg-blue-900/50",
        buttonBg: "bg-blue-700 hover:bg-blue-600",
        playButtonBg: "bg-indigo-600 hover:bg-indigo-500",
    },
    // ... we can add more themes or keep it minimal as in Phase 3
};

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
    shuffle = false,
    onShuffleToggle,
    repeat = 'off',
    onRepeatToggle,
    onOpenQueue,
    onOpenLyrics,
    className,
    dragConstraints,
    drag = true,
    onEject
}: PlayerProps) {
    const { playClick, playClunk, playEject } = useAudio();
    const [themeName, setThemeName] = useState("Stitch Edition");
    const theme = THEMES[themeName];

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
                {/* Header */}
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex flex-col">
                        <h2 className="text-xs font-bold tracking-widest text-white/80 uppercase">TFI Stereo</h2>
                        <span className="text-[10px] tracking-wider text-white/50">AUTO REVERSE</span>
                    </div>
                    <div className="flex gap-2">
                        {/* Status Lights */}
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                    </div>
                </div>

                {/* Cassette Window (Visualizer Area) */}
                <div className="relative w-full h-40 bg-black/40 rounded-lg border-2 border-white/10 mb-4 overflow-hidden flex items-center justify-center shadow-inner group">
                    <div className="absolute inset-0 bg-black/20 z-0"></div>

                    {hasCassette && isPlaying ? (
                        <Visualizer isPlaying={isPlaying} color={cassetteColor} />
                    ) : (
                        <div className="text-white/20 text-sm font-mono tracking-widest z-10">
                            {hasCassette ? "READY" : "NO CASSETTE"}
                        </div>
                    )}
                </div>

                {/* LCD Display */}
                <div className={clsx("w-full h-16 rounded mb-4 p-2 flex flex-col justify-between font-mono text-xs shadow-inner", theme.lcdBg)}>
                    <div className="flex justify-between text-cyan-300/80">
                        <span>{hasCassette ? "TAPE A" : "EMPTY"}</span>
                        <span>{themeName}</span>
                    </div>
                    <div className="flex justify-between items-end relative overflow-hidden">
                        <div className="text-cyan-100 truncate w-3/4 text-sm font-bold">
                            <AnimatePresence mode="wait">
                                {currentSong ? (
                                    <motion.span
                                        key={currentSong.id}
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -10, opacity: 0 }}
                                    >
                                        {decodeHtml(currentSong.name)}
                                    </motion.span>
                                ) : (
                                    <span>-</span>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="text-cyan-300 font-mono">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-gray-700/50 rounded-full mb-6 cursor-pointer group" onClick={handleProgressBarClick}>
                    <motion.div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${progress * 100}%` }}
                        layoutId="progress"
                        animate={{
                            boxShadow: isPlaying ? "0 0 8px rgba(6,182,212,0.6)" : "none"
                        }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                    </motion.div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-4">
                    {/* Playback Modes */}
                    <div className="flex justify-center gap-4 py-1">
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
                        >
                            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onOpenQueue?.(); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center justify-center rounded-full size-9 shadow-md transition-all duration-300 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white hover:shadow-lg"
                            title="Queue"
                        >
                            <ListMusic className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onOpenLyrics?.(); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center justify-center rounded-full size-9 shadow-md transition-all duration-300 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white hover:shadow-lg"
                            title="Lyrics"
                        >
                            <Music2 className="w-4 h-4" />
                        </motion.button>
                    </div>

                    {/* Main Transport */}
                    <div className="flex items-center justify-center gap-4 py-2" onPointerDown={(e) => e.stopPropagation()}>
                        <motion.button
                            onClick={() => { playClick(); onPrev?.(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200")}
                        >
                            <SkipBack className="w-5 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => { playClunk(); onPlayToggle(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            className={clsx(theme.playButtonBg, "flex shrink-0 items-center justify-center rounded-full size-16 text-white shadow-lg hover:shadow-xl active:shadow-inner transition-all duration-200")}
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </motion.button>
                        <motion.button
                            onClick={() => { playClick(); onNext?.(); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(theme.buttonBg, "flex shrink-0 items-center justify-center rounded-full size-12 text-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200")}
                        >
                            <SkipForward className="w-6 h-6" />
                        </motion.button>
                    </div>

                    {/* Eject */}
                    <div className="flex justify-center pb-2" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => { playEject(); onEject?.(); }}
                            className="text-[10px] font-bold text-gray-500 hover:text-red-500 tracking-widest uppercase flex items-center gap-1 transition-colors"
                        >
                            <LogOut size={12} /> EJECT
                        </button>
                    </div>
                </div>

                {/* Footer Volume */}
                <div className="flex justify-between items-center gap-2 px-2 py-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className={clsx(
                                "size-2.5 rounded-full",
                                isPlaying ? "bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]" : "bg-gray-400"
                            )}></div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">REC</span>
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
