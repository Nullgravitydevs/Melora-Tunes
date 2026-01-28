"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Loader2, Mic2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { useLyrics, LyricLine } from "@/hooks/useLyrics";
import { usePlayback } from "../providers/playback-context";

interface LyricsModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: JioSaavnSong | null;
}

export function LyricsModal({ isOpen, onClose, song }: LyricsModalProps) {
    // Use the smart hook that combines 3 sources (Musixmatch, Lrclib, JioSaavn)
    const { lyrics, plainLyrics, isSynced, isLoading, error } = useLyrics(isOpen ? (song || undefined) : undefined);
    const { progress, seek } = usePlayback();

    // Auto-scroll logic
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    // Find active line index
    const activeIndex = isSynced
        ? lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return progress >= line.time && (!nextLine || progress < nextLine.time);
        })
        : -1;

    useEffect(() => {
        if (isOpen && activeLineRef.current && scrollContainerRef.current) {
            // Smooth scroll to active line
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [activeIndex, isOpen]);

    if (!isOpen) return null;

    // Get high-res art for background
    const bgArt = song?.image?.[song.image.length - 1]?.link || song?.image?.[0]?.link || "";

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 40 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-[500px] h-[80vh] max-h-[800px] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Blurred Background */}
                        <div
                            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center transition-all duration-700"
                            style={{ backgroundImage: `url(${bgArt})` }}
                        />
                        <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-3xl" />

                        {/* Header */}
                        <div className="relative z-20 flex items-center justify-between p-6 pb-2">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg border border-white/10">
                                    <img src={bgArt} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight line-clamp-1">{decodeHtml(song?.name || "")}</h2>
                                    <p className="text-sm font-medium text-white/60 line-clamp-1">{decodeHtml(song?.primaryArtists || "")}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all backdrop-blur-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tag */}
                        {(isSynced || isLoading) && (
                            <div className="relative z-20 px-6 mt-2 mb-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSynced ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Mic2 size={10} />}
                                    {isLoading ? "Syncing..." : isSynced ? "Synced Lyrics" : "Plain Lyrics"}
                                </span>
                            </div>
                        )}

                        {/* Lyrics Content */}
                        <div
                            ref={scrollContainerRef}
                            className="relative z-10 h-[calc(100%-140px)] overflow-y-auto px-8 pb-32 scrollbar-none mask-image-gradient"
                            style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
                        >
                            {/* Loading State */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <Loader2 className="text-white animate-spin" size={40} />
                                </div>
                            )}

                            {/* Error State */}
                            {error && !isLoading && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                    <Music2 className="text-white/20" size={60} />
                                    <p className="text-white/40 font-medium">Lyrics unavailable for this track</p>
                                </div>
                            )}

                            {/* Synced Lyrics */}
                            {!isLoading && isSynced && (
                                <div className="space-y-6 pt-[30%] pb-[50%]">
                                    {lyrics.map((line, i) => {
                                        const isActive = i === activeIndex;
                                        const isPast = i < activeIndex;

                                        return (
                                            <motion.p
                                                key={i}
                                                ref={isActive ? activeLineRef : null}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{
                                                    opacity: isActive ? 1 : isPast ? 0.4 : 0.3,
                                                    scale: isActive ? 1.05 : 1,
                                                    y: 0,
                                                    filter: isActive ? 'blur(0px)' : 'blur(0.5px)'
                                                }}
                                                className={`text-2xl md:text-3xl font-bold leading-tight transition-all duration-500 cursor-pointer origin-left
                                                    ${isActive ? 'text-white' : 'text-white/80'}`}
                                                onClick={() => seek(line.time)}
                                            >
                                                {decodeHtml(line.text)}
                                            </motion.p>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Plain Lyrics */}
                            {!isLoading && !isSynced && plainLyrics && (
                                <div className="space-y-8 pt-10 text-center">
                                    <p className="text-xl md:text-2xl font-semibold text-white/90 leading-relaxed whitespace-pre-line">
                                        {decodeHtml(plainLyrics)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
