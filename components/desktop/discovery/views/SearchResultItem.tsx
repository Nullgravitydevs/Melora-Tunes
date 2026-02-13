"use strict";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music, Download } from "lucide-react";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { JioSaavnSong } from "@/lib/jiosaavn";

interface SearchResultItemProps {
    track: PlayableTrack;
    index: number;
    isCurrentPlaying: boolean;
    isPlaying: boolean;
    activeQuality: AudioQuality | undefined; // Only needed if current playing
    onClick: () => void;
}

export const SearchResultItem = memo(({ track, index, isCurrentPlaying, isPlaying, activeQuality, onClick }: SearchResultItemProps) => {

    const getQualityClass = (quality: AudioQuality) => {
        switch (quality) {
            case 'hires': return 'quality-hires';
            case 'flac': return 'quality-flac';
            case '320': return 'quality-320';
            case '160': return 'quality-160';
            default: return 'quality-96';
        }
    };

    const getQualityLabel = (quality: AudioQuality) => {
        switch (quality) {
            case 'hires': return 'Hi-Res';
            case 'flac': return 'FLAC';
            case '320': return '320';
            case '160': return '160';
            default: return '96';
        }
    };

    const formatDuration = (d: number | string | undefined) => {
        const dur = typeof d === 'string' ? parseInt(d) : d;
        if (!dur || isNaN(dur)) return '';
        return `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`;
    };

    // Derived state
    const hasFLAC = track.sources.some(s => s.quality === 'flac' || s.quality === 'hires');
    const displayQuality = isCurrentPlaying && activeQuality ? activeQuality : track.preferredQuality;

    return (
        <>

            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * (index % 10) }} // Only stagger first few
                onClick={onClick}
                className="glass-result flex items-center gap-4 p-3 rounded-xl cursor-pointer group mb-2"
            >
                {/* CD Art with Vinyl Effect - ANIMATION ONLY WHEN PLAYING */}
                <div className="relative w-14 h-14 flex-shrink-0">
                    {/* Vinyl Ring */}
                    <div
                        className={`absolute inset-0 rounded-full ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                        style={{
                            background: 'conic-gradient(from 0deg, #1e1e1e 0%, #323232 25%, #1e1e1e 50%, #323232 75%, #1e1e1e 100%)',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div className="absolute inset-2 rounded-full border border-white/5 vinyl-groove" />
                    </div>

                    {/* Album Art (Center Label) */}
                    <div
                        className={`absolute inset-2.5 rounded-full overflow-hidden ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                    >
                        {track.art ? (
                            <img src={track.art} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                <Music size={12} className="text-white/30" />
                            </div>
                        )}
                    </div>

                    {/* Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black border border-white/10" />

                    {/* Play Overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                        <div
                            className={`w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-all ${isCurrentPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}
                        >
                            {isCurrentPlaying && isPlaying ? (
                                <Pause size={14} fill="currentColor" />
                            ) : (
                                <Play size={14} fill="currentColor" className="ml-0.5" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Track Metadata */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium truncate text-sm ${isCurrentPlaying ? 'text-white' : 'text-white/90'}`}>
                            {track.title}
                        </p>

                        {/* Quality Badge */}
                        <span className={`quality-badge ${getQualityClass(displayQuality)} flex-shrink-0`}>
                            {displayQuality === 'hires' ? 'HI-RES' : displayQuality.toUpperCase()}
                        </span>
                    </div>

                    <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
                </div>

                {/* Album */}
                <p className="text-xs text-white/30 truncate max-w-[120px] hidden md:block">
                    {track.song?.album?.name}
                </p>

                {/* Duration */}
                <div className="text-right flex-shrink-0 min-w-[40px]">
                    <span className="text-xs text-white/30 tabular-nums">
                        {formatDuration(track.duration)}
                    </span>
                </div>
            </motion.div>
        </>
    );
});

SearchResultItem.displayName = 'SearchResultItem';
