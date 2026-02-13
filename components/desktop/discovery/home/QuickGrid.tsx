"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Music } from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { JioSaavnSong } from "@/lib/jiosaavn";

interface QuickGridProps {
    items: JioSaavnSong[];
    onPlay: (song: JioSaavnSong) => void;
    currentSongId?: string;
    isPlaying: boolean;
}

export function QuickGrid({ items, onPlay, currentSongId, isPlaying }: QuickGridProps) {
    if (!items || items.length === 0) return null;

    // Limit to 12 items for a perfect 3x4 or 2x6 grid
    const displayItems = items.slice(0, 12);

    const getArt = (song: any) => {
        if (!song?.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) {
            return song.image.find((i: any) => i.quality === '150x150')?.link || song.image[0]?.link || '';
        }
        return '';
    };

    return (
        <div className="px-8 pb-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white/90">Quick Picks</h2>
                <span className="text-xs font-medium text-white/30 uppercase tracking-wider">Start Listening</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {displayItems.map((song, i) => {
                    const isActive = currentSongId === song.id;
                    const isNowPlaying = isActive && isPlaying;
                    const artUrl = getArt(song);

                    return (
                        <motion.div
                            key={`${song.id}-${i}`}
                            className="group relative flex items-center gap-3 p-2 rounded-md bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer border border-white/[0.02]"
                            onClick={() => onPlay(song)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Art */}
                            <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-white/5">
                                {artUrl ? (
                                    <img
                                        src={artUrl}
                                        loading="lazy"
                                        alt={song.name}
                                        className={`w-full h-full object-cover transition-opacity ${isNowPlaying ? 'opacity-40' : 'opacity-100'}`}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Music size={20} className="text-white/20" />
                                    </div>
                                )}

                                {/* Overlay Icon */}
                                {(isActive || isNowPlaying) && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="flex gap-0.5 items-end h-4">
                                            <div className="w-1 bg-white animate-[music-bar_1s_ease-in-out_infinite]" />
                                            <div className="w-1 bg-white animate-[music-bar_1.2s_ease-in-out_infinite] delay-75" />
                                            <div className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite] delay-150" />
                                        </div>
                                    </div>
                                )}

                                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'hidden' : ''}`}>
                                    <Play size={20} fill="currentColor" className="text-white" />
                                </div>
                            </div>

                            {/* Text */}
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <h3 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/90'}`}>
                                    {decodeHtml(song.name)}
                                </h3>
                                <p className="text-xs text-white/40 truncate">
                                    {decodeHtml(song.primaryArtists)}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <style jsx>{`
                @keyframes music-bar {
                    0%, 100% { height: 4px; }
                    50% { height: 16px; }
                }
            `}</style>
        </div>
    );
}
