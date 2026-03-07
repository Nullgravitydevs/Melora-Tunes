"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
    Heart, Volume2, VolumeX, ListMusic, ChevronDown, Music,
    Mic2, Share2, Plus, MoreHorizontal, Disc3, Radio,
    ListPlus, Download
} from "lucide-react";
import { usePlayback, useLibrary, useUI } from "@/components/providers/playback-context";
import { useLyrics } from "@/hooks/useLyrics";
import { decodeHtml } from "@/lib/utils";
import { getArt } from "@/lib/helpers";
import { Tooltip } from "@/components/ui/tooltip";
import { PlayableTrack } from "@/lib/types";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { TrackContextMenu } from "@/components/ui/track-context-menu";
import { useAudioProgress } from "@/hooks/use-audio-progress";
import { useVirtualizer } from "@tanstack/react-virtual";

interface FullPlayerProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToArtist?: (artistId: string) => void;
    onGoToAlbum?: (albumId: string) => void;
    onAddToPlaylist?: (song: JioSaavnSong | PlayableTrack) => void;
}

export function FullPlayer({ isOpen, onClose, onGoToArtist, onGoToAlbum, onAddToPlaylist }: FullPlayerProps) {
    const { currentSong, currentTrack, isPlaying, togglePlay, next, prev, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, queue, currentIndex, playIndex, activeQuality, qualityPreference, setQualityPreference, forceCurrentSongQuality, setQueue, addToQueue, activeMixId } = usePlayback();
    const { isLiked, toggleLike, removeDownload, isDownloaded, mixes } = useLibrary();
    const { downloadSong } = usePlayback();
    const { showToast } = useUI();

    const [viewMode, setViewMode] = useState<'art' | 'queue'>('art');

    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const qualityMenuRef = useRef<HTMLDivElement>(null);

    const hasHiFi = useMemo(() => {
        return currentTrack?.sources?.some(s => s.provider === 'tidal' || s.provider === 'qobuz') ?? false;
    }, [currentTrack]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target as Node)) {
                setShowQualityMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ── Queue Virtualization ── */
    const queueParentRef = useRef<HTMLDivElement>(null);
    const queueVirtualizer = useVirtualizer({
        count: queue.length,
        getScrollElement: () => queueParentRef.current,
        estimateSize: () => 64, // ~64px per row
        overscan: 10,
    });

    /* ── Context Menu State ── */
    const [menuProps, setMenuProps] = useState<{ visible: boolean; x: number; y: number; song: JioSaavnSong | null }>({
        visible: false, x: 0, y: 0, song: null
    });

    const handleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuProps({ visible: true, x: e.clientX, y: e.clientY, song: currentSong || null });
    };

    /* ── Synced Lyrics ── */
    const { lyrics, plainLyrics, isSynced, isLoading: lyricsLoading } = useLyrics(currentSong);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const songArt = getArt(currentSong);

    const handleShare = async () => {
        if (!currentSong) return;
        const sharePayload = {
            id: `shared-song-${currentSong.id}`,
            title: currentSong.name,
            songs: [
                {
                    id: currentSong.id,
                    name: currentSong.name,
                    artists: currentSong.primaryArtists || ''
                }
            ]
        };
        const bytes = new TextEncoder().encode(JSON.stringify(sharePayload));
        let binary = '';
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });
        const encoded = encodeURIComponent(btoa(binary));
        const url = `${window.location.origin}/share?mix=${encoded}`;
        if (navigator.share) {
            try { await navigator.share({ title: currentSong.name, text: `Check out ${currentSong.name} on Melora`, url }); } catch { /* ignore */ }
        } else {
            try { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); } catch { showToast("Failed to copy", "error"); }
        }
    };

    if (!currentSong) return null;

    // Determine what the "Next Track" actually is (Queue vs active Mix)
    let nextTrack: any = null;
    if (queue.length > 0 && currentIndex + 1 < queue.length) {
        nextTrack = queue[currentIndex + 1];
    } else if (activeMixId) {
        const mix = mixes.find(m => m.id === activeMixId);
        if (mix && mix.songs) {
            let nextIdx = mix.currentSongIndex + 1;
            if (shuffle) { /* Approximation of shuffle for preview */
                if (mix.songs.length > 1) {
                    // Try to show something else
                    nextIdx = (mix.currentSongIndex + 1) % mix.songs.length;
                }
            } else if (nextIdx >= mix.songs.length && repeat === 'all') {
                nextIdx = 0; // Wrap around
            }

            if (nextIdx < mix.songs.length) {
                nextTrack = mix.songs[nextIdx];
            }
        }
    }

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
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 z-0 pointer-events-none"
                        >
                            {/* Primary Blur Layer - Hardware Accelerated */}
                            <div
                                className="absolute inset-0 opacity-40"
                                style={{
                                    backgroundImage: `url(${songArt})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(80px) saturate(150%) brightness(0.5)',
                                    transform: 'scale(1.2) translateZ(0)',
                                    willChange: 'transform, opacity'
                                }}
                            />
                            {/* Secondary Atmosphere Layer (No mix-blend-modes for performance) */}
                            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]/90" />
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
                                    <div ref={queueParentRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
                                        <div style={{ height: `${queueVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                                            {queueVirtualizer.getVirtualItems().map((virtualItem) => {
                                                const i = virtualItem.index;
                                                const song = queue[i];
                                                return (
                                                    <div key={virtualItem.key}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: `${virtualItem.size}px`,
                                                            transform: `translateY(${virtualItem.start}px)`
                                                        }}
                                                    >
                                                        <div onClick={() => playIndex(i)}
                                                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group ${i === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'} h-[60px] mx-1`}>
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
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Album Art Container */}
                                    <motion.div
                                        className="relative w-full aspect-square max-w-[320px] 2xl:max-w-[400px] mb-8 lg:mb-12 group shrink-0"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                    >
                                        <div className="absolute inset-0 rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]" />
                                        {songArt ? (
                                            <img
                                                src={songArt}
                                                alt={currentSong.name}
                                                className="relative w-full h-full rounded-3xl object-cover border border-white/10 select-none shadow-2xl"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                                                <Music size={100} className="text-white/10" />
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Track Info */}
                                    <div className="w-full mb-6 lg:mb-8 flex items-end justify-between px-2 max-w-[400px] lg:max-w-[480px]">
                                        <div className="flex-1 min-w-0 pr-6">
                                            <motion.h1
                                                layoutId="player-title"
                                                className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tighter leading-tight line-clamp-2 mb-1 lg:mb-2 drop-shadow-lg"
                                            >
                                                {decodeHtml(currentSong.name)}
                                            </motion.h1>
                                            <div className="flex items-center gap-2 group/artist">
                                                <motion.p
                                                    className="text-xl text-white/80 font-semibold truncate cursor-pointer hover:text-white transition-colors drop-shadow-md"
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
                                                    className="opacity-0 group-hover/artist:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                                                >
                                                    <ChevronDown size={16} className="rotate-[-90deg] text-white/40" />
                                                </button>
                                            </div>

                                            {/* Minimal Quality Badge */}
                                            {(() => {
                                                let q = activeQuality || qualityPreference;
                                                // [F13] Hide misleading HI-RES badge for online streams, unless downloaded
                                                if (q === 'hires' && !isDownloaded(currentSong.id)) {
                                                    q = 'flac';
                                                }
                                                return <div className="mt-2 inline-flex flex-wrap items-center gap-2 relative" ref={qualityMenuRef}>
                                                    <div className="flex items-center gap-2">
                                                        {isDownloaded(currentSong.id) && (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                                                                <Download size={10} /> OFFLINE
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => !isDownloaded(currentSong.id) && setShowQualityMenu(!showQualityMenu)}
                                                            className={`focus:outline-none ${isDownloaded(currentSong.id) ? 'cursor-default opacity-80' : 'hover:scale-105 transition-transform'}`}
                                                            title={isDownloaded(currentSong.id) ? "Offline tracks have a fixed quality" : "Change Quality"}
                                                        >
                                                            {q === 'hires' && <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md hover:bg-amber-500/20 transition-colors"><Disc3 size={10} /> Hi-Res Lossless</div>}
                                                            {q === 'flac' && <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md hover:bg-blue-500/20 transition-colors"><Disc3 size={10} /> Lossless</div>}
                                                            {q === '320' && <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md hover:bg-white/10 transition-colors">High Quality</div>}
                                                            {(q === '160' || q === '96') && <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md hover:bg-white/10 transition-colors">Standard</div>}
                                                        </button>
                                                    </div>

                                                    <AnimatePresence>
                                                        {showQualityMenu && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]"
                                                            >
                                                                <div className="p-2 flex flex-col gap-1">
                                                                    <div className="px-2 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider">Stream Quality</div>
                                                                    {hasHiFi && (
                                                                        <>
                                                                            <button onClick={() => { forceCurrentSongQuality('hires'); setShowQualityMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${q === 'hires' ? 'bg-amber-500/20 text-amber-400' : 'text-white hover:bg-white/10'}`}><Disc3 size={14} /> Hi-Res Lossless</button>
                                                                            <button onClick={() => { forceCurrentSongQuality('flac'); setShowQualityMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${q === 'flac' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-white/10'}`}><Disc3 size={14} /> Lossless (FLAC)</button>
                                                                        </>
                                                                    )}
                                                                    <button onClick={() => { forceCurrentSongQuality('320'); setShowQualityMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${q === '320' ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'}`}>High (320kbps)</button>
                                                                    <button onClick={() => { forceCurrentSongQuality('160'); setShowQualityMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${q === '160' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>Standard (160kbps)</button>
                                                                    <button onClick={() => { forceCurrentSongQuality('96'); setShowQualityMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${q === '96' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>Data Saver (96kbps)</button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {/* AutoPlay Context Badge */}
                                                    {(currentSong as any)._meta?.isAutoplay && (
                                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-cyan-500/20 text-cyan-400 font-bold text-[9px] uppercase tracking-wider backdrop-blur-md pointer-events-none">
                                                            <Radio size={10} /> AutoPlay
                                                        </div>
                                                    )}
                                                </div>;
                                            })()}
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
                                    <div className="w-full max-w-[400px] lg:max-w-[500px]">
                                        <FullPlayerScrubber duration={duration} seek={seek} />
                                    </div>

                                    {/* Playback Controls */}
                                    <div className="flex items-center justify-between w-full max-w-[400px] lg:max-w-[480px] mb-8 text-white px-2">

                                        {/* Left Side: Shuffle & Repeat */}
                                        <div className="flex items-center gap-5">
                                            <button
                                                onClick={() => setShuffle(!shuffle)}
                                                className={`p-2 -m-2 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 ${shuffle ? 'text-accent-blue' : 'text-white/30 hover:text-white/70'}`}
                                            >
                                                <Shuffle size={18} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                                                className={`p-2 -m-2 relative transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 ${repeat !== 'off' ? 'text-accent-blue' : 'text-white/30 hover:text-white/70'}`}
                                            >
                                                <Repeat size={18} strokeWidth={2.5} />
                                                {repeat === 'one' && (
                                                    <span className="absolute top-1 right-1 text-[8px] font-black bg-white text-black w-3 h-3 flex items-center justify-center rounded-full">1</span>
                                                )}
                                            </button>
                                        </div>

                                        {/* Center: Playback Core */}
                                        <div className="flex items-center justify-center gap-6">
                                            <button onClick={prev} className="p-2 -m-2 text-white hover:text-white/80 transition-transform active:scale-90 opacity-90 hover:opacity-100">
                                                <SkipBack size={26} fill="currentColor" />
                                            </button>

                                            <button
                                                onClick={togglePlay}
                                                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                                            >
                                                {isPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1" />}
                                            </button>

                                            <button onClick={next} className="p-2 -m-2 text-white hover:text-white/80 transition-transform active:scale-90 opacity-90 hover:opacity-100">
                                                <SkipForward size={26} fill="currentColor" />
                                            </button>
                                        </div>

                                        {/* Right Side: Options */}
                                        <div className="flex items-center gap-5">
                                            <Tooltip text="Lyrics">
                                                <button
                                                    className={`p-2 -m-2 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 ${viewMode === 'art' && isSynced ? 'text-white' : 'text-white/30 hover:text-white/70'}`}
                                                    onClick={() => { /* Toggle Lyrics View if we had a dedicated view, or just visual feedback */ }}
                                                >
                                                    <Mic2 size={18} strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="Queue">
                                                <button
                                                    onClick={() => setViewMode('queue')}
                                                    className="p-2 -m-2 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 text-white/30 hover:text-white/70"
                                                >
                                                    <ListMusic size={18} strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    {/* Volume & Toggles */}
                                    <div className="w-full flex items-center justify-center gap-4 mb-4 mt-2 max-w-[320px] lg:max-w-[400px]">
                                        <Volume2 size={12} className="text-white/30" />
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group/vol" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - r.left) / r.width); }}>
                                            <div className="h-full bg-white/60 group-hover/vol:bg-white transition-colors" style={{ width: `${volume * 100}%` }} />
                                        </div>
                                    </div>

                                </>
                            )}
                        </div>

                        {/* RIGHT: Lyrics / Metadata & Up Next */}
                        <div className="w-1/2 pl-12 lg:pl-24 pt-20 pb-8 lg:pb-12 h-full flex flex-col justify-center">
                            <div className="flex-1 min-h-0 relative w-full flex flex-col justify-center">
                                <FullPlayerLyrics isSynced={isSynced} lyrics={lyrics} plainLyrics={plainLyrics} duration={duration} seek={seek} />
                            </div>

                            {/* Up Next Preview (Moved visually below lyrics) */}
                            {nextTrack && (
                                <div className="w-full mt-auto p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 group/upnext cursor-pointer hover:bg-white/10 backdrop-blur-xl backdrop-saturate-[150%] transition-transform duration-300 ease-out active:scale-[0.98] shadow-lg" onClick={next}>
                                    <div className="flex-shrink-0 relative">
                                        <img src={getArt(nextTrack)} alt="" className="w-10 h-10 rounded-lg object-cover opacity-80 group-hover/upnext:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {nextTrack._meta?.isAutoplay ? (
                                            <p className="text-[9px] font-black text-cyan-400/80 uppercase tracking-[0.2em] mb-0.5 drop-shadow-sm flex items-center gap-1">
                                                <Radio size={8} /> AutoPlay Pick
                                            </p>
                                        ) : (
                                            <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-0.5 drop-shadow-sm">Up Next</p>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-white/95 truncate mr-2 drop-shadow-sm">{decodeHtml(nextTrack.name || (nextTrack as any).title)}</p>
                                            <Play size={12} fill="currentColor" className="text-white/0 group-hover/upnext:text-white/50 transition-all duration-300 -ml-2 group-hover/upnext:ml-0" />
                                        </div>
                                        <p className="text-[10px] text-white/60 truncate font-medium">{decodeHtml(nextTrack.primaryArtists || (nextTrack as any).artist || '')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <TrackContextMenu
                        {...menuProps}
                        onClose={() => setMenuProps({ ...menuProps, visible: false })}
                        onPlay={() => { /* already playing */ }}
                        onAddToQueue={(song) => { addToQueue(song); }}
                        onGoToArtist={(id) => onGoToArtist?.(id)}
                        onGoToAlbum={(id) => onGoToAlbum?.(id)}
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

// ============================================================================
// PREMIUM SCRUBBER COMPONENT
// Extracts the rapid state updates to prevent re-rendering the entire player
// ============================================================================
function FullPlayerScrubber({ duration, seek }: { duration: number, seek: (time: number) => void }) {
    const { progress, currentTime } = useAudioProgress();
    const scrubRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPercent, setDragPercent] = useState(0);

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const absTime = Math.max(0, time);
        const m = Math.floor(absTime / 60);
        const s = Math.floor(absTime % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Global listeners for dragging outside the element
    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!scrubRef.current) return;
            const rect = scrubRef.current.getBoundingClientRect();
            // Get clientX from either Mouse or Touch event
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

            const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            setDragPercent(percent);

            // Optional: Live seek while dragging (can be choppy if audio engine isn't ready)
            // seek(percent * duration); 
        };

        const handleUp = () => {
            // Commit the seek when user lets go
            setIsDragging(false);
            if (duration > 0) {
                seek(dragPercent * duration);
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, dragPercent, duration, seek]);

    const handleInteractStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!scrubRef.current) return;
        const rect = scrubRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

        setIsDragging(true);
        setDragPercent(percent);
    };

    const displayProgress = isDragging ? dragPercent : progress;
    const displayTime = isDragging ? (dragPercent * duration) : currentTime;

    return (
        <div className="w-full flex items-center gap-4 mb-8 text-white max-w-xl">
            <span className="text-xs font-mono font-bold text-white/80 drop-shadow-md w-10 text-right">{formatTime(displayTime)}</span>
            <div
                ref={scrubRef}
                className="flex-1 h-2 md:h-3 bg-white/20 rounded-full cursor-pointer relative group/scrub shadow-inner backdrop-blur-sm"
                onMouseDown={handleInteractStart}
                onTouchStart={handleInteractStart}
            >
                {/* Scrub Fill */}
                <div className="absolute top-0 left-0 h-full bg-white/95 rounded-full group-hover/scrub:bg-white transition-colors shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                    style={{ width: `${displayProgress * 100}%` }}
                />
                {/* Knob */}
                <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.6)] transition-transform origin-center ${isDragging ? 'scale-125' : 'scale-0 group-hover/scrub:scale-100'}`}
                    style={{ left: `calc(${displayProgress * 100}% - 8px)` }}
                />
            </div>
            <span className="text-xs font-mono font-bold text-white/80 drop-shadow-md w-10">-{formatTime(Math.max(0, duration - displayTime))}</span>
        </div>
    );
}

// ============================================================================
// PREMIUM LYRICS COMPONENT
// Extracted to manage its own scrolling and state, preventing layout thrashing
// ============================================================================
function FullPlayerLyrics({ isSynced, lyrics, plainLyrics, duration, seek }: { isSynced: boolean, lyrics: any[], plainLyrics: string | null, duration: number, seek: (time: number) => void }) {
    const { currentTime } = useAudioProgress();
    const lyricsRef = useRef<HTMLDivElement>(null);

    // Auto-scroll synced lyrics
    useEffect(() => {
        if (!isSynced || !lyrics || lyrics.length === 0 || !lyricsRef.current) return;

        let activeIdx = lyrics.findIndex((l, i) => {
            const nextL = lyrics[i + 1];
            if (nextL) return currentTime >= l.time && currentTime < nextL.time;
            return currentTime >= l.time;
        });

        if (activeIdx !== -1) {
            const container = lyricsRef.current;
            const lines = container.querySelectorAll('.lyric-line');
            const activeLine = lines[activeIdx] as HTMLElement;
            if (activeLine) {
                const blurEdge = 150;
                const targetScroll = activeLine.offsetTop - (container.clientHeight / 2) + (activeLine.clientHeight / 2);
                container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        }
    }, [currentTime, isSynced, lyrics]);

    if (!lyrics || lyrics.length === 0) {
        if (plainLyrics) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
                    <p className="text-white/40 text-sm font-medium whitespace-pre-line leading-loose max-h-[80%] overflow-y-auto custom-scrollbar italic">{plainLyrics}</p>
                </div>
            );
        }
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
                <Mic2 size={48} className="text-white/10 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Instrumental</h3>
                <p className="text-white/40 font-medium">Or lyrics are currently unavailable</p>
            </div>
        );
    }

    return (
        <div ref={lyricsRef} className="w-full h-full max-h-[700px] overflow-y-auto custom-scrollbar relative px-10 py-32 rounded-[2.5rem] bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-3xl" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}>
            <div className="space-y-10 min-h-max pb-32">
                {lyrics.map((l, i) => {
                    const isActive = currentTime >= l.time && (!lyrics[i + 1] || currentTime < lyrics[i + 1].time);
                    const isPassed = currentTime > l.time && !isActive;

                    return (
                        <button
                            key={i}
                            onClick={() => seek(l.time)}
                            className={`lyric-line w-full text-left block transition-all duration-500 transform origin-left hover:scale-[1.02] active:scale-[0.98]
                                ${isActive ? 'text-white scale-[1.05] font-black tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' :
                                    isPassed ? 'text-white/30 scale-100 font-bold hover:text-white/60' :
                                        'text-white/20 scale-100 font-medium hover:text-white/50 blur-[0.5px]'}`}
                        >
                            <span className="text-2xl md:text-3xl lg:text-4xl leading-tight inline-block filter">{l.text || '♪'}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
