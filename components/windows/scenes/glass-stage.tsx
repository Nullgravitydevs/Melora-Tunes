"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong, getTopCharts, getPlaylistDetails, searchSongs, getArtistDetails, getSyncedLyrics } from "@/lib/jiosaavn";
import { decodeHtml, parseLrc } from "@/lib/utils";
import {
    Home, Search, Compass, Library, Plus, Heart, MoreVertical,
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
    Volume2, ListMusic, Mic2, Maximize2, X, ChevronUp, ChevronDown, CheckCircle,
    Disc, Grid, Clock, Music, ArrowLeft, Zap, Star, Share2, Users, History, Settings as SettingsIcon
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import Image from "next/image";

// --- Custom Styles (Liquid Glass & No Scrollbars) ---
const CUSTOM_STYLES = `
    ::-webkit-scrollbar {
        width: 0px;
        background: transparent;
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .glass-panel {
        background: rgba(255, 255, 255, 0.01);
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 0 40px 0 rgba(255, 255, 255, 0.02);
    }
    .glass-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 0 25px rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
    }
    .active-nav-item {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.05);
    }
    .mood-capsule {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
    }
    .mood-capsule:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.25);
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
`;

interface GlassStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme: (theme: ThemeKey) => void;
    onSwitchToMobile?: () => void;
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

    const handleCreatePlaylist = () => {
        setNewPlaylistName("");
        setIsPlaylistModalOpen(true);
    };

    const confirmCreatePlaylist = () => {
        if (newPlaylistName.trim()) {
            const newMix: Mix = {
                id: `playlist-${Date.now()}`,
                title: newPlaylistName.trim(),
                color: 'blue',
                songs: [],
                currentSongIndex: 0
            };
            addMix(newMix);
            showToast(`Created playlist "${newPlaylistName.trim()}"`);
            setIsPlaylistModalOpen(false);
            navigateTo({ type: 'queue' }); // Or maybe just stay? But queue shows up next.
        }
    };
    const {
        currentSong, isPlaying, togglePlay, next, prev, seek, volume, setVolume,
        progress, duration, shuffle, setShuffle, repeat, setRepeat, loadMix, mixes, addMix
    } = usePlayback();

    // --- Navigation State ---
    const [viewStack, setViewStack] = useState<Array<{ type: 'home' | 'playlist' | 'search' | 'nowplaying' | 'library' | 'queue' | 'artist' | 'explore', data?: any }>>([{ type: 'home' }]);
    const currentView = viewStack[viewStack.length - 1];

    const navigateTo = (view: { type: 'home' | 'playlist' | 'search' | 'nowplaying' | 'library' | 'queue' | 'artist' | 'explore', data?: any }) => {
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
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- Toast State ---
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

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
            getSyncedLyrics(currentSong.name, currentSong.primaryArtists.split(',')[0], currentSong.album.name, currentSong.duration)
                .then(data => {
                    const lines = data.synced ? parseLrc(data.text) : [];
                    setLyricsData({ ...data, lines });
                });
        }
    }, [currentSong]);

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


    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, song: JioSaavnSong | null }>({ visible: false, x: 0, y: 0, song: null });

    // --- Context Menu Handler ---
    useEffect(() => {
        const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, song: JioSaavnSong) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, song });
    };

    // --- Library State ---
    const [libraryTab, setLibraryTab] = useState<'liked' | 'playlists' | 'albums' | 'artists'>('liked');
    const [likedSongs, setLikedSongs] = useState<JioSaavnSong[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<JioSaavnSong[]>([]);

    // --- Load liked songs from localStorage ---
    useEffect(() => {
        const saved = localStorage.getItem('melora-liked-songs');
        if (saved) setLikedSongs(JSON.parse(saved));
        const recent = localStorage.getItem('melora-recently-played');
        if (recent) setRecentlyPlayed(JSON.parse(recent));
    }, []);

    // --- Liked Songs Functions ---
    const toggleLike = (song: JioSaavnSong) => {
        setLikedSongs(prev => {
            const exists = prev.some(s => s.id === song.id);
            const updated = exists ? prev.filter(s => s.id !== song.id) : [song, ...prev];
            localStorage.setItem('melora-liked-songs', JSON.stringify(updated));
            return updated;
        });
    };
    const isLiked = (id: string) => likedSongs.some(s => s.id === id);

    // --- Track Recently Played ---
    useEffect(() => {
        if (currentSong) {
            setRecentlyPlayed(prev => {
                const filtered = prev.filter(s => s.id !== currentSong.id);
                const updated = [currentSong, ...filtered].slice(0, 20);
                localStorage.setItem('melora-recently-played', JSON.stringify(updated));
                return updated;
            });
        }
    }, [currentSong?.id]);

    // --- Data Fetching (Stitch Layout Logic - Improved) ---
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
                    if (id) {
                        const data = await getArtistDetails(id);
                        setArtistDetails(data);
                    }
                } catch (e) {
                    console.error("Failed to load artist", e);
                } finally {
                    setIsArtistLoading(false);
                }
            }
        };
        loadArtist();
    }, [currentView]);

    // Load Playlist Details when view changes
    useEffect(() => {
        const loadDetails = async () => {
            if (currentView.type === 'playlist' && currentView.data) {
                setIsDetailsLoading(true);
                setPlaylistDetails([]); // Clear prev
                try {
                    const id = currentView.data.listid || currentView.data.id;
                    if (id) {
                        const songs = await getPlaylistDetails(id);
                        setPlaylistDetails(songs);
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

    // Real-Time Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const results = await searchSongs(searchQuery);
                // Sort results: Telugu First
                const sortedResults = prioritizeTelugu(results);
                setSearchResults(sortedResults);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [searchQuery]);

    const handlePlayPlaylist = (songs: JioSaavnSong[], title: string, id: string) => {
        if (!songs || songs.length === 0) return;
        const mixId = `playlist-${id}`;
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

    const handleSongClick = (song: JioSaavnSong) => {
        const mixId = `song-${song.id}`;
        const newMix: Mix = {
            id: mixId,
            title: decodeHtml(song.name),
            color: 'blue',
            songs: [song],
            currentSongIndex: 0
        };
        addMix(newMix);
        setTimeout(() => loadMix(mixId), 50);
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
        { name: "Devotional", color: "from-amber-500 to-orange-500", icon: <Star size={24} /> },
        { name: "Love Songs", color: "from-red-500 to-pink-600", icon: <Heart size={24} /> },
        { name: "Party Mix", color: "from-green-500 to-emerald-600", icon: <ListMusic size={24} /> },
        { name: "90s Retro", color: "from-yellow-500 to-amber-600", icon: <Clock size={24} /> },
        { name: "Folk Beats", color: "from-teal-500 to-cyan-600", icon: <Mic2 size={24} /> },
    ];

    const handleCategoryClick = (category: string) => {
        setSearchQuery(category);
    };

    return (
        <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden flex flex-col antialiased selection:bg-white selection:text-black">
            <style>{CUSTOM_STYLES}</style>

            {/* Main Layout Container - Strict Overflow */}
            <div className="flex-1 flex overflow-hidden p-3 gap-3 relative z-10 box-border min-h-0">

                {/* LEFT SIDEBAR (Static) */}
                <aside className="w-60 flex flex-col gap-3 hidden md:flex shrink-0 z-20 h-full">
                    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
                        <nav className="flex flex-col gap-1">
                            <NavItem
                                icon={<Home size={20} />}
                                label="Home"
                                active={currentView.type === 'home'}
                                onClick={() => setViewStack([{ type: 'home' }])}
                            />
                            <NavItem
                                icon={<Compass size={20} />}
                                label="Explore"
                                active={currentView.type === 'explore' || currentView.type === 'search'}
                                onClick={() => navigateTo({ type: 'explore' })}
                            />
                            <NavItem
                                icon={<Library size={20} />}
                                label="Your Library"
                                active={currentView.type === 'library'}
                                onClick={() => navigateTo({ type: 'library' })}
                            />
                            <NavItem
                                icon={<ListMusic size={20} />}
                                label="Queue"
                                active={currentView.type === 'queue'}
                                onClick={() => navigateTo({ type: 'queue' })}
                            />
                        </nav>
                    </div>

                    <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <div className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer group" onClick={() => navigateTo({ type: 'library' })}>
                                <Library size={18} className="group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                                <span className="font-medium text-sm">Your Library</span>
                            </div>
                            <button onClick={handleCreatePlaylist} className="text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded-full p-1" title="Create Playlist">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                            <FilterPill label="My Tapes" active />
                            <FilterPill label="Albums" />
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col gap-2 mt-2 pr-1 custom-scrollbar">
                            <LibraryItem
                                title="Liked Songs"
                                subtitle={`Playlist • ${likedSongs.length} songs`}
                                icon={<Heart size={18} fill="white" />}
                                gradient="from-indigo-500 to-purple-600"
                                onClick={() => navigateTo({ type: 'library' })}
                            />
                            {charts.length > 0 && (
                                <div className="mt-4">
                                    <h5 className="text-[10px] uppercase text-gray-500 font-bold mb-2 tracking-wider pl-1">Top Charts</h5>
                                    {charts.slice(0, 8).map((chart: any, i) => (
                                        <LibraryItem
                                            key={i}
                                            title={decodeHtml(chart.title || chart.listname)}
                                            subtitle={chart.language || "Chart"}
                                            image={chart.image || chart.img}
                                            onClick={() => navigateTo({ type: 'playlist', data: chart })}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Profile Section */}
                    <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                            JV
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate">Justin Vikky</h4>
                            <p className="text-[10px] text-gray-400">Premium Plan</p>
                        </div>
                        <button onClick={onOpenSettings} className="text-gray-400 hover:text-white transition-colors">
                            <SettingsIcon size={18} />
                        </button>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden relative min-w-0">
                    <header className="px-6 py-4 flex items-center justify-between gap-4 z-10 shrink-0 h-16">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {viewStack.length > 1 ? (
                                <button onClick={goBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
                                    <ArrowLeft size={16} />
                                </button>
                            ) : (
                                <div className="hidden md:block w-3"></div>
                            )}

                            <div className="relative max-w-sm group w-full transition-all">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors" size={16} />
                                <input
                                    className="w-full bg-transparent border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
                                    placeholder="What do you want to listen to?"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if (currentView.type !== 'search') navigateTo({ type: 'search' }) }}
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={onOpenThemeSelector}
                                className="h-8 px-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2 text-xs font-medium"
                                title="Switch Theme / View"
                            >
                                <Grid size={14} />
                                <span className="hidden lg:inline">View</span>
                            </button>
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 p-0.5" >
                                <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-[10px]">JS</div>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide relative" id="main-scroll">
                        <AnimatePresence mode="wait">
                            {currentView.type === 'home' && (
                                <motion.div
                                    key="home"
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    variants={containerVariants}
                                    className="space-y-6"
                                >
                                    {/* Mood Pills */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1 shrink-0">
                                        {['Telugu Hits', 'Mass Beats', 'Melody', 'Love', 'Sad', 'Party', 'Folk', 'Devotional'].map(mood => (
                                            <button key={mood} onClick={() => { setSearchQuery(mood); navigateTo({ type: 'search' }); }} className="px-4 py-1.5 rounded-full mood-capsule text-xs font-medium text-white whitespace-nowrap">
                                                {mood}
                                            </button>
                                        ))}
                                    </div>

                                    {isHomeLoading ? (
                                        <div className="h-80 flex items-center justify-center flex-col gap-4">
                                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs text-gray-500 animate-pulse">Curating your mix...</p>
                                        </div>
                                    ) : (heroData ? (
                                        <>
                                            {/* Hero Section - FIXED HEIGHT */}
                                            {/* Hero Grid (Stitch Layout) */}
                                            {heroData && (
                                                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-80 shrink-0 mb-8">

                                                    {/* Left: Daily Mix (Vertical) */}
                                                    {dailyMix && (
                                                        <div className="hidden lg:flex relative rounded-3xl overflow-hidden group cursor-pointer border border-white/5 h-full shadow-xl" onClick={() => navigateTo({ type: 'playlist', data: dailyMix })}>
                                                            <div className="absolute inset-0 bg-[#2b2b2b]"></div>
                                                            <Image src={(Array.isArray(dailyMix.image || dailyMix.img) ? (dailyMix.image || dailyMix.img)[2]?.link : (dailyMix.image || dailyMix.img)) || ""} alt="Daily Mix" fill className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" unoptimized />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20"></div>

                                                            <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/60 bg-black/20 backdrop-blur-md px-2 py-1 rounded-md">Daily Mix</span>
                                                                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"><Heart size={14} className="text-white" /></div>
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-2xl font-black text-white leading-tight mb-2 drop-shadow-md line-clamp-2">{decodeHtml(dailyMix.title || dailyMix.listname)}</h3>
                                                                    <p className="text-xs text-white/60 line-clamp-1">{dailyMix.language || "Mix"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Right: Feature Card (Horizontal) */}
                                                    <div className={`col-span-1 ${dailyMix ? 'lg:col-span-2' : 'lg:col-span-3'} relative rounded-3xl overflow-hidden group cursor-pointer border border-white/5 h-64 lg:h-full shadow-2xl`} onClick={() => navigateTo({ type: 'playlist', data: heroData })}>
                                                        <Image src={(Array.isArray(heroData.image || heroData.img) ? (heroData.image || heroData.img)[2]?.link : (heroData.image || heroData.img)) || ""} alt="Hero" fill className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" unoptimized />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>

                                                        <div className="absolute inset-0 p-8 flex flex-col justify-center items-start z-10">
                                                            <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-md border border-blue-500/20">Featured Album</div>
                                                            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-2xl max-w-lg leading-[0.9]">{decodeHtml(heroData.title || heroData.listname)}</h1>
                                                            <p className="text-gray-300 text-sm md:text-base max-w-lg mb-8 line-clamp-2 drop-shadow-md font-medium">{decodeHtml(heroData.subtitle || heroData.language || "The best music, right now.")}</p>

                                                            <div className="flex items-center gap-4">
                                                                <button className="h-12 w-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)] text-black">
                                                                    <Play fill="currentColor" size={20} className="ml-1" />
                                                                </button>
                                                                <button className="h-12 w-12 rounded-full border border-white/20 hover:bg-white/10 flex items-center justify-center backdrop-blur-md transition-all text-white">
                                                                    <Heart size={20} />
                                                                </button>
                                                                <button className="h-12 w-12 rounded-full border border-white/20 hover:bg-white/10 flex items-center justify-center backdrop-blur-md transition-all text-white">
                                                                    <MoreVertical size={20} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Charts Grid */}
                                            <motion.div variants={itemVariants}>
                                                <h3 className="text-lg font-bold mb-3">Top Charts & Playlists</h3>
                                                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3 pb-8">
                                                    {charts.map((chart: any, i) => (
                                                        <motion.div variants={itemVariants} key={i} className="group cursor-pointer" onClick={() => navigateTo({ type: 'playlist', data: chart })}>
                                                            <div className="aspect-square rounded-lg overflow-hidden mb-2 relative glass-card border-none shadow-lg">
                                                                <Image src={chart.image || chart.img} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                                                    <Play size={24} fill="white" className="text-white drop-shadow-lg scale-0 group-hover:scale-100 transition-transform delay-75" />
                                                                </div>
                                                            </div>
                                                            <h4 className="text-xs font-bold truncate pr-1 group-hover:text-blue-400 transition-colors">{decodeHtml(chart.title || chart.listname)}</h4>
                                                            <p className="text-[10px] text-gray-400 capitalize">{chart.language || "Chart"}</p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        </>
                                    ) : (
                                        <div className="h-80 flex flex-col items-center justify-center gap-4 text-center">
                                            <p className="text-gray-400 text-sm">Unable to load home feed.</p>
                                            <button onClick={loadContent} className="px-6 py-2 bg-white text-black font-bold rounded-full text-xs hover:scale-105 transition-transform">
                                                Retry
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {currentView.type === 'explore' && (
                                <motion.div key="explore" initial="hidden" animate="visible" exit="hidden" variants={containerVariants}>
                                    <h1 className="text-3xl font-bold mb-6">Explore</h1>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {EXPLORE_CATEGORIES.map((cat, i) => (
                                            <motion.div variants={itemVariants} key={i} onClick={() => { setSearchQuery(cat.name); navigateTo({ type: 'search' }); }} className={`aspect-square rounded-2xl bg-gradient-to-br ${cat.color} p-6 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group`}>
                                                <h4 className="font-bold text-xl relative z-10">{cat.name}</h4>
                                                <div className="absolute -bottom-4 -right-4 rotate-12 opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all scale-150">{cat.icon}</div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {currentView.type === 'library' && (
                                <motion.div key="library" initial="hidden" animate="visible" exit="hidden" variants={containerVariants}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h1 className="text-3xl font-bold">Your Library</h1>
                                        <div className="flex gap-2 bg-white/5 p-1 rounded-full">
                                            {['liked', 'playlists', 'albums'].map((tab) => (
                                                <button key={tab} onClick={() => setLibraryTab(tab as any)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${libraryTab === tab ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {libraryTab === 'liked' && (
                                        <div className="space-y-2">
                                            {likedSongs.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                                                    <Heart size={48} className="opacity-50" />
                                                    <p className="text-sm">Songs you like will appear here</p>
                                                    <button onClick={() => navigateTo({ type: 'explore' })} className="px-6 py-2 bg-white/10 rounded-full text-xs font-bold hover:bg-white/20 transition-colors">Find Songs</button>
                                                </div>
                                            ) : (
                                                likedSongs.map((song, i) => (
                                                    <div key={i} className="group flex items-center p-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => handleSongClick(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                                                        <div className="w-8 text-center text-gray-500 text-xs group-hover:hidden font-mono">{i + 1}</div>
                                                        <div className="w-8 hidden group-hover:flex justify-center text-white"><Play size={14} fill="currentColor" /></div>
                                                        <div className="w-10 h-10 rounded bg-gray-800 ml-2 mr-4 overflow-hidden shadow relative shrink-0">
                                                            <Image src={(Array.isArray(song.image) ? (song.image[1]?.link || song.image[0]?.link) : song.image) || ""} alt="Art" fill className="object-cover" unoptimized />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-white font-medium text-sm truncate">{decodeHtml(song.name)}</h4>
                                                            <p className="text-[10px] text-gray-400 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); toggleLike(song); }} className="w-8 h-8 flex items-center justify-center text-red-500 hover:scale-110 transition-transform"><Heart size={16} fill="currentColor" /></button>
                                                        <div className="text-xs text-gray-500 w-12 text-right font-mono">{formatTime(song.duration)}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                    {/* Placeholders for other tabs */}
                                    {libraryTab !== 'liked' && (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                                            <Library size={48} className="mb-4" />
                                            <h3 className="text-lg font-bold">Empty Collection</h3>
                                            <p className="text-xs max-w-xs mt-2">Save {libraryTab} to your library and they will show up here.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {currentView.type === 'queue' && (
                                <motion.div key="queue" initial="hidden" animate="visible" exit="hidden" variants={containerVariants} className="max-w-3xl mx-auto">
                                    <h1 className="text-3xl font-bold mb-6">Queue</h1>
                                    <div className="mb-8">
                                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Now Playing</h2>
                                        {currentSong ? (
                                            <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 shadow-xl">
                                                <div className="w-24 h-24 rounded-2xl shadow-lg relative overflow-hidden shrink-0">
                                                    <Image src={(Array.isArray(currentSong.image) ? (currentSong.image[2]?.link || currentSong.image[0]?.link) : currentSong.image) || ""} alt="" fill className="object-cover" unoptimized />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <div className="w-8 h-1 flex justify-between items-end">
                                                            <div className="w-2 bg-green-500 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }}></div>
                                                            <div className="w-2 bg-green-500 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }}></div>
                                                            <div className="w-2 bg-green-500 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white mb-1">{decodeHtml(currentSong.name)}</h3>
                                                    <p className="text-gray-400 text-lg mb-4">{decodeHtml(currentSong.primaryArtists)}</p>
                                                    <div className="flex gap-4">
                                                        <button onClick={() => navigateTo({ type: 'nowplaying' })} className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-transform">Full Screen</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No song playing</p>
                                        )}
                                    </div>

                                    <div>
                                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Up Next</h2>
                                        <div className="space-y-2">
                                            {mixes.length > 0 ? mixes[0].songs.map((song, i) => (
                                                <div key={i} className={`group flex items-center p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer ${currentSong?.id === song.id ? 'bg-white/10' : ''}`} onClick={() => handleSongClick(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                                                    <div className="w-6 text-center text-gray-500 text-xs">{i + 1}</div>
                                                    <div className="w-10 h-10 rounded bg-gray-800 ml-2 mr-4 overflow-hidden shrink-0 relative">
                                                        <Image src={(Array.isArray(song.image) ? (song.image[1]?.link || song.image[0]?.link) : song.image) || ""} alt="" fill className="object-cover" unoptimized />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-green-400' : 'text-white'}`}>{decodeHtml(song.name)}</h4>
                                                        <p className="text-[10px] text-gray-400 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500">{formatTime(song.duration)}</div>
                                                </div>
                                            )) : <p className="text-gray-500 text-sm py-4">Queue is empty.</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentView.type === 'artist' && currentView.data && (
                                <motion.div key="artist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20">
                                    {/* Artist Header */}
                                    <div className="relative h-80 w-full mb-8 rounded-3xl overflow-hidden shrink-0">
                                        <Image src={currentView.data.image ? (currentView.data.image[2]?.link || currentView.data.img) : ""} alt="" fill className="object-cover" unoptimized />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-8 w-full">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10} fill="white" /> VERIFIED ARTIST</div>
                                                    </div>
                                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-2 leading-none tracking-tight">{decodeHtml(currentView.data.name || currentView.data.title)}</h1>
                                                    <p className="text-xl text-white/60 font-medium">{(artistDetails?.follower_count || "0").toLocaleString()} Followers</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => artistDetails?.topSongs?.[0] && handleSongClick(artistDetails.topSongs[0])}
                                                        className="px-8 py-3 bg-green-500 text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                                                    >
                                                        <Play size={18} fill="currentColor" /> Play
                                                    </button>
                                                    <button
                                                        onClick={() => { setIsFollowed(!isFollowed); showToast(isFollowed ? "Unfollowed Artist" : "Following Artist"); }}
                                                        className={`px-8 py-3 border font-bold rounded-full transition-colors flex items-center gap-2 ${isFollowed ? 'bg-white text-black border-white' : 'border-white/30 text-white hover:bg-white/10'}`}
                                                    >
                                                        {isFollowed ? "Following" : "Follow"}
                                                    </button>
                                                    <button className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors" onClick={() => { navigator.clipboard.writeText(window.location.href); showToast("Artist link copied"); }}>
                                                        <Share2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-8 border-b border-white/10 mb-6 px-4">
                                        {['popular', 'albums', 'singles', 'about'].map(tab => (
                                            <button key={tab} onClick={() => setArtistTab(tab as any)} className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${artistTab === tab ? 'text-white' : 'text-gray-500 hover:text-white transition-colors'}`}>
                                                {tab}
                                                {artistTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-t-full" />}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Artist Content */}
                                    <div className="min-h-[200px]">
                                        {isArtistLoading ? (
                                            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                                        ) : artistTab === 'popular' ? (
                                            <div className="space-y-1">
                                                {artistDetails?.topSongs?.map((song: any, i: number) => (
                                                    <div key={i} className="group flex items-center p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" onClick={() => handleSongClick(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                                                        <span className="w-8 text-center text-gray-500 text-xs font-mono group-hover:hidden">{i + 1}</span>
                                                        <span className="w-8 hidden group-hover:flex justify-center text-white"><Play size={14} fill="currentColor" /></span>
                                                        <div className="w-10 h-10 bg-gray-800 rounded mx-3 overflow-hidden relative"><Image src={song.image[1]?.link || ""} alt="" fill className="object-cover" unoptimized /></div>
                                                        <span className="flex-1 text-sm font-medium text-white truncate">{decodeHtml(song.title)}</span>
                                                        <span className="text-xs text-gray-500 pr-4">{Number(song.listener_count || 0).toLocaleString()} plays</span>
                                                        <span className="text-xs text-gray-500 w-10 text-right">{formatTime(song.duration)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : artistTab === 'albums' ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {artistDetails?.topAlbums?.map((album: any, i: number) => (
                                                    <motion.div key={i} whileHover={{ y: -5 }} className="cursor-pointer group" onClick={() => navigateTo({ type: 'playlist', data: album })}>
                                                        <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg bg-gray-800">
                                                            <Image src={album.image[2]?.link || ""} alt="" fill className="object-cover" unoptimized />
                                                        </div>
                                                        <h4 className="font-bold text-sm truncate group-hover:text-green-400 transition-colors">{decodeHtml(album.title)}</h4>
                                                        <p className="text-xs text-gray-500">{album.year} • Album</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center text-gray-500">Content coming soon for {artistTab}</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {currentView.type === 'search' && (
                                <motion.div
                                    key="search"
                                    initial="hidden"
                                    animate="visible"
                                    variants={containerVariants}
                                    className="min-h-full"
                                >
                                    {!searchQuery.trim() ? (
                                        <div className="py-2">
                                            <h3 className="text-lg font-bold mb-4">Browse Categories</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {EXPLORE_CATEGORIES.map((cat, i) => (
                                                    <motion.div
                                                        variants={itemVariants}
                                                        key={i}
                                                        onClick={() => handleCategoryClick(cat.name)}
                                                        className={`h-32 rounded-xl bg-gradient-to-br ${cat.color} p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group`}
                                                    >
                                                        <h4 className="font-bold text-lg relative z-10">{cat.name}</h4>
                                                        <div className="absolute -bottom-2 -right-2 rotate-12 opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all">{cat.icon}</div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pb-20">
                                            <h3 className="text-lg font-bold mb-3">Results for "{searchQuery}"</h3>
                                            <div className="flex flex-col gap-1">
                                                {searchResults.map((song, i) => (
                                                    <div
                                                        key={i}
                                                        className="group flex items-center p-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/5 transition-all cursor-pointer"
                                                        onClick={() => handleSongClick(song)} onContextMenu={(e) => handleContextMenu(e, song)}
                                                    >
                                                        <div className="w-10 h-10 rounded bg-gray-800 mr-3 overflow-hidden shadow relative shrink-0">
                                                            <Image src={(Array.isArray(song.image) ? (song.image[1]?.link || song.image[0]?.link) : song.image) || ""} alt="Art" fill className="object-cover" unoptimized />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-white font-medium text-sm truncate">{decodeHtml(song.name)}</h4>
                                                            <p className="text-[10px] text-gray-400 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mr-4 font-mono">{formatTime(song.duration)}</div>
                                                    </div>
                                                ))}
                                                {(!isSearching && searchResults.length === 0) && (
                                                    <div className="flex flex-col items-center justify-center h-40 opacity-50 space-y-2">
                                                        <Search size={32} className="opacity-50" />
                                                        <p className="text-xs">No results found for "{searchQuery}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {currentView.type === 'playlist' && currentView.data && (
                                <motion.div
                                    key="playlist"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3, ease: 'circOut' }}
                                    className="pb-20"
                                >
                                    <div className="flex flex-col md:flex-row gap-6 mb-8 items-center md:items-end">
                                        <div className="w-48 h-48 md:w-56 md:h-56 shadow-2xl rounded-xl overflow-hidden shrink-0 relative border border-white/10">
                                            <Image src={(Array.isArray(currentView.data.image || currentView.data.img) ? (currentView.data.image || currentView.data.img)[2]?.link : (currentView.data.image || currentView.data.img)) || ""} alt="" fill className="object-cover" unoptimized />
                                        </div>
                                        <div className="flex flex-col gap-2 text-center md:text-left flex-1">
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Playlist</span>
                                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">{decodeHtml(currentView.data.title || currentView.data.listname)}</h1>
                                            <p className="text-gray-400 text-sm max-w-lg mx-auto md:mx-0">{decodeHtml(currentView.data.subtitle || "The best tracks, curated for you.")}</p>
                                            <div className="flex items-center gap-3 justify-center md:justify-start mt-4">
                                                <button
                                                    onClick={() => !isDetailsLoading && handlePlayPlaylist(playlistDetails, currentView.data.title || currentView.data.listname, currentView.data.listid || currentView.data.id)}
                                                    className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-white/10 flex items-center gap-2"
                                                >
                                                    <Play fill="currentColor" size={16} /> Play All
                                                </button>
                                                <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 hover:border-white transition-all"><Heart size={18} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {isDetailsLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                                                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-xs">Loading Tracks...</p>
                                            </div>
                                        ) : (
                                            playlistDetails.map((song: any, i) => (
                                                <div
                                                    key={i}
                                                    className="group flex items-center p-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/5 transition-all cursor-pointer"
                                                    onClick={() => handleSongClick(song)} onContextMenu={(e) => handleContextMenu(e, song)}
                                                >
                                                    <div className="w-8 text-center text-gray-500 text-xs group-hover:hidden font-mono">{i + 1}</div>
                                                    <div className="w-8 hidden group-hover:flex justify-center text-white"><Play size={14} fill="currentColor" /></div>

                                                    <div className="w-10 h-10 rounded bg-gray-800 ml-2 mr-4 overflow-hidden shadow relative shrink-0">
                                                        <Image src={(Array.isArray(song.image) ? (song.image[1]?.link || song.image[0]?.link) : song.image) || ""} alt="Art" fill className="object-cover" unoptimized />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-medium text-sm truncate">{decodeHtml(song.name || song.title)}</h4>
                                                        <p className="text-[10px] text-gray-400 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mr-4 font-mono hidden md:block">{formatTime(song.duration)}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                {/* RIGHT SIDEBAR (Existing) */}
                <aside className="w-64 glass-panel rounded-2xl hidden xl:flex flex-col shrink-0 p-4 overflow-hidden z-20 h-full">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <h3 className="text-sm font-medium text-white tracking-wide">Recent Played</h3>
                        <button className="text-[10px] text-gray-400 hover:text-white transition-colors">See All</button>
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 scrollbar-hide">
                        {mixes.length > 0 ? mixes.slice(0, 5).map(mix => (
                            <div key={mix.id} onClick={() => loadMix(mix.id)} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-colors -mx-1">
                                <div className="w-10 h-10 rounded-md bg-gray-800 overflow-hidden shrink-0 shadow-md relative">
                                    {mix.songs[0]?.image[1]?.link ? (
                                        <Image src={mix.songs[0]?.image[1]?.link} alt="" fill className="object-cover" unoptimized />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full">
                                            <Disc size={18} className="text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="text-xs font-medium text-white truncate">{mix.title}</h4>
                                    <p className="text-[10px] text-gray-400 truncate">{mix.songs.length} Tracks</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-gray-500 text-xs text-center mt-10">No recent mixes</div>
                        )}
                    </div>
                    <div className="mt-auto relative rounded-xl bg-neutral-900/80 border border-white/10 backdrop-blur-md p-4 text-white overflow-hidden shadow-2xl shrink-0">
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="relative z-10">
                            <h4 className="font-bold text-sm mb-0.5 tracking-tight">Listen Offline</h4>
                            <p className="text-[10px] text-gray-400 mb-3">Download your favorite tracks.</p>
                            <button className="w-full py-2 rounded-full bg-white text-black font-bold text-xs hover:scale-105 transition-all">Download</button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* PLAYER BAR */}
            <footer className="h-20 glass-panel border-t border-white/10 mx-3 mb-3 rounded-2xl flex items-center px-6 justify-between gap-6 z-50 shrink-0">
                {/*  Track Info */}
                <div className="w-1/4 flex items-center gap-3">
                    {currentSong ? (
                        <>
                            <div className="w-12 h-12 rounded-lg bg-zinc-800 relative overflow-hidden shadow-lg border border-white/10">
                                <Image src={(Array.isArray(currentSong.image) ? (currentSong.image[1]?.link || currentSong.image[0]?.link) : currentSong.image) || ""} alt="" fill className="object-cover" unoptimized />
                            </div>
                            <div className="hidden md:block overflow-hidden">
                                <h4 className="text-white font-bold text-xs drop-shadow-sm truncate">{decodeHtml(currentSong.name)}</h4>
                                <div className="flex items-center gap-1">
                                    <p className="text-gray-400 text-[10px] truncate">{decodeHtml(currentSong.primaryArtists)}</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-red-500 transition-colors hidden lg:block"><Heart size={16} /></button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 opacity-50">
                            <div className="w-12 h-12 rounded-lg bg-white/5 animate-pulse"></div>
                            <div>
                                <div className="w-16 h-3 bg-white/10 rounded mb-1"></div>
                                <div className="w-10 h-2 bg-white/10 rounded"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Controls */}
                <div className="flex-1 max-w-lg flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-5">
                        <button onClick={() => setShuffle(!shuffle)} className={`text-${shuffle ? 'white' : 'gray-400'} hover:text-white transition-colors`}><Shuffle size={16} /></button>
                        <button onClick={prev} className="text-gray-300 hover:text-white transition-colors hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"><SkipBack size={20} fill="currentColor" /></button>
                        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button onClick={next} className="text-gray-300 hover:text-white transition-colors hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"><SkipForward size={20} fill="currentColor" /></button>
                        <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`text-${repeat !== 'off' ? 'white' : 'gray-400'} hover:text-white transition-colors`}>
                            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                        </button>
                    </div>
                    <div className="w-full flex items-center gap-3 text-[10px] font-medium text-gray-500 font-mono">
                        <span className="w-8 text-right">{formatTime(progress * (duration || 0))}</span>
                        <div
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                seek((e.clientX - rect.left) / rect.width);
                            }}
                            className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden"
                        >
                            <div className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: `${progress * 100}%` }}></div>
                            <div className="absolute inset-y-0 left-0 bg-white/0 group-hover:bg-white/20 transition-colors w-full"></div>
                        </div>
                        <span className="w-8">{formatTime(duration || 0)}</span>
                    </div>
                </div>

                {/* Volume & Extras */}
                <div className="w-1/4 flex items-center justify-end gap-3">
                    <button onClick={onShowQueue} className="text-gray-400 hover:text-white transition-colors"><ListMusic size={18} /></button>
                    <div className="flex items-center gap-2 group w-24">
                        <Volume2 size={18} className="text-gray-400 hover:text-white transition-colors" />
                        <div
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setVolume((e.clientX - rect.left) / rect.width);
                            }}
                            className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ width: `${volume * 100}%` }}></div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigateTo({ type: 'nowplaying' })}
                        className="text-gray-400 hover:text-white ml-2 transition-colors"
                        title="Cinema Mode"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </footer>

            {/* Full Screen Now Playing - Edge to Edge */}
            <AnimatePresence>
                {currentView.type === 'nowplaying' && currentSong && (
                    <motion.div
                        key="nowplaying-fullscreen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-black"
                    >
                        {/* Background Blur */}
                        <div className="absolute inset-0 z-0">
                            <Image
                                src={(Array.isArray(currentSong.image) ? (currentSong.image[2]?.link || currentSong.image[0]?.link) : currentSong.image) || ""}
                                alt=""
                                fill
                                className="object-cover blur-[100px] scale-150 opacity-30"
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/60 to-black"></div>
                        </div>

                        {/* Header */}
                        <header className="relative z-50 h-20 flex items-center justify-between px-10 shrink-0">
                            <button onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                                <ChevronDown size={24} className="text-white/70" />
                            </button>
                            <div className="text-xs tracking-[0.2em] font-semibold text-white/40 uppercase">Now Playing</div>
                            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                                <MoreVertical size={20} className="text-white/70" />
                            </button>
                        </header>

                        {/* Main - 3 Column */}
                        <main className="relative z-10 flex-1 flex items-center px-12 gap-16 overflow-hidden">
                            {/* Album Art */}
                            <div className="flex-1 flex justify-end items-center">
                                <div className="relative max-w-[540px] w-full aspect-square">
                                    <Image
                                        src={(Array.isArray(currentSong.image) ? (currentSong.image[2]?.link || currentSong.image[0]?.link) : currentSong.image) || ""}
                                        alt=""
                                        fill
                                        className="object-cover rounded-[2rem] shadow-2xl border border-white/20"
                                        unoptimized
                                    />
                                </div>
                            </div>

                            {/* Song Info & Controls */}
                            <div className="flex-1 flex flex-col justify-center max-w-xl">
                                <div className="mb-12">
                                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-white leading-tight">{decodeHtml(currentSong.name)}</h1>
                                    <p className="text-2xl text-white/60 font-light">{decodeHtml(currentSong.primaryArtists || "")}</p>
                                </div>

                                {/* Progress */}
                                <div className="w-full mb-10 group">
                                    <div className="relative h-1.5 w-full bg-white/10 rounded-full cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); seek((e.clientX - rect.left) / rect.width * duration); }}>
                                        <div className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ width: `${(progress / (duration || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-4 text-xs font-medium tracking-widest text-white/40">
                                        <span>{formatTime(progress)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between px-4">
                                    <button onClick={() => setShuffle(!shuffle)} className={`transition-colors ${shuffle ? 'text-white' : 'text-white/40 hover:text-white'}`}>
                                        <Shuffle size={24} />
                                    </button>
                                    <div className="flex items-center gap-10">
                                        <button onClick={prev} className="text-white/80 hover:text-white"><SkipBack size={32} fill="currentColor" /></button>
                                        <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                                            {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                                        </button>
                                        <button onClick={next} className="text-white/80 hover:text-white"><SkipForward size={32} fill="currentColor" /></button>
                                    </div>
                                    <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className={`transition-colors ${repeat !== 'off' ? 'text-white' : 'text-white/40 hover:text-white'}`}>
                                        {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-center gap-8 mt-16 text-white/40">
                                    <button onClick={() => { toggleLike(currentSong); showToast(isLiked(currentSong.id) ? "Removed from Liked Songs" : "Added to Liked Songs") }} className={`transition-colors hover:scale-110 ${isLiked(currentSong.id) ? 'text-red-500' : 'hover:text-white'}`}>
                                        <Heart size={20} fill={isLiked(currentSong.id) ? "currentColor" : "none"} />
                                    </button>
                                    <button onClick={() => { navigator.clipboard.writeText(`https://melora.music/song/${currentSong.id}`); showToast("Link copied to clipboard"); }} className="hover:text-white transition-colors hover:scale-110">
                                        <Share2 size={20} />
                                    </button>
                                    <button onClick={() => { navigateTo({ type: 'queue' }); }} className="hover:text-white transition-colors hover:scale-110">
                                        <ListMusic size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Lyrics Panel */}
                            <aside className="w-[420px] h-[85vh] glass-card rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden shrink-0 hidden xl:flex">
                                <div className="mb-8 flex items-center justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Lyrics</h3>
                                    <Maximize2 size={14} className="text-white/40" />
                                </div>
                                <div className="flex-1 overflow-y-auto pr-4 no-scrollbar mask-linear-fade text-center" ref={lyricsContainerRef}>
                                    {lyricsData.synced ? (
                                        lyricsData.lines.map((line, i) => (
                                            <p
                                                key={i}
                                                className={`text-2xl font-bold mb-8 transition-all duration-500 cursor-pointer ${i === activeLine ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'text-white/30 hover:text-white/60 blur-[1px]'}`}
                                                onClick={() => seek(line.time)}
                                            >
                                                {line.text}
                                            </p>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center">
                                            <p className="text-xl font-medium text-white/50 whitespace-pre-wrap leading-loose">
                                                {lyricsData.text || "Lyrics fetching..."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </main>

                        {/* Footer */}
                        <footer className="relative z-50 h-16 flex items-center justify-between px-10 text-[10px] tracking-[0.2em] font-bold text-white/30 uppercase shrink-0">
                            <div className="flex items-center gap-4">
                                <span>Hi-Fi Audio 24-bit/192kHz</span>
                                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                                <span>Dolby Atmos</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <Volume2 size={16} />
                                    <div className="w-24 h-0.5 bg-white/10 rounded-full relative cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - rect.left) / rect.width); }}>
                                        <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${volume * 100}%` }}></div>
                                    </div>
                                </div>
                                <span className="hover:text-white transition-colors cursor-pointer" onClick={() => showToast("Scanning for devices...")}>Devices Available</span>
                            </div>
                        </footer>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="bg-[#1e1e1e] border border-white/10 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                            <h3 className="text-xl font-bold text-white mb-2 relative z-10">New Playlist</h3>
                            <p className="text-sm text-gray-400 mb-6 relative z-10">Give your collection a name.</p>

                            <input
                                type="text"
                                autoFocus
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && confirmCreatePlaylist()}
                                placeholder="My Awesome Mix"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors mb-8 relative z-10"
                            />

                            <div className="flex items-center justify-end gap-4 relative z-10">
                                <button onClick={() => setIsPlaylistModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={confirmCreatePlaylist} disabled={!newPlaylistName.trim()} className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all">Create</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
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

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu.visible && contextMenu.song && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="fixed z-[10001] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[220px] backdrop-blur-xl"
                        style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 220) }}
                    >
                        <div className="p-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
                            <div className="w-10 h-10 rounded overflow-hidden relative shrink-0"><Image src={(Array.isArray(contextMenu.song.image) ? (contextMenu.song.image[1]?.link || contextMenu.song.image[0]?.link) : contextMenu.song.image) || ""} alt="" fill className="object-cover" unoptimized /></div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{contextMenu.song.name}</h4>
                                <p className="text-[10px] text-gray-400 truncate">{contextMenu.song.primaryArtists}</p>
                            </div>
                        </div>
                        <div className="p-1.5 flex flex-col gap-0.5">
                            <button className="w-full text-left px-3 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors" onClick={() => { addMix({ id: `q-${Date.now()}`, title: 'Queue', color: 'blue', songs: [contextMenu.song!], currentSongIndex: 0 }); showToast("Added to Queue"); }}>
                                <ListMusic size={14} className="text-gray-400" /> Add to Queue
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors" onClick={() => { toggleLike(contextMenu.song!); showToast(isLiked(contextMenu.song!.id) ? "Removed from Liked" : "Added to Liked"); }}>
                                <Heart size={14} fill={isLiked(contextMenu.song!.id) ? "currentColor" : "none"} className={isLiked(contextMenu.song!.id) ? "text-red-500" : "text-gray-400"} /> {isLiked(contextMenu.song!.id) ? "Remove from Liked" : "Save to Liked Songs"}
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors" onClick={() => { setSearchQuery(contextMenu.song!.primaryArtists.split(',')[0]); navigateTo({ type: 'search' }); }}>
                                <Users size={14} className="text-gray-400" /> Go to Artist
                            </button>
                            <div className="h-px bg-white/10 my-1 mx-2"></div>
                            <button className="w-full text-left px-3 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors" onClick={() => { navigator.clipboard.writeText(`https://melora.music/song/${contextMenu.song!.id}`); showToast("Copied Link"); }}>
                                <Share2 size={14} className="text-gray-400" /> Share Song
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ... Helper Components (Scaled Down) ...
function NavItem({ icon, label, active, onClick }: any) {
    return (
        <a
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${active ? 'active-nav-item text-white' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'}`}
        >
            <div className={`${active ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}>{icon}</div>
            <span className="font-medium text-sm tracking-wide">{label}</span>
        </a>
    );
}

function FilterPill({ label, active }: any) {
    return (
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? 'border border-white/20 bg-white/5 hover:bg-white/10' : 'border border-transparent hover:border-white/20 bg-transparent text-gray-400 hover:bg-white/5'}`}>
            {label}
        </button>
    );
}

function LibraryItem({ title, subtitle, icon, image, gradient, onClick }: any) {
    return (
        <div onClick={onClick} className="group flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-gray-800'}`}>
                {image ? (
                    <Image src={image} alt="" fill className="object-cover" unoptimized />
                ) : (
                    icon || <Disc size={18} className="text-gray-500" />
                )}
            </div>
            <div className="flex flex-col overflow-hidden">
                <h4 className="text-sm font-medium text-white truncate group-hover:text-white transition-colors">{title}</h4>
                <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
