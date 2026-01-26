import React from "react";
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
    activeView: string;
    setActiveView: (view: any) => void;
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
    colors: c,
    currentSong,
    isPlaying,
    handlePlay
}: SearchViewProps) {

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        const value = e.currentTarget.value.trim();
        if (!value || value === searchQuery) return;
        setSearchQuery(value);
        performSearch(value);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search Bar */}
            <div
                className="px-6 py-4 sticky top-0 z-20 backdrop-blur-xl"
                style={{ backgroundColor: c.surface, borderBottom: `1px solid ${c.border}` }}
            >
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors"
                    style={{ backgroundColor: c.card, borderColor: c.border }}
                >
                    <Search size={18} style={{ color: c.textMuted }} />
                    <input
                        type="text"
                        placeholder="Search songs, artists, albums…"
                        className="bg-transparent outline-none text-sm w-full placeholder:text-white/30"
                        style={{ color: c.text }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        autoFocus
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setActiveView(
                                    ['home', 'explore', 'browse', 'library'].includes(lastView)
                                        ? lastView
                                        : 'home'
                                );
                            }}
                            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Searching */}
            {isSearching && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <WaveLoader />
                    <p className="text-xs uppercase tracking-widest text-white/40">
                        Searching
                    </p>
                </div>
            )}

            {/* Results */}
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
                                item.original?.sources?.[0]?.quality ||
                                item.original?.preferredQuality ||
                                '320';

                            return (
                                <TrackRow
                                    key={item.id}
                                    index={i + 1}
                                    track={{ ...item, quality }}
                                    colors={c}
                                    isPlaying={currentSong?.id === item.id && isPlaying}
                                    onPlay={() => handlePlay(item.original)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* No Results */}
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

            {/* Idle */}
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
