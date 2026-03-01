"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Clock, TrendingUp, LayoutGrid, Loader2, Disc, Sparkles, Headphones, Settings, Music, Check, ChevronDown, Download, SearchX, AlertCircle, RefreshCcw } from "lucide-react";

import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { loadSettings, saveSettings } from "@/lib/settings";
import { useSearchHistory } from "@/components/hooks/useSearchHistory";
import { SearchResultItem } from "./SearchResultItem";

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
        background: #000000;
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
    const { loadMix, currentSong, isPlaying, togglePlay, activeMixId, activeQuality, playInstantMix } = usePlayback();
    const { addMix, updateMix, isDownloaded } = useLibrary();

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
        const startIdx = idx >= 0 ? idx : 0;

        const newMix: Mix = {
            id: SEARCH_MIX_ID,
            title: 'Search Results',
            color: 'white',
            songs: tracks,
            currentSongIndex: startIdx
        };

        const added = addMix(newMix);
        if (!added) {
            updateMix(SEARCH_MIX_ID, {
                songs: tracks,
                currentSongIndex: startIdx
            });
        }

        loadMix(SEARCH_MIX_ID, startIdx);
    };

    // VIRTUALIZATION / LIMIT RENDER
    const [renderLimit, setRenderLimit] = useState(10);
    useEffect(() => {
        if (results.length > 0) setRenderLimit(10);
    }, [results]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 300 && renderLimit < results.length) {
            setRenderLimit(prev => Math.min(prev + 10, results.length));
        }
    };


    const trendingSearches = ['Arijit Singh', 'Diljit Dosanjh', 'Taylor Swift', 'Atif Aslam', 'Pritam', 'AR Rahman'];


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
                                background: '#000000', // pure black
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

            <div className="min-h-full p-8" onScroll={handleScroll}>
                {/* Premium Glassy Search Bar + Settings */}
                <div className="max-w-2xl mx-auto mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        {/* Glow effect - Optimized */}
                        <div
                            className="absolute inset-0 rounded-2xl opacity-20"
                            style={{
                                boxShadow: '0 0 60px rgba(255,255,255,0.05)',
                                transform: 'translateY(10px) scaleX(0.9)'
                            }}
                        />

                        <div
                            className="relative flex items-center gap-4 px-6 py-5 rounded-2xl"
                            style={{
                                background: '#000000',
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
                                {results.slice(0, renderLimit).map((track, i) => {
                                    // FIX 2: Check activeMixId for correct icon
                                    const isCurrentPlaying = currentSong?.id === track.id && activeMixId === SEARCH_MIX_ID;

                                    return (
                                        <SearchResultItem
                                            key={track.id + i}
                                            track={track}
                                            index={i}
                                            isCurrentPlaying={isCurrentPlaying}
                                            isPlaying={isPlaying}
                                            activeQuality={activeQuality || undefined}
                                            onClick={() => {
                                                if (currentSong?.id === track.id && activeMixId === SEARCH_MIX_ID) {
                                                    togglePlay();
                                                } else {
                                                    playTrack(track, results);
                                                }
                                            }}
                                        />
                                    );
                                })}
                                {renderLimit < results.length && (
                                    <div className="py-8 flex justify-center opacity-40">
                                        <Loader2 className="animate-spin" size={20} />
                                    </div>
                                )}
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
                            <div className="mt-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <LayoutGrid size={20} className="text-white/30" />
                                    <h2 className="text-lg font-bold text-white/40 tracking-tight">Browse by Mood</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Chill Vibes', query: 'chill vibes', gradient: 'from-teal-900/40 to-teal-950/20' },
                                        { label: 'Party Hits', query: 'party hits', gradient: 'from-pink-900/40 to-pink-950/20' },
                                        { label: 'Romantic', query: 'romantic songs', gradient: 'from-rose-900/40 to-rose-950/20' },
                                        { label: 'Workout', query: 'workout motivation', gradient: 'from-red-900/40 to-red-950/20' },
                                        { label: 'Focus', query: 'focus study music', gradient: 'from-blue-900/40 to-blue-950/20' },
                                        { label: 'Sad Songs', query: 'sad emotional songs', gradient: 'from-indigo-900/40 to-indigo-950/20' },
                                        { label: 'Road Trip', query: 'road trip songs', gradient: 'from-amber-900/40 to-amber-950/20' },
                                        { label: 'Devotional', query: 'devotional bhajan', gradient: 'from-orange-900/40 to-orange-950/20' },
                                    ].map((cat) => (
                                        <motion.button
                                            key={cat.label}
                                            onClick={() => { setQuery(cat.query); handleSearch(cat.query); }}
                                            className={`relative p-5 rounded-2xl text-left overflow-hidden bg-gradient-to-br ${cat.gradient} border border-white/[0.06] hover:border-white/[0.12] transition-all`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="font-bold text-sm text-white/80">{cat.label}</span>
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
