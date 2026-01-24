import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Heart, Disc, Zap, Clock, Music, ListMusic, TrendingUp, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { FeatureCard, TrackRow, SectionHeader, DiscoveryThemeColors, SkeletonHero, SkeletonCard, SkeletonTrackRow } from "./DiscoveryShared";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { HistoryItem } from "@/lib/history-store";

// Helper for Art
function getArt(song: any) {
    if (!song) return '';
    let img = song.image || song.art;
    if (Array.isArray(img)) img = img[img.length - 1]?.link || img[0]?.link || '';
    if (typeof img === 'string') return img.replace(/150x150/g, '500x500').replace(/50x50/g, '500x500');
    return img || '';
}

// Relative time formatter
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Progress bar for resume
function PlaybackProgress({ position, duration }: { position: number; duration: number }) {
    const percent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
    if (percent === 0) return null;
    return (
        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
    );
}

// Type badge component
function TypeBadge({ type }: { type: 'Album' | 'Playlist' | 'Single' }) {
    const colors: Record<string, string> = {
        Album: 'bg-blue-500/20 text-blue-400',
        Playlist: 'bg-green-500/20 text-green-400',
        Single: 'bg-orange-500/20 text-orange-400'
    };
    return (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[type]}`}>
            {type}
        </span>
    );
}

interface HomeViewProps {
    colors: DiscoveryThemeColors;
    trending: any[];
    charts: any[];
    recent: HistoryItem[]; // Now HistoryItem with lastPosition
    newAndTrending?: any[]; // Mixed content
    editorialPicks?: any[]; // Curated playlists
    loading?: boolean;
    onPlay: (song: any, list?: any[]) => void;
    onNavigate: (view: string, data?: any) => void;
    onPlayChart: (chart: any) => void;
    onOpenPlaylist: (playlist: any) => void;
    onOpenAlbum: (album: any) => void;
    onResumeSong: (song: any, position: number) => void;
}

export function HomeView({
    colors,
    trending,
    charts,
    recent,
    newAndTrending = [],
    editorialPicks = [],
    loading,
    onPlay,
    onNavigate,
    onPlayChart,
    onOpenPlaylist,
    onOpenAlbum,
    onResumeSong
}: HomeViewProps) {
    const { playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scrolled, setScrolled] = useState(false);

    // Dynamic Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    // Chart Toppers: Use actual chart data from API, fallback to defaults
    const defaultCharts = [
        { id: 'india-top-50', title: 'India Top 50', subtitle: 'Updated daily', color: 'from-orange-600 to-orange-900' },
        { id: 'global-top-50', title: 'Global Top 50', subtitle: 'Updated daily', color: 'from-blue-600 to-blue-900' },
        { id: 'viral-hits', title: 'Viral Hits', subtitle: 'Trending virally', color: 'from-pink-600 to-pink-900' },
        { id: 'trending-now', title: 'Trending Now', subtitle: "What's hot", color: 'from-purple-600 to-purple-900' }
    ];

    // Use passed charts if available, pad with defaults if less than 4
    const chartToppers = charts.length > 0
        ? charts.slice(0, 4).map((c, i) => ({
            ...c,
            subtitle: c.subtitle || defaultCharts[i]?.subtitle || 'Updated daily',
            color: defaultCharts[i]?.color || 'from-gray-600 to-gray-900'
        }))
        : defaultCharts;

    const heroSong = trending[0];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 50);
    };

    // Jump Back In card click
    const handleRecentClick = (item: HistoryItem) => {
        if (item.itemType === 'album') {
            onOpenAlbum(item.track.song);
        } else if (item.itemType === 'playlist') {
            onOpenPlaylist(item.track.song);
        } else {
            // Song: resume from position
            onResumeSong(item.track, item.lastPosition || 0);
        }
    };

    // New & Trending card click
    const handleNewTrendingClick = (item: any) => {
        if (item.type === 'album') {
            onOpenAlbum(item);
        } else if (item.type === 'playlist') {
            onOpenPlaylist(item);
        } else {
            onPlay(item); // Single: play immediately
        }
    };

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-32">
                <SkeletonHero />
                <div className="px-6 md:px-12 -mt-10 relative z-20 space-y-16">
                    {/* Charts Skeletons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                    </div>

                    {/* Track Skeletons */}
                    <div className="max-w-4xl space-y-4">
                        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-6" />
                        <div className="flex flex-col gap-1">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonTrackRow key={i} />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full relative">
            {/* Sticky Glass Header */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 px-8 py-4 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
            >
                <div className={`flex items-center gap-2 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                    <Zap size={16} className="text-white" />
                    <span className="font-bold text-white tracking-wide">Home</span>
                </div>
            </div>

            <div
                className="absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-32"
                onScroll={handleScroll}
            >
                {/* === CINEMATIC HERO === */}
                <div className="relative w-full h-[50vh] min-h-[400px] overflow-hidden group">
                    <div className="absolute inset-0 bg-black" />

                    {/* 1. Video Background (Subtle) */}
                    <video
                        ref={videoRef}
                        src="/assets/intro.mp4"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-[2s]"
                        loop muted playsInline autoPlay
                    />

                    {/* 2. Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-black/60" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

                    {/* 3. Hero Content */}
                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex items-end gap-12 z-10">

                        {/* Art (Vinyl Style) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="hidden md:block w-52 h-52 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden group-hover:rotate-1 transition-transform duration-700"
                        >
                            {heroSong ? <img src={getArt(heroSong)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-neutral-900" />}
                            {/* Shine */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
                        </motion.div>

                        {/* Text */}
                        <div className="flex-1 max-w-2xl">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white mb-4">
                                    <Zap size={12} className="text-yellow-400" fill="currentColor" />
                                    Trending Now
                                </span>
                                <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-2xl">
                                    {heroSong?.name || (loading ? "Loading..." : "Premium Discovery")}
                                </h1>
                                <p className="text-lg text-white/70 font-medium mb-8 line-clamp-2 max-w-lg">
                                    {heroSong ? `${heroSong.primaryArtists} • Highest Fidelity` : "Connect to the Pulse of Music."}
                                </p>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => heroSong && onPlay(heroSong)}
                                        disabled={!heroSong}
                                        className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Play size={20} fill="black" /> Play Now
                                    </button>
                                    <button className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 backdrop-blur-md transition-colors">
                                        <Heart size={22} />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* === MAIN CONTENT === */}
                <div className="px-6 md:px-12 -mt-10 relative z-20 space-y-16">

                    {/* Section 1: Jump Back In */}
                    {recent.length > 0 && (
                        <section>
                            <SectionHeader title="Jump Back In" subtitle="Pick up where you left off" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {recent.slice(0, 6).map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -5 }}
                                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer group transition-colors border border-white/5"
                                        onClick={() => handleRecentClick(item)}
                                    >
                                        <div className="aspect-square rounded-lg bg-neutral-900 mb-3 overflow-hidden relative shadow-lg">
                                            <img src={getArt(item.track.song)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <Play size={24} fill="white" className="text-white" />
                                            </div>
                                        </div>
                                        <p className="font-bold text-sm text-white truncate">{item.track.song.name}</p>
                                        <p className="text-xs text-white/50 truncate">{item.track.song.primaryArtists}</p>
                                        {/* Progress & Timestamp */}
                                        <PlaybackProgress position={item.lastPosition || 0} duration={item.track.song.duration || 0} />
                                        <p className="text-[10px] text-white/30 mt-1">{formatRelativeTime(item.playedAt)}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 2: New & Trending (Mixed content) */}
                    {newAndTrending.length > 0 && (
                        <section>
                            <SectionHeader title="New & Trending" subtitle="Fresh releases and viral hits" />
                            <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                                {newAndTrending.slice(0, 10).map((item, i) => (
                                    <motion.div
                                        key={item.id || i}
                                        whileHover={{ y: -5 }}
                                        className="flex-shrink-0 w-48 bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer group transition-colors border border-white/5"
                                        onClick={() => handleNewTrendingClick(item)}
                                    >
                                        <div className="aspect-square rounded-lg bg-neutral-900 mb-3 overflow-hidden relative shadow-lg">
                                            <img src={getArt(item)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <Play size={24} fill="white" className="text-white" />
                                            </div>
                                            {/* Type Badge */}
                                            <div className="absolute top-2 left-2">
                                                <TypeBadge type={item.type === 'album' ? 'Album' : item.type === 'playlist' ? 'Playlist' : 'Single'} />
                                            </div>
                                        </div>
                                        <p className="font-bold text-sm text-white truncate">{item.name}</p>
                                        <p className="text-xs text-white/50 truncate">{item.primaryArtists || item.subtitle || ''}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 3: Chart Toppers */}
                    <section>
                        <SectionHeader title="Chart Toppers" subtitle="Today's biggest hits" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {chartToppers.slice(0, 4).map((chart, i) => (
                                <FeatureCard
                                    key={chart.id}
                                    title={chart.title}
                                    subtitle={chart.subtitle || 'Updated daily'}
                                    image={chart.image}
                                    colors={colors}
                                    onClick={() => onPlayChart(chart)}
                                    type="CHART"
                                    isNew={false}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Section 4: Editorial Picks */}
                    {editorialPicks.length > 0 && (
                        <section>
                            <SectionHeader title="Editorial Picks" subtitle="Curated by our team" />
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {editorialPicks.slice(0, 6).map((playlist, i) => (
                                    <motion.div
                                        key={playlist.id || i}
                                        whileHover={{ y: -5 }}
                                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer group transition-colors border border-white/5"
                                        onClick={() => onOpenPlaylist(playlist)}
                                    >
                                        <div className="aspect-square rounded-lg bg-neutral-900 mb-3 overflow-hidden relative shadow-lg">
                                            <img src={getArt(playlist)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <ListMusic size={24} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="font-bold text-sm text-white truncate">{playlist.name || playlist.title}</p>
                                        <p className="text-xs text-white/50 truncate">{playlist.subtitle || 'Curated playlist'}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="h-20" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
}
