"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Shuffle, Heart, ArrowLeft, Disc, MoreHorizontal, Clock } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getPlaylistDetails, JioSaavnSong } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { cn, decodeHtml } from "@/lib/utils";

interface PlaylistViewProps {
    playlist: any;
    onBack: () => void;
    onNavigate: (view: { id: string; data?: any }) => void;
}

export function PlaylistView({ playlist, onBack, onNavigate }: PlaylistViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId } = usePlayback();

    const [songs, setSongs] = useState<JioSaavnSong[]>([]);
    const [filteredSongs, setFilteredSongs] = useState<JioSaavnSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [playlistData, setPlaylistData] = useState<any>(playlist);

    // Metadata
    const title = playlistData?.title || playlistData?.name || playlistData?.listname || 'Unknown Playlist';
    const subtitle = playlistData?.subtitle || playlistData?.description || 'Curated Playlist';
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
            setIsLoading(true);
            try {
                // 1. Try Direct Fetch
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
            } catch (e) {
                console.error('Failed to load playlist:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [playlist?.id, title]);

    // Filter Songs by Language (User Requirement Step 2)
    useEffect(() => {
        if (songs.length === 0) {
            setFilteredSongs([]);
            return;
        }

        const settings = loadSettings();
        const languages = settings.languages || ['english', 'hindi'];

        // Filter logic as requested
        const filtered = songs.filter(song => {
            // Include if song language matches ANY user language
            // Or if song has NO language (safety fallback)
            // Or if it's explicitly instrumental?
            const songLang = (song.language || '').toLowerCase();
            return languages.some(l => songLang.includes(l.toLowerCase()));
        });

        // If filter removes EVERYTHING (e.g. user has incompatible languages for this chart),
        // we should probably show something or just empty?
        // The user said: "Telugu chart -> Telugu songs only". 
        // If I open Telugu chart but only speak English, I see 0 songs. This is correct behavior per request.
        setFilteredSongs(filtered);

    }, [songs]); // Re-run when songs load

    // Display duration
    const totalDuration = filteredSongs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const formatDuration = (secs: number) => {
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

    const playSong = (index: number) => {
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
                                        {decodeHtml(song.name)}
                                    </p>
                                    <p className="text-sm text-white/40 truncate">
                                        {decodeHtml(song.primaryArtists || 'Unknown Artist')}
                                    </p>
                                </div>

                                <span className="text-sm text-white/25 tabular-nums">
                                    {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}
                                </span>

                                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={16} className="text-white/40" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-zinc-500">
                        <div className="mb-2">No songs available in your selected languages.</div>
                        <div className="text-xs">Check Settings to enable more languages.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
