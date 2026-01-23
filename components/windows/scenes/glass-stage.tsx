"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { getStation, getTrending, searchSongs, getLyrics, getSyncedLyrics, getArtistDetails, getAlbumDetails, getPlaylistDetails, getTopCharts, JioSaavnSong, searchAlbums, getArtistStation } from '@/lib/jiosaavn';
import { getHiFiAlbum } from '@/lib/hifi-client';
import { searchUnified, SearchType } from '@/lib/unified-search';
import { PlayableTrack, isPlayableTrack } from '@/lib/types';
import { SearchFilters } from "@/components/ui/search-filters";
import { ArtistView } from "./artist-view";
import { TrackContextMenu } from '@/components/ui/track-context-menu';
import { decodeHtml, parseLrc, cleanTrackTitle } from "@/lib/utils";
import {
    Home, Search, Compass, Library, Plus, AppWindow,
    Volume2, MoreVertical, MoreHorizontal, ArrowLeft, Grid, Mic2, ListMusic,
    Calendar, Clock, User, Settings as SettingsIcon,
    Pause, Shuffle, Repeat, Info, X, Check, Play, SkipBack, SkipForward, Repeat1,
    Music, Disc, Zap, ListPlus, Radio, Share2,
    Maximize2, ChevronUp, ChevronDown, CheckCircle,
    Star, Users, History, Heart, SlidersHorizontal, HardDrive
} from "lucide-react";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { ThemeKey } from "@/components/ui/desktop-player";
import Image from "next/image";

// --- Custom Styles (Crystal Clear Onyx) ---
const CUSTOM_STYLES = `
    ::-webkit-scrollbar {
        width: 4px;
        height: 4px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .glass-panel {
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    }
    .glass-card {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
    }
    .active-nav-item {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.05);
    }
    .mood-capsule {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
    }
    .mood-capsule:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
    }
    .mood-capsule.active {
        background: white;
        color: black;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
    }
    .onyx-bg {
        background: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);
    }
    .shadow-glow {
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
    }
    .shadow-glow-strong {
        box-shadow: 0 0 25px rgba(255, 255, 255, 0.15);
    }
    .text-accent-pink {
        color: #E91E63;
    }
    .bg-accent-pink {
        background-color: #E91E63;
    }
    .floating-player {
        background: rgba(0, 0, 0, 0.60);
    }
    
    @media (max-width: 768px) {
        .glass-panel, .glass-card {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: rgba(20, 20, 20, 0.95) !important; /* Solid fallback */
            box-shadow: none !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
    }
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.10);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    }
    /* --- NEW PREMIUM STYLES (User Request) --- */
    .liquid-glass {
        background: rgba(255, 255, 255, 0.015);
        backdrop-filter: blur(50px);
        -webkit-backdrop-filter: blur(50px);
        border: 0.5px solid rgba(255, 255, 255, 0.15);
        box-shadow: inset 0 0 40px 0 rgba(255, 255, 255, 0.02);
    }
    .album-blur-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        background-size: cover;
        background-position: center;
        filter: blur(100px) brightness(0.5); /* Slightly brighter than 0.3 for visibility */
        transform: scale(1.1);
    }
    .vignette {
        position: fixed;
        inset: 0;
        z-index: 1;
        background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%);
        pointer-events: none;
    }
    .glow-text {
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    }
    .progress-glow {
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
    }
    .mask-fade-edges {
        mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
        -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
    }
`;
interface GlassStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme: (theme: ThemeKey) => void;
    // onSwitchToMobile prop removed
    onOpenSettings: () => void;
    onEditMix: (mix: Mix) => void;
    onOpenSearch: (mixId: string | null) => void;
    onCreateMix: () => void;
    onCinemaMode: () => void;
    onOpenThemeSelector: () => void;
    onSnapshotMix: (mix: Mix) => void;
    onShowQueue: () => void;
    onShareMix: (mix: Mix) => void;
}


const prioritizeTelugu = (items: any[]) => {
    return [...items].sort((a, b) => {
        const strA = (a.title || a.listname || a.name || a.language || "").toLowerCase();
        const strB = (b.title || b.listname || b.name || b.language || "").toLowerCase();
        // Weighted sorting: Explicit "Telugu" language or title gets priority
        const isTelA = strA.includes('telugu');
        const isTelB = strB.includes('telugu');
        if (isTelA && !isTelB) return -1;
        if (!isTelA && isTelB) return 1;
        return 0;
    });
};

