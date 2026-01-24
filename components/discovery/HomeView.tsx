import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Heart, Disc, Zap, Coffee, Moon, Activity, ArrowRight } from "lucide-react";
import { FeatureCard, TrackRow, MoodPill, SectionHeader, DiscoveryThemeColors, SkeletonHero, SkeletonCard, SkeletonTrackRow } from "./DiscoveryShared";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { DiscoveryEngine } from "@/lib/discovery-engine";

// Helper for Art
function getArt(song: any) {
    if (!song) return '';
    let img = song.image || song.art;
    if (Array.isArray(img)) img = img[img.length - 1]?.link || img[0]?.link || '';
    if (typeof img === 'string') return img.replace(/150x150/g, '500x500').replace(/50x50/g, '500x500');
    return img || '';
}

interface HomeViewProps {
    colors: DiscoveryThemeColors;
    trending: any[];
    charts: any[];
    recent: any[];
    loading?: boolean;
    onPlay: (song: any, list?: any[]) => void;
    onNavigate: (view: string, data?: any) => void;
    activeRegion: string | null;
    onRegionChange: (region: string | null) => void;
    onPlayChart: (chart: any) => void;
}

export function HomeView({ colors, trending, charts, recent, loading, onPlay, onNavigate, activeRegion, onRegionChange, onPlayChart }: HomeViewProps) {
    const { playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scrolled, setScrolled] = useState(false);

    // Dynamic Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    // Region Logic
    const handleRegionSelect = async (region: string) => {
        if (activeRegion === region) {
            onRegionChange(null);
            return;
        }
        onRegionChange(region);
    };

    const REGIONS = [
        { id: 'global', label: 'Global', icon: Disc },
        { id: 'india', label: 'India', icon: Zap },
        { id: 'us', label: 'US', icon: Activity },
        { id: 'uk', label: 'UK', icon: Coffee },
        { id: 'k-pop', label: 'K-Pop', icon: Heart },
        { id: 'latin', label: 'Latin', icon: Moon },
    ];

    const heroSong = trending[0];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 50);
    };

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-32">
                <SkeletonHero />
                <div className="px-6 md:px-12 -mt-10 relative z-20 space-y-16">
                    {/* Dummy Region Pills */}
                    <div className="flex gap-4 py-6 overflow-hidden">
                        {[1, 2, 3, 4].map(i => <div key={i} className="w-24 h-8 rounded-full bg-white/5 animate-pulse" />)}
                    </div>

                    {/* Charts Skeletons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
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
                                        className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
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

                    {/* 1. Region Station (Was Moods) */}
                    <section>
                        <div className="flex items-center gap-4 py-6 overflow-x-auto [&::-webkit-scrollbar]:hidden mask-gradient-r">
                            {REGIONS.map(region => (
                                <MoodPill
                                    key={region.id}
                                    label={region.label}
                                    active={activeRegion === region.id}
                                    onClick={() => handleRegionSelect(region.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 2. Jump Back In (History) */}
                    {recent.length > 0 && (
                        <section>
                            <SectionHeader title="Jump Back In" subtitle="Pick up where you left off" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {recent.slice(0, 6).map((item, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -5 }}
                                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer group transition-colors border border-white/5"
                                        onClick={() => onPlay(item.original)}
                                    >
                                        <div className="aspect-square rounded-lg bg-neutral-900 mb-3 overflow-hidden relative shadow-lg">
                                            <img src={item.art} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <Play size={24} fill="white" className="text-white" />
                                            </div>
                                        </div>
                                        <p className="font-bold text-sm text-white truncate">{item.title}</p>
                                        <p className="text-xs text-white/50 truncate">{item.artist}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 3. Global Charts */}
                    <section>
                        <SectionHeader title="Global Charts" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {charts.map((chart, i) => (
                                <FeatureCard
                                    key={chart.id}
                                    title={chart.title}
                                    subtitle={chart.subtitle}
                                    image={chart.image}
                                    colors={colors}
                                    onClick={() => onPlayChart(chart)}
                                    type="CHART"
                                    isNew={chart.isNew}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 4. Trending List */}
                    <section className="max-w-4xl">
                        <SectionHeader title={`Trending ${activeRegion ? activeRegion.charAt(0).toUpperCase() + activeRegion.slice(1) : 'Global'}`} subtitle="Top 20 hits right now" />
                        <div className="flex flex-col gap-1">
                            {trending.slice(0, 10).map((song, i) => (
                                <TrackRow
                                    key={song.id}
                                    index={i + 1}
                                    track={{
                                        id: song.id,
                                        title: song.name,
                                        artist: song.primaryArtists,
                                        duration: song.duration ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0') : '--:--',
                                        art: getArt(song),
                                        original: song
                                    }}
                                    colors={colors}
                                    isPlaying={currentSong?.id === song.id && isPlaying}
                                    onPlay={() => onPlay(song)}
                                />
                            ))}
                        </div>
                    </section>

                    <div className="h-20" /> {/* Spacer */}
                </div>

                <style jsx>{`
                    .mask-gradient-r { mask-image: linear-gradient(to right, black 85%, transparent); }
                `}</style>
            </div>
        </div>
    );
}
