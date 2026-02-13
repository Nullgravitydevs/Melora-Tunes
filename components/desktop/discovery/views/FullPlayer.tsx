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
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] bg-black"
                >
                    {/* Multi-layer cinematic BG */}
                    {songArt && (
                        <>
                            <div className="absolute inset-0" style={{
                                backgroundImage: `url(${songArt})`,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                filter: 'blur(80px) brightness(0.05) saturate(0.5)',
                                transform: 'scale(1.8)'
                            }} />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#000000]/70 via-[#000000]/40 to-[#000000]/80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-[#000000]/60" />
                        </>
                    )}

                    {/* Top Bar - minimal */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-6">
                        <button onClick={onClose} className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[13px] font-medium">
                            <ChevronDown size={20} /> Back
                        </button>
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">
                            <Disc3 size={10} className={isPlaying ? 'animate-spin' : ''} />
                            NOW PLAYING
                        </div>
                        <div className="w-20" />
                    </div>

                    {/* 2-Column Layout */}
                    <div className="relative z-10 h-full flex">

                        {/* LEFT COLUMN: Art + Controls */}
                        <div className="w-[45%] flex flex-col items-center justify-center px-14 py-24">
                            {viewMode === 'queue' ? (
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
                                <>
                                    {/* Album Art - Apple-style large with reflection */}
                                    <div className="relative mb-12">
                                        {songArt ? (
                                            <>
                                                {/* Ambient color glow */}
                                                <div className="absolute -inset-12 rounded-[2rem] opacity-25 blur-[60px]" style={{
                                                    backgroundImage: `url(${songArt})`,
                                                    backgroundSize: 'cover', backgroundPosition: 'center'
                                                }} />
                                                <img src={songArt} alt=""
                                                    className="relative w-[300px] h-[300px] xl:w-[340px] xl:h-[340px] 2xl:w-[380px] 2xl:h-[380px] rounded-xl object-cover shadow-[0_30px_100px_-10px_rgba(0,0,0,0.7)]"
                                                />
                                            </>
                                        ) : (
                                            <div className="w-[300px] h-[300px] xl:w-[340px] xl:h-[340px] rounded-xl bg-white/[0.04] flex items-center justify-center">
                                                <Music size={64} className="text-white/10" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Track Info - Apple style */}
                                    <div className="w-full max-w-sm mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <h1 className="text-xl xl:text-2xl font-bold tracking-tight truncate">{decodeHtml(currentSong.name)}</h1>
                                                <p className="text-white/50 mt-0.5 truncate text-[15px]">{decodeHtml(currentSong.primaryArtists || '')}</p>
                                            </div>
                                            <button onClick={() => currentSong && toggleLike(currentSong)} className={`p-2 rounded-full transition-colors flex-shrink-0 ${isLiked(currentSong.id) ? 'text-pink-400' : 'text-white/25 hover:text-white/50'}`}>
                                                <Heart size={22} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Progress Bar - Apple Music style with large hit area */}
                            <div className="w-full max-w-sm mb-5">
                                <div className="py-2 -my-2 cursor-pointer group" onClick={handleSeek}>
                                    <div className="h-[6px] bg-white/[0.12] rounded-full overflow-hidden">
                                        <div className="h-full bg-white/80 group-hover:bg-white rounded-full relative transition-all" style={{ width: `${progress * 100}%` }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[14px] h-[14px] bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-[11px] text-white/30 tabular-nums">
                                    <span>{fmt(progress * duration)}</span>
                                    <span>-{fmt(duration - progress * duration)}</span>
                                </div>
                            </div>

                            {/* Main Controls - Apple centered */}
                            <div className="flex items-center gap-8 mb-6">
                                <button onClick={() => setShuffle(!shuffle)} className={`p-1.5 transition-colors ${shuffle ? 'text-white' : 'text-white/25'} hover:text-white/70`}>
                                    <Shuffle size={18} />
                                </button>
                                <button onClick={prev} className="p-1 text-white/80 hover:text-white transition-colors active:scale-90">
                                    <SkipBack size={28} fill="currentColor" />
                                </button>
                                <button onClick={togglePlay} className="w-[56px] h-[56px] rounded-full bg-white/[0.12] backdrop-blur-lg text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
                                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={next} className="p-1 text-white/80 hover:text-white transition-colors active:scale-90">
                                    <SkipForward size={28} fill="currentColor" />
                                </button>
                                <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`p-1.5 relative transition-colors ${repeat !== 'off' ? 'text-white' : 'text-white/25'} hover:text-white/70`}>
                                    <Repeat size={18} />
                                    {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>}
                                </button>
                            </div>

                            {/* Volume - Apple style with speaker icons */}
                            <div className="flex items-center gap-3 w-full max-w-sm mb-6">
                                <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/30">
                                    {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                </button>
                                <div className="flex-1 h-[5px] bg-white/[0.12] rounded-full cursor-pointer overflow-hidden group"
                                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}>
                                    <div className="h-full bg-white/50 group-hover:bg-white/70 rounded-full transition-colors" style={{ width: `${volume * 100}%` }} />
                                </div>
                                <Volume2 size={17} className="text-white/30" />
                            </div>

                            {/* Bottom actions row */}
                            <div className="flex items-center gap-4 w-full max-w-sm justify-center">
                                <button onClick={() => setViewMode(viewMode === 'queue' ? 'art' : 'queue')} className={`p-2 rounded-full transition-colors ${viewMode === 'queue' ? 'text-white bg-white/10' : 'text-white/25 hover:text-white/50'}`}>
                                    <ListMusic size={18} />
                                </button>

                                <button onClick={handleShare} className="p-2 rounded-full text-white/25 hover:text-white/50 transition-colors">
                                    <Share2 size={18} />
                                </button>

                                {/* 3-dots menu */}
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => { setShowMenu(!showMenu); setShowQualityPicker(false); }} className="p-2 rounded-full text-white/25 hover:text-white/50 transition-colors">
                                        <MoreHorizontal size={18} />
                                    </button>
                                    {showMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-black/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl py-2 z-50">
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

                            {/* Quality badge - subtle */}
                            {activeQuality && (
                                <div className="mt-4 flex items-center gap-2 text-[9px] text-white/15 uppercase tracking-[0.2em]">
                                    <Disc3 size={9} className={isPlaying ? 'animate-spin' : ''} />
                                    <span>{activeQuality === 'hires' ? 'HI-RES LOSSLESS' : activeQuality === 'flac' ? 'LOSSLESS' : `${activeQuality} KBPS`}</span>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Synced Lyrics */}
                        <div className="w-[55%] flex flex-col py-24 pr-14 pl-8">
                            {/* Up Next */}
                            {queue.length > 0 && currentIndex < queue.length - 1 && (
                                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl mb-5 cursor-pointer hover:bg-white/[0.05] transition-all"
                                    onClick={() => next()}>
                                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                        <Radio size={14} className="text-white/30" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">Up Next</p>
                                        <p className="text-sm text-white/50 truncate">{decodeHtml(queue[currentIndex + 1]?.name || '')}</p>
                                    </div>
                                    <span className="text-xs text-white/15 font-mono">
                                        {(() => { const s = queue[currentIndex + 1]; if (!s?.duration) return ''; const d = parseInt(String(s.duration)); return `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`; })()}
                                    </span>
                                </div>
                            )}

                            {/* Lyrics */}
                            <div className="flex-1 overflow-y-auto relative" style={{
                                maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)'
                            }}>
                                {lyricsLoading ? (
                                    <div className="h-full flex items-center justify-center text-white/20">
                                        <div className="flex flex-col items-center gap-3">
                                            <Disc3 size={24} className="animate-spin text-white/20" />
                                            <span className="text-sm text-white/15">Loading lyrics...</span>
                                        </div>
                                    </div>
                                ) : isSynced && lyrics.length > 0 ? (
                                    <div className="flex flex-col gap-5 py-[40vh]" ref={lyricsRef}>
                                        {lyrics.map((line, i) => {
                                            const isActive = i === activeLineIdx;
                                            const isPast = i < activeLineIdx;
                                            return (
                                                <p key={i}
                                                    className={`text-[1.6rem] xl:text-[1.85rem] font-bold leading-relaxed cursor-pointer transition-all duration-500 ease-out
                                                        ${isActive ? 'text-white scale-[1.01] origin-left' : isPast ? 'text-white/12' : 'text-white/20'}
                                                    `}
                                                    onClick={() => seek(line.time / duration)}
                                                >
                                                    {line.text}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : plainLyrics ? (
                                    <div className="h-full flex items-center px-4">
                                        <p className="text-lg leading-[2.2] text-white/35 whitespace-pre-wrap font-medium">
                                            {plainLyrics}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <Mic2 size={48} className="mx-auto mb-5 text-white/8" strokeWidth={1.5} />
                                            <p className="text-base font-medium text-white/15">No lyrics available</p>
                                            <p className="text-sm mt-1 text-white/8">Lyrics will appear here when available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* About the Artist */}
                            {currentSong.primaryArtists && (
                                <div className="mt-4 flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl">
                                    <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {songArt ? (
                                            <img src={songArt} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Music size={14} className="text-white/20" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">About the Artist</p>
                                        <p className="text-sm text-white/50 truncate">{decodeHtml(currentSong.primaryArtists)}</p>
                                    </div>
                                    <ChevronDown size={14} className="text-white/10 -rotate-90" />
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
