"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, ChevronLeft, Shuffle, Clock, ListMusic } from "lucide-react";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { getPlaylistDetails } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";

interface PlaylistScreenProps {
    playlistId: string;
    playlistTitle: string;
    playlistImage?: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
}

// Skeleton Row
function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 p-3 animate-pulse">
            <div className="w-8 h-4 bg-white/10 rounded" />
            <div className="w-12 h-12 bg-white/10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-white/10 rounded" />
                <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
        </div>
    );
}

export function PlaylistScreen({
    playlistId,
    playlistTitle,
    playlistImage,
    colors,
    onBack
}: PlaylistScreenProps) {
    const { playInstantMix, currentSong, isPlaying } = usePlayback();

    const [rawSongs, setRawSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isShuffled, setIsShuffled] = useState(false);

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

    // Normalize playable tracks ONCE
    const playableTracks = useMemo(() => {
        return rawSongs
            .map(s => ensurePlayableTrack(s))
            .filter((t): t is any => !!t?.song);
    }, [rawSongs]);

    const playableSongs = useMemo(
        () => playableTracks.map(t => t.song),
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
            title: playlistTitle,
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
        <div className="flex-1 flex flex-col overflow-hidden bg-black">

            {/* HEADER */}
            <div
                className="relative w-full h-[40vh] min-h-[280px] flex items-end p-8 md:p-12 overflow-hidden"
                style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.4), #000), url(${playlistImage || ""}) center/cover`
                }}
            >
                <button
                    onClick={onBack}
                    className="absolute top-8 left-8 flex items-center gap-2 text-white/90 hover:text-white font-bold text-xs uppercase tracking-widest bg-black/30 px-4 py-2 rounded-full backdrop-blur-md z-20"
                >
                    <ChevronLeft size={16} /> Back
                </button>

                <div className="relative z-10 w-full max-w-4xl flex items-end gap-8">
                    <div className="hidden md:block w-48 h-48 rounded-xl shadow-2xl overflow-hidden bg-neutral-900">
                        {playlistImage ? (
                            <img src={playlistImage} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600">
                                <ListMusic size={48} className="text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60 block mb-2">
                            Playlist
                        </span>
                        <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
                            {playlistTitle}
                        </h1>
                        <p className="text-white/60 text-sm mb-6">
                            {playableSongs.length} songs · {Math.floor(totalDuration / 60)} min
                        </p>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePlayAll}
                                disabled={loading || !playableTracks.length}
                                className="h-14 px-8 bg-white text-black rounded-full font-bold uppercase tracking-widest flex items-center gap-3 disabled:opacity-50"
                            >
                                <Play size={20} fill="black" /> Play All
                            </button>

                            <button
                                onClick={handleShuffle}
                                disabled={loading || !playableTracks.length}
                                className={`w-14 h-14 rounded-full border flex items-center justify-center
                                    ${isShuffled
                                        ? "border-white bg-white/10"
                                        : "border-white/20 hover:bg-white/10"
                                    }`}
                            >
                                <Shuffle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SONG LIST */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 [&::-webkit-scrollbar]:hidden">
                <div className="max-w-4xl">

                    <div className="flex items-center gap-4 px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4">
                        <span className="w-8 text-center">#</span>
                        <span className="flex-1">Title</span>
                        <Clock size={14} />
                    </div>

                    {loading && (
                        <div className="space-y-2">
                            {[...Array(10)].map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </div>
                    )}

                    {!loading &&
                        playableSongs.map((song, i) => (
                            <TrackRow
                                key={song.id}
                                index={i + 1}
                                track={{
                                    id: song.id,
                                    title: song.name,
                                    artist: song.primaryArtists,
                                    duration: song.duration
                                        ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
                                        : "--:--",
                                    art: getArt(song),
                                    original: song
                                }}
                                colors={colors}
                                isPlaying={
                                    (currentSong as any)?.song?.id === song.id && isPlaying
                                }
                                onPlay={() => handleSongClick(i)}
                            />
                        ))}

                    {!loading && playableSongs.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <p className="text-xl font-bold mb-2">No songs in playlist</p>
                            <p className="text-sm">This playlist is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
