"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchUnified, SearchType } from '@/lib/unified-search';
import { PlayableTrack, PlayableSource, AudioQuality } from '@/lib/types';
import { JioSaavnSong } from '@/lib/jiosaavn';
import { decodeHtml } from '@/lib/utils';
import Image from 'next/image';

interface UnifiedSearchProps {
    onSongSelect: (track: PlayableTrack) => void; // Changed to accept full track
    onAlbumSelect?: (album: any) => void;
    onArtistSelect?: (artistName: string) => void;
    placeholder?: string;
    className?: string;
    showFilters?: boolean;
    autoFocus?: boolean;
}

// Quality badge colors
const QUALITY_COLORS: Record<string, string> = {
    'hires': 'bg-amber-500 text-black',
    'flac': 'bg-purple-500 text-white',
    '320': 'bg-green-500 text-white',
    '160': 'bg-gray-500 text-white',
    '96': 'bg-gray-500 text-white'
};

const QUALITY_ORDER: AudioQuality[] = ['hires', 'flac', '320', '160', '96'];

export function UnifiedSearch({
    onSongSelect,
    onAlbumSelect,
    onArtistSelect,
    placeholder = "Search songs, albums, artists...",
    className = "",
    showFilters = true,
    autoFocus = false
}: UnifiedSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlayableTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [filter, setFilter] = useState<SearchType>('all');
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                // Return type is Promise<PlayableTrack[]>
                const data = await searchUnified(query, filter);
                setResults(data);
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [query, filter]);

    const handleSongClick = useCallback((track: PlayableTrack, overrideQuality?: AudioQuality) => {
        // If user clicks a specific badge, we might want to override the preferred quality
        // But for simplicity in this architecture, we pass the track. 
        // We can clone the track with new preferredQuality if needed.
        if (overrideQuality) {
            const newTrack = { ...track, preferredQuality: overrideQuality, isExplicitPreference: true };
            onSongSelect(newTrack);
        } else {
            onSongSelect(track);
        }
    }, [onSongSelect]);

    const getAvailableQualities = (track: PlayableTrack): AudioQuality[] => {
        // Get unique qualities available in sources
        const unique = new Set(track.sources.map(s => s.quality));
        // Sort by order
        return QUALITY_ORDER.filter(q => unique.has(q));
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/30 transition-colors"
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                )}
                {isSearching && (
                    <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />
                )}
            </div>

            {/* Filter Pills */}
            {showFilters && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {(['all', 'songs', 'albums', 'artists'] as SearchType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f
                                ? 'bg-white text-black'
                                : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Results */}
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                {results.map((track) => (
                    <div
                        key={track.id}
                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer group"
                        onClick={() => handleSongClick(track)}
                    >
                        {/* Album Art */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                            {track.song.image?.[0]?.link && (
                                <Image
                                    src={track.song.image[0].link}
                                    alt={track.song.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{decodeHtml(track.song.name)}</p>
                            <p className="text-gray-400 text-sm truncate">{decodeHtml(track.song.primaryArtists)}</p>
                        </div>

                        {/* Quality Badges */}
                        <div className="flex gap-1 flex-shrink-0">
                            {getAvailableQualities(track).map(q => (
                                <button
                                    key={q}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSongClick(track, q);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${QUALITY_COLORS[q]} hover:scale-105 transition-transform`}
                                    title={`Play in ${q}`}
                                >
                                    {q === 'hires' ? 'Hi-Res' : q === 'flac' ? 'FLAC' : q === '320' ? 'HQ' : 'SD'}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {query && !isSearching && results.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        No results found for "{query}"
                    </div>
                )}
            </div>
        </div>
    );
}
