import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLyrics } from "@/hooks/useLyrics";
import { getArt } from "../DiscoveryShared";
import { ChevronDown, Disc, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Loader2, ChevronRight } from "lucide-react";

// --- Audio Quality Badge reused locally or imported if needed, but the original code had a local definition. 
// We should import the one we just made.
import { QualityBadge } from "./QualityBadge";

// --- Tooltips for the local quality badge inside NowPlaying were slightly different in placement in original?
// Actually the original code had `qualityTooltips` defined globally in the file and used in both places.
// We will use the exported QualityBadge component for consistency.

export function NowPlayingOverlay({
    song,
    nextSong,
    quality,
    onClose,
    playback,
    onAddToOTG // kept for interface compatibility though seemingly unused in UI
}: {
    song: any,
    nextSong: any,
    quality: string,
    onClose: () => void,
    playback: any,
    onAddToOTG: (s: any) => void
}) {
    const Art = getArt(song);
    const { lyrics, plainLyrics, isSynced, isLoading } = useLyrics(song);
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync Lyrics - Robust
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;

        // Find the current line index
        const currentTime = playback.progress;

        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });

        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
            // Smooth scroll to active line
            const lyricsContainer = scrollRef.current?.firstElementChild;
            const activeEl = lyricsContainer?.children[index] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [playback.progress, lyrics, isSynced, activeIndex]);

    // Smart Right Panel Decision
    const hasLyrics = (isSynced && lyrics.length > 0) || !!plainLyrics;
    const showQueue = !hasLyrics && !isLoading;

    // Local tooltip logic for the bottom-left badge was inline in original. 
    // We can use the QualityBadge component we extracted, but check if we need custom styling.
    // The original NowPlayingOverlay had a specific layout for the badge at bottom left.
    // Let's reimplement the bottom left part using QualityBadge if possible, or adapt.
    // The original code had a custom mapping for the bottom left badge.

    // Helper for Quality Info (duplicated logic for now to keep self-contained or import)
    const qualityTooltips: any = {
        'hires': { title: '🔥 Hi-Res Studio Quality', desc: 'LOSSLESS · HI-RES · 24-bit / 96kHz' },
        'flac': { title: '💿 CD Quality Lossless', desc: 'LOSSLESS · CD · 16-bit / 44.1kHz' },
        '320': { title: '🎶 High-Quality Streaming', desc: 'HQ · 320 kbps' },
        '160': { title: '🎵 Standard Streaming', desc: 'MQ · 160 kbps' },
        '96': { title: '📻 Data Saver', desc: 'LQ · 96 kbps' },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
        >
            {/* 1. Ambient Dynamic Background */}
            {Art && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={Art} className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-70 scale-150 animate-pulse saturate-200" style={{ animationDuration: '10s' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6">
                <button onClick={onClose} className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors">
                    <ChevronDown size={18} /> Minimize
                </button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex gap-8 px-12 pb-8 w-full h-full items-center overflow-hidden">

                {/* Left: Art & Controls */}
                <div className="w-1/2 flex flex-col justify-center gap-6 max-w-xl mx-auto h-full p-4 lg:p-8 relative">

                    {/* Art */}
                    <div className="w-full h-auto max-h-[45vh] flex items-center justify-center">
                        <motion.div
                            className="relative max-h-full w-auto shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden ring-1 ring-white/10"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {Art ? (
                                <img src={Art} alt={song.name} className="w-auto h-auto max-w-full max-h-[45vh] object-contain" />
                            ) : (
                                <div className="w-[280px] h-[280px] bg-neutral-900 flex items-center justify-center"><Disc size={48} className="opacity-20 text-white" /></div>
                            )}
                        </motion.div>
                    </div>

                    {/* Title & Progress */}
                    <div className="flex flex-col gap-5 items-center text-center">
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">{song.name}</h1>
                            <p className="text-lg text-white/60 font-medium drop-shadow-sm">{song.primaryArtists}</p>
                        </div>

                        <div className="flex flex-col gap-2 w-full max-w-md">
                            <div className="bg-white/10 h-1.5 rounded-full w-full cursor-pointer relative group backdrop-blur-sm"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickPct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                    playback.seek(clickPct * playback.duration);
                                }}
                            >
                                {(() => {
                                    // COMPUTE ONCE
                                    const pct = playback.duration > 0 ? playback.progress / playback.duration : 0;
                                    return (
                                        <>
                                            <div className="bg-white h-full rounded-full relative overflow-hidden" style={{ width: `${pct * 100}% ` }}>
                                                <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-white to-transparent opacity-50" />
                                            </div>
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ left: `${pct * 100}% ` }} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                                <span>{Math.floor(playback.progress / 60)}:{(Math.floor(playback.progress) % 60).toString().padStart(2, '0')}</span>
                                <span>{Math.floor(playback.duration / 60)}:{(Math.floor(playback.duration) % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-10 w-full">
                            <button onClick={() => playback.setShuffle(!playback.shuffle)} className={`transition-all ${playback.shuffle ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'} `}><Shuffle size={18} /></button>
                            <div className="flex items-center gap-6">
                                <button onClick={playback.prev} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipBack size={32} strokeWidth={1.5} /></button>
                                <button onClick={playback.togglePlay} className="w-16 h-16 bg-white/90 text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] backdrop-blur-md">
                                    {playback.isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
                                </button>
                                <button onClick={playback.next} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipForward size={32} strokeWidth={1.5} /></button>
                            </div>
                            <button onClick={() => playback.setRepeat(playback.repeat === 'one' ? 'none' : playback.repeat === 'all' ? 'one' : 'all')} className={`transition-all ${playback.repeat !== 'none' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'} `}><Repeat size={18} /></button>

                            {/* OTG Removed */}
                        </div>
                    </div>

                    {/* Left Down: Audio Tags (Fixed Placement) */}
                    <div className="absolute bottom-0 left-0">
                        {(() => {
                            const norm = quality?.toLowerCase().trim() || '320';
                            let q = '320';
                            if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
                            else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
                            const info = qualityTooltips[q] || qualityTooltips['320'];

                            return (
                                <div className="flex flex-col items-start gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-help group">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${q === 'hires' || q === 'flac' ? 'text-white' : 'text-white/70'} `}>
                                        {(q === 'hires' || q === 'flac') && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />}
                                        {info.title}
                                    </div>
                                    <div className="text-[10px] text-white/40 font-mono group-hover:text-white/60 transition-colors">
                                        {info.desc}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right: Lyrics & Up Next */}
                <div className="w-1/2 h-full flex flex-col gap-6 relative border-l border-white/5 pl-8">

                    {/* Up Next Card */}
                    {nextSong ? (
                        <div
                            className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 cursor-pointer"
                            onClick={playback.next}
                        >
                            <div className="w-12 h-12 rounded bg-neutral-800 overflow-hidden flex items-center justify-center">
                                {getArt(nextSong)
                                    ? <img src={getArt(nextSong)} className="w-full h-full object-cover" />
                                    : <Disc size={20} className="text-white/20" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-white/40 uppercase tracking-wider">Up Next</p>
                                <p className="text-sm text-white truncate">{nextSong.name}</p>
                                <p className="text-[10px] text-white/50 truncate">{nextSong.primaryArtists}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 opacity-50">
                            End of Playlist
                        </div>
                    )}

                    {/* Queue OR Lyrics */}
                    {showQueue ? (
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 mask-gradient-b">
                            {(playback.queue || [])
                                .slice(playback.currentIndex + 1)
                                .map((s: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                        onClick={() => {
                                            const absoluteIndex = playback.currentIndex + 1 + i;
                                            // STRICT GUARD: Check both Mix Existence AND Index Validity
                                            if (
                                                playback.activeMixId &&
                                                playback.updateMix &&
                                                playback.queue &&
                                                playback.queue[absoluteIndex]
                                            ) {
                                                playback.updateMix(playback.activeMixId, {
                                                    currentSongIndex: absoluteIndex,
                                                    progress: 0
                                                });
                                            }
                                            // updateMix handles playback switch automatically
                                        }}
                                    >
                                        <img
                                            src={getArt(s)}
                                            className="w-8 h-8 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{s.name}</p>
                                            <p className="text-[10px] text-white/40 truncate">
                                                {s.primaryArtists}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto mask-gradient-y scroll-smooth"
                        >
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin opacity-50" />
                                </div>
                            ) : (
                                <div className="py-[30vh] space-y-6 text-center px-4">
                                    {lyrics.map((line, i) => (
                                        <motion.p
                                            key={i}
                                            animate={{
                                                opacity: i === activeIndex ? 1 : 0.4,
                                                scale: i === activeIndex ? 1.05 : 0.98
                                            }}
                                            className="text-xl md:text-3xl font-bold cursor-pointer"
                                            onClick={() => {
                                                playback.seek(line.time);
                                            }}
                                        >
                                            {line.text}
                                        </motion.p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* About Artist */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] uppercase text-white/40">About Artist</p>
                            <p className="text-sm text-white font-bold">
                                {song.primaryArtists.split(',')[0]}
                            </p>
                        </div>
                        {/* ChevronRight is used here but not imported in previous snippet, need to ensure imports */}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
