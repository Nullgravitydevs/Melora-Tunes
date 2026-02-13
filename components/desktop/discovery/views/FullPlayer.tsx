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
                    {/* Multi-layer BG */}
                    {getArt() && (
                        <>
                            <div className="absolute inset-0" style={{
                                backgroundImage: `url(${getArt()})`,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                filter: 'blur(100px) brightness(0.15) saturate(0.4)',
                                transform: 'scale(1.6)'
                            }} />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                        </>
                    )}

                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
                        <button onClick={onClose} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium backdrop-blur-sm bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-full">
                            <ChevronDown size={18} /> Back
                        </button>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">
                            <Disc3 size={11} className={isPlaying ? 'animate-spin' : ''} />
                            NOW PLAYING
                        </div>
                        <div className="w-20" />
                    </div>

                    {/* 2-Column Layout */}
                    <div className="relative z-10 h-full flex">

                        {/* LEFT COLUMN: Art + Controls */}
                        <div className="w-1/2 flex flex-col items-center justify-center px-16 py-24">
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
                                    {/* Album Art - Premium with shadow glow */}
                                    <div className="relative mb-10 group">
                                        {getArt() ? (
                                            <>
                                                {/* Soft glow behind art */}
                                                <div className="absolute -inset-8 rounded-3xl opacity-30 blur-3xl" style={{
                                                    backgroundImage: `url(${getArt()})`,
                                                    backgroundSize: 'cover', backgroundPosition: 'center'
                                                }} />
                                                <img src={getArt()} alt=""
                                                    className="relative w-72 h-72 xl:w-80 xl:h-80 2xl:w-[22rem] 2xl:h-[22rem] rounded-2xl object-cover shadow-[0_25px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                                                />
                                            </>
                                        ) : (
                                            <div className="w-72 h-72 xl:w-80 xl:h-80 rounded-2xl bg-white/[0.06] flex items-center justify-center ring-1 ring-white/10">
                                                <Music size={64} className="text-white/15" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Track Info */}
                                    <div className="text-center mb-8 max-w-sm">
                                        <h1 className="text-2xl xl:text-3xl font-bold tracking-tight">{decodeHtml(currentSong.name)}</h1>
                                        <p className="text-white/45 mt-2 text-base">{decodeHtml(currentSong.primaryArtists || '')}</p>
                                        {currentSong.album?.name && (
                                            <p className="text-sm text-white/20 mt-1">{decodeHtml(currentSong.album.name)}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Progress Bar - Thicker, more interactive */}
                            <div className="w-full max-w-sm mb-8">
                                <div className="h-[5px] bg-white/[0.08] rounded-full cursor-pointer overflow-hidden group" onClick={handleSeek}>
                                    <div className="h-full bg-white/60 group-hover:bg-white rounded-full relative transition-all" style={{ width: `${progress * 100}%` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2.5 text-[11px] text-white/30 tabular-nums font-mono">
                                    <span>{fmt(progress * duration)}</span>
                                    <span>{fmt(duration)}</span>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center gap-7 mb-8">
                                <button onClick={() => setShuffle(!shuffle)} className={`p-2.5 rounded-full transition-colors ${shuffle ? 'text-white bg-white/[0.08]' : 'text-white/30'} hover:text-white`}>
                                    <Shuffle size={18} />
                                </button>
                                <button onClick={prev} className="p-2 text-white/70 hover:text-white transition-colors hover:scale-110 active:scale-90">
                                    <SkipBack size={26} fill="currentColor" />
                                </button>
                                <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_30px_rgba(255,255,255,0.25)]">
                                    {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={next} className="p-2 text-white/70 hover:text-white transition-colors hover:scale-110 active:scale-90">
                                    <SkipForward size={26} fill="currentColor" />
                                </button>
                                <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`p-2.5 rounded-full relative transition-colors ${repeat !== 'off' ? 'text-white bg-white/[0.08]' : 'text-white/30'} hover:text-white`}>
                                    <Repeat size={18} />
                                    {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">1</span>}
                                </button>
                            </div>

                            {/* Footer Row */}
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <button onClick={() => currentSong && toggleLike(currentSong)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked(currentSong.id) ? 'text-white' : 'text-white/25'}`}>
                                    <Heart size={20} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                                </button>

                                <div className="flex items-center gap-2 flex-1 group">
                                    <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/35 hover:text-white">
                                        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                    <div className="flex-1 h-1 bg-white/[0.08] rounded-full cursor-pointer overflow-hidden"
                                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}>
                                        <div className="h-full bg-white/50 group-hover:bg-white transition-colors" style={{ width: `${volume * 100}%` }} />
                                    </div>
                                </div>

                                <button onClick={() => setViewMode(viewMode === 'queue' ? 'art' : 'queue')} className={`p-2 rounded-full hover:bg-white/10 ${viewMode === 'queue' ? 'text-white bg-white/10' : 'text-white/25'}`}>
                                    <ListMusic size={18} />
                                </button>

                                <button onClick={handleShare} className="p-2 rounded-full text-white/25 hover:bg-white/10 hover:text-white">
                                    <Share2 size={18} />
                                </button>

                                {/* 3-dots menu */}
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => { setShowMenu(!showMenu); setShowQualityPicker(false); }} className="p-2 rounded-full text-white/25 hover:bg-white/10 hover:text-white">
                                        <MoreHorizontal size={18} />
                                    </button>
                                    {showMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
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
                                <div className="mt-5 flex items-center gap-2.5 text-[10px] text-white/20 uppercase tracking-[0.15em]">
                                    <Disc3 size={10} className={isPlaying ? 'animate-spin' : ''} />
                                    <span>HIGH-QUALITY STREAMING</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-white/40 font-bold border border-white/[0.06]">
                                        {activeQuality === 'hires' ? 'HI-RES' : activeQuality === 'flac' ? 'LOSSLESS' : `${activeQuality} kbps`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Synced Lyrics */}
                        <div className="w-1/2 flex flex-col py-24 pr-14 pl-6">
                            {/* Up Next */}
                            {queue.length > 0 && currentIndex < queue.length - 1 && (
                                <div className="flex items-center gap-3 p-3.5 bg-white/[0.03] backdrop-blur-sm rounded-2xl mb-5 cursor-pointer hover:bg-white/[0.06] transition-all border border-white/[0.04]"
                                    onClick={() => next()}>
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                        <Radio size={16} className="text-white/30" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-bold">Up Next</p>
                                        <p className="text-sm text-white/55 truncate mt-0.5">{decodeHtml(queue[currentIndex + 1]?.name || '')}</p>
                                    </div>
                                    <span className="text-xs text-white/15 font-mono">
                                        {(() => { const s = queue[currentIndex + 1]; if (!s?.duration) return ''; const d = parseInt(String(s.duration)); return `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`; })()}
                                    </span>
                                </div>
                            )}

                            {/* Lyrics */}
                            <div className="flex-1 overflow-y-auto relative" style={{
                                maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
                            }}>
                                {lyricsLoading ? (
                                    <div className="h-full flex items-center justify-center text-white/20">
                                        <div className="flex flex-col items-center gap-3">
                                            <Disc3 size={28} className="animate-spin text-white/25" />
                                            <span className="text-sm">Loading lyrics...</span>
                                        </div>
                                    </div>
                                ) : isSynced && lyrics.length > 0 ? (
                                    <div className="flex flex-col gap-5 py-[40vh]" ref={lyricsRef}>
                                        {lyrics.map((line, i) => {
                                            const isActive = i === activeLineIdx;
                                            const isPast = i < activeLineIdx;
                                            return (
                                                <p key={i}
                                                    className={`text-[1.65rem] xl:text-[1.9rem] font-bold leading-snug cursor-pointer transition-all duration-500 ease-out
                                                        ${isActive ? 'text-white scale-[1.01] origin-left' : isPast ? 'text-white/15' : 'text-white/25'}
                                                    `}
                                                    onClick={() => seek(line.time / duration)}
                                                >
                                                    {line.text}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : plainLyrics ? (
                                    <div className="h-full flex items-center">
                                        <p className="text-lg leading-[2] text-white/40 whitespace-pre-wrap font-medium">
                                            {plainLyrics}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-white/10">
                                            <Mic2 size={52} className="mx-auto mb-5" strokeWidth={1.5} />
                                            <p className="text-lg font-semibold text-white/20">No lyrics available</p>
                                            <p className="text-sm mt-1.5 text-white/10">Lyrics will appear here when available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* About the Artist */}
                            {currentSong.primaryArtists && (
                                <div className="mt-5 flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.04]">
                                    <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-white/[0.06]">
                                        {getArt() ? (
                                            <img src={getArt()} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Music size={16} className="text-white/25" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-bold">About the Artist</p>
                                        <p className="text-sm text-white/55 truncate mt-0.5">{decodeHtml(currentSong.primaryArtists)}</p>
                                    </div>
                                    <ChevronDown size={16} className="text-white/15 -rotate-90" />
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
