import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Disc,
    SkipBack,
    SkipForward,
    Play,
    Pause,
    VolumeX,
    Volume1,
    Volume2,
    Maximize2,
    Heart,
    MoreHorizontal
} from "lucide-react";
import { getArt } from "../DiscoveryShared";
import { QualityBadge } from "./QualityBadge";

type RootView = 'home' | 'search' | 'explore' | 'browse' | 'library';

interface FloatingPlayerProps {
    currentSong: any;
    isPlaying: boolean;
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    progress: number;
    duration: number;
    seek: (time: number) => void;
    volume: number;
    setVolume: (v: number) => void;
    activeQuality: string | null | undefined;
    currentTrack: any;
    activeView: string;
    setActiveView: (view: string) => void;
    setLastView: (view: RootView) => void;
    toggleLike: (song: any) => void;
    isLiked: (id: string) => boolean;
}

export function FloatingPlayer({
    currentSong,
    isPlaying,
    togglePlay,
    next,
    prev,
    progress,
    duration,
    seek,
    volume,
    setVolume,
    activeQuality,
    currentTrack,
    activeView,
    setActiveView,
    setLastView,
    toggleLike,
    isLiked
}: FloatingPlayerProps) {
    if (!currentSong || activeView === 'now-playing') return null;

    const art = useMemo(() => getArt(currentSong), [currentSong]);

    const progressPct = useMemo(
        () => (duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0),
        [progress, duration]
    );

    const handleSeek = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            seek(pct * duration);
        },
        [seek, duration]
    );

    const handleVolume = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const vol = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setVolume(vol);
        },
        [setVolume]
    );

    const openNowPlaying = useCallback(() => {
        if (['home', 'explore', 'browse', 'library', 'search'].includes(activeView)) {
            setLastView(activeView as RootView);
        }
        setActiveView('now-playing');
    }, [activeView, setLastView, setActiveView]);

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="pointer-events-auto h-20 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex items-center px-2 pr-8 gap-4"
            >
                {/* Art & Info */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="w-16 h-16 rounded-full overflow-hidden relative flex-shrink-0 border border-white/5 ml-1">
                        {art ? (
                            <img
                                src={art}
                                alt={currentSong.name}
                                className="w-full h-full object-cover animate-[spin_10s_linear_infinite]"
                                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <Disc className="opacity-20 text-white" />
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-black/80" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p
                                className="text-sm font-bold text-white truncate cursor-pointer hover:underline"
                                onClick={openNowPlaying}
                            >
                                {currentSong.name}
                            </p>
                            <QualityBadge
                                quality={activeQuality || currentTrack?.preferredQuality || '320'}
                            />
                        </div>
                        <p className="text-xs text-white/50 truncate">
                            {currentSong.primaryArtists}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center gap-6">
                        <SkipBack
                            size={20}
                            className="text-white/70 hover:text-white cursor-pointer"
                            onClick={prev}
                        />

                        <motion.button
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={togglePlay}
                        >
                            {isPlaying
                                ? <Pause size={20} fill="black" />
                                : <Play size={20} fill="black" className="ml-0.5" />}
                        </motion.button>

                        <SkipForward
                            size={20}
                            className="text-white/70 hover:text-white cursor-pointer"
                            onClick={next}
                        />
                    </div>

                    {/* Progress */}
                    <div className="w-72 flex items-center gap-2">
                        <span className="text-[9px] text-white/50 font-mono w-7 text-right">
                            {Math.floor(progress / 60)}:{(Math.floor(progress) % 60).toString().padStart(2, '0')}
                        </span>

                        <div
                            className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden"
                            onClick={handleSeek}
                        >
                            <div
                                className="absolute inset-0 bg-white origin-left"
                                style={{ transform: `scaleX(${progressPct})` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"
                                style={{ left: `${progressPct * 100}%`, transform: 'translate(-50%, -50%)' }}
                            />
                        </div>

                        <span className="text-[9px] text-white/50 font-mono w-7">
                            {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Right */}
                <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setVolume(volume === 0 ? 1 : 0)}
                            className="text-white/60 hover:text-white"
                        >
                            {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                        </button>

                        <div
                            className="w-20 h-1 bg-white/10 rounded-full cursor-pointer"
                            onClick={handleVolume}
                        >
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${volume * 100}%` }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={openNowPlaying}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                    >
                        <Maximize2 size={18} />
                    </button>

                    <Heart
                        size={18}
                        className={`cursor-pointer transition-colors ${isLiked(currentSong.id)
                                ? 'text-[#e91e63] fill-[#e91e63]'
                                : 'text-white/40 hover:text-white'
                            }`}
                        onClick={() => toggleLike(currentSong)}
                    />

                    <MoreHorizontal size={18} className="text-white/40 hover:text-white cursor-pointer" />
                </div>
            </motion.div>
        </div>
    );
}
