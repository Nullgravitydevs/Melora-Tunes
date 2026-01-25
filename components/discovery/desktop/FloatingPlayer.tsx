import React from "react";
import { motion } from "framer-motion";
import { Disc, SkipBack, SkipForward, Play, Pause, VolumeX, Volume1, Volume2, Maximize2, Heart, MoreHorizontal } from "lucide-react";
import { getArt } from "../DiscoveryShared";
import { QualityBadge } from "./QualityBadge";

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
    setActiveView: (view: any) => void;
    setLastView: (view: any) => void;
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
    if (activeView === 'now-playing') return null;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="pointer-events-auto h-20 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex items-center px-2 pr-8 gap-4 overflow-visible"
                style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
            >
                {/* Art & Info */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="w-16 h-16 rounded-full overflow-hidden relative group flex-shrink-0 border border-white/5 ml-1">
                        {currentSong && getArt(currentSong) ? (
                            <img src={getArt(currentSong)} alt={currentSong.name} className="w-full h-full object-cover animate-[spin_10s_linear_infinite]" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center"><Disc className="opacity-20" /></div>
                        )}
                        {/* Center Dot for Vinyl Look */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-black/80 backdrop-blur-sm" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate cursor-pointer hover:underline" onClick={() => setActiveView('now-playing')}>{currentSong?.name || 'Not Playing'}</p>
                            {/* Quality Badge - Use activeQuality for accurate streaming quality */}
                            {currentSong && <QualityBadge quality={activeQuality || currentTrack?.preferredQuality || '320'} />}
                        </div>
                        <p className="text-xs text-white/50 truncate hover:text-white transition-colors cursor-pointer">{currentSong?.primaryArtists || 'Select a song'}</p>
                    </div>
                </div>

                {/* Controls (Center) */}
                <div className="flex flex-col items-center justify-center gap-1 flex-1">
                    <div className="flex items-center gap-6">
                        <SkipBack size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={prev} />

                        {/* White Play Button */}
                        <motion.button
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-shadow"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause size={20} fill="black" className="text-black" /> : <Play size={20} fill="black" className="text-black ml-0.5" />}
                        </motion.button>

                        <SkipForward size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={next} />
                    </div>

                    {/* Progress Bar - Enhanced */}
                    <div className="w-72 flex items-center gap-2 group">
                        <span className="text-[9px] text-white/50 font-mono w-7 text-right">{Math.floor(progress / 60)}:{(Math.floor(progress) % 60).toString().padStart(2, '0')}</span>
                        <div
                            className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden group-hover:h-2 transition-all"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickPct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                seek(clickPct * duration);
                            }}
                        >
                            {(() => {
                                // COMPUTE ONCE
                                const pct = duration > 0 ? progress / duration : 0;
                                return (
                                    <>
                                        <div className="absolute inset-0 rounded-full bg-white origin-left transform transition-transform" style={{ transform: `scaleX(${pct})` }} />
                                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${pct * 100}% `, transform: 'translateX(-50%) translateY(-50%)' }} />
                                    </>
                                );
                            })()}
                        </div>
                        <span className="text-[9px] text-white/50 font-mono w-7">{Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}</span>
                    </div>
                </div>

                {/* Volume (Right) */}
                <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
                    <div className="flex items-center gap-2 group">
                        <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/60 hover:text-white transition-colors">
                            {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                        </button>
                        <div
                            className="w-20 h-1 bg-white/10 rounded-full cursor-pointer relative"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const vol = (e.clientX - rect.left) / rect.width;
                                setVolume(Math.max(0, Math.min(1, vol)));
                            }}
                        >
                            <div className="h-full bg-white rounded-full relative" style={{ width: `${volume * 100}% ` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </div>
                    <button onClick={() => {
                        // STRICT NOW PLAYING: Only save lastView if it is valuable/root
                        // Note: activeView is guaranteed !== 'now-playing' here due to parent conditional
                        if (['home', 'explore', 'browse', 'library', 'search'].includes(activeView)) {
                            setLastView(activeView);
                        }
                        setActiveView('now-playing');
                    }} className="p-2 ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <Maximize2 size={18} />
                    </button>
                    {currentSong && (
                        <Heart
                            size={18}
                            className={`cursor-pointer transition-all ${isLiked(currentSong.id) ? 'text-[#e91e63] fill-[#e91e63]' : 'text-white/40 hover:text-white'}`}
                            onClick={() => toggleLike(currentSong)}
                        />
                    )}
                    <MoreHorizontal size={18} className="text-white/40 hover:text-white cursor-pointer" />
                </div>
            </motion.div>
        </div>
    );
}
