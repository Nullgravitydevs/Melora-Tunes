"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Library, Compass, Settings, Plus, Music, Heart, Clock, Volume2, SkipBack, SkipForward, Pause, Play, Maximize2, ListMusic, Disc3, Radio, Shuffle, Repeat, Trash2, MoreHorizontal, Download, ListPlus, LayoutGrid, Menu, User, LogOut, Minimize2, ArrowLeft, ArrowRight, X } from "lucide-react";
import { AudioQuality } from "@/lib/types";
import { getArt } from "@/lib/helpers";
import { usePlayback, useLibrary, useUI, Mix } from "@/components/providers/playback-context";
import { HomeView } from "./views/HomeView";
import { SearchView } from "./views/SearchView";
import { ArtistView } from "./views/ArtistView";
import { AlbumView } from "./views/AlbumView";
import { CategoryHubView } from "./views/CategoryHubView";
import { PlaylistView } from "./views/PlaylistView";
import { FullPlayer } from "./views/FullPlayer";
import { LibraryView } from "./views/LibraryView";
import { ExploreView } from "./views/ExploreView";
import { RadioView } from "./views/RadioView";
import { DesktopSettingsModal } from "@/components/ui/desktop-settings-modal";
import { SectionView } from "./views/SectionView";
import { PeelRevealView } from "./views/PeelRevealView";
import { TrackContextMenu } from "@/components/ui/track-context-menu";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlaylistItem } from "@/components/shared/PlaylistItem";
import { Tooltip } from "@/components/ui/tooltip";
import { AddToPlaylistModal } from "./modals/AddToPlaylistModal";
import { isUserPlaylistId, isUserPlaylistMix } from "@/lib/mix-id-utils";
import { PlayableTrack } from "@/lib/types";import { useAudioProgress } from "@/hooks/use-audio-progress";



/* ============================================================================
   DISCOVERY MODE - PURE BLACK & WHITE
   Monochrome Elegance
   ============================================================================ */

type ViewId = 'home' | 'search' | 'library' | 'explore' | 'radio' | 'artist' | 'album' | 'playlist' | 'settings' | 'trending' | 'albums' | 'charts' | 'retro' | 'editors_picks';

interface ViewState {
    id: ViewId | string;
    data?: any;
}

// --- MONOCHROME STYLES ---
const MONO_STYLES = `
    /* === NOISE TEXTURE === */
    .noise {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.012;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* === SCROLLBAR === */
    .scroll::-webkit-scrollbar {
        width: 4px;
    }
    .scroll::-webkit-scrollbar-track {
        background: transparent;
    }
    .scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 2px;
    }
    .scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    /* === SIDEBAR === */
    .sidebar {
        background: #000000;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* === PLAYER === */
    .player {
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(80px);
        -webkit-backdrop-filter: blur(80px);
        border-top: 1px solid rgba(255, 255, 255, 0.03);
    }

    /* === ALBUM BLUR === */
    .album-blur {
        position: fixed;
        inset: 0;
        z-index: -1;
        background-size: cover;
        background-position: center;
        filter: blur(20px) brightness(0.05) saturate(0) contrast(1.1);
        transform: scale(1.4);
        transition: all 1s ease;
    }

    /* === NAV ITEM === */
    .nav-item {
        position: relative;
        transition: all 0.2s ease;
        border-radius: 8px;
    }
    .nav-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%) scaleY(0);
        width: 2px;
        height: 16px;
        background: white;
        border-radius: 0 2px 2px 0;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .nav-item:hover {
        background: rgba(255, 255, 255, 0.03);
    }
    .nav-item.active::before {
        transform: translateY(-50%) scaleY(1);
    }
    .nav-item.active {
        background: rgba(255, 255, 255, 0.04);
    }

    /* === PLAYLIST HOVER === */
    .pl-item {
        transition: all 0.15s ease;
    }
    .pl-item:hover {
        background: rgba(255, 255, 255, 0.025);
        transform: translateX(2px);
    }

    /* === PROGRESS === */
    .progress-track {
        height: 3px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        cursor: pointer;
        transition: height 0.1s ease;
    }
    .progress-track:hover {
        height: 5px;
    }
    .progress-fill {
        height: 100%;
        background: white;
        border-radius: 2px;
        position: relative;
    }
    .progress-track:hover .progress-fill {
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
    }
    .progress-knob {
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%) scale(0);
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        transition: transform 0.1s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .progress-track:hover .progress-knob {
        transform: translateY(-50%) scale(1);
    }

    /* === CONTROLS === */
    .ctrl {
        transition: all 0.1s ease;
    }
    .ctrl:hover {
        transform: scale(1.1);
        color: white !important;
    }
    .ctrl:active {
        transform: scale(0.9);
    }

    /* === PLAY BUTTON === */
    .play-btn {
        box-shadow: 0 4px 25px rgba(255, 255, 255, 0.2);
        transition: all 0.15s ease;
    }
    .play-btn:hover {
        box-shadow: 0 6px 35px rgba(255, 255, 255, 0.35);
        transform: scale(1.06);
    }

    /* === SHIMMER === */
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    .shimmer {
        background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
        background-size: 200% 100%;
        animation: shimmer 2s ease-in-out infinite;
    }

    /* === CARD === */
    .card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.03);
        transition: all 0.25s ease;
    }
    .card:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.06);
        transform: translateY(-3px);
        box-shadow: 0 15px 40px -15px rgba(0, 0, 0, 0.6);
    }

    /* === BREATHING === */
    @keyframes breathe {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
    }
    .breathing {
        animation: breathe 2.5s ease-in-out infinite;
    }
`;

