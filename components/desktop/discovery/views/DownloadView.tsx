"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, Shuffle, Music, MoreHorizontal, Heart, Download as DownloadIcon, Trash2 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { isPlayableTrack, PlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";
import { getArt, formatDuration, shuffleArray } from "@/lib/helpers";
import { usePlayback, useLibrary, useUI, Mix } from "@/components/providers/playback-context";
import { OfflineStore, OfflineSong } from "@/lib/offline-store";
import { OfflinePlaylistStore, OfflinePlaylist } from "@/lib/offline-playlist-store";
import { ListMusic, Plus, ChevronRight } from "lucide-react";

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

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
    
    .quality-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 3px;
    }
    .quality-flac { background: rgba(180, 140, 255, 0.15); color: rgba(180, 140, 255, 0.9); }
    .quality-hires { background: rgba(255, 200, 100, 0.15); color: rgba(255, 200, 100, 0.9); }
    .quality-320 { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6); }

    .tab-active {
        background: rgba(255, 255, 255, 0.08);
        color: white;
    }
`;

type TabType = 'songs' | 'playlists';

interface DownloadViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onPlaySong?: (song: JioSaavnSong | PlayableTrack) => void;
    currentSongId?: string;
    isPlaying?: boolean;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

function VirtualizedSongList({ items, renderRow }: {
    items: OfflineSong[],
    renderRow: (item: OfflineSong, index: number, all: OfflineSong[]) => React.ReactNode
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const ROW_HEIGHT = 64;

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    if (items.length <= 50) {
        return (
            <div className="space-y-2">
                {items.map((song, i) => renderRow(song, i, items))}
            </div>
        );
    }

    return (
        <div ref={parentRef} className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hide">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
                        className="absolute top-0 left-0 w-full"
                        style={{ height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
                    >
                        {renderRow(items[virtualItem.index], virtualItem.index, items)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DownloadView({ onNavigate, currentSongId, isPlaying, onContextMenu }: DownloadViewProps) {
    const { playInstantMix, qualityPreference } = usePlayback();
    const { toggleLike, isLiked } = useLibrary();
    const { showToast } = useUI();

    const [activeTab, setActiveTab] = useState<TabType>('songs');
    const [downloadedSongs, setDownloadedSongs] = useState<OfflineSong[]>([]);
    const [offlinePlaylists, setOfflinePlaylists] = useState<OfflinePlaylist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortType, setSortType] = useState<'date' | 'name' | 'artist'>('date');
    const [sortDescending, setSortDescending] = useState(true);
    const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

    const loadDownloads = async () => {
        setIsLoading(true);
        try {
            const songs = await OfflineStore.getAllDownloadedDetails();
            setDownloadedSongs(songs);
            setOfflinePlaylists(OfflinePlaylistStore.getPlaylists());

            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                setStorageEstimate(estimate);
            }
        } catch (error) {
            console.error("Failed to load downloads", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDownloads();

        const handleOfflineChange = () => loadDownloads();
        const handlePlaylistChange = () => setOfflinePlaylists(OfflinePlaylistStore.getPlaylists());

        window.addEventListener('melora-offline-changed', handleOfflineChange);
        window.addEventListener('melora-offline-playlists-update', handlePlaylistChange);

        return () => {
            window.removeEventListener('melora-offline-changed', handleOfflineChange);
            window.removeEventListener('melora-offline-playlists-update', handlePlaylistChange);
        };
    }, []);

    const filteredSongs = useMemo(() => {
        let list = [...downloadedSongs];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(song =>
                (song.metadata.name || '').toLowerCase().includes(lowerQ) ||
                (song.metadata.primaryArtists || '').toLowerCase().includes(lowerQ) ||
                (song.metadata.album?.name || '').toLowerCase().includes(lowerQ)
            );
        }

        if (sortType === 'name') {
            list.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));
        } else if (sortType === 'artist') {
            list.sort((a, b) => (a.metadata.primaryArtists || '').localeCompare(b.metadata.primaryArtists || ''));
        } else {
            // date sorting - sort by savedAt descending by default
            list.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        }

        if (sortDescending) list.reverse();
        return list;
    }, [downloadedSongs, searchQuery, sortType, sortDescending]);

    const filteredPlaylists = useMemo(() => {
        let list = [...offlinePlaylists];
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            list = list.filter(p => (p.name || '').toLowerCase().includes(lowerQ));
        }

        if (sortType === 'name') {
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else {
            list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }

        if (sortDescending) list.reverse();
        return list;
    }, [offlinePlaylists, searchQuery, sortType, sortDescending]);

    const playSong = (item: OfflineSong, allItems: OfflineSong[]) => {
        const targetId = item.metadata.id;
        const idx = allItems.findIndex(i => i.metadata.id === targetId);
        const songs = allItems.map(i => ensurePlayableTrack(i.metadata, qualityPreference as AudioQuality));
        const newMix: Mix = {
            id: 'downloads-queue',
            title: 'Downloads',
            color: 'teal',
            songs: songs,
            currentSongIndex: idx >= 0 ? idx : 0
        };
        playInstantMix(newMix);
    };

    const playAll = (items: OfflineSong[], shuffle = false) => {
        if (items.length === 0) return;
        let songs = items.map(i => ensurePlayableTrack(i.metadata, qualityPreference as AudioQuality));
        if (shuffle) songs = shuffleArray(songs);
        const newMix: Mix = {
            id: 'downloads-queue',
            title: 'Downloads',
            color: 'teal',
            songs: songs,
            currentSongIndex: 0
        };
        playInstantMix(newMix);
    };

    const handleDelete = async (e: React.MouseEvent, record: OfflineSong) => {
        e.stopPropagation();
        try {
            await OfflineStore.removeSong(record.songId, record.quality);
            setDownloadedSongs(prev => prev.filter(s => s.id !== record.id));
            window.dispatchEvent(new CustomEvent('melora-offline-changed', { detail: { songId: record.songId, status: 'removed' } }));
            showToast(`Removed ${record.metadata.name} from downloads`, 'info');

            // Refresh storage estimate
            if (navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(setStorageEstimate);
            }
        } catch (error) {
            showToast(`Failed to remove ${record.metadata.name}`, 'error');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to remove ALL downloaded songs? This cannot be undone.")) return;

        setIsLoading(true);
        try {
            for (const song of downloadedSongs) {
                await OfflineStore.removeSong(song.songId, song.quality);
            }
            setDownloadedSongs([]);
            showToast('All downloads cleared', 'success');

            // Refresh storage estimate
            if (navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(setStorageEstimate);
            }
        } catch (error) {
            showToast('Failed to clear all downloads', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePlaylist = () => {
        const name = prompt("Enter playlist name:");
        if (name && name.trim()) {
            OfflinePlaylistStore.createPlaylist(name.trim());
            showToast(`Created offline playlist "${name}"`, 'success');
        }
    };

    const handleDeletePlaylist = (playlistId: string, name: string) => {
        if (window.confirm(`Delete offline playlist "${name}"?`)) {
            OfflinePlaylistStore.deletePlaylist(playlistId);
            showToast(`Deleted playlist "${name}"`, 'info');
        }
    };

    const renderSongRow = (record: OfflineSong, index: number, allItems: OfflineSong[]) => {
        const item = record.metadata;
        const isCurrentPlaying = currentSongId === item.id;

        const qualityLabel = record.qualityLabel || 'Downloaded';
        const fileSize = record.fileSize ? formatBytes(record.fileSize) : '';

        const badgeClass = qualityLabel.includes('FLAC') || qualityLabel.includes('Hi-Res') ? 'bg-amber-500/10 text-amber-500' : 'bg-teal-500/10 text-teal-400';

        return (
            <div
                key={record.id + index}
                onClick={() => playSong(record, allItems)}
                onContextMenu={(e) => onContextMenu?.(e, item)}
                className="glass-card flex items-center gap-4 p-3 rounded-xl cursor-pointer group"
            >
                <div className="w-8 text-center">
                    {isCurrentPlaying ? (
                        <div className="flex items-center justify-center gap-0.5">
                            <div className="w-1 h-4 bg-teal-400/80 rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-teal-400/60 rounded-full animate-pulse delay-75" />
                            <div className="w-1 h-5 bg-teal-400/80 rounded-full animate-pulse delay-150" />
                        </div>
                    ) : (
                        <>
                            <span className="text-sm text-white/30 group-hover:hidden">{index + 1}</span>
                            <Play size={14} className="hidden group-hover:block text-white mx-auto" fill="currentColor" />
                        </>
                    )}
                </div>

                <div className="relative w-12 h-12 flex-shrink-0">
                    <div
                        className={`absolute inset-0 rounded-full ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                        style={{
                            background: 'conic-gradient(from 0deg, rgba(30,30,30,1) 0%, rgba(50,50,50,1) 25%, rgba(30,30,30,1) 50%, rgba(50,50,50,1) 75%, rgba(30,30,30,1) 100%)',
                        }}
                    />
                    <div className={`absolute inset-2 rounded-full overflow-hidden ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}>
                        {getArt(item, '150x150') ? (
                            <img src={getArt(item, '150x150')} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                <Music size={12} className="text-white/30" />
                            </div>
                        )}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black border border-white/10" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isCurrentPlaying ? 'text-white' : 'text-white/80'}`}>
                            {item.name}
                        </p>
                        <span className={`quality-badge ${badgeClass} flex-shrink-0`}>
                            {qualityLabel}
                        </span>
                        {fileSize && (
                            <span className="text-[10px] text-white/30 hidden md:block border border-white/10 rounded px-1.5 py-0.5">
                                {fileSize}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-white/40 truncate">{item.primaryArtists}</p>
                </div>

                <p className="text-sm text-white/20 truncate max-w-32 hidden lg:block">{item.album?.name}</p>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-white/30 tabular-nums group-hover:hidden">
                        {formatDuration(item.duration)}
                    </span>

                    <div className="hidden group-hover:flex items-center gap-2">
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); toggleLike(item); }}
                            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isLiked(item.id) ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <Heart size={16} fill={isLiked(item.id) ? "currentColor" : "none"} />
                        </motion.button>
                        <motion.button
                            onClick={(e) => handleDelete(e, record)}
                            className="p-1.5 rounded-full hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                            title="Remove Download"
                        >
                            <Trash2 size={16} />
                        </motion.button>
                        <motion.button
                            onClick={(e) => onContextMenu?.(e, item)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                        >
                            <MoreHorizontal size={16} />
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlaylistCard = (playlist: OfflinePlaylist) => {
        const firstSong = playlist.songs[0];
        const art = firstSong ? getArt(firstSong, '150x150') : '';

        return (
            <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-xl cursor-pointer group flex items-center gap-4"
                onClick={() => onNavigate({ id: 'offline-playlist', data: playlist })}
            >
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
                    <p className="font-medium truncate">{playlist.name}</p>
                    <p className="text-sm text-white/40">{playlist.songs.length} songs</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {playlist.songs.length > 0 && (
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                const songs = playlist.songs.map(i => ensurePlayableTrack(i, qualityPreference as AudioQuality));
                                playInstantMix({
                                    id: playlist.id,
                                    title: playlist.name,
                                    color: 'teal',
                                    songs: songs,
                                    currentSongIndex: 0
                                });
                            }}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Play"
                        >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                        </motion.button>
                    )}

                    <motion.button
                        onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id, playlist.name); }}
                        className="p-2 rounded-full hover:bg-white/10 hover:text-red-500 text-white/40"
                        whileTap={{ scale: 0.9 }}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </motion.button>
                </div>

                <ChevronRight size={16} className="text-white/20" />
            </motion.div>
        );
    };

    const tabs: { id: TabType; label: string; count: number }[] = [
        { id: 'songs', label: 'Songs', count: downloadedSongs.length },
        { id: 'playlists', label: 'Playlists', count: offlinePlaylists.length },
    ];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: LIBRARY_STYLES }} />
            <div className="min-h-full p-8">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            Downloads
                            <span className="text-xs bg-teal-500/20 text-teal-300 font-bold px-3 py-1 rounded-full uppercase tracking-widest mt-1">Available Offline</span>
                        </h1>
                        <p className="text-white/40">Music saved directly to your device</p>
                    </div>

                    {storageEstimate && storageEstimate.quota && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-80 shrink-0">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Storage</span>
                                <span className="text-sm font-mono text-white/80">{formatBytes(storageEstimate.usage || 0)} / {formatBytes(storageEstimate.quota)}</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-500 rounded-full"
                                    style={{ width: `${Math.min(100, ((storageEstimate.usage || 0) / storageEstimate.quota) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
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
                            <span>{tab.label}</span>
                            <span className="text-white/30 ml-1">{tab.count}</span>
                        </motion.button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/40">Loading your offline library...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'songs' && (
                            <motion.div key="songs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {downloadedSongs.length === 0 && !searchQuery ? (
                                    <div className="text-center py-24 glass-card rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                        <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-500">
                                            <DownloadIcon size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">No Downloaded Music</h3>
                                        <p className="text-white/40 max-w-xs mx-auto mb-8">Save songs using the download button to listen without an internet connection.</p>
                                        <button
                                            onClick={() => onNavigate({ id: 'explore' })}
                                            className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all text-sm"
                                        >
                                            Explore Music
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search downloaded songs..."
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-sm text-white placeholder-white/30 transition-all font-medium"
                                                />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                                                        <circle cx="11" cy="11" r="8"></circle>
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                    </svg>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider hidden md:block">Sort By:</span>
                                                <button onClick={() => setSortType('date')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'date' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Date</button>
                                                <button onClick={() => setSortType('name')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'name' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Title</button>
                                                <button onClick={() => setSortType('artist')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-colors ${sortType === 'artist' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Artist</button>
                                                <button onClick={() => setSortDescending(!sortDescending)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white">
                                                    {sortDescending ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7-7-7 7" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {filteredSongs.length > 0 ? (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                                <div className="flex items-center gap-3 mb-6 justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <motion.button onClick={() => playAll(filteredSongs)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Play size={16} fill="currentColor" /> Play All
                                                        </motion.button>
                                                        <motion.button onClick={() => playAll(filteredSongs, true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Shuffle size={16} /> Shuffle
                                                        </motion.button>
                                                    </div>
                                                    <motion.button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors">
                                                        <Trash2 size={14} /> Clear All
                                                    </motion.button>
                                                </div>
                                                <VirtualizedSongList items={filteredSongs} renderRow={renderSongRow} />
                                            </motion.div>
                                        ) : (
                                            <div className="text-center py-20">
                                                <p className="text-white/40">No downloads matching "{searchQuery}"</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'playlists' && (
                            <motion.div key="playlists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {/* Create button */}
                                <motion.button
                                    onClick={handleCreatePlaylist}
                                    className="glass-card w-full flex items-center gap-4 p-4 rounded-xl mb-4 hover:bg-white/5"
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                                        <Plus size={24} className="text-white/40" />
                                    </div>
                                    <p className="font-medium text-white/60">Create Offline Playlist</p>
                                </motion.button>

                                {filteredPlaylists.length > 0 ? (
                                    <div className="space-y-3">
                                        {filteredPlaylists.map(playlist => renderPlaylistCard(playlist))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <ListMusic size={48} className="mx-auto text-white/10 mb-4" />
                                        <p className="text-white/40">
                                            {searchQuery ? `No offline playlists matching "${searchQuery}"` : "No offline playlists yet"}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </>
    );
}
