"use client";

import React, { useState, useMemo } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { motion, AnimatePresence } from "framer-motion";
import {
    Heart, Disc3, Users, Clock, ListMusic, Plus, Play, Shuffle,
    Trash2, Search, X, Download, Settings
} from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { shuffleArray } from "@/lib/helpers";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props { onNavigate: (v: ViewState) => void }

type LibTab = "liked" | "albums" | "artists" | "recent" | "playlists";

const TABS: { id: LibTab; label: string; icon: any }[] = [
    { id: "liked", label: "Liked", icon: Heart },
    { id: "albums", label: "Albums", icon: Disc3 },
    { id: "artists", label: "Artists", icon: Users },
    { id: "recent", label: "Recent", icon: Clock },
    { id: "playlists", label: "Playlists", icon: ListMusic },
];

export function LibraryTab({ onNavigate }: Props) {
    const [activeTab, setActiveTab] = useState<LibTab>("liked");
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [showConfirm, setShowConfirm] = useState<{ message: string; action: () => void } | null>(null);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const { playInstantMix, loadMix } = usePlayback();
    const { likedSongs, savedAlbums, savedArtists, recentlyPlayed, mixes, toggleLike, isLiked, toggleSaveAlbum, toggleFollowArtist, addMix, deleteMix, isDownloaded } = useLibrary();

    const userPlaylists = useMemo(() =>
        mixes.filter((m) => !m.id.startsWith("quick-") && !m.id.startsWith("search-") && !m.id.startsWith("album-") && !m.id.startsWith("artist-") && !m.id.startsWith("radio-") && !m.id.startsWith("explore-") && !m.id.startsWith("home-") && !m.id.startsWith("region-") && !m.id.startsWith("section-") && !m.id.startsWith("instant-")),
        [mixes]
    );

    const filterItems = (items: any[]) => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter((item) => {
            const name = ((item as any).name || (item as any).title || "").toLowerCase();
            const artist = ((item as any).primaryArtists || (item as any).artist || "").toLowerCase();
            return name.includes(q) || artist.includes(q);
        });
    };

    const playAll = (songs: any[], title: string, shuffled = false) => {
        if (songs.length === 0) return;
        const list = shuffled ? shuffleArray(songs) : songs;
        playInstantMix({ id: `library-${Date.now()}`, title, color: "white", songs: list, currentSongIndex: 0 });
    };

    const createPlaylist = () => {
        const name = newPlaylistName.trim();
        if (!name) return;
        addMix({ id: `user-${Date.now()}`, title: name, color: "white", songs: [], currentSongIndex: 0 });
        setNewPlaylistName("");
        setShowCreatePlaylist(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-14 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[26px] font-bold text-white tracking-tight">Library</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-white/40 active:text-white/60">
                            <Search size={20} />
                        </button>
                        <button onClick={() => onNavigate({ id: "settings" })} className="p-2 text-white/40 active:text-white/60">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                {showSearch && (
                    <div className="relative mb-3">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter library..."
                            className="w-full bg-white/[0.05] border border-white/[0.06] py-2.5 pl-10 pr-8 rounded-xl text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.12] font-medium"
                            autoFocus
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X size={12} className="text-white/30" />
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors
                                ${activeTab === tab.id
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-white/40 border-white/[0.06] active:bg-white/[0.04]"
                                }`}
                        >
                            <tab.icon size={12} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-44">
                <AnimatePresence mode="wait">
                    {activeTab === "liked" && (
                        <TabContent key="liked">
                            <PlayControls count={likedSongs.length} onPlay={() => playAll(likedSongs, "Liked Songs")} onShuffle={() => playAll(likedSongs, "Liked Songs", true)} />
                            {filterItems(likedSongs).length > 0 ? (
                                <SongList songs={filterItems(likedSongs)} onPlay={(songs, i) => { const list = songs.slice(i).concat(songs.slice(0, i)); playAll(list, "Liked Songs"); }} onUnlike={(song) => toggleLike(song)} showUnlike isDownloaded={isDownloaded} />
                            ) : (
                                <EmptyState message="No liked songs yet" sub="Tap the heart on any song" />
                            )}
                        </TabContent>
                    )}

                    {activeTab === "albums" && (
                        <TabContent key="albums">
                            {filterItems(savedAlbums).length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {filterItems(savedAlbums).map((album: any, i: number) => (
                                        <button
                                            key={album.id || i}
                                            onClick={() => onNavigate({ id: "album", data: album })}
                                            className="text-left active:scale-95 transition-transform"
                                        >
                                            <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative group">
                                                {getArt(album) && <img src={getArt(album)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSaveAlbum(album); }}
                                                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-active:opacity-100"
                                                >
                                                    <X size={12} className="text-white/60" />
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[12px] font-medium text-white/70 truncate">{decodeHtml(album.name || album.title || "")}</p>
                                            <p className="text-[10px] text-white/25 truncate">{decodeHtml(album.primaryArtists || "")}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No saved albums" sub="Save albums to find them here" />
                            )}
                        </TabContent>
                    )}

                    {activeTab === "artists" && (
                        <TabContent key="artists">
                            {filterItems(savedArtists).length > 0 ? (
                                <div className="grid grid-cols-3 gap-4">
                                    {filterItems(savedArtists).map((artist: any, i: number) => (
                                        <button
                                            key={artist.id || artist.artistId || i}
                                            onClick={() => onNavigate({ id: "artist", data: artist })}
                                            className="flex flex-col items-center active:scale-95 transition-transform group"
                                        >
                                            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06] relative">
                                                {getArt(artist) && <img src={getArt(artist)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                            </div>
                                            <p className="mt-2 text-[11px] font-medium text-white/60 truncate w-full text-center">{decodeHtml(artist.name || artist.title || "")}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No followed artists" sub="Follow artists you love" />
                            )}
                        </TabContent>
                    )}

                    {activeTab === "recent" && (
                        <TabContent key="recent">
                            <PlayControls count={recentlyPlayed.length} onPlay={() => playAll(recentlyPlayed, "Recently Played")} onShuffle={() => playAll(recentlyPlayed, "Recently Played", true)} />
                            {filterItems(recentlyPlayed).length > 0 ? (
                                <SongList songs={filterItems(recentlyPlayed)} onPlay={(songs, i) => playAll(songs.slice(i), "Recently Played")} isDownloaded={isDownloaded} />
                            ) : (
                                <EmptyState message="No recent plays" sub="Start playing to build your history" />
                            )}
                        </TabContent>
                    )}

                    {activeTab === "playlists" && (
                        <TabContent key="playlists">
                            <button
                                onClick={() => setShowCreatePlaylist(true)}
                                className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl mb-4 active:bg-white/[0.06] transition-colors"
                            >
                                <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center">
                                    <Plus size={20} className="text-white/50" />
                                </div>
                                <span className="text-[14px] font-semibold text-white/70">Create Playlist</span>
                            </button>

                            {/* Create playlist inline */}
                            <AnimatePresence>
                                {showCreatePlaylist && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                                            <input
                                                type="text"
                                                value={newPlaylistName}
                                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
                                                placeholder="Playlist name..."
                                                className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.12] mb-3"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={createPlaylist} className="flex-1 py-2 bg-white text-black text-[12px] font-semibold rounded-lg active:scale-95 transition-transform">
                                                    Create
                                                </button>
                                                <button onClick={() => { setShowCreatePlaylist(false); setNewPlaylistName(""); }} className="px-4 py-2 text-white/40 text-[12px] font-medium">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {userPlaylists.length > 0 ? (
                                <div className="space-y-2">
                                    {userPlaylists.map((pl) => (
                                        <button
                                            key={pl.id}
                                            onClick={() => onNavigate({ id: "playlist", data: pl })}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors"
                                        >
                                            <div className="w-13 h-13 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0 border border-white/[0.05]" style={{ width: 52, height: 52 }}>
                                                {pl.songs[0] && getArt(pl.songs[0]) ? (
                                                    <img src={getArt(pl.songs[0])} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ListMusic size={20} className="text-white/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-[13px] font-semibold text-white/80 truncate">{pl.title}</p>
                                                <p className="text-[11px] text-white/30 mt-0.5">
                                                    {pl.songs.length} song{pl.songs.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { if (pl.songs.length > 0) playAll(pl.songs, pl.title); }}
                                                    className="w-8 h-8 flex items-center justify-center text-white/25 active:text-white/60"
                                                >
                                                    <Play size={14} fill="currentColor" />
                                                </button>
                                                <button
                                                    onClick={() => setShowConfirm({ message: `Delete "${pl.title}"?`, action: () => deleteMix(pl.id) })}
                                                    className="w-8 h-8 flex items-center justify-center text-white/15 active:text-red-400/60"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No playlists yet" sub="Create your first playlist" />
                            )}
                        </TabContent>
                    )}
                </AnimatePresence>
            </div>

            {/* Confirm modal */}
            <ConfirmDialog
                open={showConfirm !== null}
                message={showConfirm?.message || ''}
                onConfirm={() => showConfirm?.action()}
                onCancel={() => setShowConfirm(null)}
                confirmLabel="Delete"
                destructive
            />
        </motion.div>
    );
}

// ─── Sub-components ──────────────────────────────────────

function TabContent({ children }: { children: React.ReactNode }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {children}
        </motion.div>
    );
}

function PlayControls({ count, onPlay, onShuffle }: { count: number; onPlay: () => void; onShuffle: () => void }) {
    if (count === 0) return null;
    return (
        <div className="flex gap-2 mb-4">
            <button onClick={onPlay} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-xl text-[12px] font-semibold active:scale-95 transition-transform">
                <Play size={14} fill="currentColor" /> Play
            </button>
            <button onClick={onShuffle} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/[0.06] text-white/70 rounded-xl text-[12px] font-semibold border border-white/[0.06] active:scale-95 transition-transform">
                <Shuffle size={14} /> Shuffle
            </button>
        </div>
    );
}

function SongList({ songs, onPlay, onUnlike, showUnlike, isDownloaded }: {
    songs: any[]; onPlay: (songs: any[], idx: number) => void;
    onUnlike?: (song: any) => void; showUnlike?: boolean;
    isDownloaded?: (id: string) => boolean;
}) {
    return (
        <div className="space-y-0.5">
            {songs.map((song: any, i: number) => {
                const name = decodeHtml((song as any).name || (song as any).title || "");
                const artist = decodeHtml((song as any).primaryArtists || (song as any).artist || "");
                const art = getArt(song);
                const downloaded = isDownloaded?.((song as any).id || "");

                return (
                    <div key={(song as any).id + "-" + i} className="flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors">
                        <button onClick={() => onPlay(songs, i)} className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0 relative">
                            {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                            {downloaded && (
                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-white/80 rounded-full flex items-center justify-center">
                                    <Download size={6} className="text-black" />
                                </div>
                            )}
                        </button>
                        <button onClick={() => onPlay(songs, i)} className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] font-medium text-white/80 truncate">{name}</p>
                            <p className="text-[11px] text-white/30 truncate">{artist}</p>
                        </button>
                        {showUnlike && onUnlike && (
                            <button onClick={() => onUnlike(song)} className="w-8 h-8 flex items-center justify-center text-white/20 active:text-red-400/60">
                                <Heart size={14} fill="currentColor" className="text-white/30" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <p className="text-white/30 text-sm font-medium">{message}</p>
            <p className="text-white/15 text-[11px] mt-1">{sub}</p>
        </div>
    );
}
