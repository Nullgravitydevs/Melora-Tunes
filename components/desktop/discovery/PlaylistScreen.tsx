"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, ChevronLeft, Shuffle, Clock, ListMusic, Check } from "lucide-react";
import { motion } from "framer-motion";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { getPlaylistDetails, JioSaavnSong } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt, decodeHtml, SkeletonTrackRow } from "./DiscoveryShared";
import { PlayableTrack } from "@/lib/types";

interface PlaylistScreenProps {
    playlistId: string;
    playlistTitle: string;
    playlistImage?: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
}

export function PlaylistScreen({
    playlistId,
    playlistTitle,
    playlistImage,
    colors,
    onBack
}: PlaylistScreenProps) {
    const { playInstantMix, currentSong, isPlaying } = usePlayback();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [rawSongs, setRawSongs] = useState<JioSaavnSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [isShuffled, setIsShuffled] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Stable mix id per playlist
    const mixId = useRef(`playlist-${playlistId}`);

    useEffect(() => {
        let cancelled = false;

        const fetchPlaylist = async () => {
            setLoading(true);
            try {
                const results = await getPlaylistDetails(playlistId);
                if (!cancelled) setRawSongs(results || []);
            } catch (e) {
                console.error("Failed to load playlist:", e);
                if (!cancelled) setRawSongs([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchPlaylist();
        return () => {
            cancelled = true;
        };
    }, [playlistId]);

    // Handle Scroll for sticky header
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 280);
    };

    // Normalize playable tracks ONCE
    const playableTracks = useMemo(() => {
        return rawSongs
            .map(s => ensurePlayableTrack(s))
            .filter((t): t is PlayableTrack => !!t && !!t.song);
    }, [rawSongs]);

    const playableSongs = useMemo(
        () => playableTracks.map(t => t.song!),
        [playableTracks]
    );

    const totalDuration = useMemo(
        () => playableSongs.reduce((acc, s) => acc + (s.duration || 0), 0),
        [playableSongs]
    );

    const buildPlaylistMix = (startIndex = 0, shuffled = false): Mix => {
        const list = shuffled
            ? [...playableTracks].sort(() => Math.random() - 0.5)
            : playableTracks;

        return {
            id: mixId.current,
            title: decodeHtml(playlistTitle),
            color: "green",
            songs: list,
            currentSongIndex: startIndex
        };
    };

    const handlePlayAll = () => {
        if (!playableTracks.length) return;
        setIsShuffled(false);
        playInstantMix(buildPlaylistMix(0, false));
    };

    const handleShuffle = () => {
        if (!playableTracks.length) return;
        setIsShuffled(true);
        playInstantMix(buildPlaylistMix(0, true));
    };

    const handleSongClick = (index: number) => {
        playInstantMix(buildPlaylistMix(index, isShuffled));
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-black relative">

            {/* STICKY HEADER */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 h-20 flex items-center px-6 gap-6 transition-all duration-300
                ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
            >
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center transition-colors border border-white/5"
                >
                    <ChevronLeft size={22} className="text-white" />
                </button>

                <span
                    className={`text-xl font-bold text-white transition-all duration-300 transform truncate max-w-lg
                    ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                    {decodeHtml(playlistTitle)}
                </span>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden scroll-smooth"
                onScroll={handleScroll}
            >
                {/* HERO SECTION */}
                <div className="relative h-[45vh] min-h-[350px] w-full group">
                    {/* Dynamic Blur Backdrop */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        {playlistImage && (
                            <motion.img
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 0.6, scale: 1 }}
                                transition={{ duration: 1.5 }}
                                src={playlistImage}
                                className="w-full h-full object-cover blur-3xl opacity-50"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 flex items-end gap-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-52 h-52 rounded-xl shadow-2xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 hidden md:block"
                        >
                            {playlistImage ? (
                                <img src={playlistImage} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600">
                                    <ListMusic size={64} className="text-white" />
                                </div>
                            )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 mb-3 text-white/70 text-xs font-bold uppercase tracking-widest"
                            >
                                <span>Playlist</span>
                                {playlistTitle.toLowerCase().includes('top') && (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">HOT</span>
                                )}
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-2xl line-clamp-2 leading-tight"
                            >
                                {decodeHtml(playlistTitle)}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-white/60 text-sm mb-6 flex items-center gap-2"
                            >
                                <span>{playableSongs.length} songs</span>
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span>{Math.floor(totalDuration / 60)} min</span>
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-4"
                            >
                                <button
                                    onClick={handlePlayAll}
                                    disabled={loading || !playableTracks.length}
                                    className="h-14 px-8 bg-white hover:bg-neutral-200 text-black rounded-full font-bold uppercase tracking-widest flex items-center gap-3 disabled:opacity-50 transition-colors shadow-lg"
                                >
                                    <Play size={20} fill="black" /> Play All
                                </button>

                                <button
                                    onClick={handleShuffle}
                                    disabled={loading || !playableTracks.length}
                                    className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all
                                        ${isShuffled
                                            ? "border-green-500 bg-green-500/20 text-green-500"
                                            : "border-white/20 hover:bg-white/10 text-white"
                                        }`}
                                >
                                    <Shuffle size={20} />
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* SONG LIST CONTAINER */}
                <div className="px-6 md:px-12 py-8 bg-black min-h-[50vh]">
                    <div className="max-w-5xl">
                        <div className="flex items-center gap-4 px-4 py-2 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4">
                            <span className="w-8 text-center">#</span>
                            <span className="flex-1">Title</span>
                            <Clock size={14} />
                        </div>

                        {loading && (
                            <div className="space-y-2">
                                {[...Array(10)].map((_, i) => (
                                    <SkeletonTrackRow key={i} />
                                ))}
                            </div>
                        )}

                        {!loading && playableSongs.map((song, i) => (
                            <TrackRow
                                key={song.id}
                                index={i + 1}
                                track={{
                                    id: song.id,
                                    title: decodeHtml(song.name),
                                    artist: decodeHtml(song.primaryArtists),
                                    duration: song.duration
                                        ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
                                        : "--:--",
                                    art: getArt(song),
                                    original: song,
                                    quality: playableTracks[i]?.preferredQuality // Pass quality
                                }}
                                colors={colors}
                                isPlaying={currentSong?.id === song.id && isPlaying}
                                onPlay={() => handleSongClick(i)}
                            />
                        ))}

                        {!loading && playableSongs.length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <p className="text-xl font-bold mb-2">No songs found</p>
                                <p className="text-sm">This playlist appears empty or failed to load.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
