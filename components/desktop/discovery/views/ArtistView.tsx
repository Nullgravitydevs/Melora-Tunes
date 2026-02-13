"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, Clock, ArrowLeft, Music, MoreHorizontal, User, AlertCircle, RefreshCcw, BadgeCheck, Info } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getArtistDetails, JioSaavnSong } from "@/lib/jiosaavn";
import { shuffleArray, getArt } from "@/lib/helpers";
import { HorizontalScroll, StandardCard, SectionHeader, VibeAlbumCard } from "../home/HomeComponents";
import { decodeHtml } from "@/lib/utils";

/* ============================================================================
   ARTIST VIEW - Artist Detail Page
   ============================================================================ */

interface ArtistViewProps {
    artist: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

export function ArtistView({ artist, onBack, onNavigate, onContextMenu }: ArtistViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId, isLiked, toggleLike, showToast, isArtistFollowed, toggleFollowArtist } = usePlayback();
    const [bio, setBio] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [artistData, setArtistData] = useState<any>(null);
    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [albums, setAlbums] = useState<any[]>([]);
    const [similar, setSimilar] = useState<any[]>([]);
    const [bioExpanded, setBioExpanded] = useState(false);

    const artistName = artist?.name || artist?.primaryArtists || 'Unknown Artist';
    const artistImage = getArt(artist);

    // Fetch artist profile
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // If it's a JioSaavn object, it might have an ID. If string, we search.
                let id = artist?.id;
                if (!id) {
                    const search = await import("@/lib/jiosaavn").then(m => m.searchArtists(artistName, 1, 1));
                    id = search[0]?.id;
                }

