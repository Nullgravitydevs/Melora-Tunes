"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, TrendingUp, Music, Heart, Zap, Coffee, Activity, Calendar, AlertCircle, RefreshCcw } from "lucide-react";
import { getStrictLaunchData, LaunchData, JioSaavnSong, searchPlaylists } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { StandardCard, FeatureCard, HorizontalScroll, SectionHeader, QuickPickItem, VibeAlbumCard } from "../home/HomeComponents";

interface HomeViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onPlaySong: (song: JioSaavnSong) => void;
    currentSongId?: string;
    isPlaying: boolean;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

function getGreeting(name?: string) {
    const hours = new Date().getHours();
    let timeGreeting = "Good Morning";
    if (hours >= 12 && hours < 18) timeGreeting = "Good Afternoon";
    if (hours >= 18) timeGreeting = "Good Evening";

    if (name) return `${timeGreeting}, ${name}`;
    return timeGreeting;
}

// === PREMIUM SKELETON LOADER ===
function HomeSkeleton() {
    return (
        <div className="animate-pulse space-y-10 p-8">
            <div className="h-80 bg-white/5 bg-opacity-10 rounded-3xl relative overflow-hidden" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 rounded-xl" />
                ))}
            </div>
            <div className="space-y-4">
                <div className="h-8 w-48 bg-white/5 rounded-lg" />
                <div className="flex gap-6 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-48 h-64 bg-white/5 rounded-2xl shrink-0" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// === SMART HERO COMPONENT ===
