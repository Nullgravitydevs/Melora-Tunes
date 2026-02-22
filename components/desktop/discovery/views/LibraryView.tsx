"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Heart, Clock, ListMusic, Plus, Play, Pause, MoreHorizontal,
    Shuffle, Music, Trash2, ChevronRight, Disc, User, Pin as PinIcon,
    Download
} from "lucide-react";
import { usePlayback, useLibrary, useUI, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { isPlayableTrack, PlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";
import { shuffleArray, getArt, formatDuration } from "@/lib/helpers";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddToPlaylistModal } from "@/components/desktop/discovery/modals/AddToPlaylistModal";
import { CDRow } from "@/components/shared/CDRow";
import { isUserPlaylistMix } from "@/lib/mix-id-utils";

/* ============================================================================
   LIBRARY VIEW - Liked Songs, Recently Played, Playlists
   Premium glass design with full functionality
   ============================================================================ */

const LIBRARY_STYLES = `
    @keyframes cd-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .cd-spinning {
        animation: cd-spin 3s linear infinite;
    }
    
    .glass-card {
        background: black;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.25s ease;
    }
    .glass-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.08);
    }
    
    .tab-active {
        background: rgba(255, 255, 255, 0.08);
        color: white;
    }
    
    .quality-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 3px;
    }
    .quality-flac { background: rgba(180, 140, 255, 0.15); color: rgba(180, 140, 255, 0.9); }
    .quality-hires { background: rgba(255, 200, 100, 0.15); color: rgba(255, 200, 100, 0.9); }
    .quality-320 { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6); }
`;

type TabType = 'liked' | 'recent' | 'playlists' | 'albums' | 'artists';

interface LibraryViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    initialTab?: 'liked' | 'recent' | 'playlists';
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

/* ============================================================================
   VIRTUALIZED SONG LIST — Renders only visible items for large lists
   ============================================================================ */
function VirtualizedSongList({ items, renderRow }: {
    items: (JioSaavnSong | PlayableTrack)[],
    renderRow: (item: JioSaavnSong | PlayableTrack, index: number, all: (JioSaavnSong | PlayableTrack)[]) => React.ReactNode
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const ROW_HEIGHT = 64; // px per row including gap

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    // For small lists, render normally (no virtualization overhead)
    if (items.length <= 50) {
        return (
            <div className="space-y-2">
                {items.map((song, i) => renderRow(song, i, items))}
            </div>
        );
    }

    return (
        <div ref={parentRef} className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hide">
            <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
                        className="absolute top-0 left-0 w-full"
                        style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
                    >
                        {renderRow(items[virtualItem.index], virtualItem.index, items)}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ============================================================================
   LIBRARY VIEW - Liked Songs, Recently Played, Playlists
   Muzza-inspired "Best Search" & Sort Features
   ============================================================================ */
export function LibraryView({ onNavigate, initialTab, onContextMenu }: LibraryViewProps) {
    const { currentSong, isPlaying, togglePlay, loadMix, playInstantMix, qualityPreference, togglePin } = usePlayback();
    const { likedSongs, recentlyPlayed, mixes, addMix, deleteMix, savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isDownloaded, toggleLike, isLiked } = useLibrary();
    const { showToast } = useUI();

    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'liked');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [songToAdd, setSongToAdd] = useState<JioSaavnSong | PlayableTrack | null>(null);
    const [showConfirm, setShowConfirm] = useState<{ message: string; action: () => void } | null>(null);

    // SEARCH & FILTER STATE
    const [searchQuery, setSearchQuery] = useState("");
    const [sortType, setSortType] = useState<'date' | 'name' | 'artist'>('date');
    const [sortDescending, setSortDescending] = useState(true);

    // Sync active tab when prop changes
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Reset search when switching tabs
    useEffect(() => {
        setSearchQuery("");
    }, [activeTab]);

    // --- FILTERING LOGIC ---

    // 1. Playlists
    const userPlaylists = useMemo(() => {
        let raw = mixes.filter(isUserPlaylistMix);

        // Search Filter
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            raw = raw.filter(p => p.title.toLowerCase().includes(lowerQ));
        }

        // Sort
        return raw.sort((a, b) => {
            if (sortType === 'name') {
                return sortDescending
                    ? b.title.localeCompare(a.title)
                    : a.title.localeCompare(b.title);
            }
            // Date (ID timestamp based fallback for now since we lack 'createdAt' in Mix type)
            // We assume ID has timestamp component or is chronological
            const aTime = extractTimestamp(a.id);
            const bTime = extractTimestamp(b.id);
            return sortDescending ? bTime - aTime : aTime - bTime;
        });
    }, [mixes, searchQuery, sortType, sortDescending]);

    // 2. Liked Songs
    const filteredLikedSongs = useMemo(() => {
        let list = [...likedSongs];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(song =>
                (song.name || '').toLowerCase().includes(lowerQ) ||
                (song.primaryArtists || '').toLowerCase().includes(lowerQ) ||
                (song.album?.name || '').toLowerCase().includes(lowerQ)
            );
        }

        // Apply Sorting
        if (sortType === 'name') {
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortType === 'artist') {
            list.sort((a, b) => (a.primaryArtists || '').localeCompare(b.primaryArtists || ''));
        } else {
            // Default: "Date Added" (Chronological)
            // If descending, we want newest first, so we reverse the insertion order
            if (sortDescending) list.reverse();
            return list;
        }

        if (sortDescending) list.reverse();
        return list;
    }, [likedSongs, searchQuery, sortType, sortDescending]);

    // 3. Saved Albums
    const filteredAlbums = useMemo(() => {
        let list = [...savedAlbums];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(a => (a.name || a.title || '').toLowerCase().includes(lowerQ));
        }

        if (sortType === 'name') {
            list.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
        } else if (sortType === 'artist') {
            list.sort((a, b) => (a.primaryArtists || '').localeCompare(b.primaryArtists || ''));
        } else {
            if (sortDescending) list.reverse();
            return list;
        }

        if (sortDescending) list.reverse();
        return list;
    }, [savedAlbums, searchQuery, sortType, sortDescending]);

    // 4. Followed Artists
    const filteredArtists = useMemo(() => {
        let list = [...savedArtists];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(a => (a.name || '').toLowerCase().includes(lowerQ));
        }

        if (sortType === 'name') {
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else {
            if (sortDescending) list.reverse();
            return list;
        }

        if (sortDescending) list.reverse();
        return list;
    }, [savedArtists, searchQuery, sortType, sortDescending]);

    // 5. Recently Played (Filtered)
    const filteredRecentlyPlayed = useMemo(() => {
        let list = [...recentlyPlayed];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(song =>
                (song.name || '').toLowerCase().includes(lowerQ) ||
                (song.primaryArtists || '').toLowerCase().includes(lowerQ) ||
                (song.album?.name || '').toLowerCase().includes(lowerQ)
            );
        }
        return list;
    }, [recentlyPlayed, searchQuery]);

    // Helper: Extract timestamp from ID if possible
    function extractTimestamp(id: string): number {
        if (id.includes('-')) {
            const parts = id.split('-');
            const ts = parseInt(parts[parts.length - 1]);
            if (!isNaN(ts)) return ts;
        }
        return 0;
    }

    // Get quality badge
    const getQualityBadge = (item: JioSaavnSong | PlayableTrack) => {
        if (isPlayableTrack(item)) {
            const q = item.preferredQuality;
            if (q === 'hires') return { label: 'Hi-Res', class: 'quality-hires' };
            if (q === 'flac') return { label: 'FLAC', class: 'quality-flac' };
            if (q === '320') return { label: '320', class: 'quality-320' };
        }
        return { label: '320', class: 'quality-320' };
    };

