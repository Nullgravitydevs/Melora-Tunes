
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";
import { getTrending, getTopCharts, searchPlaylists } from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { OfflineStore } from "@/lib/offline-store";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { useLyrics } from "@/hooks/useLyrics";
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { HistoryStore, HistoryItem } from "@/lib/history-store";
import { LanguageModal } from "@/components/windows/scenes/language-modal";
import { Search, Home, Library, Heart, Disc, Bell, Plus, Play, Pause, SkipForward, SkipBack, Volume2, Volume1, VolumeX, Shuffle, Repeat, MoreHorizontal, ChevronRight, ChevronDown, Loader2, Download, Compass, Maximize2, Monitor, Globe } from "lucide-react";
import { HomeView } from "./HomeView";
import { ArtistView } from "./ArtistView";
import { AlbumView } from "./AlbumView";
import { ChartDetailScreen } from "./ChartDetailScreen";
import { PlaylistScreen } from "./PlaylistScreen";
import { TrackRow, FeatureCard, MoodPill, DiscoveryThemeColors, getArt, NavItem, PlaylistItem } from "./DiscoveryShared";
import { MoodDetailScreen } from "./MoodDetailScreen";


// Mood Categories for Explore Screen (Per Spec)
const moodCategories = [
    { id: 'romance', name: 'Romance', gradient: 'from-rose-500 to-pink-600', icon: '❤️' },
    { id: 'chill', name: 'Chill', gradient: 'from-cyan-400 to-blue-500', icon: '🌊' },
    { id: 'party', name: 'Party', gradient: 'from-purple-500 to-pink-500', icon: '🎉' },
    { id: 'sad', name: 'Sad', gradient: 'from-slate-600 to-gray-800', icon: '💔' },
    { id: 'workout', name: 'Workout', gradient: 'from-orange-500 to-red-600', icon: '💪' },
    { id: 'focus', name: 'Focus', gradient: 'from-indigo-500 to-purple-600', icon: '🎯' },
    { id: 'sleep', name: 'Sleep', gradient: 'from-indigo-900 to-slate-900', icon: '🌙' },
    { id: 'travel', name: 'Travel', gradient: 'from-emerald-500 to-teal-600', icon: '✈️' },
    { id: 'feelgood', name: 'Feel Good', gradient: 'from-yellow-400 to-orange-500', icon: '☀️' }
];

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

// --- Audio Quality Badge ---
const qualityTooltips: any = {
    'hires': { title: '🔥 Hi-Res Studio Quality', desc: 'LOSSLESS · HI-RES · 24-bit / 96kHz' },
    'flac': { title: '💿 CD Quality Lossless', desc: 'LOSSLESS · CD · 16-bit / 44.1kHz' },
    '320': { title: '🎶 High-Quality Streaming', desc: 'HQ · 320 kbps' },
    '160': { title: '🎵 Standard Streaming', desc: 'MQ · 160 kbps' },
    '96': { title: '📻 Data Saver', desc: 'LQ · 96 kbps' },
};

function QualityBadge({ quality }: { quality: string }) {
    const norm = quality?.toLowerCase().trim() || '320';
    let q = '160';
    if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
    else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
    else if (norm === '320' || norm.includes('hq') || norm.includes('high')) q = '320';
    else if (norm === '96' || norm.includes('lq')) q = '96';
    else if (norm === '160' || norm.includes('mq')) q = '160';
    const info = qualityTooltips[q];
    const [show, setShow] = useState(false);

    return (
        <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <span className={`text - [9px] font - bold px - 1.5 py - 0.5 rounded cursor - help ${q === 'hires' || q === 'flac' ? 'bg-white text-black' : 'bg-white/10 text-white/70'} `}>
                {q === 'hires' ? 'HI-RES' : q === 'flac' ? 'FLAC' : q === '320' ? 'HQ' : 'MQ'}
            </span>
            {/* Tooltip */}
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 border border-white/10 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-xl"
                >
                    <p className="text-white font-bold text-xs mb-1">{info.title}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{info.desc}</p>
                </motion.div>
            )}
        </div>
    );
}

