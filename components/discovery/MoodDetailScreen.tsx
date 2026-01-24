"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Shuffle, ArrowLeft, Radio, Loader2 } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { searchSongs, searchPlaylists } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";

interface Mood {
    id: string;
    name: string;
    gradient: string;
    icon: string;
}

interface MoodDetailScreenProps {
    mood: Mood;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onOpenPlaylist?: (playlist: any) => void;
}

export function MoodDetailScreen({ mood, colors, onBack, onOpenPlaylist }: MoodDetailScreenProps) {
    const { playInstantMix } = usePlayback();
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [songs, setSongs] = useState<any[]>([]);
    const [radioStarted, setRadioStarted] = useState(false);

    // Fetch mood content
    useEffect(() => {
        const fetchMoodContent = async () => {
            setLoading(true);
            try {
                // Fetch playlists for this mood
                const moodPlaylists = await searchPlaylists(`${mood.name} playlist`);
                setPlaylists(moodPlaylists.slice(0, 8));

                // Fetch songs for this mood
                const moodSongs = await searchSongs(`${mood.name} songs`, 1, 20);
                setSongs(moodSongs);
            } catch (e) {
                console.error("Failed to load mood content:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMoodContent();
    }, [mood.id]);

    // Start Radio - plays infinite queue based on mood
    const handleStartRadio = async () => {
        if (songs.length === 0) return;
        setRadioStarted(true);

        // Shuffle songs for variety
        const shuffled = [...songs].sort(() => Math.random() - 0.5);

        // Create mix with mood name
        playInstantMix({
            id: `mood-radio-${mood.id}`,
            title: `${mood.name} Radio`,
            color: 'purple',
            songs: shuffled,
            currentSongIndex: 0
        });
    };

    // Play selected song and queue rest
    const handlePlaySong = (song: any, index: number) => {
        const queuedSongs = songs.slice(index);
        playInstantMix({
            id: `mood-${mood.id}-from-${index}`,
            title: `${mood.name} Mix`,
            color: 'pink',
            songs: queuedSongs,
            currentSongIndex: 0
        });
    };

    const c = colors;

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full h-full bg-black">
            {/* Header with Gradient */}
            <div
                className={`relative w-full min-h-[45vh] flex flex-col items-center justify-end p-8 md:p-12 bg-gradient-to-br ${mood.gradient}`}
            >
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors z-20"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>

                {/* Mood Icon */}
                <div className="text-8xl mb-4 drop-shadow-2xl">{mood.icon}</div>

                {/* Mood Title */}
                <h1 className="text-5xl md:text-6xl font-black text-white text-center mb-2 drop-shadow-lg">
                    {mood.name}
                </h1>
                <p className="text-white/70 text-lg mb-8">Music for {mood.name.toLowerCase()} vibes</p>

                {/* Start Radio Button */}
                <motion.button
                    onClick={handleStartRadio}
                    disabled={loading || songs.length === 0}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-full shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {radioStarted ? (
                        <>
                            <Radio size={22} className="animate-pulse" />
                            <span>Radio Playing</span>
                        </>
                    ) : (
                        <>
                            <Play size={22} fill="black" />
                            <span>Start Radio</span>
                        </>
                    )}
                </motion.button>

                {/* Gradient Fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
            </div>

            {/* Content */}
            <div className="px-6 md:px-12 py-8 space-y-12 relative z-10 -mt-16">

                {/* Section A: Top Playlists */}
                {playlists.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Top {mood.name} Playlists</h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                            {loading ? (
                                // Skeleton Loaders
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="min-w-[180px] w-[180px] animate-pulse">
                                        <div className="w-full aspect-square rounded-xl bg-white/10 mb-3" />
                                        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                                        <div className="h-3 bg-white/10 rounded w-1/2" />
                                    </div>
                                ))
                            ) : (
                                playlists.map((playlist, i) => (
                                    <motion.div
                                        key={playlist.id || i}
                                        className="min-w-[180px] w-[180px] cursor-pointer group"
                                        whileHover={{ y: -5 }}
                                        onClick={() => onOpenPlaylist?.(playlist)}
                                    >
                                        <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 relative shadow-xl">
                                            <img
                                                src={getArt(playlist)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={playlist.name}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Play size={32} fill="white" className="text-white" />
                                            </div>
                                        </div>
                                        <p className="font-bold text-white truncate">{playlist.name}</p>
                                        <p className="text-sm text-white/50">{playlist.songCount || playlist.list_count || ''} songs</p>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Section B: Top Songs */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Top {mood.name} Songs</h2>
                        {songs.length > 0 && (
                            <button
                                onClick={handleStartRadio}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                            >
                                <Shuffle size={16} />
                                Shuffle All
                            </button>
                        )}
                    </div>

                    {loading ? (
                        // Skeleton Loaders
                        <div className="space-y-2">
                            {Array(8).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-lg animate-pulse">
                                    <div className="w-12 h-12 rounded-lg bg-white/10" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                                        <div className="h-3 bg-white/10 rounded w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : songs.length > 0 ? (
                        <div className="space-y-1">
                            {songs.slice(0, 15).map((song, index) => (
                                <motion.div
                                    key={song.id || index}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                                    whileHover={{ x: 4 }}
                                    onClick={() => handlePlaySong(song, index)}
                                >
                                    {/* Track Number */}
                                    <span className="w-6 text-center text-white/40 group-hover:hidden">{index + 1}</span>
                                    <Play size={16} className="w-6 hidden group-hover:block text-white" />

                                    {/* Cover */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={getArt(song)} className="w-full h-full object-cover" alt={song.name} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white truncate">{song.name}</p>
                                        <p className="text-sm text-white/50 truncate">{song.primaryArtists}</p>
                                    </div>

                                    {/* Duration */}
                                    <span className="text-sm text-white/40">
                                        {song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : ''}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/50 text-center py-8">No songs found for this mood</p>
                    )}
                </section>

                {/* Bottom Padding */}
                <div className="h-32" />
            </div>
        </div>
    );
}