// Get album art — unwrap PlayableTrack, prefer 150x150 for list thumbnails
    const getItemArt = (item: JioSaavnSong | PlayableTrack) =>
        getArt(isPlayableTrack(item) ? item.song : item, '150x150');

    // Play song from list
    const playSong = (item: JioSaavnSong | PlayableTrack, allItems: (JioSaavnSong | PlayableTrack)[]) => {
        const idx = allItems.findIndex(i => {
            const itemId = isPlayableTrack(i) ? i.id : i.id;
            const targetId = isPlayableTrack(item) ? item.id : item.id;
            return itemId === targetId;
        });

        const songs = allItems.map(i => isPlayableTrack(i) ? i : ensurePlayableTrack(i, qualityPreference as AudioQuality));

        const mixId = activeTab === 'liked' ? 'library-liked' : 'library-recent';
        const newMix: Mix = {
            id: mixId,
            title: activeTab === 'liked' ? 'Liked Songs' : 'Recently Played',
            color: 'pink',
            songs: songs,
            currentSongIndex: idx >= 0 ? idx : 0
        };

        playInstantMix(newMix);
    };

    // Play all with shuffle option
    const playAll = (items: (JioSaavnSong | PlayableTrack)[], shuffle = false) => {
        if (items.length === 0) return;

        let songs = items.map(i => isPlayableTrack(i) ? i : ensurePlayableTrack(i, qualityPreference as AudioQuality));
        if (shuffle) songs = shuffleArray(songs);

        const mixId = activeTab === 'liked' ? 'library-liked' : 'library-recent';
        const newMix: Mix = {
            id: mixId,
            title: activeTab === 'liked' ? 'Liked Songs' : 'Recently Played',
            color: 'pink',
            songs: songs,
            currentSongIndex: 0
        };

        playInstantMix(newMix);
    };

    // Create new playlist
    const createPlaylist = (name: string) => {
        const newPlaylist: Mix = {
            id: `playlist-${Date.now()}`,
            title: name,
            color: 'purple',
            songs: [],
            currentSongIndex: 0
        };
        const added = addMix(newPlaylist);
        if (added) {
            showToast(`Created "${name}"`, 'success');
            setShowCreateModal(false);
        }
    };

    // Delete playlist
    const handleDeletePlaylist = (playlistId: string, name: string) => {
        setShowConfirm({
            message: `Delete "${name}"?`,
            action: () => { deleteMix(playlistId); showToast(`Deleted "${name}"`, 'info'); }
        });
    };

    // Render song row
    const renderSongRow = (item: JioSaavnSong | PlayableTrack, index: number, allItems: (JioSaavnSong | PlayableTrack)[]) => {
        const song = isPlayableTrack(item) ? item.song : item;
        if (!song) return null;

        const isCurrentPlaying = currentSong?.id === song.id;
        const quality = getQualityBadge(item);

        return (
            <div
                key={song.id + index}
                onClick={() => playSong(item, allItems)}
                className="glass-card flex items-center gap-4 p-3 rounded-xl cursor-pointer group"
            >
                {/* Index / Playing indicator */}
                <div className="w-8 text-center">
                    {isCurrentPlaying ? (
                        <div className="flex items-center justify-center gap-0.5">
                            <div className="w-1 h-4 bg-white/80 rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-white/60 rounded-full animate-pulse delay-75" />
                            <div className="w-1 h-5 bg-white/80 rounded-full animate-pulse delay-150" />
                        </div>
                    ) : (
                        <span className="text-sm text-white/30 group-hover:hidden">{index + 1}</span>
                    )}
                    {!isCurrentPlaying && (
                        <Play size={14} className="hidden group-hover:block text-white mx-auto" fill="currentColor" />
                    )}
                </div>

                {/* Vinyl Art */}
                <div className="relative w-12 h-12 flex-shrink-0">
                    <div
                        className={`absolute inset-0 rounded-full ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                        style={{
                            background: 'conic-gradient(from 0deg, rgba(30,30,30,1) 0%, rgba(50,50,50,1) 25%, rgba(30,30,30,1) 50%, rgba(50,50,50,1) 75%, rgba(30,30,30,1) 100%)',
                        }}
                    />
                    <div className={`absolute inset-2 rounded-full overflow-hidden ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}>
                        {getItemArt(item) ? (
                            <img src={getItemArt(item)} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                <Music size={12} className="text-white/30" />
                            </div>
                        )}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black border border-white/10" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isCurrentPlaying ? 'text-white' : 'text-white/80'}`}>
                            {song.name}
                        </p>
                        <span className={`quality-badge ${quality.class} flex-shrink-0`}>
                            {quality.label}
                        </span>
                        {isDownloaded(song.id) && (
                            <span className="flex-shrink-0 text-emerald-400" title="Downloaded">
                                <Download size={12} />
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-white/40 truncate">{song.primaryArtists}</p>
                </div>

                {/* Album */}
                <p className="text-sm text-white/20 truncate max-w-32 hidden lg:block">{song.album?.name}</p>

                {/* Duration & Actions */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-white/30 tabular-nums group-hover:hidden">
                        {formatDuration(song.duration)}
                    </span>

                    <div className="hidden group-hover:flex items-center gap-2">
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); toggleLike(item); }}
                            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isLiked(song.id) ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <Heart size={16} fill={isLiked(song.id) ? "currentColor" : "none"} />
                        </motion.button>
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); setSongToAdd(item); }}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                        >
                            <MoreHorizontal size={16} />
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    };

    // Render playlist card
    const renderPlaylistCard = (playlist: Mix) => {
        const firstSong = playlist.songs[0];
        const art = firstSong ? getItemArt(firstSong) : '';

        return (
            <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-xl cursor-pointer group"
                onClick={() => onNavigate({ id: 'playlist', data: playlist })}
            >
                <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        {art ? (
                            <img src={art} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ListMusic size={24} className="text-white/20" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{playlist.title}</p>
                        <p className="text-sm text-white/40">{playlist.songs.length} songs</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); loadMix(playlist.id); }}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Play"
                        >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                        </motion.button>

                        {/* Pin Button */}
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); togglePin(playlist.id); }}
                            className={`p-2 rounded-full hover:bg-white/10 ${playlist.pinned ? 'text-blue-400' : 'text-white/40'}`}
                            whileTap={{ scale: 0.9 }}
                            title={playlist.pinned ? "Unpin from Deck" : "Pin to Deck"}
                        >
                            <PinIcon size={16} className={playlist.pinned ? "fill-blue-400" : ""} />
                        </motion.button>

                        <motion.button
                            onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id, playlist.title); }}
                            className="p-2 rounded-full hover:bg-white/10 hover:text-red-500 text-white/40"
                            whileTap={{ scale: 0.9 }}
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </motion.button>
                    </div>

                    <ChevronRight size={16} className="text-white/20" />
                </div>
            </motion.div>
        );
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
        { id: 'liked', label: 'Liked Songs', icon: <Heart size={16} />, count: likedSongs.length },
        { id: 'albums', label: 'Albums', icon: <Disc size={16} />, count: savedAlbums.length },
        { id: 'artists', label: 'Artists', icon: <User size={16} />, count: savedArtists.length },
        { id: 'recent', label: 'Recently Played', icon: <Clock size={16} />, count: recentlyPlayed.length },
        { id: 'playlists', label: 'Playlists', icon: <ListMusic size={16} />, count: userPlaylists.length },
    ];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: LIBRARY_STYLES }} />

            <div className="min-h-full p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Your Library</h1>
                    <p className="text-white/40">Your music, organized</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'tab-active' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                }`}
                            whileTap={{ scale: 0.98 }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            <span className="text-white/30 ml-1">{tab.count}</span>
                        </motion.button>
                    ))}
                </div>

                {/* SEARCH BAR & FILTERS */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab === 'playlists' ? 'playlists...' : activeTab === 'albums' ? 'albums...' : activeTab === 'artists' ? 'artists...' : 'liked songs...'}`}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-sm text-white placeholder-white/30 transition-all font-medium"
                        />
                        {/* Search Icon */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                    </div>

                    {/* Sort Options (Consolidated) */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-white/30 uppercase tracking-wider hidden md:block">Sort By:</span>
                        <button
                            onClick={() => setSortType('date')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'date' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                            Date
                        </button>
                        <button
                            onClick={() => setSortType('name')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'name' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                            {activeTab === 'artists' ? 'Name' : 'Title'}
                        </button>
                        {(activeTab === 'liked' || activeTab === 'albums') && (
                            <button
                                onClick={() => setSortType('artist')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'artist' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                                Artist
                            </button>
                        )}
                        <button
                            onClick={() => setSortDescending(!sortDescending)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                            title={sortDescending ? (sortType === 'date' ? "Newest First" : "Z-A") : (sortType === 'date' ? "Oldest First" : "A-Z")}
                        >
                            {sortDescending ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7-7-7 7" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {/* Liked Songs */}
                    {activeTab === 'liked' && (
                        <motion.div
                            key="liked"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {filteredLikedSongs.length > 0 ? (
                                <>
                                    {/* Play controls */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <motion.button
                                            onClick={() => playAll(filteredLikedSongs)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Play size={16} fill="currentColor" />
                                            Play All
                                        </motion.button>
                                        <motion.button
                                            onClick={() => playAll(filteredLikedSongs, true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Shuffle size={16} />
                                            Shuffle
                                        </motion.button>
                                    </div>

                                    <VirtualizedSongList items={filteredLikedSongs} renderRow={renderSongRow} />
                                </>
                            ) : (
                                <div className="text-center py-24 glass-card rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                    <div className="w-20 h-20 bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-6 text-white/40">
                                        <Heart size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Your favorites will live here</h3>
                                    <p className="text-white/40 max-w-xs mx-auto mb-8">Tap the heart on any song to save it to your library.</p>
                                    <button
                                        onClick={() => onNavigate({ id: 'explore' })}
                                        className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all text-sm"
                                    >
                                        Start Exploring
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Recently Played */}
                    {activeTab === 'recent' && (
                        <motion.div
                            key="recent"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {recentlyPlayed.length > 0 ? (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <motion.button
                                            onClick={() => playAll(recentlyPlayed)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Play size={16} fill="currentColor" />
                                            Play All
                                        </motion.button>
                                        <motion.button
                                            onClick={() => playAll(recentlyPlayed, true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Shuffle size={16} />
                                            Shuffle
                                        </motion.button>
                                    </div>

                                    <VirtualizedSongList items={recentlyPlayed} renderRow={renderSongRow} />
                                </>
                            ) : (
                                <div className="text-center py-20">
                                    <Clock size={48} className="mx-auto text-white/10 mb-4" />
                                    <p className="text-white/40">No recently played songs</p>
                                    <p className="text-sm text-white/20 mt-1">Start listening to build your history</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Playlists */}
                    {activeTab === 'playlists' && (
                        <motion.div
                            key="playlists"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {/* Create button */}
                            <motion.button
                                onClick={() => setShowCreateModal(true)}
                                className="glass-card w-full flex items-center gap-4 p-4 rounded-xl mb-4 hover:bg-white/5"
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Plus size={24} className="text-white/40" />
                                </div>
                                <p className="font-medium text-white/60">Create New Playlist</p>
                            </motion.button>

                            {userPlaylists.length > 0 ? (
                                <div className="space-y-3">
                                    {userPlaylists.map(playlist => renderPlaylistCard(playlist))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <ListMusic size={48} className="mx-auto text-white/10 mb-4" />
                                    <p className="text-white/40">
                                        {searchQuery ? `No playlists matching "${searchQuery}"` : "No playlists yet"}
                                    </p>
                                    {!searchQuery && <p className="text-sm text-white/20 mt-1">Create one to get started</p>}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Albums Tab */}
                    {activeTab === 'albums' && (
                        <motion.div
                            key="albums"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {filteredAlbums.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredAlbums.map((album, i) => (
                                        <motion.div
                                            key={album.id || i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => onNavigate({ id: 'peel-reveal', data: album })}
                                            className="glass-card p-3 rounded-xl cursor-pointer group hover:bg-white/10"
                                        >
                                            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-white/5 shadow-lg">
                                                {getItemArt(album) ? (
                                                    <img src={getItemArt(album)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Disc size={32} className="text-white/20" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                                                {/* Actions */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSaveAlbum(album); }}
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                                                    title="Remove from Library"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onNavigate({ id: 'peel-reveal', data: album }); }}
                                                    className="absolute bottom-2 right-2 p-2.5 rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl"
                                                >
                                                    <Play size={16} fill="currentColor" className="ml-0.5" />
                                                </button>
                                            </div>
                                            <h3 className="font-semibold text-white/90 truncate mb-0.5">{album.name || album.title}</h3>
                                            <p className="text-xs text-white/50 truncate">{album.primaryArtists || 'Unknown Artist'}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-24 glass-card rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                                        <Disc size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Collecting Albums?</h3>
                                    <p className="text-white/40 max-w-xs mx-auto mb-8">Save your favorite albums to build your personal collection.</p>
                                    <button
                                        onClick={() => onNavigate({ id: 'explore' })}
                                        className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all text-sm"
                                    >
                                        Find Albums
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Artists Tab */}
                    {activeTab === 'artists' && (
                        <motion.div
                            key="artists"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {filteredArtists.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredArtists.map((artist, i) => (
                                        <motion.div
                                            key={artist.id || i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => onNavigate({ id: 'artist', data: artist })}
                                            className="glass-card p-4 rounded-xl cursor-pointer group hover:bg-white/10 flex flex-col items-center text-center"
                                        >
                                            <div className="relative w-32 h-32 mb-3 rounded-full overflow-hidden bg-white/5 shadow-lg border-2 border-white/5 group-hover:border-white/20 transition-colors">
                                                {artist.image ? (
                                                    <img src={artist.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User size={32} className="text-white/20" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />

                                                {/* Actions */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleFollowArtist(artist); }}
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                                                    title="Unfollow Artist"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <h3 className="font-semibold text-white/90 truncate w-full mb-0.5">{artist.name}</h3>
                                            <p className="text-xs text-white/50 uppercase tracking-widest">Artist</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-24 glass-card rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-500">
                                        <User size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Follow your idols</h3>
                                    <p className="text-white/40 max-w-xs mx-auto mb-8">Your followed artists will appear here for quick access.</p>
                                    <button
                                        onClick={() => onNavigate({ id: 'search', data: { query: 'Top Artists' } })}
                                        className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all text-sm"
                                    >
                                        Browse Artists
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create Playlist Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreatePlaylistModal
                        onClose={() => setShowCreateModal(false)}
                        onCreate={createPlaylist}
                    />
                )}
                {songToAdd && (
                    <AddToPlaylistModal
                        song={songToAdd}
                        onClose={() => setSongToAdd(null)}
                    />
                )}
            </AnimatePresence>

            {/* Confirm Modal */}
            <ConfirmDialog
                open={showConfirm !== null}
                message={showConfirm?.message || ''}
                onConfirm={() => showConfirm?.action()}
                onCancel={() => setShowConfirm(null)}
                confirmLabel="Delete"
                destructive
            />
        </>
    );
}

// Create Playlist Modal Component
function CreatePlaylistModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-2xl"
                style={{
                    background: '#09090b', // zinc-950
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4">Create Playlist</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Playlist name..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-lg"
                        autoFocus
                    />

                    <div className="flex items-center gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
