"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, ArrowLeft, MoreHorizontal, Clock, Disc3, AlertCircle, RefreshCcw } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getAlbumDetails, getArtistDetails, JioSaavnSong, searchAlbums } from "@/lib/jiosaavn";
import { HorizontalScroll, StandardCard, SectionHeader, VibeAlbumCard } from "../home/HomeComponents";
import { decodeHtml } from "@/lib/utils";

interface AlbumViewProps {
    album: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

export function AlbumView({ album, onBack, onNavigate, onContextMenu }: AlbumViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId, toggleSaveAlbum, isAlbumSaved, togglePin, mixes, showToast } = usePlayback();

    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [moreFromArtist, setMoreFromArtist] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

    useEffect(() => {
        const load = async () => {
            if (!album?.id) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const details = await getAlbumDetails(album.id);
                if (details) {
                    const data = details as any;
                    setAlbumData(data);
                    const songList = Array.isArray(details) ? details : (details as any).songs || [];
                    setSongs(songList);

                    // Fetch more from artist
                    if (data.primaryArtistsId) {
                        const artistDetails = await getArtistDetails(data.primaryArtistsId);
                        if (artistDetails?.topAlbums) {
                            setMoreFromArtist(artistDetails.topAlbums.filter((a: any) => a.id !== album.id));
                        }
                    } else if (data.primaryArtists) {
                        const results = await searchAlbums(data.primaryArtists, 1, 10);
                        setMoreFromArtist(results.filter((a: any) => a.id !== album.id));
                    }
                }
            } catch {
                setError("Failed to load album tracks.");
            } finally {
                setIsLoading(false);
            }
        };
        setError(null);
        load();
    }, [album?.id]);

    const ALBUM_MIX_ID = `album-${albumData?.id || 'unknown'}`;

    const newMixTemplate = (list = songs) => ({ id: ALBUM_MIX_ID, title: albumName, color: 'white' as const, songs: list, currentSongIndex: 0 });

    const playAll = (shuffle = false) => {
        if (songs.length === 0) return;
        const list = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
        const newMix: Mix = newMixTemplate(list);
        const added = addMix(newMix);
        if (!added) updateMix(ALBUM_MIX_ID, { songs: list, currentSongIndex: 0 });
        loadMix(ALBUM_MIX_ID);
    };

    const playSong = (index: number) => {
        const newMix: Mix = { id: ALBUM_MIX_ID, title: albumName, color: 'white', songs: songs, currentSongIndex: index };
        const added = addMix(newMix);
        if (!added) updateMix(ALBUM_MIX_ID, { songs, currentSongIndex: index });
        loadMix(ALBUM_MIX_ID);
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-black text-white">

            {/* BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-60 scale-125 blur-[80px] saturate-[1.5]" style={{ backgroundImage: `url(${albumImage})` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black" />
            </div>

            {/* HEADER (Compact) */}
            <div className="relative z-50 px-4 py-3">
                <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all active:scale-95">
                    <ArrowLeft size={18} className="text-white/80" />
                </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pb-20">

                {/* === COMPACT HERO === */}
                <div className="flex items-end gap-6 px-6 mb-4">

                    {/* ALBUM ART + REALISTIC SILVER CD */}
                    <div className="relative flex-shrink-0">
                        {/* CD (Realistic Silver) */}
                        <motion.div
                            className="absolute top-1 left-1 w-[180px] h-[180px] rounded-full shadow-xl"
                            style={{ x: 50 }}
                            animate={isPlaying && activeMixId === ALBUM_MIX_ID ? { rotate: 360 } : { rotate: 0 }}
                            transition={isPlaying && activeMixId === ALBUM_MIX_ID ? { duration: 10, ease: "linear", repeat: Infinity } : { duration: 0.3 }}
                        >
                            <div className="w-full h-full rounded-full relative overflow-hidden">
                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#c0c0c0,#e8e8e8,#a0a0a0,#e8e8e8,#c0c0c0)] rounded-full" />
                                <div className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay" style={{ background: `conic-gradient(from 0deg, transparent 0%, #ff0000 10%, #00ff00 20%, #0000ff 30%, transparent 40%)` }} />
                                <div className="absolute inset-0 rounded-full opacity-30" style={{ background: 'repeating-radial-gradient(transparent 0, transparent 1.5px, #000 2px)' }} />
                                <div className="absolute top-[35%] left-[35%] w-[30%] h-[30%] rounded-full overflow-hidden border-2 border-neutral-300/20">
                                    <img src={albumImage} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute top-[46.5%] left-[46.5%] w-[7%] h-[7%] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]" />
                            </div>
                        </motion.div>

                        {/* SLEEVE */}
                        <motion.div className="relative w-[185px] h-[185px] rounded-md shadow-2xl z-10 overflow-hidden" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <img src={albumImage} alt={albumName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.3)] pointer-events-none" />
                        </motion.div>
                    </div>

                    {/* METADATA (Tight) */}
                    <div className="flex-1 pb-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white/70 mb-1">Album</span>
                        <h1 className="text-2xl font-black tracking-tight text-white leading-tight truncate">{decodeHtml(albumName)}</h1>
                        <p className="text-white/60 text-sm truncate">{decodeHtml(artistName)}</p>
                        <p className="text-white/40 text-xs mt-0.5">{year}{year && songs.length ? ' • ' : ''}{songs.length} Songs</p>

                        {/* ACTIONS (Inline) */}
                        <div className="flex items-center gap-2 mt-3">
                            <motion.button onClick={() => playAll(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-5 py-2 bg-white text-black rounded-full font-bold text-sm tracking-wide shadow-lg flex items-center gap-1.5">
                                <Play fill="currentColor" size={16} /> PLAY
                            </motion.button>
                            <motion.button onClick={() => playAll(true)} whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-black border border-white/10 flex items-center justify-center hover:border-white/30 text-white/80 transition-colors"><Shuffle size={16} /></motion.button>
                            <motion.button
                                onClick={() => toggleSaveAlbum(albumData)}
                                whileTap={{ scale: 0.9 }}
                                className={`w-9 h-9 rounded-full bg-black border flex items-center justify-center transition-colors ${isAlbumSaved(albumData?.id) ? 'border-primary text-primary' : 'border-white/10 hover:border-white/30 text-white/80'}`}
                            >
                                <Heart size={16} fill={isAlbumSaved(albumData?.id) ? "currentColor" : "none"} className={isAlbumSaved(albumData?.id) ? "text-red-500" : ""} />
                            </motion.button>
                            {/* Pin Button */}
                            <motion.button
                                onClick={() => {
                                    const existingMix = mixes.find(m => m.id === ALBUM_MIX_ID);
                                    if (existingMix) {
                                        togglePin(ALBUM_MIX_ID);
                                    } else {
                                        const newMix: Mix = { ...newMixTemplate(), pinned: true };
                                        addMix(newMix); // Auto-add and pin
                                        showToast(`Pinned "${albumName}" to Deck`, 'success');
                                    }
                                }}
                                whileTap={{ scale: 0.9 }}
                                className={`w-9 h-9 rounded-full bg-black border flex items-center justify-center transition-colors ${mixes.find(m => m.id === ALBUM_MIX_ID)?.pinned ? 'border-blue-500 text-blue-500' : 'border-white/10 hover:border-white/30 text-white/80'}`}
                            >
                                <div className="relative">
                                    <Disc3 size={16} className={mixes.find(m => m.id === ALBUM_MIX_ID)?.pinned ? "text-blue-500" : ""} />
                                    {mixes.find(m => m.id === ALBUM_MIX_ID)?.pinned && (
                                        <motion.div
                                            layoutId="pinned-badge-album"
                                            className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                                        />
                                    )}
                                </div>
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* === GLASS TRACKLIST (Compact) === */}
                <div className="px-4 mt-8">
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl">
                        {/* Header Row */}
                        <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5">
                            <span className="w-5 text-center">#</span>
                            <span>Title</span>
                            <Clock size={10} className="ml-auto" />
                        </div>

                        {/* Songs */}
                        {isLoading ? (
                            <div className="space-y-1 p-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />)}</div>
                        ) : error ? (
                            <div className="p-12 text-center">
                                <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
                                <h3 className="text-lg font-bold text-white mb-2">Error Loading Album</h3>
                                <p className="text-white/40 text-sm mb-6">{error}</p>
                                <button
                                    onClick={() => { setError(null); setIsLoading(true); const reload = async () => { try { const details = await getAlbumDetails(album?.id); if (details) { setAlbumData(details); setSongs(Array.isArray(details) ? details : (details as any).songs || []); } } catch { setError('Failed to load album tracks.'); } finally { setIsLoading(false); } }; reload(); }}
                                    className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors mx-auto text-sm"
                                >
                                    <RefreshCcw size={16} />
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {songs.map((song, i) => {
                                    const isActive = currentSong?.id === song.id && activeMixId === ALBUM_MIX_ID;
                                    return (
                                        <motion.div key={song.id + i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}
                                            onClick={() => isActive ? togglePlay() : playSong(i)}
                                            draggable={true}
                                            // @ts-ignore
                                            onDragStart={(e: React.DragEvent) => {
                                                e.dataTransfer.setData('application/json', JSON.stringify(song));
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            onContextMenu={(e) => onContextMenu && onContextMenu(e, song)}
                                            className={`group flex items-center gap-3 p-2.5 cursor-pointer transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                            <div className="w-5 flex items-center justify-center">
                                                {isActive && isPlaying ? <Disc3 className="animate-spin text-white" size={14} /> : <span className={`font-mono text-[10px] ${isActive ? 'text-white font-bold' : 'text-white/40'}`}>{i + 1}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white font-bold' : 'text-white'}`}>{decodeHtml(song.name)}</h4>
                                                <p className="text-white/40 text-[10px] truncate">{decodeHtml(song.primaryArtists)}</p>
                                            </div>
                                            <span className="text-white/30 text-[10px] font-mono">{song.duration ? `${Math.floor(Number(song.duration) / 60)}:${(Number(song.duration) % 60).toString().padStart(2, '0')}` : ''}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* MORE FROM ARTIST */}
                {!isLoading && moreFromArtist.length > 0 && (
                    <section className="mt-20">
                        <SectionHeader title={`More by ${decodeHtml(artistName)}`} onSeeAll={() => onNavigate({ id: 'artist', data: { id: albumData?.primaryArtistsId, name: artistName } })} />
                        <HorizontalScroll>
                            {moreFromArtist.map((a, i) => (
                                <VibeAlbumCard
                                    key={a.id || i}
                                    item={a}
                                    onClick={() => onNavigate({ id: 'peel-reveal', data: a })}
                                />
                            ))}
                        </HorizontalScroll>
                    </section>
                )}
            </div>
            <style jsx global>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