export function GlassStage({
    onOpenSearch,
    onOpenThemeSelector,
    onOpenSettings,
    onShowQueue,
    onCreateMix
}: GlassStageProps) {
    // --- Create Playlist Logic ---
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [showStickyHeader, setShowStickyHeader] = useState(false); // Sticky Header State
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);

    const mainContainerRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (currentView.type === 'artist') {
            const scrollTop = e.currentTarget.scrollTop;
            setShowStickyHeader(scrollTop > 400); // Show after hero section
        } else {
            setShowStickyHeader(false);
        }
    };

    const handleCreatePlaylist = () => {
        setNewPlaylistName("");
        setIsPlaylistModalOpen(true);
    };

    const confirmCreatePlaylist = () => {
        if (newPlaylistName.trim()) {
            // Check if we've reached the max 8 tapes limit
            if (mixes.length >= 8) {
                showToast("Maximum 8 playlists! Delete one to create new.");
                setIsPlaylistModalOpen(false);
                return;
            }
            const newMix: Mix = {
                id: `playlist-${Date.now()}`,
                title: newPlaylistName.trim(),
                color: 'blue',
                songs: [],
                currentSongIndex: 0
            };
            const added = addMix(newMix);
            if (added) {
                showToast(`Created playlist "${newPlaylistName.trim()}"`);
                setIsPlaylistModalOpen(false);
                navigateTo({ type: 'queue' });
            } else {
                showToast("Maximum 8 playlists! Delete one to create new.");
                setIsPlaylistModalOpen(false);
            }
        }
    };
    const {
        currentSong, currentTrack, isPlaying, togglePlay, next, prev, seek, volume, setVolume,
        progress, duration, shuffle, setShuffle, repeat, setRepeat, loadMix, mixes, addMix,
        updateMix, deleteMix, activeMixId, play,
        likedSongs, toggleLike, isLiked, recentlyPlayed, eq, isDownloaded,
        downloadSong, removeDownload
    } = usePlayback();

    // --- Navigation State ---
    const [viewStack, setViewStack] = useState<Array<{ type: 'home' | 'playlist' | 'search' | 'nowplaying' | 'library' | 'queue' | 'artist' | 'explore' | 'history' | 'hifi', data?: any }>>([{ type: 'home' }]);
    const currentView = viewStack[viewStack.length - 1];
    const [homeTab, setHomeTab] = useState<'playlist' | 'artists' | 'albums' | 'streams'>('playlist');

    const navigateTo = (view: { type: 'home' | 'playlist' | 'search' | 'nowplaying' | 'library' | 'queue' | 'artist' | 'explore' | 'history' | 'hifi', data?: any }) => {
        setViewStack(prev => [...prev, view]);
    };

    const goBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        }
    };

    // --- Data State ---
    const [charts, setCharts] = useState<any[]>([]);
    const [heroData, setHeroData] = useState<any>(null);
    const [dailyMix, setDailyMix] = useState<any>(null);
    const [tfiPicks, setTfiPicks] = useState<JioSaavnSong[]>([]); // Telugu Specific
    const [playlistDetails, setPlaylistDetails] = useState<JioSaavnSong[]>([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [isHomeLoading, setIsHomeLoading] = useState(true);

    // --- Search State ---
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<JioSaavnSong[]>([]);
    const [groupedResults, setGroupedResults] = useState<PlayableTrack[]>([]);
    const [showAllResults, setShowAllResults] = useState(false);
    const [searchFilter, setSearchFilter] = useState<SearchType>('all');
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- Toast State ---
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // --- Sidebar Filter State ---
    const [sidebarFilter, setSidebarFilter] = useState<'tapes' | 'albums' | 'artists'>('tapes');

    // --- Artist State ---
    const [isArtistLoading, setIsArtistLoading] = useState(false);
    const [artistDetails, setArtistDetails] = useState<any>(null);
    const [artistTab, setArtistTab] = useState<'popular' | 'albums' | 'singles' | 'about'>('popular');
    const [isFollowed, setIsFollowed] = useState(false); // Local state for follow

    // --- Lyrics State ---
    const [lyricsData, setLyricsData] = useState<{ synced: boolean, text: string, lines: { time: number, text: string }[] }>({ synced: false, text: "", lines: [] });
    const [activeLine, setActiveLine] = useState(0);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    // --- Lyrics Effects ---
    useEffect(() => {
        if (currentSong) {
            setLyricsData({ synced: false, text: "Loading lyrics...", lines: [] });
            getSyncedLyrics(currentSong.name, currentSong.primaryArtists?.split(',')[0] || '', currentSong.album?.name || '', currentSong.duration)
                .then(data => {
                    const lines = data.synced ? parseLrc(data.text) : [];
                    setLyricsData({ ...data, lines });
                });
        }
    }, [currentSong]);

    // --- Infinite Autoplay Effect ---
    // --- Infinite Autoplay Effect ---
    // MOVED TO PLAYBACK-CONTEXT.TSX FOR BACKGROUND RELIABILITY
    // The UI should strictly render state, not drive playback logic.

    useEffect(() => {
        if (lyricsData.synced && lyricsData.lines.length > 0) {
            // Find the current line index
            let index = lyricsData.lines.findIndex(line => line.time > progress) - 1;
            if (index < 0) index = 0;
            // Only update if changed to avoid excessive re-renders
            if (index !== activeLine) {
                setActiveLine(index);
                // Scroll to active line
                if (lyricsContainerRef.current) {
                    const lineElement = lyricsContainerRef.current.children[index] as HTMLElement;
                    if (lineElement) {
                        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }
    }, [progress, lyricsData, activeLine]);


    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, song: JioSaavnSong | PlayableTrack | null }>({ visible: false, x: 0, y: 0, song: null });

    // --- Context Menu Handler ---
    useEffect(() => {
        const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, song: JioSaavnSong | PlayableTrack) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, song });
    };

    // --- Library State (likedSongs/recentlyPlayed from shared context) ---
    const [libraryTab, setLibraryTab] = useState<'liked' | 'playlists' | 'albums' | 'artists'>('liked');

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) next();
                    else seek(Math.min(1, progress + 0.05)); // Seek 5%
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) prev();
                    else seek(Math.max(0, progress - 0.05)); // Seek back 5%
                    break;
                case 'KeyM':
                    setVolume(volume > 0 ? 0 : 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, next, prev, seek, progress, volume]);

    // --- Artist Follow Persistence ---
    useEffect(() => {
        if (currentView.type === 'artist' && currentView.data) {
            const followed = JSON.parse(localStorage.getItem('melora-followed-artists') || '[]');
            setIsFollowed(followed.includes(currentView.data.id));
        }
    }, [currentView]);

    const toggleFollowArtist = () => {
        if (!currentView.data) return;
        const followed = JSON.parse(localStorage.getItem('melora-followed-artists') || '[]');
        let newFollowed;
        if (isFollowed) {
            newFollowed = followed.filter((id: string) => id !== currentView.data.id);
            showToast("Unfollowed Artist");
        } else {
            newFollowed = [...followed, currentView.data.id];
            showToast("Following Artist");
        }
        localStorage.setItem('melora-followed-artists', JSON.stringify(newFollowed));
        setIsFollowed(!isFollowed);
    };

    // --- Liked/Recents now from shared context (usePlayback) ---

    // --- Data Fetching (Stitch Layout Logic-Improved) ---
    const loadContent = async () => {
        try {
            // Only set loading if we don't have charts yet
            if (charts.length === 0) setIsHomeLoading(true);

            // 1. Get Generic Charts
            let data: any[] = [];
            try {
                data = await getTopCharts();
            } catch (err) { console.warn(err); }

            // Fallback
            if (!Array.isArray(data) || data.length === 0) {
                try {
                    const trending = await searchSongs("Trending", 1, 10);
                    if (trending && trending.length > 0) {
                        data = [{ title: "Trending Now", listname: "Trending Now", image: trending[0]?.image, link: "", songs: trending, language: "Global" }];
                    }
                } catch (e) {
                    console.error("Fallback failed", e);
                }
            }

            if (Array.isArray(data) && data.length > 0) {
                const sortedCharts = prioritizeTelugu(data);
                setCharts(sortedCharts);

                // Hero: First Telugu Chart or First Item
                const teluguChart = data.find((c: any) => (c.title || c.listname || "").toLowerCase().includes("telugu"));
                setHeroData(teluguChart || sortedCharts[0]);

                // Daily Mix: Second item or fallback
                setDailyMix(sortedCharts.length > 1 ? sortedCharts[1] : sortedCharts[0]);
            } else {
                console.warn("GlassStage: getTopCharts returned empty/invalid data", data);
            }

            // 2. Explicitly Fetch Telugu Hits for "Top Picks"
            const tfiData = await searchSongs("Telugu Hits", 1, 5);
            setTfiPicks(tfiData);
        } catch (e) {
            console.error("GlassStage: loadContent failed", e);
        } finally {
            setIsHomeLoading(false);
        }
    };

    // Initial Load on mount
    useEffect(() => {
        loadContent();
    }, []);

    // Retry if empty on view change
    useEffect(() => {
        if (charts.length === 0 && currentView.type === 'home') {
            loadContent();
        }
    }, [currentView.type]);

    // Load Artist Details when view changes
    useEffect(() => {
        const loadArtist = async () => {
            if (currentView.type === 'artist' && currentView.data) {
                setIsArtistLoading(true);
                setArtistDetails(null);
                setArtistTab('popular');
                setIsFollowed(false); // Reset follow state
                try {
                    const id = currentView.data.id || currentView.data.artistId;

                    if (id && id !== 'undefined' && id !== 'null') {
                        const data = await getArtistDetails(id);

                        // CRITICAL FIX: Explicitly block the known placeholder artist "Andres Israel Zapata"
                        // This appears to be a default fallback from the API or upstream when an ID is invalid/not found.
                        if (data && (data.name === "Andres Israel Zapata" || data.name === "Andres Israel")) {
                            console.warn("[GlassStage] Blocked placeholder artist data:", data.name);
                            // If we have a name from the click (currentView.data.name), keep showing that in the UI
                            // effectively treating this as a failed fetch rather than replacing valid UI with valid-looking junk.
                            setArtistDetails(null);
                        } else {
                            setArtistDetails(data);
                        }
                    } else {
                        console.warn("[GlassStage] Invalid Artist ID:", id);
                    }
                } catch (e) {
                    console.error("Failed to load artist", e);
                } finally {
                    setIsArtistLoading(false);
                }
            }
        };
        loadArtist();
    }, [currentView.type, currentView.data?.id, currentView.data?.artistId]);

    // --- Global Handlers ---

    const handleSongClick = (song: JioSaavnSong | PlayableTrack) => {
        const songId = 'song' in song ? song.song.id : song.id;
        // If clicked song is already playing, just toggle play/pause
        if (currentSong?.id === songId) {
            togglePlay();
            return;
        }

        // Add to history
        // addToHistory(song); 

        // If we are in a playlist/album view, play that context
        // BUT if we are separately clicking a song in search, we might want to just play it + recommendations
        // For now, simple logic: Play song, and ensure mix exists
        const existingMix = mixes.find(m => m.id === activeMixId);
        if (existingMix && existingMix.songs.some(s => ('song' in s ? s.song.id : s.id) === songId)) {
            // Song is in current mix, just jump to it
            updateMix(activeMixId!, { currentSongIndex: existingMix.songs.findIndex(s => ('song' in s ? s.song.id : s.id) === songId) });
            play();
        } else {
            // New Session Mix
            const mixId = `session-${Date.now()}`;
            const newMix: Mix = {
                id: mixId,
                title: "Now Playing",
                color: 'blue',
                songs: [song],
                currentSongIndex: 0
            };

            const added = addMix(newMix);
            if (added) {
                // Short timeout to ensure state update before loading
                setTimeout(() => {
                    loadMix(mixId);
                    // showToast("Playing");
                }, 50);
            } else {
                // Limit reached logic - try to free up space
                const victim = mixes.find(m => !m.id.startsWith('playlist-') && m.id !== activeMixId);
                if (victim) {
                    deleteMix(victim.id);
                    setTimeout(() => {
                        addMix(newMix);
                        setTimeout(() => loadMix(mixId), 50);
                    }, 50);
                } else {
                    showToast("Library full. Please delete a tape.");
                }
            }
        }
    };

    const handleStartRadio = async (song: JioSaavnSong) => {
        showToast(`Starting radio for ${song.name}...`);
        try {
            const station = await getStation(song.id);
            if (station && station.length > 0) {
                const mixId = `radio-${song.id}-${Date.now()}`;
                const newMix: Mix = {
                    id: mixId,
                    title: `${song.name} Radio`,
                    color: 'purple',
                    songs: station,
                    currentSongIndex: 0
                };

                const added = addMix(newMix);
                if (added) {
                    setTimeout(() => loadMix(mixId), 50);
                } else {
                    // Limit fallback
                    const victim = mixes.find(m => !m.id.startsWith('playlist-') && m.id !== activeMixId);
                    if (victim) {
                        deleteMix(victim.id);
                        setTimeout(() => {
                            addMix(newMix);
                            setTimeout(() => loadMix(mixId), 50);
                        }, 50);
                    } else {
                        showToast("Library full. Please delete a tape.");
                    }
                }
            } else {
                showToast("No similar songs found.");
            }
        } catch (e) {
            console.error("Radio failed", e);
            showToast("Failed to start radio.");
        }
    };

    const handleArtistRadio = async (artistId: string, artistName: string) => {
        showToast(`Starting ${artistName} Radio...`);
        try {
            // Use our new Golden Ratio algorithm
            const station = await getArtistStation(artistId);
            if (station && station.length > 0) {
                const mixId = `artist-radio-${artistId}-${Date.now()}`;
                const newMix: Mix = {
                    id: mixId,
                    title: `${artistName} Radio`,
                    color: 'orange',
                    songs: station,
                    currentSongIndex: 0
                };

                const added = addMix(newMix);
                if (added) {
                    setTimeout(() => loadMix(mixId), 50);
                } else {
                    // Limit fallback
                    const victim = mixes.find(m => !m.id.startsWith('playlist-') && m.id !== activeMixId);
                    if (victim) {
                        deleteMix(victim.id);
                        setTimeout(() => {
                            addMix(newMix);
                            setTimeout(() => loadMix(mixId), 50);
                        }, 50);
                    } else {
                        showToast("Library full. Please delete a tape.");
                    }
                }
            } else {
                showToast("Could not generate station.");
            }
        } catch (e) {
            console.error("Artist Radio failed", e);
            showToast("Failed to start radio.");
        }
    };

    // Load Playlist Details when view changes
    useEffect(() => {
        const loadDetails = async () => {
            if (currentView.type === 'playlist' && currentView.data) {
                setIsDetailsLoading(true);
                setPlaylistDetails([]); // Clear prev
                try {
                    const id = currentView.data.listid || currentView.data.id;
                    if (id) {
                        if (currentView.data.type === 'album') {
                            // Iterative Failover: Qobuz -> Tidal -> JioSaavn (ID) -> JioSaavn (Search)
                            const preferredSource = currentView.data.source;
                            let songs: any[] | null = null;

                            // 1. Try Preferred Source (usually Qobuz)
                            if (preferredSource === 'qobuz' || preferredSource === 'tidal') {
                                songs = await getHiFiAlbum(id, preferredSource);
                            }

                            // 2. If Failed (or empty), Try Other HiFi Source
                            if (!songs || songs.length === 0) {
                                const altSource = preferredSource === 'qobuz' ? 'tidal' : 'qobuz';
                                console.warn(`[Failover] ${preferredSource} failed, trying ${altSource}...`);
                                songs = await getHiFiAlbum(id, altSource);
                            }
                            // Note: Passing 'id' blindly to altSource might not work if IDs differ. 
                            // However, in Unified Search we might strictly separate IDs. 
                            // The "One True Match" philosophy implies we SHOULD have the mapped IDs in `qualities`.
                            // But here we only have `id` from the card click. 
                            // Optimization: In real-world, we'd need the specific ID for the alt source.
                            // For now, we skip "blind" alt source check if we don't have the ID, 
                            // and fall straight to JioSaavn which is safer.

                            // Revert step 2 for safety unless we have data:
                            if (!songs || songs.length === 0) {
                                // 3. Try JioSaavn Fallback (ID)
                                if (currentView.data.saavnId) {
                                    console.warn(`[Failover] HiFi failed, trying JioSaavn ID: ${currentView.data.saavnId}`);
                                    songs = await getAlbumDetails(currentView.data.saavnId);
                                }
                            }

                            // 4. Try JioSaavn Fallback (Search) - Last Resort
                            if (!songs || songs.length === 0) {
                                console.warn(`[Failover] All IDs failed, attempting Robust Search Fallback...`);
                                try {
                                    // 1. Clean Query: Remove "Unknown Artist" and extra spaces
                                    let rawTitle = currentView.data.title || '';
                                    let rawSubtitle = currentView.data.subtitle || '';

                                    if (rawSubtitle.includes('Unknown')) rawSubtitle = '';

                                    const query = `${rawTitle} ${rawSubtitle}`.trim();

                                    let recoveredId: string | null = null;

                                    // 2. Try Album Search First (Best Match)
                                    const albumRes = await searchAlbums(query);
                                    if (albumRes && albumRes.length > 0) {
                                        // Fuzzy match title
                                        const match = albumRes.find(a => a.name.toLowerCase().includes(rawTitle.toLowerCase()));
                                        if (match?.id) {
                                            recoveredId = match.id;
                                        } else if (albumRes[0]?.id) {
                                            recoveredId = albumRes[0].id;
                                        }
                                    }

                                    // 3. If No Album Match, Try Song Search (Backdoor)
                                    if (!recoveredId) {
                                        const songRes = await searchSongs(query);
                                        if (songRes && songRes.length > 0) {
                                            const match = songRes.find(s => s.name.toLowerCase().includes(rawTitle.toLowerCase()));
                                            if (match?.album?.id) {
                                                recoveredId = match.album.id;
                                            }
                                        }
                                    }

                                    // 4. Load from Recovered ID
                                    if (recoveredId) {
                                        songs = await getAlbumDetails(recoveredId);
                                    }

                                } catch (e) {
                                    console.error("[Failover] Search failed", e);
                                }
                            }

                            setPlaylistDetails(songs || []);
                        } else {
                            const songs = await getPlaylistDetails(id);
                            setPlaylistDetails(songs);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load playlist details", e);
                } finally {
                    setIsDetailsLoading(false);
                }
            }
        };
        loadDetails();
    }, [currentView]);

    // Unified Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                // Call the Unified Search Engine
                const results = await searchUnified(searchQuery, searchFilter);

                setGroupedResults(results);

                // For backward compatibility / flat list if needed
                // Map PlayableTrack back to basic metadata for searchResults if strictly needed
                // But generally we should use groupedResults (PlayableTrack[]) for display.
                // If searchResults is used elsewhere, we shim it:
                const flatResults = results.map(t => t.song);
                setSearchResults(flatResults);

                setShowAllResults(false);
            } catch (e) {
                console.error("Unified Search Error", e);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [searchQuery, searchFilter]);

    const handlePlayPlaylist = (songs: JioSaavnSong[], title: string, id: string) => {
        if (!songs || songs.length === 0) return;
        const mixId = `playlist - ${id} `;
        const existing = mixes.find(m => m.id === mixId);
        if (existing) {
            loadMix(mixId);
            return;
        }
        const newMix: Mix = {
            id: mixId,
            title: title || "Playlist",
            color: 'purple',
            songs: songs,
            currentSongIndex: 0
        };
        addMix(newMix);
        setTimeout(() => loadMix(mixId), 100);
    };








    const handleAddToQueue = (song: JioSaavnSong) => {
        if (!activeMixId) {
            handleSongClick(song); // Fallback to Play Now if nothing playing
            return;
        }
        const activeMix = mixes.find(m => m.id === activeMixId);
        if (activeMix) {
            // Append to end
            const newSongs = [...activeMix.songs, song];
            updateMix(activeMixId, { songs: newSongs });
            showToast("Added to Queue");
        }
    };

    const handlePlayNext = (song: JioSaavnSong) => {
        if (!activeMixId) {
            handleSongClick(song);
            return;
        }
        const activeMix = mixes.find(m => m.id === activeMixId);
        if (activeMix) {
            // Insert after current index
            const newSongs = [...activeMix.songs];
            newSongs.splice(activeMix.currentSongIndex + 1, 0, song);
            updateMix(activeMixId, { songs: newSongs });
            showToast("Playing Next");
        }
    };

    // --- Animation Variants ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    // --- Explore Categories ---
    const EXPLORE_CATEGORIES = [
        { name: "Trending Now", color: "from-pink-500 to-rose-500", icon: <Zap size={24} /> },
        { name: "New Releases", color: "from-purple-500 to-indigo-500", icon: <Disc size={24} /> },
        { name: "Telugu Hits", color: "from-sky-500 to-blue-500", icon: <Music size={24} /> },
        { name: "Hindi Pop", color: "from-orange-500 to-red-500", icon: <Music size={24} /> },
        { name: "Devotional", color: "from-amber-500 to-orange-500", icon: <Star size={24} /> },
        { name: "Love Songs", color: "from-red-500 to-pink-600", icon: <Heart size={24} /> },
        { name: "Party Mix", color: "from-green-500 to-emerald-600", icon: <ListMusic size={24} /> },
        { name: "90s Retro", color: "from-yellow-500 to-amber-600", icon: <Clock size={24} /> },
        { name: "Folk Beats", color: "from-teal-500 to-cyan-600", icon: <Mic2 size={24} /> },
        { name: "Hip Hop", color: "from-gray-600 to-gray-800", icon: <Mic2 size={24} /> },
        { name: "Rock", color: "from-red-600 to-orange-600", icon: <Zap size={24} /> },
        { name: "EDM", color: "from-violet-500 to-purple-600", icon: <Radio size={24} /> },
        { name: "Classical", color: "from-amber-600 to-yellow-500", icon: <Music size={24} /> },
        { name: "Chill Vibes", color: "from-blue-400 to-cyan-400", icon: <Volume2 size={24} /> },
        { name: "Workout", color: "from-green-600 to-lime-500", icon: <Zap size={24} /> },
        { name: "Sleep", color: "from-indigo-600 to-blue-700", icon: <Clock size={24} /> },
    ];

    const handleCategoryClick = (category: string) => {
        setSearchQuery(category);
    };

    return (
        <div className="relative w-full h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden flex antialiased selection:bg-white selection:text-black">
            <style>{CUSTOM_STYLES}</style>

            {/* === LEFT SIDEBAR === */}
            <aside className="w-64 h-full flex flex-col shrink-0 bg-[#121212] border-r border-white/5">
                {/* Primary Nav */}
                <nav className="p-4 space-y-1">
                    <NavItem icon={<Home size={20} />} label="Home" active={currentView.type === 'home'} onClick={() => navigateTo({ type: 'home' })} />
                    <NavItem icon={<Search size={20} />} label="Search" active={currentView.type === 'search'} onClick={() => { setSearchQuery(""); navigateTo({ type: 'search' }); }} />
                    <NavItem icon={<Compass size={20} />} label="Explore" active={currentView.type === 'explore'} onClick={() => navigateTo({ type: 'explore' })} />
                </nav>

                {/* Library Section */}
                <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <Library size={20} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-300">Your Library</span>
                        </div>
                        <button onClick={handleCreatePlaylist} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Library Filters */}
                    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
                        {['Playlists', 'Albums', 'Artists'].map(f => (
                            <button
                                key={f}
                                onClick={() => setSidebarFilter(f.toLowerCase() === 'playlists' ? 'tapes' : f.toLowerCase() as any)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${sidebarFilter === (f.toLowerCase() === 'playlists' ? 'tapes' : f.toLowerCase()) ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Library Items */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                        {/* Liked Songs */}
                        <LibraryCard
                            image={likedSongs[0]?.image}
                            title="Liked Songs"
                            subtitle={`Playlist • ${likedSongs.length} songs`}
                            gradient="from-purple-600 to-blue-500"
                            icon={<Heart size={18} className="text-white" fill="white" />}
                            onClick={() => navigateTo({ type: 'library' })}
                        />

                        {/* User Mixes/Tapes */}
                        {mixes.filter(m => m.id.startsWith('playlist-')).map(mix => (
                            <LibraryCard
                                key={mix.id}
                                image={mix.songs[0] ? ('song' in mix.songs[0] ? mix.songs[0].song.image : mix.songs[0].image) : undefined}
                                title={mix.title}
                                subtitle={`Playlist • ${mix.songs.length} songs`}
                                onClick={() => {
                                    loadMix(mix.id);
                                    navigateTo({ type: 'queue' });
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* New Playlist Button */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleCreatePlaylist}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all font-medium text-sm"
                    >
                        <Plus size={18} />
                        New playlist
                    </button>
                </div>
            </aside>

            {/* === CENTER STAGE === */}
            <main ref={mainContainerRef} onScroll={handleScroll} className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] relative">
                {/* Top Bar with Search */}
                <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by artists, songs or albums"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => navigateTo({ type: 'search' })}
                                className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                        <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <Mic2 size={18} />
                        </button>
                        <button onClick={onOpenSettings} className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {/* User Avatar or Initials */}
                            JV
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-6">
                    <AnimatePresence mode="wait">
                        {/* === HOME VIEW === */}
                        {currentView.type === 'home' && (
                            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                                {/* Mood Pills */}
                                <div className="flex gap-2 flex-wrap">
                                    {['Energize', 'Feel good', 'Relax', 'Workout', 'Sad', 'Party', 'Focus', 'Romance', 'Sleep'].map((mood, i) => (
                                        <button
                                            key={mood}
                                            onClick={() => { setSearchQuery(mood); navigateTo({ type: 'search' }); }}
                                            className={`mood-capsule px-4 py-2 rounded-full text-sm font-medium ${i === 0 ? 'active' : ''}`}
                                        >
                                            {mood}
                                        </button>
                                    ))}
                                </div>

                                {/* Hero Section - 2 Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Playlist of the Day */}
                                    {dailyMix && (
                                        <div
                                            className="glass-card rounded-3xl p-6 relative overflow-hidden cursor-pointer group aspect-[16/10]"
                                            onClick={() => navigateTo({ type: 'playlist', data: dailyMix })}
                                        >
                                            <div className="absolute inset-0">
                                                <Image
                                                    src={(Array.isArray(dailyMix.image) ? (dailyMix.image[2]?.link || dailyMix.image[0]?.link) : dailyMix.image) || ""}
                                                    alt=""
                                                    fill
                                                    className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                                            </div>
                                            <div className="relative z-10 h-full flex flex-col justify-between">
                                                <p className="text-xs text-gray-400">{dailyMix.songs?.length || 0} songs • {Math.round((dailyMix.songs?.length || 0) * 3.5)} minutes</p>
                                                <div>
                                                    <h2 className="text-2xl font-bold text-white mb-1">{dailyMix.title || dailyMix.listname || "Playlist of the day"}</h2>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Featured Album */}
                                    {heroData && (
                                        <div
                                            className="glass-card rounded-3xl p-6 relative overflow-hidden cursor-pointer group aspect-[16/10]"
                                            onClick={() => navigateTo({ type: 'playlist', data: { ...heroData, type: 'album' } })}
                                        >
                                            <span className="absolute top-4 left-4 px-2 py-1 rounded-full bg-pink-500/80 text-white text-[10px] font-bold uppercase tracking-wider z-20">Featured</span>
                                            <div className="absolute inset-0">
                                                <Image
                                                    src={(Array.isArray(heroData.image) ? (heroData.image[2]?.link || heroData.image[0]?.link) : heroData.image) || ""}
                                                    alt=""
                                                    fill
                                                    className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                                            </div>
                                            <div className="relative z-10 h-full flex flex-col justify-end">
                                                <p className="text-xs text-gray-400 mb-1">{heroData.subtitle || heroData.perma_url?.split('/')[3]}</p>
                                                <h2 className="text-3xl font-bold text-white">{heroData.title || heroData.listname}</h2>
                                                {/* Play Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(heroData.songs || [], heroData.title || heroData.listname, heroData.listid || heroData.id); }}
                                                    className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all shadow-lg group-hover:scale-110"
                                                >
                                                    <Play size={24} fill="currentColor" className="ml-1" />
                                                </button>
                                            </div>
                                            {/* Mini Progress (if currently playing from this) */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                                <div className="h-full bg-white/50 rounded-r-full" style={{ width: '0%' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tab Filters */}
                                <div className="flex items-center gap-6 border-b border-white/10 pb-2">
                                    {(['playlist', 'artists', 'albums', 'streams'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setHomeTab(tab)}
                                            className={`pb-2 text-sm font-medium capitalize transition-colors ${homeTab === tab ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                    <button className="ml-auto p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                        <Heart size={18} />
                                    </button>
                                </div>

                                {/* Song List */}
                                <div className="space-y-1">
                                    {(charts[0]?.songs || tfiPicks || []).slice(0, 10).map((song: JioSaavnSong, i: number) => (
                                        <SongRow
                                            key={song.id}
                                            song={song}
                                            index={i + 1}
                                            isPlaying={currentSong?.id === song.id && isPlaying}
                                            isLiked={isLiked(song.id)}
                                            onPlay={() => handleSongClick(song)}
                                            onLike={() => toggleLike(song)}
                                            onContextMenu={(e) => handleContextMenu(e, song)}
                                            isOffline={isDownloaded(song.id)}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* === SEARCH VIEW === */}
                        {currentView.type === 'search' && (
                            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <SearchFilters value={searchFilter} onChange={setSearchFilter} />

                                {isSearching ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : searchQuery ? (
                                    <div className="space-y-2">
                                        {groupedResults.slice(0, showAllResults ? undefined : 10).map((track, i) => {
                                            // Derive Quality Badge
                                            let badge = undefined;
                                            if (track.sources.some(s => s.quality === 'hires')) badge = '24-BIT';
                                            else if (track.sources.some(s => s.quality === 'flac')) badge = 'FLAC';
                                            else if (track.sources.some(s => s.quality === '320')) badge = '320';

                                            return (
                                                <SongRow
                                                    key={track.id}
                                                    song={track}
                                                    index={i + 1}
                                                    isPlaying={currentSong?.id === track.id && isPlaying}
                                                    isLiked={isLiked(track.id)}
                                                    quality={badge}
                                                    onPlay={() => handleSongClick(track)}
                                                    onLike={() => toggleLike(track.song)}
                                                    onContextMenu={(e) => handleContextMenu(e, track.song)}
                                                    isOffline={isDownloaded(track.id)}
                                                />
                                            );
                                        })}
                                        {groupedResults.length > 10 && !showAllResults && (
                                            <button onClick={() => setShowAllResults(true)} className="w-full py-3 text-center text-sm text-gray-400 hover:text-white transition-colors">
                                                Show all {groupedResults.length} results
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        <Search size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Search for songs, artists, or albums</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* === EXPLORE VIEW === */}
                        {currentView.type === 'explore' && (
                            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <h2 className="text-2xl font-bold">Browse All</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {EXPLORE_CATEGORIES.map(cat => (
                                        <div
                                            key={cat.name}
                                            onClick={() => handleCategoryClick(cat.name)}
                                            className={`glass-card rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${cat.color} overflow-hidden relative group`}
                                        >
                                            <span className="text-lg font-bold text-white relative z-10">{cat.name}</span>
                                            <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-50 transition-opacity">{cat.icon}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* === LIBRARY VIEW === */}
                        {currentView.type === 'library' && (
                            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={goBack} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h1 className="text-3xl font-bold">Liked Songs</h1>
                                </div>
                                <p className="text-gray-400">{likedSongs.length} songs</p>
                                <div className="space-y-1">
                                    {likedSongs.map((song, i) => (
                                        <SongRow
                                            key={song.id}
                                            song={song}
                                            index={i + 1}
                                            isPlaying={currentSong?.id === song.id && isPlaying}
                                            isLiked={true}
                                            onPlay={() => handleSongClick(song)}
                                            onLike={() => toggleLike(song)}
                                            onContextMenu={(e) => handleContextMenu(e, song)}
                                            isOffline={isDownloaded(song.id)}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* === QUEUE VIEW === */}
                        {currentView.type === 'queue' && (
                            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={goBack} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h1 className="text-3xl font-bold">Queue</h1>
                                </div>
                                {activeMixId && mixes.find(m => m.id === activeMixId) ? (
                                    <div className="space-y-1">
                                        {mixes.find(m => m.id === activeMixId)!.songs.map((song, i) => (
                                            <SongRow
                                                key={`${song.id}-${i}`}
                                                song={song}
                                                index={i + 1}
                                                isPlaying={currentSong?.id === song.id && isPlaying}
                                                isLiked={isLiked(song.id)}
                                                onPlay={() => {
                                                    updateMix(activeMixId, { currentSongIndex: i });
                                                    play();
                                                }}
                                                onLike={() => toggleLike(song)}
                                                onContextMenu={(e) => handleContextMenu(e, song)}
                                                isOffline={isDownloaded(song.id)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Your queue is empty</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* === PLAYLIST/ALBUM VIEW === */}
                        {currentView.type === 'playlist' && currentView.data && (
                            <motion.div key="playlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={goBack} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                </div>
                                {/* Playlist Header */}
                                <div className="flex gap-6">
                                    <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl shrink-0 relative">
                                        <Image
                                            src={(Array.isArray(currentView.data.image) ? (currentView.data.image[2]?.link || currentView.data.image[0]?.link) : currentView.data.image) || ""}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{currentView.data.type === 'album' ? 'Album' : 'Playlist'}</p>
                                        <h1 className="text-4xl font-bold mb-2">{currentView.data.title || currentView.data.listname || currentView.data.name}</h1>
                                        <p className="text-gray-400">{currentView.data.subtitle || currentView.data.more_info?.artistMap?.artists?.[0]?.name}</p>
                                        <div className="flex items-center gap-4 mt-4">
                                            <button
                                                onClick={() => handlePlayPlaylist(playlistDetails, currentView.data.title || currentView.data.listname, currentView.data.listid || currentView.data.id)}
                                                className="px-8 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                            >
                                                <Play size={20} fill="currentColor" />
                                                Play
                                            </button>
                                            <button className="p-3 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                                                <Heart size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Tracks */}
                                {isDetailsLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {playlistDetails.map((song, i) => (
                                            <SongRow
                                                key={song.id}
                                                song={song}
                                                index={i + 1}
                                                isPlaying={currentSong?.id === song.id && isPlaying}
                                                isLiked={isLiked(song.id)}
                                                onPlay={() => handleSongClick(song)}
                                                onLike={() => toggleLike(song)}
                                                onContextMenu={(e) => handleContextMenu(e, song)}
                                                isOffline={isDownloaded(song.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* === ARTIST VIEW === */}
                        {currentView.type === 'artist' && (
                            <ArtistView
                                artist={currentView.data}
                                details={artistDetails}
                                isLoading={isArtistLoading}
                                isFollowed={isFollowed}
                                onToggleFollow={toggleFollowArtist}
                                onPlaySong={handleSongClick}
                                onPlayAll={() => artistDetails?.topSongs?.[0] && handleSongClick(artistDetails.topSongs[0])}
                                onStartRadio={() => artistDetails && handleArtistRadio(artistDetails.artistId, artistDetails.name)}
                                onShare={() => navigator.clipboard.writeText(`${window.location.origin}?artist=${currentView.data?.id}`)}
                            />
                        )}

                        {/* === NOW PLAYING VIEW === */}
                        {currentView.type === 'nowplaying' && currentSong && (
                            <motion.div key="nowplaying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black">
                                {/* Background Blur */}
                                <div className="album-blur-bg" style={{ backgroundImage: `url(${(Array.isArray(currentSong.image) ? (currentSong.image[2]?.link || currentSong.image[0]?.link) : currentSong.image) || ""})` }}></div>
                                <div className="vignette"></div>

                                {/* Header */}
                                <header className="relative z-10 flex items-center justify-between p-6">
                                    <button onClick={goBack} className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors">
                                        <ChevronDown size={24} />
                                    </button>
                                    <span className="text-xs text-gray-400 uppercase tracking-widest">Now Playing</span>
                                    <button className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors">
                                        <MoreHorizontal size={24} />
                                    </button>
                                </header>

                                {/* Main Content */}
                                <div className="relative z-10 flex-1 flex items-center justify-center gap-12 px-16">
                                    {/* Album Art */}
                                    <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl shrink-0">
                                        <Image
                                            src={(Array.isArray(currentSong.image) ? (currentSong.image[2]?.link || currentSong.image[0]?.link) : currentSong.image) || ""}
                                            alt=""
                                            width={320}
                                            height={320}
                                            className="object-cover w-full h-full"
                                            unoptimized
                                        />
                                    </div>

                                    {/* Song Info & Controls */}
                                    <div className="flex-1 max-w-lg">
                                        <h1 className="text-4xl font-bold mb-2 glow-text">{decodeHtml(currentSong.name)}</h1>
                                        <p className="text-xl text-gray-400 mb-8">{decodeHtml(currentSong.primaryArtists)}</p>

                                        {/* Progress */}
                                        <div className="mb-6">
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - rect.left) / rect.width) * duration); }}>
                                                <div className="h-full bg-white rounded-full progress-glow" style={{ width: `${progress * 100}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                                <span>{formatTime(progress * duration)}</span>
                                                <span>{formatTime(duration)}</span>
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        <div className="flex items-center justify-center gap-8">
                                            <button onClick={() => setShuffle(!shuffle)} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-accent-pink' : 'text-gray-500 hover:text-white'}`}>
                                                <Shuffle size={20} />
                                            </button>
                                            <button onClick={() => prev()} className="p-2 rounded-full text-white hover:scale-110 transition-transform">
                                                <SkipBack size={28} fill="currentColor" />
                                            </button>
                                            <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
                                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                                            </button>
                                            <button onClick={() => next()} className="p-2 rounded-full text-white hover:scale-110 transition-transform">
                                                <SkipForward size={28} fill="currentColor" />
                                            </button>
                                            <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-accent-pink' : 'text-gray-500 hover:text-white'}`}>
                                                {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lyrics Panel */}
                                    {showLyrics && (
                                        <div className="w-96 h-[60vh] liquid-glass rounded-3xl p-6 flex flex-col overflow-hidden">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Lyrics</h3>
                                            <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto space-y-4 mask-fade-edges scrollbar-hide">
                                                {lyricsData.synced ? (
                                                    lyricsData.lines.map((line, i) => (
                                                        <p
                                                            key={i}
                                                            onClick={() => seek(line.time)}
                                                            className={`text-lg font-medium transition-all cursor-pointer ${i === activeLine ? 'text-white scale-105 glow-text' : 'text-white/30 hover:text-white/50'}`}
                                                        >
                                                            {line.text}
                                                        </p>
                                                    ))
                                                ) : (
                                                    <p className="text-white/50 whitespace-pre-wrap">{lyricsData.text || "No lyrics available"}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Bar */}
                                <footer className="relative z-10 flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <Volume2 size={18} className="text-gray-400" />
                                        <div className="w-24 h-1 bg-white/10 rounded-full cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - rect.left) / rect.width); }}>
                                            <div className="h-full bg-white/50 rounded-full" style={{ width: `${volume * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowLyrics(!showLyrics)} className={`p-2 rounded-full transition-colors ${showLyrics ? 'text-accent-pink' : 'text-gray-500 hover:text-white'}`}>
                                        <Mic2 size={20} />
                                    </button>
                                </footer>
                            </motion.div>
                        )}

                        {/* === HISTORY VIEW === */}
                        {currentView.type === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={goBack} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <History size={28} />
                                    <h1 className="text-3xl font-bold">Listening History</h1>
                                </div>
                                <div className="space-y-1">
                                    {recentlyPlayed.map((song, i) => (
                                        <SongRow
                                            key={`${song.id}-${i}`}
                                            song={song}
                                            index={i + 1}
                                            isPlaying={currentSong?.id === song.id && isPlaying}
                                            isLiked={isLiked(song.id)}
                                            onPlay={() => handleSongClick(song)}
                                            onLike={() => toggleLike(song)}
                                            onContextMenu={(e) => handleContextMenu(e, song)}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* === RIGHT PANEL === */}
            <aside className="w-80 h-full flex flex-col shrink-0 bg-[#121212] border-l border-white/5 p-4 overflow-hidden">
                {/* Recent Played */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-300">Recent Played</h3>
                    <button onClick={() => navigateTo({ type: 'history' })} className="text-xs text-gray-500 hover:text-white transition-colors">See All</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {recentlyPlayed.slice(0, 8).map((song, i) => (
                        <div
                            key={`${song.id}-${i}`}
                            onClick={() => handleSongClick(song)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                                <Image
                                    src={(Array.isArray(song.image) ? (song.image[1]?.link || song.image[0]?.link) : song.image) || ""}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{decodeHtml(song.name)}</p>
                                <p className="text-xs text-gray-500 truncate">{decodeHtml(song.primaryArtists)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleLike(song); }} className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? 'text-accent-pink' : 'text-gray-500 hover:text-white'}`}>
                                <Heart size={16} fill={isLiked(song.id) ? "currentColor" : "none"} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Promo Card */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-700 relative overflow-hidden">
                    <button className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                        <Music size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Listen music offline</span>
                    </div>
                    <p className="text-xs text-white/70 mb-3">Experience listening to music offline with the best quality.</p>
                    <button className="w-full py-2.5 rounded-full bg-white text-black font-bold text-sm hover:scale-[1.02] transition-transform">
                        Upgrade Now
                    </button>
                </div>
            </aside>

            {/* === FLOATING PLAYER === */}
            {currentView.type !== 'nowplaying' && currentSong && (
                <footer className="fixed bottom-0 left-0 right-0 h-20 flex items-center justify-between px-6 bg-[#181818] border-t border-white/10 z-50">
                    {/* Track Info */}
                    <div className="flex items-center gap-4 w-[30%] min-w-0" onClick={() => navigateTo({ type: 'nowplaying' })}>
                        <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg relative shrink-0 cursor-pointer">
                            <Image
                                src={(Array.isArray(currentSong.image) ? (currentSong.image[1]?.link || currentSong.image[0]?.link) : currentSong.image) || ""}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="min-w-0 cursor-pointer">
                            <p className="text-sm font-medium text-white truncate">{decodeHtml(currentSong.name)}</p>
                            <p className="text-xs text-gray-400 truncate">{decodeHtml(currentSong.primaryArtists)}</p>
                        </div>
                        <button className={`ml-2 ${isLiked(currentSong.id) ? 'text-green-500' : 'text-gray-500 hover:text-white'}`} onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack || currentSong); }}>
                            <CheckCircle size={20} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
                        </button>
                        {isDownloaded(currentTrack?.id || currentSong.id) && (
                            <span className="ml-2 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">OFFLINE</span>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-center gap-1 w-[40%]">
                        <div className="flex items-center gap-5">
                            <button onClick={() => prev()} className="text-gray-400 hover:text-white transition-colors">
                                <SkipBack size={20} fill="currentColor" />
                            </button>
                            <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button onClick={() => next()} className="text-gray-400 hover:text-white transition-colors">
                                <SkipForward size={20} fill="currentColor" />
                            </button>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full max-w-md flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatTime(progress * duration)}</span>
                            <div className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - rect.left) / rect.width) * duration); }}>
                                <div className="h-full bg-white group-hover:bg-green-500 rounded-full relative" style={{ width: `${progress * 100}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Right Tools */}
                    <div className="flex items-center gap-3 w-[30%] justify-end">
                        <button onClick={() => setShowLyrics(prev => !prev)} className={`transition-colors ${showLyrics ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                            <Mic2 size={18} />
                        </button>
                        <button onClick={() => setShowEq(prev => !prev)} className={`transition-colors ${showEq ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                            <SlidersHorizontal size={18} />
                        </button>
                        <button onClick={() => navigateTo({ type: 'queue' })} className="text-gray-500 hover:text-white transition-colors">
                            <ListMusic size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Volume2 size={18} className="text-gray-500" />
                            <div className="w-24 h-1 bg-white/10 rounded-full cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - rect.left) / rect.width); }}>
                                <div className="h-full bg-white/50 rounded-full" style={{ width: `${volume * 100}%` }}></div>
                            </div>
                        </div>
                        <button onClick={() => navigateTo({ type: 'nowplaying' })} className="text-gray-500 hover:text-white transition-colors">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </footer>
            )}

            {/* === MODALS & OVERLAYS === */}
            {/* Toast */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full shadow-2xl z-[10000] flex items-center gap-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlays */}
            <AnimatePresence>
                {showLyrics && (
                    <LyricsView
                        currentSong={currentSong}
                        currentTime={progress * duration}
                        onClose={() => setShowLyrics(false)}
                    />
                )}
                {showEq && (
                    <EqualizerView
                        onClose={() => setShowEq(false)}
                        bands={eq.bands}
                        setBand={eq.setBand}
                        isEnabled={eq.isEnabled}
                        setIsEnabled={eq.setIsEnabled}
                        currentPreset={eq.currentPreset}
                        setPreset={eq.setPreset}
                        presets={eq.presets}
                    />
                )}
            </AnimatePresence>

            {/* Context Menu */}
            <TrackContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                song={contextMenu.song ? ('song' in contextMenu.song ? contextMenu.song.song : contextMenu.song) : null}
                onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                onPlay={(songArg) => {
                    // Use scope song which might be PlayableTrack
                    const song = contextMenu.song!;
                    // handleSongClick handles both types
                    handleSongClick(song);
                }}
                onAddToQueue={(songArg) => {
                    const song = contextMenu.song!;
                    if (activeMixId) {
                        updateMix(activeMixId, { songs: [...mixes.find(m => m.id === activeMixId)!.songs, song] });
                        const name = 'song' in song ? song.song.name : song.name;
                        showToast(`Added "${decodeHtml(name)}" to queue`);
                    }
                }}
                onGoToArtist={(artistId) => { navigateTo({ type: 'artist', data: { id: artistId } }); }}
                onGoToAlbum={(albumId) => {
                    const s = contextMenu.song ? ('song' in contextMenu.song ? contextMenu.song.song : contextMenu.song) : null;
                    if (s?.album) navigateTo({ type: 'playlist', data: { ...s.album, type: 'album', image: s.image } });
                }}
                onStartRadio={(songArg) => contextMenu.song && handleStartRadio('song' in contextMenu.song ? contextMenu.song.song : contextMenu.song)}
                isDownloaded={contextMenu.song ? isDownloaded(('song' in contextMenu.song ? contextMenu.song.song.id : contextMenu.song.id)) : false}
                onDownload={() => contextMenu.song && downloadSong(contextMenu.song)}
                onRemoveDownload={() => contextMenu.song && removeDownload('song' in contextMenu.song ? contextMenu.song.song.id : contextMenu.song.id)}
            />

            {/* Create Playlist Modal */}
            <AnimatePresence>
                {isPlaylistModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#282828] border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">Create a new playlist</h3>
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && confirmCreatePlaylist()}
                                placeholder="Playlist name"
                                className="w-full bg-[#3e3e3e] border border-white/10 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-white/30"
                                autoFocus
                            />
                            <div className="flex gap-4">
                                <button onClick={() => setIsPlaylistModalOpen(false)} className="flex-1 py-3 rounded-full bg-transparent border border-white/20 text-white hover:bg-white/10 transition-colors font-medium">
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmCreatePlaylist}
                                    disabled={!newPlaylistName.trim()}
                                    className="flex-1 py-3 rounded-full bg-white text-black hover:scale-[1.02] transition-transform font-bold disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// === HELPER COMPONENTS ===

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left ${active ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
            <div className={active ? 'text-white' : ''}>{icon}</div>
            <span className="text-sm">{label}</span>
        </button>
    );
}

function LibraryCard({ image, title, subtitle, gradient, icon, onClick }: { image?: any; title: string; subtitle: string; gradient?: string; icon?: React.ReactNode; onClick?: () => void }) {
    return (
        <div onClick={onClick} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
            <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-[#282828]'}`}>
                {image ? (
                    <Image src={(Array.isArray(image) ? (image[1]?.link || image[0]?.link) : image) || ""} alt="" fill className="object-cover" unoptimized />
                ) : (
                    icon || <Music size={20} className="text-gray-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{title}</p>
                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            </div>
        </div>
    );
}

function SongRow({ song, index, isPlaying, isLiked, quality, onPlay, onLike, onContextMenu, isOffline }: {
    song: JioSaavnSong | PlayableTrack;
    index: number;
    isPlaying?: boolean;
    isLiked?: boolean;
    quality?: string;
    onPlay: () => void;
    onLike: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    isOffline?: boolean;
}) {
    const displaySong = 'song' in song ? song.song : song;

    // Auto-derive quality if not explicitly provided
    let displayQuality = quality;
    if (!displayQuality && isPlayableTrack(song)) {
        if (song.sources.some(s => s.quality === 'hires')) displayQuality = '24-BIT';
        else if (song.sources.some(s => s.quality === 'flac')) displayQuality = 'FLAC';
        else if (song.sources.some(s => s.quality === '320')) displayQuality = '320';
    }

    return (
        <div
            onClick={onPlay}
            onContextMenu={onContextMenu}
            className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${isPlaying ? 'bg-white/5' : ''}`}
        >
            {/* Index / Play Icon */}
            <div className="w-6 text-center">
                <span className={`text-sm ${isPlaying ? 'text-green-500' : 'text-gray-500'} group-hover:hidden`}>{index}</span>
                <Play size={14} fill="currentColor" className="text-white hidden group-hover:block mx-auto" />
            </div>

            {/* Cover */}
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 relative">
                <Image
                    src={(Array.isArray(displaySong.image) ? (displaySong.image[1]?.link || displaySong.image[0]?.link) : displaySong.image) || ""}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isPlaying ? 'text-green-500' : 'text-white'}`}>{decodeHtml(displaySong.name)}</p>
                    {isOffline && (
                        <div title="Downloaded" className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold border border-green-500/30">
                            <HardDrive size={8} />
                            <span>OFFLINE</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 truncate">{decodeHtml(displaySong.primaryArtists)}</p>
            </div>

            {/* Quality Badge */}
            {displayQuality && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${displayQuality.includes('24') || displayQuality.includes('hires') ? 'bg-amber-500/20 text-amber-400' : displayQuality.includes('FLAC') || displayQuality.includes('flac') ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-400'}`}>
                    {displayQuality.replace('kbps', '')}
                </span>
            )}

            {/* Duration */}
            <span className="text-xs text-gray-500 w-12 text-right">{formatTime(displaySong.duration)}</span>

            {/* Like */}
            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isLiked ? 'text-accent-pink opacity-100' : 'text-gray-500 hover:text-white'}`}>
                <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>

            {/* More */}
            <button onClick={(e) => { e.stopPropagation(); onContextMenu(e); }} className="p-1.5 rounded-full text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal size={16} />
            </button>
        </div>
    );
}

function formatTime(seconds: number) {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