                if (id) {
                    const details = await getArtistDetails(id);
                    if (details) {
                        setArtistData(details);
                        setSongs(details.topSongs || []);
                        setAlbums(details.topAlbums || []);
                        setSimilar(details.similarArtists || []);
                        setBio(details.bio || []);
                    }
                } else {
                    // Fallback to basic search if no ID found
                    const { searchSongs } = await import("@/lib/jiosaavn");
                    const results = await searchSongs(artistName, 30);
                    setSongs(results);
                }
            } catch {
                setError("Failed to load artist profile.");
            } finally {
                setIsLoading(false);
            }
        };
        setError(null);
        load();
    }, [artistName, artist?.id, retryCount]);

    // FIX 1: Stable artist mix ID to prevent memory leak
    const ARTIST_MIX_ID = `artist-${artist?.id || artistName}`;

    // Play all
    const playAll = (shuffle = false) => {
        if (songs.length === 0) return;
        const list = shuffle ? shuffleArray(songs) : songs;
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

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="relative h-[440px] overflow-hidden">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

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
                <div className="absolute inset-x-8 bottom-12 flex items-end gap-8">
                    {artistImage ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 shrink-0"
                        >
                            <img src={artistImage} alt="" className="w-full h-full object-cover" />
                        </motion.div>
                    ) : (
                        <div className="w-48 h-48 rounded-full bg-white/5 flex items-center justify-center shrink-0 border-4 border-white/5">
                            <User size={80} className="text-white/10" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            {artistData?.isVerified && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                    <BadgeCheck size={12} /> Verified
                                </div>
                            )}
                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Artist Profile</span>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4 truncate">{artistName}</h1>

                        <div className="flex items-center gap-6">
                            {artistData?.followerCount && (
                                <div className="flex flex-col">
                                    <span className="text-white font-bold">{parseInt(artistData.followerCount).toLocaleString()}</span>
                                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Followers</span>
                                </div>
                            )}
                            <button
                                onClick={() => toggleFollowArtist(artistData || artist)}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${isArtistFollowed(artist?.id || artistData?.id) ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:border-white'}`}
                            >
                                {isArtistFollowed(artist?.id || artistData?.id) ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ARTIST ACTION BAR */}
            <div className="px-8 py-8 flex items-center gap-6 sticky top-0 bg-black/40 backdrop-blur-xl z-30 -mt-2">
                <motion.button
                    onClick={() => playAll()}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
                >
                    <Play fill="currentColor" size={28} className="ml-1" />
                </motion.button>

                <motion.button
                    onClick={() => playAll(true)}
                    className="p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    whileHover={{ rotate: 15 }}
                >
                    <Shuffle size={24} />
                </motion.button>
            </div>

            {/* ARTIST CONTENT */}
            <div className="space-y-16 pb-40 min-h-[600px]">
                {isLoading ? (
                    <div className="px-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. TOP SONGS */}
                        {songs.length > 0 && (
                            <section className="px-8">
                                <SectionHeader title="Popular Songs" subtitle="Top Tracks" />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1">
                                    {songs.map((song, i) => {
                                        const active = currentSong?.id === song.id;
                                        return (
                                            <motion.div
                                                key={song.id + i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => {
                                                    if (active && activeMixId === ARTIST_MIX_ID) {
                                                        togglePlay();
                                                    } else {
                                                        playSong(i);
                                                    }
                                                }}
                                                draggable={true}
                                                // @ts-expect-error
                                                onDragStart={(e: React.DragEvent) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify(song));
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                }}
                                                onContextMenu={(e) => onContextMenu && onContextMenu(e, song)}
                                                className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors ${active ? 'bg-white/5' : ''}`}
                                            >
                                                <div className="w-6 text-center text-white/20 text-sm font-mono group-hover:hidden">{(i + 1).toString().padStart(2, '0')}</div>
                                                <div className="w-6 text-center hidden group-hover:block border border-white/40 rounded-full h-6 w-6 flex items-center justify-center">
                                                    {active && isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
                                                </div>

                                                <div className="w-12 h-12 rounded overflow-hidden bg-white/5 shrink-0">
                                                    <img src={typeof song.image === 'string' ? song.image : (song.image?.[0]?.link || '')} className="w-full h-full object-cover" alt="" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold truncate ${active ? 'text-blue-400' : 'text-white'}`}>{decodeHtml(song.name)}</p>
                                                    <p className="text-xs text-white/40 truncate">{song.album?.name || 'Single'}</p>
                                                </div>

                                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100">
                                                    <button onClick={(e) => { e.stopPropagation(); toggleLike(song); }} className="transition-colors">
                                                        <Heart size={16} className={isLiked(song.id) ? 'text-white fill-white' : 'text-white/20 hover:text-white'} />
                                                    </button>
                                                    <span className="text-xs font-mono text-white/20">{song.duration ? `${Math.floor(Number(song.duration) / 60)}:${(Number(song.duration) % 60).toString().padStart(2, '0')}` : '--:--'}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* 2. DISCOGRAPHY */}
                        {albums.length > 0 && (
                            <section>
                                <SectionHeader title="Discography" subtitle="Released Albums" onSeeAll={() => onNavigate({ id: 'search', data: { query: artistName + ' albums' } })} />
                                <HorizontalScroll>
                                    {albums.map((album, i) => (
                                        <VibeAlbumCard
                                            key={album.id || i}
                                            item={album}
                                            onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                                        />
                                    ))}
                                </HorizontalScroll>
                            </section>
                        )}

                        {/* 3. ABOUT / BIO */}
                        {bio.length > 0 && (
                            <section className="px-8">
                                <SectionHeader title={`About ${artistName}`} />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="glass-card p-8 rounded-3xl border border-white/5 relative overflow-hidden group cursor-pointer"
                                    onClick={() => setBioExpanded(!bioExpanded)}
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Info size={120} />
                                    </div>
                                    <div className="max-w-3xl relative z-10">
                                        <p className={`text-white/60 leading-relaxed text-lg transition-all duration-300 ${bioExpanded ? '' : 'line-clamp-4'}`}>
                                            {bio.map((b: any) => b.text).join(' ')}
                                        </p>
                                        <button onClick={(e) => { e.stopPropagation(); setBioExpanded(!bioExpanded); }} className="mt-6 text-sm font-bold uppercase tracking-widest text-white hover:text-blue-400 transition-colors">
                                            {bioExpanded ? 'Show Less' : 'Read Full Biography'}
                                        </button>
                                    </div>
                                </motion.div>
                            </section>
                        )}

                        {/* 4. SIMILAR ARTISTS */}
                        {similar.length > 0 && (
                            <section>
                                <SectionHeader title="Fans Also Like" subtitle="Similar Artists" />
                                <HorizontalScroll>
                                    {similar.map((art, i) => (
                                        <StandardCard
                                            key={art.id || i}
                                            item={art}
                                            index={i}
                                            subtitle="Artist"
                                            onClick={() => onNavigate({ id: 'artist', data: art })}
                                        />
                                    ))}
                                </HorizontalScroll>
                            </section>
                        )}
                    </>
                )}

                {error && (
                    <div className="py-20 text-center">
                        <AlertCircle size={48} className="mx-auto text-red-500 mb-4 opacity-20" />
                        <h2 className="text-xl font-bold text-white mb-2">Failed to load profile</h2>
                        <p className="text-white/40 mb-8">{error}</p>
                        <button onClick={() => { setError(null); setRetryCount(c => c + 1); }} className="px-10 py-3 bg-white text-black font-bold rounded-full">Refresh View</button>
                    </div>
                )}
            </div>
        </div>
    );
}
