import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Heart, Zap } from "lucide-react";
import {
    FeatureCard,
    SectionHeader,
    DiscoveryThemeColors,
    SkeletonHero,
    SkeletonCard,
    SkeletonTrackRow,
    getArt
} from "./DiscoveryShared";
import { LanguageChips } from "./desktop/LanguageChips";
import { HistoryItem } from "@/lib/history-store";

/* -------------------------------- Utils -------------------------------- */

function formatRelativeTime(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function PlaybackProgress({ position, duration }: { position: number; duration: number }) {
    if (!duration || !position) return null;
    return (
        <div className="w-full h-[2px] bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
                className="h-full bg-white/60"
                style={{ width: `${Math.min((position / duration) * 100, 100)}%` }}
            />
        </div>
    );
}

/* -------------------------------- Types -------------------------------- */

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
}

/* ------------------------------ Component ------------------------------- */

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
    onLanguageSelect
}: HomeViewProps) {
    const [scrolled, setScrolled] = useState(false);
    const scrollRAF = useRef<number | null>(null);

    const heroSong = trending[0] || trendingSingles[0];

    /* ---------------------------- Memoized text ---------------------------- */

    const albumTitle = useMemo(() => {
        if (!activeLanguage) return "New Releases";
        return `New in ${activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)}`;
    }, [activeLanguage]);

    const playlistSubtitle = useMemo(() => {
        if (!activeLanguage) return "Global Picks";
        return `${activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)} Picks`;
    }, [activeLanguage]);

    const chartSubtitle = useMemo(() => {
        if (!activeLanguage) return "Today’s biggest hits";
        return `${activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)} charts`;
    }, [activeLanguage]);

    /* ------------------------------ Loading ------------------------------- */

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

    /* ------------------------------- Render ------------------------------- */

    return (
        <div className="flex-1 relative">

            {/* Sticky Header */}
            <div
                className={`sticky top-0 z-40 px-8 py-4 transition-all ${scrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
                    }`}
            >
                <span
                    className={`text-sm font-bold transition-opacity ${scrolled ? "opacity-100" : "opacity-0"
                        }`}
                >
                    Home
                </span>
            </div>

            {/* Scroll Container */}
            <div
                className="absolute inset-0 overflow-y-auto pb-32"
                onScroll={(e) => {
                    const top = e.currentTarget.scrollTop;
                    if (scrollRAF.current) return;
                    scrollRAF.current = requestAnimationFrame(() => {
                        setScrolled(top > 40);
                        scrollRAF.current = null;
                    });
                }}
            >
                {/* ------------------------------- HERO ------------------------------- */}
                <div className="relative h-[48vh] min-h-[420px] overflow-hidden">
                    <div className="absolute inset-0 bg-black" />

                    {heroSong && (
                        <img
                            src={getArt(heroSong)}
                            className="absolute inset-0 w-full h-full object-cover blur-[90px] opacity-60 scale-110"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30" />
                    <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex items-end relative z-10">
                        {heroSong && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-2xl"
                            >
                                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/60 mb-4">
                                    <Zap size={12} /> Trending Now
                                </span>

                                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
                                    {heroSong.name}
                                </h1>

                                <p
                                    className="text-lg text-white/60 mb-8 hover:text-white cursor-pointer transition-colors"
                                    onClick={() =>
                                        heroSong.primaryArtists &&
                                        onNavigate(
                                            "artist",
                                            heroSong.primaryArtists.split(",")[0].trim()
                                        )
                                    }
                                >
                                    {heroSong.primaryArtists}
                                </p>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() =>
                                            onPlay(
                                                heroSong,
                                                trendingSingles.length ? trendingSingles : trending
                                            )
                                        }
                                        className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform flex items-center gap-3"
                                    >
                                        <Play size={18} fill="black" /> Play
                                    </button>

                                    <button
                                        className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10"
                                        aria-label="Like"
                                    >
                                        <Heart size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ------------------------------ CONTENT ------------------------------ */}
                <div className="relative z-20">
                    <LanguageChips
                        activeLanguage={activeLanguage}
                        selectedLanguages={selectedLanguages}
                        onSelect={onLanguageSelect}
                    />

                    <div className="px-6 md:px-12 space-y-20">

                        {/* Jump Back In */}
                        {recent.length > 0 && (
                            <section>
                                <SectionHeader title="Jump Back In" subtitle="Recently played" />
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {recent
                                        .slice(0, 6)
                                        .filter(r => r?.track?.song)
                                        .map(item => {
                                            const song = item.track!.song!;
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    whileHover={{ y: -4 }}
                                                    className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer border border-white/10"
                                                    onClick={() =>
                                                        onResumeSong(item.track, item.lastPosition || 0)
                                                    }
                                                >
                                                    <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900">
                                                        <img
                                                            src={getArt(song)}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) =>
                                                                (e.currentTarget.style.display = "none")
                                                            }
                                                        />
                                                    </div>
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {song.name}
                                                    </p>
                                                    <p className="text-xs text-white/40 truncate">
                                                        {song.primaryArtists}
                                                    </p>
                                                    <PlaybackProgress
                                                        position={item.lastPosition || 0}
                                                        duration={song.duration || 0}
                                                    />
                                                    <p className="text-[10px] text-white/30 mt-1">
                                                        {formatRelativeTime(item.playedAt)}
                                                    </p>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </section>
                        )}

                        {/* Trending Singles */}
                        {trendingSingles.length > 0 && (
                            <section>
                                <SectionHeader title="Trending Singles" subtitle="Hot right now" />
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {trendingSingles.slice(0, 10).map(item => (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ y: -4 }}
                                            className="w-44 flex-shrink-0 bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer"
                                            onClick={() => onPlay(item, trendingSingles)}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900">
                                                <img
                                                    src={getArt(item)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) =>
                                                        (e.currentTarget.style.display = "none")
                                                    }
                                                />
                                            </div>
                                            <p className="text-sm font-semibold text-white truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-white/40 truncate">
                                                {item.primaryArtists}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Latest Albums */}
                        {latestAlbums.length > 0 && (
                            <section>
                                <SectionHeader title={albumTitle} subtitle="Latest albums" />
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {latestAlbums.slice(0, 10).map(item => (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ y: -4 }}
                                            className="w-44 flex-shrink-0 bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer"
                                            onClick={() => onOpenAlbum(item)}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900">
                                                <img
                                                    src={getArt(item)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) =>
                                                        (e.currentTarget.style.display = "none")
                                                    }
                                                />
                                            </div>
                                            <p className="text-sm font-semibold text-white truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-white/40 truncate">
                                                {item.primaryArtists}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Charts */}
                        <section>
                            <SectionHeader title="Chart Toppers" subtitle={chartSubtitle} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {charts.slice(0, 4).map(chart => (
                                    <FeatureCard
                                        key={chart.id}
                                        title={chart.title}
                                        subtitle={chart.subtitle}
                                        image={chart.image}
                                        colors={colors}
                                        onClick={() => onPlayChart(chart)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Featured Playlists */}
                        {featuredPlaylists.length > 0 && (
                            <section>
                                <SectionHeader
                                    title="Featured Playlists"
                                    subtitle={playlistSubtitle}
                                />
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {featuredPlaylists.slice(0, 6).map(p => (
                                        <motion.div
                                            key={p.id}
                                            whileHover={{ y: -4 }}
                                            className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer border border-white/10"
                                            onClick={() => onOpenPlaylist(p)}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900">
                                                <img
                                                    src={getArt(p)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) =>
                                                        (e.currentTarget.style.display = "none")
                                                    }
                                                />
                                            </div>
                                            <p className="text-sm font-semibold text-white truncate">
                                                {p.name || p.title}
                                            </p>
                                            <p className="text-xs text-white/40 truncate">
                                                {p.subtitle || playlistSubtitle}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="h-24" />
                    </div>
                </div>
            </div>
        </div>
    );
}
