"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, ChevronRight, Clock, Disc3, Music, TrendingUp, Sparkles, Timer } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getTrending, getNewReleases, getTopCharts, JioSaavnSong } from "@/lib/jiosaavn";

/* ============================================================================
   HOME VIEW - Premium Discovery Home
   ============================================================================ */

interface HomeViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
    const { recentlyPlayed, mixes, loadMix, addMix, play, currentSong, isPlaying, togglePlay } = usePlayback();

    const [trending, setTrending] = useState<JioSaavnSong[]>([]);
    const [newReleases, setNewReleases] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [greeting, setGreeting] = useState('');

    // Greeting based on time
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    // Fetch data
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [t, n, c] = await Promise.all([
                    getTrending().catch(() => []),
                    getNewReleases(12).catch(() => []),
                    getTopCharts().catch(() => [])
                ]);
                setTrending(t.slice(0, 10));
                setNewReleases(n.slice(0, 8));
                setCharts(Array.isArray(c) ? c.slice(0, 6) : []);
            } catch (e) {
                console.error('Home load failed:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Get art helper
    const getArt = (item: any): string => {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) {
            return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        }
        return '';
    };

    // Play song
    const playSong = (song: JioSaavnSong) => {
        const mixId = `quick-${Date.now()}`;
        const newMix: Mix = {
            id: mixId,
            title: 'Quick Play',
            color: 'white',
            songs: [song],
            currentSongIndex: 0
        };
        addMix(newMix);
        setTimeout(() => loadMix(mixId), 50);
    };

    // Hero song (first trending or recent)
    const heroSong = trending[0] || recentlyPlayed[0];

    return (
        <div className="min-h-full">
            {/* Hero Section */}
            {heroSong && (
                <HeroSection
                    song={heroSong}
                    greeting={greeting}
                    onPlay={() => playSong(heroSong)}
                    isPlaying={isPlaying && currentSong?.id === heroSong.id}
                    onToggle={togglePlay}
                />
            )}

            <div className="px-8 pb-32 space-y-10">
                {/* Recently Played */}
                {recentlyPlayed.length > 0 && (
                    <Section
                        title="Recently Played"
                        icon={<Clock size={18} />}
                        onSeeAll={() => { }}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            {recentlyPlayed.slice(0, 6).map((song, i) => (
                                <RecentCard
                                    key={song.id + i}
                                    song={song}
                                    onClick={() => playSong(song)}
                                    isPlaying={isPlaying && currentSong?.id === song.id}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Quick Picks - Compact Grid */}
                {mixes.length > 0 && (
                    <Section title="Your Tapes" icon={<Disc3 size={18} />}>
                        <div className="grid grid-cols-2 gap-3">
                            {mixes.slice(0, 4).map((mix, i) => (
                                <TapeCard
                                    key={mix.id}
                                    mix={mix}
                                    index={i}
                                    onClick={() => loadMix(mix.id)}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Trending */}
                {!isLoading && trending.length > 0 && (
                    <Section
                        title="Trending Now"
                        icon={<TrendingUp size={18} />}
                        onSeeAll={() => { }}
                    >
                        <ScrollRow>
                            {trending.map((song, i) => (
                                <SongCard
                                    key={song.id + i}
                                    song={song}
                                    index={i}
                                    onClick={() => playSong(song)}
                                    isPlaying={isPlaying && currentSong?.id === song.id}
                                />
                            ))}
                        </ScrollRow>
                    </Section>
                )}

                {/* New Releases */}
                {!isLoading && newReleases.length > 0 && (
                    <Section
                        title="New Releases"
                        icon={<Sparkles size={18} />}
                        onSeeAll={() => { }}
                    >
                        <ScrollRow>
                            {newReleases.map((album, i) => (
                                <AlbumCard
                                    key={album.id + i}
                                    album={album}
                                    index={i}
                                    onClick={() => onNavigate({ id: 'album', data: album })}
                                />
                            ))}
                        </ScrollRow>
                    </Section>
                )}

                {/* Charts */}
                {!isLoading && charts.length > 0 && (
                    <Section
                        title="Top Charts"
                        icon={<TrendingUp size={18} />}
                    >
                        <ScrollRow>
                            {charts.map((chart, i) => (
                                <ChartCard
                                    key={chart.id + i}
                                    chart={chart}
                                    index={i}
                                    onClick={() => onNavigate({ id: 'playlist', data: chart })}
                                />
                            ))}
                        </ScrollRow>
                    </Section>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-10">
                        <SkeletonSection />
                        <SkeletonSection />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================================
   HERO SECTION
   ============================================================================ */

function HeroSection({ song, greeting, onPlay, isPlaying, onToggle }: {
    song: JioSaavnSong;
    greeting: string;
    onPlay: () => void;
    isPlaying: boolean;
    onToggle: () => void;
}) {
    const getArt = () => {
        if (!song?.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) {
            return song.image.find((i: any) => i.quality === '500x500')?.link || song.image[0]?.link || '';
        }
        return '';
    };

    return (
        <div className="relative h-[320px] overflow-hidden">
            {/* Background Blur */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url(${getArt()})`,
                    filter: 'blur(80px) brightness(0.2) saturate(0)',
                    transform: 'scale(1.5)'
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

            {/* Content */}
            <div className="relative h-full flex items-end p-8 pb-10">
                <div className="flex items-end gap-8 max-w-4xl">
                    {/* Album Art */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative group"
                    >
                        <img
                            src={getArt()}
                            alt=""
                            className="w-44 h-44 rounded-xl object-cover shadow-2xl"
                        />
                        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <motion.button
                                onClick={isPlaying ? onToggle : onPlay}
                                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isPlaying ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                ) : (
                                    <Play size={22} fill="currentColor" className="ml-1" />
                                )}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex-1 pb-2"
                    >
                        <p className="text-white/40 text-sm mb-2 uppercase tracking-wider">{greeting}</p>
                        <h1 className="text-4xl font-bold mb-3 line-clamp-2">{song.name}</h1>
                        <p className="text-white/50 text-lg mb-6">{song.primaryArtists}</p>

                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={isPlaying ? onToggle : onPlay}
                                className="px-8 py-3 bg-white text-black rounded-full font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isPlaying ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                        </svg>
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        Play Now
                                    </>
                                )}
                            </motion.button>
                            <span className="text-white/30 text-sm flex items-center gap-1">
                                <Timer size={14} />
                                {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}
                            </span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   SECTION COMPONENTS
   ============================================================================ */

function Section({ title, icon, children, onSeeAll }: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onSeeAll?: () => void;
}) {
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    {icon && <span className="text-white/30">{icon}</span>}
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="text-sm text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        See all <ChevronRight size={16} />
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

function ScrollRow({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={ref}
            className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
        >
            <style>{`.scroll-row::-webkit-scrollbar { display: none; }`}</style>
            {children}
        </div>
    );
}

/* ============================================================================
   CARDS
   ============================================================================ */

function RecentCard({ song, onClick, isPlaying }: { song: JioSaavnSong; onClick: () => void; isPlaying: boolean }) {
    const getArt = () => {
        if (!song?.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) return song.image.find((i: any) => i.quality === '150x150')?.link || song.image[0]?.link || '';
        return '';
    };

    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            <div className="relative">
                <img src={getArt()} alt="" className="w-12 h-12 rounded object-cover" />
                {isPlaying && (
                    <div className="absolute inset-0 rounded bg-black/50 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{song.name}</p>
                <p className="text-xs text-white/40 truncate">{song.primaryArtists}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={16} className="text-white" fill="currentColor" />
            </div>
        </motion.button>
    );
}

function TapeCard({ mix, index, onClick }: { mix: Mix; index: number; onClick: () => void }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-all text-left group"
            whileHover={{ scale: 1.01 }}
        >
            <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <Disc3 size={20} className="text-white/40" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{mix.title}</p>
                <p className="text-xs text-white/35">{mix.songs.length} songs</p>
            </div>
        </motion.button>
    );
}

function SongCard({ song, index, onClick, isPlaying }: {
    song: JioSaavnSong;
    index: number;
    onClick: () => void;
    isPlaying: boolean;
}) {
    const getArt = () => {
        if (!song?.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) return song.image.find((i: any) => i.quality === '500x500')?.link || song.image[0]?.link || '';
        return '';
    };

    return (
        <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="flex-shrink-0 w-44 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-white/5">
                <img src={getArt()} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className={`w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl transition-all ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                        {isPlaying ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                    </div>
                </div>
            </div>
            <p className="text-sm font-medium truncate mb-0.5">{song.name}</p>
            <p className="text-xs text-white/40 truncate">{song.primaryArtists}</p>
        </motion.button>
    );
}

function AlbumCard({ album, index, onClick }: { album: any; index: number; onClick: () => void }) {
    const getArt = () => {
        if (!album?.image) return '';
        if (typeof album.image === 'string') return album.image;
        if (Array.isArray(album.image)) return album.image.find((i: any) => i.quality === '500x500')?.link || album.image[0]?.link || '';
        return '';
    };

    return (
        <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="flex-shrink-0 w-44 group text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-white/5">
                <img src={getArt()} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            </div>
            <p className="text-sm font-medium truncate mb-0.5">{album.name || album.title}</p>
            <p className="text-xs text-white/40 truncate">{album.primaryArtists || album.subtitle || 'Album'}</p>
        </motion.button>
    );
}

function ChartCard({ chart, index, onClick }: { chart: any; index: number; onClick: () => void }) {
    const getArt = () => {
        if (!chart?.image) return '';
        if (typeof chart.image === 'string') return chart.image;
        if (Array.isArray(chart.image)) return chart.image.find((i: any) => i.quality === '500x500')?.link || chart.image[0]?.link || '';
        return '';
    };

    return (
        <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="flex-shrink-0 w-48 rounded-xl overflow-hidden group text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-white/5">
                <img src={getArt()} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-sm font-bold truncate">{chart.listname || chart.title || 'Chart'}</p>
                </div>
            </div>
        </motion.button>
    );
}

/* ============================================================================
   LOADING SKELETON
   ============================================================================ */

function SkeletonSection() {
    return (
        <div className="space-y-4">
            <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
            <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-44 flex-shrink-0">
                        <div className="aspect-square rounded-xl bg-white/5 animate-pulse mb-3" />
                        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                        <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
