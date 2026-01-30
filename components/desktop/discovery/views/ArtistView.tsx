"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, Clock, ArrowLeft, Music, MoreHorizontal, User } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { searchSongs, JioSaavnSong } from "@/lib/jiosaavn";

/* ============================================================================
   ARTIST VIEW - Artist Detail Page
   ============================================================================ */

interface ArtistViewProps {
    artist: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
}

export function ArtistView({ artist, onBack, onNavigate }: ArtistViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId } = usePlayback();

    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const artistName = artist?.name || artist?.primaryArtists || 'Unknown Artist';
    const artistImage = getImage(artist);

    function getImage(item: any) {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    }

    // Fetch artist songs
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const results = await searchSongs(artistName, 30);
                setSongs(results);
            } catch (e) {
                console.error('Failed to load artist songs:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [artistName]);

    // FIX 1: Stable artist mix ID to prevent memory leak
    const ARTIST_MIX_ID = `artist-${artist?.id || artistName}`;

    // Play all
    const playAll = (shuffle = false) => {
        if (songs.length === 0) return;
        const list = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
        const newMix: Mix = {
            id: ARTIST_MIX_ID,
            title: artistName,
            color: 'white',
            songs: list,
            currentSongIndex: 0
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(ARTIST_MIX_ID, {
                songs: list,
                currentSongIndex: 0
            });
        }

        loadMix(ARTIST_MIX_ID);
    };

    // Play single song
    const playSong = (index: number) => {
        const newMix: Mix = {
            id: ARTIST_MIX_ID,
            title: artistName,
            color: 'white',
            songs: songs,
            currentSongIndex: index
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(ARTIST_MIX_ID, {
                songs,
                currentSongIndex: index
            });
        }

        loadMix(ARTIST_MIX_ID);
    };

    const getArt = (song: JioSaavnSong) => {
        if (!song?.image) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) return song.image.find(i => i.quality === '150x150')?.link || song.image[0]?.link || '';
        return '';
    };

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="relative h-[340px] overflow-hidden">
                {/* Background Blur */}
                {artistImage && (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${artistImage})`,
                            filter: 'blur(80px) brightness(0.25) saturate(0)',
                            transform: 'scale(1.5)'
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                {/* Back Button */}
                <motion.button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/40 hover:bg-black/60 z-10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                </motion.button>

                {/* Artist Info */}
                <div className="absolute bottom-8 left-8 right-8 flex items-end gap-6">
                    {artistImage ? (
                        <img src={artistImage} alt="" className="w-48 h-48 rounded-full object-cover shadow-2xl border-4 border-white/10" />
                    ) : (
                        <div className="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center">
                            <User size={48} className="text-white/30" />
                        </div>
                    )}
                    <div className="flex-1 pb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">Artist</span>
                        <h1 className="text-5xl font-bold mb-2">{artistName}</h1>
                        <p className="text-white/50">{songs.length} songs</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-6 flex items-center gap-4">
                <motion.button
                    onClick={() => playAll(false)}
                    className="px-8 py-3 bg-white text-black rounded-full font-semibold flex items-center gap-2"
                    style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <Play size={18} fill="currentColor" />
                    Play
                </motion.button>
                <motion.button
                    onClick={() => playAll(true)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/15"
                    whileTap={{ scale: 0.9 }}
                >
                    <Shuffle size={18} />
                </motion.button>
                <motion.button
                    className="p-3 rounded-full bg-white/10 hover:bg-white/15"
                    whileTap={{ scale: 0.9 }}
                >
                    <Heart size={18} />
                </motion.button>
            </div>

            {/* Songs List */}
            <div className="px-8 pb-32">
                <h2 className="text-lg font-semibold mb-4">Popular</h2>

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {songs.map((song, i) => (
                            /* FIX 3: Smart toggle - same song = pause/play, different song = switch */
                            <motion.div
                                key={song.id + i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.02 }}
                                onClick={() => {
                                    if (currentSong?.id === song.id && activeMixId === ARTIST_MIX_ID) {
                                        togglePlay();
                                    } else {
                                        playSong(i);
                                    }
                                }}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] cursor-pointer group transition-all"
                            >
                                {/* Number - FIX 2: Check activeMixId for correct icon */}
                                <span className="w-6 text-center text-sm text-white/30 group-hover:hidden">{i + 1}</span>
                                <span className="w-6 text-center hidden group-hover:block">
                                    {currentSong?.id === song.id && activeMixId === ARTIST_MIX_ID && isPlaying ? (
                                        <Pause size={14} className="text-white mx-auto" />
                                    ) : (
                                        <Play size={14} className="text-white mx-auto" fill="currentColor" />
                                    )}
                                </span>

                                {/* Art + Info */}
                                <img src={getArt(song)} alt="" className="w-12 h-12 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-white' : ''}`}>{song.name}</p>
                                    <p className="text-sm text-white/40 truncate">{song.album?.name}</p>
                                </div>

                                {/* Duration */}
                                <span className="text-sm text-white/25 tabular-nums">
                                    {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}
                                </span>

                                {/* More */}
                                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={16} className="text-white/40" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
