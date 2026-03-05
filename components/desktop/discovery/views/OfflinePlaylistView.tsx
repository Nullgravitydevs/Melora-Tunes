"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Shuffle, ArrowLeft, Disc, Disc3, Trash2, Clock, Search } from "lucide-react";
import { usePlayback, useUI, Mix } from "@/components/providers/playback-context";
import { OfflinePlaylistStore, OfflinePlaylist } from "@/lib/offline-playlist-store";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { ensurePlayableTrack } from "@/lib/track-utils";
import { AudioQuality, PlayableTrack } from "@/lib/types";
import { formatDuration, shuffleArray, getArt } from "@/lib/helpers";

interface OfflinePlaylistViewProps {
    playlist: OfflinePlaylist;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
    onContextMenu?: (e: React.MouseEvent, song: any, sourceId?: string) => void;
}

export function OfflinePlaylistView({ playlist: initialPlaylist, onBack, onNavigate, onContextMenu }: OfflinePlaylistViewProps) {
    const { loadMix, currentSong, isPlaying, togglePlay, activeMixId, playInstantMix, qualityPreference } = usePlayback();
    const { showToast } = useUI();

    const [playlist, setPlaylist] = useState<OfflinePlaylist>(initialPlaylist);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState<any[]>([]);

    useEffect(() => {
        // Keep playlist data fresh
        const updatePlaylist = () => {
            const latest = OfflinePlaylistStore.getPlaylist(initialPlaylist.id);
            if (latest) setPlaylist(latest);
        };
        updatePlaylist();

        window.addEventListener('melora-offline-playlists-update', updatePlaylist);
        return () => window.removeEventListener('melora-offline-playlists-update', updatePlaylist);
    }, [initialPlaylist.id]);

    useEffect(() => {
        let filtered = [...playlist.songs];
        if (searchQuery.trim()) {
            const lowQ = searchQuery.toLowerCase();
            filtered = filtered.filter(s => {
                const name = (s.name || '').toLowerCase();
                const art = (s.primaryArtists || '').toLowerCase();
                return name.includes(lowQ) || art.includes(lowQ);
            });
        }
        setFilteredSongs(filtered);
    }, [playlist.songs, searchQuery]);

    const totalDuration = filteredSongs.reduce((acc, s) => acc + (typeof s.duration === 'string' ? parseInt(s.duration) : s.duration || 0), 0);
    const PLAYLIST_MIX_ID = playlist.id;

    const playAll = (shuffle = false) => {
        if (playlist.songs.length === 0) return;
        let list = playlist.songs.map(i => ensurePlayableTrack(i, qualityPreference as AudioQuality));
        if (shuffle) list = shuffleArray(list);

        playInstantMix({
            id: PLAYLIST_MIX_ID,
            title: playlist.name,
            color: 'teal',
            songs: list,
            currentSongIndex: 0
        });
    };

    const playSong = (index: number) => {
        if (filteredSongs.length === 0) return;
        const list = playlist.songs.map(i => ensurePlayableTrack(i, qualityPreference as AudioQuality));

        // Find true index in playlist if filtered
        const actualSongId = filteredSongs[index].id;
        const actualIndex = playlist.songs.findIndex(s => s.id === actualSongId);

        playInstantMix({
            id: PLAYLIST_MIX_ID,
            title: playlist.name,
            color: 'teal',
            songs: list,
            currentSongIndex: actualIndex >= 0 ? actualIndex : 0
        });
    };

    const removeSong = (e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        OfflinePlaylistStore.removeSong(playlist.id, songId);
        showToast("Removed from offline playlist", "info");
    };

    const firstSong = playlist.songs[0];
    const image = firstSong ? getArt(firstSong, '500x500') : '';

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="relative h-[360px] overflow-hidden">
                {image && (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${image})`,
                            filter: 'blur(80px) brightness(0.2) saturate(0)',
                            transform: 'scale(1.5)'
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                <motion.button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/40 hover:bg-black/60 z-10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                </motion.button>

                <div className="absolute bottom-8 left-8 right-8 flex items-end gap-6">
                    {image ? (
                        <motion.img
                            src={image}
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
                        <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2 py-1 rounded inline-block mb-3">Offline Playlist</span>
                        <h1 className="text-4xl font-bold mb-2 line-clamp-2 leading-tight">{playlist.name}</h1>
                        <p className="text-white/50 mb-1">{playlist.description || "Created from downloads"}</p>
                        <p className="text-sm text-white/30">
                            {filteredSongs.length} songs • {formatDuration(totalDuration)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-6 flex flex-wrap items-center gap-4">
                <motion.button
                    onClick={() => playAll(false)}
                    className="px-8 py-3 bg-white text-black rounded-full font-semibold flex items-center gap-2"
                    style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={filteredSongs.length === 0}
                >
                    <Play size={18} fill="currentColor" />
                    Play
                </motion.button>
                <motion.button
                    onClick={() => playAll(true)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/15"
                    whileTap={{ scale: 0.9 }}
                    disabled={filteredSongs.length === 0}
                >
                    <Shuffle size={18} />
                </motion.button>

                <div className="flex-1"></div>

                {/* Search Bar */}
                <div className="relative w-64 mr-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                        type="text"
                        placeholder="Search tracks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder-white/20 focus:bg-white/10 focus:border-white/20 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Track List */}
            <div className="px-8 pb-24">
                <div className="flex items-center gap-4 px-3 py-2 text-xs text-white/30 uppercase tracking-wider border-b border-white/5 mb-2">
                    <span className="w-6 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <Clock size={14} />
                </div>

                {filteredSongs.length > 0 ? (
                    <div className="space-y-0.5">
                        {filteredSongs.map((song, i) => {
                            const isCurrentTrackMatch = () => {
                                if (!currentSong) return false;
                                const csId = (currentSong as any).song?.id || currentSong.id;
                                const sId = song.id;
                                return csId === sId;
                            };
                            const isActive = isCurrentTrackMatch() && activeMixId === PLAYLIST_MIX_ID;

                            return (
                                <motion.div
                                    key={song.id + i}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                    onClick={() => {
                                        if (isActive) {
                                            togglePlay();
                                        } else {
                                            playSong(i);
                                        }
                                    }}
                                    onContextMenu={(e) => onContextMenu && onContextMenu(e, song, playlist.id)}
                                    className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/[0.04] cursor-pointer group transition-all"
                                >
                                    <span className="w-6 text-center text-sm group-hover:hidden">
                                        {isActive && isPlaying ? <Disc3 className="animate-spin text-white mx-auto" size={14} /> : <span className={isActive ? 'text-white font-bold' : 'text-white/30'}>{i + 1}</span>}
                                    </span>
                                    <span className="w-6 text-center hidden group-hover:block">
                                        {isActive && isPlaying ? (
                                            <Pause size={14} className="text-white mx-auto" />
                                        ) : (
                                            <Play size={14} className="text-white mx-auto" fill="currentColor" />
                                        )}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`font-medium truncate ${isActive ? 'text-white font-bold' : 'text-white/80'}`}>
                                                {song.name || 'Unknown Title'}
                                            </p>
                                        </div>
                                        <p className="text-sm text-white/40 truncate">
                                            {song.primaryArtists || 'Unknown Artist'}
                                        </p>
                                    </div>

                                    <span className="text-sm text-white/25 tabular-nums">
                                        {(() => {
                                            const d = typeof song.duration === 'string' ? parseInt(song.duration) : song.duration;
                                            if (!d) return '--:--';
                                            return `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`;
                                        })()}
                                    </span>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <motion.button
                                            onClick={(e) => removeSong(e, song.id)}
                                            className="p-2 rounded-full text-white/40 hover:text-red-500 transition-colors"
                                            title="Remove from Playlist"
                                        >
                                            <Trash2 size={16} />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center text-zinc-500">
                        {playlist.songs.length === 0 ? (
                            <>
                                <div className="mb-2">This offline playlist is empty.</div>
                                <div className="text-xs">Add downloaded songs from the context menu!</div>
                            </>
                        ) : (
                            <div className="mb-2">No songs found matching "{searchQuery}"</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
