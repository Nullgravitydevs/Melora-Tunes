"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchSongs, JioSaavnSong, getThumbnailUrl } from '@/lib/jiosaavn';
import { X, Search, Plus, Check, Music } from 'lucide-react';
import { decodeHtml } from '@/lib/utils';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSong: (song: JioSaavnSong) => void;
    favorites: Set<string>;
    onToggleFavorite: (song: JioSaavnSong) => void;
}

export function SearchModal({ isOpen, onClose, onAddSong, favorites, onToggleFavorite }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<JioSaavnSong[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load history
    useEffect(() => {
        const saved = localStorage.getItem('melora-search-history');
        if (saved) setRecentSearches(JSON.parse(saved));
    }, []);

    const saveHistory = (term: string) => {
        const newHistory = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
        setRecentSearches(newHistory);
        localStorage.setItem('melora-search-history', JSON.stringify(newHistory));
    };

    const handleSearch = (term: string) => {
        setQuery(term);
        saveHistory(term); // This usage seems redundant if useEffect debounces, but useful for chips
    };

    const handleAdd = (song: JioSaavnSong) => {
        onAddSong(song);
        setAddedSongs(prev => new Set(prev).add(song.id));
        if (query.trim()) saveHistory(query.trim());
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 2) {
                setIsLoading(true);
                const searchQuery = query;
                const songs = await searchSongs(searchQuery);
                setResults(songs);
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="w-full max-w-2xl bg-retro-black border-4 border-retro-white rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b-4 border-retro-white bg-retro-black">
                        <h2 className="text-xl font-retro text-retro-white uppercase tracking-wider">Search Songs</h2>
                        <button
                            onClick={onClose}
                            className="text-retro-gray hover:text-retro-white transition-colors p-2 hover:bg-retro-white/10 rounded"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-4 border-b-2 border-retro-gray/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-retro-gray" size={20} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type song name..."
                                className="w-full pl-10 pr-4 py-3 bg-black border-2 border-retro-gray rounded text-retro-white placeholder-retro-gray/50 focus:outline-none focus:ring-2 focus:ring-retro-white focus:border-retro-white font-mono"
                                autoFocus
                            />
                        </div>
                        {/* Recent Searches Chips */}
                        {recentSearches.length > 0 && !query && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                                {recentSearches.map(term => (
                                    <button
                                        key={term}
                                        onClick={() => setQuery(term)}
                                        className="text-xs bg-retro-gray/20 text-retro-gray px-2 py-1 rounded hover:bg-retro-white hover:text-black transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-4 bg-retro-black">
                        {isLoading && (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-retro-white font-mono animate-pulse">SEARCHING...</div>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && query.trim().length > 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-retro-gray">
                                <Music size={48} className="mb-4 opacity-50" />
                                <p className="font-mono">NO SONGS FOUND</p>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && query.trim().length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-retro-gray">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p className="font-mono">TYPE TO SEARCH</p>
                            </div>
                        )}

                        {!isLoading && results.length > 0 && (
                            <div className="space-y-2">
                                {results.map((song) => (
                                    <div
                                        key={song.id}
                                        className="flex items-center gap-4 p-3 rounded border-2 border-retro-gray/30 hover:border-retro-white hover:bg-retro-white/5 transition-all group"
                                    >
                                        <img
                                            src={getThumbnailUrl(song)}
                                            alt={song.name}
                                            className="w-12 h-12 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-retro-white truncate">{decodeHtml(song.name)}</h3>
                                            <p className="text-sm text-retro-gray truncate font-mono">{decodeHtml(song.primaryArtists)}</p>
                                        </div>

                                        {/* Favorite Button */}
                                        <button
                                            onClick={() => onToggleFavorite(song)}
                                            className={`p-2 rounded transition-colors ${favorites.has(song.id) ? 'text-red-500' : 'text-retro-gray hover:text-white'}`}
                                        >
                                            <span className="text-xl">{favorites.has(song.id) ? '❤️' : '🤍'}</span>
                                        </button>

                                        <button
                                            onClick={() => handleAdd(song)}
                                            disabled={addedSongs.has(song.id)}
                                            className={`p-2 rounded transition-colors font-bold ${addedSongs.has(song.id)
                                                ? 'bg-green-600 text-black'
                                                : 'bg-retro-white text-retro-black hover:bg-retro-white/80'
                                                }`}
                                        >
                                            {addedSongs.has(song.id) ? <Check size={20} /> : <Plus size={20} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
