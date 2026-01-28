import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLyrics } from "@/hooks/useLyrics";
import { getArt } from "../DiscoveryShared";
import {
    ChevronDown,
    Disc,
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
    Loader2,
    ChevronRight
} from "lucide-react";
import { QualityBadge } from "./QualityBadge";

interface NowPlayingProps {
    song: any;
    nextSong: any;
    quality: string | null | undefined;
    onClose: () => void;
    playback: any;
    onAddToOTG?: (s: any) => void;
}

export function NowPlayingOverlay({
    song,
    nextSong,
    quality,
    onClose,
    playback
}: NowPlayingProps) {

    const art = useMemo(() => getArt(song), [song]);
    const { lyrics, plainLyrics, isSynced, isLoading } = useLyrics(song);

    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Lyrics Sync (safe + performant)
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;

        const t = playback.progress;
        let idx = -1;

        for (let i = 0; i < lyrics.length; i++) {
            const next = lyrics[i + 1];
            if (t >= lyrics[i].time && (!next || t < next.time)) {
                idx = i;
                break;
            }
        }

        if (idx !== -1 && idx !== activeIndex) {
            setActiveIndex(idx);
            const container = scrollRef.current;
            const el = container?.querySelector(`[data-lyric="${idx}"]`) as HTMLElement;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [playback.progress, lyrics, isSynced, activeIndex]);

    const hasLyrics = (isSynced && lyrics.length > 0) || !!plainLyrics;
    const showQueue = !hasLyrics && !isLoading;

    const progressPct = useMemo(() => {
        return playback.duration > 0
            ? Math.min(1, Math.max(0, playback.progress / playback.duration))
            : 0;
    }, [playback.progress, playback.duration]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        playback.seek(pct * playback.duration);
    }, [playback]);



    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
            {/* Ambient Background */}
            {art && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img
                        src={art}
                        className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-60 scale-150"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6">
                <button
                    onClick={onClose}
                    className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                    <ChevronDown size={18} /> Minimize
                </button>
            </div>

            {/* Main */}
            <div className="relative z-10 flex-1 flex gap-8 px-12 pb-8 overflow-hidden">

                {/* Left */}
                <div className="w-1/2 flex flex-col justify-center gap-6 max-w-xl mx-auto">

                    {/* Art */}
                    <div className="flex items-center justify-center">
                        <motion.div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                            {art ? (
                                <img src={art} className="max-h-[45vh] object-contain" />
                            ) : (
                                <div className="w-[280px] h-[280px] bg-neutral-900 flex items-center justify-center">
                                    <Disc size={48} className="opacity-20 text-white" />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-bold text-white line-clamp-2">{song.name}</h1>
                        <p className="text-lg text-white/60">{song.primaryArtists}</p>
                    </div>

                    {/* Progress */}
                    <div className="flex flex-col gap-2">
                        <div
                            className="bg-white/10 h-1.5 rounded-full cursor-pointer relative"
                            onClick={handleSeek}
                        >
                            <div
                                className="bg-white h-full rounded-full"
                                style={{ width: `${progressPct * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-white/40">
                            <span>
                                {Math.floor(playback.progress / 60)}:
                                {(Math.floor(playback.progress) % 60).toString().padStart(2, '0')}
                            </span>
                            <span>
                                {Math.floor(playback.duration / 60)}:
                                {(Math.floor(playback.duration) % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-10">
                        <Shuffle
                            size={18}
                            onClick={() => playback.setShuffle(!playback.shuffle)}
                            className={playback.shuffle ? 'text-white' : 'text-white/40'}
                        />

                        <div className="flex items-center gap-6">
                            <SkipBack size={32} onClick={playback.prev} className="text-white" />
                            <button
                                onClick={playback.togglePlay}
                                className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
                            >
                                {playback.isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                            </button>
                            <SkipForward size={32} onClick={playback.next} className="text-white" />
                        </div>

                        <Repeat
                            size={18}
                            onClick={() =>
                                playback.setRepeat(
                                    playback.repeat === 'one'
                                        ? 'none'
                                        : playback.repeat === 'all'
                                            ? 'one'
                                            : 'all'
                                )
                            }
                            className={playback.repeat !== 'none' ? 'text-white' : 'text-white/40'}
                        />
                    </div>

                    {/* Quality */}
                    <div className="pt-4">
                        <QualityBadge quality={quality} />
                    </div>
                </div>

                {/* Right */}
                <div className="w-1/2 flex flex-col gap-6 border-l border-white/5 pl-8">

                    {/* Up Next */}
                    {nextSong && (
                        <div
                            className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-pointer"
                            onClick={playback.next}
                        >
                            <img
                                src={getArt(nextSong)}
                                className="w-12 h-12 rounded object-cover"
                            />
                            <div>
                                <p className="text-[9px] text-white/40 uppercase">Up Next</p>
                                <p className="text-sm text-white">{nextSong.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Lyrics / Queue */}
                    {showQueue ? (
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {(playback.queue || [])
                                .slice(playback.currentIndex + 1)
                                .map((s: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                        onClick={() => {
                                            const idx = playback.currentIndex + 1 + i;
                                            playback.updateMix?.(playback.activeMixId, {
                                                currentSongIndex: idx,
                                                progress: 0
                                            });
                                        }}
                                    >
                                        <img src={getArt(s)} className="w-8 h-8 rounded" />
                                        <div>
                                            <p className="text-sm text-white">{s.name}</p>
                                            <p className="text-[10px] text-white/40">{s.primaryArtists}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin opacity-50" />
                                </div>
                            ) : (
                                <div className="py-[30vh] space-y-6 text-center">
                                    {lyrics.map((line, i) => (
                                        <motion.p
                                            key={i}
                                            data-lyric={i}
                                            className="text-xl md:text-3xl font-bold cursor-pointer"
                                            animate={{
                                                opacity: i === activeIndex ? 1 : 0.4,
                                                scale: i === activeIndex ? 1.05 : 0.98
                                            }}
                                            onClick={() => playback.seek(line.time)}
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
                        <ChevronRight className="text-white/40" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
