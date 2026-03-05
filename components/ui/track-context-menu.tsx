"use client";

import React, { useEffect, useRef } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { Play, ListPlus, Radio, User, Disc, X, HardDrive, Trash2, ListMusic } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { motion, AnimatePresence } from "framer-motion";

interface TrackContextMenuProps {
    visible: boolean;
    x: number;
    y: number;
    song: JioSaavnSong | null;
    onClose: () => void;
    onPlay: (song: JioSaavnSong) => void;
    onAddToQueue: (song: JioSaavnSong) => void;
    onGoToArtist: (artistId: string) => void;
    onGoToAlbum: (albumId: string) => void;
    isDownloaded: boolean;
    onDownload: (song: JioSaavnSong) => void;
    onRemoveDownload: (songId: string) => void;
    onAddToPlaylist: (song: JioSaavnSong) => void;
    onAddToOfflinePlaylist?: (song: JioSaavnSong) => void;
    onRemoveFromPlaylist?: (song: JioSaavnSong) => void;
    onStartRadio?: (song: JioSaavnSong) => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
    visible,
    x,
    y,
    song,
    onClose,
    onPlay,
    onAddToQueue,
    onGoToArtist,
    onGoToAlbum,
    isDownloaded,
    onDownload,
    onRemoveDownload,
    onAddToPlaylist,
    onAddToOfflinePlaylist,
    onRemoveFromPlaylist,
    onStartRadio
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { startRadio } = usePlayback();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [visible, onClose]);

    // Adjust position if off-screen
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    // Simple boundary check (logic can be improved for edge detection)
    if (typeof window !== 'undefined') {
        if (x + 200 > window.innerWidth) style.left = x - 200;
        if (y + 300 > window.innerHeight) style.top = y - 300;
    }

    if (!visible || !song) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="fixed z-50 w-56 glass-panel rounded-xl border border-white/10 shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl bg-black/80 text-white"
                    style={style}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <div className="px-2 py-1.5 mb-1 border-b border-white/10">
                        <h4 className="text-xs font-bold text-white line-clamp-1">{song.name}</h4>
                        <p className="text-[10px] text-gray-400 line-clamp-1">{song.primaryArtists}</p>
                    </div>

                    <MenuItem icon={<Play size={14} />} label="Play Now" onClick={() => { onPlay(song); onClose(); }} />
                    <MenuItem icon={<ListPlus size={14} />} label="Add to Queue" onClick={() => { onAddToQueue(song); onClose(); }} />
                    <MenuItem icon={<Radio size={14} />} label="Start Radio" onClick={() => { onStartRadio ? onStartRadio(song) : startRadio(song); onClose(); }} />
                    <MenuItem icon={<ListMusic size={14} />} label="Add to Playlist" onClick={() => { onAddToPlaylist(song); onClose(); }} />

                    {isDownloaded && onAddToOfflinePlaylist && (
                        <MenuItem icon={<ListPlus size={14} />} label="Add to Offline Playlist" onClick={() => { onAddToOfflinePlaylist(song); onClose(); }} />
                    )}

                    <div className="border-t border-white/10 my-1" />

                    <MenuItem icon={<User size={14} />} label="Go to Artist" onClick={() => {
                        // Try multiple paths for artist ID
                        let artistId = '';
                        if (song.primaryArtistsId) {
                            artistId = song.primaryArtistsId.split(',')[0].trim();
                        }
                        if (artistId) {
                            onGoToArtist(artistId);
                            onClose();
                        } else if (song.primaryArtists) {
                            // Fallback: pass the artist name so ArtistView can search for it
                            onGoToArtist(song.primaryArtists.split(',')[0].trim());
                            onClose();
                        }
                    }} />
                    <MenuItem icon={<Disc size={14} />} label="Go to Album" onClick={() => {
                        if (song.album?.id) {
                            onGoToAlbum(song.album.id);
                            onClose();
                        } else if (song.id) {
                            // Fallback: use the song itself as album reference
                            onGoToAlbum(song.id);
                            onClose();
                        }
                    }} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const MenuItem = ({ icon, label, onClick, highlight = false, variant = 'default' }: { icon: React.ReactNode, label: string, onClick: () => void, highlight?: boolean, variant?: 'default' | 'danger' }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg text-xs font-medium transition-colors ${variant === 'danger' ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' :
            highlight ? 'bg-accent-pink/20 text-accent-pink hover:bg-accent-pink/30' :
                'hover:bg-white/10 text-gray-200 hover:text-white'
            }`}
    >
        {icon}
        {label}
    </button>
);
