"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Shuffle, ArrowLeft, Loader2, ListMusic } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { searchSongs, searchPlaylists } from "@/lib/jiosaavn";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";

interface CollectionDetailScreenProps {
    collection: { id: string; name: string; query: string; color?: string };
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onOpenPlaylist?: (playlist: any) => void;
}

export function CollectionDetailScreen({ collection, colors, onBack, onOpenPlaylist }: CollectionDetailScreenProps) {
    const { playInstantMix } = usePlayback();
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [songs, setSongs] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch relevant playlists
                const p = await searchPlaylists(collection.query + " playlist");
                setPlaylists(p.slice(0, 10));

                // Fetch relevant songs
                const s = await searchSongs(collection.query, 1, 25);
                setSongs(s || []);
            } catch (e) {
                console.error("Collection fetch failed:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [collection.id]);

    const handlePlayAll = () => {
        if (songs.length > 0) {
            playInstantMix({
                id: `collection-${collection.id}`,
                title: collection.name,
                color: 'blue',
                songs: songs,
                currentSongIndex: 0
            });
        }
    };

    const handleShuffle = () => {
        if (songs.length > 0) {
            const shuffled = [...songs].sort(() => Math.random() - 0.5);
            playInstantMix({
                id: `collection-${collection.id}-shuffle`,
                title: collection.name,
                color: 'blue',
                songs: shuffled,
                currentSongIndex: 0
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full h-full bg-black">
            {/* Header */}
            <div className="relative w-full h-[40vh] min-h-[300px] flex items-end p-8 md:p-12 overflow-hidden">
                {/* Background Art */}
                <div className="absolute inset-0 z-0">
                    {songs[0] && (
                        <img
                            src={getArt(songs[0]).replace('150x150', '500x500')}
                            className="w-full h-full object-cover opacity-60 blur-xl scale-110"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>

                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors z-20"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>

                {/* Content */}
                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-end">
                    <div className="w-48 h-48 rounded-2xl shadow-2xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                        {songs[0] ? (
                            <img src={getArt(songs[0]).replace('150x150', '500x500')} className="w-full h-full object-cover" />
                        ) : (
                            <ListMusic size={64} className="text-white/20" />
                        )}
                    </div>

                    <div className="flex-1 mb-2">
                        <p className="text-xs font-bold tracking-widest text-[#CBFB45] uppercase mb-2">Editorial Collection</p>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight leading-none">{collection.name}</h1>
                        <p className="text-white/60 text-lg max-w-xl">
                            Curated selection of {collection.query} tracks and playlists.
                        </p>

                        <div className="flex items-center gap-4 mt-6">
                            <button
                                onClick={handlePlayAll}
                                disabled={loading || songs.length === 0}
                                className="flex items-center gap-2 px-8 py-4 bg-[#CBFB45] text-black font-bold rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                <Play size={20} fill="black" />
                                Play All
                            </button>
                            <button
                                onClick={handleShuffle}
                                disabled={loading || songs.length === 0}
                                className="flex items-center gap-2 px-6 py-4 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors backdrop-blur-md disabled:opacity-50"
                            >
                                <Shuffle size={20} />
                                Shuffle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto w-full space-y-12">

                {/* Playlists */}
                {playlists.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Featured Playlists</h2>
                        <div className="flex gap-5 overflow-x-auto pb-6 [&::-webkit-scrollbar]:hidden">
                            {playlists.map((playlist, i) => (
                                <motion.div
                                    key={playlist.id || i}
                                    className="min-w-[180px] w-[180px] cursor-pointer group"
                                    whileHover={{ y: -5 }}
                                    onClick={() => onOpenPlaylist?.(playlist)}
                                >
                                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                        <img
                                            src={getArt(playlist)}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play size={32} fill="white" className="text-white" />
                                        </div>
                                    </div>
                                    <p className="font-bold text-white truncate">{playlist.name}</p>
                                    <p className="text-sm text-white/50">{playlist.songCount || ''} songs</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Song List */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-6">Top Songs</h2>
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white/50" /></div>
                    ) : (
                        <div className="space-y-1">
                            {songs.map((song, i) => (
                                <TrackRow
                                    key={i}
                                    track={{
                                        id: song.id,
                                        title: song.name,
                                        artist: song.primaryArtists,
                                        duration: song.duration ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0') : '--:--',
                                        art: getArt(song),
                                        original: { song, sources: [] }
                                    }}
                                    index={i}
                                    onPlay={() => {
                                        playInstantMix({
                                            id: `collection-${collection.id}-song-${i}`,
                                            title: collection.name,
                                            color: 'blue',
                                            songs: songs.slice(i),
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
