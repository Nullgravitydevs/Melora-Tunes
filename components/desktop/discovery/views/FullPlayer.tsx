"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, Volume2, ListMusic, Maximize2, ChevronDown, Music, Mic2, Share2, Copy } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { getLyricsWithFallback } from "@/lib/jiosaavn";
import { Tooltip } from "@/components/ui/tooltip";

interface FullPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FullPlayer({ isOpen, onClose }: FullPlayerProps) {
    const {
        currentSong, isPlaying, togglePlay, next, prev,
        progress, duration, seek, volume, setVolume,
        shuffle, setShuffle, repeat, setRepeat,
        showToast, queue, currentIndex, playIndex
    } = usePlayback();

    const [lyrics, setLyrics] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'art' | 'lyrics' | 'queue'>('art');
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

    // Fetch lyrics when song changes
    useEffect(() => {
        if (viewMode === 'lyrics' && currentSong) {
            setLyrics(null);
            setIsLoadingLyrics(true);
            getLyricsWithFallback(currentSong)
                .then(l => setLyrics(l))
                .catch(() => setLyrics("No lyrics available"))
                .finally(() => setIsLoadingLyrics(false));
        } else {
            if (viewMode !== 'lyrics') setLyrics(null);
        }
    }, [currentSong?.id, viewMode]);

    const handleShare = async () => {
        if (!currentSong) return;
        const url = `${window.location.origin}/song/${currentSong.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentSong.name,
                    text: `Check out ${currentSong.name} on Melora`,
                    url
                });
            } catch (err) {
                // Ignore abort
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                showToast("Link copied to clipboard", "success");
            } catch (e) {
                showToast("Failed to copy link", "error");
            }
        }
    };

    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    // ... helper functions (getArt, getQuality, handleSeek, etc) ...
    const getArt = () => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        return '';
    };

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
                    <div className="relative z-10 w-full max-w-lg px-8 flex flex-col h-[85vh]">
                        <AnimatePresence mode="wait">
                            {viewMode === 'lyrics' ? (
                                <motion.div
                                    key="lyrics"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex-1 flex flex-col mb-8 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <Mic2 size={20} className="text-pink-500" />
                                            Lyrics
                                        </h2>
                                        <button
                                            onClick={() => setViewMode('art')}
                                            className="text-sm text-white/50 hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scroll pr-2 text-center">
                                        {isLoadingLyrics ? (
                                            <div className="h-full flex items-center justify-center text-white/30 animate-pulse">
                                                Loading lyrics...
                                            </div>
                                        ) : lyrics ? (
                                            <p className="text-lg leading-loose text-white/90 whitespace-pre-wrap font-medium">
                                                {lyrics}
                                            </p>
                                        ) : (
                                            <div className="h-full flex items-center justify-center flex-col gap-2 text-white/30">
                                                <Mic2 size={32} />
                                                <p>No lyrics available for this song</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : viewMode === 'queue' ? (
                                <motion.div
                                    key="queue"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex-1 flex flex-col mb-8 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <ListMusic size={20} className="text-pink-500" />
                                            Queue
                                        </h2>
                                        <button
                                            onClick={() => setViewMode('art')}
                                            className="text-sm text-white/50 hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scroll pr-2 space-y-2">
                                        {queue.map((song, i) => (
                                            <div
                                                key={song.id + i}
                                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${i === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                onClick={() => playIndex(i)}
                                            >
                                                <div className="w-6 text-center text-sm text-white/30">
                                                    {i === currentIndex ? <div className="w-2 h-2 rounded-full bg-pink-500 mx-auto" /> : i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium truncate ${i === currentIndex ? 'text-pink-500' : 'text-white/90'}`}>
                                                        {song.name}
                                                    </p>
                                                    <p className="text-xs text-white/40 truncate">{song.primaryArtists}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="art"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex-1 flex flex-col justify-center"
                                >
                                    {/* Album Art */}
                                    <div className="relative mx-auto mb-10">
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
                                    </div>

                                    {/* Track Info */}
                                    <div className="text-center mb-8">
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
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Controls (Always Visible) */}
                        <div className="mt-auto">
                            {/* Progress */}
                            <div className="mb-8">
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
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center justify-center gap-6 mb-10">
                                <Tooltip text={shuffle ? "Disable Shuffle" : "Enable Shuffle"}>
                                    <motion.button
                                        onClick={() => setShuffle(!shuffle)}
                                        className={`p-2 ${shuffle ? 'text-white' : 'text-white/40'}`}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Shuffle size={20} />
                                    </motion.button>
                                </Tooltip>

                                <Tooltip text="Previous">
                                    <motion.button
                                        onClick={prev}
                                        className="p-3 text-white/80 hover:text-white"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <SkipBack size={28} fill="currentColor" />
                                    </motion.button>
                                </Tooltip>

                                <Tooltip text={isPlaying ? "Pause" : "Play"}>
                                    <motion.button
                                        onClick={togglePlay}
                                        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center"
                                        style={{ boxShadow: '0 8px 30px rgba(255, 255, 255, 0.3)' }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                    </motion.button>
                                </Tooltip>

                                <Tooltip text="Next">
                                    <motion.button
                                        onClick={next}
                                        className="p-3 text-white/80 hover:text-white"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <SkipForward size={28} fill="currentColor" />
                                    </motion.button>
                                </Tooltip>

                                <Tooltip text={repeat === 'one' ? "Disable Repeat" : repeat === 'all' ? "Repeat One" : "Repeat All"}>
                                    <motion.button
                                        onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                                        className={`p-2 relative ${repeat !== 'off' ? 'text-white' : 'text-white/40'}`}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Repeat size={20} />
                                        {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>}
                                    </motion.button>
                                </Tooltip>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        className="p-2 text-white/40 hover:text-pink-500 hover:bg-white/5 rounded-full"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Heart size={22} />
                                    </motion.button>

                                    {/* Share Button */}
                                    <motion.button
                                        onClick={handleShare}
                                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Share2 size={20} />
                                    </motion.button>
                                </div>

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

                                <div className="flex items-center gap-4">
                                    {/* Lyrics Toggle */}
                                    <motion.button
                                        onClick={() => setViewMode(viewMode === 'lyrics' ? 'art' : 'lyrics')}
                                        className={`p-2 rounded-full hover:bg-white/5 ${viewMode === 'lyrics' ? 'text-pink-500 bg-pink-500/10' : 'text-white/40 hover:text-white'}`}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Mic2 size={22} />
                                    </motion.button>

                                    <motion.button
                                        onClick={() => setViewMode(viewMode === 'queue' ? 'art' : 'queue')}
                                        className={`p-2 rounded-full hover:bg-white/5 ${viewMode === 'queue' ? 'text-pink-500 bg-pink-500/10' : 'text-white/40 hover:text-white'}`}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <ListMusic size={22} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
