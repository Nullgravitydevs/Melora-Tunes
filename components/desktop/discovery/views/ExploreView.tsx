"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, TrendingUp, Radio, Mic2, Music, Play, ChevronRight,
    Heart, Zap, Moon, Sun, Coffee, Gamepad2, Dumbbell, Car
} from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getTopCharts, getTrending, searchSongs } from "@/lib/jiosaavn";
import { isPlayableTrack, PlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";

/* ============================================================================
   EXPLORE VIEW - Discover by Mood, Genre, Charts
   ============================================================================ */

interface ExploreViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
}

const EXPLORE_STYLES = `
    .mood-card {
        background: linear-gradient(135deg, var(--from) 0%, var(--to) 100%);
        transition: all 0.3s ease;
    }
    .mood-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 20px 40px -10px var(--from);
    }
`;

const MOODS = [
    { id: 'happy', label: 'Happy', icon: Sun, from: 'rgba(255,200,50,0.3)', to: 'rgba(255,100,50,0.2)', query: 'happy songs' },
    { id: 'sad', label: 'Sad', icon: Moon, from: 'rgba(100,100,200,0.3)', to: 'rgba(50,50,150,0.2)', query: 'sad songs' },
    { id: 'romantic', label: 'Romantic', icon: Heart, from: 'rgba(255,100,150,0.3)', to: 'rgba(200,50,100,0.2)', query: 'romantic songs' },
    { id: 'party', label: 'Party', icon: Zap, from: 'rgba(200,50,255,0.3)', to: 'rgba(100,50,200,0.2)', query: 'party songs' },
    { id: 'chill', label: 'Chill', icon: Coffee, from: 'rgba(100,200,200,0.3)', to: 'rgba(50,150,150,0.2)', query: 'chill songs' },
    { id: 'workout', label: 'Workout', icon: Dumbbell, from: 'rgba(255,100,100,0.3)', to: 'rgba(200,50,50,0.2)', query: 'workout songs' },
    { id: 'travel', label: 'Travel', icon: Car, from: 'rgba(100,200,100,0.3)', to: 'rgba(50,150,50,0.2)', query: 'travel songs' },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2, from: 'rgba(150,50,255,0.3)', to: 'rgba(100,0,200,0.2)', query: 'gaming music' },
];

export function ExploreView({ onNavigate }: ExploreViewProps) {
    const { playInstantMix, qualityPreference, showToast } = usePlayback();
    const [charts, setCharts] = useState<any[]>([]);
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExploreData();
    }, []);

    const loadExploreData = async () => {
        try {
            const [chartsData, trendingData] = await Promise.all([
                getTopCharts().catch(() => []),
                getTrending().catch(() => [])
            ]);
            setCharts(chartsData?.slice(0, 6) || []);
            setTrending(trendingData?.slice(0, 8) || []);
        } catch (e) {
            console.error('Failed to load explore data:', e);
        } finally {
            setLoading(false);
        }
    };

    const playMood = async (mood: typeof MOODS[0]) => {
        showToast(`Loading ${mood.label} vibes...`, 'info');
        try {
            const songs = await searchSongs(mood.query, 1, 20);
            if (songs && songs.length > 0) {
                const tracks = songs.slice(0, 20).map((s: any) =>
                    ensurePlayableTrack(s, qualityPreference as AudioQuality)
                );
                const mix: Mix = {
                    id: `mood-${mood.id}-${Date.now()}`,
                    title: `${mood.label} Mix`,
                    color: 'purple',
                    songs: tracks,
                    currentSongIndex: 0
                };
                playInstantMix(mix);
            }
        } catch (e) {
            showToast('Failed to load mood mix', 'error');
        }
    };

    const getArt = (item: any) => {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) {
            return item.image.find((i: any) => i.quality === '150x150')?.link || item.image[0]?.link || '';
        }
        return '';
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: EXPLORE_STYLES }} />

            <div className="min-h-full p-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Sparkles className="text-white/40" />
                        Explore
                    </h1>
                    <p className="text-white/40">Discover music by mood, genre & more</p>
                </motion.div>

                {/* Moods Grid */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Music size={18} className="text-white/40" />
                        Browse by Mood
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MOODS.map((mood, i) => (
                            <motion.button
                                key={mood.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => playMood(mood)}
                                className="mood-card p-6 rounded-2xl text-left"
                                style={{
                                    '--from': mood.from,
                                    '--to': mood.to
                                } as React.CSSProperties}
                            >
                                <mood.icon size={28} className="text-white/80 mb-3" />
                                <p className="font-semibold">{mood.label}</p>
                            </motion.button>
                        ))}
                    </div>
                </section>

                {/* Charts */}
                {charts.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-white/40" />
                            Top Charts
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {charts.map((chart, i) => (
                                <motion.div
                                    key={chart.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => onNavigate({ id: 'album', data: chart })}
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden bg-white/5 mb-2 relative">
                                        {getArt(chart) ? (
                                            <img src={getArt(chart)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Radio size={32} className="text-white/20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                                                <Play size={20} className="text-black ml-0.5" fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium truncate">{chart.title || chart.name}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Trending */}
                {trending.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Mic2 size={18} className="text-white/40" />
                            Trending Now
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {trending.map((song, i) => (
                                <motion.div
                                    key={song.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => {
                                        const tracks = trending.map((s: any) =>
                                            ensurePlayableTrack(s, qualityPreference as AudioQuality)
                                        );
                                        playInstantMix({
                                            id: `trending-${Date.now()}`,
                                            title: 'Trending',
                                            color: 'orange',
                                            songs: tracks,
                                            currentSongIndex: i
                                        });
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer group"
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                                        {getArt(song) ? (
                                            <img src={getArt(song)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Music size={16} className="text-white/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{song.name}</p>
                                        <p className="text-xs text-white/40 truncate">{song.primaryArtists}</p>
                                    </div>
                                    <Play size={14} className="text-white/30 opacity-0 group-hover:opacity-100" fill="currentColor" />
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </>
    );
}
