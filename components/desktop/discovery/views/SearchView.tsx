"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Clock, TrendingUp, Grid, Loader2, Disc, Sparkles, Headphones, Settings, Music, Check, ChevronDown, Download, SearchX, AlertCircle, RefreshCcw } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { loadSettings, saveSettings } from "@/lib/settings";
import { useSearchHistory } from "@/components/hooks/useSearchHistory";

/* ============================================================================
   SEARCH VIEW - Premium Glass Design with Unified Search
   Features: FLAC merging, metadata display, quality badges, CD animations
   ============================================================================ */

// CSS for CD spinning animation and glass effects
const SEARCH_STYLES = `
    @keyframes cd-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .cd-spinning {
        animation: cd-spin 3s linear infinite;
    }
    
    @keyframes vinyl-groove {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.5; }
    }
    .vinyl-groove {
        animation: vinyl-groove 2s ease-in-out infinite;
    }
    
    .glass-result {
        background: black;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.25s ease;
    }
    .glass-result:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.5);
    }
    
    .quality-badge {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 3px 6px;
        border-radius: 4px;
        text-transform: uppercase;
    }
    .quality-hires { background: rgba(255, 200, 100, 0.15); color: rgba(255, 200, 100, 0.9); }
    .quality-flac { background: rgba(180, 140, 255, 0.15); color: rgba(180, 140, 255, 0.9); }
    .quality-320 { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.5); }
    .quality-160 { background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.3); }
    .quality-96 { background: rgba(255, 255, 255, 0.02); color: rgba(255, 255, 255, 0.2); }
    
    .source-badge {
        font-size: 8px;
        padding: 2px 5px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .source-jiosaavn { background: rgba(0, 200, 150, 0.12); color: rgba(0, 200, 150, 0.8); }
    .source-tidal { background: rgba(100, 180, 255, 0.12); color: rgba(100, 180, 255, 0.8); }
    .source-qobuz { background: rgba(255, 100, 100, 0.12); color: rgba(255, 100, 100, 0.8); }
`;

interface SearchViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onContextMenu?: (e: React.MouseEvent, song: any) => void;
}

