import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { DiscoveryTheme } from "./DiscoveryLayout";
import {
    getTrending,
    getTopCharts,
    getNewReleases,
    getFeaturedPlaylists,
    searchSongs
} from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { searchUnified } from "@/lib/unified-search";
import { OfflineStore } from "@/lib/offline-store";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { QualityFilterType } from "@/lib/types";
import {
    usePlayback,
    Mix,
    ensurePlayableTrack
} from "@/components/providers/playback-context";
import { PlayableTrack } from "@/lib/types";
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { HistoryStore, HistoryItem } from "@/lib/history-store";
import { getArt } from "./DiscoveryShared";
import { SignalStore } from "@/lib/signal-store";
import { GlassSearch } from "@/components/shared/GlassSearch";

/* ================= SUB SCREENS ================= */
import { HomeView } from "./HomeView";
import { ArtistView } from "./ArtistView";
import { AlbumView } from "./AlbumView";
import { ChartDetailScreen } from "./ChartDetailScreen";
import { PlaylistScreen } from "./PlaylistScreen";
import { MoodDetailScreen } from "./MoodDetailScreen";
import { ExploreView, moodCategories } from "./desktop/ExploreView";
import { BrowseView } from "./desktop/BrowseView";
import { LibraryView } from "./desktop/LibraryView";
import { SearchView } from "./desktop/SearchView";
import { Sidebar } from "./desktop/Sidebar";
import { RightPanel } from "./desktop/RightPanel";
import { FloatingPlayer } from "./desktop/FloatingPlayer";
import { NowPlayingOverlay } from "./desktop/NowPlayingOverlay";
import { LanguageSelectorModal } from "./desktop/LanguageSelectorModal";
import { DesktopSettingsModal } from "@/components/ui/desktop-settings-modal";

/* ================= TYPES ================= */

export type RootView = "home" | "search" | "explore" | "browse" | "library";
export type DiscoveryViewType =
    | RootView
    | "artist"
    | "album"
    | "chart-detail"
    | "playlist-detail"
    | "mood-detail"
    | "collection-detail"
    | "decade-detail"
    | "now-playing";

interface ViewState {
    id: DiscoveryViewType;
    data?: any; // Generic payload for the view (artistId, albumId, etc)
}

