"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, Volume2, ListMusic, Maximize2, ChevronDown, Music } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";

/* ============================================================================
   FULL PLAYER - Expanded Now Playing Modal
   ============================================================================ */

interface FullPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FullPlayer({ isOpen, onClose }: FullPlayerProps) {
    const {
        currentSong, isPlaying, togglePlay, next, prev,
        progress, duration, seek, volume, setVolume,
        shuffle, setShuffle, repeat, setRepeat
    } = usePlayback();

    const [lyrics, setLyrics] = useState<string[]>([]);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const getArt = () => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        return '';
    };

    // Get quality badge
    const getQuality = () => {
        if (!currentSong) return null;
        const q = (currentSong as any).quality || (currentSong as any).downloadUrl?.[0]?.quality;
        if (!q) return { label: 'HQ', color: 'bg-white/10' };
        if (q.includes('320') || q === '320kbps') return { label: '320kbps', color: 'bg-white/10' };
        if (q.includes('160') || q === '160kbps') return { label: '160kbps', color: 'bg-white/10' };
        if (q.includes('lossless') || q.includes('flac')) return { label: 'FLAC', color: 'bg-white/15' };
        return { label: 'HQ', color: 'bg-white/10' };
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };

    const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };

    if (!currentSong) return null;

    const quality = getQuality();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ background: 'rgba(0, 0, 0, 0.95)' }}
                >
                    {/* Background Blur */}
                    {getArt() && (
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `url(${getArt()})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(120px) brightness(0.15) saturate(0)',
                                transform: 'scale(1.5)'
                            }}
                        />
                    )}

                    {/* Close Button */}
                    <motion.button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 z-10"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronDown size={24} />
                    </motion.button>

                    {/* Content */}
                    <div className="relative z-10 w-full max-w-lg px-8">
                        {/* Album Art */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative mx-auto mb-10"
                        >
                            {getArt() ? (
                                <img
                                    src={getArt()}
                                    alt=""
                                    className="w-80 h-80 mx-auto rounded-2xl object-cover shadow-2xl"
                                />
                            ) : (
                                <div className="w-80 h-80 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
                                    <Music size={64} className="text-white/30" />
                                </div>
                            )}
                            {isPlaying && (
                                <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-pulse" />
                            )}
                        </motion.div>

                        {/* Track Info */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="text-center mb-8"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold">{currentSong.name}</h1>
                                {quality && (
                                    <span className={`${quality.color} text-[10px] font-semibold px-2 py-1 rounded`}>
                                        {quality.label}
                                    </span>
                                )}
                            </div>
                            <p className="text-white/50">{currentSong.primaryArtists}</p>
                            {currentSong.album?.name && (
                                <p className="text-sm text-white/30 mt-1">{currentSong.album.name}</p>
                            )}
                        </motion.div>

                        {/* Progress */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8"
                        >
                            <div
                                className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                                onClick={handleSeek}
                            >
                                <div
                                    className="h-full bg-white rounded-full relative transition-all"
                                    style={{ width: `${progress * 100}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                                </div>
                            </div>
                            <div className="flex justify-between mt-2 text-sm text-white/40 tabular-nums">
                                <span>{fmt(progress * duration)}</span>
                                <span>{fmt(duration)}</span>
                            </div>
                        </motion.div>

                        {/* Controls */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="flex items-center justify-center gap-6 mb-10"
                        >
                            <motion.button
                                onClick={() => setShuffle(!shuffle)}
                                className={`p-2 ${shuffle ? 'text-white' : 'text-white/40'}`}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Shuffle size={20} />
                            </motion.button>
                            <motion.button
                                onClick={prev}
                                className="p-3 text-white/80 hover:text-white"
                                whileTap={{ scale: 0.9 }}
                            >
                                <SkipBack size={28} fill="currentColor" />
                            </motion.button>
                            <motion.button
                                onClick={togglePlay}
                                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center"
                                style={{ boxShadow: '0 8px 30px rgba(255, 255, 255, 0.3)' }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                            </motion.button>
                            <motion.button
                                onClick={next}
                                className="p-3 text-white/80 hover:text-white"
                                whileTap={{ scale: 0.9 }}
                            >
                                <SkipForward size={28} fill="currentColor" />
                            </motion.button>
                            <motion.button
                                onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                                className={`p-2 relative ${repeat !== 'off' ? 'text-white' : 'text-white/40'}`}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Repeat size={20} />
                                {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>}
                            </motion.button>
                        </motion.div>

                        {/* Footer Actions */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-between"
                        >
                            <motion.button
                                className="p-2 text-white/40 hover:text-white"
                                whileTap={{ scale: 0.9 }}
                            >
                                <Heart size={22} />
                            </motion.button>

                            <div className="flex items-center gap-2">
                                <Volume2 size={18} className="text-white/40" />
                                <div
                                    className="w-24 h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                                    onClick={handleVolumeChange}
                                >
                                    <div
                                        className="h-full bg-white/60 rounded-full"
                                        style={{ width: `${volume * 100}%` }}
                                    />
                                </div>
                            </div>

                            <motion.button
                                className="p-2 text-white/40 hover:text-white"
                                whileTap={{ scale: 0.9 }}
                            >
                                <ListMusic size={22} />
                            </motion.button>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
