import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Heart, Disc, Zap, ListMusic } from "lucide-react";
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

// --- Relative time formatter
function formatRelativeTime(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// --- Resume progress
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

interface HomeViewProps {
    colors: DiscoveryThemeColors;
    trending: any[];
    charts: any[];
    recent: HistoryItem[];
    // Renamed Props
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
    onPlayChart,
    onOpenPlaylist,
    onOpenAlbum,
    onResumeSong,
    activeLanguage,
    selectedLanguages,
    onLanguageSelect
}: HomeViewProps) {
    const [scrolled, setScrolled] = useState(false);
    const scrollRef = useRef(false);
    // POLISH 1: Hero Fallback
    const heroSong = trending[0] || trendingSingles[0];

    // FIX 5 & 6: Dynamic Titles
    const albumTitle = activeLanguage
        ? `New in ${activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)}`
        : 'New Releases';

    const playlistSubtitle = activeLanguage
        ? `${activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)} Picks`
        : 'Global Picks';

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

    return (
        <div className="flex-1 relative">

            {/* Sticky Header */}
            <div
                className={`sticky top-0 z-40 px-8 py-4 transition-all ${scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
                    }`}
            >
                <span className={`text-sm font-bold transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                    Home
                </span>
            </div>

            <div
                className="absolute inset-0 overflow-y-auto pb-32"
                onScroll={(e) => {
                    // FIX 7: Performant Scroll (Fixed for async access)
                    const scrollTop = e.currentTarget.scrollTop;
                    if (scrollRef.current) return;
                    scrollRef.current = true;
                    requestAnimationFrame(() => {
                        setScrolled(scrollTop > 40);
                        scrollRef.current = false;
                    });
                }}
            >

                {/* HERO */}
                <div className="relative h-[48vh] min-h-[420px] overflow-hidden">
                    <div className="absolute inset-0 bg-black" />
                    {heroSong && (
                        <img
                            src={getArt(heroSong)}
                            className="absolute inset-0 w-full h-full object-cover blur-[90px] opacity-60 scale-110"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                    {/* Cinematic Top Spotlight */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30 pointer-events-none" />

                    {/* FIX 1: Hard Grounding Gradient (Anchors the huge image) */}
                    <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex items-end gap-12 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl"
                        >
                            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/60 mb-4">
                                <Zap size={12} /> Trending Now
                            </span>

                            {/* FIX 2: Reduced Title Weight */}
                            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
                                {heroSong?.name}
                            </h1>

                            {/* FIX 3: Clickable Artist */}
                            <p
                                className="text-lg text-white/60 mb-8 hover:text-white cursor-pointer transition-colors"
                                onClick={() => heroSong && onNavigate('artist', heroSong.primaryArtists)}
                            >
                                {heroSong?.primaryArtists}
                            </p>

                            <div className="flex items-center gap-4">
                                <button
                                    // POLISH 2: Hero Context
                                    onClick={() => heroSong && onPlay(heroSong, trendingSingles.length ? trendingSingles : trending)}
                                    className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform flex items-center gap-3"
                                >
                                    <Play size={18} fill="black" /> Play
                                </button>
                                <button className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10">
                                    <Heart size={20} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* CONTENT */}
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
                                {/* FIX 4: Narrative Cue */}
                                <div className="flex items-center gap-2 mb-3 text-white/40">
                                    <span className="text-[10px] uppercase tracking-widest">
                                        Continue Listening
                                    </span>
                                </div>
                                <SectionHeader title="Jump Back In" subtitle="Recently played" />
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {recent
                                        .slice(0, 6)
                                        .filter(item => item?.track?.song)
                                        .map(item => {
                                            const song = item.track!.song!;
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    whileHover={{ y: -4 }}
                                                    className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer border border-white/10 backdrop-blur-sm"
                                                    onClick={() =>
                                                        item.itemType === 'song'
                                                            ? onResumeSong(item.track, item.lastPosition || 0)
                                                            : item.itemType === 'album'
                                                                ? onOpenAlbum(song)
                                                                : onOpenPlaylist(song)
                                                    }
                                                >
                                                    <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900 relative">
                                                        <img
                                                            src={getArt(song)}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {song.name}
                                                    </p>
                                                    {/* FIX 8: Typography Tweak */}
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

                        {/* New & Trending Singles */}
                        {trendingSingles.length > 0 && (
                            <section>
                                <SectionHeader title="Trending Singles" subtitle="Hot right now" />
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {trendingSingles.slice(0, 10).map((item, i) => (
                                        <motion.div
                                            key={item.id || i}
                                            whileHover={{ y: -4 }}
                                            // FIX 7: Smaller card, no border
                                            className="w-44 flex-shrink-0 bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer"
                                            onClick={() => item.type === 'album'
                                                ? onOpenAlbum(item)
                                                : item.type === 'playlist'
                                                    ? onOpenPlaylist(item)
                                                    : onPlay(item, trendingSingles) // FIX 4: Context
                                            }
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900 relative">
                                                <img
                                                    src={getArt(item)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </div>
                                            <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                            <p className="text-xs text-white/40 truncate">
                                                {item.primaryArtists || item.subtitle}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Latest Albums */}
                        {latestAlbums.length > 0 && (
                            <section>
                                <SectionHeader title={albumTitle} subtitle="Latest Albums" />
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {latestAlbums.slice(0, 10).map((item, i) => (
                                        <motion.div
                                            key={item.id || i}
                                            whileHover={{ y: -4 }}
                                            className="w-44 flex-shrink-0 bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer"
                                            onClick={() => onOpenAlbum(item)}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900 relative">
                                                <img
                                                    src={getArt(item)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </div>
                                            <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                            <p className="text-xs text-white/40 truncate">
                                                {item.primaryArtists || item.subtitle}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Charts */}
                        <section>
                            <SectionHeader title="Chart Toppers" subtitle="Today’s biggest hits" />
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
                                {/* POLISH 3: Dynamic Subtitle */}
                                <SectionHeader title="Featured Playlists" subtitle={playlistSubtitle} />
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {featuredPlaylists.slice(0, 6).map((p, i) => (
                                        <motion.div
                                            key={p.id || i}
                                            whileHover={{ y: -4 }}
                                            className="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer border border-white/10 backdrop-blur-sm"
                                            onClick={() => onOpenPlaylist(p)}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900 relative">
                                                <img
                                                    src={getArt(p)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