/* ================= COMPONENT ================= */

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    const {
        playInstantMix,
        currentSong,
        currentTrack,
        activeQuality,
        isPlaying,
        togglePlay,
        next,
        prev,
        progress,
        duration,
        seek,
        volume,
        setVolume,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        toggleLike,
        isLiked,
        likedSongs,
        activeMixId,
        activeMix,
        mixes,
        updateMix,
        addMix,
        togglePin // Added togglePin
    } = usePlayback();

    /* ================= PALETTE ================= */
    const colors = useMemo(() => ({
        bg: "#000",
        surface: "#000",
        card: "#0a0a0a",
        cardHover: "#141414",
        text: "#fff",
        textMuted: "#666",
        border: "rgba(255,255,255,0.08)",
        accent: "#fff",
        accentSoft: "rgba(255,255,255,0.08)"
    }), []);

    /* ================= NAVIGATION STACK ================= */

    // Initial Stack
    const [history, setHistory] = useState<ViewState[]>([{ id: "home" }]);

    // Derived Current View (Top of stack)
    const currentView = history[history.length - 1];

    // Helpers
    const pushView = useCallback((id: DiscoveryViewType, data?: any) => {
        // Dedup: Don't push if already top
        setHistory(prev => {
            const top = prev[prev.length - 1];
            if (top.id === id && JSON.stringify(top.data) === JSON.stringify(data)) {
                return prev;
            }
            // Signal Intent
            if (id === 'explore') SignalStore.addSignal({ id: 'intent_explore' } as any, 'CLICK', 'navigation');

            return [...prev, { id, data }];
        });
    }, []);

    const popView = useCallback(() => {
        setHistory(prev => {
            if (prev.length <= 1) return prev; // Cannot pop root
            return prev.slice(0, -1);
        });
    }, []);

    const replaceView = useCallback((id: DiscoveryViewType, data?: any) => {
        setHistory(prev => {
            const newHist = [...prev];
            newHist[newHist.length - 1] = { id, data };
            return newHist;
        });
    }, []);

    // Root Switcher (Sidebar) - Resets stack
    const switchRoot = useCallback((id: RootView) => {
        setHistory([{ id }]);
    }, []);

    /* ================= APP DATA ================= */
    const [trending, setTrending] = useState<any[]>([]);
    const [trendingSingles, setTrendingSingles] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [latestAlbums, setLatestAlbums] = useState<any[]>([]);
    const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
    const [recent, setRecent] = useState<HistoryItem[]>([]);
    const [downloads, setDownloads] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);

    /* ================= SETTINGS ================= */
    const [userName, setUserName] = useState<string>("");
    const [activeChipLanguage, setActiveChipLanguage] = useState<string | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    /* ================= SEARCH ================= */
    const [searchQuery, setSearchQuery] = useState("");
    const [searchQuality, setSearchQuality] = useState<QualityFilterType>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('melora-quality-pref') as QualityFilterType) || 'auto';
        }
        return 'auto';
    });
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTokenRef = useRef(0);

    /* ================= PLAYBACK LOGIC ================= */
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);

    // Cache for Discovery Mixes to prevent constant re-generation for same seed in short time
    const discoveryCacheRef = useRef<Map<string, { mix: Mix, timestamp: number }>>(new Map());

    const playFromDiscovery = useCallback(async (seedTrack: PlayableTrack) => {
        try {
            setIsGeneratingMix(true);

            // 1. Check Cache (30 min expiry)
            const seedId = seedTrack.id;
            const now = Date.now();
            const cached = discoveryCacheRef.current.get(seedId);

            if (cached && (now - cached.timestamp < 30 * 60 * 1000)) {
                console.log("[Discovery] Using cached mix for", seedTrack.title);
                playInstantMix(cached.mix);
                HistoryStore.addToHistory(seedTrack, { source: 'discovery' });
                return;
            }

            // 2. Generate New
            // Inject Language Context!
            const contextLang = activeChipLanguage || selectedLanguages.join(",");
            const mix = await DiscoveryEngine.generateSessionMix(seedTrack, contextLang);

            // 3. Cache
            discoveryCacheRef.current.set(seedId, { mix, timestamp: now });

            playInstantMix(mix);
            HistoryStore.addToHistory(seedTrack, { source: 'discovery' });

            // Signal
            SignalStore.addSignal(seedTrack, 'CLICK', 'discovery_start');

        } catch (e) {
            console.error("Discovery Failed:", e);
        } finally {
            setIsGeneratingMix(false);
        }
    }, [activeChipLanguage, selectedLanguages, playInstantMix]);

    const playFromContext = useCallback((contextTracks: PlayableTrack[], seedTrack: PlayableTrack, contextId: string, title?: string) => {
        // Ensure playable
        const sanitized = contextTracks.map(t => ensurePlayableTrack(t)).filter(t => t.song);
        const seedIndex = sanitized.findIndex(t => t.song?.id === seedTrack.song?.id) || 0;

        const mix: Mix = {
            id: contextId,
            title: title || "Context Mix",
            color: 'blue',
            songs: sanitized,
            currentSongIndex: seedIndex
        };

        playInstantMix(mix);
        HistoryStore.addToHistory(seedTrack, { source: 'playlist', id: contextId });
    }, [playInstantMix]);

    // Unified Handler
    const handlePlay = useCallback((song: any, context: any[] = []) => {
        if (!song) return;
        const track = ensurePlayableTrack(song);

        if (context.length > 0) {
            // Determine Context ID
            let contextId = `context-${Date.now()}`;
            // If explicit context logic needed, passed via arguments? 
            // For now, construct context ID from view if possible, or just unique.
            // Simplified: Use generic context play
            playFromContext(context, track, contextId);
        } else {
            playFromDiscovery(track);
        }
    }, [playFromContext, playFromDiscovery]);


    /* ================= OTG LOGIC ================= */
    const addToOTG = useCallback((song: any) => {
        const track = ensurePlayableTrack(song);
        if (!track.song) return;

        // 1. Ensure OTG Mix Exists
        const OTG_ID = "otg-tape";
        let otgMix = mixes.find(m => m.id === OTG_ID);

        if (!otgMix) {
            otgMix = {
                id: OTG_ID,
                title: "On-The-Go Tape",
                color: "green",
                songs: [],
                currentSongIndex: 0
            };
            addMix(otgMix);
        }

        // 2. Check Existence (Dedupe)
        const exists = otgMix.songs.some(s => {
            const sTrack = ensurePlayableTrack(s);
            return sTrack.song?.id === track.song?.id;
        });

        if (!exists) {
            updateMix(OTG_ID, { songs: [...otgMix.songs, track] });
            // Signal
            SignalStore.addSignal(track, 'LIKE', 'otg_add'); // Implicit Like
        }
    }, [mixes, addMix, updateMix]);

    /* ================= SEARCH IMPL ================= */
    const performSearch = async (query: string) => {
        const q = query.trim();
        if (!q) {
            setSearchResults([]);
            return;
        }

        const token = ++searchTokenRef.current;
        setIsSearching(true);
        // Force view to search if not already
        if (currentView.id !== 'search') pushView('search');

        try {
            const lang = activeChipLanguage || selectedLanguages.join(",");
            const res = await searchUnified(q, lang, 'song', searchQuality);
            if (token !== searchTokenRef.current) return;

            setSearchResults(
                res
                    .filter(r => r && r.song)
                    .map(r => ensurePlayableTrack(r)) // Use ensurePlayableTrack to keep it robust
            );
        } finally {
            if (token === searchTokenRef.current) setIsSearching(false);
        }
    };

    useEffect(() => {
        if (searchQuery && currentView.id === 'search') {
            performSearch(searchQuery);
        }
    }, [searchQuality]); // Re-search on quality change

    /* ================= DATA LOADING ================= */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const settings = loadSettings();
            const langs = settings.languages || ["english", "hindi"];
            setSelectedLanguages(langs);
            setUserName(settings.userName || "");

            // Language Logic
            let safeChip = activeChipLanguage;
            if (activeChipLanguage && !langs.includes(activeChipLanguage)) {
                safeChip = null;
                setActiveChipLanguage(null);
            }
            const langContext = safeChip || langs.join(",");

            // Parallel Fetch
            const [trendRes, chartRes, albumsRes, playlistsRes, offlineData] = await Promise.allSettled([
                getTrending(langContext),
                getTopCharts(langContext),
                getNewReleases(20, langContext),
                getFeaturedPlaylists(10, langContext),
                OfflineStore.getAllDownloadedSongs()
            ]);

            // Process Trending
            if (trendRes.status === 'fulfilled') {
                const allowedLangs = langContext.toLowerCase().split(',').map(s => s.trim());
                const filtered = trendRes.value.filter((s: any) =>
                    s.language && allowedLangs.includes(s.language.toLowerCase())
                );
                // Fallback Search if filtered is empty
                if (filtered.length < 5) {
                    const primary = langContext.split(',')[0] || "english";
                    const fallback = await searchSongs(`${primary} top hits`, 1, 15, langContext);
                    setTrending(fallback);
                    setTrendingSingles(fallback);
                } else {
                    setTrending(filtered.slice(0, 10));
                    setTrendingSingles(filtered.slice(0, 10));
                }
            }

            // Charts
            if (chartRes.status === 'fulfilled') {
                setCharts(chartRes.value.slice(0, 4).map((c: any) => ({
                    id: c.id,
                    title: c.title || c.name,
                    subtitle: c.subtitle || "Top Chart",
                    image: c.image
                })));
            }

            // Albums & Playlists
            if (albumsRes.status === 'fulfilled') {
                // Filter trailers
                setLatestAlbums(albumsRes.value.filter((a: any) =>
                    !a.name?.toLowerCase().includes('trailer')
                ).slice(0, 10));
            }
            if (playlistsRes.status === 'fulfilled') {
                setFeaturedPlaylists(playlistsRes.value);
            }

            // Offline & History
            if (offlineData.status === 'fulfilled') {
                setDownloads(offlineData.value.map(s => ensurePlayableTrack(s)));
            }
            setRecent(HistoryStore.getHistory().slice(0, 6));
            setPlaylists(PlaylistStore.getPlaylists());

        } catch (e) {
            console.error("Data Load Error", e);
        } finally {
            setLoading(false);
        }
    }, [activeChipLanguage]);

    useEffect(() => {
        HistoryStore.init().then(loadData);
        // Events
        const onUpdate = () => setRecent(HistoryStore.getHistory().slice(0, 6));
        const onPlUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener("melora-history-update", onUpdate);
        window.addEventListener("melora-playlists-update", onPlUpdate);
        return () => {
            window.removeEventListener("melora-history-update", onUpdate);
            window.removeEventListener("melora-playlists-update", onPlUpdate);
        };
    }, [loadData]);


    /* ================= RENDER MAP ================= */
    const renderContent = () => {
        const { id, data } = currentView;

        switch (id) {
            case "home":
                return (
                    <HomeView
                        colors={colors}
                        trending={trending}
                        charts={charts}
                        recent={recent}
                        trendingSingles={trendingSingles}
                        latestAlbums={latestAlbums}
                        featuredPlaylists={featuredPlaylists}
                        loading={loading}
                        onPlay={handlePlay}
                        onNavigate={(v, d) => {
                            // Smart Nav: Switch stacks logic
                            if (v === 'artist' || v === 'album' || v === 'playlist-detail' || v === 'chart-detail') {
                                pushView(v as DiscoveryViewType, d);
                            } else {
                                // Root switch? Handled by sidebar usually
                            }
                        }}
                        onPlayChart={c => pushView('chart-detail', c)}
                        onOpenPlaylist={p => pushView('playlist-detail', p)}
                        onOpenAlbum={a => pushView('album', a.id || a)}
                        onResumeSong={t => handlePlay(t.song)}
                        activeLanguage={activeChipLanguage}
                        selectedLanguages={selectedLanguages}
                        onLanguageSelect={setActiveChipLanguage}
                        userName={userName}
                    />
                );

            case "search":
                return (
                    <div className="h-full w-full overflow-hidden relative">
                        <div className="absolute top-4 left-4 z-50">
                            <button
                                onClick={popView}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5"
                            >
                                <ChevronRight size={20} className="rotate-180 text-white" />
                            </button>
                        </div>
                        {/* Embed Glass Search in "Embedded" Variant */}
                        <div className="w-full h-full pt-16 px-8">
                            <GlassSearch
                                initialQuery={searchQuery} // Pass existing query if any
                                variant="embedded"
                            />
                        </div>
                    </div>
                );

            case "artist":
                return data ? (
                    <ArtistView
                        artistName={data}
                        colors={colors}
                        onBack={popView}
                        onPlay={handlePlay}
                        onNavigate={(v, d) => pushView(v as DiscoveryViewType, d)}
                    />
                ) : null;

            case "album":
                return data ? (
                    <AlbumView
                        albumId={data}
                        colors={colors}
                        onBack={popView}
                        onPlay={handlePlay}
                    />
                ) : null;

            case "chart-detail":
                return data ? (
                    <ChartDetailScreen
                        chartId={data.id || data.title}
                        chartTitle={data.title}
                        chartImage={data.image}
                        colors={colors}
                        onBack={popView}
                        onPlay={handlePlay}
                    />
                ) : null;

            case "playlist-detail":
                return data ? (
                    <PlaylistScreen
                        playlistId={data.id}
                        playlistTitle={data.name || data.title}
                        playlistImage={getArt(data)}
                        colors={colors}
                        onBack={popView}
                    />
                ) : null;

            case "explore":
                return (
                    <ExploreView
                        colors={colors}
                        setLastView={() => { }} // Deprecated in stack
                        setActiveMood={(m) => pushView('mood-detail', m)}
                        setActiveView={(v) => switchRoot(v as RootView)}
                    />
                );

            case "mood-detail":
                return data ? (
                    <MoodDetailScreen
                        mood={data}
                        colors={colors}
                        onBack={popView}
                        onOpenPlaylist={p => pushView('playlist-detail', p)}
                        languageContext={activeChipLanguage || selectedLanguages.join(",")}
                    />
                ) : null;

            case "browse":
                return (
                    <BrowseView
                        colors={colors}
                        charts={charts}
                        setLastView={() => { }}
                        setActiveCollection={c => pushView('collection-detail', c)}
                        setActiveView={(v) => switchRoot(v as RootView)}
                        setActiveChart={c => pushView('chart-detail', c)}
                        setActiveDecade={d => pushView('decade-detail', d)}
                        activeLanguage={activeChipLanguage}
                        selectedLanguages={selectedLanguages}
                    />
                );

            case "library":
                return (
                    <LibraryView
                        playlists={playlists}
                        downloads={downloads}
                        colors={colors}
                        setLastView={() => { }}
                        setActivePlaylistDetail={p => pushView('playlist-detail', p)}
                        setActiveView={(v) => switchRoot(v as RootView)}
                        handlePlay={handlePlay} // Pass handlePlay for direct playback
                        mixes={mixes}           // Pass mixes for pin status check
                        togglePin={togglePin}   // Pass togglePin function
                        addMix={addMix}         // Pass addMix for creating pinned mixes
                    />
                );

            case "now-playing":
                return currentSong ? (
                    <NowPlayingOverlay
                        song={currentSong}
                        nextSong={activeMix?.songs[activeMix.currentSongIndex + 1] ?? null}
                        quality={activeQuality}
                        onClose={popView}
                        playback={{
                            isPlaying, togglePlay, next, prev,
                            progress, duration, seek,
                            shuffle, repeat,
                            toggleLike, isLiked,
                            queue: activeMix?.songs || [],
                            currentIndex: activeMix?.currentSongIndex || 0,
                            activeMixId,
                            updateMix
                        }}
                    />
                ) : null;

            default: return null;
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col bg-black text-white overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    activeView={currentView.id as any} // Cast for compat
                    setActiveView={(v) => switchRoot(v as any)}
                    lastView={"home"} // Stack handles interaction now
                    theme={theme}
                    onThemeChange={onThemeChange}
                    playlists={playlists}
                    likedSongs={likedSongs}
                    activeMixId={activeMixId}
                    playInstantMix={playInstantMix}
                    setIsLangModalOpen={setIsLangModalOpen}
                    colors={colors}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />

                <main className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* 
                           OPTIMIZATION: Removed key={activeView} to prevent full re-mounts of container.
                           Instead, we let React handle the diffing of children, which preserves state 
                           where possible and reduces flicker.
                           If animation is desperately needed, wrap inner components.
                        */}
                        <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <RightPanel
                    recent={recent}
                    handlePlay={handlePlay}
                    colors={colors}
                    navigateToArtist={a => pushView('artist', a)}
                />
            </div>

            <FloatingPlayer
                currentSong={currentSong}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                next={next}
                prev={prev}
                progress={progress}
                duration={duration}
                seek={seek}
                volume={volume}
                setVolume={setVolume}
                activeQuality={activeQuality}
                currentTrack={currentTrack}
                activeView={currentView.id as any}
                setActiveView={(v) => pushView(v as any)}
                setLastView={() => { }}
                toggleLike={toggleLike}
                isLiked={isLiked}
            />

            {isGeneratingMix && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-[100]">
                    <p className="text-white font-bold tracking-widest animate-pulse">
                        DJ IS THINKING…
                    </p>
                </div>
            )}

            <LanguageSelectorModal
                isOpen={isLangModalOpen}
                onClose={() => setIsLangModalOpen(false)}
                onSave={() => {
                    setIsLangModalOpen(false);
                    loadData();
                }}
            />

            <DesktopSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentLayout="discovery"
                onSwitchLayout={(mode) => {
                    setIsSettingsOpen(false);
                }}
            />
        </div>
    );
}

