"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Clock, TrendingUp, Loader2, Disc, Sparkles, Headphones, Settings, Music, Check, ChevronDown } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { loadSettings, saveSettings } from "@/lib/settings";

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
}

export function SearchView({ onNavigate }: SearchViewProps) {
    const { addMix, updateMix, loadMix, currentSong, isPlaying, togglePlay, activeMixId, activeQuality } = usePlayback();

    // FIX 1: Stable search mix ID to prevent memory leak
    const SEARCH_MIX_ID = 'search-results';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlayableTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
        try {
            const saved = localStorage.getItem('discovery-recent-searches');
            if (saved) setRecentSearches(JSON.parse(saved).slice(0, 8));
        } catch (e) { /* ignore */ }
    }, []);

    // Debounced unified search
    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Use the UNIFIED search that merges FLAC sources!
            const qFilter = qualityPreference === 'hires' ? 'hires' : qualityPreference === 'flac' ? 'flac' : qualityPreference === '320' ? '320' : undefined;
            const tracks = await searchUnified(q, language || undefined, 'song', qFilter);
            setResults(tracks);

            const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
            setRecentSearches(updated);
            localStorage.setItem('discovery-recent-searches', JSON.stringify(updated));
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    }, [recentSearches, qualityPreference, language]);

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
                        {qualityPreference !== '320' && (
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
                                <div className="mb-12">
                                    <div className="flex items-center gap-2 mb-5">
                                        <Clock size={16} className="text-white/30" />
                                        <h2 className="text-sm text-white/40 uppercase tracking-wider">Recent</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {recentSearches.map((term, i) => (
                                            <motion.button
                                                key={term + i}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.04 }}
                                                onClick={() => { setQuery(term); handleSearch(term); }}
                                                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                                whileHover={{
                                                    scale: 1.02,
                                                    background: 'rgba(255, 255, 255, 0.08)'
                                                }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {term}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trending Searches */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <TrendingUp size={16} className="text-white/30" />
                                    <h2 className="text-sm text-white/40 uppercase tracking-wider">Trending</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {trendingSearches.map((term, i) => (
                                        <motion.button
                                            key={term}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => { setQuery(term); handleSearch(term); }}
                                            className="flex items-center gap-5 p-5 rounded-xl text-left transition-all"
                                            style={{
                                                background: 'black',
                                                border: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}
                                            whileHover={{
                                                scale: 1.01,
                                                background: 'rgba(255, 255, 255, 0.05)'
                                            }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <span className="text-3xl font-bold text-white/10">{i + 1}</span>
                                            <span className="font-medium text-white/70">{term}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </>
    );
}