export function SearchView({ onNavigate, onContextMenu }: SearchViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId, activeQuality, isDownloaded, playInstantMix } = usePlayback();

    // FIX 1: Stable search mix ID to prevent memory leak
    const SEARCH_MIX_ID = 'search-results';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlayableTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const { history: recentSearches, addSearch, removeSearch, clearHistory } = useSearchHistory();
    const [showSettings, setShowSettings] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const abortRef = useRef<AbortController | null>(null);

    // Get user's preferred quality from settings
    const [qualityPreference, setQualityPreference] = useState<'hires' | 'flac' | '320' | '160'>('320');
    const [language, setLanguage] = useState<string>('');

    useEffect(() => {
        try {
            const settings = loadSettings();
            if (settings.qualityPreference) {
                const q = settings.qualityPreference;
                if (q === 'flac' || q === 'hires') setQualityPreference(q);
                else if (q === '320') setQualityPreference('320');
                else if (q === '160') setQualityPreference('160');
                else setQualityPreference('320'); // Default to high quality
            }
            if (settings.languages && settings.languages.length > 0) {
                setLanguage(settings.languages[0]);
            }
        } catch (e) { /* ignore */ }
    }, [showSettings]); // Refresh when settings close

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();

    }, []);

    // Debounced unified search
    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }

        // Cancel any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsSearching(true);
        setError(null);
        try {
            // Use the UNIFIED search that merges FLAC sources!
            const qFilter = qualityPreference === 'hires' ? 'hires' : qualityPreference === 'flac' ? 'flac' : '320';
            const tracks = await searchUnified(q, language || undefined, 'song', qFilter);

            // Only update if this request wasn't aborted
            if (!controller.signal.aborted) {
                setResults(tracks);
                if (tracks.length > 0) {
                    addSearch(q);
                }
            }
        } catch {
            if (!controller.signal.aborted) {
                setError("Search failed. Please check your connection.");
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, [qualityPreference, language]);

    const onQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => handleSearch(value), 350);
    };

    // Play track using the PlayableTrack
    const playTrack = (track: PlayableTrack, allTracks?: PlayableTrack[]) => {
        const tracks = allTracks || [track];
        const idx = tracks.findIndex(t => t.id === track.id);

        // Convert PlayableTracks back to songs for the mix
        const songs = tracks.map(t => t.song).filter(Boolean);

        const newMix: Mix = {
            id: SEARCH_MIX_ID,
            title: 'Search Results',
            color: 'white',
            songs: songs as any[],
            currentSongIndex: idx >= 0 ? idx : 0
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(SEARCH_MIX_ID, {
                songs: songs as any[],
                currentSongIndex: idx >= 0 ? idx : 0
            });
        }

        loadMix(SEARCH_MIX_ID);
    };

    // Get quality badge styling
    const getQualityClass = (quality: AudioQuality) => {
        switch (quality) {
            case 'hires': return 'quality-hires';
            case 'flac': return 'quality-flac';
            case '320': return 'quality-320';
            case '160': return 'quality-160';
            default: return 'quality-96';
        }
    };

    // Get quality label
    const getQualityLabel = (quality: AudioQuality) => {
        switch (quality) {
            case 'hires': return 'Hi-Res';
            case 'flac': return 'FLAC';
            case '320': return '320';
            case '160': return '160';
            default: return '96';
        }
    };

    // Format duration
    const formatDuration = (d: number | string | undefined) => {
        const dur = typeof d === 'string' ? parseInt(d) : d;
        if (!dur || isNaN(dur)) return '';
        return `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`;
    };

    const trendingSearches = ['Arijit Singh', 'Diljit Dosanjh', 'Taylor Swift', 'Atif Aslam', 'Pritam', 'AR Rahman'];
    const categories = [
        { label: 'Charts', query: 'Top Charts', color: 'from-white/20 to-white/5', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745' },
        { label: 'New Releases', query: 'New Releases', color: 'from-white/15 to-white/[0.02]', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9' },
        { label: 'Chill', query: 'Chill Lo-fi', color: 'from-white/10 to-white/[0.02]', image: 'https://images.unsplash.com/photo-1514525253344-981c1cad1295' },
        { label: 'Bollywood', query: 'Bollywood Hits', color: 'from-white/15 to-white/5', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4' },
        { label: 'Romance', query: 'Romantic Songs', color: 'from-white/10 to-white/[0.02]', image: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00' },
        { label: 'Party', query: 'Party Hits', color: 'from-white/20 to-white/5', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' },
        { label: 'Devotional', query: 'Devotional', color: 'from-white/10 to-white/[0.02]', image: 'https://images.unsplash.com/photo-1544124499-58912cbddadf' },
        { label: 'Classical', query: 'Classical', color: 'from-white/15 to-white/5', image: 'https://images.unsplash.com/photo-1507838596373-012ba3aa974e' },
    ];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: SEARCH_STYLES }} />

            {/* Audio Quality Dropdown */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-24 left-1/2 -translate-x-1/2 w-72 p-4 rounded-2xl"
                            style={{
                                background: '#09090b', // zinc-950
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Headphones size={16} className="text-white/40" />
                                <p className="text-sm font-semibold">Streaming Quality</p>
                            </div>
                            <div className="space-y-1">
                                {[
                                    { value: 'hires' as const, label: 'Hi-Res Lossless', desc: '24-bit/192kHz' },
                                    { value: 'flac' as const, label: 'Lossless', desc: 'FLAC 16-bit' },
                                    { value: '320' as const, label: 'High', desc: '320kbps' },
                                    { value: '160' as const, label: 'Normal', desc: '160kbps' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setQualityPreference(opt.value);
                                            saveSettings({ qualityPreference: opt.value });
                                            setShowSettings(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${qualityPreference === opt.value
                                            ? 'bg-white/10'
                                            : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-medium">{opt.label}</p>
                                            <p className="text-xs text-white/40">{opt.desc}</p>
                                        </div>
                                        {qualityPreference === opt.value && (
                                            <Check size={16} className="text-white/60" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-white/20 mt-4 text-center">
                                {qualityPreference === 'hires' || qualityPreference === 'flac'
                                    ? 'HiFi search enabled'
                                    : 'Saavn search only'}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="min-h-full p-8">
                {/* Premium Glassy Search Bar + Settings */}
                <div className="max-w-2xl mx-auto mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 rounded-2xl opacity-50"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
                                transform: 'translateY(10px) scaleX(0.9)',
                                filter: 'blur(20px)'
                            }}
                        />

                        <div
                            className="relative flex items-center gap-4 px-6 py-5 rounded-2xl"
                            style={{
                                background: 'black',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {isSearching ? (
                                <Loader2 size={22} className="text-white/50 animate-spin" />
                            ) : (
                                <Search size={22} className="text-white/40" />
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => onQueryChange(e.target.value)}
                                placeholder="Search songs, artists, albums..."
                                className="flex-1 bg-transparent text-xl font-light outline-none placeholder:text-white/20"
                            />
                            {query && (
                                <motion.button
                                    onClick={() => { setQuery(''); setResults([]); }}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={18} className="text-white/40" />
                                </motion.button>
                            )}

                            {/* Settings Button */}
                            <motion.button
                                onClick={() => setShowSettings(true)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Settings size={18} className="text-white/40" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Streaming Quality Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-2 mt-4 text-xs text-white/30"
                    >
                        <Headphones size={12} />
                        <span>
                            {qualityPreference === 'flac' ? 'Lossless (FLAC)' :
                                qualityPreference === 'hires' ? 'Hi-Res Lossless' :
                                    qualityPreference === '160' ? '160kbps' :
                                        '320kbps'}
                        </span>
                        {(qualityPreference === 'flac' || qualityPreference === 'hires') && (
                            <span className="text-white/20">• HiFi search enabled</span>
                        )}
                    </motion.div>
                </div>

                {/* Results or Browse */}
                <AnimatePresence mode="wait">
                    {results.length > 0 ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-4xl mx-auto"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Sparkles size={16} className="text-white/30" />
                                <h2 className="text-sm text-white/40 uppercase tracking-wider">
                                    {results.length} Tracks Found
                                </h2>
                            </div>

                            <div className="space-y-2">
                                {results.map((track, i) => {
                                    // FIX 2: Check activeMixId for correct icon
                                    const isCurrentPlaying = currentSong?.id === track.id && activeMixId === SEARCH_MIX_ID;
                                    const hasFLAC = track.sources.some(s => s.quality === 'flac' || s.quality === 'hires');

                                    return (
                                        <motion.div
                                            key={track.id + i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.025 }}
                                            /* FIX 3: Smart toggle - same song = pause/play, different song = switch */
                                            onClick={() => {
                                                if (currentSong?.id === track.id && activeMixId === SEARCH_MIX_ID) {
                                                    togglePlay();
                                                } else {
                                                    playTrack(track, results);
                                                }
                                            }}
                                            className="glass-result flex items-center gap-4 p-4 rounded-xl cursor-pointer group"
                                        >
                                            {/* CD Art with Vinyl Effect */}
                                            <div className="relative w-16 h-16 flex-shrink-0">
                                                {/* Vinyl Ring */}
                                                <div
                                                    className={`absolute inset-0 rounded-full ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                                                    style={{
                                                        background: 'conic-gradient(from 0deg, rgba(30,30,30,1) 0%, rgba(50,50,50,1) 25%, rgba(30,30,30,1) 50%, rgba(50,50,50,1) 75%, rgba(30,30,30,1) 100%)',
                                                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                                                    }}
                                                >
                                                    <div className="absolute inset-2 rounded-full border border-white/5 vinyl-groove" />
                                                    <div className="absolute inset-4 rounded-full border border-white/5" />
                                                    <div className="absolute inset-6 rounded-full border border-white/5" />
                                                </div>

                                                {/* Album Art (Center Label) */}
                                                <motion.div
                                                    className={`absolute inset-3 rounded-full overflow-hidden ${isCurrentPlaying && isPlaying ? 'cd-spinning' : ''}`}
                                                    style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                                                >
                                                    {track.art ? (
                                                        <img src={track.art} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                                            <Music size={12} className="text-white/30" />
                                                        </div>
                                                    )}
                                                </motion.div>

                                                {/* Center Hole */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black border border-white/10" />

                                                {/* Play Overlay */}
                                                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                                                    <motion.div
                                                        className={`w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-all ${isCurrentPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'}`}
                                                    >
                                                        {isCurrentPlaying && isPlaying ? (
                                                            <Pause size={14} fill="currentColor" />
                                                        ) : (
                                                            <Play size={14} fill="currentColor" className="ml-0.5" />
                                                        )}
                                                    </motion.div>
                                                </div>
                                            </div>

                                            {/* Track Metadata */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`font-medium truncate ${isCurrentPlaying ? 'text-white' : 'text-white/80'}`}>
                                                        {track.title}
                                                    </p>

                                                    {/* Quality Badge - FIX 4: Use activeQuality when current */}
                                                    <span className={`quality-badge ${getQualityClass(isCurrentPlaying && activeQuality ? activeQuality : track.preferredQuality)} flex-shrink-0`}>
                                                        {isCurrentPlaying && activeQuality
                                                            ? activeQuality.toUpperCase()
                                                            : getQualityLabel(track.preferredQuality)}
                                                    </span>

                                                    {/* Merged FLAC indicator - show if FLAC available but not preferred */}
                                                    {hasFLAC && track.preferredQuality !== 'flac' && track.preferredQuality !== 'hires' && (
                                                        <span className="quality-badge quality-flac flex-shrink-0 opacity-60">
                                                            +FLAC
                                                        </span>
                                                    )}

                                                    {/* Downloaded badge */}
                                                    {isDownloaded(track.id) && (
                                                        <span className="flex-shrink-0 text-emerald-400" title="Downloaded">
                                                            <Download size={12} />
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-white/40 truncate mt-0.5">{track.artist}</p>
                                            </div>

                                            {/* Album */}
                                            <p className="text-sm text-white/20 truncate max-w-28 hidden lg:block">
                                                {track.song?.album?.name}
                                            </p>

                                            {/* Duration */}
                                            <div className="text-right flex-shrink-0">
                                                <span className="text-sm text-white/30 tabular-nums">
                                                    {formatDuration(track.duration)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/60">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Search Error</h3>
                            <p className="text-white/40 text-sm mb-6">{error}</p>
                            <button
                                onClick={() => handleSearch(query)}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors text-sm"
                            >
                                <RefreshCcw size={14} />
                                Try Again
                            </button>
                        </motion.div>
                    ) : query && !isSearching ? (
                        <motion.div
                            key="no-results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/20">
                                <SearchX size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">No results for "{query}"</h3>
                            <p className="text-white/40 text-sm">Try searching for something else</p>
                        </motion.div>
                    ) : !query ? (
                        <motion.div
                            key="browse"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="max-w-4xl mx-auto"
                        >
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-white/30" />
                                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Searches</h2>
                                        </div>
                                        {recentSearches.length > 0 && (
                                            <button
                                                onClick={clearHistory}
                                                className="text-white/40 hover:text-white text-xs transition-colors flex items-center gap-1"
                                            >
                                                <X size={12} /> Clear
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {recentSearches.map((term, i) => (
                                            <div key={i} className="group relative">
                                                <button
                                                    onClick={() => { setQuery(term); handleSearch(term); }}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/70 hover:text-white transition-colors border border-white/5"
                                                >
                                                    {term}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeSearch(term); }}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-white/30 rounded-full items-center justify-center hidden group-hover:flex z-10"
                                                >
                                                    <X size={10} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Trending Searches */}
                            <div className="mb-16">
                                <div className="flex items-center gap-2 mb-6">
                                    <TrendingUp size={20} className="text-white/30" />
                                    <h2 className="text-lg font-bold text-white/40 tracking-tight">Trending Now</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {trendingSearches.map((term, i) => (
                                        <motion.button
                                            key={term}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.04 }}
                                            onClick={() => { setQuery(term); handleSearch(term); }}
                                            className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all group"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}
                                            whileHover={{
                                                scale: 1.02,
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)'
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="text-2xl font-black text-white/5 w-6 group-hover:text-white/20 transition-colors">{i + 1}</span>
                                            <span className="font-bold text-white/70 group-hover:text-white transition-colors">{term}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Browse Categories */}
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Grid size={20} className="text-white/30" />
                                    <h2 className="text-lg font-bold text-white/40 tracking-tight">Browse All</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {categories.map((cat, i) => (
                                        <motion.button
                                            key={cat.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.04 }}
                                            onClick={() => onNavigate({ id: 'category-hub', data: cat })}
                                            className={`relative aspect-[16/9] rounded-2xl overflow-hidden p-4 text-left group shadow-xl`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br ${cat.color}`} />
                                            <img
                                                src={cat.image}
                                                alt=""
                                                className="absolute bottom-0 right-0 w-24 h-24 object-cover translate-x-4 translate-y-4 -rotate-12 opacity-40 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500"
                                            />
                                            <span className="relative z-10 text-xl font-bold text-white tracking-tight">{cat.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div >
        </>
    );
}
