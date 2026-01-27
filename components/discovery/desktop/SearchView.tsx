import React, { useRef } from "react";
import { Search } from "lucide-react";
import { WaveLoader } from "./WaveLoader";
import { TrackRow } from "../DiscoveryShared";

interface SearchViewProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    performSearch: (q: string) => void;
    searchResults: any[];
    setSearchResults: (results: any[]) => void;
    isSearching: boolean;
    setActiveView: (view: string) => void;
    lastView: string;
    colors: any;
    currentSong: any;
    isPlaying: boolean;
    handlePlay: (song: any) => void;
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
    handlePlay
}: SearchViewProps) {

    const lastSubmittedRef = useRef<string>("");

    /* =========================
       SEARCH HANDLERS
    ========================= */

    const submitSearch = (value: string) => {
        const q = value.trim();
        if (!q) return;

        // Prevent duplicate submissions
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

        // Safe back navigation
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
        <div className="flex-1 flex flex-col overflow-hidden">

            {/* SEARCH BAR */}
            <div
                className="px-6 py-4 sticky top-0 z-20 backdrop-blur-xl"
                style={{
                    backgroundColor: colors.surface,
                    borderBottom: `1px solid ${colors.border}`
                }}
            >
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}
                >
                    <Search size={18} style={{ color: colors.textMuted }} />

                    <input
                        type="text"
                        value={searchQuery}
                        placeholder="Search songs, artists, albums…"
                        className="bg-transparent outline-none text-sm w-full placeholder:text-white/30"
                        style={{ color: colors.text }}
                        autoFocus
                        onChange={(e) => {
                            const v = e.target.value;
                            setSearchQuery(v);
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
                            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* SEARCHING */}
            {isSearching && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <WaveLoader />
                    <p className="text-xs uppercase tracking-widest text-white/40">
                        Searching
                    </p>
                </div>
            )}

            {/* RESULTS */}
            {!isSearching && searchResults.length > 0 && (
                <div className="flex-1 px-6 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    <div className="flex items-end justify-between mb-6 px-2">
                        <h2 className="text-2xl font-bold text-white">Top Results</h2>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">
                            {searchResults.length} songs
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        {searchResults.map((item, i) => {
                            const quality =
                                item.original?.preferredQuality ||
                                item.original?.sources?.[0]?.quality ||
                                "320";

                            return (
                                <TrackRow
                                    key={item.id ?? `${item.title}-${i}`}
                                    index={i + 1}
                                    track={{ ...item, quality }}
                                    colors={colors}
                                    isPlaying={currentSong?.id === item.id && isPlaying}
                                    onPlay={() => handlePlay(item.original)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* NO RESULTS */}
            {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <Search size={48} className="mx-auto mb-4 opacity-40" />
                        <h2 className="text-xl font-bold text-white mb-2">
                            Nothing found
                        </h2>
                        <p className="text-sm text-white/50">
                            Try a different song, artist, or album.
                        </p>
                    </div>
                </div>
            )}

            {/* IDLE */}
            {!isSearching && !searchQuery && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <Search size={48} className="mx-auto mb-4 opacity-40" />
                        <h2 className="text-xl font-bold text-white mb-2">
                            Search Melora
                        </h2>
                        <p className="text-sm text-white/50">
                            Find music in studio-quality audio.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
