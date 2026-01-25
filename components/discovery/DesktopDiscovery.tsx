import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";
import { getTrending, getTopCharts } from "@/lib/jiosaavn";
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

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    const isMidnight = theme === 'midnight';
    const { playInstantMix, currentSong, currentTrack, activeQuality, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, toggleLike, isLiked, likedSongs, activeMixId, activeMix, mixes, updateMix } = usePlayback();

    const addToOTG = (song: any) => {
        const otgMix = mixes.find(m => m.id === 'otg-tape');
        if (!otgMix || !song) return;

        const track = ensurePlayableTrack(song);
        if (!track.song) return;

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
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
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
    const [newAndTrending, setNewAndTrending] = useState<any[]>([]);
    const [editorialPicks, setEditorialPicks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            // 1. Fetch Trending (Contextual)
            let trendingSongs: any[] = [];
            if (activeRegion && activeRegion !== 'global') {
                const query = `Trending ${activeRegion}`;
                const items = await searchUnified(query);
                trendingSongs = items.map(t => t.song);
            } else {
                trendingSongs = await getTrending();
            }

            // 2. Fetch Charts
            const topCharts = await getTopCharts();

            // 3. Load Recent
            setRecent(HistoryStore.getHistory().slice(0, 6));

            // 4. Load Downloads
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
                    image: c.image || c.image?.[2]?.link,
                    isNew: c.isNew || false
                }));

            setCharts(usefulCharts);

            let newTrendingItems = trendingSongs.slice(0, 10).map((s: any) => ({
                ...s,
                type: 'single'
            }));

            if (newTrendingItems.length === 0) {
                console.log('[HomeDebug] Trending empty, falling back to search');
                const { searchSongs } = await import('@/lib/jiosaavn');
                const popularSongs = await searchSongs('popular hits', 1, 10);
                newTrendingItems = popularSongs.map((s: any) => ({
                    ...s,
                    type: 'single'
                }));
            }
            setNewAndTrending(newTrendingItems);

            const editorialItems = topCharts
                .filter((c: any) => c.image && c.type !== 'song')
                .slice(0, 6)
                .map((c: any) => ({
                    id: c.id,
                    name: c.title || c.name,
                    image: c.image,
                    type: 'playlist'
                }));
            setEditorialPicks(editorialItems);
        } catch (e) {
            console.error("Discovery Load Failed:", e);
        } finally {
            setLoading(false);
        }
    }, [activeRegion]);

    useEffect(() => {
        let mounted = true;

        const safeLoad = async () => {
            await loadData();
        };

        if (mounted) safeLoad();

        const onHistoryUpdate = () => mounted && setRecent(HistoryStore.getHistory().slice(0, 6));
        const onPlaylistUpdate = () => mounted && setPlaylists(PlaylistStore.getPlaylists());

        window.addEventListener('melora-history-update', onHistoryUpdate);
        window.addEventListener('melora-playlists-update', onPlaylistUpdate);
        return () => {
            mounted = false;
            window.removeEventListener('melora-history-update', onHistoryUpdate);
            window.removeEventListener('melora-playlists-update', onPlaylistUpdate);
        };
    }, [loadData]);


    // Mix Loading State
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);
    const isGeneratingRef = React.useRef(false);

    const handlePlay = async (song: any, allSongs: any[] = []) => {
        if (!song || isGeneratingRef.current) return;

        isGeneratingRef.current = true;
        setIsGeneratingMix(true);

        try {
            await new Promise(r => setTimeout(r, 50));

            // STRICT DISCOVERY MODE
            if (allSongs.length > 0) {
                let songList = allSongs.map(s => ensurePlayableTrack(s));
                let startIndex = songList.findIndex(s => s.id === song.id);
                // FIX: Context safety
                if (startIndex < 0) startIndex = 0;

                // DYNAMIC CONTEXT ID GENERATION
                let contextId = `context-${Date.now()}`;
                if (activeView === 'album' && activeAlbum) contextId = `context-album-${activeAlbum}`;
                else if (activeView === 'playlist-detail' && activePlaylistDetail) contextId = `context-playlist-${activePlaylistDetail.id}`;
                else if (activeView === 'artist' && activeArtist) contextId = `context-artist-${activeArtist}`;
                else if (activeView === 'chart-detail') contextId = `context-chart-${Date.now()}`;
                else if (activeView === 'search') contextId = `context-search-${Date.now()}`;

                const newMix: Mix = {
                    id: contextId,
                    title: activeView === 'album' ? 'Album Context' : activeView === 'playlist-detail' ? 'Playlist Context' : 'Context Mix',
                    color: 'blue',
                    songs: songList,
                    currentSongIndex: startIndex >= 0 ? startIndex : 0
                };
                playInstantMix(newMix);
            } else {
                // THE DJ MODE (Discovery Engine)
                const seed = ensurePlayableTrack(song);
                const sessionMix = await DiscoveryEngine.generateSessionMix(seed, activeRegion || undefined);

                // FIX: Discovery Engine Guard
                if (!sessionMix || !sessionMix.songs || sessionMix.songs.length === 0) {
                    throw new Error('Empty session mix');
                }

                playInstantMix(sessionMix);
            }
        } catch (e) {
            console.error("DJ Failed:", e);
            playInstantMix({
                // FIX: Unique ID
                id: `fallback-${Date.now()}`,
                title: 'Mix',
                color: 'blue',
                songs: [ensurePlayableTrack(song)],
                currentSongIndex: 0
            });
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingMix(false);
        }
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        let cancelled = false;
        setIsSearching(true);
        setActiveView('search');

        try {
            const results = await searchUnified(query);
            if (cancelled) return;

            const mapped = results
                .filter(item => item && item.song)
                .map(item => {
                    // FIX: TS Safe access
                    const song = item.song!;
                    return {
                        id: item.id,
                        title: song.name,
                        artist: song.primaryArtists,
                        duration: song.duration ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0') : '--:--',
                        art: getArt(song),
                        original: item
                    };
                });
            setSearchResults(mapped);
        } catch (e) {
            console.error("Search Failed:", e);
        } finally {
            if (!cancelled) setIsSearching(false);
        }

        return () => {
            cancelled = true;
        };
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
                        onPlay={(song, list) => { }}
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
                    />
                ) : null;

            case 'browse':
                return (
                    <BrowseView
                        colors={c}
                        charts={charts}
                        setLastView={setLastView}
                        setActiveCollection={setActiveCollection}
                        setActiveView={setActiveView}
                        setActiveChart={setActiveChart}
                        setActiveDecade={setActiveDecade}
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
                        trending={trending}
                        charts={charts}
                        recent={recent}
                        newAndTrending={newAndTrending}
                        editorialPicks={editorialPicks}
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
                        nextSong={(activeMix?.songs || [])[(activeMix?.currentSongIndex || 0) + 1]}
                        quality={activeQuality || currentTrack?.preferredQuality || '320'}
                        onClose={() => setActiveView(
                            ['home', 'explore', 'browse', 'library', 'search'].includes(lastView)
                                ? lastView
                                : 'home'
                        )}
                        playback={{
                            isPlaying, togglePlay, next, prev,
                            progress, duration, seek,
                            shuffle, setShuffle, repeat, setRepeat,
                            toggleLike, isLiked: (id: string) => likedSongs.some(s => s.id === id),
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
                    setActiveView={setActiveView}
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
                setActiveView={setActiveView}
                setLastView={setLastView}
                toggleLike={toggleLike}
                isLiked={(id) => likedSongs.some(s => s.id === id)}
            />

            {/* === GLOBAL DJ LOADER === */}
            <AnimatePresence>
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
            </AnimatePresence>
        </div>
    );
}
