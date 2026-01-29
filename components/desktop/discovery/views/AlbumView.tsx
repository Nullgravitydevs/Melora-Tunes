"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, ArrowLeft, Music, MoreHorizontal, Clock, Disc } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getAlbumDetails, JioSaavnSong } from "@/lib/jiosaavn";

/* ============================================================================
   ALBUM VIEW - Album Detail Page
   ============================================================================ */

interface AlbumViewProps {
    album: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
}

export function AlbumView({ album, onBack, onNavigate }: AlbumViewProps) {
    const { addMix, loadMix, currentSong, isPlaying, togglePlay } = usePlayback();

    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [albumData, setAlbumData] = useState<any>(album);

    const albumName = albumData?.name || albumData?.title || 'Unknown Album';
    const artistName = albumData?.primaryArtists || albumData?.subtitle || '';
    const albumImage = getImage(albumData);
    const year = albumData?.year || '';

    function getImage(item: any) {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    }

    // Fetch album details
    useEffect(() => {
        const load = async () => {
            if (!album?.id) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const details = await getAlbumDetails(album.id);
                if (details) {
                    setAlbumData(details);
                    // Handle both array and object response types
                    const songList = Array.isArray(details) ? details : (details as any).songs || [];
                    setSongs(songList);
                }
            } catch (e) {
                console.error('Failed to load album:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [album?.id]);

    // Calculate total duration
    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const formatDuration = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours} hr ${mins % 60} min`;
        return `${mins} min`;
    };

    // Play all
    const playAll = (shuffle = false) => {
        if (songs.length === 0) return;
        const list = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
        const mixId = `album-${Date.now()}`;
        const newMix: Mix = {
            id: mixId,
            title: albumName,
            color: 'white',
            songs: list,
            currentSongIndex: 0
        };
        addMix(newMix);
        setTimeout(() => loadMix(mixId), 50);
    };

    // Play single song
    const playSong = (song: JioSaavnSong, index: number) => {
        const mixId = `album-${Date.now()}`;
        const newMix: Mix = {
            id: mixId,
            title: albumName,
            color: 'white',
            songs: songs,
            currentSongIndex: index
        };
        addMix(newMix);
        setTimeout(() => loadMix(mixId), 50);
    };

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="relative h-[360px] overflow-hidden">
                {/* Background Blur */}
                {albumImage && (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${albumImage})`,
                            filter: 'blur(80px) brightness(0.2) saturate(0)',
                            transform: 'scale(1.5)'
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                {/* Back Button */}
                <motion.button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/40 hover:bg-black/60 z-10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                </motion.button>

                {/* Album Info */}
                <div className="absolute bottom-8 left-8 right-8 flex items-end gap-6">
                    {albumImage ? (
                        <motion.img
                            src={albumImage}
                            alt=""
                            className="w-52 h-52 rounded-xl object-cover shadow-2xl"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        />
                    ) : (
                        <div className="w-52 h-52 rounded-xl bg-white/10 flex items-center justify-center">
                            <Disc size={48} className="text-white/30" />
                        </div>
                    )}
                    <div className="flex-1 pb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">Album</span>
                        <h1 className="text-4xl font-bold mb-2 line-clamp-2">{albumName}</h1>
                        <p className="text-white/50 mb-1">{artistName}</p>
                        <p className="text-sm text-white/30">
                            {year && `${year} • `}{songs.length} songs • {formatDuration(totalDuration)}
                        </p>
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

            {/* Track List */}
            <div className="px-8 pb-32">
                {/* Header */}
                <div className="flex items-center gap-4 px-3 py-2 text-xs text-white/30 uppercase tracking-wider border-b border-white/5 mb-2">
                    <span className="w-6 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <Clock size={14} />
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {songs.map((song, i) => (
                            <motion.div
                                key={song.id + i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.015 }}
                                onClick={() => playSong(song, i)}
                                className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/[0.04] cursor-pointer group transition-all"
                            >
                                {/* Number / Play */}
                                <span className="w-6 text-center text-sm text-white/30 group-hover:hidden">{i + 1}</span>
                                <span className="w-6 text-center hidden group-hover:block">
                                    {currentSong?.id === song.id && isPlaying ? (
                                        <Pause size={14} className="text-white mx-auto" />
                                    ) : (
                                        <Play size={14} className="text-white mx-auto" fill="currentColor" />
                                    )}
                                </span>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-white' : 'text-white/80'}`}>
                                        {song.name}
                                    </p>
                                    <p className="text-sm text-white/40 truncate">{song.primaryArtists}</p>
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
