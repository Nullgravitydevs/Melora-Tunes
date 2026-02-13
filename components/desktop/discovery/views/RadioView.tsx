"use client";

import React from "react";
import { motion } from "framer-motion";
import { Radio, Mic2, Calendar, Zap, Play, Signal } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { SectionHeader, HorizontalScroll } from "../home/HomeComponents";
import { JioSaavnSong, searchSongs, searchArtists, fixImageUrl } from "@/lib/jiosaavn";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";

interface RadioViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

// === STATION DATA ===
// Initial set with placeholder images, will be updated dynamically
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80';

const INITIAL_ARTIST_STATIONS = [
    { id: 'arijit', label: 'Arijit Singh Radio', image: PLACEHOLDER_IMG, query: 'Arijit Singh' },
    { id: 'weekend', label: 'The Weeknd Radio', image: PLACEHOLDER_IMG, query: 'The Weeknd' },
    { id: 'taylor', label: 'Taylor Swift Radio', image: PLACEHOLDER_IMG, query: 'Taylor Swift' },
    { id: 'pritam', label: 'Pritam Radio', image: PLACEHOLDER_IMG, query: 'Pritam' },
    { id: 'sid', label: 'Sid Sriram Radio', image: PLACEHOLDER_IMG, query: 'Sid Sriram' },
];

const DECADE_STATIONS = [
    { id: '90s', label: '90s Nostalgia', image: 'https://images.unsplash.com/photo-1542208998-f6dbbb27a72f?q=80&w=2070&auto=format&fit=crop', query: '90s bollywood hits' },
    { id: '00s', label: '00s Throwback', image: 'https://images.unsplash.com/photo-1596529896799-880620fa9483?q=80&w=1974&auto=format&fit=crop', query: '2000s hits' },
    { id: '10s', label: '2010s Golden Era', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1974&auto=format&fit=crop', query: '2010s hits' },
];

const VIBE_STATIONS = [
    { id: 'lofi', label: 'Lo-Fi Beats', color: '#14b8a6', icon: Zap, query: 'lofi hip hop' },
    { id: 'workout', label: 'Power Workout', color: '#ef4444', icon: Zap, query: 'workout motivation' },
    { id: 'sleep', label: 'Sleep Station', color: '#6366f1', icon: Zap, query: 'sleep music' },
];

export function RadioView({ onNavigate }: RadioViewProps) {
    const { playInstantMix, showToast, qualityPreference } = usePlayback();
    const [artistStations, setArtistStations] = React.useState(INITIAL_ARTIST_STATIONS);

    React.useEffect(() => {
        const fetchImages = async () => {
            const updated = await Promise.all(INITIAL_ARTIST_STATIONS.map(async (station) => {
                try {
                    // Search for the artist to get specific artist image
                    const results = await searchArtists(station.query, 1, 1);
                    if (results && results.length > 0 && results[0].image) {
                        // Use the highest quality image available
                        const highRes = results[0].image.find((i: any) => i.quality === '500x500')?.link || results[0].image[0]?.link;
                        return { ...station, image: highRes ? fixImageUrl(highRes, '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80' };
                    }
                } catch {
                    /* ignored */
                }
                return { ...station, image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80' };
            }));
            setArtistStations(updated);
        };
        fetchImages();
    }, []);

    const startRadio = async (station: any) => {
        showToast(`Tuning into ${station.label}...`, 'info');
        try {
            const songs = await searchSongs(station.query, 1, 40);
            if (songs && songs.length > 0) {
                const tracks = songs.map((s: any) => ensurePlayableTrack(s, qualityPreference as AudioQuality));
                playInstantMix({
                    id: `radio-${station.id}-${Date.now()}`,
                    title: station.label,
                    color: 'blue',
                    songs: tracks, // Shuffle later if needed
                    currentSongIndex: 0
                });
            } else {
                showToast("Station offline", "error");
            }
        } catch { /* ignored */ }
    };

    return (
        <div className="min-h-full p-8 pb-32 space-y-12">

            {/* HERO: ON AIR */}
            <div className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer" onClick={() => startRadio({ label: 'Melora FM', query: `top hits ${new Date().getFullYear()}` })}>
                <img
                    src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 p-8 flex flex-col justify-center items-start">
                    <div className="flex items-center gap-2 text-red-500 font-bold tracking-widest text-xs uppercase mb-2 bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                        <Signal size={12} className="animate-pulse" /> On Air
                    </div>
                    <h1 className="text-5xl font-black text-white mb-2">Melora FM</h1>
                    <p className="text-white/60 text-lg max-w-md">Your personalized station. Non-stop hits, curated just for you.</p>

                    <button className="mt-6 px-8 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                        <Play fill="currentColor" size={20} /> Tune In
                    </button>
                </div>
            </div>

            {/* ARTIST RADIO */}
            <section>
                <SectionHeader title="Artist Radio" subtitle="Non-stop mixes from your favorites" />
                <HorizontalScroll>
                    {artistStations.map((station, i) => (
                        <motion.div
                            key={station.id}
                            onClick={() => startRadio(station)}
                            className="bg-black p-4 rounded-2xl border border-white/10 cursor-pointer group hover:border-white/20 transition-colors w-48 flex-shrink-0"
                        >
                            <div className="aspect-square rounded-full overflow-hidden mb-4 shadow-lg border-2 border-transparent group-hover:border-white transition-colors relative">
                                <img
                                    src={station.image}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback if the real artist image fails
                                        e.currentTarget.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80";
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Radio size={24} className="text-white" />
                                </div>
                            </div>
                            <h3 className="font-bold text-center text-sm truncate">{station.label}</h3>
                            <p className="text-xs text-white/40 text-center">Artist Station</p>
                        </motion.div>
                    ))}
                </HorizontalScroll>
            </section>

            {/* DECADE RADIO */}
            <section>
                <SectionHeader title="Time Machine" subtitle="Travel through the decades" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {DECADE_STATIONS.map((station, i) => (
                        <div
                            key={station.id}
                            onClick={() => startRadio(station)}
                            className="h-40 bg-black rounded-xl flex items-center px-4 gap-4 cursor-pointer hover:border-white/20 transition-colors border border-white/10 group relative overflow-hidden"
                        >
                            {/* Background Image subtle */}
                            <img src={station.image} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity blur-sm" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />

                            <div className="relative z-10 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                                <Calendar size={20} className="text-white/80" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg">{station.label}</h3>
                                <p className="text-xs text-white/40">Flashback Hits</p>
                            </div>
                            <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                                <Play size={24} fill="white" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* VIBE STATIONS */}
            <section>
                <SectionHeader title="Vibe Stations" subtitle="Mood based frequencies" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {VIBE_STATIONS.map((station) => (
                        <div
                            key={station.id}
                            onClick={() => startRadio(station)}
                            className="bg-black border border-white/10 p-4 rounded-xl hover:border-white/30 transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: `${station.color}20`, color: station.color }}>
                                <station.icon size={20} />
                            </div>
                            <h3 className="font-bold text-sm">{station.label}</h3>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Live Station</p>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    );
}
