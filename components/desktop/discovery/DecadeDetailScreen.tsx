"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Shuffle, ArrowLeft, Loader2, Disc } from "lucide-react";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchSongs, searchPlaylists } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";

interface DecadeDetailScreenProps {
    decade: { id: string; name: string; query: string };
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onOpenPlaylist?: (playlist: any) => void;
    languageContext?: string;
}

export function DecadeDetailScreen({ decade, colors, onBack, onOpenPlaylist, languageContext = 'english,hindi' }: DecadeDetailScreenProps) {
    const { playInstantMix } = usePlayback();
    // FIX 1: Strong language resolution
    const langContext = (decade as any)?.language || languageContext || 'english,hindi';
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [songs, setSongs] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch relevant playlists
                const p = await searchPlaylists(decade.query + " playlist", 1, 10, langContext);
                setPlaylists(p.slice(0, 10));

                // Fetch relevant songs
                const s = await searchSongs(decade.query, 1, 30, langContext);
                setSongs(s || []);
            } catch (e) {
                console.error("Decade fetch failed:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [decade.id, decade.query, langContext]); // FIX 2: Dependencies

    const handlePlayAll = () => {
        if (songs.length > 0) {
            playInstantMix({
                id: `decade-${decade.id}-${Date.now()}`, // FIX 3: Unique ID
                title: decade.name,
                color: 'purple',
                songs: songs.map(s => ensurePlayableTrack(s)), // FIX: Safety
                currentSongIndex: 0
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full h-full bg-[#121212]">
            {/* Retro Header */}
            <div className="relative w-full h-[45vh] min-h-[350px] flex items-center justify-center overflow-hidden bg-black">
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-pulse" />

                {/* Decorative Elements */}
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />

                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-20"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>

                <div className="relative z-10 text-center">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block"
                    >
                        <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 tracking-tighter drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                            {decade.id.replace('s', '')}s
                        </h1>
                        <p className="text-white/60 text-xl font-light tracking-[0.5em] mt-2 uppercase">Golden Era Collection</p>
                    </motion.div>

                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                            onClick={handlePlayAll}
                            className="px-10 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <Play size={20} fill="black" />
                            Play Hits
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto w-full space-y-16">

                {/* Iconic Playlists */}
                {playlists.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <Disc className="text-pink-500" />
                            <h2 className="text-3xl font-bold text-white">Iconic Playlists</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {playlists.map((playlist, i) => (
                                <motion.div
                                    key={playlist.id || i}
                                    className="cursor-pointer group"
                                    whileHover={{ y: -5 }}
                                    onClick={() => onOpenPlaylist?.(playlist)}
                                >
                                    <div className="w-full aspect-square rounded-full overflow-hidden mb-4 relative shadow-2xl border-4 border-white/10 group-hover:border-pink-500/50 transition-colors">
                                        <img
                                            src={getArt(playlist)}
                                            className="w-full h-full object-cover group-hover:rotate-12 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play size={32} fill="white" className="text-white" />
                                        </div>
                                        {/* Vinyl Center Hole */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/4 bg-[#121212] rounded-full border border-white/20" />
                                    </div>
                                    <p className="font-bold text-white text-center truncate px-2">{playlist.name}</p>
                                    <p className="text-xs text-white/40 text-center uppercase tracking-wider">{playlist.songCount || 'Mix'}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Top Songs */}
                <section>
                    <h2 className="text-3xl font-bold text-white mb-8">Biggest Hits</h2>
                    {/* FIX 5: Empty Result UX */}
                    {!loading && songs.length === 0 && playlists.length === 0 && (
                        <p className="text-white/40 text-center py-20">
                            No results found for this decade.
                        </p>
                    )}
                    {loading ? (
                        <div className="space-y-4">
                            {Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            {songs.map((song, i) => (
                                <TrackRow
                                    key={i}
                                    track={{
                                        id: song.id,
                                        title: song.name,
                                        artist: song.primaryArtists,
                                        duration: Number(song.duration || 0),
                                        art: getArt(song),
                                        original: song
                                    }}
                                    index={i}
                                    onPlay={() => {
                                        playInstantMix({
                                            id: `decade-${decade.id}-song-${i}-${Date.now()}`, // FIX 3: Unique ID
                                            title: decade.name,
                                            color: 'purple',
                                            songs: songs.slice(i).map(s => ensurePlayableTrack(s)), // FIX: Safety
                                            currentSongIndex: 0
                                        });
                                    }}
                                    colors={colors}
                                    isPlaying={false}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <div className="h-32" />
        </div>
    );
}
