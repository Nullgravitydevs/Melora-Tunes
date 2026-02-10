"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Library, Compass, Settings, Plus, Music, Heart, Clock, Volume2, SkipBack, SkipForward, Pause, Play, Maximize2, ListMusic, Disc3, Radio, Shuffle, Repeat } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
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
        background: black;
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
        filter: blur(150px) brightness(0.15) saturate(0) contrast(1.1);
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
    const {
        mixes, currentSong, isPlaying, likedSongs, recentlyPlayed,
        loadMix, playInstantMix, setQueue, queue,
        downloadSong, removeDownload, isDownloaded,
        activeMixId, play, addSongToMix, showToast, addMix, deleteMix, updateMix
    } = usePlayback();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; song: JioSaavnSong | null; sourceMixId?: string }>({
        visible: false,
        x: 0,
        y: 0,
        song: null
    });

    // Add to Playlist Modal State
    const [addToPlaylistSong, setAddToPlaylistSong] = useState<JioSaavnSong | null>(null);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("New Playlist");

    // Playlist Context Menu State
    const [playlistMenu, setPlaylistMenu] = useState<{ visible: boolean; x: number; y: number; mixId: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        mixId: null
    });

    const handleContextMenu = (e: React.MouseEvent, song: JioSaavnSong, sourceMixId?: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            song,
            sourceMixId
        });
        setPlaylistMenu(prev => ({ ...prev, visible: false })); // Close other
    };

    const handlePlaylistContextMenu = (e: React.MouseEvent, mixId: string) => {
        e.preventDefault();
        setPlaylistMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            mixId
        });
        setContextMenu(prev => ({ ...prev, visible: false })); // Close other
    };

    const closeContextMenu = () => {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setPlaylistMenu(prev => ({ ...prev, visible: false }));
    };

    // NAVIGATION HANDLERS
    const handleNavigate = (view: ViewState) => {
        // Prevent duplicate pushes of the same view if clicked multiple times
        setViewStack(prev => {
            const last = prev[prev.length - 1];
            if (last.id === view.id && JSON.stringify(last.data) === JSON.stringify(view.data)) return prev;
            return [...prev, view];
        });
    };

    const handleBack = () => {
        setViewStack(prev => {
            if (prev.length <= 1) return prev; // Don't pop the last item (Home)
            return prev.slice(0, -1);
        });
    };

    // Replace direct SetCurrentView checks with handleNavigate where appropriate
    // Ideally we expose these, but for Sidebar we can explicit set functionality
    const resetTo = (view: ViewState) => {
        setViewStack([view]);
    };


    useEffect(() => { setMounted(true); }, []);

    const getAlbumArt = () => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) {
            return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        }
        return '';
    };

    if (!mounted) return <div className="fixed inset-0 bg-black" />;

    const handlePlaySong = (song: any) => {
        // Wrap single song into a play context
        // If the song is already in the current mix, maybe just play it?
        // For Discovery mode simplicity, we treat single clicks as "Play this song now"
        // We'll create a mini-mix for it.
        playInstantMix({
            id: `quick-play-${song.id}`,
            title: song.name,
            color: 'blue',
            songs: [song], // Ideally we'd pass the surrounding list if we had it, but HomeView doesn't pass context yet
            currentSongIndex: 0
        });
    };

    const handleCreatePlaylist = () => {
        setNewPlaylistName("New Playlist");
        setShowCreatePlaylist(true);
    };

    const confirmCreatePlaylist = () => {
        const name = newPlaylistName.trim();
        if (!name) return;
        const newId = `user-${Date.now()}`;
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
        <div className="fixed inset-0 bg-zinc-950 text-white font-sans overflow-hidden flex flex-col antialiased selection:bg-white/20">
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
                {showFullPlayer && <FullPlayer isOpen={showFullPlayer} onClose={() => setShowFullPlayer(false)} />}
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


            {/* Album BG - Grayscale */}
            {getAlbumArt() && <div className="album-blur" style={{ backgroundImage: `url(${getAlbumArt()})` }} />}

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
                            {mixes
                                .filter(m =>
                                    !m.id.startsWith('quick-') &&
                                    !m.id.startsWith('search-') &&
                                    !m.id.startsWith('album-') &&
                                    !m.id.startsWith('artist-')
                                )
                                .length > 0 ? (
                                mixes
                                    .filter(m =>
                                        !m.id.startsWith('quick-') &&
                                        !m.id.startsWith('search-') &&
                                        !m.id.startsWith('album-') &&
                                        !m.id.startsWith('artist-')
                                    )
                                    .map((m, i) => (
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
                    <div className="px-2.5 py-3 border-t border-white/[0.04] bg-black z-20">
                        <NavItem icon={<Settings size={18} />} label="Settings" onClick={() => setShowSettings(true)} subtle />
                    </div>


                </aside>

                {/* MAIN */}
                <main className="flex-1 overflow-y-auto scroll">
                    <AnimatePresence mode="wait">
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
            <PlayerBar onExpand={() => setShowFullPlayer(true)} />

            {/* Global Context Menu */}
            <TrackContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                song={contextMenu.song}
                onClose={closeContextMenu}
                onPlay={(s) => { playInstantMix({ id: 'quick-play', title: 'Quick Play', color: 'blue', songs: [s], currentSongIndex: 0 }); }}
                onAddToQueue={(s) => { setQueue([...queue, s]); }}
                onGoToArtist={(id) => handleNavigate({ id: 'artist', data: id })}
                onGoToAlbum={(id) => handleNavigate({ id: 'album', data: id })}
                onStartRadio={(s) => handleNavigate({ id: 'radio', data: s })}
                isDownloaded={contextMenu.song ? isDownloaded(contextMenu.song.id) : false}
                onDownload={(s) => downloadSong(s)}
                onRemoveDownload={(id) => removeDownload(id)}
                onAddToPlaylist={(s) => setAddToPlaylistSong(s)}
                onRemoveFromPlaylist={
                    contextMenu.sourceMixId && contextMenu.sourceMixId.startsWith('user-')
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

function PlayerBar({ onExpand }: { onExpand: () => void }) {
    const { currentSong, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, toggleLike, isLiked, activeQuality, shuffle, setShuffle, repeat, setRepeat } = usePlayback();

    /* UPGRADE 3: Keyboard Shortcuts */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        next();
                    }
                    else if (e.shiftKey) {
                        e.preventDefault();
                        seek(Math.min(1, progress + 0.05)); // +5%
                    }
                    break;
                case 'ArrowLeft':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        prev();
                    }
                    else if (e.shiftKey) {
                        e.preventDefault();
                        seek(Math.max(0, progress - 0.05)); // -5%
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, next, prev, progress, seek]);


    const fmt = (s: number) => isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const getArt = () => {
        if (!currentSong?.image) return '';
        if (typeof currentSong.image === 'string') return currentSong.image;
        if (Array.isArray(currentSong.image)) return currentSong.image.find(i => i.quality === '500x500')?.link || currentSong.image[0]?.link || '';
        return '';
    };

    // Get quality badge - use activeQuality from playback (source of truth)
    const getQuality = () => {
        if (!activeQuality) return null;
        return {
            label: activeQuality.toUpperCase(),
            color: activeQuality === 'flac' || activeQuality === 'hires'
                ? 'bg-white/15'
                : 'bg-white/5'
        };
    };

    const quality = getQuality();

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };

    // Hide completely when no song
    if (!currentSong) return null;

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="h-[90px] bg-black border-t border-white/5 px-6 flex items-center justify-between relative z-50 player-bar"
        >
            {/* Song Info */}
            <div className="flex items-center gap-4 w-[30%]">
                <div className="relative group cursor-pointer" onClick={onExpand}>
                    <div className={`w-14 h-14 rounded-lg overflow-hidden bg-white/5 shadow-lg border border-white/5 ${isPlaying ? 'animate-pulse-slow' : ''}`}>
                        {getArt() ? (
                            <img src={getArt()} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Music size={20} className="text-white/20" />
                            </div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Maximize2 size={20} className="text-white" />
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-white truncate cursor-pointer hover:underline" onClick={onExpand}>{currentSong.name}</p>
                        {quality && (
                            <Tooltip text={`Streaming: ${quality.label}`} position="top">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${quality.color} text-white/70`}>
                                    {quality.label}
                                </span>
                            </Tooltip>
                        )}
                    </div>
                    <p className="text-xs text-white/40 truncate hover:text-white/60 cursor-pointer">{currentSong.primaryArtists}</p>
                </div>

                <Tooltip text={isLiked(currentSong.id) ? "Remove from Library" : "Add to Library"}>
                    <button
                        onClick={() => currentSong && toggleLike(currentSong)}
                        className={`ml-2 p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked(currentSong.id) ? 'text-green-500' : 'text-white/20 hover:text-white'}`}
                    >
                        <Heart size={18} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
                    </button>
                </Tooltip>
            </div>

            {/* Center Controls */}
            <div className="flex flex-col items-center gap-2 w-[40%]">
                <div className="flex items-center gap-6">
                    <Tooltip text={shuffle ? "Disable Shuffle" : "Enable Shuffle"}>
                        <button
                            onClick={() => setShuffle(!shuffle)}
                            className={`p-2 rounded-full transition-colors ${shuffle ? 'text-green-500' : 'text-white/30 hover:text-white'}`}
                        >
                            <Shuffle size={16} />
                        </button>
                    </Tooltip>

                    <Tooltip text="Previous">
                        <button onClick={prev} className="p-2 text-white/70 hover:text-white transition-colors">
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                    </Tooltip>

                    <Tooltip text={isPlaying ? "Pause" : "Play"}>
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>
                    </Tooltip>

                    <Tooltip text="Next">
                        <button onClick={next} className="p-2 text-white/70 hover:text-white transition-colors">
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                    </Tooltip>

                    <Tooltip text={repeat === 'one' ? "Disable Repeat" : repeat === 'all' ? "Repeat One" : "Repeat All"}>
                        <button
                            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                            className={`p-2 rounded-full transition-colors relative ${repeat !== 'off' ? 'text-green-500' : 'text-white/30 hover:text-white'}`}
                        >
                            <Repeat size={16} />
                            {repeat === 'one' && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500">1</span>}
                        </button>
                    </Tooltip>
                </div>

                <div className="w-full max-w-md flex items-center gap-3 text-xs text-white/30 font-mono">
                    <span>{fmt(progress * duration)}</span>
                    <div
                        className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
                        onClick={handleSeek}
                    >
                        <div
                            className="absolute inset-y-0 left-0 bg-white/40 group-hover:bg-green-500 rounded-full transition-colors"
                            style={{ width: `${progress * 100}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `${progress * 100}%` }}
                        />
                    </div>
                    <span>{fmt(duration)}</span>
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-2 w-[30%]">
                <Tooltip text="Lyrics">
                    <button onClick={() => onExpand()} className="p-2 text-white/30 hover:text-white">
                        <ListMusic size={18} />
                    </button>
                </Tooltip>

                <div className="flex items-center gap-2 group w-24">
                    <Tooltip text={volume === 0 ? "Unmute" : "Mute"}>
                        <button onClick={() => setVolume(volume === 0 ? 1 : 0)}>
                            {volume === 0 ? <Volume2 size={18} className="text-white/30" /> : <Volume2 size={18} className="text-white/70" />}
                        </button>
                    </Tooltip>
                    <div
                        className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                        onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                        }}
                    >
                        <div className="h-full bg-white/50 group-hover:bg-white transition-colors" style={{ width: `${volume * 100}%` }} />
                    </div>
                </div>

                <div className="w-px h-8 bg-white/10 mx-2" />

                <Tooltip text="Expand Player">
                    <button onClick={onExpand} className="p-2 text-white/30 hover:text-white transition-colors">
                        <Maximize2 size={18} />
                    </button>
                </Tooltip>
            </div>
        </motion.div>
    );
}
