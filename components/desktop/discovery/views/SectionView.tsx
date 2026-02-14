"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Disc3, Play, Heart, MoreHorizontal, Clock, Shuffle, PlusCircle, Check, AlertCircle, RefreshCcw } from "lucide-react";
import { StandardCard, FeatureCard, PosterCard, QuickPickItem } from "../home/HomeComponents";
import { getTrending, getNewReleases, getTopCharts, searchPlaylists, searchSongs, JioSaavnSong } from "@/lib/jiosaavn";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { TrackContextMenu } from "@/components/ui/track-context-menu";
import { AddToPlaylistModal } from "../modals/AddToPlaylistModal";
import { decodeHtml } from "@/lib/utils";

interface SectionViewProps {
    sectionId: string;
    sectionTitle?: string;
    initialData?: JioSaavnSong[];
    onNavigate: (view: { id: string; data?: any }) => void;
    onBack: () => void;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

export function SectionView({ sectionId, sectionTitle, initialData, onNavigate, onBack, onContextMenu }: SectionViewProps) {
    const [title, setTitle] = useState(sectionTitle || "");
    const [items, setItems] = useState<JioSaavnSong[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const { playInstantMix, isPlaying, currentSong, activeMixId, togglePlay, toggleLike, isLiked, addMix, updateMix, loadMix, addSongToMix } = usePlayback();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; song: JioSaavnSong | null }>({ visible: false, x: 0, y: 0, song: null });
    const [addToPlaylistSong, setAddToPlaylistSong] = useState<JioSaavnSong | null>(null);

    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setItems(initialData);
            setLoading(false);
            if (!sectionTitle) {
                switch (sectionId) {
                    case 'trending': setTitle("Trending Now"); break;
                    case 'albums': setTitle("New Arrivals"); break;
                    case 'charts': setTitle("Top Charts"); break;
                    case 'retro': setTitle("Retro Classics"); break;
                    case 'editors_picks': setTitle("Editor's Picks"); break;
                    default:
                        if (sectionId.startsWith('mood-')) {
                            const mood = sectionId.replace('mood-', '');
                            setTitle(`${mood.charAt(0).toUpperCase() + mood.slice(1)} Mix`);
                        }
                }
            }
            return;
        }
        loadContent();
    }, [sectionId, initialData]);

    const loadContent = async () => {
        setLoading(true);
        try {
            let lang = 'english';
            try {
                const stored = localStorage.getItem('music-language');
                if (stored) lang = stored;
            } catch (e) { /* ignore */ }

            let data: JioSaavnSong[] = [];
            switch (sectionId) {
                case 'trending':
                    setTitle("Trending Now");
                    data = await getTrending(lang);
                    break;
                case 'albums':
                    setTitle("New Arrivals");
                    data = await getNewReleases(50, lang);
                    break;
                case 'charts':
                    setTitle("Top Charts");
                    data = await getTopCharts(lang);
                    break;
                case 'retro':
                    setTitle("Retro Classics");
                    const primary = lang.split(',')[0].trim();
                    data = await searchSongs(`${primary} 90s hits`, 1, 50, lang);
                    break;
                case 'editors_picks':
                    setTitle("Editor's Picks");
                    data = await searchPlaylists("Editor's Picks", 1, 20, lang);
                    break;
                default:
                    if (sectionId.startsWith('mood-')) {
                        const mood = sectionId.replace('mood-', '');
                        setTitle(`${mood.charAt(0).toUpperCase() + mood.slice(1)} Mix`);
                        const primary = lang.split(',')[0].trim();
                        data = await searchPlaylists(`${primary} ${mood} songs`, 1, 20, lang);
                    }
                    else {
                        data = await searchSongs(sectionId, 1, 20, lang);
                    }
                    break;
            }
            setItems(data);
        } catch {
            setError("Failed to load content. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (song: JioSaavnSong, index: number) => {
        if (song.type === 'album') {
            onNavigate({ id: 'peel-reveal', data: song });
        } else if (song.type === 'playlist') {
            onNavigate({ id: 'playlist', data: song });
        } else {
            // For songs list (Trending / Retro)
            // FIX: Create mix with CORRECT index
            const mixId = `section-${sectionId}`;
            const mix: Mix = {
                id: mixId,
                title: title,
                color: 'blue' as any,
                songs: items, // All items
                currentSongIndex: index, // Direct index usage is safer than findIndex here
                pinned: false
            };

            const added = addMix(mix);
            if (!added) updateMix(mixId, { songs: items, currentSongIndex: index });
            loadMix(mixId);
        }
    };

    const openContextMenu = (e: React.MouseEvent, song: JioSaavnSong) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, song });
    };

    // Determine layout type
    const isSongList = sectionId === 'trending' || sectionId === 'retro' || (sectionId as string).startsWith('mood-');

    return (
        <div className="relative min-h-full pb-32">
            {/* HEADER */}
            <div className="relative z-10 px-8 pt-8 pb-6 flex items-end justify-between bg-gradient-to-b from-[#000000] to-transparent sticky top-0 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">{title}</h1>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-widest">{items.length} Items</p>
                    </div>
                </div>
                {/* Play All Button for Lists */}
                {isSongList && items.length > 0 && (
                    <button onClick={() => handlePlay(items[0], 0)} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                        <Play fill="currentColor" size={20} className="ml-1" />
                    </button>
                )}
            </div>

            <div className="px-6 md:px-8 mt-4">
                {loading ? (
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="animate-spin text-white/20"><Disc3 size={40} /></div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] p-8 text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-10 rounded-3xl max-w-sm border border-white/10"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
                            <p className="text-white/40 text-sm mb-6">{error}</p>
                            <button
                                onClick={() => { setError(null); loadContent(); }}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors mx-auto text-sm"
                            >
                                <RefreshCcw size={16} />
                                Try Again
                            </button>
                        </motion.div>
                    </div>
                ) : isSongList ? (
                    /* === SEXY LIST LAYOUT === */
                    <div className="bg-[#000000] rounded-3xl border border-white/5 overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-4 border-b border-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <span className="w-8 text-center">#</span>
                            <span>Title</span>
                            <span className="hidden md:block">Album</span>
                            <Clock size={14} />
                        </div>

                        <div className="divide-y divide-white/5">
                            {items.map((item, i) => {
                                const active = currentSong?.id === item.id;
                                const playing = active && isPlaying;
                                const liked = isLiked(item.id);

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        onClick={() => handlePlay(item, i)}
                                        draggable={true}
                                        // @ts-expect-error
                                        onDragStart={(e: React.DragEvent) => {
                                            e.dataTransfer.setData('application/json', JSON.stringify(item));
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                        className={`group grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3 cursor-pointer transition-all hover:bg-white/5 ${active ? 'bg-white/10' : ''}`}
                                    >
                                        {/* Rank / Play Icon */}
                                        <div className="w-8 flex justify-center text-white/40 font-mono text-sm group-hover:text-white">
                                            <span className="group-hover:hidden block">{active && playing ? <Disc3 className="animate-spin text-white" size={16} /> : i + 1}</span>
                                            <Play size={16} fill="currentColor" className="hidden group-hover:block text-white" />
                                        </div>

                                        {/* Art & Title */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg bg-black">
                                                <img src={typeof item.image === 'string' ? item.image : (item.image?.[item.image.length - 1]?.link || '')} className="w-full h-full object-cover" />
                                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    {playing ? <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" /> : <Play fill="white" size={16} className="text-white" />}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`font-bold text-base truncate ${active ? 'text-white font-extrabold' : 'text-white/90'}`}>{decodeHtml(item.name)}</h4>
                                                <p className="text-white/40 text-xs truncate group-hover:text-white/60 transition-colors">{decodeHtml(item.primaryArtists)}</p>
                                            </div>
                                        </div>

                                        {/* Album (Desktop) */}
                                        <div className="hidden md:block min-w-0 max-w-[200px]">
                                            <p className="text-white/40 text-xs truncate hover:underline hover:text-white" onClick={(e) => { e.stopPropagation(); if (item.album?.id) onNavigate({ id: 'peel-reveal', data: item }); }}>
                                                {decodeHtml(item.album?.name || item.name)}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 md:gap-6 pr-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleLike(item); }}
                                                className={`transition-transform active:scale-90 ${liked ? 'text-white' : 'text-white/20 hover:text-white group-hover:text-white/40'}`}
                                            >
                                                <Heart size={18} fill={liked ? "currentColor" : "none"} />
                                            </button>
                                            <span className="text-white/30 text-xs font-mono w-10 text-right">
                                                {item.duration ? `${Math.floor(parseInt(String(item.duration)) / 60)}:${(parseInt(String(item.duration)) % 60).toString().padStart(2, '0')}` : '--:--'}
                                            </span>
                                            <button
                                                onClick={(e) => openContextMenu(e, item)}
                                                className="text-white/20 hover:text-white transition-colors p-1"
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* === ORIGINAL GRID LAYOUT (Albums/Playlists) === */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {items.map((item, i) => {
                            if (sectionId === 'charts' || sectionId === 'editors_picks' || item.type === 'playlist') {
                                return (
                                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className="aspect-square"
                                    >
                                        <div className="w-full h-full cursor-pointer" onClick={() => handlePlay(item, i)}>
                                            <PosterCard
                                                item={item}
                                                index={i}
                                                subtitle={item.type === 'playlist' ? 'Playlist' : 'Album'}
                                                onClick={() => handlePlay(item, i)}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            }

                            return (
                                <StandardCard
                                    key={item.id}
                                    item={item}
                                    index={i}
                                    subtitle={item.primaryArtists || (item as any).subtitle || item.type}
                                    onClick={() => handlePlay(item, i)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CONTEXT MENU */}
            <TrackContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                song={contextMenu.song}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                onPlay={(s) => playInstantMix({ id: `song-${s.id}`, title: s.name, color: 'blue', songs: [s], currentSongIndex: 0 })}
                onAddToQueue={(s) => {
                    if (activeMixId) {
                        // Dynamically import or cast if needed, but allow passing Song to addSongToMix handles it
                        // Assuming addSongToMix accepts JioSaavnSong based on context definition
                        addSongToMix(activeMixId, s);
                    }
                }}
                onGoToArtist={(id) => onNavigate({ id: 'artist', data: { id } })}
                onGoToAlbum={(id) => onNavigate({ id: 'peel-reveal', data: { id } })}
                onStartRadio={() => onNavigate({ id: 'radio' })}
                isDownloaded={false}
                onDownload={() => { }}
                onRemoveDownload={() => { }}
                onAddToPlaylist={(s) => setAddToPlaylistSong(s)}
            />
            <AnimatePresence>
                {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
            </AnimatePresence>
            <style jsx global>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
