"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, ChevronLeft, Shuffle, Clock } from "lucide-react";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchSongs } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";

interface ChartDetailScreenProps {
    chartId: string;
    chartTitle: string;
    chartImage?: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onPlay: (song: any, list?: any[]) => void;
}

// Skeleton Row
function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 p-3 animate-pulse">
            <div className="w-8 h-4 bg-white/10 rounded" />
            <div className="w-12 h-12 bg-white/10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-white/10 rounded" />
                <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
        </div>
    );
}

export function ChartDetailScreen({ chartId, chartTitle, chartImage, colors, onBack, onPlay }: ChartDetailScreenProps) {
    const { playInstantMix, currentSong, isPlaying } = usePlayback();
    const [songs, setSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isShuffled, setIsShuffled] = useState(false);

    useEffect(() => {
        const fetchChart = async () => {
            setLoading(true);
            try {
                // Fetch chart songs using search (could be replaced with dedicated API)
                const results = await searchSongs(chartTitle, 1, 50);
                setSongs(results);
            } catch (e) {
                console.error("Failed to load chart:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchChart();
    }, [chartId, chartTitle]);

    const buildChartMix = (startIndex = 0, shuffled = false) => {
        const baseSongs = shuffled
            ? [...songs].sort(() => Math.random() - 0.5)
            : songs;

        return {
            id: `chart-${chartId}-${Date.now()}`, // MUST be unique per session
            title: chartTitle,
            color: 'blue',
            songs: baseSongs.map(s => ensurePlayableTrack(s)),
            currentSongIndex: startIndex
        } as Mix;
    };

    const handlePlayAll = () => {
        if (songs.length === 0) return;
        setIsShuffled(false);
        playInstantMix(buildChartMix(0));
    };

    const handleShuffle = () => {
        if (songs.length === 0) return;
        setIsShuffled(true);
        playInstantMix(buildChartMix(0, true));
    };

    const handleSongClick = (_song: any, index: number) => {
        playInstantMix(buildChartMix(index, isShuffled));
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
            {/* Header */}
            <div
                className="relative w-full h-[40vh] min-h-[280px] flex items-end p-8 md:p-12 overflow-hidden"
                style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.4), #000), url(${chartImage || ''}) center/cover`
                }}
            >
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-8 left-8 flex items-center gap-2 text-white/90 hover:text-white font-bold text-xs uppercase tracking-widest bg-black/30 px-4 py-2 rounded-full backdrop-blur-md transition-colors z-20"
                >
                    <ChevronLeft size={16} /> Back
                </button>

                {/* Chart Info */}
                <div className="relative z-10 w-full max-w-4xl flex items-end gap-8">
                    {/* Cover */}
                    <div className="hidden md:block w-48 h-48 rounded-xl shadow-2xl overflow-hidden bg-neutral-900 flex-shrink-0">
                        {chartImage ? (
                            <img src={chartImage} className="w-full h-full object-cover" alt={chartTitle} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">📊</div>
                        )}
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">Chart</span>
                        <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight leading-none">
                            {chartTitle}
                        </h1>
                        <p className="text-white/60 text-sm mb-6">
                            {songs.length} songs • Updated recently
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePlayAll}
                                disabled={loading || songs.length === 0}
                                className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play size={20} fill="black" /> Play All
                            </button>
                            <button
                                onClick={handleShuffle}
                                disabled={loading || songs.length === 0}
                                className={`w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors disabled:opacity-50 ${isShuffled
                                    ? 'border-white bg-white/10 text-white'
                                    : 'border-white/20 text-white hover:bg-white/10'
                                    }`}
                            >
                                <Shuffle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Song List */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 [&::-webkit-scrollbar]:hidden">
                <div className="max-w-4xl" style={{ contain: 'layout paint' }}>
                    {/* Header Row */}
                    <div className="flex items-center gap-4 px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4">
                        <span className="w-8 text-center">#</span>
                        <span className="flex-1">Title</span>
                        <Clock size={14} />
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="space-y-2">
                            {[...Array(10)].map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                    )}

                    {/* Songs */}
                    {!loading && songs.map((song, i) => (
                        <TrackRow
                            key={song.id}
                            index={i + 1}
                            track={{
                                id: song.id,
                                title: song.name,
                                artist: song.primaryArtists,
                                duration: song.duration
                                    ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0')
                                    : '--:--',
                                art: getArt(song),
                                original: song
                            }}
                            colors={colors}
                            isPlaying={currentSong?.id === song.id && isPlaying}
                            onPlay={() => handleSongClick(song, i)}
                        />
                    ))}

                    {/* Empty State */}
                    {!loading && songs.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <p className="text-xl font-bold mb-2">No songs found</p>
                            <p className="text-sm">Try again later.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
