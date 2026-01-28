import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Heart, Zap } from "lucide-react";
import {
    FeatureCard,
    SectionHeader,
    DiscoveryThemeColors,
    SkeletonHero,
    SkeletonCard,
    SkeletonTrackRow,
    getArt,
    TrackData,
    decodeHtml
} from "./DiscoveryShared";
import { LanguageChips } from "./desktop/LanguageChips";
import { HistoryItem } from "@/lib/history-store";

/* =========================
   UTILS
========================= */

function formatRelativeTime(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function PlaybackProgress({ position, duration }: { position: number; duration: number }) {
    if (!duration || position <= 0) return null;
    return (
        <div className="w-full h-[2px] bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
                className="h-full bg-white/60"
                style={{ width: `${Math.min((position / duration) * 100, 100)}%` }}
            />
        </div>
    );
}

/* =========================
   TYPES
========================= */

interface HomeViewProps {
    colors: DiscoveryThemeColors;
    trending: any[];
    charts: any[];
    recent: HistoryItem[];

    trendingSingles: any[];
    latestAlbums: any[];
    featuredPlaylists: any[];

    loading?: boolean;

    onPlay: (song: any, list?: any[]) => void;
    onNavigate: (view: string, data?: any) => void;
    onPlayChart: (chart: any) => void;
    onOpenPlaylist: (playlist: any) => void;
    onOpenAlbum: (album: any) => void;
    onResumeSong: (track: any, position: number) => void;

    activeLanguage: string | null;
    selectedLanguages: string[];
    onLanguageSelect: (lang: string | null) => void;
    userName?: string;
}

/* =========================
   COMPONENT
========================= */

export function HomeView({
    colors,
    trending,
    charts,
    recent,
    trendingSingles = [],
    latestAlbums = [],
    featuredPlaylists = [],
    loading,
    onPlay,
    onNavigate,
    onPlayChart,
    onOpenPlaylist,
    onOpenAlbum,
    onResumeSong,
    activeLanguage,
    selectedLanguages,
    onLanguageSelect,
    userName
}: HomeViewProps) {

    const [scrolled, setScrolled] = useState(false);
    const rafRef = useRef<number | null>(null);

    // Scroll Handler Optimization
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            setScrolled(top > 40);
            rafRef.current = null;
        });
    }, []);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Memoize Hero Logic to prevent mismatch
    const heroSong = useMemo(() => trending[0] || trendingSingles[0], [trending, trendingSingles]);

    // Ensure Hero Context always contains the Hero Song
    const heroContext = useMemo(() => {
        if (!heroSong) return [];
        // If hero is in singles, use singles context (preferred)
        if (trendingSingles.find(s => s.id === heroSong.id)) return trendingSingles;
        // Fallback to general trending
        return trending;
    }, [heroSong, trendingSingles, trending]);

    const handleHeroPlay = useCallback(() => {
        if (heroSong) onPlay(heroSong, heroContext);
    }, [heroSong, heroContext, onPlay]);

    const handleHeroArtistClick = useCallback(() => {
        const artist = heroSong?.primaryArtists?.split(",")[0]?.trim();
        if (artist) onNavigate("artist", artist);
    }, [heroSong, onNavigate]);

    /* ---------- Titles ---------- */

    const albumTitle = useMemo(() => {
        if (!activeLanguage) return "New Releases";
        return `New in ${activeLanguage[0].toUpperCase()}${activeLanguage.slice(1)}`;
    }, [activeLanguage]);

    const playlistSubtitle = useMemo(() => {
        if (!activeLanguage) return "Global Picks";
        return `${activeLanguage[0].toUpperCase()}${activeLanguage.slice(1)} Picks`;
    }, [activeLanguage]);

    const chartSubtitle = useMemo(() => {
        if (!activeLanguage) return "Today’s biggest hits";
        return `${activeLanguage[0].toUpperCase()}${activeLanguage.slice(1)} charts`;
    }, [activeLanguage]);

    // Memoize Recent List
    const recentList = useMemo(() =>
        recent.slice(0, 6).filter(r => r?.track?.song),
        [recent]);

    /* =========================
       LOADING
    ========================= */

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto pb-32">
                <SkeletonHero />
                <div className="px-6 md:px-12 -mt-12 space-y-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                    </div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => <SkeletonTrackRow key={i} />)}
                    </div>
                </div>
            </div>
        );
    }

    /* =========================
       RENDER
    ========================= */

    /* =========================
       HELPERS
    ========================= */
    const getGreeting = () => {
        const hour = new Date().getHours();
        let greeting = "Good Morning";
        if (hour >= 12 && hour < 18) greeting = "Good Afternoon";
        if (hour >= 18) greeting = "Good Evening";

        return userName ? `${greeting}, ${userName}` : greeting;
    };

    /* =========================
       RENDER
    ========================= */

    return (
        <div className="flex-1 relative w-full h-full bg-black">

            {/* AMBIENT BACKGROUND LAYER - The "Mesh" Effect */}
            {heroSong && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <motion.img
                        key={heroSong.id}
                        src={getArt(heroSong)}
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 0.25, scale: 1.8 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="w-full h-[70vh] object-cover blur-[120px] mix-blend-screen opacity-30 select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
                </div>
            )}

            {/* Sticky Header */}
            <div
                className={`sticky top-0 z-40 px-8 py-4 transition-all duration-500 ease-out flex items-center justify-between
                ${scrolled ? "bg-black/70 backdrop-blur-2xl border-b border-white/5 shadow-2xl" : "bg-transparent"}`}
            >
                <div className="flex items-baseline gap-3">
                    <span className={`text-xl font-bold tracking-tight transition-all duration-500 ${scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
                        {getGreeting()}
                    </span>
                </div>
                {/* Active user avatar or profile link could go here */}
            </div>

            {/* Scroll Container */}
            <div
                className="absolute inset-0 overflow-y-auto pb-40 scrollbar-hide z-10"
                onScroll={handleScroll}
            >

                {/* ================= HERO ================= */}
                <div className="relative min-h-[500px] flex items-end p-8 md:p-14 pb-16">

                    <div className="relative z-10 w-full max-w-7xl mx-auto flex items-end gap-10">
                        {/* Hero Art */}
                        {heroSong && (
                            <motion.div
                                key={`img-${heroSong.id}`}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "backOut" }}
                                className="hidden lg:block shrink-0 relative group"
                            >
                                <div className="w-72 h-72 rounded-lg overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 relative z-20">
                                    <img
                                        src={getArt(heroSong)}
                                        className="w-full h-full object-cover"
                                        alt={heroSong.name}
                                    />
                                    {/* Inner sheen */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                </div>
                                {/* Glow reflection */}
                                <div className="absolute -bottom-10 left-4 right-4 h-20 bg-current blur-[50px] opacity-40 z-10" style={{ color: colors.accent }} />
                            </motion.div>
                        )}

                        {/* Hero Text */}
                        {heroSong && (
                            <div className="flex-1 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <span className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/70 mb-2">
                                        <div className="w-1 h-4 bg-yellow-400 rounded-full" />
                                        {getGreeting()}
                                    </span>
                                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] text-rendering-optimizeLegibility shadow-black drop-shadow-lg">
                                        {decodeHtml(heroSong.name)}
                                    </h1>
                                </motion.div>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-xl md:text-2xl text-white/80 font-medium tracking-tight cursor-pointer hover:text-white transition-colors hover:underline decoration-white/30 underline-offset-4"
                                    onClick={handleHeroArtistClick}
                                >
                                    {heroSong.primaryArtists}
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-4 pt-2"
                                >
                                    <button
                                        onClick={handleHeroPlay}
                                        className="h-14 px-10 rounded-full bg-white text-black font-bold text-base tracking-wide flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)]"
                                    >
                                        <Play size={20} fill="currentColor" />
                                        <span className="mt-[2px]">PLAY NOW</span>
                                    </button>
                                    <button className="w-14 h-14 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all">
                                        <Heart size={22} />
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= CONTENT ================= */}
                <div className="relative z-10 bg-gradient-to-b from-transparent via-[#000000] to-black pt-10">
                    <LanguageChips
                        activeLanguage={activeLanguage}
                        selectedLanguages={selectedLanguages}
                        onSelect={onLanguageSelect}
                    />

                    <div className="px-6 md:px-12 space-y-16 mt-12 pb-32">

                        {/* Jump Back In */}
                        {recentList.length > 0 && (
                            <section>
                                <SectionHeader title="Jump Back In" subtitle="Pick up where you left off" />
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                    {recentList.map(item => {
                                        const song = item.track!.song!;
                                        return (
                                            <motion.div
                                                key={item.id}
                                                whileHover={{ y: -8, scale: 1.02 }}
                                                className="group relative cursor-pointer"
                                                onClick={() => onResumeSong(item.track, item.lastPosition || 0)}
                                            >
                                                <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-neutral-900 border border-white/5">
                                                    <img src={getArt(song)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                                            <Play size={20} fill="black" className="ml-1 text-black" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-white truncate leading-tight group-hover:text-green-400 transition-colors">{song.name}</p>
                                                    <p className="text-sm text-white/50 truncate font-medium">{song.primaryArtists}</p>
                                                </div>
                                                <div className="absolute -inset-4 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 -z-10 blur-xl transition-opacity duration-500" />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Trending Singles */}
                        {trendingSingles.length > 0 && (
                            <section>
                                <SectionHeader
                                    title="Trending Singles"
                                    subtitle="Hot right now"
                                    onSeeAll={() => onNavigate('browse')}
                                />
                                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                                    {trendingSingles.slice(0, 10).map(item => (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ y: -8 }}
                                            className="min-w-[180px] w-48 group cursor-pointer relative"
                                            onClick={() => onPlay(item, trendingSingles)}
                                        >
                                            <div className="aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/5 bg-neutral-900">
                                                <img src={getArt(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                {/* Play Button Overlay */}
                                                <div className="absolute bottom-4 right-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                    <Play size={18} fill="black" className="text-black ml-0.5" />
                                                </div>
                                            </div>
                                            <p className="font-bold text-white truncate text-base">{item.name}</p>
                                            <p className="text-sm text-white/50 truncate font-medium mt-1">{item.primaryArtists}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Latest Albums */}
                        {latestAlbums.length > 0 && (
                            <section>
                                <SectionHeader
                                    title={albumTitle}
                                    subtitle="Fresh drops"
                                    onSeeAll={() => onNavigate('browse')}
                                />
                                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                                    {latestAlbums.slice(0, 10).map(item => (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ y: -8 }}
                                            className="min-w-[180px] w-48 group cursor-pointer"
                                            onClick={() => onOpenAlbum(item)}
                                        >
                                            <div className="aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/5 bg-neutral-900">
                                                <img src={getArt(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            </div>
                                            <p className="font-bold text-white truncate text-base">{item.name}</p>
                                            <p className="text-sm text-white/50 truncate font-medium mt-1">{item.primaryArtists}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Charts */}
                        <section>
                            <SectionHeader
                                title="Chart Toppers"
                                subtitle={chartSubtitle}
                                onSeeAll={() => onNavigate('browse')}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {charts.slice(0, 4).map((chart, i) => (
                                    <FeatureCard
                                        key={chart.id || i}
                                        title={chart.title}
                                        subtitle={chart.subtitle}
                                        image={chart.image}
                                        onClick={() => onPlayChart(chart)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Featured Playlists */}
                        {featuredPlaylists.length > 0 && (
                            <section>
                                <SectionHeader
                                    title="Curated For You"
                                    subtitle={playlistSubtitle}
                                    onSeeAll={() => onNavigate('explore')}
                                />
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                                    {featuredPlaylists.slice(0, 6).map((p, i) => (
                                        <motion.div
                                            key={p.id || i}
                                            whileHover={{ y: -8 }}
                                            className="group cursor-pointer"
                                            onClick={() => onOpenPlaylist(p)}
                                        >
                                            <div className="aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/5 bg-neutral-900">
                                                <img src={getArt(p)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            </div>
                                            <p className="font-bold text-white truncate text-base">{p.name || p.title}</p>
                                            <p className="text-sm text-white/50 truncate font-medium mt-1">{p.subtitle || "Editor's Pick"}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
