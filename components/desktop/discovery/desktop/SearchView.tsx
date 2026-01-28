import React, { useRef, useEffect } from "react";
import { Search, X, Disc } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WaveLoader } from "./WaveLoader";
import { TrackRow, DiscoveryThemeColors } from "../DiscoveryShared";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { QualitySelector, QualityFilterType } from "@/components/ui/quality-selector";

interface SearchViewProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    performSearch: (q: string) => void;
    searchResults: JioSaavnSong[];
    setSearchResults: (results: JioSaavnSong[]) => void;
    isSearching: boolean;
    setActiveView: (view: string) => void;
    lastView: string;
    colors: DiscoveryThemeColors;
    currentSong: JioSaavnSong | null;
    isPlaying: boolean;
    handlePlay: (song: any) => void;
    quality: QualityFilterType;
    setQuality: (q: QualityFilterType) => void;
}

export function SearchView({
    searchQuery,
    setSearchQuery,
    performSearch,
    searchResults,
    setSearchResults,
    isSearching,
    setActiveView,
    lastView,
    colors,
    currentSong,
    isPlaying,
    handlePlay,
    quality,
    setQuality,
}: SearchViewProps) {

    const lastSubmittedRef = useRef<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus logic
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    /* =========================
       SEARCH HANDLERS
    ========================= */

    const submitSearch = (value: string) => {
        const q = value.trim();
        if (!q) return;

        // Prevent duplicate submissions to API
        if (q === lastSubmittedRef.current) return;

        lastSubmittedRef.current = q;
        setSearchQuery(q);
        performSearch(q);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            submitSearch(e.currentTarget.value);
        }
    };

    const handleClear = () => {
        lastSubmittedRef.current = "";
        setSearchQuery("");
        setSearchResults([]);
        // Don't auto-navigate back on clear, just reset state.
        // Let user decide to go back or type again.
        if (inputRef.current) inputRef.current.focus();
    };

    const handleBack = () => {
        setActiveView(
            ["home", "explore", "browse", "library"].includes(lastView)
                ? lastView
                : "home"
        );
    };

    /* =========================
       RENDER
    ========================= */

    return (
        <div className="flex-1 flex flex-col h-full bg-black/50 backdrop-blur-3xl relative overflow-hidden">

            {/* SEARCH HEADER */}
            <div
                className="px-6 py-4 sticky top-0 z-30 flex items-center gap-4"
                style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: `linear-gradient(to bottom, ${colors.surface} 0%, transparent 100%)`
                }}
            >
                <div
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors duration-300 focus-within:border-white/40"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}
                >
                    <Search size={18} style={{ color: colors.textMuted }} />

                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        placeholder="What do you want to listen to?"
                        className="bg-transparent outline-none text-sm w-full font-medium placeholder:text-white/30"
                        style={{ color: colors.text }}
                        onChange={(e) => {
                            const v = e.target.value;
                            setSearchQuery(v);
                            // Clear results immediately on empty input
                            if (!v.trim()) {
                                lastSubmittedRef.current = "";
                                setSearchResults([]);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                    />

                    {searchQuery && (
                        <button
                            onClick={handleClear}
                            className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <QualitySelector value={quality} onChange={setQuality} />
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                <AnimatePresence mode="wait">

                    {/* LOADING STATE */}
                    {isSearching && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/40"
                        >
                            <WaveLoader />
                            <span className="text-xs uppercase tracking-widest animate-pulse">Searching...</span>
                        </motion.div>
                    )}

                    {/* RESULTS STATE */}
                    {!isSearching && searchResults.length > 0 && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="px-6 pb-32"
                        >
                            <div className="flex items-center justify-between py-6 sticky top-0 bg-transparent z-10">
                                <h2 className="text-xl font-bold text-white">Top Results</h2>
                                <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-1 rounded-md">
                                    {searchResults.length} FOUND
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                {searchResults.map((item, i) => {
                                    // Quality badges are NOT shown in search results.
                                    // Quality is only known after playback resolution (activeQuality).

                                    const playable = item as any;
                                    // HONEST BADGE: Only show if we actually HAVE the source
                                    const hasHiRes = playable.sources?.some((s: any) => s.quality === 'hires');
                                    const hasFlac = playable.sources?.some((s: any) => s.quality === 'flac');

                                    const qualityBadge = hasHiRes ? 'hires' : (hasFlac ? 'flac' : undefined);

                                    return (
                                        <TrackRow
                                            key={item.id || `search-${i}`}
                                            index={i + 1}
                                            track={{ ...item, quality: qualityBadge } as any}
                                            colors={colors}
                                            isPlaying={currentSong?.id === item.id && isPlaying}
                                            onPlay={() => handlePlay(item)}
                                        />
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* NO RESULTS STATE */}
                    {!isSearching && searchQuery && searchResults.length === 0 && (
                        <motion.div
                            key="no-results"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                        >
                            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <Search size={40} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                            <p className="text-white/40 max-w-xs text-sm">
                                We couldn't find any songs matching "{searchQuery}". Try searching for an artist or album name.
                            </p>
                        </motion.div>
                    )}

                    {/* IDLE STATE */}
                    {!isSearching && !searchQuery && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                        >
                            <div className="w-24 h-24 rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/10 flex items-center justify-center mb-6 ring-1 ring-white/10">
                                <Disc size={40} className="text-white/30 animate-[spin_10s_linear_infinite]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Play whatever you want</h3>
                            <p className="text-white/40 max-w-xs text-sm">
                                Search for songs, unknown artists, albums, or even lyrics.
                            </p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
