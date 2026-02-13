"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
    ChevronDown, Play, Pause, SkipBack, SkipForward,
    Heart, Shuffle, Repeat, Repeat1, Share2, ListMusic,
    Mic2, Plus
} from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useLyrics } from "@/hooks/useLyrics";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (v: ViewState) => void;
}

type ViewMode = "art" | "lyrics" | "queue";

export function FullPlayerSheet({ isOpen, onClose, onNavigate }: Props) {
    const {
        currentSong, isPlaying, togglePlay, next, prev, seek,
        progress, duration, volume, setVolume, shuffle, setShuffle,
        repeat, setRepeat, activeQuality, toggleLike, isLiked,
        queue, currentIndex, playIndex, addSongToMix, mixes
    } = usePlayback();

    const [viewMode, setViewMode] = useState<ViewMode>("art");
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [addTarget, setAddTarget] = useState<any>(null);
    const lyricsRef = useRef<HTMLDivElement>(null);

    const songId = (currentSong as any)?.id || "";
    const { lyrics, plainLyrics, isSynced, isLoading: lyricsLoading } = useLyrics(currentSong as any);

    // Format time
    const fmt = (s: number) => {
        if (!s || isNaN(s) || !isFinite(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const songName = currentSong ? decodeHtml((currentSong as any).name || (currentSong as any).title || "") : "";
    const songArtist = currentSong ? decodeHtml((currentSong as any).primaryArtists || (currentSong as any).artist || "") : "";
    const songAlbum = currentSong ? decodeHtml((currentSong as any).album?.name || "") : "";
    const songArt = currentSong ? getArt(currentSong) : "";
    const liked = currentSong ? isLiked(songId) : false;

    const elapsed = (progress || 0) * (duration || 0);

    // Auto-scroll lyrics
    useEffect(() => {
        if (viewMode !== "lyrics" || !isSynced || !lyricsRef.current) return;
        const currentTime = elapsed;
        const activeIdx = lyrics.findIndex((l, i) => {
            const next = lyrics[i + 1];
            return currentTime >= l.time && (!next || currentTime < next.time);
        });
        if (activeIdx >= 0) {
            const el = lyricsRef.current.children[activeIdx] as HTMLElement;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [elapsed, lyrics, viewMode, isSynced]);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seek(fraction);
    };

    const handleShare = async () => {
        const text = `${songName} by ${songArtist}`;
        if (navigator.share) {
            try { await navigator.share({ title: songName, text }); } catch { }
        } else {
            try { await navigator.clipboard.writeText(text); } catch { }
        }
    };

    const cycleRepeat = () => {
        if (repeat === "off") setRepeat("all");
        else if (repeat === "all") setRepeat("one");
        else setRepeat("off");
    };

    const userPlaylists = mixes.filter((m) =>
        !m.id.startsWith("quick-") && !m.id.startsWith("search-") && !m.id.startsWith("album-") &&
        !m.id.startsWith("artist-") && !m.id.startsWith("radio-") && !m.id.startsWith("explore-") &&
        !m.id.startsWith("home-") && !m.id.startsWith("region-") && !m.id.startsWith("section-") &&
        !m.id.startsWith("instant-") && !m.id.startsWith("library-")
    );

    if (!isOpen || !currentSong) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-0 z-[150] bg-black flex flex-col"
                >
                    {/* Background */}
                    {songArt && (
                        <div
                            className="absolute inset-0 bg-cover bg-center will-change-[background-image]"
                            style={{ backgroundImage: `url(${songArt})`, filter: "blur(60px) brightness(0.1) saturate(0.2)", transform: "scale(1.3) translateZ(0)" }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/70" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full safe-area-inset">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-14 pb-2">
                            <button onClick={onClose} className="p-2 -ml-2 text-white/50 active:text-white">
                                <ChevronDown size={24} />
                            </button>
                            <div className="text-center flex-1 mx-4">
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">Now Playing</p>
                            </div>
                            <button
                                onClick={() => { setAddTarget(currentSong); setShowAddToPlaylist(true); }}
                                className="p-2 -mr-2 text-white/50 active:text-white"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Main content area */}
                        <div className="flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">
                                {viewMode === "art" && (
                                    <motion.div key="art" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-10">
                                        {/* Album art */}
                                        <div className={`w-[280px] h-[280px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/[0.06] transition-transform duration-700 ${isPlaying ? "scale-100" : "scale-95"}`}>
                                            {songArt ? (
                                                <img src={songArt} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                                                    <Mic2 size={48} className="text-white/10" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Track info */}
                                        <div className="w-full mt-8 text-center">
                                            <h2 className="text-xl font-bold text-white truncate">{songName}</h2>
                                            <p className="text-[13px] text-white/40 mt-1 truncate">{songArtist}</p>
                                            {songAlbum && <p className="text-[11px] text-white/20 mt-0.5 truncate">{songAlbum}</p>}
                                            {activeQuality && (
                                                <div className="flex justify-center mt-2">
                                                    <QualityBadge quality={activeQuality} variant="full" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {viewMode === "lyrics" && (
                                    <motion.div key="lyrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar px-8 pt-4 pb-8" ref={lyricsRef}>
                                        {lyricsLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                                            </div>
                                        ) : lyrics.length > 0 ? (
                                            lyrics.map((line, i) => {
                                                const currentTime = elapsed;
                                                const nextLine = lyrics[i + 1];
                                                const isActive = isSynced && currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
                                                return (
                                                    <p
                                                        key={i}
                                                        onClick={() => isSynced && seek(line.time / (duration || 1))}
                                                        className={`py-2 text-lg font-semibold transition-all duration-300 cursor-pointer
                                                            ${isActive ? "text-white scale-105 origin-left" : "text-white/20"}`}
                                                    >
                                                        {line.text || "♪"}
                                                    </p>
                                                );
                                            })
                                        ) : plainLyrics ? (
                                            <p className="text-white/40 text-sm whitespace-pre-line leading-7">{plainLyrics}</p>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-white/20 text-sm">No lyrics available</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {viewMode === "queue" && (
                                    <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar px-5 pt-2 pb-8">
                                        <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3 px-1">Queue</h3>
                                        {queue.map((song: any, i: number) => {
                                            const isActive = i === currentIndex;
                                            const art = getArt(song);
                                            return (
                                                <button
                                                    key={(song.id || i) + "-q-" + i}
                                                    onClick={() => playIndex(i)}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isActive ? "bg-white/[0.05]" : "active:bg-white/[0.03]"}`}
                                                >
                                                    <span className={`w-5 text-right text-[11px] font-medium flex-shrink-0 ${isActive ? "text-white" : "text-white/15"}`}>
                                                        {isActive ? "▶" : i + 1}
                                                    </span>
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                                                        {art && <img src={art} className="w-full h-full object-cover" alt="" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className={`text-[12px] font-medium truncate ${isActive ? "text-white" : "text-white/60"}`}>
                                                            {decodeHtml(song.name || song.title || "")}
                                                        </p>
                                                        <p className="text-[10px] text-white/25 truncate">
                                                            {decodeHtml(song.primaryArtists || song.artist || "")}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Progress & controls */}
                        <div className="px-6 pb-10 pt-2">
                            {/* Progress bar */}
                            <div className="mb-3">
                                <div className="h-[4px] bg-white/[0.08] rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                                    <div className="h-full bg-white rounded-full transition-all duration-150" style={{ width: `${(progress || 0) * 100}%` }} />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-[10px] text-white/25 font-mono">{fmt(elapsed)}</span>
                                    <span className="text-[10px] text-white/25 font-mono">{fmt(duration)}</span>
                                </div>
                            </div>

                            {/* Transport */}
                            <div className="flex items-center justify-between mb-5">
                                <button onClick={() => setShuffle(!shuffle)} className={`p-2 ${shuffle ? "text-white" : "text-white/25"}`}>
                                    <Shuffle size={18} />
                                </button>
                                <button onClick={prev} className="p-2 text-white/70 active:text-white active:scale-90 transition-all">
                                    <SkipBack size={24} fill="currentColor" />
                                </button>
                                <button
                                    onClick={togglePlay}
                                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-90 transition-transform"
                                >
                                    {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={next} className="p-2 text-white/70 active:text-white active:scale-90 transition-all">
                                    <SkipForward size={24} fill="currentColor" />
                                </button>
                                <button onClick={cycleRepeat} className={`p-2 relative ${repeat !== "off" ? "text-white" : "text-white/25"}`}>
                                    {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                                </button>
                            </div>

                            {/* Bottom actions */}
                            <div className="flex items-center justify-between">
                                <button onClick={() => currentSong && toggleLike(currentSong)} className={`p-2 ${liked ? "text-white" : "text-white/25"}`}>
                                    <Heart size={20} fill={liked ? "currentColor" : "none"} />
                                </button>
                                <button onClick={() => setViewMode(viewMode === "lyrics" ? "art" : "lyrics")} className={`p-2 ${viewMode === "lyrics" ? "text-white" : "text-white/25"}`}>
                                    <Mic2 size={20} />
                                </button>
                                <button onClick={() => setViewMode(viewMode === "queue" ? "art" : "queue")} className={`p-2 ${viewMode === "queue" ? "text-white" : "text-white/25"}`}>
                                    <ListMusic size={20} />
                                </button>
                                <button onClick={handleShare} className="p-2 text-white/25 active:text-white/50">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add to Playlist Modal */}
                    <AnimatePresence>
                        {showAddToPlaylist && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-end"
                                onClick={() => setShowAddToPlaylist(false)}
                            >
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25 }}
                                    className="w-full bg-neutral-950 border-t border-white/[0.06] rounded-t-3xl max-h-[60vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-5">
                                        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
                                        <h3 className="text-base font-bold text-white mb-4">Add to Playlist</h3>
                                        {userPlaylists.length > 0 ? (
                                            <div className="space-y-1">
                                                {userPlaylists.map((pl) => (
                                                    <button
                                                        key={pl.id}
                                                        onClick={() => {
                                                            if (addTarget) addSongToMix(pl.id, addTarget);
                                                            setShowAddToPlaylist(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-white/[0.04] transition-colors"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.05]">
                                                            {pl.songs[0] && getArt(pl.songs[0]) ? (
                                                                <img src={getArt(pl.songs[0])} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <ListMusic size={16} className="text-white/20" />
                                                            )}
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <p className="text-[13px] font-medium text-white/80 truncate">{pl.title}</p>
                                                            <p className="text-[10px] text-white/30">{pl.songs.length} songs</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-white/25 text-sm text-center py-8">No playlists yet. Create one in Library.</p>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
