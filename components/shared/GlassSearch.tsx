"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Play, MoreHorizontal, Music, Mic, ChevronRight, Disc, User, Info, Plus, Check, ListMusic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchUnified } from "@/lib/unified-search";
import { PlayableTrack } from "@/lib/types";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { useDebounce } from "@/hooks/use-debounce";
import { decodeHtml } from "@/lib/utils";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

interface GlassSearchProps {
    onClose?: () => void;
    initialQuery?: string;
    variant?: 'overlay' | 'embedded'; // overlay = full screen modal, embedded = inline
}

// Local extension/fix for UI logic as PlayableTrack definition might need updates or we augment it here
type GlassResult = PlayableTrack & { _quality?: string };

/* -------------------------------------------------------------------------- */
/*                                  COMPONENT                                 */
/* -------------------------------------------------------------------------- */

export function GlassSearch({ onClose, initialQuery = "", variant = 'overlay' }: GlassSearchProps) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<GlassResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'songs' | 'artists' | 'albums'>('all');

    // Playback Hook
    const { playInstantMix, currentSong, activeMixId, updateMix, mixes, showToast } = usePlayback();
    const [addingToTrackId, setAddingToTrackId] = useState<string | null>(null);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState<{ x: number, y: number, track: GlassResult } | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    // Debounce Search
    const debouncedQuery = useDebounce(query, 300);

    /* -------------------------------------------------------------------------- */
    /*                                   LOGIC                                    */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                // Determine type based on category
                const type = selectedCategory === 'all' ? 'song' :
                    selectedCategory === 'artists' ? 'artist' :
                        selectedCategory === 'albums' ? 'album' : 'song';

                // UNIFIED SEARCH: The "Brain"
                const data = await searchUnified(debouncedQuery, type);
                setResults(data);
            } catch (e) {
                console.error("Search Failed:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery, selectedCategory]);

    // Handle Play
    const handlePlay = (track: GlassResult) => {
        // DIRECT PLAY: Loophole-free playback
        // We construct a mini-mix (just this song => standard playback)
        // Discovery logic handles the rest.

        // Ensure Quality Badges are present in the object so they pass to context
        if (!track._quality && track.sources) {
            const hasFlac = track.sources.some(s => s.quality === 'flac');
            const hasHiRes = track.sources.some(s => s.quality === 'hires');
            if (hasHiRes) track._quality = '24-bit';
            else if (hasFlac) track._quality = 'FLAC';
        }

        playInstantMix({
            id: `search-${Date.now()}`,
            title: `Search: ${track.title}`,
            color: 'blue',
            songs: [track],
            currentSongIndex: 0
        });

        if (onClose) onClose();
    };

    // Load Playlists for Discovery Mode
    useEffect(() => {
        setPlaylists(PlaylistStore.getPlaylists());
        const handleUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener('melora-playlists-update', handleUpdate);
        return () => window.removeEventListener('melora-playlists-update', handleUpdate);
    }, []);

    const handleAddAction = (e: React.MouseEvent, track: GlassResult) => {
        e.stopPropagation();
        const mode = localStorage.getItem('melora-ui-mode') || 'DISCOVERY';

        if (mode === 'DECK') {
            // Add to active mix directly
            if (activeMixId) {
                const activeMix = mixes.find(m => m.id === activeMixId);
                if (activeMix) {
                    const alreadyHas = activeMix.songs.some(s => (isPlayableTrack(s) ? s.id : (s as any).id) === track.id);
                    if (!alreadyHas) {
                        updateMix(activeMixId, { songs: [...activeMix.songs, ensurePlayableTrack(track)] });
                        showToast(`Added to "${activeMix.title}"`, 'success');
                    }
                    setAddingToTrackId(track.id);
                    setTimeout(() => setAddingToTrackId(null), 2000);
                }
            } else {
                // No active mix? Fallback to just playing? 
                // In Deck, there's almost always an active mix.
            }
        } else {
            // Show Playlist Selector for Discovery
            const rect = e.currentTarget.getBoundingClientRect();
            setShowPlaylistSelector({
                x: rect.left,
                y: rect.bottom + 8,
                track
            });
        }
    };

    const isPlayableTrack = (item: any): item is PlayableTrack => {
        return !!item.sources || !!item.song;
    };

    const addToPlaylist = (playlistId: string, track: GlassResult) => {
        const playlist = playlists.find(p => p.id === playlistId);
        PlaylistStore.addTrack(playlistId, ensurePlayableTrack(track));
        if (playlist) showToast(`Added to "${playlist.name}"`, 'success');
        setAddingToTrackId(track.id);
        setShowPlaylistSelector(null);
        setTimeout(() => setAddingToTrackId(null), 2000);
    };


    /* -------------------------------------------------------------------------- */
    /*                                     UI                                     */
    /* -------------------------------------------------------------------------- */

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`w-full h-full flex flex-col font-sans text-white ${variant === 'overlay' ? 'fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl p-8' : 'relative p-6'}`}
        >
            {/* 1. TOP BAR: Search Input */}
            <div className="flex items-center gap-4 mb-8">
                <Search size={32} className="text-white/40" />
                <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for anything..."
                    className="flex-1 bg-transparent border-none text-5xl font-bold placeholder:text-white/20 focus:outline-none focus:ring-0 leading-tight"
                />
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-4 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={32} className="text-white/60" />
                    </button>
                )}
            </div>

            {/* 2. CATEGORY TABS */}
            <div className="flex gap-4 mb-8">
                {['all', 'songs', 'artists', 'albums'].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as any)}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat
                            ? 'bg-white text-black shadow-lg shadow-white/20 scale-105'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                        {cat.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* 3. RESULTS AREA */}
            <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-50">
                        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        <span className="text-sm font-medium tracking-widest uppercase">Searching...</span>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">

                        {/* HERO RESULT (First Item) */}
                        <div className="md:col-span-2 row-span-2 group relative rounded-[2rem] overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl hover:border-white/20 transition-all cursor-pointer" onClick={() => handlePlay(results[0])}>
                            {/* Background Blur */}
                            <div className="absolute inset-0 z-0">
                                <img src={getArt(results[0])} className="w-full h-full object-cover opacity-60 blur-3xl scale-125" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 h-full p-8 flex flex-col justify-end items-start text-left">
                                <div className="mb-auto">
                                    <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 shadow-lg">Top Result</span>
                                </div>

                                <motion.img
                                    layoutId={`img-${results[0].id}`}
                                    src={getArt(results[0])}
                                    className="w-32 h-32 rounded-2xl shadow-2xl mb-6 object-cover border border-white/10"
                                />

                                <h2 className="text-4xl font-bold leading-tight mb-2 line-clamp-2">{decodeHtml(results[0].title)}</h2>
                                <p className="text-xl text-white/70 font-medium mb-6">{decodeHtml(results[0].artist)}</p>

                                {/* Play Button Interaction */}
                                <div className="absolute bottom-8 right-8 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    <button className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                                        <Play size={28} fill="currentColor" className="ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* OTHER RESULTS */}
                        {results.slice(1).map((track, i) => (
                            <div
                                key={track.id}
                                onClick={() => handlePlay(track)}
                                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-3xl p-4 flex items-center gap-4 transition-all cursor-pointer active:scale-[0.98]"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-neutral-800 overflow-hidden shadow-lg relative shrink-0">
                                    <img src={getArt(track)} className="w-full h-full object-cover brightness-90 group-hover:brightness-100 transition-all" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={20} fill="white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg truncate leading-tight mb-1">{decodeHtml(track.title)}</h4>
                                    <p className="text-sm text-white/50 truncate">{decodeHtml(track.artist)}</p>

                                    {/* BADGES (Unified) */}
                                    <div className="mt-2 text-left">
                                        <QualityBadge quality={track._quality as any || (track.sources?.some(s => s.quality === 'hires') ? 'hires' : track.sources?.some(s => s.quality === 'flac') ? 'flac' : undefined)} variant="mini" />
                                    </div>
                                </div>

                                {/* ADD BUTTON */}
                                <button
                                    onClick={(e) => handleAddAction(e, track)}
                                    className={`p-3 rounded-2xl transition-all border ${addingToTrackId === track.id ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 text-white/40 hover:text-white'}`}
                                >
                                    {addingToTrackId === track.id ? <Check size={20} /> : <Plus size={20} />}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    debouncedQuery && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-white/40">
                            <Info size={48} className="mb-4 opacity-50" />
                            <p>No results found for "{query}"</p>
                        </div>
                    )
                )}

                {/* PLAYLIST SELECTOR POPOVER */}
                <AnimatePresence>
                    {showPlaylistSelector && (
                        <>
                            <div className="fixed inset-0 z-[110]" onClick={() => setShowPlaylistSelector(null)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="fixed z-[120] w-64 max-h-80 overflow-y-auto bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 backdrop-blur-2xl"
                                style={{
                                    left: Math.min(showPlaylistSelector.x, typeof window !== 'undefined' ? window.innerWidth - 270 : 0),
                                    top: Math.min(showPlaylistSelector.y, typeof window !== 'undefined' ? window.innerHeight - 340 : 0)
                                }}
                            >
                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5 mb-1">
                                    Add to Playlist
                                </div>
                                {playlists.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-white/40 italic">
                                        No playlists found.
                                    </div>
                                ) : (
                                    playlists.map(pl => (
                                        <button
                                            key={pl.id}
                                            onClick={() => addToPlaylist(pl.id, showPlaylistSelector.track)}
                                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                                <ListMusic size={14} className="text-white/60" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{pl.name}</div>
                                                <div className="text-[10px] text-white/30">{pl.tracks.length} tracks</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* EMPTY STATE */}
                {!debouncedQuery && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-30 pointer-events-none filter blur-sm select-none">
                        {/* Placeholder skeletons to look cool before search */}
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-24 rounded-3xl bg-white/5 border border-white/5" />
                        ))}
                    </div>
                )}

            </div>
        </motion.div>
    );
}

// Helper for art
function getArt(track: PlayableTrack) {
    if (track.art) return track.art;
    return track.song?.image ? (Array.isArray(track.song.image) ? track.song.image[track.song.image.length - 1]?.link : track.song.image as string) : "";
}
