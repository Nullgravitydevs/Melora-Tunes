import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";
import { getTrending, getTopCharts, getNewReleases, getFeaturedPlaylists, searchSongs } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { searchUnified } from "@/lib/unified-search";
import { OfflineStore } from "@/lib/offline-store";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { HistoryStore, HistoryItem } from "@/lib/history-store";
import { getArt } from "./DiscoveryShared";

// Sub-screens
import { HomeView } from "./HomeView";
import { ArtistView } from "./ArtistView";
import { AlbumView } from "./AlbumView";
import { ChartDetailScreen } from "./ChartDetailScreen";
import { PlaylistScreen } from "./PlaylistScreen";
import { MoodDetailScreen } from "./MoodDetailScreen";
import { CollectionDetailScreen } from "./CollectionDetailScreen";
import { DecadeDetailScreen } from "./DecadeDetailScreen";

// extracted modules
import { moodCategories, ExploreView } from "./desktop/ExploreView";
import { BrowseView } from "./desktop/BrowseView";
import { LibraryView } from "./desktop/LibraryView";
import { SearchView } from "./desktop/SearchView";
import { Sidebar } from "./desktop/Sidebar";
import { RightPanel } from "./desktop/RightPanel";
import { FloatingPlayer } from "./desktop/FloatingPlayer";
import { NowPlayingOverlay } from "./desktop/NowPlayingOverlay";
import { LanguageSelectorModal } from "./desktop/LanguageSelectorModal";

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    // Fix 1: Removed unused isMidnight
    // Fix 80: Restore accidentally removed setters needed for NowPlayingOverlay
    const { playInstantMix, currentSong, currentTrack, activeQuality, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, toggleLike, isLiked, likedSongs, activeMixId, activeMix, mixes, updateMix } = usePlayback();
    const otgGuardRef = React.useRef<Set<string>>(new Set()); // Fix 40: OTG Guard

    const addToOTG = (song: any) => {
        const otgMix = mixes.find(m => m.id === 'otg-tape');
        if (!otgMix || !song) return;

        const track = ensurePlayableTrack(song);
        if (!track.song) return;

        // Fix 40: Guard Logic
        // Capture ID to satisfy TS closure safety
        const songId = track.song.id;
        if (otgGuardRef.current.has(songId)) return;
        otgGuardRef.current.add(songId);

        // Auto-clear guard after 2s
        setTimeout(() => otgGuardRef.current.delete(songId), 2000);

        const exists = otgMix.songs.some(s =>
            ('song' in s && s.song?.id === track.song!.id)
        );

        if (!exists) {
            updateMix('otg-tape', { songs: [...otgMix.songs, track] });
        }
    };

    // STRICT ROOT VIEW SYSTEM
    type RootView = 'home' | 'search' | 'explore' | 'browse' | 'library';

    type DiscoveryView =
        | RootView
        | 'mood-detail'
        | 'collection-detail'
        | 'decade-detail'
        | 'chart-detail'
        | 'playlist-detail'
        | 'artist'
        | 'album'
        | 'now-playing';

    const [activeView, setActiveView] = useState<DiscoveryView>('home');
    const [activeArtist, setActiveArtist] = useState<string | null>(null);
    const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
    const [activeRegion] = useState<string>('global'); // Fix 31: Removed setter
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);

    // Chart & Playlist Detail States
    const [activeChart, setActiveChart] = useState<any | null>(null);
    const [activePlaylistDetail, setActivePlaylistDetail] = useState<any | null>(null);
    const [activeMood, setActiveMood] = useState<typeof moodCategories[0] | null>(null);
    const [activeCollection, setActiveCollection] = useState<any | null>(null);
    const [activeDecade, setActiveDecade] = useState<any | null>(null);
    // STRICT: lastView can ONLY be a RootView
    const [lastView, setLastView] = useState<RootView>('home');

    // MINIMALIST PALETTE (Project Linear)
    const c = React.useMemo(() => ({
        bg: '#000000', // PURE BLACK
        surface: '#000000', // No surface differentiation
        card: '#0a0a0a', // Subtle card bg
        cardHover: '#141414',
        text: '#FFFFFF',
        textMuted: '#666666',
        border: 'rgba(255,255,255,0.08)', // Sharp minimal border
        accent: '#FFFFFF', // High contrast accent
        accentSoft: 'rgba(255,255,255,0.08)', // Subtle hover
    }), []);

    // Data State
    const [trending, setTrending] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [recent, setRecent] = useState<HistoryItem[]>([]);
    const [trendingSingles, setTrendingSingles] = useState<any[]>([]); // Was newAndTrending

    // Language Feed State
    // "New Releases" -> latestAlbums
    const [latestAlbums, setLatestAlbums] = useState<any[]>([]);
    // "Editorial Picks" -> featuredPlaylists
    const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    const CHIP_ALL = null;
    const [activeChipLanguage, setActiveChipLanguage] = useState<string | null>(CHIP_ALL);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Library State
    const [downloads, setDownloads] = useState<any[]>([]);

    // Playlist State
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    // OPTIMIZED: Memoized data loader
    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            // Load Settings for Languages
            const settings = loadSettings();
            setSelectedLanguages(settings.languages || ['english', 'hindi']);

            // 3. LANGUAGE CONTEXT RESOLUTION (Single Source of Truth)
            // 3. LANGUAGE CONTEXT RESOLUTION (Single Source of Truth)
            // Fix #2: If active chip is no longer in settings, reset it
            let safeChip = activeChipLanguage;
            if (activeChipLanguage && settings.languages && !settings.languages.includes(activeChipLanguage)) {
                safeChip = null;
                // Defer state update to avoid loops, or just use local var
                // We'll update state at end or let next effect catch it, but for this load use clear
            }

            const langContext = safeChip
                ? safeChip
                : (settings.languages || ['english', 'hindi']).join(',');

            // Verify activeChip reset in UI if needed (handled by effect below or safeChip logic)
            if (activeChipLanguage !== safeChip) {
                setActiveChipLanguage(null);
            }

            // Polish: Prevent flash (Removed per QA Fix 1)

            console.log('[Discovery] Loading data for context:', langContext);

            // 2. Fetch Charts (Contextual)
            // Fix 78: Isolated fetching with Promise.allSettled
            const [trendRes, chartRes] = await Promise.allSettled([
                activeRegion && activeRegion !== 'global'
                    ? searchUnified(`Trending ${activeRegion}`, langContext).then(res => res.map(t => t.song))
                    : getTrending(langContext),
                getTopCharts(langContext)
            ]);

            const trendingSongs = trendRes.status === 'fulfilled' ? trendRes.value.filter(Boolean) : [];
            const topCharts = chartRes.status === 'fulfilled' ? chartRes.value : [];

            // 3. Load Recent
            setRecent(HistoryStore.getHistory().slice(0, 6));

            // 4. Fetch Language Specific Content
            // Parallel fetch for speed
            const [fetchedAlbums, fetchedPlaylists] = await Promise.all([
                getNewReleases(10, langContext),
                getFeaturedPlaylists(10, langContext)
            ]);

            setLatestAlbums(fetchedAlbums);
            setFeaturedPlaylists(fetchedPlaylists);

            // 5. Load Downloads
            const downloadedSongs = await OfflineStore.getAllDownloadedSongs();
            setDownloads(downloadedSongs.map(s => ({
                id: s.id,
                title: s.name,
                artist: s.primaryArtists,
                art: getArt(s),
                original: { song: s, sources: [] }
            })));

            setTrending(trendingSongs.slice(0, 10));

            const usefulCharts = topCharts
                .filter((c: any) => c.image)
                .slice(0, 4)
                .map((c: any) => ({
                    id: c.id,
                    title: c.title || c.name,
                    subtitle: c.subtitle || `${c.language || 'Global'} • ${c.type} `,
                    image: c.image, // Fix 6: Direct access
                    isNew: c.isNew || false
                }));

            setCharts(usefulCharts);

            // Handle pure trending singles 
            let singles = trendingSongs.slice(0, 10).map((s: any) => ({
                ...s,
                type: 'single'
            }));

            // Fallback strategy if trending is empty (aggressive language filtering might yield empty on cold start)
            if (singles.length === 0) {
                console.log('[HomeDebug] Trending empty, falling back to search');
                // Fix 7: Hoisted import
                // const { searchSongs } = await import('@/lib/jiosaavn');
                // Use langContext for fallback search too
                const primaryLang = langContext.split(',')[0];
                const popularSongs = await searchSongs(`${primaryLang} popular hits`, 1, 10, langContext);
                singles = popularSongs.map((s: any) => ({
                    ...s,
                    type: 'single'
                }));
            }
            setTrendingSingles(singles);

        } catch (e) {
            console.error("Discovery Load Failed:", e);
        } finally {
            setLoading(false);
        }
    }, [activeRegion, activeChipLanguage]); // Fix 72: Remove selectedLanguages dependency

    useEffect(() => {
        loadData();

        const onHistoryUpdate = () => setRecent(HistoryStore.getHistory().slice(0, 6));
        const onPlaylistUpdate = () => setPlaylists(PlaylistStore.getPlaylists());

        // Fix 44: Debounce settings update
        let settingsTimeout: NodeJS.Timeout;
        const onSettingsUpdate = () => {
            clearTimeout(settingsTimeout);
            settingsTimeout = setTimeout(loadData, 100);
        };

        window.addEventListener('melora-history-update', onHistoryUpdate);
        window.addEventListener('melora-playlists-update', onPlaylistUpdate);
        window.addEventListener('melora-settings-update', onSettingsUpdate);

        return () => {
            clearTimeout(settingsTimeout);
            window.removeEventListener('melora-history-update', onHistoryUpdate);
            window.removeEventListener('melora-playlists-update', onPlaylistUpdate);
            window.removeEventListener('melora-settings-update', onSettingsUpdate);
        };
    }, [loadData]);

    // Polish #2: Persist chip language
    useEffect(() => {
        if (activeChipLanguage !== null) {
            sessionStorage.setItem('melora-active-lang', activeChipLanguage);
        } else {
            // If expressly cleared/all, maybe remove or keep last?
            // Let's keep last selection logic if desirable, or clear.
            // For "ALL" (null), we usually don't persist "null" string.
            sessionStorage.removeItem('melora-active-lang');
        }
    }, [activeChipLanguage]);

    // On mount restore chip
    useEffect(() => {
        const saved = sessionStorage.getItem('melora-active-lang');
        const settings = loadSettings();
        if (saved && settings.languages?.includes(saved)) {
            setActiveChipLanguage(saved);
        }
    }, []);


    // Mix Loading State
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);
    const isGeneratingRef = React.useRef(false);
    const searchTokenRef = React.useRef(0); // Fix 8: Race guard

    // Fix 74: Clear search results on leave
    useEffect(() => {
        if (activeView !== 'search') {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [activeView]);

    const handlePlay = async (song: any, allSongs: any[] = []) => {
        if (!song) return; // Fix 66: Remove isGeneratingRef guard from entry

        // Removed global setIsGeneratingMix per Fix 33

        try {
            await new Promise(r => setTimeout(r, 50));

            // STRICT DISCOVERY MODE
            if (allSongs.length > 0) {
                let songList = allSongs
                    .map(s => ensurePlayableTrack(s))
                    .filter(t => t && t.song);
                let startIndex = songList.findIndex(s => s.song?.id === song.id);
                // FIX: Context safety
                if (startIndex < 0) startIndex = 0;

                // Fix 9: Empty check
                if (songList.length === 0) throw new Error('Empty context list');

                // DYNAMIC CONTEXT ID GENERATION
                let contextId = `context-${Date.now()}`;
                if (activeView === 'album' && activeAlbum) contextId = `context-album-${activeAlbum}`;
                else if (activeView === 'playlist-detail' && activePlaylistDetail) contextId = `context-playlist-${activePlaylistDetail.id}`;
                else if (activeView === 'artist' && activeArtist) contextId = `context-artist-${activeArtist}`;
                else if (activeView === 'chart-detail' && activeChart) contextId = `context-chart-${activeChart.id}`; // Fix 10: Stable ID
                else if (activeView === 'search') contextId = `context-search-${searchQuery || 'results'}`; // Fix 70: Use searchQuery state

                const newMix: Mix = {
                    id: contextId,
                    title: activeView === 'album'
                        ? 'Album'
                        : activeView === 'playlist-detail'
                            ? 'Playlist'
                            : activeView === 'chart-detail'
                                ? (activeChart?.title || 'Chart')
                                : activeView === 'search'
                                    ? `Search: ${searchQuery}`
                                    : 'Context', // Fix 37: Better titles
                    color: 'blue',
                    songs: songList,
                    currentSongIndex: startIndex >= 0 ? startIndex : 0
                };
                // Fix 35/69: Push to History (Normalized)
                const playable = ensurePlayableTrack(song);
                if (playable.song) {
                    HistoryStore.addToHistory(playable);
                }
            } else {
                // THE DJ MODE (Discovery Engine)
                isGeneratingRef.current = true;
                setIsGeneratingMix(true); // Fix 33/67: Scope DJ only

                try {
                    const seed = ensurePlayableTrack(song);
                    const sessionMix = await DiscoveryEngine.generateSessionMix(seed, activeRegion || undefined);

                    // FIX: Discovery Engine Guard
                    if (!sessionMix || !sessionMix.songs || sessionMix.songs.length === 0) {
                        throw new Error('Empty session mix');
                    }

                    playInstantMix(sessionMix);

                    // Fix 35/69: Push to History
                    if (seed.song) {
                        HistoryStore.addToHistory(seed);
                    }
                } finally {
                    isGeneratingRef.current = false;
                    setIsGeneratingMix(false);
                }
            }
        } catch (e) {
            console.error("DJ Failed:", e);
            playInstantMix({
                // FIX: Unique ID
                id: `fallback-${Date.now()}`,
                title: 'Quick Play', // Fix 79: Better name
                color: 'blue',
                songs: [ensurePlayableTrack(song)].filter(t => t?.song), // Fix 34: Safe filter
                currentSongIndex: 0
            });

            // Fix 81: Fallback history
            const playable = ensurePlayableTrack(song);
            if (playable.song) HistoryStore.addToHistory(playable);
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingMix(false);
        }
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]); // Fix 45: Force clear
            return;
        }

        // Fix 71: Reset DJ state on search
        isGeneratingRef.current = false;
        setIsGeneratingMix(false);

        setSearchQuery(query); // Fix 36: Ensure freshness
        const safeQuery = query.trim() || 'results'; // Fix 70: Sanitize context ID

        const token = ++searchTokenRef.current; // Fix 8: Token increment
        setIsSearching(true);
        setActiveView('search');

        try {
            const langContext = activeChipLanguage || selectedLanguages.join(',');
            const results = await searchUnified(query, langContext);
            if (token !== searchTokenRef.current) return; // Fix 8: Token check

            const mapped = results
                .filter(item => item?.song)
                .map(item => {
                    const song = item.song!;
                    return {
                        id: item.id,
                        title: song.name,
                        artist: song.primaryArtists,
                        duration: song.duration
                            ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`
                            : '--:--',
                        art: getArt(song),
                        original: item
                    };
                });

            setSearchResults(mapped);
        } catch (e) {
            console.error("Search Failed:", e);
        } finally {
            if (token === searchTokenRef.current) setIsSearching(false);
        }
    };

    const safeBackToRoot = () => {
        setActiveView(
            ['home', 'explore', 'browse', 'library', 'search'].includes(lastView)
                ? lastView
                : 'home'
        );
    };

    const navigateToArtist = (artistName: string) => {
        const origin = (['home', 'explore', 'browse', 'library', 'search'].includes(activeView) ? activeView : (lastView || 'home')) as RootView;
        setLastView(origin);
        setActiveArtist(artistName);
        setActiveView('artist');
    };

    const navigateToAlbum = (albumId: string) => {
        const origin = (['home', 'explore', 'browse', 'library', 'search'].includes(activeView) ? activeView : (lastView || 'home')) as RootView;
        setLastView(origin);
        setActiveAlbum(albumId);
        setActiveView('album');
    };

    const renderContent = () => {
        switch (activeView) {
            case 'search':
                return (
                    <SearchView
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        performSearch={performSearch}
                        searchResults={searchResults}
                        setSearchResults={setSearchResults}
                        isSearching={isSearching}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        lastView={lastView}
                        colors={c}
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        handlePlay={handlePlay}
                    />
                );
            case 'explore':
                return (
                    <ExploreView
                        colors={c}
                        setLastView={setLastView}
                        setActiveMood={setActiveMood}
                        setActiveView={setActiveView}
                    />
                );
            case 'mood-detail':
                return activeMood ? (
                    <MoodDetailScreen
                        mood={activeMood}
                        colors={c}
                        onBack={() => {
                            setActiveMood(null);
                            safeBackToRoot();
                        }}
                        onOpenPlaylist={(playlist) => {
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                        languageContext={activeChipLanguage || selectedLanguages.join(',')}
                    />
                ) : null;

            case 'playlist-detail':
                return activePlaylistDetail ? (
                    <PlaylistScreen
                        playlistId={activePlaylistDetail.id}
                        playlistTitle={activePlaylistDetail.name || activePlaylistDetail.title}
                        playlistImage={getArt(activePlaylistDetail)}
                        colors={c}
                        onBack={() => {
                            setActivePlaylistDetail(null);
                            safeBackToRoot();
                        }}
                    />
                ) : null;

            case 'collection-detail':
                return activeCollection ? (
                    <CollectionDetailScreen
                        collection={activeCollection}
                        colors={c}
                        onBack={() => {
                            setActiveCollection(null);
                            safeBackToRoot();
                        }}
                        onOpenPlaylist={(playlist) => {
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                        languageContext={activeChipLanguage || selectedLanguages.join(',')}
                    />
                ) : null;

            case 'chart-detail':
                return activeChart ? (
                    <ChartDetailScreen
                        chartId={activeChart.id || activeChart.title}
                        chartTitle={activeChart.title}
                        chartImage={activeChart.image}
                        colors={c}
                        onBack={() => {
                            setActiveChart(null);
                            safeBackToRoot();
                        }}
                        onPlay={(song, list) => handlePlay(song, list)}
                    />
                ) : null;

            case 'decade-detail':
                return activeDecade ? (
                    <DecadeDetailScreen
                        decade={activeDecade}
                        colors={c}
                        onBack={() => {
                            setActiveDecade(null);
                            safeBackToRoot();
                        }}
                        onOpenPlaylist={(playlist) => {
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                        languageContext={activeChipLanguage || selectedLanguages.join(',')}
                    />
                ) : null;

            case 'browse':
                return (
                    <BrowseView
                        colors={c}
                        charts={Array.isArray(charts) ? charts : []} // Fix 41: Array Safety
                        setLastView={setLastView}
                        setActiveCollection={setActiveCollection}
                        setActiveView={setActiveView}
                        setActiveChart={setActiveChart}
                        setActiveDecade={setActiveDecade}
                        // New Props for Language Filtering
                        activeLanguage={activeChipLanguage}
                        selectedLanguages={selectedLanguages}
                    />
                );

            case 'library':
                return (
                    <LibraryView
                        playlists={playlists}
                        downloads={downloads}
                        colors={c}
                        setLastView={setLastView}
                        setActivePlaylistDetail={setActivePlaylistDetail}
                        setActiveView={setActiveView}
                        handlePlay={handlePlay}
                    />
                );
            case 'home':
                return (
                    <HomeView
                        colors={c}
                        trending={Array.isArray(trending) ? trending : []}
                        charts={Array.isArray(charts) ? charts : []}
                        recent={Array.isArray(recent) ? recent : []}

                        // Updated Prop Names
                        trendingSingles={Array.isArray(trendingSingles) ? trendingSingles : []}
                        featuredPlaylists={Array.isArray(featuredPlaylists) ? featuredPlaylists : []}
                        latestAlbums={Array.isArray(latestAlbums) ? latestAlbums : []} // Fix 42: Array Safety

                        loading={loading}
                        onPlay={handlePlay}
                        onNavigate={(view, data) => {
                            if (view === 'artist') navigateToArtist(data);
                            if (view === 'album') navigateToAlbum(data);
                        }}
                        onPlayChart={(chart) => {
                            setLastView('home');
                            setActiveChart(chart);
                            setActiveView('chart-detail');
                        }}
                        onOpenPlaylist={(playlist) => {
                            setLastView('home');
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                        onOpenAlbum={(album) => {
                            const origin = (['home', 'explore', 'browse', 'library', 'search'].includes(activeView)
                                ? activeView
                                : lastView) as RootView;
                            setLastView(origin as RootView);
                            setActiveAlbum(album?.id || album);
                            setActiveView('album');
                        }}
                        onResumeSong={(track, position) => {
                            handlePlay(track.song);
                        }}

                        // New Props
                        activeLanguage={activeChipLanguage}
                        selectedLanguages={selectedLanguages}
                        onLanguageSelect={setActiveChipLanguage}
                    />
                );
            case 'artist':
                return activeArtist ? (
                    <ArtistView
                        artistName={activeArtist}
                        colors={c}
                        onBack={() => {
                            safeBackToRoot();
                        }}
                        onPlay={handlePlay}
                        onNavigate={(view: string, data: any) => {
                            if (view === 'album') navigateToAlbum(data);
                        }}
                    />
                ) : null;
            case 'album':
                return activeAlbum ? (
                    <AlbumView
                        albumId={activeAlbum}
                        colors={c}
                        onBack={() => {
                            safeBackToRoot();
                        }}
                        onPlay={handlePlay}
                    />
                ) : null;
            case 'now-playing': // New Layout
                return currentSong ? (
                    <NowPlayingOverlay
                        song={currentSong}
                        nextSong={
                            activeMix && activeMix.songs[activeMix.currentSongIndex + 1]
                                ? activeMix.songs[activeMix.currentSongIndex + 1]
                                : null
                        }
                        quality={activeQuality || currentTrack?.preferredQuality || '320'}
                        onClose={() => {
                            const target = ['home', 'search', 'explore', 'browse', 'library'].includes(lastView)
                                ? lastView
                                : 'home';
                            setActiveView(target as DiscoveryView); // Fix 38: Strict Close Target
                        }}
                        playback={{
                            isPlaying, togglePlay, next, prev,
                            progress, duration, seek,
                            shuffle, repeat,
                            toggleLike, isLiked, // Fix 11: Simply pass isLiked
                            queue: activeMix?.songs || [],
                            currentIndex: activeMix?.currentSongIndex || 0,
                            activeMixId,
                            updateMix
                        }}
                        onAddToOTG={addToOTG}
                    />
                ) : <div className="flex-1 flex items-center justify-center text-white/50">No song playing</div>;
            default:
                return (
                    <div className="flex-1 flex items-center justify-center text-white/40">
                        Unknown view
                    </div>
                );
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500 relative" style={{ backgroundColor: '#000', color: c.text }}>

            {/* === TOP SECTION (Sidebar + Main + Right Panel) === */}
            <div className="flex-1 flex overflow-hidden z-10 relative">

                {/* --- LEFT SIDEBAR (GLASS) --- */}
                <Sidebar
                    activeView={activeView}
                    setActiveView={(target) => {
                        // Fix 75: Strict Guard
                        if (!['home', 'search', 'explore', 'browse', 'library', 'now-playing'].includes(target)) return;

                        // Fix 39/76: Guard LastView override
                        if (['home', 'search', 'explore', 'browse', 'library'].includes(activeView)) {
                            setLastView(activeView as RootView);
                        }

                        // Fix 77: Clear detail state
                        if (['home', 'search', 'explore', 'browse', 'library'].includes(target)) {
                            setActiveAlbum(null);
                            setActiveArtist(null);
                        }

                        setActiveView(target as DiscoveryView);
                    }}
                    lastView={lastView}
                    theme={theme}
                    onThemeChange={onThemeChange}
                    playlists={playlists}
                    likedSongs={likedSongs}
                    activeMixId={activeMixId}
                    playInstantMix={playInstantMix}
                    setIsLangModalOpen={setIsLangModalOpen}
                    colors={c}
                />

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView}
                            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 flex flex-col"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* --- RIGHT PANEL (Recent Played - GLASS) --- */}
                <RightPanel
                    recent={recent}
                    handlePlay={handlePlay}
                    colors={c}
                    navigateToArtist={navigateToArtist}
                />
            </div>

            {/* === BOTTOM PLAYER BAR === */}
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
                activeQuality={activeQuality || '320'}
                currentTrack={currentTrack}
                activeView={activeView}
                setActiveView={(target) => {
                    if (['home', 'search', 'explore', 'browse', 'library'].includes(activeView)) {
                        setLastView(activeView as RootView);
                    }
                    setActiveView(target as DiscoveryView);
                }}
                setLastView={setLastView}
                toggleLike={toggleLike}
                isLiked={isLiked}
            />

            {/* === GLOBAL DJ LOADER === */}
            {/* Fix 68: Remove AnimatePresence to prevent double mount flicker */}
            {isGeneratingMix && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin" />
                            <div className="absolute inset-2 border-r-2 border-white/50 rounded-full animate-spin-slow" />
                        </div>
                        <p className="text-lg font-bold text-white tracking-widest animate-pulse">
                            DJ IS THINKING...
                        </p>
                    </div>
                </motion.div>
            )}

            <LanguageSelectorModal
                isOpen={isLangModalOpen}
                onClose={() => setIsLangModalOpen(false)}
                onSave={() => {
                    setIsLangModalOpen(false);
                    // Fix 82: Use rAF
                    requestAnimationFrame(() => loadData());
                }}
            />
        </div>
    );
}
