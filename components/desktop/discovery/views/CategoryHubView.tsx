"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Disc3, Heart, MoreHorizontal, ChevronLeft, Radio, Music } from "lucide-react";
import { JioSaavnSong, searchSongs, searchPlaylists, searchAlbums } from "@/lib/jiosaavn";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { decodeHtml } from "@/lib/utils";
import { SectionHeader, HorizontalScroll, StandardCard, FeatureCard, VibeAlbumCard } from "../home/HomeComponents";
import { loadSettings } from "@/lib/settings";

interface CategoryHubProps {
    data: {
        query: string;
        label: string;
        color?: string;
        image?: string;
    };
    onNavigate: (view: { id: string; data?: any }) => void;
    onBack: () => void;
}

export function CategoryHubView({ data, onNavigate, onBack }: CategoryHubProps) {
    const { playInstantMix, isPlaying, currentSong, activeMixId, toggleLike, isLiked, addSongToMix } = usePlayback();
    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [playlists, setPlaylists] = useState<JioSaavnSong[]>([]);
    const [albums, setAlbums] = useState<JioSaavnSong[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContent();
    }, [data.query]);

    const loadContent = async () => {
        setLoading(true);
        try {
            const settings = loadSettings();
            const langs = settings?.languages?.join(',') || 'english';

            // Parallel Fetching for rich content
            const [songData, playlistData, albumData] = await Promise.all([
                searchSongs(`${data.query} songs`, 1, 10, langs),
                searchPlaylists(`${data.query} playlist`, 1, 10, langs),
                searchAlbums(`${data.query}`, 1, 10, langs)
            ]);

            setSongs(songData || []);
            setPlaylists(playlistData || []);
            setAlbums(albumData || []);
        } catch (e) {
            console.error("Hub Load Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartRadio = () => {
        if (songs.length > 0) {
            playInstantMix({
                id: `radio-${data.query}-${Date.now()}`,
                title: `${data.label} Radio`,
                color: 'blue', // Dynamic color later
                songs: songs,
                currentSongIndex: 0
            });
        }
    };

    const handlePlaySong = (song: JioSaavnSong, index: number) => {
        playInstantMix({
            id: `hub-${data.query}-${Date.now()}`,
            title: data.label,
            color: 'blue',
            songs: songs,
            currentSongIndex: index
        });
    };

    return (
        <div className="min-h-full pb-32">
            {/* HERO HEADER */}
            <div className="relative h-64 md:h-80 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--hub-color)] to-black/90 opacity-60 transition-opacity group-hover:opacity-80"
                    style={{ '--hub-color': data.color || '#555' } as React.CSSProperties} />

                {/* Background Pattern/Image */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay"
                    style={{ backgroundImage: `url(${data.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

                <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-8">
                    <button onClick={onBack} className="absolute top-8 left-8 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
                        <ChevronLeft size={24} />
                    </button>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h2 className="text-sm font-bold tracking-widest text-white/60 uppercase mb-2">Category Hub</h2>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6">{data.label}</h1>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleStartRadio}
                                className="px-8 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl hover:bg-gray-100"
                            >
                                <Radio size={20} fill="currentColor" /> Start Radio
                            </button>
                            {songs.length > 0 && (
                                <button
                                    onClick={() => handlePlaySong(songs[0], 0)}
                                    className="px-8 py-3 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-full font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
                                >
                                    <Play size={20} fill="currentColor" /> Play All
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-12 mt-8">

                {/* 1. TOP SONGS (List) */}
                {songs.length > 0 && (
                    <section className="px-8">
                        <SectionHeader title={`Top ${data.label} Songs`} />
                        <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden mt-4">
                            <div className="divide-y divide-white/5">
                                {songs.map((song, i) => {
                                    const active = currentSong?.id === song.id;
                                    return (
                                        <div
                                            key={song.id}
                                            onClick={() => handlePlaySong(song, i)}
                                            className={`group flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/5 ${active ? 'bg-white/10' : ''}`}
                                        >
                                            <div className="w-8 text-center text-white/40 text-sm font-mono group-hover:hidden">{i + 1}</div>
                                            <div className="w-8 text-center hidden group-hover:block"><Play size={16} fill="currentColor" /></div>

                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                                <img src={typeof song.image === 'string' ? song.image : (song.image?.[song.image.length - 1]?.link)} className="w-full h-full object-cover" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate ${active ? 'text-green-400' : 'text-white'}`}>{decodeHtml(song.name)}</div>
                                                <div className="text-white/40 text-xs truncate">{decodeHtml(song.primaryArtists)}</div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                                                className={`p-2 ${isLiked(song.id) ? 'text-pink-500' : 'text-white/20 hover:text-white'}`}
                                            >
                                                <Heart size={18} fill={isLiked(song.id) ? "currentColor" : "none"} />
                                            </button>
                                            <div className="text-white/30 text-xs font-mono">
                                                {song.duration ? `${Math.floor(Number(song.duration) / 60)}:${(Number(song.duration) % 60).toString().padStart(2, '0')}` : '--:--'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. PLAYLISTS (Horizontal) */}
                {playlists.length > 0 && (
                    <section className="pl-8">
                        <SectionHeader title="Curated Playlists" onSeeAll={() => onNavigate({ id: 'search', data: { query: `${data.query} playlists` } })} />
                        <HorizontalScroll>
                            {playlists.map((playlist, i) => (
                                <FeatureCard
                                    key={playlist.id}
                                    item={playlist}
                                    index={i}
                                    description="Featured Collection"
                                    onClick={() => onNavigate({ id: 'playlist', data: playlist })}
                                />
                            ))}
                        </HorizontalScroll>
                    </section>
                )}

                {/* 3. ALBUMS (Grid like Vibe Check but smaller) */}
                {albums.length > 0 && (
                    <section className="px-8">
                        <SectionHeader title="New & Trending Albums" />
                        <div className="flex flex-wrap gap-x-8 gap-y-8 mt-4">
                            {albums.map((album, i) => (
                                <VibeAlbumCard
                                    key={album.id}
                                    item={album}
                                    onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
