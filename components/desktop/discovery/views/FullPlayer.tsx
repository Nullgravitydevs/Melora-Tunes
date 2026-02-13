"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
    Heart, Volume2, VolumeX, ListMusic, ChevronDown, Music,
    Mic2, Share2, Plus, MoreHorizontal, Disc3, Radio,
    ListPlus, Download
} from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { useLyrics } from "@/hooks/useLyrics";
import { decodeHtml } from "@/lib/utils";
import { getArt } from "@/lib/helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { AudioQuality } from "@/lib/types";
import { TrackContextMenu } from "@/components/ui/track-context-menu";

interface FullPlayerProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToArtist?: (artistId: string) => void;
    onGoToAlbum?: (albumId: string) => void;
    onAddToPlaylist?: (song: any) => void;
}

export function FullPlayer({ isOpen, onClose, onGoToArtist, onGoToAlbum, onAddToPlaylist }: FullPlayerProps) {
    const {
        currentSong, isPlaying, togglePlay, next, prev,
        progress, duration, seek, volume, setVolume,
        shuffle, setShuffle, repeat, setRepeat,
        showToast, queue, currentIndex, playIndex,
        isLiked, toggleLike, activeQuality,
        qualityPreference, setQualityPreference,
        setQueue, addToQueue, downloadSong, removeDownload, isDownloaded, activeMixId
    } = usePlayback();

    const [viewMode, setViewMode] = useState<'art' | 'queue'>('art');

    /* ── Context Menu State ── */
    const [menuProps, setMenuProps] = useState<{ visible: boolean; x: number; y: number; song: any | null }>({
        visible: false, x: 0, y: 0, song: null
    });

    const handleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuProps({ visible: true, x: e.clientX, y: e.clientY, song: currentSong });
    };

    /* ── Synced Lyrics ── */
    const { lyrics, plainLyrics, isSynced, isLoading: lyricsLoading } = useLyrics(currentSong);
    const lyricsRef = useRef<HTMLDivElement>(null);
    const [activeLineIdx, setActiveLineIdx] = useState(-1);
    const currentTime = progress * duration;

    // Find active lyric line
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;
        const idx = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });
        if (idx !== -1 && idx !== activeLineIdx) setActiveLineIdx(idx);
    }, [currentTime, lyrics, isSynced, activeLineIdx]);

    // Auto-scroll lyrics
    useEffect(() => {
        if (activeLineIdx < 0 || !lyricsRef.current) return;
        const el = lyricsRef.current.children[activeLineIdx] as HTMLElement;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeLineIdx]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const songArt = getArt(currentSong);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };

    const handleShare = async () => {
        if (!currentSong) return;
        const url = `${window.location.origin}/song/${currentSong.id}`;
        if (navigator.share) {
            try { await navigator.share({ title: currentSong.name, text: `Check out ${currentSong.name} on Melora`, url }); } catch { /* ignore */ }
        } else {
            try { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); } catch { showToast("Failed to copy", "error"); }
        }
    };

    if (!currentSong) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1] // Apple-like spring curve
                    }}
                    className="fixed inset-0 z-[100] bg-[#000000] overflow-hidden"
                >
                    {/* Performance Optimized Background - Premium Apple Style */}
                    {songArt && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 z-0 pointer-events-none"
                        >
                            {/* Primary Blur Layer */}
                            <div
                                className="absolute inset-0 opacity-50"
                                style={{
                                    backgroundImage: `url(${songArt})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(120px) saturate(200%) brightness(0.4)',
                                    transform: 'scale(1.2)'
                                }}
                            />
                            {/* Secondary Atmosphere Layer */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
                            <div className="absolute inset-0 bg-black/20 mix-blend-color-burn" />
                        </motion.div>
                    )}

                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-8">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all backdrop-blur-md">
                            <ChevronDown size={22} />
                        </button>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-1 bg-white/20 rounded-full mb-1" />
                        </div>
                        <div className="w-10" />
                    </div>

                    {/* Main Content Info - 2 Column Desktop */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center max-w-[1600px] mx-auto px-12 lg:px-20">
                        {/* LEFT: Art & Controls */}
                        <div className="w-1/2 flex flex-col items-center justify-center max-w-xl">
                            {viewMode === 'queue' ? (
                                <div className="w-full h-[500px] bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold flex items-center gap-3"><ListMusic size={20} /> Play Queue</h2>
                                        <button onClick={() => setViewMode('art')} className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold hover:bg-white/20 transition-colors">Done</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                                        {queue.map((song, i) => (
                                            <div key={song.id + i} onClick={() => playIndex(i)}
                                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group ${i === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                <div className="w-8 flex justify-center">
                                                    {i === currentIndex ? (
                                                        <Disc3 size={16} className="animate-spin text-white" />
                                                    ) : (
                                                        <span className="text-sm text-white/30 group-hover:text-white/60 font-mono">{i + 1}</span>
                                                    )}
                                                </div>
                                                <img src={getArt(song)} alt="" className="w-10 h-10 rounded-md object-cover bg-white/5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate text-sm ${i === currentIndex ? 'text-white' : 'text-white/80'}`}>{decodeHtml(song.name)}</p>
                                                    <p className="text-xs text-white/40 truncate">{decodeHtml(song.primaryArtists || '')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Album Art Container */}
                                    <motion.div
                                        className="relative w-full aspect-square max-w-[280px] mb-8 group"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                    >
                                        <div className="absolute inset-0 rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]" />
                                        {songArt ? (
                                            <img
                                                src={songArt}
                                                alt={currentSong.name}
                                                className="relative w-full h-full rounded-3xl object-cover border border-white/5 select-none"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                                                <Music size={80} className="text-white/10" />
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Track Info */}
                                    <div className="w-full mb-6 flex items-end justify-between px-1">
                                        <div className="flex-1 min-w-0 pr-8">
                                            <motion.h1
                                                layoutId="player-title"
                                                className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight truncate mb-1.5"
                                            >
                                                {decodeHtml(currentSong.name)}
                                            </motion.h1>
                                            <div className="flex items-center gap-2 group/artist">
                                                <motion.p
                                                    className="text-base text-white/60 font-medium truncate cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => {
                                                        const artistId = currentSong.primaryArtistsId?.split(',')[0].trim();
                                                        if (artistId && onGoToArtist) onGoToArtist(artistId);
                                                    }}
                                                >
                                                    {decodeHtml(currentSong.primaryArtists || '')}
                                                </motion.p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const artistId = currentSong.primaryArtistsId?.split(',')[0].trim();
                                                        if (artistId && onGoToArtist) onGoToArtist(artistId);
                                                    }}
                                                    className="opacity-0 group-hover/artist:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-full"
                                                >
                                                    <ChevronDown size={14} className="rotate-[-90deg] text-white/40" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <button
                                                    onClick={handleMenu}
                                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors backdrop-blur-sm"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => toggleLike(currentSong)}
                                                className={`w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all backdrop-blur-sm ${isLiked(currentSong.id) ? 'text-pink-500 bg-pink-500/10' : 'text-white/40 hover:text-white'}`}
                                            >
                                                <Heart size={20} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Scrubber */}
                                    <div className="w-full mb-10 group cursor-pointer" onMouseDown={handleSeek}>
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
                                            <motion.div
                                                className="h-full bg-white/80 group-hover:bg-white rounded-full relative transition-colors"
                                                style={{ width: `${progress * 100}%` }}
                                                layoutId="progress-bar"
                                            >
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
                                            </motion.div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-xs font-semibold text-white/30 tabular-nums tracking-wide">
                                            <span>{fmt(progress * duration)}</span>
                                            <span>-{fmt(duration - (progress * duration))}</span>
                                        </div>
                                    </div>

                                    {/* Playback Controls */}
                                    <div className="flex items-center justify-center gap-6 mb-8 text-white">
                                        <button
                                            onClick={() => setShuffle(!shuffle)}
                                            className={`transition-all hover:scale-110 active:scale-90 ${shuffle ? 'text-accent-blue' : 'text-white/20 hover:text-white/50'}`}
                                        >
                                            <Shuffle size={18} />
                                        </button>

                                        <button onClick={prev} className="text-white hover:text-white/80 transition-transform active:scale-90 opacity-90 hover:opacity-100">
                                            <SkipBack size={32} fill="currentColor" />
                                        </button>

                                        <button
                                            onClick={togglePlay}
                                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                                        >
                                            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                        </button>

                                        <button onClick={next} className="text-white hover:text-white/80 transition-transform active:scale-90 opacity-90 hover:opacity-100">
                                            <SkipForward size={32} fill="currentColor" />
                                        </button>

                                        <button
                                            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                                            className={`relative transition-all hover:scale-110 active:scale-90 ${repeat !== 'off' ? 'text-accent-blue' : 'text-white/20 hover:text-white/50'}`}
                                        >
                                            <Repeat size={18} />
                                            {repeat === 'one' && (
                                                <span className="absolute -top-1 -right-1 text-[8px] font-black bg-white text-black w-3 h-3 flex items-center justify-center rounded-full">1</span>
                                            )}
                                        </button>

                                        {/* Grouped Secondary Controls */}
                                        <Tooltip text="Lyrics">
                                            <button
                                                className={`transition-all hover:scale-110 active:scale-90 ${viewMode === 'art' && isSynced ? 'text-white' : 'text-white/20 hover:text-white/60'}`}
                                                onClick={() => { /* Toggle Lyrics View if we had a dedicated view, or just visual feedback */ }}
                                            >
                                                <Mic2 size={18} />
                                            </button>
                                        </Tooltip>

                                        <Tooltip text="Queue">
                                            <button
                                                onClick={() => setViewMode('queue')}
                                                className="transition-all hover:scale-110 active:scale-90 text-white/20 hover:text-white/60"
                                            >
                                                <ListMusic size={18} />
                                            </button>
                                        </Tooltip>
                                    </div>

                                    {/* Volume & Toggles */}
                                    <div className="w-full flex items-center gap-4 mb-4 max-w-[280px]">
                                        <Volume2 size={14} className="text-white/30" />
                                        <div className="flex-1 h-[2px] bg-white/10 rounded-full overflow-hidden cursor-pointer group/vol" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - r.left) / r.width); }}>
                                            <div className="h-full bg-white/40 group-hover/vol:bg-white/80 transition-colors" style={{ width: `${volume * 100}%` }} />
                                        </div>
                                    </div>

                                    {/* Audio Tags (Moved Below Controls) */}
                                    <div className="w-full mb-6">
                                        {(() => {
                                            const q = activeQuality || qualityPreference;
                                            if (q === 'hires') {
                                                return (
                                                    <div className="flex flex-col gap-0.5 items-center opacity-60 hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-1.5 text-amber-400 font-black text-[10px] uppercase tracking-tighter">
                                                            <Disc3 size={10} /> <span>Hi-Res Studio Quality</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase">
                                                            24-bit / 96kHz · Lossless
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (q === 'flac') {
                                                return (
                                                    <div className="flex flex-col gap-0.5 items-center opacity-60 hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-1.5 text-blue-400 font-black text-[10px] uppercase tracking-tighter">
                                                            <Disc3 size={10} /> <span>CD Quality</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase">
                                                            16-bit / 44.1kHz · Lossless
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (q === '320') {
                                                return (
                                                    <div className="flex flex-col gap-0.5 items-center opacity-40 hover:opacity-80 transition-opacity">
                                                        <div className="flex items-center gap-1.5 text-white/80 font-black text-[10px] uppercase tracking-tighter">
                                                            <span>High Quality</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase">
                                                            320kbps · AAC
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* Up Next Preview */}
                                    {queue[currentIndex + 1] && (
                                        <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 group/upnext cursor-pointer hover:bg-white/10 backdrop-blur-md transition-all active:scale-[0.98]" onClick={next}>
                                            <div className="flex-shrink-0 relative">
                                                <img src={getArt(queue[currentIndex + 1])} alt="" className="w-10 h-10 rounded-md object-cover opacity-80 group-hover/upnext:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Up Next</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-white/90 truncate mr-2">{decodeHtml(queue[currentIndex + 1].name)}</p>
                                                    <Play size={10} fill="currentColor" className="text-white/0 group-hover/upnext:text-white/40 transition-all -ml-2 group-hover/upnext:ml-0" />
                                                </div>
                                                <p className="text-[10px] text-white/40 truncate">{decodeHtml(queue[currentIndex + 1].primaryArtists || '')}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* RIGHT: Lyrics / Metadata */}
                        <div className="w-1/2 pl-24 py-20 h-full flex flex-col justify-center">
                            <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                                {isSynced && lyrics.length > 0 ? (
                                    <div className="space-y-8 py-[40vh]" ref={lyricsRef}>
                                        {lyrics.map((line, i) => {
                                            const isActive = i === activeLineIdx;
                                            return (
                                                <motion.p
                                                    key={i}
                                                    initial={false}
                                                    animate={{
                                                        opacity: isActive ? 1 : 0.3,
                                                        scale: isActive ? 1.05 : 1,
                                                        x: isActive ? 10 : 0,
                                                        filter: isActive ? 'blur(0px)' : 'blur(1px)'
                                                    }}
                                                    transition={{ duration: 0.4 }}
                                                    onClick={() => seek(line.time / duration)}
                                                    className={`text-3xl font-bold cursor-pointer transition-colors duration-500 origin-left ${isActive ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                                                >
                                                    {line.text}
                                                </motion.p>
                                            );
                                        })}
                                    </div>
                                ) : plainLyrics ? (
                                    <div className="text-3xl font-semibold text-white/60 leading-relaxed whitespace-pre-wrap">
                                        {plainLyrics}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                                        <Mic2 size={64} className="mb-4 opacity-50" />
                                        <p className="text-xl font-bold">No Lyrics Available</p>
                                    </div>
                                )
                                }
                            </div>
                        </div>
                    </div>

                    <TrackContextMenu
                        {...menuProps}
                        onClose={() => setMenuProps({ ...menuProps, visible: false })}
                        onPlay={(s: any) => { /* already playing */ }}
                        onAddToQueue={(s: any) => { addToQueue(s); }}
                        onGoToArtist={(id) => onGoToArtist?.(id)}
                        onGoToAlbum={(id) => onGoToAlbum?.(id)}
                        onStartRadio={() => { }}
                        isDownloaded={isDownloaded(currentSong.id)}
                        onDownload={() => downloadSong(currentSong)}
                        onRemoveDownload={() => removeDownload(currentSong.id)}
                        onAddToPlaylist={(s) => onAddToPlaylist?.(s)}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
