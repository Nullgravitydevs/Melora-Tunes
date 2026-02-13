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
import { Tooltip } from "@/components/ui/tooltip";
import { AudioQuality } from "@/lib/types";

interface FullPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FullPlayer({ isOpen, onClose }: FullPlayerProps) {
    const {
        currentSong, isPlaying, togglePlay, next, prev,
        progress, duration, seek, volume, setVolume,
        shuffle, setShuffle, repeat, setRepeat,
        showToast, queue, currentIndex, playIndex,
        isLiked, toggleLike, activeQuality,
        qualityPreference, setQualityPreference,
        setQueue, downloadSong, isDownloaded
    } = usePlayback();

    const [viewMode, setViewMode] = useState<'art' | 'queue'>('art');
    const [showMenu, setShowMenu] = useState(false);
    const [showQualityPicker, setShowQualityPicker] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Close menu on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
                setShowQualityPicker(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showMenu]);

    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const getArt = () => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        return '';
    };

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

    const handleAddToQueue = () => {
        if (currentSong) { setQueue([...queue, currentSong]); showToast("Added to queue", "success"); }
        setShowMenu(false);
    };

    const qualityLabel = (q: string) => {
        const map: Record<string, string> = { hires: 'Hi-Res', flac: 'Lossless (FLAC)', '320': '320 kbps', '160': '160 kbps', '96': '96 kbps' };
        return map[q] || q;
    };

    if (!currentSong) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black"
                >
                    {/* BG Blur */}
                    {getArt() && (
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url(${getArt()})`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            filter: 'blur(120px) brightness(0.12) saturate(0.3)',
                            transform: 'scale(1.5)'
                        }} />
                    )}

                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
                        <button onClick={onClose} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
                            <ChevronDown size={20} /> BACK
                        </button>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                            <Disc3 size={12} className={isPlaying ? 'animate-spin' : ''} />
                            NOW PLAYING
                        </div>
                        <div className="w-20" />
                    </div>

                    {/* 2-Column Layout */}
                    <div className="relative z-10 h-full flex">

                        {/* ── LEFT COLUMN: Art + Controls ── */}
                        <div className="w-1/2 flex flex-col items-center justify-center px-12 py-20">
                            {viewMode === 'queue' ? (
                                /* Queue View */
                                <div className="w-full max-w-md flex-1 flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold flex items-center gap-2"><ListMusic size={18} /> Queue</h2>
                                        <button onClick={() => setViewMode('art')} className="text-sm text-white/50 hover:text-white">Close</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                                        {queue.map((song, i) => (
                                            <div key={song.id + i} onClick={() => playIndex(i)}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${i === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                <span className="w-5 text-center text-xs text-white/30">{i === currentIndex ? <div className="w-2 h-2 rounded-full bg-white mx-auto" /> : i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium truncate text-sm ${i === currentIndex ? 'text-white' : 'text-white/80'}`}>{decodeHtml(song.name)}</p>
                                                    <p className="text-xs text-white/40 truncate">{decodeHtml(song.primaryArtists || '')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Art View */
                                <>
                                    {/* Album Art */}
                                    <div className="relative mb-8">
                                        {getArt() ? (
                                            <img src={getArt()} alt="" className="w-72 h-72 xl:w-80 xl:h-80 rounded-2xl object-cover shadow-[0_20px_80px_rgba(0,0,0,0.6)]" />
                                        ) : (
                                            <div className="w-72 h-72 xl:w-80 xl:h-80 rounded-2xl bg-white/10 flex items-center justify-center">
                                                <Music size={64} className="text-white/20" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Track Info */}
                                    <div className="text-center mb-6 max-w-sm">
                                        <h1 className="text-2xl font-bold truncate">{decodeHtml(currentSong.name)}</h1>
                                        <p className="text-white/50 mt-1 truncate">{decodeHtml(currentSong.primaryArtists || '')}</p>
                                        {currentSong.album?.name && (
                                            <p className="text-sm text-white/25 mt-0.5 truncate">{decodeHtml(currentSong.album.name)}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Progress Bar */}
                            <div className="w-full max-w-sm mb-6">
                                <div className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden group" onClick={handleSeek}>
                                    <div className="h-full bg-white rounded-full relative transition-all" style={{ width: `${progress * 100}%` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-white/40 tabular-nums">
                                    <span>{fmt(progress * duration)}</span>
                                    <span>{fmt(duration)}</span>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center gap-6 mb-6">
                                <button onClick={() => setShuffle(!shuffle)} className={`p-2 ${shuffle ? 'text-white' : 'text-white/40'} hover:text-white transition-colors`}>
                                    <Shuffle size={18} />
                                </button>
                                <button onClick={prev} className="p-2 text-white/80 hover:text-white transition-colors">
                                    <SkipBack size={24} fill="currentColor" />
                                </button>
                                <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_25px_rgba(255,255,255,0.2)]">
                                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={next} className="p-2 text-white/80 hover:text-white transition-colors">
                                    <SkipForward size={24} fill="currentColor" />
                                </button>
                                <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`p-2 relative ${repeat !== 'off' ? 'text-white' : 'text-white/40'} hover:text-white transition-colors`}>
                                    <Repeat size={18} />
                                    {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>}
                                </button>
                            </div>

                            {/* Footer Row */}
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <button onClick={() => currentSong && toggleLike(currentSong)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked(currentSong.id) ? 'text-white' : 'text-white/30'}`}>
                                    <Heart size={20} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                                </button>

                                <div className="flex items-center gap-2 flex-1 group">
                                    <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/40 hover:text-white">
                                        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                    <div className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}>
                                        <div className="h-full bg-white/50 group-hover:bg-white transition-colors" style={{ width: `${volume * 100}%` }} />
                                    </div>
                                </div>

                                <button onClick={() => setViewMode(viewMode === 'queue' ? 'art' : 'queue')} className={`p-2 rounded-full hover:bg-white/10 ${viewMode === 'queue' ? 'text-white bg-white/10' : 'text-white/30'}`}>
                                    <ListMusic size={18} />
                                </button>

                                <button onClick={handleShare} className="p-2 rounded-full text-white/30 hover:bg-white/10 hover:text-white">
                                    <Share2 size={18} />
                                </button>

                                {/* 3-dots menu */}
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => { setShowMenu(!showMenu); setShowQualityPicker(false); }} className="p-2 rounded-full text-white/30 hover:bg-white/10 hover:text-white">
                                        <MoreHorizontal size={18} />
                                    </button>
                                    {showMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
                                            {!showQualityPicker ? (
                                                <>
                                                    <MenuBtn icon={<Plus size={14} />} label="Add to Queue" onClick={handleAddToQueue} />
                                                    <MenuBtn icon={<ListPlus size={14} />} label="Add to Playlist" onClick={() => { setShowMenu(false); showToast("Use right-click on a song", "info"); }} />
                                                    <MenuBtn icon={<Radio size={14} />} label="Start Radio" onClick={() => { setShowMenu(false); showToast("Radio started", "success"); }} />
                                                    <div className="border-t border-white/[0.06] my-1" />
                                                    <MenuBtn icon={<Disc3 size={14} />} label={`Quality: ${qualityLabel(qualityPreference)}`} onClick={() => setShowQualityPicker(true)} />
                                                    {currentSong && !isDownloaded(currentSong.id) && (
                                                        <MenuBtn icon={<Download size={14} />} label="Download" onClick={() => { downloadSong(currentSong); setShowMenu(false); }} />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white/30">Quality</div>
                                                    {(['hires', 'flac', '320', '160', '96'] as AudioQuality[]).map(q => (
                                                        <button key={q} onClick={() => { setQualityPreference(q); setShowQualityPicker(false); setShowMenu(false); showToast(`Quality set to ${qualityLabel(q)}`, 'success'); }}
                                                            className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-white/[0.06] flex items-center justify-between ${qualityPreference === q ? 'text-white font-semibold' : 'text-white/60'}`}>
                                                            <span>{qualityLabel(q)}</span>
                                                            {qualityPreference === q && <span className="text-white">✓</span>}
                                                        </button>
                                                    ))}
                                                    <div className="border-t border-white/[0.06] my-1" />
                                                    <button onClick={() => setShowQualityPicker(false)} className="w-full px-4 py-2 text-left text-[13px] text-white/40 hover:bg-white/[0.06]">← Back</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quality Streaming Badge */}
                            {activeQuality && (
                                <div className="mt-4 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest">
                                    <Disc3 size={10} className={isPlaying ? 'animate-spin' : ''} />
                                    <span>HIGH-QUALITY STREAMING</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-bold">
                                        {activeQuality === 'hires' ? 'HI-RES' : activeQuality === 'flac' ? 'LOSSLESS' : `${activeQuality} kbps`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT COLUMN: Synced Lyrics ── */}
                        <div className="w-1/2 flex flex-col py-20 pr-12 pl-4">
                            {/* Up Next */}
                            {queue.length > 0 && currentIndex < queue.length - 1 && (
                                <div className="flex items-center gap-3 p-3 bg-white/[0.04] backdrop-blur-sm rounded-xl mb-4 cursor-pointer hover:bg-white/[0.06] transition-colors"
                                    onClick={() => next()}>
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <Radio size={16} className="text-white/40" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">Up Next</p>
                                        <p className="text-sm text-white/60 truncate">{decodeHtml(queue[currentIndex + 1]?.name || '')}</p>
                                    </div>
                                    <span className="text-xs text-white/20 font-mono">
                                        {(() => { const s = queue[currentIndex + 1]; if (!s?.duration) return ''; const d = parseInt(String(s.duration)); return `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`; })()}
                                    </span>
                                </div>
                            )}

                            {/* Lyrics */}
                            <div className="flex-1 overflow-y-auto relative" style={{
                                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
                            }}>
                                {lyricsLoading ? (
                                    <div className="h-full flex items-center justify-center text-white/20">
                                        <div className="flex flex-col items-center gap-3">
                                            <Disc3 size={28} className="animate-spin text-white/30" />
                                            <span className="text-sm">Loading lyrics...</span>
                                        </div>
                                    </div>
                                ) : isSynced && lyrics.length > 0 ? (
                                    /* Apple-style synced lyrics */
                                    <div className="flex flex-col gap-4 py-[40vh]" ref={lyricsRef}>
                                        {lyrics.map((line, i) => {
                                            const isActive = i === activeLineIdx;
                                            const isPast = i < activeLineIdx;
                                            return (
                                                <p key={i}
                                                    className={`text-2xl xl:text-3xl font-bold leading-snug cursor-pointer transition-all duration-500 ease-out
                                                        ${isActive ? 'text-white scale-[1.02] origin-left' : isPast ? 'text-white/20' : 'text-white/30'}
                                                    `}
                                                    style={{ filter: isActive ? 'blur(0px)' : 'blur(0.3px)' }}
                                                    onClick={() => seek(line.time / duration)}
                                                >
                                                    {line.text}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : plainLyrics ? (
                                    <div className="h-full flex items-center">
                                        <p className="text-xl leading-loose text-white/50 whitespace-pre-wrap font-medium">
                                            {plainLyrics}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-white/15">
                                            <Mic2 size={48} className="mx-auto mb-4" />
                                            <p className="text-lg font-medium">No lyrics available</p>
                                            <p className="text-sm mt-1">Lyrics will appear here when available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* About the Artist */}
                            {currentSong.primaryArtists && (
                                <div className="mt-4 flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {getArt() ? (
                                            <img src={getArt()} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Music size={16} className="text-white/30" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">About the Artist</p>
                                        <p className="text-sm text-white/60 truncate">{decodeHtml(currentSong.primaryArtists)}</p>
                                    </div>
                                    <ChevronDown size={16} className="text-white/20 -rotate-90" />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ── Menu Button ── */
function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full px-4 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
            {icon} {label}
        </button>
    );
}
