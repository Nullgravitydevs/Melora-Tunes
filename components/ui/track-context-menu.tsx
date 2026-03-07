"use client";

import React, { useState, useEffect, useRef } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { Play, ListPlus, Radio, User, Disc, X, HardDrive, Trash2, ListMusic, Download, Sparkles } from "lucide-react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
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
    showNavigation?: boolean; // [B2] Control visibility of Go to Artist/Album
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
    showNavigation = true
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { downloadedState } = useLibrary();
    const { downloadSong } = usePlayback();

    // Determine quality upgrade opportunity
    const downloadedQualities = song ? downloadedState[song.id] || [] : [];
    const hasFlac = downloadedQualities.includes('flac') || downloadedQualities.includes('hires');
    const isOnlyLossy = downloadedQualities.length > 0 && !hasFlac;

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

    // Track online state dynamically for Navigation (F28)
    const [isOnline, setIsOnline] = useState(true);
    useEffect(() => {
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Adjust position if off-screen
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    if (typeof window !== 'undefined') {
        if (x + 200 > window.innerWidth) style.left = x - 200;
        if (y + 300 > window.innerHeight) style.top = y - 300;
    }

    if (!visible || !song) return null;

    // [B1/B2/F28] Determine if we can navigate to artist/album (require internet for these actions)
    const hasArtistId = !!(song.primaryArtistsId && song.primaryArtistsId.trim());
    const hasArtistName = !!(song.primaryArtists && song.primaryArtists.trim());
    const canGoToArtist = showNavigation && isOnline && (hasArtistId || hasArtistName);
    const canGoToAlbum = showNavigation && isOnline && !!(song.album?.id && song.album.id.trim());

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
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-2 py-1.5 mb-1 border-b border-white/10">
                        <h4 className="text-xs font-bold text-white line-clamp-1">{song.name}</h4>
                        <p className="text-[10px] text-gray-400 line-clamp-1">{song.primaryArtists}</p>
                    </div>

                    <MenuItem icon={<Play size={14} />} label="Play Now" onClick={() => { onPlay(song); onClose(); }} />
                    <MenuItem icon={<ListPlus size={14} />} label="Add to Queue" onClick={() => { onAddToQueue(song); onClose(); }} />
                    <MenuItem icon={<ListMusic size={14} />} label="Add to Playlist" onClick={() => { onAddToPlaylist(song); onClose(); }} />

                    {!isDownloaded && (
                        <MenuItem icon={<Download size={14} />} label="Download" onClick={() => { onDownload(song); onClose(); }} />
                    )}

                    {/* Quality Upgrade Detector */}
                    {isOnlyLossy && (
                        <MenuItem
                            icon={<Sparkles size={14} />}
                            label="Upgrade to FLAC"
                            highlight={true}
                            onClick={() => { downloadSong(song); onClose(); }}
                        />
                    )}

                    {isDownloaded && onRemoveDownload && (
                        <MenuItem icon={<Trash2 size={14} />} label="Remove Download" variant="danger" onClick={() => { onRemoveDownload(song.id); onClose(); }} />
                    )}

                    {isDownloaded && onAddToOfflinePlaylist && (
                        <MenuItem icon={<ListPlus size={14} />} label="Add to Offline Playlist" onClick={() => { onAddToOfflinePlaylist(song); onClose(); }} />
                    )}

                    {/* [B2] Only show navigation when data is available */}
                    {(canGoToArtist || canGoToAlbum) && (
                        <>
                            <div className="border-t border-white/10 my-1" />

                            {canGoToArtist && (
                                <MenuItem icon={<User size={14} />} label="Go to Artist" onClick={() => {
                                    const artistId = hasArtistId ? song.primaryArtistsId.split(',')[0].trim() : '';
                                    if (artistId) {
                                        onGoToArtist(artistId);
                                    } else if (hasArtistName) {
                                        onGoToArtist(song.primaryArtists.split(',')[0].trim());
                                    }
                                    onClose();
                                }} />
                            )}
                            {canGoToAlbum && (
                                <MenuItem icon={<Disc size={14} />} label="Go to Album" onClick={() => {
                                    onGoToAlbum(song.album!.id);
                                    onClose();
                                }} />
                            )}
                        </>
                    )}
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
