"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut } from "lucide-react";
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
    const { playClick, playClunk, playEject } = useAudio();

    const cassetteColors: Record<string, string> = {
        orange: "#f97316", purple: "#8b5cf6", white: "#e0e0e0", green: "#00cc66", red: "#ff0055"
    };
    const displayColor = cassetteColors[cassetteColor] || cassetteColor || "#f97316";

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTime = progress * (currentSong?.duration || 0);
    const songDuration = currentSong?.duration || 0;

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1));
    };

    return (
        <motion.div
            drag={drag}
            dragMomentum={false}
            dragConstraints={dragConstraints}
            dragElastic={0}
            className={clsx(
                "bg-[#f8fafc] text-gray-800 rounded-[2rem] p-6 md:p-8 shadow-2xl border-4 border-gray-300 relative overflow-hidden ring-1 ring-black/5",
                className
            )}
        >
            {/* Corner Screws */}
            <div className="absolute top-4 left-4 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0 L8 16 M0 8 L16 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
            <div className="absolute top-4 right-4 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0 L8 16 M0 8 L16 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
            <div className="absolute bottom-4 left-4 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0 L8 16 M0 8 L16 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
            <div className="absolute bottom-4 right-4 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0 L8 16 M0 8 L16 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="font-display text-gray-300 text-2xl uppercase tracking-tighter drop-shadow-md">
                    Stereo Cassette Player
                </h2>
                <p className="text-xs font-mono text-gray-400 tracking-[0.2em] mt-1">AUTO REVERSE</p>
            </div>

            {/* Screen with Scanlines */}
            <div className="bg-[#1e1e1e] w-full aspect-[16/10] rounded-xl shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6)] relative mb-6 border-b-2 border-gray-700 flex items-center justify-center overflow-hidden">
                <div className="scanlines absolute inset-0 z-10 pointer-events-none opacity-20"></div>
                <div className="absolute top-2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent z-20 pointer-events-none"></div>

                {hasCassette && currentSong ? (
                    <div className="text-center z-0 px-4">
                        <p className="font-mono text-gray-400 text-sm tracking-widest truncate">
                            {decodeHtml(currentSong.name)}
                        </p>
                        <p className="font-mono text-gray-600 text-xs mt-1 truncate">
                            {decodeHtml(currentSong.primaryArtists)}
                        </p>
                    </div>
                ) : (
                    <p className="font-mono text-gray-600 text-sm tracking-widest z-0">NO CASSETTE</p>
                )}
            </div>

            {/* LCD Display */}
            <div className="bg-gray-400/50 h-12 w-full rounded-md shadow-inner mb-4 flex items-center px-4 border border-gray-400/30">
                <span className="font-mono text-gray-800 font-bold tracking-widest text-lg">
                    {isPlaying ? "PLAYING" : "READY"}
                </span>
            </div>

            {/* Visualizer */}
            <div className="bg-gray-800 h-8 w-full rounded mb-6 p-1 flex gap-0.5 items-end shadow-inner">
                <Visualizer isPlaying={isPlaying} />
            </div>

            {/* Progress Bar */}
            <div className="mb-8 px-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(songDuration)}</span>
                </div>
                <div
                    className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner cursor-pointer"
                    onClick={handleProgressBarClick}
                >
                    <div className="h-full bg-gray-800" style={{ width: `${progress * 100}%` }}></div>
                </div>
            </div>

            {/* Control Buttons - Only Prev/Play/Next */}
            <div className="flex justify-center items-center gap-6 mb-8">
                <motion.button
                    onClick={() => { playClick(); onPrev?.(); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-2 border-blue-300"
                >
                    <SkipBack className="w-5 h-5 drop-shadow-md" />
                </motion.button>

                <motion.button
                    onClick={() => { playClunk(); onPlayToggle(); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-4 border-blue-300 z-10"
                >
                    {isPlaying ? (
                        <Pause className="w-7 h-7 drop-shadow-md" />
                    ) : (
                        <Play className="w-7 h-7 ml-1 drop-shadow-md" />
                    )}
                </motion.button>

                <motion.button
                    onClick={() => { playClick(); onNext?.(); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-2 border-blue-300"
                >
                    <SkipForward className="w-5 h-5 drop-shadow-md" />
                </motion.button>
            </div>

            {/* Bottom Row: REC, BATT, EJECT, VOLUME */}
            <div className="flex items-center justify-between px-4 text-xs font-mono text-gray-500 font-bold">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300 shadow-inner"></div>
                        <span>REC</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse"></div>
                        <span>BATT</span>
                    </div>
                </div>

                <div
                    className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => { playEject(); onEject?.(); }}
                >
                    <LogOut className="w-4 h-4" />
                    <span className="mt-0.5 tracking-widest text-[9px]">EJECT</span>
                </div>

                <div className="flex items-center gap-2 w-24">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <div className="h-1 flex-grow bg-gray-300 rounded-full relative">
                        <div
                            className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full"
                            style={{ width: `${volume * 100}%` }}
                        ></div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-400 rounded-full shadow-sm pointer-events-none"
                            style={{ left: `${volume * 100}%`, transform: `translate(-50%, -50%)` }}
                        ></div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
