"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Disc3, Heart, MoreHorizontal, ChevronLeft, Radio, Music } from "lucide-react";
import { JioSaavnSong, searchSongs, searchPlaylists, searchAlbums, searchArtists } from "@/lib/jiosaavn";
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
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

export function CategoryHubView({ data, onNavigate, onBack, onContextMenu }: CategoryHubProps) {
    const { playInstantMix, isPlaying, currentSong, activeMixId, toggleLike, isLiked, addSongToMix } = usePlayback();
    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [playlists, setPlaylists] = useState<JioSaavnSong[]>([]);
    const [albums, setAlbums] = useState<JioSaavnSong[]>([]);
    const [artists, setArtists] = useState<any[]>([]);
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
            const [songData, playlistData, albumData, artistData] = await Promise.all([
                searchSongs(`${data.query} songs`, 1, 10, langs),
                searchPlaylists(`${data.query} playlist`, 1, 10, langs),
                searchAlbums(`${data.query}`, 1, 10, langs),
                searchArtists(`${data.query}`, 1, 8)
            ]);

            setSongs(songData || []);
            setPlaylists(playlistData || []);
            setAlbums(albumData || []);
            setArtists(artistData || []);
        } catch {
            /* ignored */
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
        <div className="min-h-full pb-32 bg-black">
            {/* EPIC HERO HEADER */}
            <div className="relative h-[60vh] min-h-[450px] overflow-hidden group">
                {/* Background Image (Deep Blur) */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 blur-[100px] opacity-40 saturate-[1.5]"
                    style={{ backgroundImage: `url(${data.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'})` }}
                />

                {/* Accent Color Wash */}
                <div
                    className="absolute inset-0 opacity-40"
                    style={{ background: `radial-gradient(circle at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 70%)` }}
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />

                {/* Back Button */}
                <button onClick={onBack} className="absolute top-8 left-8 z-50 w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 group/back">
                    <ChevronLeft size={24} className="group-hover/back:-translate-x-0.5 transition-transform" />
                </button>

                {/* Header Content */}
                <div className="relative z-10 h-full flex flex-col justify-end px-12 pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/70 border border-white/10">
                                Discovery Hub
                            </span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/20" />)}
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                            {data.label}
                        </h1>

                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={handleStartRadio}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-10 py-4 bg-white text-black rounded-full font-black flex items-center gap-3 shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:bg-gray-100 transition-all uppercase tracking-wider text-sm"
                            >
                                <Radio size={22} fill="currentColor" strokeWidth={2.5} /> Start {data.label} Radio
                            </motion.button>
                            {songs.length > 0 && (
                                <motion.button
                                    onClick={() => handlePlaySong(songs[0], 0)}
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-full font-black flex items-center gap-3 transition-all uppercase tracking-wider text-sm"
                                >
                                    <Play size={20} fill="currentColor" /> Play All
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-12 mt-8">

                {/* 1. TOP SONGS (List) */}
                {songs.length > 0 && (
                    <section className="px-12">
                        <SectionHeader title={`Top ${data.label} Hymns`} subtitle="Viral & Trending" />
                        <div className="bg-white/[0.02] backdrop-blur-sm rounded-[2rem] border border-white/5 overflow-hidden mt-6">
                            <div className="divide-y divide-white/[0.03]">
                                {songs.map((song, i) => {
                                    const active = currentSong?.id === song.id;
                                    const songImage = typeof song.image === 'string' ? song.image : (song.image?.[song.image.length - 1]?.link || song.image?.[0]?.link);

                                    return (
                                        <motion.div
                                            key={song.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            onClick={() => handlePlaySong(song, i)}
                                            className={`group flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-300 ${active ? 'bg-white/10' : 'hover:bg-white/[0.05]'}`}
                                        >
                                            <div className="w-8 flex items-center justify-center">
                                                {active && isPlaying ? (
                                                    <Disc3 size={18} className="animate-spin text-white" />
                                                ) : (
                                                    <>
                                                        <span className="group-hover:hidden text-white/20 text-xs font-black tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                                                        <Play size={14} className="hidden group-hover:block text-white" fill="currentColor" />
                                                    </>
                                                )}
                                            </div>

                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                <img src={songImage} className="w-full h-full object-cover" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`text-base font-bold truncate tracking-tight ${active ? 'text-white' : 'text-white/90'}`}>
                                                    {decodeHtml(song.name)}
                                                    {song.explicitContent ? <span className="ml-2 text-[8px] bg-white/10 px-1 rounded text-white/40">E</span> : null}
                                                </div>
                                                <div className="text-white/40 text-xs mt-0.5 truncate font-medium">{decodeHtml(song.primaryArtists)}</div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <motion.button
                                                    onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.8 }}
                                                    className={`p-1.5 rounded-full transition-colors ${isLiked(song.id) ? 'text-red-500' : 'text-white/10 hover:text-white'}`}
                                                >
                                                    <Heart size={18} fill={isLiked(song.id) ? "currentColor" : "none"} />
                                                </motion.button>
                                                <div className="text-white/20 text-xs font-mono w-10 text-right">
                                                    {song.duration ? `${Math.floor(Number(song.duration) / 60)}:${(Number(song.duration) % 60).toString().padStart(2, '0')}` : '--:--'}
                                                </div>
                                                <button className="p-1.5 text-white/10 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. ARTIST HIGHLIGHTS (New Section) */}
                {artists.length > 0 && (
                    <section>
                        <SectionHeader title="Artist Highlights" subtitle="Top creators in this space" />
                        <HorizontalScroll>
                            {artists.map((artist, i) => (
                                <motion.div
                                    key={artist.id}
                                    whileHover={{ y: -5 }}
                                    onClick={() => onNavigate({ id: 'artist', data: artist })}
                                    className="flex flex-col items-center gap-3 w-40 flex-shrink-0 group cursor-pointer"
                                >
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-white/20 transition-all shadow-xl">
                                        <img src={typeof artist.image === 'string' ? artist.image : artist.image?.[artist.image.length - 1]?.link} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-black text-sm text-white/80 group-hover:text-white truncate w-32">{decodeHtml(artist.name)}</h4>
                                        <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest mt-0.5">Artist</p>
                                    </div>
                                </motion.div>
                            ))}
                        </HorizontalScroll>
                    </section>
                )}

                {/* 3. ESSENTIAL PLAYLISTS */}
                {playlists.length > 0 && (
                    <section>
                        <SectionHeader title="Essential Playlists" subtitle="Expertly curated collections" onSeeAll={() => onNavigate({ id: 'search', data: { query: `${data.query} playlists` } })} />
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

                {/* 4. NEW & TRENDING ALBUMS */}
                {albums.length > 0 && (
                    <section>
                        <SectionHeader title="Trending Albums" subtitle="Breaking through right now" />
                        <HorizontalScroll>
                            {albums.map((album, i) => (
                                <VibeAlbumCard
                                    key={album.id}
                                    item={album}
                                    onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                                />
                            ))}
                        </HorizontalScroll>
                    </section>
                )}
            </div>
        </div>
    );
}
