"use client";

import React, { useState, useEffect } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, Play, Pause, Shuffle, Heart, Search, X,
    Disc3, Trash2, ListMusic
} from "lucide-react";
import { getPlaylistDetails, JioSaavnSong } from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { decodeHtml } from "@/lib/utils";
import { shuffleArray } from "@/lib/helpers";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { getArt, type ViewState } from "../DiscoveryEntry";
import { MetadataStore } from "@/lib/metadata-store";
import { AudioAnalysisResult } from "@/lib/audio-analysis";

interface Props {
    playlist: any;
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
}

export function PlaylistView({ playlist, onBack, onNavigate }: Props) {
    const [tracks, setTracks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showConfirm, setShowConfirm] = useState<{ message: string; action: () => void } | null>(null);
    const [trackMetadataMap, setTrackMetadataMap] = useState<Record<string, AudioAnalysisResult>>({});
    const { loadMix, playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();
    const { addMix, updateMix, mixes, toggleLike, isLiked, deleteMix } = useLibrary();

    const playlistId = playlist?.id || playlist?.listid || "";
    const playlistName = decodeHtml(playlist?.name || playlist?.title || "");
    const playlistArt = getArt(playlist);
    const isUserPlaylist = playlistId.startsWith("user-") || mixes.some((m) => m.id === playlistId);
    const localMix = mixes.find((m) => m.id === playlistId);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                // Prioritize local mix data
                if (localMix && localMix.songs.length > 0) {
                    if (!cancelled) setTracks(localMix.songs);
                } else if (playlist?.songs?.length > 0) {
                    if (!cancelled) setTracks(playlist.songs);
                } else if (playlistId && !playlistId.startsWith("user-")) {
                    const songs = await getPlaylistDetails(playlistId);
                    if (!cancelled) {
                        if (songs.length > 0) {
                            setTracks(songs);
                        } else if (playlistName) {
                            // Fallback: search by playlist name
                            const fallback = await searchUnified(playlistName).catch(() => []);
                            if (!cancelled) setTracks(fallback);
                        }
                    }
                }
            } catch (e) {
                // Fallback search
                if (playlistName && !cancelled) {
                    try {
                        const fallback = await searchUnified(playlistName);
                        if (!cancelled) setTracks(fallback);
                    } catch { }
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [playlistId, playlistName]);

    useEffect(() => {
        let active = true;
        const fetchMeta = async () => {
            if (tracks.length === 0) return;
            const newMeta: Record<string, AudioAnalysisResult> = {};
            let hasChanges = false;
            for (const t of tracks) {
                const id = (t as any).id || (t as any).song?.id;
                if (id && !trackMetadataMap[id]) {
                    const meta = await MetadataStore.getMetadata(id);
                    if (meta && active) {
                        newMeta[id] = meta as AudioAnalysisResult;
                        hasChanges = true;
                    }
                }
            }
            if (hasChanges && active) {
                setTrackMetadataMap(prev => ({ ...prev, ...newMeta }));
            }
        };
        fetchMeta();
        return () => { active = false; };
    }, [tracks]);

    const filteredTracks = search.trim()
        ? tracks.filter((t) => {
            const q = search.toLowerCase();
            const name = ((t as any).name || (t as any).title || "").toLowerCase();
            const artist = ((t as any).primaryArtists || (t as any).artist || "").toLowerCase();
            return name.includes(q) || artist.includes(q);
        })
        : tracks;

    const playSongs = (index: number, shuffled = false) => {
        if (tracks.length === 0) return;
        const list = shuffled ? shuffleArray(tracks) : tracks;
        const mixId = playlistId || `playlist-${Date.now()}`;
        const existing = mixes.find((m) => m.id === mixId);
        if (existing) {
            updateMix(mixId, { songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        } else {
            addMix({ id: mixId, title: playlistName, color: "white", songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        }
    };

    const removeSong = (index: number) => {
        if (!isUserPlaylist || !playlistId) return;
        const updated = [...tracks];
        updated.splice(index, 1);
        setTracks(updated);
        updateMix(playlistId, { songs: updated });
    };

    const isCurrent = (song: any) => {
        if (!currentSong) return false;
        const id = (song as any).id || (song as any).song?.id;
        return id === (currentSong as any).id;
    };

    const totalDuration = tracks.reduce((sum, t) => sum + ((t as any).duration || (t as any).song?.duration || 0), 0);
    const totalMinutes = Math.floor(totalDuration / 60);

    return (
        <div className="h-full bg-black overflow-y-auto no-scrollbar pb-44">
            {/* Hero */}
            <div className="relative px-5 pt-16 pb-5">
                {playlistArt && (
                    <div className="absolute inset-0 overflow-hidden">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `url(${playlistArt})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                filter: "blur(80px) brightness(0.12) saturate(0)",
                                transform: "scale(1.5)",
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black" />
                    </div>
                )}

                <button onClick={onBack} className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronLeft size={20} className="text-white" />
                </button>

                <div className="relative z-10 flex flex-col items-center pt-4">
                    <div className="w-[180px] h-[180px] rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                        {playlistArt ? (
                            <img src={playlistArt} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><ListMusic size={40} className="text-white/10" /></div>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-white mt-4 text-center px-4 line-clamp-2">{playlistName}</h1>
                    <p className="text-[11px] text-white/25 mt-1">
                        {tracks.length} song{tracks.length !== 1 ? "s" : ""}{totalMinutes > 0 ? ` · ${totalMinutes} min` : ""}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 px-5 pb-3">
                <button
                    onClick={() => playSongs(0)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-[13px] font-semibold active:scale-95 transition-transform"
                >
                    <Play size={16} fill="currentColor" /> Play
                </button>
                <button
                    onClick={() => playSongs(0, true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.06] text-white/70 rounded-xl text-[13px] font-semibold border border-white/[0.06] active:scale-95 transition-transform"
                >
                    <Shuffle size={16} /> Shuffle
                </button>
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${showSearch ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/[0.08]"}`}
                >
                    <Search size={18} />
                </button>
            </div>

            {/* Search bar */}
            {showSearch && (
                <div className="px-5 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find in playlist..."
                            className="w-full bg-white/[0.05] border border-white/[0.06] py-2.5 pl-9 pr-8 rounded-xl text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] font-medium"
                            autoFocus
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X size={10} className="text-white/30" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Track list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            ) : filteredTracks.length > 0 ? (
                <div className="px-5">
                    <div className="space-y-0.5">
                        {filteredTracks.map((song: any, i: number) => {
                            const current = isCurrent(song);
                            const name = decodeHtml((song as any).name || (song as any).title || "");
                            const artist = decodeHtml((song as any).primaryArtists || (song as any).artist || "");
                            const art = (song as any).art || getArt(song.song || song);
                            const duration = (song as any).duration || (song as any).song?.duration || 0;

                            return (
                                <div
                                    key={((song as any).id || i) + "-pl-" + i}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${current ? "bg-white/[0.03]" : ""}`}
                                >
                                    <button
                                        onClick={() => current ? togglePlay() : playSongs(i)}
                                        className="flex-1 flex items-center gap-3 min-w-0"
                                    >
                                        <span className={`w-5 text-right text-[11px] font-medium flex-shrink-0 ${current ? "text-white" : "text-white/15"}`}>
                                            {current && isPlaying ? (
                                                <Disc3 size={14} className="text-white animate-spin" />
                                            ) : i + 1}
                                        </span>
                                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                                            {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className={`text-[13px] font-medium truncate ${current ? "text-white" : "text-white/70"}`}>{name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className="text-[10px] text-white/25 truncate">{artist}</p>
                                                {trackMetadataMap[((song as any).id || (song as any).song?.id)] && (
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <span className="text-[8px] bg-white/10 text-white/60 px-1 py-0.5 rounded uppercase font-bold tracking-widest leading-none border border-white/5">
                                                            {trackMetadataMap[((song as any).id || (song as any).song?.id)].bpm} BPM
                                                        </span>
                                                        <span className="text-[8px] bg-white/10 text-white/60 px-1 py-0.5 rounded uppercase font-bold tracking-widest leading-none border border-white/5">
                                                            {trackMetadataMap[((song as any).id || (song as any).song?.id)].key}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                    <span className="text-[10px] text-white/15 font-mono flex-shrink-0">
                                        {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : ""}
                                    </span>
                                    {isUserPlaylist && (
                                        <button
                                            onClick={() => removeSong(i)}
                                            className="w-7 h-7 flex items-center justify-center text-white/15 active:text-red-400/60 flex-shrink-0"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-white/25 text-sm">{search ? "No matches" : "No tracks"}</p>
                </div>
            )}

            {/* Delete playlist */}
            {isUserPlaylist && (
                <div className="px-5 mt-8 mb-4">
                    <button
                        onClick={() => setShowConfirm({ message: `Delete "${playlistName}"?`, action: () => { deleteMix(playlistId); onBack(); } })}
                        className="w-full py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-[12px] text-red-400/60 font-medium active:bg-white/[0.05] transition-colors"
                    >
                        Delete Playlist
                    </button>
                </div>
            )}

            {/* Confirm modal */}
            <ConfirmDialog
                open={showConfirm !== null}
                message={showConfirm?.message || ''}
                onConfirm={() => showConfirm?.action()}
                onCancel={() => setShowConfirm(null)}
                confirmLabel="Delete"
                destructive
            />
        </div>
    );
}
