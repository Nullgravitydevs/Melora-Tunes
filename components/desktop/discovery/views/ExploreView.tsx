"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Radio, Music, Play, Zap, Grid, Globe, Headphones } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { getTopCharts } from "@/lib/jiosaavn";
import { FeatureCard, SectionHeader, HorizontalScroll } from "../home/HomeComponents";
import { loadSettings } from "@/lib/settings";

interface ExploreViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    initialMode?: 'explore' | 'radio';
}

// === CONSTANTS ===
const MOODS = [
    { id: 'party', label: 'Party', query: 'party hits', color: '#db2777', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop', colSpan: 2, rowSpan: 2 }, // Big
    { id: 'romance', label: 'Romance', query: 'romantic songs', color: '#e11d48', image: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=1986&auto=format&fit=crop', colSpan: 1, rowSpan: 1 },
    { id: 'workout', label: 'Workout', query: 'workout motivation', color: '#ea580c', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop', colSpan: 1, rowSpan: 1 },
    { id: 'chill', label: 'Chill', query: 'lofi chill', color: '#0d9488', image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop', colSpan: 1, rowSpan: 2 }, // Tall
    { id: 'focus', label: 'Focus', query: 'focus music', color: '#4f46e5', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop', colSpan: 1, rowSpan: 1 },
    { id: 'sad', label: 'Sad', query: 'sad songs', color: '#2563eb', image: 'https://images.unsplash.com/photo-1499482125586-91609c0b5fd4?q=80&w=1976&auto=format&fit=crop', colSpan: 1, rowSpan: 1 },
    { id: 'happy', label: 'Happy', query: 'happy hits', color: '#ca8a04', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=2070&auto=format&fit=crop', colSpan: 2, rowSpan: 1 }, // Wide
];

const GENRES = [
    { id: 'pop', label: 'Pop', query: 'pop hits', color: '#d946ef', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1974&auto=format&fit=crop' },
    { id: 'rock', label: 'Rock', query: 'rock classics', color: '#dc2626', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=2070&auto=format&fit=crop' },
    { id: 'hiphop', label: 'Hip Hop', query: 'hip hop', color: '#eab308', image: 'https://images.unsplash.com/photo-1536849460588-696219a9e9b8?q=80&w=2042&auto=format&fit=crop' },
    { id: 'indie', label: 'Indie', query: 'indie', color: '#10b981', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?q=80&w=2070&auto=format&fit=crop' },
    { id: 'electronic', label: 'Electronic', query: 'edm hits', color: '#3b82f6', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop' },
    { id: 'classical', label: 'Classical', query: 'classical essentials', color: '#8b5cf6', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384ebd?q=80&w=2070&auto=format&fit=crop' },
    { id: 'kpop', label: 'K-Pop', query: 'k-pop hits', color: '#ec4899', image: 'https://images.unsplash.com/photo-1621255152062-094396ca8954?q=80&w=1974&auto=format&fit=crop' },
    { id: 'jazz', label: 'Jazz', query: 'jazz classics', color: '#f97316', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=2070&auto=format&fit=crop' },
];

const RADIO_STATIONS = [
    { id: 'artist-radio', label: 'Artist Radio', query: 'best of', color: '#6366f1', icon: Mic2 },
    { id: 'discover', label: 'Discover Weekly', query: 'weekly mix', color: '#14b8a6', icon: Globe },
    { id: 'on-repeat', label: 'On Repeat', query: 'on repeat', color: '#f43f5e', icon: Grid },
];
import { Mic2 } from "lucide-react";


export function ExploreView({ onNavigate, initialMode }: ExploreViewProps) {
    const { playInstantMix, showToast } = usePlayback();
    const [charts, setCharts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const settings = loadSettings();
            const langString = settings?.languages?.join(',') || 'english';
            const data = await getTopCharts(langString);
            setCharts(data.slice(0, 10)); // Top 10 Charts
        } catch (e) { console.error(e) } finally { setLoading(false) }
    };

    const handleCategoryClick = (item: any) => {
        onNavigate({
            id: 'category-hub',
            data: {
                query: item.query,
                label: item.label,
                color: item.color,
                image: item.image
            }
        });
    };

    return (
        <div className="min-h-full p-8 pb-32 space-y-12">

            {/* HERO TITLE */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 flex items-center gap-3">
                    <Headphones size={40} className="text-pink-500" />
                    Explore
                </h1>
                <p className="text-white/40 font-medium text-lg">Find your vibe, genre, or next obsession.</p>
            </motion.div>

            {/* 1. MOODS (BENTO GRID) */}
            <section>
                <SectionHeader title="Moods & Moments" subtitle="Vibe check your day" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 auto-rows-[160px]">
                    {MOODS.map((mood, i) => (
                        <motion.div
                            key={mood.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleCategoryClick(mood)}
                            className={`group relative rounded-3xl overflow-hidden cursor-pointer ${mood.colSpan === 2 ? 'col-span-2' : 'col-span-1'
                                } ${mood.rowSpan === 2 ? 'row-span-2' : 'row-span-1'}`}
                        >
                            <img
                                src={mood.image}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                <h3 className="text-2xl font-bold text-white drop-shadow-lg group-hover:translate-x-2 transition-transform">{mood.label}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 2. GENRES (PILL GRID) */}
            <section>
                <SectionHeader title="Browse Genres" subtitle="Dive deep into sound" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
                    {GENRES.map((genre, i) => (
                        <motion.div
                            key={genre.id}
                            whileHover={{ y: -5 }}
                            onClick={() => handleCategoryClick(genre)}
                            className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer group"
                        >
                            <img src={genre.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="font-bold text-white text-sm md:text-base">{genre.label}</span>
                            </div>
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ boxShadow: `inset 0 0 20px ${genre.color}` }}
                            />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 3. FEATURED RADIO */}
            <section>
                <SectionHeader title="Featured Radio" subtitle="Non-stop stations" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {RADIO_STATIONS.map((station, i) => (
                        <div
                            key={station.id}
                            onClick={() => {
                                // Default search for now, could be smarter
                                handleCategoryClick({ ...station, image: 'https://images.unsplash.com/photo-1594434533760-02e0f3faaa68?q=80&w=2128&auto=format&fit=crop' })
                            }}
                            className="h-32 rounded-2xl bg-white/5 border border-white/5 flex items-center px-6 gap-6 cursor-pointer hover:bg-white/10 transition-colors group"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                <station.icon size={32} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{station.label}</h3>
                                <p className="text-white/40 text-sm">Infinite Mix</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. GLOBAL CHARTS */}
            {charts.length > 0 && (
                <section>
                    <SectionHeader title="Global Charts" subtitle="Top 50s everywhere" />
                    <HorizontalScroll>
                        {charts.map((chart, i) => (
                            <FeatureCard
                                key={chart.id}
                                item={chart}
                                index={i}
                                description="Top Chart"
                                onClick={() => onNavigate({ id: 'playlist', data: chart })}
                            />
                        ))}
                    </HorizontalScroll>
                </section>
            )}

        </div>
    );
}
