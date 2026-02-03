"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, ArrowLeft, Disc, MoreHorizontal, Clock, Pin as PinIcon, Trash2, AlertCircle, RefreshCcw } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getPlaylistDetails, JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack } from "@/lib/types";
import { loadSettings } from "@/lib/settings";
import { cn, decodeHtml } from "@/lib/utils";

interface PlaylistViewProps {
    playlist: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
}

export function PlaylistView({ playlist, onBack, onNavigate }: PlaylistViewProps) {
    const { addMix, updateMix, loadMix, deleteMix, currentSong, isPlaying, togglePlay, activeMixId, togglePin, mixes, qualityPreference, showToast } = usePlayback();

    const [songs, setSongs] = useState<(JioSaavnSong | PlayableTrack)[]>([]);
    const [filteredSongs, setFilteredSongs] = useState<(JioSaavnSong | PlayableTrack)[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playlistData, setPlaylistData] = useState<any>(playlist);

    // Metadata
    const title = playlistData?.title || playlistData?.name || playlistData?.listname || 'Unknown Playlist';
    const isUserMix = mixes.some(m => m.id === playlist?.id);
    const subtitle = playlistData?.subtitle || playlistData?.description || (isUserMix ? 'Custom Playlist' : 'Curated Playlist');
    const image = getImage(playlistData);

    function getImage(item: any) {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    }

    // Load Data with Smart Fallback
    useEffect(() => {
        const load = async () => {
            if (!playlist?.id) {
                setIsLoading(false);
                return;
            }

            // 0. PRIORITY: Local Mixes (User Created)
            // If this playlist exists in our local store, use that data directly.
            // This prevents "Smart Fallback" from searching the web for your private playlist name.
            const localMix = mixes.find(m => m.id === playlist.id);
            if (localMix && localMix.songs && localMix.songs.length > 0) {
                console.log(`[PlaylistView] Loaded local mix: ${localMix.title}`);
                // Ensure songs are formatted correctly? They should be since they come from API/Search.
                setSongs(localMix.songs);
                setIsLoading(false);
                return;
            }

            // Also check if the PROP passed has songs (e.g. passed from LibraryView)
            if (playlist.songs && Array.isArray(playlist.songs) && playlist.songs.length > 0) {
                console.log(`[PlaylistView] Using passed songs prop.`);
                setSongs(playlist.songs);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Try Direct Fetch (Remote)
                console.log(`[PlaylistView] Fetching details for: ${playlist.id}`);
                let details = await getPlaylistDetails(playlist.id);

                // 2. Smart Fallback: If empty, it might be a dynamic chart or bad ID.
                // Try searching for the title/name via Unified Search
                if ((!details || details.length === 0) && (title && title !== 'Unknown Playlist')) {
                    console.warn(`[PlaylistView] Direct fetch empty. Attempting smart fallback search for: "${title}"`);

                    try {
                        // Import dynamically to avoid circular deps if possible, or use standard import
                        const { searchUnified } = await import("@/lib/unified-search");
                        // Search for the *playlist name* but filter for songs
                        const searchResults = await searchUnified(title, undefined, 'song', '320'); // Default to high quality

                        if (searchResults && searchResults.length > 0) {
                            console.log(`[PlaylistView] Fallback successful. Found ${searchResults.length} tracks.`);
                            // Convert PlayableTrack back to JioSaavnSong structure for compatibility
                            // (Or update state type to support both, but for now map back)
                            details = searchResults.map(t => t.song || {
                                id: t.id,
                                name: t.title,
                                primaryArtists: t.artist,
                                image: t.art,
                                duration: typeof t.duration === 'string' ? parseInt(t.duration) : t.duration,
                                // url: t.sources[0]?.url -- REMOVED (Type mismatch, resolved at runtime)
                            } as any);
                        }
                    } catch (fallbackErr) {
                        console.error('[PlaylistView] Fallback search failed:', fallbackErr);
                    }
                }

                if (details && Array.isArray(details)) {
                    setSongs(details);
                } else {
                    setSongs([]);
                }
                setSongs(details || []);
            } catch (err) {
                console.error("[PlaylistView] Error loading playlist:", err);
                setError("Failed to load playlist content.");
            } finally {
                setIsLoading(false);
            }
        };
        setError(null);
        load();
    }, [playlist?.id, title, mixes]); // Add mixes to dependency, so if we add a song, it updates? No, this is mount logic mostly.

    // Filter Songs by Language (RELAXED)
    useEffect(() => {
        if (songs.length === 0) {
            setFilteredSongs([]);
            return;
        }

        // User feedback: Don't hide songs in playlists user explicitly clicked.
        // If I click "Telugu Hits", I want to see Telugu songs even if my setting is English.
        // Only filter if it's a "For You" generated list, but for specific playlists, show all.
        setFilteredSongs(songs);

    }, [songs]); // Re-run when songs load

    // Display duration
    const totalDuration = filteredSongs.reduce((acc, s) => acc + (typeof s.duration === 'string' ? parseInt(s.duration) : s.duration || 0), 0);
    const formatDuration = (secs: number) => {
        if (!secs) return '0 min';
        const mins = Math.floor(secs / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours} hr ${mins % 60} min`;
        return `${mins} min`;
    };

    // Mix ID
    const PLAYLIST_MIX_ID = `playlist-${playlistData?.id || 'unknown'}`;

    // Play Handlers
    const playAll = (shuffle = false) => {
        if (filteredSongs.length === 0) return;
        const list = shuffle ? [...filteredSongs].sort(() => Math.random() - 0.5) : filteredSongs;
        const newMix: Mix = {
            id: PLAYLIST_MIX_ID,
            title: title,
            color: 'white', // Could extract dominant color later
            songs: list,
            currentSongIndex: 0
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(PLAYLIST_MIX_ID, { songs: list, currentSongIndex: 0 });
        }
        loadMix(PLAYLIST_MIX_ID);
    };

    // Delete Playlist
    const deletePlaylistHandler = () => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            // Check if it's the active mix first?
            deleteMix(playlist.id);
            showToast(`Deleted "${title}"`, 'info');
            onBack();
        }
    };

    // Remove Song
    const removeSong = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (!isUserMix) return;

        const newSongs = [...songs];
        const removed = newSongs.splice(index, 1);

        setSongs(newSongs); // Optimistic UI

        // Update Actual Mix in Context
        const userMix = mixes.find(m => m.id === playlist.id);
        if (userMix) {
            // We need to pass the FULL mix object or checking how updateMix works
            // updateMix(id, partial)
            updateMix(playlist.id, { songs: newSongs });
        }

        showToast(`Removed "${(removed[0] as any)?.name || (removed[0] as any)?.title || 'song'}"`, 'success');
    };

    // Play a specific song
    const playSong = (index: number) => {
        if (filteredSongs.length === 0) return;

        const newMix: Mix = {
            id: PLAYLIST_MIX_ID,
            title: title,
            color: 'white',
            songs: filteredSongs,
            currentSongIndex: index
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(PLAYLIST_MIX_ID, { songs: filteredSongs, currentSongIndex: index });
        }
        loadMix(PLAYLIST_MIX_ID);
    };


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
                        <span className="text-xs text-white/40 uppercase tracking-wider">Playlist</span>
                        <h1 className="text-4xl font-bold mb-2 line-clamp-2 leading-tight">{decodeHtml(title)}</h1>
                        <p className="text-white/50 mb-1">{decodeHtml(subtitle)}</p>
                        <p className="text-sm text-white/30">
                            {filteredSongs.length} songs • {formatDuration(totalDuration)}
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
                <motion.button className="p-3 rounded-full bg-white/10 hover:bg-white/15">
                    <Heart size={18} />
                </motion.button>

                {/* Delete Playlist (User Only) */}
                {isUserMix && (
                    <motion.button
                        onClick={deletePlaylistHandler}
                        className="p-3 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-500 text-white/50 transition-colors"
                        title="Delete Playlist"
                    >
                        <Trash2 size={18} />
                    </motion.button>
                )}

                {/* Pin Button for Deck Sync */}
                {/* Pin Button for Deck Sync */}
                <motion.button
                    onClick={() => {
                        const existingMix = mixes.find(m => m.id === playlist.id);
                        if (existingMix) {
                            togglePin(playlist.id);
                        } else {
                            // Convert to Mix before pinning
                            const newMix: Mix = {
                                id: playlist.id,
                                title: title,
                                color: 'blue', // Default color
                                songs: songs.map(s => ({ ...s, preferredQuality: qualityPreference })),
                                currentSongIndex: 0,
                                pinned: true // Explicitly set pinned on creation
                            };
                            addMix(newMix); // This will add AND likely trigger toast
                            showToast(`Pinned "${title}" to Deck`, 'success');
                        }
                    }}
                    className={`p-3 rounded-full transition-colors ${mixes.find(m => m.id === playlist.id)?.pinned ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/15 text-white/50'}`}
                    whileTap={{ scale: 0.9 }}
                    title={mixes.find(m => m.id === playlist.id)?.pinned ? "Unpin from Deck" : "Pin to Deck"}
                >
                    <div className="relative">
                        <PinIcon size={18} />
                        {mixes.find(m => m.id === playlist.id)?.pinned && (
                            <motion.div
                                layoutId="pinned-badge"
                                className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"
                            />
                        )}
                    </div>
                </motion.button>
            </div>

            {/* Track List */}
            <div className="px-8 pb-32">
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
                ) : filteredSongs.length > 0 ? (
                    <div className="space-y-0.5">
                        {filteredSongs.map((song, i) => (
                            <motion.div
                                key={song.id + i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.01 }}
                                onClick={() => {
                                    if (currentSong?.id === song.id && activeMixId === PLAYLIST_MIX_ID) {
                                        togglePlay();
                                    } else {
                                        playSong(i);
                                    }
                                }}
                                className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/[0.04] cursor-pointer group transition-all"
                            >
                                <span className="w-6 text-center text-sm text-white/30 group-hover:hidden">{i + 1}</span>
                                <span className="w-6 text-center hidden group-hover:block">
                                    {currentSong?.id === song.id && activeMixId === PLAYLIST_MIX_ID && isPlaying ? (
                                        <Pause size={14} className="text-white mx-auto" />
                                    ) : (
                                        <Play size={14} className="text-white mx-auto" fill="currentColor" />
                                    )}
                                </span>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-white' : 'text-white/80'}`}>
                                        {decodeHtml((song as any).name || (song as any).title || 'Unknown Title')}
                                    </p>
                                    <p className="text-sm text-white/40 truncate">
                                        {decodeHtml((song as any).primaryArtists || (song as any).artist || 'Unknown Artist')}
                                    </p>
                                </div>

                                <span className="text-sm text-white/25 tabular-nums">
                                    {(() => {
                                        const d = typeof song.duration === 'string' ? parseInt(song.duration) : song.duration;
                                        if (!d) return '--:--';
                                        return `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`;
                                    })()}
                                </span>

                                <button
                                    onClick={(e) => isUserMix ? removeSong(e, i) : undefined}
                                    className={`p-2 opacity-0 group-hover:opacity-100 transition-opacity ${isUserMix ? 'hover:text-red-500 text-white/40' : 'text-white/40'}`}
                                    title={isUserMix ? "Remove from Playlist" : "Options"}
                                >
                                    {isUserMix ? <Trash2 size={16} /> : <MoreHorizontal size={16} />}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-10 rounded-3xl bg-white/[0.03] border border-white/10 max-w-sm w-full"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Failed to load</h2>
                            <p className="text-white/40 text-sm mb-6">{error}</p>
                            <button
                                onClick={() => { setError(null); setIsLoading(true); }}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors mx-auto text-sm"
                            >
                                <RefreshCcw size={16} />
                                Try Again
                            </button>
                        </motion.div>
                    </div>
                ) : (
                    <div className="py-20 text-center text-zinc-500">
                        {songs.length === 0 ? (
                            <>
                                <div className="mb-2">This playlist is empty.</div>
                                <div className="text-xs">Add songs from the Search or Explore pages!</div>
                            </>
                        ) : (
                            <>
                                <div className="mb-2">No songs available in your selected languages.</div>
                                <div className="text-xs">Check Settings to enable more languages.</div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
