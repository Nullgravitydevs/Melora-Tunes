"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, ArrowLeft, Loader2 } from "lucide-react";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchSongs, searchPlaylists, JioSaavnSong } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt, TrackData } from "./DiscoveryShared";
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { SignalStore } from "@/lib/signal-store";
import { HistoryStore } from "@/lib/history-store";

// Extended Mood with signal data (optional fallback)
interface Mood {
    id: string;
    name: string;
    gradient: string;
    icon: string;
    energy?: number;
    valence?: number;
    tags?: string[];
}

interface MoodDetailScreenProps {
    mood: Mood;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onOpenPlaylist?: (playlist: any) => void;
    languageContext?: string;
}

export function MoodDetailScreen({ mood, colors, onBack, onOpenPlaylist, languageContext = 'english,hindi' }: MoodDetailScreenProps) {
    const { playInstantMix, currentTrack, activeMix, isPlaying } = usePlayback();
    const langContext = languageContext || 'english,hindi';

    // UI State
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Derived Logic for Radio State
    const stableMixId = `mood-radio-${mood.id}`;
    const radioStarted = activeMix?.id === stableMixId && isPlaying;

    // Fetch Preview Content
    useEffect(() => {
        const fetchMoodContent = async () => {
            setLoading(true);
            try {
                // Signal Explicit Visit
                // Valid Intent Signal: Use System ID to prevent fake track errors
                SignalStore.addSignal({ id: `mood_visit_${mood.id}`, artist: 'System' } as any, 'CLICK', 'mood_detail');

                const [moodPlaylists, moodSongs] = await Promise.all([
                    searchPlaylists(`${mood.name} playlist`, 1, 10, langContext),
                    searchSongs(`${mood.name} songs`, 1, 20, langContext)
                ]);

                setPlaylists(moodPlaylists.slice(0, 8));
                setSongs(moodSongs);
            } catch (e) {
                console.error("Failed to load mood content:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMoodContent();
    }, [mood.id, mood.name, langContext]);

    // --- MAIN ACTION: START RADIO (Discovery Engine) ---
    const handleStartRadio = async () => {
        if (isGenerating || radioStarted) return;
        setIsGenerating(true);

        try {
            // 1. Signal Context Intent
            SignalStore.addSignal({ id: `context:mood:${mood.id}`, artist: 'System' } as any, 'PLAY', 'mood_radio_start');

            // 2. Select Seed Logic
            // Priority: Current Track (if fits mood?) > Specific Mood Song > History
            // We bias towards a relevant song from the mood search to ensure vibe match.

            let seed = songs.length > 0
                ? ensurePlayableTrack(songs[Math.floor(Math.random() * Math.min(5, songs.length))])
                : null;

            // Fallback: Use current track if available and no mood songs found
            if (!seed && currentTrack) seed = currentTrack;

            // 3. Generate Mix via Engine
            if (seed) {
                // Pass language context to Discovery Engine
                const mix = await DiscoveryEngine.generateSessionMix(seed, langContext);

                // Branding Overlay: Rewrite title/id to reflect Mood Mode
                mix.id = stableMixId;
                mix.title = `${mood.name} Radio`;
                mix.color = 'purple';

                playInstantMix(mix);
                HistoryStore.addToHistory(seed, { source: 'mood_radio', moodId: mood.id } as any);
            } else {
                console.warn("Mood Radio: No seed available, falling back to shuffle");
                fallbackShuffle();
            }

        } catch (e) {
            console.error("Mood Radio Failed", e);
            fallbackShuffle();
        } finally {
            setIsGenerating(false);
        }
    };

    // Fallback: Manual Shuffle (Legacy)
    const fallbackShuffle = () => {
        if (songs.length === 0) return;
        const shuffled = [...songs]
            .sort(() => Math.random() - 0.5)
            .slice(0, 25)
            .map(s => ensurePlayableTrack(s));

        playInstantMix({
            id: `mood-${mood.id}-fallback-${Date.now()}`,
            title: `${mood.name} Mix`,
            color: 'pink',
            songs: shuffled,
            currentSongIndex: 0
        });
    };

    // Play Specific Song (Preview Mode)
    const handlePlaySong = (song: JioSaavnSong, index: number) => {
        const queuedSongs = songs.slice(index);

        SignalStore.addSignal(ensurePlayableTrack(song), 'PLAY', 'mood_preview');

        playInstantMix({
            id: `mood-preview-${mood.id}-${Date.now()}`,
            title: `${mood.name} Preview`,
            color: 'pink',
            songs: queuedSongs.map(s => ensurePlayableTrack(s)),
            currentSongIndex: 0
        });
    };

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
                    disabled={loading || songs.length === 0 || isGenerating}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-full shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {(radioStarted || isGenerating) ? (
                        <>
                            <Loader2 size={22} className="animate-spin" />
                            <span>{isGenerating ? 'Tuning Station...' : 'Radio Playing'}</span>
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

            {/* Content Preview */}
            <div className="px-6 md:px-12 py-8 space-y-12 relative z-10 -mt-16">

                {/* Section A: Top Playlists */}
                {playlists.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Top {mood.name} Playlists</h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                            {loading ? (
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
                                                loading="lazy"
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
                    </div>

                    {loading ? (
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
                            {songs.slice(0, 15).map((song, index) => {
                                // Convert to UI Model
                                const trackData: TrackData = {
                                    id: song.id,
                                    title: song.name,
                                    artist: song.primaryArtists,
                                    duration: typeof song.duration === 'string' ? parseInt(song.duration) : song.duration,
                                    art: getArt(song),
                                    original: song
                                };

                                return (
                                    <TrackRow
                                        key={song.id}
                                        index={index + 1}
                                        track={trackData}
                                        colors={colors}
                                        isPlaying={false}
                                        onPlay={() => handlePlaySong(song, index)}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-white/50 text-center py-8">No songs found for this mood</p>
                    )}
                </section>
                <div className="h-32" />
            </div>
        </div>
    );
}

