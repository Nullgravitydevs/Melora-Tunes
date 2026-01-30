"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Headphones, Disc, Activity, TrendingUp, Play, Mic2, Globe, Grid } from "lucide-react";
import { searchPlaylists, searchAlbums, searchSongs, getTopCharts, fixImageUrl } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { usePlayback } from "@/components/providers/playback-context";
import { StandardCard, FeatureCard, HorizontalScroll } from "../home/HomeComponents";
import { decodeHtml } from "@/lib/utils";

interface ExploreViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    initialMode?: 'explore' | 'radio';
}

// Helper to get best image
const getHighQualityImage = (image: any) => {
    if (!image) return '';
    let url = '';
    if (typeof image === 'string') url = image;
    else if (Array.isArray(image)) {
        url = image.find((i: any) => i.quality === '500x500')?.link || image[0]?.link || '';
    }
    return url ? fixImageUrl(url, '500x500') : '';
};

export function ExploreView({ onNavigate, initialMode }: ExploreViewProps) {
    const { playInstantMix, showToast } = usePlayback();

    // State for all sections
    const [content, setContent] = useState<{
        globalCharts: any[];
        topPlaylists: any[];
        newReleases: any[];
        livePerformances: any[];
        globalTrending: any[];
        bollywood: any[];
        tollywood: any[];
        hollywood: any[];
    }>({
        globalCharts: [],
        topPlaylists: [],
        newReleases: [],
        livePerformances: [],
        globalTrending: [],
        bollywood: [],
        tollywood: [],
        hollywood: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = loadSettings();
            const langString = settings?.languages?.join(',') || 'english';

            // Parallel Fetching for "No Placeholders" Speed
            const [
                charts,
                playlists,
                newAlbums,
                live,
                trending,
                bolly,
                tolly,
                holly
            ] = await Promise.all([
                searchPlaylists("Global Top 50", 1, 10),
                searchPlaylists("Top Hits", 1, 10),
                searchAlbums("New Releases 2025", 1, 10),
                searchAlbums("Live Concert", 1, 10), // "Live Performance" often returns albums
                searchSongs("Global Viral", 1, 10),
                searchPlaylists("Bollywood Top Hits", 1, 10),
                searchPlaylists("Tollywood Top Hits", 1, 10),
                searchPlaylists("Hollywood Top Hits", 1, 10)
            ]);

            setContent({
                globalCharts: charts,
                topPlaylists: playlists,
                newReleases: newAlbums,
                livePerformances: live,
                globalTrending: trending,
                bollywood: bolly,
                tollywood: tolly,
                hollywood: holly
            });

        } catch (e) { console.error("Explore Data Load Failed", e) }
        finally { setLoading(false) }
    };

    // Helper for Section Headers
    const Header = ({ title, subtitle }: { title: string, subtitle?: string }) => (
        <div className="flex items-end justify-between mb-6 px-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
                {subtitle && <p className="text-sm text-white/40 font-medium mt-1">{subtitle}</p>}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-full p-8 space-y-12 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-3xl" />)}
            </div>
        );
    }

    return (
        <div className="min-h-full pb-32 space-y-12">

            {/* VISUAL HERO HEADER */}
            <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden mb-8 group">
                {/* Collage Background */}
                <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-6 opacity-20 group-hover:opacity-30 transition-opacity duration-1000 scale-105">
                    {content.newReleases.slice(0, 18).map((item, i) => (
                        <div key={i} className="relative aspect-square">
                            <img src={getHighQualityImage(item.image)} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                        </div>
                    ))}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-transparent to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-4xl z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-pink-500/20 text-pink-500 border border-pink-500/20 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={14} /> Discovery Hub
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
                            Explore
                        </h1>
                        <p className="text-xl md:text-2xl text-white/50 font-medium leading-relaxed max-w-xl">
                            What's happening in the world of music. Charts, trends, and new releases.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* 1. GLOBAL CHART TOPPERS (Square Cards, Apple Style) */}
            <section className="px-4">
                <Header title="Global Chart Toppers" subtitle="The biggest hits right now" />
                <HorizontalScroll>
                    {content.globalCharts.map((item, i) => (
                        <FeatureCard
                            key={item.id}
                            item={item}
                            index={i}
                            description="Top 50"
                            onClick={() => onNavigate({ id: 'playlist', data: item })}
                        />
                    ))}
                </HorizontalScroll>
            </section>

            {/* 2. GLOBAL TRENDING (Wide Rows) */}
            <section className="px-4">
                <Header title="Global Trending" subtitle="Viral everywhere" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {content.globalTrending.slice(0, 9).map((song, i) => (
                        <div
                            key={song.id}
                            onClick={() => onNavigate({ id: 'song', data: song })} // Or play directly?
                            className="group flex items-center gap-4 p-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden relative flex-shrink-0">
                                <img src={getHighQualityImage(song.image)} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={20} fill="white" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-sm truncate text-white">{decodeHtml(song.name)}</h4>
                                <p className="text-xs text-white/50 truncate">{decodeHtml(song.primaryArtists)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. NEW RELEASES (Standard Cards) */}
            <section className="px-4">
                <Header title="New Releases" subtitle="Fresh from the studio" />
                <HorizontalScroll>
                    {content.newReleases.map((album, i) => (
                        <StandardCard
                            key={album.id}
                            item={album}
                            index={i}
                            subtitle={album.year || "2025"}
                            onClick={() => onNavigate({ id: 'peel-reveal', data: album })} // Use PeelReveal for albums
                        />
                    ))}
                </HorizontalScroll>
            </section>

            {/* 4. LIVE PERFORMANCES (Wide Cards) */}
            <section className="px-4">
                <Header title="Live Performances" subtitle="Experience the energy" />
                <HorizontalScroll>
                    {content.livePerformances.map((album, i) => (
                        <div
                            key={album.id}
                            onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                            className="min-w-[280px] h-64 relative rounded-2xl overflow-hidden cursor-pointer group snap-start"
                        >
                            <img src={getHighQualityImage(album.image)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-6">
                                <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2 inline-block">Live Audio</span>
                                <h3 className="text-xl font-bold text-white leading-tight mb-1 line-clamp-2">{decodeHtml(album.name)}</h3>
                                <p className="text-white/60 text-sm">{decodeHtml(album.primaryArtists)}</p>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                    <Play fill="white" size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </HorizontalScroll>
            </section>

            {/* 5. TOP PLAYLISTS (Square) */}
            <section className="px-4">
                <Header title="Top Playlists" subtitle="Curated for you" />
                <HorizontalScroll>
                    {content.topPlaylists.map((playlist, i) => (
                        <StandardCard
                            key={playlist.id}
                            item={playlist}
                            index={i}
                            subtitle="Playlist"
                            onClick={() => onNavigate({ id: 'playlist', data: playlist })}
                        />
                    ))}
                </HorizontalScroll>
            </section>

            {/* 6. REGIONAL BLOCK (Bollywood, Tollywood, Hollywood) */}
            <div className="bg-black border border-white/10 rounded-[2.5rem] p-8 mx-4 space-y-12 backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-transparent opacity-30" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <Headphones className="text-purple-400" size={32} />
                        <h2 className="text-3xl font-bold">Global Sounds</h2>
                    </div>

                    {/* Bollywood */}
                    <section>
                        <Header title="Bollywood Hits" />
                        <HorizontalScroll>
                            {content.bollywood.map((item, i) => (
                                <CompactCard key={item.id} item={item} subtitle="Hindi" onClick={() => onNavigate({ id: 'playlist', data: item })} />
                            ))}
                        </HorizontalScroll>
                    </section>

                    {/* Tollywood */}
                    <section>
                        <Header title="Tollywood Beats" />
                        <HorizontalScroll>
                            {content.tollywood.map((item, i) => (
                                <CompactCard key={item.id} item={item} subtitle="Telugu" onClick={() => onNavigate({ id: 'playlist', data: item })} />
                            ))}
                        </HorizontalScroll>
                    </section>

                    {/* Hollywood */}
                    <section>
                        <Header title="Hollywood & Western" />
                        <HorizontalScroll>
                            {content.hollywood.map((item, i) => (
                                <CompactCard key={item.id} item={item} subtitle="English" onClick={() => onNavigate({ id: 'playlist', data: item })} />
                            ))}
                        </HorizontalScroll>
                    </section>
                </div>

            </div>
        </div>
    );
}

// Compact Card for dense lists
function CompactCard({ item, subtitle, onClick }: any) {
    return (
        <div onClick={onClick} className="min-w-[160px] w-[160px] cursor-pointer group snap-start">
            <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 mb-3 relative shadow-lg">
                <img src={getHighQualityImage(item.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play fill="white" size={24} />
                </div>
            </div>
            <h3 className="font-semibold text-sm text-white truncate">{decodeHtml(item.name)}</h3>
            <p className="text-xs text-white/40 truncate">{subtitle}</p>
        </div>
    )
}
