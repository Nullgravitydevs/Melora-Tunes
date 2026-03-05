"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ListMusic, Check } from "lucide-react";
import { useUI } from "@/components/providers/playback-context";
import { OfflinePlaylistStore, OfflinePlaylist } from "@/lib/offline-playlist-store";
import { JioSaavnSong } from "@/lib/jiosaavn";

interface AddToOfflinePlaylistModalProps {
    song: JioSaavnSong | null;
    onClose: () => void;
}

export function AddToOfflinePlaylistModal({ song, onClose }: AddToOfflinePlaylistModalProps) {
    const { showToast } = useUI();
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [playlists, setPlaylists] = useState<OfflinePlaylist[]>([]);

    useEffect(() => {
        // Load offline playlists
        setPlaylists(OfflinePlaylistStore.getPlaylists());
    }, [song]);

    const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
        if (!song) return;

        OfflinePlaylistStore.addSong(playlistId, song);
        showToast(`Added to "${playlistName}"`, "success");
        onClose();
    };

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        const newPlaylist = OfflinePlaylistStore.createPlaylist(newPlaylistName.trim());
        setPlaylists(OfflinePlaylistStore.getPlaylists()); // Refresh list
        handleAddToPlaylist(newPlaylist.id, newPlaylist.name);
    };

    if (!song) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-medium text-lg">Add to Offline Playlist</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/50" />
                    </button>
                </div>

                {/* Song Info */}
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
                    <p className="text-sm text-white/60">Adding offline track:</p>
                    <p className="font-medium truncate text-white">{song.name}</p>
                </div>

                {/* List */}
                <div className="max-h-[300px] overflow-y-auto p-2 scroll">
                    {playlists.length === 0 && !showCreateInput && (
                        <div className="text-center py-8 text-white/30">
                            <ListMusic size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No offline playlists found</p>
                            <p className="text-xs mt-1 text-white/20">Create one below to save your downloads!</p>
                        </div>
                    )}

                    {playlists.map(playlist => (
                        <button
                            key={playlist.id}
                            onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                <ListMusic size={18} className="text-white/40 group-hover:text-white/80" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{playlist.name}</p>
                                <p className="text-xs text-white/40">{playlist.songs.length} songs</p>
                            </div>
                            <Plus size={16} className="text-white/0 group-hover:text-white/50" />
                        </button>
                    ))}
                </div>

                {/* Footer / Create New */}
                <div className="p-4 border-t border-white/5">
                    {showCreateInput ? (
                        <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist name"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20"
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newPlaylistName.trim()}
                                className="p-2 bg-white rounded-lg text-black disabled:opacity-50"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateInput(false)}
                                className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                            >
                                <X size={18} />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setShowCreateInput(true)}
                            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Create Offline Playlist
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
