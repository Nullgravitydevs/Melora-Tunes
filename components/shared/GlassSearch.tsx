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
                        <div className="md:col-span-2 row-span-2 group relative rounded-[2.5rem] overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl hover:border-white/20 transition-all duration-500 cursor-pointer" onClick={() => handlePlay(results[0])}>
                            {/* Background Blur */}
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <img src={getArt(results[0])} className="w-full h-full object-cover opacity-60 blur-3xl scale-150 group-hover:scale-125 transition-transform duration-[2s]" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 h-full p-10 flex flex-col justify-end items-start text-left">
                                <div className="mb-auto">
                                    <span className="px-4 py-1.5 rounded-xl bg-emerald-500/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 border border-emerald-500/20 shadow-lg">Top Result</span>
                                </div>

                                <div className="relative mb-8">
                                    <motion.img
                                        layoutId={`img-${results[0].id}`}
                                        src={getArt(results[0])}
                                        className="w-40 h-40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover border border-white/20 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                        <Play size={20} fill="currentColor" />
                                    </div>
                                </div>

                                <h2 className="text-5xl font-black leading-tight mb-3 line-clamp-2 tracking-tight">{decodeHtml(results[0].title)}</h2>
                                <p className="text-2xl text-white/50 font-semibold mb-8 tracking-tight">{decodeHtml(results[0].artist)}</p>

                                <div className="flex items-center gap-4">
                                    <QualityBadge quality={results[0]._quality as any || (results[0].sources?.some(s => s.quality === 'hires') ? 'hires' : results[0].sources?.some(s => s.quality === 'flac') ? 'flac' : undefined)} variant="full" />
                                </div>
                            </div>
                        </div>

                        {/* OTHER RESULTS */}
                        {results.slice(1).map((track, i) => (
                            <div
                                key={track.id}
                                onClick={() => handlePlay(track)}
                                className="group relative bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/10 rounded-[1.5rem] p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer active:scale-[0.98] backdrop-blur-md"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-neutral-800 overflow-hidden shadow-xl relative shrink-0 border border-white/5">
                                    <img src={getArt(track)} className="w-full h-full object-cover brightness-90 group-hover:brightness-105 group-hover:scale-105 transition-all duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                        <Play size={20} fill="white" className="scale-75 group-hover:scale-100 transition-transform duration-300" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg truncate leading-tight mb-1 text-white/90 group-hover:text-white transition-colors">{decodeHtml(track.title)}</h4>
                                    <p className="text-sm text-white/40 truncate font-medium">{decodeHtml(track.artist)}</p>

                                    {/* BADGES (Unified) */}
                                    <div className="mt-2 text-left flex items-center gap-2">
                                        <QualityBadge quality={track._quality as any || (track.sources?.some(s => s.quality === 'hires') ? 'hires' : track.sources?.some(s => s.quality === 'flac') ? 'flac' : undefined)} variant="mini" />
                                    </div>
                                </div>

                                {/* ADD BUTTON */}
                                <button
                                    onClick={(e) => handleAddAction(e, track)}
                                    className={`w-12 h-12 rounded-2xl transition-all duration-300 border flex items-center justify-center relative overflow-hidden group/btn ${addingToTrackId === track.id
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/10 text-white/20 hover:text-white shadow-lg'
                                        }`}
                                >
                                    {addingToTrackId === track.id ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={18} /></motion.div>
                                    ) : (
                                        <Plus size={18} className="group-hover/btn:rotate-90 transition-transform duration-300" />
                                    )}
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
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="fixed z-[120] w-72 max-h-96 overflow-y-auto bg-neutral-900 border border-white/10 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-3 flex flex-col gap-1 backdrop-blur-3xl"
                                style={{
                                    left: Math.min(showPlaylistSelector.x, typeof window !== 'undefined' ? window.innerWidth - 300 : 0),
                                    top: Math.min(showPlaylistSelector.y, typeof window !== 'undefined' ? window.innerHeight - 400 : 0)
                                }}
                            >
                                <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Add to Playlist</span>
                                    <X size={14} className="text-white/20 cursor-pointer hover:text-white transition-colors" onClick={() => setShowPlaylistSelector(null)} />
                                </div>

                                <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
                                    {playlists.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                                <ListMusic size={20} className="text-white/20" />
                                            </div>
                                            <p className="text-xs text-white/40 font-medium">No playlists found</p>
                                        </div>
                                    ) : (
                                        playlists.map(pl => (
                                            <button
                                                key={pl.id}
                                                onClick={() => addToPlaylist(pl.id, showPlaylistSelector.track)}
                                                className="flex items-center gap-4 w-full px-3 py-3 rounded-2xl hover:bg-white/[0.05] active:scale-[0.97] transition-all text-left group border border-transparent hover:border-white/5"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center group-hover:from-emerald-500/20 group-hover:to-emerald-500/10 transition-colors shrink-0">
                                                    <ListMusic size={16} className="text-white/40 group-hover:text-emerald-400 transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-white/90 group-hover:text-white truncate transition-colors">{pl.name}</div>
                                                    <div className="text-[10px] text-white/30 font-medium tracking-tight">{pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}</div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight size={14} className="text-white/20" />
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
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
