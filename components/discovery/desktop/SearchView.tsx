import React from "react";
import { Search } from "lucide-react";
import { WaveLoader } from "./WaveLoader";
import { TrackRow, getArt } from "../DiscoveryShared";

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
    activeView,
    setActiveView,
    lastView,
    colors: c,
    currentSong,
    isPlaying,
    handlePlay
}: SearchViewProps) {
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (e.currentTarget.value === searchQuery) return;
            setSearchQuery(e.currentTarget.value);
            performSearch(e.currentTarget.value);
        }
    };

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
                        // Fix 4: Search clear button to restore lastView safely
                        <button onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            if (['home', 'explore', 'browse', 'library'].includes(lastView)) {
                                setActiveView(lastView);
                            } else {
                                setActiveView('home');
                            }
                        }} className="text-xs opacity-50 hover:opacity-100">Clear</button>
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
}
