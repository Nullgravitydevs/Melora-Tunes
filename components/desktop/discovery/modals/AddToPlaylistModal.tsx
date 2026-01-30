"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ListMusic, Check } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack, isPlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";

interface AddToPlaylistModalProps {
    song: JioSaavnSong | PlayableTrack | null;
    onClose: () => void;
}

export function AddToPlaylistModal({ song, onClose }: AddToPlaylistModalProps) {
    const { mixes, addMix, addSongToMix, showToast, qualityPreference } = usePlayback();
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");

    // Filter user playlists
    const userPlaylists = mixes.filter(m =>
        m.id !== 'discovery-mix' &&
        !m.id.startsWith('search-') &&
        !m.id.startsWith('artist-') &&
        !m.id.startsWith('album-')
    );

    const handleAddToMix = (mixId: string, mixName: string) => {
        if (!song) return;

        // Convert to PlayableTrack if needed
        const track = isPlayableTrack(song)
            ? song
            : ensurePlayableTrack(song, qualityPreference as AudioQuality);

        addSongToMix(mixId, track);
        showToast(`Added to "${mixName}"`, "success");
        onClose();
    };

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        const newMix: Mix = {
            id: `playlist-${Date.now()}`,
            title: newPlaylistName.trim(),
            color: 'purple',
            songs: [],
            currentSongIndex: 0
        };

        addMix(newMix);
        handleAddToMix(newMix.id, newMix.title);
    };

    if (!song) return null;

    const songName = isPlayableTrack(song) ? song.title : song.name;

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
                    <h3 className="font-medium text-lg">Add to Playlist</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/50" />
                    </button>
                </div>

                {/* Song Info */}
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
                    <p className="text-sm text-white/60">Adding:</p>
                    <p className="font-medium truncate text-pink-400">{songName}</p>
                </div>

                {/* List */}
                <div className="max-h-[300px] overflow-y-auto p-2 scroll">
                    {userPlaylists.length === 0 && !showCreateInput && (
                        <div className="text-center py-8 text-white/30">
                            <ListMusic size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No playlists found</p>
                        </div>
                    )}

                    {userPlaylists.map(playlist => (
                        <button
                            key={playlist.id}
                            onClick={() => handleAddToMix(playlist.id, playlist.title)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                <ListMusic size={18} className="text-white/40 group-hover:text-white/80" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{playlist.title}</p>
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
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500/50"
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newPlaylistName.trim()}
                                className="p-2 bg-pink-500 rounded-lg text-white disabled:opacity-50"
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
                            Create New Playlist
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
