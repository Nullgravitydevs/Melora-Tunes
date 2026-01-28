import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { HistoryStore, HistoryItem } from "@/lib/history-store";
import { getArt } from "./DiscoveryShared";

/* ================= SUB SCREENS ================= */

import { HomeView } from "./HomeView";
import { ArtistView } from "./ArtistView";
import { AlbumView } from "./AlbumView";
import { ChartDetailScreen } from "./ChartDetailScreen";
import { PlaylistScreen } from "./PlaylistScreen";
import { MoodDetailScreen } from "./MoodDetailScreen";
import { CollectionDetailScreen } from "./CollectionDetailScreen";
import { DecadeDetailScreen } from "./DecadeDetailScreen";

import { moodCategories, ExploreView } from "./desktop/ExploreView";
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

type RootView = "home" | "search" | "explore" | "browse" | "library";
type DiscoveryView =
    | RootView
    | "artist"
    | "album"
    | "chart-detail"
    | "playlist-detail"
    | "mood-detail"
    | "collection-detail"
    | "decade-detail"
    | "now-playing";

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
        updateMix
    } = usePlayback();

    /* ================= PALETTE ================= */

    const colors = useMemo(
        () => ({
            bg: "#000",
            surface: "#000",
            card: "#0a0a0a",
            cardHover: "#141414",
            text: "#fff",
            textMuted: "#666",
            border: "rgba(255,255,255,0.08)",
            accent: "#fff",
            accentSoft: "rgba(255,255,255,0.08)"
        }),
        []
    );

    /* ================= VIEW STATE ================= */

    const [activeView, setActiveView] = useState<DiscoveryView>("home");
    const [lastView, setLastView] = useState<RootView>("home");

    const [activeArtist, setActiveArtist] = useState<string | null>(null);
    const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
    const [activeChart, setActiveChart] = useState<any | null>(null);
    const [activePlaylistDetail, setActivePlaylistDetail] = useState<any | null>(null);
    const [activeMood, setActiveMood] = useState<typeof moodCategories[number] | null>(null);
    const [activeCollection, setActiveCollection] = useState<any | null>(null);
    const [activeDecade, setActiveDecade] = useState<any | null>(null);

    /* ================= DATA ================= */

    const [trending, setTrending] = useState<any[]>([]);
    const [trendingSingles, setTrendingSingles] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [latestAlbums, setLatestAlbums] = useState<any[]>([]);
    const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
    const [recent, setRecent] = useState<HistoryItem[]>([]);
    const [downloads, setDownloads] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);

    /* ================= LANGUAGE & SETTINGS ================= */

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

    // Persist Quality Preference
    useEffect(() => {
        localStorage.setItem('melora-quality-pref', searchQuality);
        // FIX: Re-trigger search immediately when quality changes
        if (searchQuery.trim()) {
            performSearch(searchQuery);
        }
    }, [searchQuality]);

    const [isSearching, setIsSearching] = useState(false);
    const searchTokenRef = useRef(0);

    /* ================= DJ & OTG ================= */

    const [isGeneratingMix, setIsGeneratingMix] = useState(false);
    const isGeneratingRef = useRef(false);
    const otgGuardRef = useRef<Set<string>>(new Set());

    /* ================= HELPERS ================= */

    const addToOTG = (song: any) => {
        const otgMix = mixes.find(m => m.id === "otg-tape");
        if (!otgMix || !song) return;

        const track = ensurePlayableTrack(song);
        if (!track.song) return;

        const songId = track.song.id;
        if (otgGuardRef.current.has(songId)) return;
        otgGuardRef.current.add(songId);
        setTimeout(() => otgGuardRef.current.delete(songId), 2000);

        const exists = otgMix.songs.some(s =>
            ("song" in s && s.song?.id === track.song!.id)
        );

        if (!exists) {
            updateMix("otg-tape", { songs: [...otgMix.songs, track] });
        }
    };

    /* ================= LOAD DATA ================= */

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const settings = loadSettings();
            const langs = settings.languages || ["english", "hindi"];
            setSelectedLanguages(langs);
            setUserName(settings.userName || "");

            // Strict Language Context: If chip is selected but not in settings, reset
            let safeChip = activeChipLanguage;
            if (activeChipLanguage && !langs.includes(activeChipLanguage)) {
                safeChip = null;
                setActiveChipLanguage(null);
            }

            const langContext = safeChip || langs.join(",");

            const [trendRes, chartRes] = await Promise.allSettled([
                getTrending(langContext),
                getTopCharts(langContext)
            ]);

            const trendingSongs =
                trendRes.status === "fulfilled" ? trendRes.value.filter(Boolean) : [];
            const topCharts =
                chartRes.status === "fulfilled" ? chartRes.value : [];

            // FILTER: Ensure trending songs actually match the requested language context
            // JioSaavn's trending API often leaks global/Hindi hits regardless of language param
            const allowedLangs = langContext.toLowerCase().split(',').map(s => s.trim());
            const filteredTrending = trendingSongs.filter((s: any) =>
                s.language && allowedLangs.includes(s.language.toLowerCase())
            );

            // Use filtered list, or empty to trigger fallback search
            setTrending(filteredTrending.slice(0, 10));

            let singles = filteredTrending.slice(0, 10);
            if (!singles.length) {
                // FALLBACK: Use primary context language for search to match user preference
                const primaryLang = langContext.split(',')[0] || "english";
                const fallback = await searchSongs(
                    `${primaryLang} popular hits`,
                    1,
                    10,
                    langContext
                );
                singles = fallback;
            }
            setTrendingSingles(singles);

            setCharts(
                topCharts.slice(0, 4).map((c: any) => ({
                    id: c.id,
                    title: c.title || c.name,
                    subtitle: c.subtitle || "Top Chart",
                    image: c.image
                }))
            );

            const [albums, playlists] = await Promise.all([
                getNewReleases(20, langContext), // Fetch more to account for filter
                getFeaturedPlaylists(10, langContext)
            ]);

            // Filter out singles and trailers masquerading as albums
            const validAlbums = albums.filter((a: any) =>
                (a.type === 'album' || !a.type) &&
                !a.name?.toLowerCase().includes('trailer') &&
                !a.title?.toLowerCase().includes('trailer')
            ).slice(0, 10);

            setLatestAlbums(validAlbums);
            setFeaturedPlaylists(playlists);

            setRecent(HistoryStore.getHistory().slice(0, 6));
            setPlaylists(PlaylistStore.getPlaylists());

            const dl = await OfflineStore.getAllDownloadedSongs();
            setDownloads(
                dl.map(s => ({
                    id: s.id,
                    title: s.name,
                    artist: s.primaryArtists,
                    art: getArt(s),
                    original: { song: s }
                }))
            );
        } catch (e) {
            console.error("Discovery load failed:", e);
        } finally {
            setLoading(false);
        }
    }, [activeChipLanguage]);

    useEffect(() => {
        // Initialize History Store (Migrate/Load from IndexedDB)
        HistoryStore.init().then(loadData);

        // Listeners for global updates
        const onHistoryUpdate = () => setRecent(HistoryStore.getHistory().slice(0, 6));
        const onPlaylistUpdate = () => setPlaylists(PlaylistStore.getPlaylists());

        // Debounced settings update
        let settingsTimeout: NodeJS.Timeout;
        const onSettingsUpdate = () => {
            clearTimeout(settingsTimeout);
            settingsTimeout = setTimeout(loadData, 100);
        };

        window.addEventListener("melora-history-update", onHistoryUpdate);
        window.addEventListener("melora-playlists-update", onPlaylistUpdate);
        window.addEventListener("melora-settings-update", onSettingsUpdate);

        return () => {
            clearTimeout(settingsTimeout);
            window.removeEventListener("melora-history-update", onHistoryUpdate);
            window.removeEventListener("melora-playlists-update", onPlaylistUpdate);
            window.removeEventListener("melora-settings-update", onSettingsUpdate);
        };
    }, [loadData]);

    /* ================= PLAY HANDLER ================= */

    const handlePlay = async (song: any, context: any[] = []) => {
        if (!song) return;

        try {
            if (context.length) {
                const list = context
                    .map(s => ensurePlayableTrack(s))
                    .filter(t => t?.song);

                const index =
                    list.findIndex(t => t.song!.id === song.id) || 0;

                // STABLE MIX ID GENERATION
                let mixId = `mix-${activeView}`;
                let mixTitle = "Context";

                if (activeView === "album" && activeAlbum) {
                    mixId = `album:${activeAlbum}`;
                    mixTitle = "Album";
                } else if (activeView === "playlist-detail" && activePlaylistDetail) {
                    mixId = `playlist:${activePlaylistDetail.id}`;
                    mixTitle = activePlaylistDetail.name || "Playlist";
                } else if (activeView === "artist" && activeArtist) {
                    mixId = `artist:${activeArtist}`; // Note: Artist top songs context
                    mixTitle = "Top Songs";
                } else if (activeView === "chart-detail" && activeChart) {
                    mixId = `chart:${activeChart.id || activeChart.title}`;
                    mixTitle = activeChart.title || "Chart";
                } else if (activeView === "search") {
                    mixId = `search:${searchQuery.trim().toLowerCase()}`;
                    mixTitle = `Search: ${searchQuery}`;
                } else {
                    // Fallback for ephemeral contexts (e.g. Home trending)
                    // We use the first song ID to keep it somewhat stable for the same session
                    mixId = `context:${list[0]?.song?.id || Date.now()}`;
                }

                const mix: Mix = {
                    id: mixId,
                    title: mixTitle,
                    color: "blue",
                    songs: list,
                    currentSongIndex: index
                };

                playInstantMix(mix);
                HistoryStore.addToHistory(ensurePlayableTrack(song));
            } else {
                isGeneratingRef.current = true;
                setIsGeneratingMix(true);

                const seed = ensurePlayableTrack(song);
                const mix = await DiscoveryEngine.generateSessionMix(seed);
                playInstantMix(mix);
                HistoryStore.addToHistory(seed);
            }
        } catch (e) {
            console.error("Play failed:", e);
            // Quick Play Fallback
            playInstantMix({
                id: `fallback-${Date.now()}`,
                title: "Quick Play",
                color: "blue",
                songs: [ensurePlayableTrack(song)].filter(t => t?.song),
                currentSongIndex: 0
            });
            HistoryStore.addToHistory(ensurePlayableTrack(song));
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingMix(false);
        }
    };

    /* ================= SEARCH ================= */

    const performSearch = async (query: string) => {
        const q = query.trim();
        if (!q) {
            setSearchResults([]);
            return;
        }

        const token = ++searchTokenRef.current;
        setIsSearching(true);
        setActiveView("search");

        try {
            const lang = activeChipLanguage || selectedLanguages.join(",");
            const res = await searchUnified(q, lang, 'song', searchQuality); // Pass quality preference
            if (token !== searchTokenRef.current) return;

            setSearchResults(
                res
                    .filter((r): r is NonNullable<typeof r> & { song: NonNullable<typeof r.song> } => !!r?.song)
                    .map(r => ({
                        id: r.id,
                        title: r.song.name,
                        artist: r.song.primaryArtists,
                        duration: "--:--",
                        art: getArt(r.song),
                        original: r
                    }))
            );
        } finally {
            if (token === searchTokenRef.current) setIsSearching(false);
        }
    };

    /* ================= RENDER ================= */

    const renderContent = () => {
        switch (activeView) {
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
                            if (v === "artist") {
                                setLastView("home");
                                setActiveArtist(d);
                                setActiveView("artist");
                            }
                            if (v === "album") {
                                setLastView("home");
                                setActiveAlbum(d);
                                setActiveView("album");
                            }
                        }}
                        onPlayChart={c => {
                            setLastView("home");
                            setActiveChart(c);
                            setActiveView("chart-detail");
                        }}
                        onOpenPlaylist={p => {
                            setLastView("home");
                            setActivePlaylistDetail(p);
                            setActiveView("playlist-detail");
                        }}
                        onOpenAlbum={a => {
                            setLastView("home");
                            setActiveAlbum(a.id || a);
                            setActiveView("album");
                        }}
                        onResumeSong={t => handlePlay(t.song)}
                        activeLanguage={activeChipLanguage}
                        selectedLanguages={selectedLanguages}
                        onLanguageSelect={setActiveChipLanguage}
                        userName={userName}
                    />
                );

            case "search":
                return (
                    <SearchView
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        performSearch={performSearch}
                        searchResults={searchResults}
                        setSearchResults={setSearchResults}
                        isSearching={isSearching}
                        setActiveView={(v) => setActiveView(v as DiscoveryView)}
                        lastView={lastView}
                        colors={colors}
                        currentSong={currentSong ?? null}
                        isPlaying={isPlaying}
                        handlePlay={handlePlay}
                        quality={searchQuality}
                        setQuality={setSearchQuality}
                    />
                );

            case "artist":
                return activeArtist ? (
                    <ArtistView
                        artistName={activeArtist}
                        colors={colors}
                        onBack={() => setActiveView(lastView)}
                        onPlay={handlePlay}
                        onNavigate={(v, d) => {
                            if (v === "album") {
                                setActiveAlbum(d);
                                setActiveView("album");
                            }
                        }}
                    />
                ) : null;

            case "album":
                return activeAlbum ? (
                    <AlbumView
                        albumId={activeAlbum}
                        colors={colors}
                        onBack={() => setActiveView(lastView)}
                        onPlay={handlePlay}
                    />
                ) : null;

            case "chart-detail":
                return activeChart ? (
                    <ChartDetailScreen
                        chartId={activeChart.id || activeChart.title}
                        chartTitle={activeChart.title}
                        chartImage={activeChart.image}
                        colors={colors}
                        onBack={() => setActiveView(lastView)}
                        onPlay={handlePlay}
                    />
                ) : null;

            case "playlist-detail":
                return activePlaylistDetail ? (
                    <PlaylistScreen
                        playlistId={activePlaylistDetail.id}
                        playlistTitle={activePlaylistDetail.name || activePlaylistDetail.title}
                        playlistImage={getArt(activePlaylistDetail)}
                        colors={colors}
                        onBack={() => setActiveView(lastView)}
                    />
                ) : null;

            case "explore":
                return (
                    <ExploreView
                        colors={colors}
                        setLastView={setLastView}
                        setActiveMood={setActiveMood}
                        setActiveView={setActiveView}
                    />
                );

            case "mood-detail":
                return activeMood ? (
                    <MoodDetailScreen
                        mood={activeMood}
                        colors={colors}
                        onBack={() => setActiveView(lastView)}
                        onOpenPlaylist={p => {
                            setActivePlaylistDetail(p);
                            setActiveView("playlist-detail");
                        }}
                        languageContext={activeChipLanguage || selectedLanguages.join(",")}
                    />
                ) : null;

            case "browse":
                return (
                    <BrowseView
                        colors={colors}
                        charts={charts}
                        setLastView={setLastView}
                        setActiveCollection={setActiveCollection}
                        setActiveView={setActiveView}
                        setActiveChart={setActiveChart}
                        setActiveDecade={setActiveDecade}
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
                        setLastView={setLastView}
                        setActivePlaylistDetail={setActivePlaylistDetail}
                        setActiveView={setActiveView}
                        handlePlay={handlePlay}
                    />
                );

            case "now-playing":
                return currentSong ? (
                    <NowPlayingOverlay
                        song={currentSong}
                        nextSong={activeMix?.songs[activeMix.currentSongIndex + 1] ?? null}
                        quality={activeQuality}
                        onClose={() => setActiveView(lastView)}
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
                        onAddToOTG={addToOTG}
                    />
                ) : null;

            default:
                return null;
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col bg-black text-white overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    activeView={activeView}
                    setActiveView={setActiveView}
                    lastView={lastView}
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
                        <motion.div
                            key={activeView}
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>

                <RightPanel
                    recent={recent}
                    handlePlay={handlePlay}
                    colors={colors}
                    navigateToArtist={a => {
                        setLastView(activeView as RootView);
                        setActiveArtist(a);
                        setActiveView("artist");
                    }}
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
                activeView={activeView}
                setActiveView={setActiveView}
                setLastView={setLastView}
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
                    // Handle layout switching
                    if (typeof window !== 'undefined') {
                        // If switching to deck/ipod, we might need a full reload or mode switch event
                        // For now, let's assume specific logic or just log it/reload
                        if (mode !== 'discovery') {
                            const confirmSwitch = confirm(`Switching to ${mode} mode will reload the application. Continue?`);
                            if (confirmSwitch) {
                                localStorage.setItem("melora-preferred-layout", mode);
                                window.location.reload();
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