// --- MAIN COMPONENT ---
export function DiscoveryLayout() {
    const [viewStack, setViewStack] = useState<ViewState[]>([{ id: 'home' }]);
    const currentView = viewStack[viewStack.length - 1] || { id: 'home' };

    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFullPlayer, setShowFullPlayer] = useState(false);
    const { currentSong, isPlaying, loadMix, playInstantMix, activeMixId, play, togglePin, addToQueue } = usePlayback();
    const { mixes, likedSongs, recentlyPlayed, downloadSong, removeDownload, isDownloaded, addSongToMix, addMix, deleteMix, updateMix, isLiked, toggleLike } = useLibrary();
    const { showToast } = useUI();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; song: JioSaavnSong | null; sourceMixId?: string }>({
        visible: false,
        x: 0,
        y: 0,
        song: null
    });

    // Add to Playlist Modal State
    const [addToPlaylistSong, setAddToPlaylistSong] = useState<JioSaavnSong | PlayableTrack | null>(null);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("New Playlist");

    // Playlist Context Menu State
    const [playlistMenu, setPlaylistMenu] = useState<{ visible: boolean; x: number; y: number; mixId: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        mixId: null
    });

    // [PERF FIX #7] Wrap all handlers in useCallback to prevent re-rendering child views
    const handleContextMenu = useCallback((e: React.MouseEvent, song: JioSaavnSong, sourceMixId?: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            song,
            sourceMixId
        });
        setPlaylistMenu(prev => ({ ...prev, visible: false }));
    }, []);

    const handlePlaylistContextMenu = useCallback((e: React.MouseEvent, mixId: string) => {
        e.preventDefault();
        setPlaylistMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            mixId
        });
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    const handleGoToArtist = (artistIdOrName: string) => {
        // Clean ID/name
        const cleaned = artistIdOrName.split(',')[0].trim();
        // If it looks like an ID (numeric), pass as id; otherwise as name for search
        const isId = /^\d+$/.test(cleaned);
        handleNavigate({ id: 'artist', data: isId ? { id: cleaned } : { id: cleaned, name: cleaned } });
        setShowFullPlayer(false);
    };

    const handleGoToAlbum = (albumId: string) => {
        handleNavigate({ id: 'peel-reveal', data: { id: albumId } });
        setShowFullPlayer(false);
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setPlaylistMenu(prev => ({ ...prev, visible: false }));
    }, []);

    // NAVIGATION HANDLERS
    const handleNavigate = useCallback((view: ViewState) => {
        setViewStack(prev => {
            const last = prev[prev.length - 1];
            if (last.id === view.id && JSON.stringify(last.data) === JSON.stringify(view.data)) return prev;
            return [...prev, view];
        });
    }, []);

    const handleBack = useCallback(() => {
        setViewStack(prev => {
            if (prev.length <= 1) return prev;
            return prev.slice(0, -1);
        });
    }, []);

    const resetTo = useCallback((view: ViewState) => {
        setViewStack([view]);
    }, []);


    useEffect(() => { setMounted(true); }, []);

    // [PERF FIX #7] Memoize derived value
    const albumArt = useMemo(() => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) {
            return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        }
        return '';
    }, [currentSong?.image]);

    const handlePlaySong = useCallback((song: any) => {
        playInstantMix({
            id: `quick-play-${song.id}`,
            title: song.name,
            color: 'blue',
            songs: [song],
            currentSongIndex: 0
        });
    }, [playInstantMix]);

    if (!mounted) return <div className="fixed inset-0 bg-black" />;

    const handleCreatePlaylist = () => {
        setNewPlaylistName("New Playlist");
        setShowCreatePlaylist(true);
    };

    const confirmCreatePlaylist = () => {
        const name = newPlaylistName.trim();
        if (!name) return;
        const newId = `playlist-${Date.now()}`;
        const newMix: Mix = {
            id: newId,
            title: name,
            songs: [],
            color: 'blue',
            currentSongIndex: 0
        };
        if (addMix) {
            addMix(newMix);
            showToast(`Created "${name}"`, 'success');
            handleNavigate({ id: 'playlist', data: newMix });
        }
        setShowCreatePlaylist(false);
    };

    return (
        <div className="fixed inset-0 bg-[#000000] text-white font-sans overflow-hidden flex flex-col antialiased selection:bg-white/20">
            <style>{MONO_STYLES}</style>
            <div className="noise" />

            {/* Settings Modal (Existing Control Panel) */}
            <DesktopSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                currentLayout="discovery"
            />

            {/* FULL PLAYER */}
            <AnimatePresence>
                {showFullPlayer && (
                    <FullPlayer
                        isOpen={showFullPlayer}
                        onClose={() => setShowFullPlayer(false)}
                        onGoToArtist={handleGoToArtist}
                        onGoToAlbum={handleGoToAlbum}
                        onAddToPlaylist={(s) => {
                            setAddToPlaylistSong(s);
                            // We don't close player here to keep context, 
                            // ensuring Modal z-index is higher (it is z-[200] vs z-[100])
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ADD TO PLAYLIST MODAL */}
            <AnimatePresence>
                {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
            </AnimatePresence>

            {/* CREATE PLAYLIST MODAL */}
            <AnimatePresence>
                {showCreatePlaylist && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCreatePlaylist(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-white/80 text-[14px] font-semibold mb-4">Create Playlist</p>
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && confirmCreatePlaylist()}
                                placeholder="Playlist name..."
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] mb-4"
                                autoFocus
                            />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowCreatePlaylist(false)} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[13px] font-medium hover:bg-white/[0.08] transition-colors">Cancel</button>
                                <button onClick={confirmCreatePlaylist} className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors">Create</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Album BG - Grayscale - REMOVED for Deep Black performance (covered by bg-black anyway) */}
            {/* {albumArt && <div className="album-blur" style={{ backgroundImage: `url(${albumArt})` }} />} */}

            {/* Layout */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* SIDEBAR */}
                <aside className="w-56 flex-shrink-0 flex flex-col sidebar">
                    {/* Logo */}
                    <div className="px-5 py-5">
                        <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
                            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                                <Disc3 size={16} className="text-white/80" />
                            </div>
                            <div className="leading-none">
                                <span className="text-[15px] font-semibold">Melora</span>
                                <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 block mt-0.5">Discovery</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Nav */}
                    <nav className="px-2.5 space-y-0.5">
                        <NavItem icon={<Home size={18} />} label="Home" active={currentView.id === 'home'} onClick={() => resetTo({ id: 'home' })} />
                        <NavItem icon={<Search size={18} />} label="Search" active={currentView.id === 'search'} onClick={() => resetTo({ id: 'search' })} />
                        <NavItem icon={<Compass size={18} />} label="Explore" active={currentView.id === 'explore'} onClick={() => resetTo({ id: 'explore' })} />
                        <NavItem icon={<Radio size={18} />} label="Radio" active={currentView.id === 'radio'} onClick={() => resetTo({ id: 'radio' })} />
                        <NavItem icon={<Library size={18} />} label="Your Library" active={currentView.id === 'library'} onClick={() => resetTo({ id: 'library' })} />
                    </nav>

                    {/* Quick Links */}
                    <div className="px-2.5 mt-4 space-y-0.5">
                        <QuickLink
                            icon={<Heart size={14} />}
                            label="Liked Songs"
                            count={likedSongs.length}
                            onClick={() => handleNavigate({ id: 'library', data: { tab: 'liked' } })}
                        />
                        <QuickLink
                            icon={<Clock size={14} />}
                            label="Recently Played"
                            count={recentlyPlayed.length}
                            onClick={() => handleNavigate({ id: 'library', data: { tab: 'recent' } })}
                        />
                    </div>

                    <div className="mx-4 my-4 h-px bg-white/[0.04]" />

                    {/* Playlists - Takes remaining space */}
                    <div className="flex-1 overflow-y-auto scroll px-2.5 min-h-0">
                        <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Playlists</span>
                            <motion.button
                                onClick={handleCreatePlaylist}
                                className="p-1 rounded text-white/20 hover:text-white/50 hover:bg-white/5"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Plus size={12} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                        <div className="pb-2">
                            {mixes.filter(isUserPlaylistMix).length > 0 ? (
                                mixes.filter(isUserPlaylistMix).map((m, i) => (
                                    <PlaylistItem
                                        key={m.id}
                                        mix={m}
                                        index={i}
                                        onClick={() => { handleNavigate({ id: 'library', data: { tab: 'playlists', playlistId: m.id } }); loadMix(m.id); }}
                                        onContextMenu={handlePlaylistContextMenu}
                                        onDropSong={(song) => {
                                            addSongToMix(m.id, song);
                                            showToast(`Added to ${m.title}`, 'success');
                                        }}
                                    />
                                ))
                            ) : <EmptyState />}
                        </div>
                    </div>

                    {/* Settings - Fixed at bottom */}
                    <div className="px-2.5 py-3 border-t border-white/[0.04] bg-[#000000] z-20">
                        <NavItem icon={<Settings size={18} />} label="Settings" onClick={() => setShowSettings(true)} subtle />
                    </div>


                </aside>

                {/* MAIN */}
                <main className="flex-1 overflow-y-auto scroll pb-24 bg-[#000000]">
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={currentView.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="min-h-full"
                        >
                            {currentView.id === 'home' && (
                                <HomeView
                                    onNavigate={handleNavigate}
                                    onPlaySong={handlePlaySong}
                                    currentSongId={currentSong?.id}
                                    isPlaying={isPlaying}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {currentView.id === 'search' && (
                                <SearchView onNavigate={handleNavigate} onContextMenu={handleContextMenu} />
                            )}

                            {currentView.id === 'artist' && currentView.data && (
                                <ArtistView
                                    artist={currentView.data}
                                    onBack={handleBack}
                                    onNavigate={handleNavigate}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {currentView.id === 'album' && currentView.data && (
                                <AlbumView
                                    album={currentView.data}
                                    onBack={handleBack}
                                    onNavigate={handleNavigate}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {currentView.id === 'playlist' && currentView.data && (
                                <PlaylistView
                                    playlist={currentView.data}
                                    onBack={handleBack}
                                    onNavigate={handleNavigate}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {/* PEEL TO OPEN ALBUM */}
                            {currentView.id === 'peel-reveal' && currentView.data && (
                                <PeelRevealView
                                    album={currentView.data}
                                    onBack={handleBack}
                                    onPlay={handlePlaySong}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {currentView.id === 'library' && (
                                <LibraryView
                                    onNavigate={handleNavigate}
                                    initialTab={currentView.data?.tab}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {currentView.id === 'explore' && (
                                <ExploreView onNavigate={handleNavigate} onContextMenu={handleContextMenu} />
                            )}

                            {currentView.id === 'radio' && (
                                <RadioView onNavigate={handleNavigate} onContextMenu={handleContextMenu} />
                            )}

                            {currentView.id === 'category-hub' && currentView.data && (
                                <CategoryHubView
                                    data={currentView.data}
                                    onBack={handleBack}
                                    onNavigate={handleNavigate}
                                    onContextMenu={handleContextMenu}
                                />
                            )}

                            {(['trending', 'albums', 'charts', 'retro', 'editors_picks'].includes(String(currentView.id)) || String(currentView.id).startsWith('mood-')) && (
                                <SectionView
                                    sectionId={String(currentView.id)}
                                    sectionTitle={currentView.data?.title}
                                    initialData={currentView.data?.items}
                                    onNavigate={handleNavigate}
                                    onBack={handleBack}
                                    onContextMenu={handleContextMenu}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* PLAYER */}
            <PlayerBar onExpand={() => setShowFullPlayer(true)} onAddToPlaylist={(s) => setAddToPlaylistSong(s)} />

            {/* Global Context Menu */}
            {/* Playlist Context Menu */}
            <AnimatePresence>
                {playlistMenu.visible && playlistMenu.mixId && (
                    <>
                        <div className="fixed inset-0 z-[999]" onClick={closeContextMenu} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="fixed z-[1000] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px]"
                            style={{ left: playlistMenu.x, top: playlistMenu.y }}
                        >
                            {(() => {
                                const mix = mixes.find(m => m.id === playlistMenu.mixId);
                                if (!mix) return null;
                                return (
                                    <>
                                        <button onClick={() => { loadMix(mix.id); closeContextMenu(); }} className="w-full px-4 py-2.5 text-left text-[13px] text-white/80 hover:bg-white/[0.06] flex items-center gap-3"><Play size={14} /> Play</button>
                                        <button onClick={() => { handleNavigate({ id: 'library', data: { tab: 'playlists', playlistId: mix.id } }); closeContextMenu(); }} className="w-full px-4 py-2.5 text-left text-[13px] text-white/80 hover:bg-white/[0.06] flex items-center gap-3"><ListMusic size={14} /> View Playlist</button>
                                        <button onClick={() => { togglePin(mix.id); closeContextMenu(); }} className="w-full px-4 py-2.5 text-left text-[13px] text-white/80 hover:bg-white/[0.06] flex items-center gap-3">{mix.pinned ? '📌 Unpin' : '📌 Pin to Deck'}</button>
                                        <div className="border-t border-white/[0.06] my-1" />
                                        <button onClick={() => { deleteMix(mix.id); showToast('Playlist deleted', 'success'); closeContextMenu(); }} className="w-full px-4 py-2.5 text-left text-[13px] text-red-400 hover:bg-red-500/10 flex items-center gap-3"><Trash2 size={14} /> Delete</button>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <TrackContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                song={contextMenu.song}
                onClose={closeContextMenu}
                onPlay={(s) => { playInstantMix({ id: 'quick-play', title: 'Quick Play', color: 'blue', songs: [s], currentSongIndex: 0 }); }}
                onAddToQueue={(s) => { addToQueue(s); }}
                onGoToArtist={handleGoToArtist}
                onGoToAlbum={handleGoToAlbum}
                onStartRadio={(s) => handleNavigate({ id: 'radio', data: s })}
                isDownloaded={contextMenu.song ? isDownloaded(contextMenu.song.id) : false}
                onDownload={(s) => downloadSong(s)}
                onRemoveDownload={(id) => removeDownload(id)}
                onAddToPlaylist={(s) => setAddToPlaylistSong(s)}
                onRemoveFromPlaylist={
                    contextMenu.sourceMixId && isUserPlaylistId(contextMenu.sourceMixId)
                        ? (s) => {
                            const mix = mixes.find(m => m.id === contextMenu.sourceMixId);
                            if (mix && updateMix) {
                                const newSongs = mix.songs.filter(song => {
                                    // Handle both PlayableTrack and JioSaavnSong structures for ID check
                                    const sId = (song as any).id || (song as any).song?.id;
                                    return sId !== s.id;
                                });
                                updateMix(mix.id, { songs: newSongs });
                                showToast("Removed from playlist", "success");
                            }
                        }
                        : undefined
                }
            />
        </div>
    );
}

/* === COMPONENTS === */

function NavItem({ icon, label, active, onClick, subtle }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; subtle?: boolean }) {
    return (
        <motion.button
            onClick={onClick}
            className={`nav-item w-full flex items-center gap-2.5 px-3 py-2 text-left ${active ? 'active text-white' : subtle ? 'text-white/30 hover:text-white/50' : 'text-white/45 hover:text-white'}`}
            whileTap={{ scale: 0.98 }}
        >
            <span className={active ? 'text-white' : 'text-white/25'}>{icon}</span>
            <span className={`text-[13px] ${active ? 'font-medium' : ''}`}>{label}</span>
        </motion.button>
    );
}

function QuickLink({ icon, label, count, onClick }: { icon: React.ReactNode; label: string; count?: number; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/35 hover:text-white/60 hover:bg-white/[0.02] transition-all text-left"
        >
            <span className="text-white/20">{icon}</span>
            <span className="text-[12px] flex-1">{label}</span>
            {count !== undefined && <span className="text-[10px] text-white/15">{count}</span>}
        </button>
    );
}

// PlaylistItem moved to @/components/shared/PlaylistItem

function EmptyState() {
    return (
        <div className="px-2.5 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-white/[0.03] flex items-center justify-center">
                <ListMusic size={14} className="text-white/12" />
            </div>
            <p className="text-white/15 text-[11px]">No playlists</p>
        </div>
    );
}

/* === PLAYER === */

/* === PLAYER === */

function PlayerBar({ onExpand, onAddToPlaylist }: { onExpand: () => void; onAddToPlaylist: (song: any) => void }) { const { currentSong, isPlaying, togglePlay, next, prev, duration, seek, volume, setVolume, activeQuality, shuffle, setShuffle, repeat, setRepeat, qualityPreference, setQualityPreference, addToQueue } = usePlayback();
    const { toggleLike, isLiked, downloadSong, isDownloaded } = useLibrary();
    const { showToast } = useUI();
    const { progress } = useAudioProgress();

    const [showBarMenu, setShowBarMenu] = useState(false);
    const [showBarQuality, setShowBarQuality] = useState(false);
    const barMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (barMenuRef.current && !barMenuRef.current.contains(e.target as Node)) {
                setShowBarMenu(false); setShowBarQuality(false);
            }
        };
        if (showBarMenu) document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showBarMenu]);

    const qLabel = (q: string) => ({ hires: 'Hi-Res', flac: 'FLAC', '320': '320k', '160': '160k', '96': '96k' }[q] || q);
    const qLabelFull = (q: string) => ({ hires: 'Hi-Res', flac: 'Lossless', '320': '320 kbps', '160': '160 kbps', '96': '96 kbps' }[q] || q);

    /* Keyboard Shortcuts */
    const progressRef = useRef(progress);
    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); next(); }
                    else if (e.shiftKey) { e.preventDefault(); seek(Math.min(1, progressRef.current + 0.05)); }
                    break;
                case 'ArrowLeft':
                    if (e.metaKey || e.ctrlKey) { e.preventDefault(); prev(); }
                    else if (e.shiftKey) { e.preventDefault(); seek(Math.max(0, progressRef.current - 0.05)); }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setVolume(volume === 0 ? 1 : 0);
                    break;
                case 'KeyL':
                    if (currentSong) { e.preventDefault(); toggleLike(currentSong); }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, next, prev, seek]);

    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const songArt = getArt(currentSong);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };

    if (!currentSong) return null;

    const qualityBadge = activeQuality ? activeQuality.toUpperCase() : null;

    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-3xl player-bar"
        >
            <div className="relative bg-black/90 backdrop-blur-2xl border border-white/[0.06] rounded-[20px] shadow-[0_12px_50px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-3.5 px-4 py-2.5">
                    {/* Spinning CD Art */}
                    <div className="relative cursor-pointer flex-shrink-0 group" onClick={onExpand}>
                        <div className={`w-11 h-11 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/[0.06] shadow-[0_0_15px_rgba(0,0,0,0.4)] ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                            {songArt ? (
                                <img src={songArt} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music size={16} className="text-white/20" />
                                </div>
                            )}
                        </div>
                        {/* CD center hole */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-black/80 ring-1 ring-white/10" />
                    </div>

                    {/* Song Info */}
                    <div className="min-w-0 w-36 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-white truncate cursor-pointer hover:underline" onClick={onExpand}>
                                {currentSong.name}
                            </p>
                            {qualityBadge && (
                                <span className="text-[8px] font-bold px-1 py-px rounded bg-white/10 text-white/60 flex-shrink-0">
                                    {qualityBadge}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/35 truncate">{currentSong.primaryArtists}</p>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={prev} className="p-1.5 text-white/50 hover:text-white transition-colors">
                            <SkipBack size={16} fill="currentColor" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform mx-1"
                        >
                            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button onClick={next} className="p-1.5 text-white/50 hover:text-white transition-colors">
                            <SkipForward size={16} fill="currentColor" />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] text-white/25 tabular-nums font-mono w-8 text-right flex-shrink-0">{fmt(progress * duration)}</span>
                        <div
                            className="flex-1 h-1 bg-white/[0.08] rounded-full cursor-pointer relative group"
                            onClick={handleSeek}
                        >
                            <div
                                className="absolute inset-y-0 left-0 bg-white/40 group-hover:bg-white/70 rounded-full transition-colors"
                                style={{ width: `${progress * 100}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `${progress * 100}%`, transform: `translate(-50%, -50%)` }}
                            />
                        </div>
                        <span className="text-[10px] text-white/25 tabular-nums font-mono w-8 flex-shrink-0">{fmt(duration)}</span>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-1.5 group w-20 flex-shrink-0">
                        <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/30 hover:text-white/70 transition-colors">
                            {volume === 0 ? <Volume2 size={14} className="text-white/20" /> : <Volume2 size={14} />}
                        </button>
                        <div
                            className="flex-1 h-[3px] bg-white/[0.08] rounded-full cursor-pointer overflow-hidden"
                            onClick={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                            }}
                        >
                            <div className="h-full bg-white/40 group-hover:bg-white/70 transition-colors" style={{ width: `${volume * 100}%` }} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Tooltip text="Expand">
                            <button onClick={onExpand} className="p-1.5 text-white/25 hover:text-white transition-colors">
                                <Maximize2 size={15} />
                            </button>
                        </Tooltip>

                        <Tooltip text={isLiked(currentSong.id) ? "Unlike" : "Like"}>
                            <button
                                onClick={() => currentSong && toggleLike(currentSong)}
                                className={`p-1.5 transition-colors ${isLiked(currentSong.id) ? 'text-white' : 'text-white/25 hover:text-white'}`}
                            >
                                <Heart size={15} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>

                        {/* 3-dots menu */}
                        <div className="relative" ref={barMenuRef}>
                            <Tooltip text="More">
                                <button onClick={() => { setShowBarMenu(!showBarMenu); setShowBarQuality(false); }} className="p-1.5 text-white/25 hover:text-white transition-colors">
                                    <MoreHorizontal size={15} />
                                </button>
                            </Tooltip>
                            {showBarMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
                                    {!showBarQuality ? (
                                        <>
                                            <button onClick={() => { if (currentSong) { addToQueue(currentSong); showToast('Added to queue', 'success'); } setShowBarMenu(false); }} className="w-full px-4 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/[0.06] flex items-center gap-3"><Plus size={14} /> Add to Queue</button>
                                            <button onClick={() => { if (currentSong) onAddToPlaylist(currentSong); setShowBarMenu(false); }} className="w-full px-4 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/[0.06] flex items-center gap-3"><ListPlus size={14} /> Add to Playlist</button>
                                            <div className="border-t border-white/[0.06] my-1" />
                                            <button onClick={() => setShowBarQuality(true)} className="w-full px-4 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/[0.06] flex items-center gap-3"><Disc3 size={14} /> Quality: {qLabelFull(qualityPreference)}</button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white/30">Quality</div>
                                            {(['hires', 'flac', '320', '160', '96'] as AudioQuality[]).map(q => (
                                                <button key={q} onClick={() => { setQualityPreference(q); setShowBarQuality(false); setShowBarMenu(false); showToast(`Quality: ${qLabelFull(q)}`, 'success'); }}
                                                    className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-white/[0.06] flex items-center justify-between ${qualityPreference === q ? 'text-white font-semibold' : 'text-white/60'}`}>
                                                    <span>{qLabelFull(q)}</span>
                                                    {qualityPreference === q && <span className="text-white">✓</span>}
                                                </button>
                                            ))}
                                            <div className="border-t border-white/[0.06] my-1" />
                                            <button onClick={() => setShowBarQuality(false)} className="w-full px-4 py-2 text-left text-[13px] text-white/40 hover:bg-white/[0.06]">← Back</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
