"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong, getTopCharts, getPlaylistDetails, searchSongs } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import {
    Home, Search, Compass, Library, Plus, Heart, MoreVertical,
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
    Volume2, ListMusic, Mic2, Maximize2, X, ChevronUp, CheckCircle,
    Disc, Grid, Clock, Music, ArrowLeft, Zap, Star
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
    const {
        currentSong, isPlaying, togglePlay, next, prev, seek, volume, setVolume,
        progress, duration, shuffle, setShuffle, repeat, setRepeat, loadMix, mixes, addMix
    } = usePlayback();

    // --- Navigation State ---
    const [viewStack, setViewStack] = useState<Array<{ type: 'home' | 'playlist' | 'search', data?: any }>>([{ type: 'home' }]);
    const currentView = viewStack[viewStack.length - 1];

    const navigateTo = (view: { type: 'home' | 'playlist' | 'search', data?: any }) => {
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

    // Initial Load & Retry
    useEffect(() => {
        if (charts.length === 0) {
            loadContent(); // Call immediately on mount if empty
        }
    }, [currentView.type]); // Retry on nav change too if empty

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
                                icon={<Search size={20} />}
                                label="Explore"
                                active={currentView.type === 'search'}
                                onClick={() => { if (currentView.type !== 'search') navigateTo({ type: 'search' }); }}
                            />
                        </nav>
                    </div>

                    <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <div className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer group">
                                <Library size={18} className="group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                                <span className="font-medium text-sm">Your Library</span>
                            </div>
                            <button onClick={onCreateMix} className="text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded-full p-1">
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
                                subtitle="Playlist • 12 songs"
                                icon={<Heart size={18} fill="white" />}
                                gradient="from-indigo-500 to-purple-600"
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
                                                        onClick={() => handleSongClick(song)}
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
                                                    onClick={() => handleSongClick(song)}
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
                        onClick={onOpenSettings}
                        className="text-gray-400 hover:text-white ml-2 transition-colors hover:rotate-90 duration-500"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </footer>
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