function SmartHero({ song, onPlay, userName }: { song: JioSaavnSong | null; onPlay: (s: JioSaavnSong) => void; userName?: string }) {
    if (!song) return null;

    const [imgError, setImgError] = useState(false);
    const getArt = (quality: string = '500x500') => {
        if (imgError) return '';
        if (!song.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) return song.image.find(i => i.quality === quality)?.link || song.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative h-[45vh] min-h-[350px] w-full mb-8 group overflow-hidden"
        >
            {/* Dynamic Blurry Background */}
            <div className="absolute inset-0 z-0">
                {getArt() && (
                    <motion.img
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
                        src={getArt()} alt="" className="w-full h-full object-cover blur-3xl opacity-40 scale-125"
                        onError={() => setImgError(true)}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#090909] via-[#090909]/80 to-transparent" />
                <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="relative z-10 h-full flex items-center px-12 gap-12">
                {/* Left: Floating Art */}
                <motion.div
                    initial={{ opacity: 0, x: -30, rotate: -2 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="shrink-0 w-72 h-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 hidden md:block"
                >
                    {getArt() ? (
                        <img
                            src={getArt()}
                            alt={song.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <Music size={48} className="text-white/20" />
                        </div>
                    )}
                </motion.div>

                {/* Right: Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0 pt-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-[10px] font-bold tracking-widest text-white/80 uppercase">
                            Pick of the Day
                        </span>
                        <span className="text-white/40 text-sm font-medium tracking-wide">• {getGreeting(userName)}</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-xl line-clamp-2"
                    >
                        {decodeHtml(song.name)}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-xl text-white/60 font-medium mb-8 truncate"
                    >
                        {decodeHtml(song.primaryArtists || "")} • {song.year || "2025"}
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-max px-10 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-3 shadow-xl hover:bg-zinc-200 transition-colors"
                        onClick={() => onPlay(song)}
                    >
                        <Play fill="currentColor" size={24} /> Play Now
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

// === MOOD CARD COMPONENT ===



// === DATA FETCHING LOGIC ===
export function HomeView({ onNavigate, onPlaySong, currentSongId, isPlaying, onContextMenu }: HomeViewProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launchData, setLaunchData] = useState<LaunchData | null>(null);
    const [heroSong, setHeroSong] = useState<JioSaavnSong | null>(null);
    const [vibePlaylists, setVibePlaylists] = useState<JioSaavnSong[]>([]);
    const [displayLangs, setDisplayLangs] = useState<string[]>(['English']);
    const [userName, setUserName] = useState<string>(""); // Added userName state

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get Settings
            let storedLangs = ['english'];
            let name = ""; // Initialize name
            try {
                const stored = localStorage.getItem('melora-settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.languages) {
                        const l = parsed.languages;
                        storedLangs = Array.isArray(l) ? l : [l];
                    }
                    if (parsed.userName) { // Load userName
                        name = parsed.userName;
                    }
                }
            } catch {
                /* ignored */
            }
            setUserName(name); // Set userName state

            const validLangs = storedLangs.map(l => l.toLowerCase().trim()).filter(Boolean);
            const langString = validLangs.join(',') || 'english';
            setDisplayLangs(validLangs);

            // 2. Call Enhanced API
            const data = await getStrictLaunchData(langString);
            if (!data) throw new Error("No data returned");
            setLaunchData(data);

            // 3. Set Hero (Randomize from top 5 for freshness)
            const heroPool = [...(data.new_trending || []), ...(data.new_albums || [])];
            if (heroPool.length > 0) {
                // Pick random from top 5 or fewer
                const max = Math.min(heroPool.length, 5);
                const random = Math.floor(Math.random() * max);
                setHeroSong(heroPool[random]);
            }

            // Fetch Vibe Playlists (Parallel) - Specific searches for quality vibes
            const primaryLang = displayLangs[0] || 'English';
            const vibeQueries = [`${primaryLang} Love Songs`, `${primaryLang} Party`, `${primaryLang} Sad Songs`, `${primaryLang} Workout`, "Chill Vibes", "Focus Music"];
            const vibePromises = vibeQueries.map(q => searchPlaylists(q, 1, 1, langString)); // Get top result for each
            const vibeResults = await Promise.all(vibePromises);

            // Flatten and filter valid results
            const vibes = vibeResults
                .map(res => res[0]) // Take first result from each search
                .filter(item => item && item.type === 'playlist');

            setVibePlaylists(vibes);

        } catch {
            setError("Failed to load content.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const handleSettingsUpdate = () => fetchData();
        window.addEventListener('melora-settings-changed', handleSettingsUpdate);
        return () => window.removeEventListener('melora-settings-changed', handleSettingsUpdate);
    }, [fetchData]);

    if (loading) return <HomeSkeleton />;

    if (error || !launchData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-12 rounded-3xl max-w-md border border-white/10"
                >
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
                    <p className="text-white/40 mb-8">
                        {error || "We couldn't load the content. Please check your connection or try again."}
                    </p>
                    <button
                        onClick={() => fetchData()}
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors mx-auto"
                    >
                        <RefreshCcw size={18} />
                        Try Again
                    </button>
                </motion.div>
            </div>
        );
    }

    const { new_trending, new_albums, top_playlists, moods, retro, top_charts, radio, quick_picks } = launchData;

    return (
        <div className="pb-40 w-full overflow-x-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-12"
                >
                    {/* 1. HERO SECTION */}
                    <section className="mt-[-20px]">
                        <SmartHero song={heroSong} onPlay={onPlaySong} userName={userName} />
                    </section>          {/* 2. QUICK PICKS */}
                    {quick_picks && quick_picks.length > 0 && (
                        <section>
                            <SectionHeader title="Quick Picks" subtitle="Start Listening" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-8">
                                {quick_picks.slice(0, 12).map((song, i) => (
                                    <QuickPickItem
                                        key={song.id}
                                        item={song}
                                        index={i}
                                        onClick={() => onPlaySong(song)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 3. TRENDING NOW */}
                    {new_trending.length > 0 && (
                        <section>
                            <SectionHeader title="Trending Now" onSeeAll={() => onNavigate({ id: 'trending', data: { items: new_trending, title: 'Trending Now' } })} />
                            <HorizontalScroll>
                                {new_trending.slice(0, 15).map((song, i) => (
                                    <StandardCard
                                        key={song.id}
                                        item={song}
                                        index={i}
                                        subtitle={song.primaryArtists}
                                        onClick={() => onPlaySong(song)}
                                        rank={i + 1}
                                    />
                                ))}
                            </HorizontalScroll>
                        </section>
                    )}

                    {/* 4. NEW ARRIVALS (Albums) */}
                    {new_albums.length > 0 && (
                        <section>
                            <SectionHeader title="New Arrivals" onSeeAll={() => onNavigate({ id: 'albums', data: { items: new_albums, title: 'New Arrivals' } })} />
                            <HorizontalScroll>
                                {new_albums.slice(0, 15).map((album, i) => (
                                    <StandardCard
                                        key={album.id}
                                        item={album}
                                        index={i}
                                        subtitle="New Album"
                                        onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                                    />
                                ))}
                            </HorizontalScroll>
                        </section>
                    )}

                    {/* 5. VIBE CHECK (Dynamic Playlists) */}
                    {vibePlaylists.length > 0 && (
                        <section>
                            <SectionHeader title="Vibe Check" subtitle="Moods & Moments" />
                            <div className="flex flex-wrap gap-x-12 gap-y-10 mt-6 justify-start px-8">
                                {vibePlaylists.map((playlist, i) => (
                                    <div key={playlist.id} className="flex justify-center">
                                        <VibeAlbumCard
                                            item={playlist}
                                            onClick={() => onNavigate({ id: 'playlist', data: playlist })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 6. TOP CHARTS */}
                    {top_charts && top_charts.length > 0 && (
                        <section>
                            <SectionHeader title="Top Charts" />
                            <HorizontalScroll>
                                {top_charts.map((playlist, i) => (
                                    <FeatureCard
                                        key={playlist.id}
                                        item={playlist}
                                        index={i}
                                        description="Top 50"
                                        onClick={() => onNavigate({ id: 'playlist', data: playlist })}
                                    />
                                ))}
                            </HorizontalScroll>
                        </section>
                    )}

                    {/* 7. LANGUAGE BASED PLAYLISTS */}
                    {top_playlists && top_playlists.length > 0 && (
                        <section>
                            <SectionHeader title={`Best of ${displayLangs[0]}`} subtitle="Editor's Picks" />
                            <HorizontalScroll>
                                {top_playlists.map((playlist, i) => (
                                    <FeatureCard
                                        key={playlist.id}
                                        item={playlist}
                                        index={i}
                                        description="Featured Playlist"
                                        onClick={() => onNavigate({ id: 'playlist', data: playlist })}
                                    />
                                ))}
                            </HorizontalScroll>
                        </section>
                    )}

                    {/* 8. RETRO REWIND */}
                    {retro && retro.length > 0 && (
                        <section>
                            <SectionHeader title="Retro Rewind" subtitle="Classics you love" />
                            <HorizontalScroll>
                                {retro.slice(0, 15).map((song, i) => (
                                    <StandardCard
                                        key={song.id}
                                        item={song}
                                        index={i}
                                        subtitle={song.year}
                                        onClick={() => onPlaySong(song)}
                                    />
                                ))}
                            </HorizontalScroll>
                        </section>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
}