// --- Custom Waveform Loader ---
// --- Custom Loader (New Concept) ---
function WaveLoader() {
    return (
        <div className="flex items-center gap-1.5 h-6">
            {[1, 2, 3].map(i => (
                <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                        boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 10px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)']
                    }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}

// Animation Config
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

// --- Now Playing Overlay ---
// --- Now Playing Overlay ---
// --- Now Playing Overlay ---
function NowPlayingOverlay({ song, nextSong, quality, onClose, playback, onAddToOTG }: { song: any, nextSong: any, quality: string, onClose: () => void, playback: any, onAddToOTG: (s: any) => void }) {
    const Art = getArt(song);
    const { lyrics, plainLyrics, isSynced, isLoading } = useLyrics(song);
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync Lyrics - Robust
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;

        // Find the current line index
        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return playback.progress >= line.time && (!nextLine || playback.progress < nextLine.time);
        });

        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
            // Smooth scroll to active line - Fix nesting access
            const lyricsContainer = scrollRef.current?.firstElementChild;
            const activeEl = lyricsContainer?.children[index] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [playback.progress, lyrics, isSynced]); // activeIndex dep removed to prevent loop, strictly driven by progress

    // Smart Right Panel Decision
    const hasLyrics = (isSynced && lyrics.length > 0) || !!plainLyrics;
    const showQueue = !hasLyrics && !isLoading;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
        >
            {/* 1. Ambient Dynamic Background */}
            {Art && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={Art} className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-70 scale-150 animate-pulse saturate-200" style={{ animationDuration: '10s' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6">
                <button onClick={onClose} className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors">
                    <ChevronDown size={18} /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex gap-8 px-12 pb-8 w-full h-full items-center overflow-hidden">

                {/* Left: Art & Controls */}
                <div className="w-1/2 flex flex-col justify-center gap-6 max-w-xl mx-auto h-full p-4 lg:p-8 relative">

                    {/* Art */}
                    <div className="w-full h-auto max-h-[45vh] flex items-center justify-center">
                        <motion.div
                            className="relative max-h-full w-auto shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden ring-1 ring-white/10"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {Art ? (
                                <img src={Art} alt={song.name} className="w-auto h-auto max-w-full max-h-[45vh] object-contain" />
                            ) : (
                                <div className="w-[280px] h-[280px] bg-neutral-900 flex items-center justify-center"><Disc size={48} className="opacity-20 text-white" /></div>
                            )}
                        </motion.div>
                    </div>

                    {/* Title & Progress */}
                    <div className="flex flex-col gap-5 items-center text-center">
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">{song.name}</h1>
                            <p className="text-lg text-white/60 font-medium drop-shadow-sm">{song.primaryArtists}</p>
                        </div>

                        <div className="flex flex-col gap-2 w-full max-w-md">
                            <div className="bg-white/10 h-1.5 rounded-full w-full cursor-pointer relative group backdrop-blur-sm"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    playback.seek((e.clientX - rect.left) / rect.width);
                                }}
                            >
                                <div className="bg-white h-full rounded-full relative overflow-hidden" style={{ width: `${playback.duration > 0 ? (playback.progress / playback.duration) * 100 : 0}% ` }}>
                                    <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-white to-transparent opacity-50" />
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ left: `${playback.duration > 0 ? (playback.progress / playback.duration) * 100 : 0}% ` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                                <span>{Math.floor(playback.progress / 60)}:{(Math.floor(playback.progress) % 60).toString().padStart(2, '0')}</span>
                                <span>{Math.floor(playback.duration / 60)}:{(Math.floor(playback.duration) % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-10 w-full">
                            <button onClick={() => playback.setShuffle(!playback.shuffle)} className={`transition - all ${playback.shuffle ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'} `}><Shuffle size={18} /></button>
                            <div className="flex items-center gap-6">
                                <button onClick={playback.prev} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipBack size={32} strokeWidth={1.5} /></button>
                                <button onClick={playback.togglePlay} className="w-16 h-16 bg-white/90 text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] backdrop-blur-md">
                                    {playback.isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
                                </button>
                                <button onClick={playback.next} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipForward size={32} strokeWidth={1.5} /></button>
                            </div>
                            <button onClick={() => playback.setRepeat(playback.repeat === 'one' ? 'none' : playback.repeat === 'all' ? 'one' : 'all')} className={`transition - all ${playback.repeat !== 'none' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'} `}><Repeat size={18} /></button>

                            {/* OTG Removed */}
                        </div>
                    </div>

                    {/* Left Down: Audio Tags (Fixed Placement) */}
                    <div className="absolute bottom-0 left-0">
                        {(() => {
                            const norm = quality?.toLowerCase().trim() || '320';
                            let q = '320';
                            if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
                            else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
                            const info = qualityTooltips[q] || qualityTooltips['320'];

                            return (
                                <div className="flex flex-col items-start gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-help group">
                                    <div className={`text - [10px] font - bold uppercase tracking - widest flex items - center gap - 2 ${q === 'hires' || q === 'flac' ? 'text-white' : 'text-white/70'} `}>
                                        {(q === 'hires' || q === 'flac') && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />}
                                        {info.title}
                                    </div>
                                    <div className="text-[10px] text-white/40 font-mono group-hover:text-white/60 transition-colors">
                                        {info.desc}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right: Lyrics & Up Next */}
                <div className="w-1/2 h-full flex flex-col gap-6 relative border-l border-white/5 pl-8">

                    {/* RESTORED: Up Next Card - Always Visible at Top */}
                    {nextSong ? (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-white/10 group cursor-pointer flex-shrink-0" onClick={playback.next}>
                            <div className="w-12 h-12 rounded bg-neutral-800 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                                {getArt(nextSong) ? <img src={getArt(nextSong)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <Disc className="text-white/20" size={20} />}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"><SkipForward size={16} className="text-white" /></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Up Next</p>
                                    <span className="text-[9px] text-white/30 font-mono">0:00</span> {/* Placeholder for duration if needed */}
                                </div>
                                <p className="text-sm text-white font-medium truncate">{nextSong.name}</p>
                                <p className="text-[10px] text-white/50 truncate">{nextSong.primaryArtists}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 opacity-50">
                            <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center"><Disc className="text-white/20" size={20} /></div>
                            <p className="text-sm text-white/50 font-medium">End of Playlist</p>
                        </div>
                    )}

                    {showQueue ? (
                        /* Queue List Mode */
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Queue</h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mask-gradient-b">
                                {(playback.queue || []).slice(playback.currentIndex + 1).map((s: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => playback.seekToQueueItem?.(playback.currentIndex + 1 + i)}>
                                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                            <img src={getArt(s)} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/80 group-hover:text-white truncate">{s.name}</p>
                                            <p className="text-[10px] text-white/40 truncate">{s.primaryArtists}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Lyrics Mode (Fixed Focus) */
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden mask-gradient-y scroll-smooth" ref={scrollRef}>
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin opacity-50" size={24} /></div>
                            ) : (
                                <div className="py-[30vh] space-y-6 text-center px-4">
                                    {lyrics.map((line, i) => (
                                        <motion.div
                                            key={i}
                                            initial={false}
                                            animate={{
                                                opacity: i === activeIndex ? 1 : 0.4, // Increased inactive opacity
                                                scale: i === activeIndex ? 1.05 : 0.98,
                                                filter: i === activeIndex ? 'blur(0px)' : 'blur(1px)', // Reduced blur significantly
                                                color: i === activeIndex ? '#ffffff' : '#a0a0a0',
                                            }}
                                            transition={{ duration: 0.3 }}
                                            className={`cursor - pointer transition - colors origin - center`}
                                            onClick={() => playback.seek(line.time / playback.duration)}
                                        >
                                            <p className={`text - xl md: text - 3xl font - bold leading - tight tracking - tight ${i === activeIndex ? 'drop-shadow-lg' : ''} `}>
                                                {line.text}
                                            </p>
                                        </motion.div>
                                    ))}
                                    {lyrics.length === 0 && (
                                        <div className="mt-10 px-4">
                                            <p className="whitespace-pre-wrap text-xl md:text-3xl font-bold leading-normal tracking-tight text-white drop-shadow-lg text-center hover:scale-[1.02] transition-transform duration-500 cursor-default select-text">
                                                {plainLyrics || "No lyrics available."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <style jsx>{`
    .mask - gradient - y { mask - image: linear - gradient(to bottom, transparent, black 15 %, black 85 %, transparent); }
                                .mask - gradient - b { mask - image: linear - gradient(to bottom, black 85 %, transparent); }
`}</style>
                        </div>
                    )}

                    {/* About Artist Footer */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between mt-auto cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                <img src={Art} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">About the Artist</p>
                                <p className="text-sm text-white font-bold">{song.primaryArtists.split(',')[0]}</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                            <ChevronRight size={12} className="text-white/50" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// --- Subcomponents moved to DiscoveryShared.tsx ---

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    const isMidnight = theme === 'midnight';
    const { playInstantMix, currentSong, currentTrack, activeQuality, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, toggleLike, isLiked, likedSongs, activeMixId, activeMix, mixes, updateMix } = usePlayback();


    const addToOTG = (song: any) => {
        const otgMix = mixes.find(m => m.id === 'otg-tape');
        if (otgMix && song) {
            const track = ensurePlayableTrack(song);
            // Prevent duplicates (optional, but good for tape)
            const exists = otgMix.songs.some(s => {
                const sId = 'song' in s ? s.song.id : s.id;
                return sId === track.song.id;
            });

            if (!exists) {
                updateMix('otg-tape', { songs: [...otgMix.songs, track] });
                // Visual feedback handled by button animation hopefully
            }
        }
    };

    const [activeView, setActiveView] = useState('home');
    const [activeArtist, setActiveArtist] = useState<string | null>(null);
    const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('playlist');
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);

    // Category View State
    const [activeCategory, setActiveCategory] = useState<any | null>(null);
    const [categoryContent, setCategoryContent] = useState<{ playlists: any[], songs: any[] } | null>(null);

    // Chart & Playlist Detail States
    const [activeChart, setActiveChart] = useState<any | null>(null);
    const [activePlaylistDetail, setActivePlaylistDetail] = useState<any | null>(null);
    const [activeMood, setActiveMood] = useState<typeof moodCategories[0] | null>(null);

    const openCategory = async (cat: any) => {
        setActiveCategory(cat);
        setActiveView('category');
        setCategoryContent(null);

        try {
            const [pl, s] = await Promise.all([
                searchPlaylists(cat.name),
                searchUnified(cat.name)
            ]);
            setCategoryContent({ playlists: pl, songs: s });
        } catch (e) {
            console.error("Category Fetch Failed", e);
        }
    };

    // MINIMALIST PALETTE (Project Linear)
    const c = {
        bg: '#000000', // PURE BLACK
        surface: '#000000', // No surface differentiation
        card: '#0a0a0a', // Subtle card bg
        cardHover: '#141414',
        text: '#FFFFFF',
        textMuted: '#666666',
        border: 'rgba(255,255,255,0.08)', // Sharp minimal border
        accent: '#FFFFFF', // High contrast accent
        accentSoft: 'rgba(255,255,255,0.08)', // Subtle hover
    };

    const moods = ['Energize', 'Feel Good', 'Relax', 'Workout', 'Sad', 'Party'];

    // Data State
    const [trending, setTrending] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [recent, setRecent] = useState<HistoryItem[]>([]);  // Raw HistoryItem[]
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

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Trending (Contextual)
                let trendingSongs: any[] = [];
                if (activeRegion && activeRegion !== 'global') {
                    // Use Search for Regional Trending
                    const query = `Trending ${activeRegion}`;
                    const items = await searchUnified(query);
                    trendingSongs = items.map(t => t.song);
                } else {
                    // Global Default
                    trendingSongs = await getTrending();
                }

                // 2. Fetch Charts
                const topCharts = await getTopCharts();

                // 3. Load Recent from HistoryStore (Raw HistoryItem[])
                setRecent(HistoryStore.getHistory().slice(0, 6));

                // 4. Load Downloads
                const downloadedSongs = await OfflineStore.getAllDownloadedSongs();
                setDownloads(downloadedSongs.map(s => ({
                    id: s.id,
                    title: s.name,
                    artist: s.primaryArtists,
                    art: getArt(s),
                    original: { song: s, sources: [] } // Minimal PlayableTrack wrapper
                })));

                setTrending(trendingSongs.slice(0, 10)); // Top 10 trending

                // Map charts to feature cards - filtered for playlists/charts
                const usefulCharts = topCharts
                    .filter((c: any) => c.image) // Must have image
                    .slice(0, 4) // Take top 4 for Chart Toppers
                    .map((c: any) => ({
                        id: c.id,
                        title: c.title || c.name,
                        subtitle: c.subtitle || `${c.language || 'Global'} • ${c.type} `,
                        image: c.image || c.image?.[2]?.link,
                        isNew: c.isNew || false
                    }));

                setCharts(usefulCharts);

                // 5. New & Trending - use trending songs, fallback to search
                let newTrendingItems = trendingSongs.slice(0, 10).map((s: any) => ({
                    ...s,
                    type: 'single'
                }));

                // Fallback: if trending is empty, search for popular songs
                if (newTrendingItems.length === 0) {
                    console.log('[HomeDebug] Trending empty, falling back to search');
                    const { searchSongs } = await import('@/lib/jiosaavn');
                    const popularSongs = await searchSongs('popular hits', 1, 10);
                    newTrendingItems = popularSongs.map((s: any) => ({
                        ...s,
                        type: 'single'
                    }));
                }
                console.log('[HomeDebug] Setting newAndTrending:', newTrendingItems.length, 'items');
                setNewAndTrending(newTrendingItems);

                // 6. Editorial Picks - use charts that have playlists or fetch featured playlists
                const editorialItems = topCharts
                    .filter((c: any) => c.image && c.type !== 'song')
                    .slice(0, 6)
                    .map((c: any) => ({
                        id: c.id,
                        name: c.title || c.name,
                        image: c.image,
                        type: 'playlist'
                    }));
                console.log('[HomeDebug] Setting editorialPicks:', editorialItems.length, 'items');
                setEditorialPicks(editorialItems);
            } catch (e) {
                console.error("Discovery Load Failed:", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Listen for history updates
        const onHistoryUpdate = () => {
            setRecent(HistoryStore.getHistory().slice(0, 6));
        };

        window.addEventListener('melora-history-update', onHistoryUpdate);

        // Load playlists
        setPlaylists(PlaylistStore.getPlaylists());
        const onPlaylistUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener('melora-playlists-update', onPlaylistUpdate);

        return () => {
            window.removeEventListener('melora-history-update', onHistoryUpdate);
            window.removeEventListener('melora-playlists-update', onPlaylistUpdate);
        };
    }, []);



    // Mix Loading State
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);

    const handlePlay = async (song: any, allSongs: any[] = []) => {
        if (!song || isGeneratingMix) return;

        // VISUAL FEEDBACK: Start Loading
        setIsGeneratingMix(true);

        try {
            await new Promise(r => setTimeout(r, 50)); // Micro-yield for UI update

            // STRICT DISCOVERY MODE: Always generate a mix unless explicit User Playlist/Album context.
            if (allSongs.length > 0) {
                // Contextual Play (Playlist/Album only) - ALLOW RAW QUEUE HERE FOR ALBUMS ONLY
                let songList = allSongs;
                let startIndex = songList.findIndex(s => s.id === song.id);

                const newMix: Mix = {
                    id: `context-mix-${Date.now()}`,
                    title: "Context Mix",
                    color: 'blue',
                    songs: songList,
                    currentSongIndex: startIndex >= 0 ? startIndex : 0
                };
                playInstantMix(newMix);
            } else {
                // THE DJ MODE (Discovery Engine)
                // 1. Ensure Seed
                const seed = ensurePlayableTrack(song);

                // 2. Generate Mix
                // PASS ACTIVE REGION (Session Context)
                const sessionMix = await DiscoveryEngine.generateSessionMix(seed, activeRegion || undefined);

                // 3. Play
                playInstantMix(sessionMix);
            }
        } catch (e) {
            console.error("DJ Failed:", e);
            // Fallback safe play (Should rarely happen)
            playInstantMix({
                id: 'fallback-mix',
                title: 'Mix',
                color: 'blue',
                songs: [ensurePlayableTrack(song)],
                currentSongIndex: 0
            });
        } finally {
            setIsGeneratingMix(false);
        }
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setActiveView('search');

        try {
            const results = await searchUnified(query);
            // Map to UI format
            const mapped = results.map(item => ({
                id: item.id,
                title: item.song.name,
                artist: item.song.primaryArtists,
                duration: item.song.duration ? Math.floor(item.song.duration / 60) + ':' + (item.song.duration % 60).toString().padStart(2, '0') : '--:--',
                art: getArt(item.song),
                // Keep original item for playback
                original: item
            }));
            setSearchResults(mapped);
        } catch (e) {
            console.error("Search Failed:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            performSearch(e.currentTarget.value);
        }
    };

    // NAVIGATION HELPER
    const navigateToArtist = (artistName: string) => {
        setActiveArtist(artistName);
        setActiveView('artist');
    };

    const navigateToAlbum = (albumId: string) => {
        setActiveAlbum(albumId);
        setActiveView('album');
    };

    const renderContent = () => {
        switch (activeView) {
            case 'search':
                return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search Input at Top */}
                        <div className="p-4 border-b" style={{ borderColor: c.border }}>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: c.card }}>
                                <Search size={18} style={{ color: c.textMuted }} />
                                <input
                                    type="text"
                                    placeholder="Search songs, artists, albums..."
                                    className="bg-transparent border-none outline-none text-sm w-full"
                                    style={{ color: c.text }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-xs opacity-50 hover:opacity-100">Clear</button>
                                )}
                            </div>
                        </div>
                        {isSearching ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                <WaveLoader />
                                <p className="text-sm opacity-50">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h2 className="text-xl font-bold">Top Results</h2>
                                    <span className="text-xs opacity-50">{searchResults.length} songs</span>
                                </div>
                                {searchResults.map((item, i) => {
                                    const quality = item.original?.sources?.[0]?.quality || item.original?.preferredQuality || '320';
                                    return (
                                        <TrackRow
                                            key={item.id}
                                            index={i + 1}
                                            track={{
                                                ...item,
                                                quality // Pass quality for badge
                                            }}
                                            colors={c}
                                            isPlaying={currentSong?.id === item.id && isPlaying}
                                            onPlay={() => handlePlay(item.original)}
                                        />
                                    );
                                })}
                            </div>
                        ) : searchQuery ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">No results found</h2>
                                    <p className="text-sm mt-2">Try a different search term.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">Search Melora</h2>
                                    <p className="text-sm mt-2">Find songs from JioSaavn, HiFi, and more.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'explore':
                // Sexy gradient pairs for each mood
                const moodGradients: Record<string, string> = {
                    romance: 'linear-gradient(135deg, #FF6B9D 0%, #C44569 50%, #9B2948 100%)',
                    chill: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5433a0 100%)',
                    party: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #e91e63 100%)',
                    sad: 'linear-gradient(135deg, #4b6cb7 0%, #182848 50%, #0f1624 100%)',
                    workout: 'linear-gradient(135deg, #ff9a44 0%, #fc6076 50%, #e91e63 100%)',
                    focus: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 50%, #667eea 100%)',
                    sleep: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                    travel: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 50%, #38ef7d 100%)',
                    feelgood: 'linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f9d423 100%)'
                };
                return (
                    <div className="flex-1 px-8 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {/* Header */}
                        <div className="mb-10">
                            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                                Explore
                            </h1>
                            <p className="text-white/50">Discover music for every mood ✨</p>
                        </div>

                        {/* Mood Destination Cards - Premium Glass Style */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {moodCategories.map((mood) => (
                                <motion.div
                                    key={mood.id}
                                    className="aspect-[3/2] rounded-2xl flex flex-col items-start justify-end p-5 cursor-pointer relative overflow-hidden group"
                                    style={{
                                        background: moodGradients[mood.id] || `linear-gradient(135deg, ${c.accent}, ${c.accent}99)`,
                                        boxShadow: `0 8px 32px ${moodGradients[mood.id]?.includes('#FF6B9D') ? '#FF6B9D33' : c.accent + '33'}`
                                    }}
                                    whileHover={{ scale: 1.04, y: -6, boxShadow: `0 20px 50px ${c.accent}55` }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setActiveMood(mood);
                                        setActiveView('mood-detail');
                                    }}
                                >
                                    {/* Glassmorphism Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                    {/* Animated Shine Effect */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                    </div>

                                    {/* Icon - Large & Centered */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-125 transition-all duration-500">
                                        {mood.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10">
                                        <span className="text-lg font-bold text-white drop-shadow-lg tracking-wide">{mood.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                                            <span className="text-[10px] text-white/50 uppercase tracking-widest">Mood</span>
                                        </div>
                                    </div>

                                    {/* Corner Accent */}
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            case 'mood-detail':
                return activeMood ? (
                    <MoodDetailScreen
                        mood={activeMood}
                        colors={c}
                        onBack={() => setActiveView('explore')}
                        onOpenPlaylist={(playlist) => {
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                    />
                ) : null;
            case 'category':
                return (
                    <div className="flex-1 flex flex-col overflow-y-auto w-full h-full bg-[#121212]">

                        {/* 1. Channel Banner Header */}
                        <div
                            className="relative w-full h-[35vh] min-h-[300px] flex items-end p-8 md:p-12 overflow-hidden"
                            style={{ background: activeCategory?.color || c.surface }}
                        >
                            <button onClick={() => setActiveView('explore')} className="absolute top-8 left-8 flex items-center gap-2 text-white/90 hover:text-white font-bold text-xs uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors z-20">
                                <ChevronRight className="rotate-180" size={14} /> Back
                            </button>

                            {/* Abstract Shapes/Texture */}
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-white/20 rotate-12 blur-3xl rounded-full" />
                                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[80%] bg-black/10 rotate-45 blur-2xl rounded-full" />
                            </div>

                            <div className="relative z-10 w-full max-w-4xl">
                                <h1 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tighter drop-shadow-lg leading-none">
                                    {activeCategory?.name}
                                </h1>
                                <p className="text-xl text-white/90 font-medium mb-8 max-w-lg drop-shadow-md">
                                    Handpicked {activeCategory?.name} hits, just for you.
                                </p>
                                <button className="px-8 py-3 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-xl flex items-center gap-2">
                                    <Play size={18} fill="black" /> Start Radio
                                </button>
                            </div>
                        </div>

                        {/* 2. Content Body */}
                        <div className="flex-1 p-8 md:p-12 space-y-12">
                            {/* Loading State */}
                            {!categoryContent && (
                                <div className="flex items-center justify-center h-40">
                                    <WaveLoader />
                                </div>
                            )}

                            {categoryContent && (
                                <>
                                    {/* Horizontal Playlists (Carousel) */}
                                    <div className="w-full">
                                        <div className="flex items-end justify-between mb-6">
                                            <h2 className="text-xl md:text-2xl font-bold text-white">Top Playlists</h2>
                                            <button className="text-xs font-bold text-white/50 uppercase tracking-widest hover:text-white">View All</button>
                                        </div>

                                        <div className="relative w-full overflow-x-auto pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden mask-gradient-r">
                                            <div className="flex gap-6 w-max">
                                                {categoryContent.playlists.map((pl: any, i: number) => (
                                                    <div key={i} className="w-[180px] md:w-[220px] cursor-pointer group flex-shrink-0" onClick={() => {
                                                        playInstantMix({
                                                            id: pl.id,
                                                            title: pl.name,
                                                            color: activeCategory?.color || 'blue',
                                                            songs: [],
                                                            currentSongIndex: 0
                                                        });
                                                        // Auto fetch logic...
                                                        setIsGeneratingMix(true);
                                                        DiscoveryEngine.generateGenreMix(pl.name, activeRegion || undefined).then(mix => {
                                                            playInstantMix(mix);
                                                        }).finally(() => setIsGeneratingMix(false));
                                                    }}>
                                                        <div className="w-full aspect-square rounded-2xl bg-neutral-800 mb-4 overflow-hidden relative shadow-lg group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500">
                                                            {pl.image?.[2]?.link || pl.image ? (
                                                                <img src={pl.image?.[2]?.link || (typeof pl.image === 'string' ? pl.image : pl.image?.[0]?.link)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center"><Disc size={40} className="text-white/20" /></div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                                                    <Play size={20} fill="black" className="ml-1 text-black" />
                                                                </div>
                                                            </div>
                                                            {/* Playlist Decor Line */}
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <h3 className="font-bold text-white truncate text-base mb-1 group-hover:text-white/90 transition-colors">{pl.name}</h3>
                                                        <p className="text-xs text-white/50 truncate font-medium">JioSaavn • {pl.playCount || 'Popular'}</p>
                                                    </div>
                                                ))}
                                                {categoryContent.playlists.length === 0 && <p className="opacity-50 text-sm">No playlists found.</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Songs List */}
                                    <div className="max-w-5xl">
                                        <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Top Songs</h2>
                                        <div className="flex flex-col gap-1">
                                            {categoryContent.songs.map((item: any, i: number) => (
                                                <TrackRow
                                                    key={item.id}
                                                    index={i + 1}
                                                    track={{
                                                        id: item.id,
                                                        title: item.name,
                                                        artist: item.primaryArtists,
                                                        duration: item.duration ? Math.floor(item.duration / 60) + ':' + (item.duration % 60).toString().padStart(2, '0') : '3:00',
                                                        art: getArt(item),
                                                        original: item
                                                    }}
                                                    colors={c}
                                                    isPlaying={currentSong?.id === item.id && isPlaying}
                                                    onPlay={() => handlePlay(item)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'library':
                return (
                    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                        <h1 className="text-3xl font-bold mb-6">Your Library</h1>

                        {/* Playlists */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Playlists</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {playlists.map(pl => (
                                    <div key={pl.id} className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer" onClick={() => {
                                        playInstantMix({
                                            id: pl.id,
                                            title: pl.name,
                                            color: 'blue',
                                            songs: pl.tracks,
                                            currentSongIndex: 0
                                        });
                                    }}>
                                        <div className="w-full aspect-square bg-neutral-800 rounded-lg mb-3 flex items-center justify-center">
                                            {pl.tracks[0] ? <img src={getArt(pl.tracks[0])} className="w-full h-full object-cover rounded-lg" /> : <Library size={32} className="text-white/20" />}
                                        </div>
                                        <p className="font-bold truncate">{pl.name}</p>
                                        <p className="text-xs text-white/50">{pl.tracks.length} songs</p>
                                    </div>
                                ))}
                                <div className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer flex flex-col items-center justify-center border border-dashed border-white/20" onClick={() => {
                                    const name = prompt("New Playlist Name");
                                    if (name) PlaylistStore.createPlaylist(name);
                                }}>
                                    <Plus size={32} className="text-white/50 mb-2" />
                                    <p className="font-bold text-sm">New Playlist</p>
                                </div>
                            </div>
                        </div>

                        {/* Downloads */}
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Download size={20} />
                                Downloads
                            </h2>
                            {downloads.length === 0 ? (
                                <div className="text-center opacity-50 py-10">
                                    <p>No downloaded songs yet.</p>
                                </div>
                            ) : (
                                downloads.map((item, i) => (
                                    <TrackRow
                                        key={item.id}
                                        index={i + 1}
                                        track={item}
                                        colors={c}
                                        isPlaying={false}
                                        onPlay={() => handlePlay(item.original, downloads.map(d => d.original))}
                                    />
                                ))
                            )}
                        </div>
                    </div>
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
                            setActiveChart(chart);
                            setActiveView('chart-detail');
                        }}
                        onOpenPlaylist={(playlist) => {
                            setActivePlaylistDetail(playlist);
                            setActiveView('playlist-detail');
                        }}
                        onOpenAlbum={(album) => navigateToAlbum(album?.id || album)}
                        onResumeSong={(track, position) => {
                            // Resume playback from position
                            handlePlay(track.song);
                            // Position seek handled by playback context
                        }}
                    />
                );
            case 'artist':
                return activeArtist ? (
                    <ArtistView
                        artistName={activeArtist}
                        colors={c}
                        onBack={() => setActiveView('home')}
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
                        onBack={() => setActiveView('home')}
                        onPlay={handlePlay}
                    />
                ) : null;
            case 'now-playing': // New Layout
                return currentSong ? (
                    <NowPlayingOverlay
                        song={currentSong}
                        nextSong={(activeMix?.songs || [])[(activeMix?.currentSongIndex || 0) + 1]}
                        quality={activeQuality || currentTrack?.preferredQuality || '320'}
                        onClose={() => setActiveView('home')}
                        playback={{
                            isPlaying, togglePlay, next, prev,
                            progress, duration, seek,
                            shuffle, setShuffle, repeat, setRepeat,
                            toggleLike, isLiked: (id: string) => likedSongs.some(s => s.id === id)
                        }}
                        onAddToOTG={addToOTG}
                    />
                ) : <div className="flex-1 flex items-center justify-center text-white/50">No song playing</div>;
            case 'chart-detail':
                return activeChart ? (
                    <ChartDetailScreen
                        chartId={activeChart.id}
                        chartTitle={activeChart.title || activeChart.name}
                        chartImage={activeChart.image}
                        colors={c}
                        onBack={() => setActiveView('home')}
                        onPlay={handlePlay}
                    />
                ) : null;
            case 'playlist-detail':
                return activePlaylistDetail ? (
                    <PlaylistScreen
                        playlistId={activePlaylistDetail.id}
                        playlistTitle={activePlaylistDetail.title || activePlaylistDetail.name}
                        playlistImage={activePlaylistDetail.image}
                        colors={c}
                        onBack={() => setActiveView('home')}
                    />
                ) : null;
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500 relative" style={{ backgroundColor: '#000', color: c.text }}>

            {/* === AMBIENT BACKGROUND GLOWS REMOVED === */}

            {/* === TOP SECTION (Sidebar + Main + Right Panel) === */}
            <div className="flex-1 flex overflow-hidden z-10 relative">

                {/* --- LEFT SIDEBAR (GLASS) --- */}
                <aside
                    className="w-60 flex-shrink-0 flex flex-col border-r p-5 transition-colors"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    {/* Logo */}
                    <div className="flex items-center mb-8 pl-1">
                        <span className="text-2xl font-bold tracking-tighter uppercase font-display text-white">Melora Tunes</span>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-1">
                        <NavItem icon={<Home size={20} />} label="Home" active={activeView === 'home'} colors={c} onClick={() => setActiveView('home')} />
                        <NavItem icon={<Search size={20} />} label="Search" active={activeView === 'search'} colors={c} onClick={() => setActiveView('search')} />
                        <NavItem icon={<Compass size={20} />} label="Explore" active={activeView === 'explore'} colors={c} onClick={() => setActiveView('explore')} />

                        <div className="my-2 border-t border-white/5" />
                        <NavItem icon={<Library size={20} />} label="Library" active={activeView === 'library'} colors={c} onClick={() => setActiveView('library')} />
                    </nav>

                    <div className="mt-8 mb-3 flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: c.textMuted }}>Library</span>
                        <Plus
                            size={14}
                            style={{ color: c.textMuted }}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => {
                                const name = prompt('Playlist name:');
                                if (name?.trim()) {
                                    PlaylistStore.createPlaylist(name.trim());
                                }
                            }}
                        />
                    </div>



                    {/* Playlist List */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden mask-gradient-b">
                        <PlaylistItem
                            icon={<Heart size={14} />}
                            title="Liked Songs"
                            subtitle={`${likedSongs?.length || 0} songs`}
                            colors={c}
                            active={activeMixId === 'liked-songs'}
                            onClick={() => {
                                if (likedSongs && likedSongs.length > 0) {
                                    const mix: Mix = {
                                        id: 'liked-songs',
                                        title: 'Liked Songs',
                                        color: 'pink',
                                        songs: likedSongs.map(s => ensurePlayableTrack(s)),
                                        currentSongIndex: 0
                                    };
                                    playInstantMix(mix);
                                }
                            }}
                        />
                        {playlists.filter(pl => pl.id !== 'discovery-mix').map(pl => (
                            <PlaylistItem
                                key={pl.id}
                                title={pl.name}
                                subtitle={`${pl.tracks.length} songs`}
                                colors={c}
                                active={activeMixId === pl.id}
                                onClick={() => {
                                    if (pl.tracks.length > 0) {
                                        const mix: Mix = {
                                            id: pl.id,
                                            title: pl.name,
                                            color: 'blue',
                                            songs: pl.tracks,
                                            currentSongIndex: 0
                                        };
                                        playInstantMix(mix);
                                    }
                                }}
                            />
                        ))}
                        {playlists.length === 0 && (
                            <p className="text-[10px] text-center opacity-50 mt-4">No playlists yet</p>
                        )}
                    </div>

                    <div className="pt-4 mt-2 border-t flex justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity" style={{ borderColor: c.border }}>
                        <button
                            onClick={() => setIsLangModalOpen(true)}
                            className="w-4 h-4 rounded flex items-center justify-center border border-gray-500 hover:border-white text-gray-500 hover:text-white transition-colors"
                            title="Music Languages"
                        >
                            <Globe size={10} />
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('melora-setup-complete');
                                window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: 'WELCOME' }));
                            }}
                            className="w-4 h-4 rounded flex items-center justify-center border border-gray-500 hover:border-white text-gray-500 hover:text-white transition-colors"
                            title="Switch Mode"
                        >
                            <Monitor size={10} />
                        </button>
                        <button onClick={() => onThemeChange('midnight')} className={`w-4 h-4 rounded-full bg-black border ${theme === 'midnight' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border-gray-600'}`} />
                        <button onClick={() => onThemeChange('polar')} className={`w-4 h-4 rounded-full bg-white border ${theme === 'polar' ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'border-gray-300'}`} />
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView + (activeArtist || '') + (activeAlbum || '')}
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
                <aside
                    className="w-64 flex-shrink-0 border-l p-4 flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold">Recent Played</span>
                        <span className="text-[10px] cursor-pointer hover:underline font-medium" style={{ color: c.textMuted }}>See All</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {recent.length === 0 && (
                            <p className="text-xs text-center opacity-50 mt-4">No recent songs</p>
                        )}
                        {recent.slice(0, 20).map(item => (
                            <motion.div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer group relative"
                                style={{ backgroundColor: 'transparent' }}
                                whileHover={{
                                    backgroundColor: c.accentSoft,
                                    x: 2
                                }}
                                onClick={() => handlePlay(item.track)}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                                {/* Album Art with Play Overlay */}
                                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                    {getArt(item.track.song) ? (
                                        <img
                                            src={getArt(item.track.song)}
                                            alt={item.track.song.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full" style={{ backgroundColor: c.border }} />
                                    )}
                                    {/* Play overlay on hover */}
                                    <motion.div
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Play size={16} fill="#fff" color="#fff" />
                                    </motion.div>
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate hover:underline" onClick={() => navigateToArtist(item.track.song.primaryArtists)}>{item.track.song.name}</p>
                                    <p className="text-[10px] truncate hover:text-white transition-colors" style={{ color: c.textMuted }} onClick={() => navigateToArtist(item.track.song.primaryArtists)}>{item.track.song.primaryArtists}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Downloads / Offline Card */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                                    <Download size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-white group-hover:text-white transition-colors">Downloads</p>
                                    <p className="text-[10px] text-white/50 font-mono tracking-wider">OFFLINE</p>
                                </div>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-white w-3/4 rounded-full opacity-50" />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* === BOTTOM PLAYER BAR === */}
            {/* === FLOATING GLASS PLAYER === */}
            {activeView !== 'now-playing' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="pointer-events-auto h-20 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex items-center px-2 pr-8 gap-4 overflow-visible"
                        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                    >
                        {/* Art & Info */}
                        <div className="flex items-center gap-4 w-1/3">
                            <div className="w-16 h-16 rounded-full overflow-hidden relative group flex-shrink-0 border border-white/5 ml-1">
                                {currentSong && getArt(currentSong) ? (
                                    <img src={getArt(currentSong)} alt={currentSong.name} className="w-full h-full object-cover animate-[spin_10s_linear_infinite]" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center"><Disc className="opacity-20" /></div>
                                )}
                                {/* Center Dot for Vinyl Look */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full bg-black/80 backdrop-blur-sm" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-white truncate cursor-pointer hover:underline" onClick={() => setActiveView('now-playing')}>{currentSong?.name || 'Not Playing'}</p>
                                    {/* Quality Badge - Use activeQuality for accurate streaming quality */}
                                    {currentSong && <QualityBadge quality={activeQuality || currentTrack?.preferredQuality || '320'} />}
                                </div>
                                <p className="text-xs text-white/50 truncate hover:text-white transition-colors cursor-pointer">{currentSong?.primaryArtists || 'Select a song'}</p>
                            </div>
                        </div>

                        {/* Controls (Center) */}
                        <div className="flex flex-col items-center justify-center gap-1 flex-1">
                            <div className="flex items-center gap-6">
                                <SkipBack size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={prev} />

                                {/* White Play Button */}
                                <motion.button
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-shadow"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={togglePlay}
                                >
                                    {isPlaying ? <Pause size={20} fill="black" className="text-black" /> : <Play size={20} fill="black" className="text-black ml-0.5" />}
                                </motion.button>

                                <SkipForward size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={next} />
                            </div>

                            {/* Progress Bar - Enhanced */}
                            <div className="w-72 flex items-center gap-2 group">
                                <span className="text-[9px] text-white/50 font-mono w-7 text-right">{Math.floor(progress / 60)}:{(Math.floor(progress) % 60).toString().padStart(2, '0')}</span>
                                <div
                                    className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden group-hover:h-2 transition-all"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pct = (e.clientX - rect.left) / rect.width;
                                        seek(pct);
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-white origin-left transform transition-transform" style={{ transform: `scaleX(${duration > 0 ? progress / duration : 0})` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${duration > 0 ? (progress / duration) * 100 : 0}% `, transform: 'translateX(-50%) translateY(-50%)' }} />
                                </div>
                                <span className="text-[9px] text-white/50 font-mono w-7">{Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Volume (Right) */}
                        <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
                            <div className="flex items-center gap-2 group">
                                <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/60 hover:text-white transition-colors">
                                    {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                                </button>
                                <div
                                    className="w-20 h-1 bg-white/10 rounded-full cursor-pointer relative"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const vol = (e.clientX - rect.left) / rect.width;
                                        setVolume(Math.max(0, Math.min(1, vol)));
                                    }}
                                >
                                    <div className="h-full bg-white rounded-full relative" style={{ width: `${volume * 100}% ` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveView('now-playing')} className="p-2 ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                <Maximize2 size={18} />
                            </button>
                            {currentSong && (
                                <Heart
                                    size={18}
                                    className={`cursor-pointer transition-all ${isLiked(currentSong.id) ? 'text-[#e91e63] fill-[#e91e63]' : 'text-white/40 hover:text-white'}`}
                                    onClick={() => toggleLike(currentSong)}
                                />
                            )}
                            <MoreHorizontal size={18} className="text-white/40 hover:text-white cursor-pointer" />
                        </div>
                    </motion.div>
                </div>
            )}
            {/* End of Floating Player */}

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
                                DJ is Mixing...
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Add to style in head or global loop
const style = `
@keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;




