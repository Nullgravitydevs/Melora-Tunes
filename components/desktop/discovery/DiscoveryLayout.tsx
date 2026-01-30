"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Library, Compass, Settings, Plus, Music, Heart, Clock, Volume2, SkipBack, SkipForward, Pause, Play, Maximize2, ListMusic, Disc3, Radio } from "lucide-react";
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
    const [currentView, setCurrentView] = useState<ViewState>({ id: 'home' });
    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFullPlayer, setShowFullPlayer] = useState(false);
    const { mixes, currentSong, isPlaying, likedSongs, recentlyPlayed, loadMix, playInstantMix } = usePlayback();


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
                        <NavItem icon={<Home size={18} />} label="Home" active={currentView.id === 'home'} onClick={() => setCurrentView({ id: 'home' })} />
                        <NavItem icon={<Search size={18} />} label="Search" active={currentView.id === 'search'} onClick={() => setCurrentView({ id: 'search' })} />
                        <NavItem icon={<Compass size={18} />} label="Explore" active={currentView.id === 'explore'} onClick={() => setCurrentView({ id: 'explore' })} />
                        <NavItem icon={<Radio size={18} />} label="Radio" active={currentView.id === 'radio'} onClick={() => setCurrentView({ id: 'radio' })} />
                        <NavItem icon={<Library size={18} />} label="Your Library" active={currentView.id === 'library'} onClick={() => setCurrentView({ id: 'library' })} />
                    </nav>

                    {/* Settings at bottom */}
                    <div className="px-2.5 mt-auto pb-2">
                        <NavItem icon={<Settings size={18} />} label="Settings" onClick={() => setShowSettings(true)} subtle />
                    </div>

                    {/* Quick Links */}
                    <div className="px-2.5 mt-5 space-y-0.5">
                        <QuickLink
                            icon={<Heart size={14} />}
                            label="Liked Songs"
                            count={likedSongs.length}
                            onClick={() => setCurrentView({ id: 'library', data: { tab: 'liked' } })}
                        />
                        <QuickLink
                            icon={<Clock size={14} />}
                            label="Recently Played"
                            count={recentlyPlayed.length}
                            onClick={() => setCurrentView({ id: 'library', data: { tab: 'recent' } })}
                        />
                    </div>

                    <div className="mx-4 my-5 h-px bg-white/[0.04]" />

                    {/* Playlists */}
                    <div className="flex-1 overflow-y-auto scroll px-2.5">
                        <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Playlists</span>
                            <motion.button
                                onClick={() => setCurrentView({ id: 'library', data: { tab: 'playlists' } })}
                                className="p-1 rounded text-white/20 hover:text-white/50 hover:bg-white/5"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Plus size={12} strokeWidth={2.5} />
                            </motion.button>
                        </div>
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
                                .map((m, i) => <PlaylistItem key={m.id} mix={m} index={i} onClick={() => { setCurrentView({ id: 'library', data: { tab: 'playlists', playlistId: m.id } }); loadMix(m.id); }} />)
                        ) : <EmptyState />}
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
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                    onPlaySong={handlePlaySong}
                                    currentSongId={currentSong?.id}
                                    isPlaying={isPlaying}
                                />
                            )}

                            {currentView.id === 'search' && (
                                <SearchView onNavigate={(view) => setCurrentView(view as ViewState)} />
                            )}

                            {currentView.id === 'artist' && currentView.data && (
                                <ArtistView
                                    artist={currentView.data}
                                    onBack={() => setCurrentView({ id: 'home' })}
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                />
                            )}

                            {currentView.id === 'album' && currentView.data && (
                                <AlbumView
                                    album={currentView.data}
                                    onBack={() => setCurrentView({ id: 'home' })}
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                />
                            )}

                            {currentView.id === 'playlist' && currentView.data && (
                                <PlaylistView
                                    playlist={currentView.data}
                                    onBack={() => setCurrentView({ id: 'home' })}
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                />
                            )}

                            {/* PEEL TO OPEN ALBUM */}
                            {currentView.id === 'peel-reveal' && currentView.data && (
                                <PeelRevealView
                                    album={currentView.data}
                                    onBack={() => setCurrentView({ id: 'home' })}
                                    onPlay={handlePlaySong}
                                />
                            )}

                            {currentView.id === 'library' && (
                                <LibraryView
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                    initialTab={currentView.data?.tab}
                                />
                            )}

                            {currentView.id === 'explore' && (
                                <ExploreView onNavigate={(view) => setCurrentView(view as ViewState)} />
                            )}

                            {currentView.id === 'radio' && (
                                <RadioView onNavigate={(view) => setCurrentView(view as ViewState)} />
                            )}

                            {currentView.id === 'category-hub' && currentView.data && (
                                <CategoryHubView
                                    data={currentView.data}
                                    onBack={() => setCurrentView({ id: 'explore' })}
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                />
                            )}

                            {(['trending', 'albums', 'charts', 'retro', 'editors_picks'].includes(String(currentView.id)) || String(currentView.id).startsWith('mood-')) && (
                                <SectionView
                                    sectionId={String(currentView.id)}
                                    sectionTitle={currentView.data?.title}
                                    initialData={currentView.data?.items}
                                    onNavigate={(view) => setCurrentView(view as ViewState)}
                                    onBack={() => setCurrentView({ id: 'home' })}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* PLAYER */}
            <PlayerBar onExpand={() => setShowFullPlayer(true)} />
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

function PlaylistItem({ mix, index, onClick }: { mix: Mix; index: number; onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className="pl-item w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left"
        >
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Music size={12} className="text-white/40" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/60 truncate">{mix.title}</p>
                <p className="text-[10px] text-white/20">{mix.songs.length} songs</p>
            </div>
        </motion.button>
    );
}

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
    const { currentSong, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, toggleLike, isLiked, activeQuality } = usePlayback();

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
                    break;
                case 'ArrowLeft':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        prev();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, next, prev]);


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
                : 'bg-white/10'
        };
    };

    // FIX 1: Seek expects seconds, not ratio
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        seek(ratio * duration); // Convert to seconds
    };

    const handleVolume = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    };



    // Hide completely when no song
    if (!currentSong) return null;

    const quality = getQuality();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                style={{
                    background: 'rgba(20, 20, 20, 0.85)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset'
                }}
            >
                {/* Album Art */}
                <motion.div className="relative" whileHover={{ scale: 1.05 }}>
                    {getArt() ? (
                        <img src={getArt()} alt="" className="w-12 h-12 rounded-lg object-cover shadow-lg" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                            <Music size={16} className="text-white/30" />
                        </div>
                    )}
                    {isPlaying && <div className="absolute inset-0 rounded-lg border border-white/20 breathing" />}
                </motion.div>

                {/* Track Info */}
                <div className="min-w-0 w-36">
                    <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium truncate">{currentSong.name}</p>
                        {quality && (
                            <span className={`${quality.color} text-[9px] font-semibold px-1.5 py-0.5 rounded`}>
                                {quality.label}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-white/40 truncate">{currentSong.primaryArtists}</p>
                </div>

                {/* Like Button */}
                <motion.button
                    onClick={() => currentSong && toggleLike(currentSong)}
                    className={`ctrl p-2 hover:text-pink-400 ${currentSong && isLiked(currentSong.id) ? 'text-pink-500' : 'text-white/30'}`}
                    whileTap={{ scale: 0.85 }}
                >
                    <Heart size={16} fill={currentSong && isLiked(currentSong.id) ? "currentColor" : "none"} />
                </motion.button>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <motion.button onClick={prev} className="ctrl p-2 text-white/50" whileTap={{ scale: 0.85 }}>
                        <SkipBack size={16} fill="currentColor" />
                    </motion.button>
                    <motion.button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
                        style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                    >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </motion.button>
                    <motion.button onClick={next} className="ctrl p-2 text-white/50" whileTap={{ scale: 0.85 }}>
                        <SkipForward size={16} fill="currentColor" />
                    </motion.button>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 w-36">
                    {/* UPGRADE 1: Safer Progress Display (Handles both ratio 0-1 and absolute seconds) */}
                    <span className="text-[10px] text-white/30 tabular-nums">{fmt(progress <= 1 ? progress * duration : progress)}</span>
                    <div className="progress-track flex-1 h-1" onClick={handleSeek}>
                        <div
                            className="progress-fill h-full"
                            style={{ width: `${(progress <= 1 ? progress : progress / duration) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-white/30 tabular-nums">{fmt(duration)}</span>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-1.5 group">
                    <Volume2 size={14} className="text-white/30" />
                    <div
                        className="w-14 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer py-2 -my-2 flex items-center"
                        onClick={handleVolume}
                    >
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden pointer-events-none">
                            <div className="h-full bg-white/60 rounded-full" style={{ width: `${volume * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* Expand */}
                <motion.button onClick={onExpand} className="ctrl p-2 text-white/30" whileTap={{ scale: 0.85 }}>
                    <Maximize2 size={14} />
                </motion.button>
            </motion.div>
        </div>
    );
}
