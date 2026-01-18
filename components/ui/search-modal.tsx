"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUnified, GroupedSong } from '@/lib/unified-search';
import { JioSaavnSong, getThumbnailUrl } from '@/lib/jiosaavn';
import { X, Search, Plus, Check, Music, Loader2, Disc3, Headphones, PlayCircle } from 'lucide-react';
import { decodeHtml } from '@/lib/utils';
import Image from 'next/image';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSong: (song: JioSaavnSong) => void;
    favorites: Set<string>;
    onToggleFavorite: (song: JioSaavnSong) => void;
}

// Quality badge colors - same as UnifiedSearch
const QUALITY_COLORS: Record<string, string> = {
    '24-bit': 'bg-amber-500 text-black',
    'FLAC': 'bg-purple-500 text-white',
    '320kbps': 'bg-green-500 text-white',
    '128kbps': 'bg-gray-500 text-white'
};

const QUALITY_ORDER = ['24-bit', 'FLAC', '320kbps', '128kbps'] as const;
const QUALITY_LABELS: Record<string, string> = {
    '24-bit': 'Hi-Res',
    'FLAC': 'FLAC',
    '320kbps': 'HQ',
    '128kbps': 'SD'
};

export function SearchModal({ isOpen, onClose, onAddSong, favorites, onToggleFavorite }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GroupedSong[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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

    const handleAdd = (song: JioSaavnSong) => {
        onAddSong(song);
        setAddedSongs(prev => new Set(prev).add(song.id));
        if (query.trim()) saveHistory(query.trim());
    };

    const handleQualityClick = (group: GroupedSong, quality: string) => {
        const song = group.qualities[quality as keyof typeof group.qualities];
        if (song) {
            // Add quality tag to song so it shows in UI
            const songWithQuality = {
                ...song,
                _quality: quality,
                _qualityTier: quality === '24-bit' ? 0 : quality === 'FLAC' ? 1 : quality === '320kbps' ? 2 : 3
            };
            handleAdd(songWithQuality as JioSaavnSong);
        }
    };

    const getAvailableQualities = (group: GroupedSong): string[] => {
        return QUALITY_ORDER.filter(q => group.qualities[q]);
    };

    // Debounced unified search
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setIsLoading(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await searchUnified(query, 'song');
                setResults(data);
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setIsLoading(false);
            }
        }, 400);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [query]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setAddedSongs(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-black/90 border border-white/10 rounded-3xl shadow-[0_0_100px_-20px_rgba(255,255,255,0.05)] overflow-hidden max-h-[85vh] flex flex-col backdrop-blur-2xl"
                >
                    {/* Header - Premium Minimalist */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                                <Search size={16} strokeWidth={3} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight leading-none">Global Search</h2>
                                <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase">Unify • Discover • Play</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Input Area */}
                    <div className="p-6 pb-2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search the sonic universe..."
                                className="w-full pl-12 pr-12 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-900 focus:border-white/10 transition-all font-medium relative z-10"
                                autoFocus
                            />
                            {isLoading && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" size={20} />
                            )}
                        </div>

                        {/* Recent Searches - Minimal Chips */}
                        <AnimatePresence>
                            {recentSearches.length > 0 && !query && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 flex gap-2 flex-wrap"
                                >
                                    {recentSearches.map(term => (
                                        <button
                                            key={term}
                                            onClick={() => setQuery(term)}
                                            className="text-[11px] font-medium bg-white/5 text-zinc-400 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                                        >
                                            <span className="opacity-50 mr-1">↺</span> {term}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 [&::-webkit-scrollbar]:hidden">
                        {isLoading && (
                            <div className="flex flex-col justify-center items-center py-20 gap-8">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    {/* Ambient Glow */}
                                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse"></div>

                                    {/* Rotating Disc */}
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                                        className="relative z-10 text-white"
                                    >
                                        <Disc3 size={48} strokeWidth={1.5} />
                                    </motion.div>

                                    {/* Floating Icons Orbiting */}
                                    <motion.div
                                        animate={{ y: [-5, 5, -5], x: [-10, -10, -10], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute -top-4 -left-4 text-zinc-400"
                                    >
                                        <Headphones size={20} />
                                    </motion.div>

                                    <motion.div
                                        animate={{ y: [5, -5, 5], x: [10, 10, 10], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                        className="absolute -bottom-2 -right-4 text-zinc-400"
                                    >
                                        <Music size={20} />
                                    </motion.div>

                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        className="absolute top-8 -right-8 text-zinc-500"
                                    >
                                        <PlayCircle size={16} />
                                    </motion.div>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-xs text-white font-bold tracking-[0.3em] uppercase animate-pulse">Scanning Frequencies</p>
                                    <div className="flex gap-1 h-1">
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{ height: [4, 12, 4], backgroundColor: ["#333", "#fff", "#333"] }}
                                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                                                className="w-0.5 bg-zinc-700 rounded-full"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && query.trim().length >= 2 && (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                <Music size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No signals found in deep space.</p>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && query.trim().length < 2 && (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/5">
                                    <Search size={32} className="opacity-40" />
                                </div>
                                <p className="font-medium text-zinc-500">Awaiting Input</p>
                                <div className="mt-4 flex gap-4 text-xs font-bold tracking-widest uppercase text-zinc-700">
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Hi-Res</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> FLAC</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> HQ</span>
                                </div>
                            </div>
                        )}

                        {!isLoading && results.length > 0 && (
                            <div className="space-y-1">
                                {results.map((group, idx) => {
                                    const imageUrl = group.image?.[0]?.link || '';
                                    const qualities = getAvailableQualities(group);
                                    const bestSong = group.qualities[group.bestQuality as keyof typeof group.qualities];
                                    const isAdded = bestSong && addedSongs.has(bestSong.id);

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            key={group.key}
                                            className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300"
                                        >
                                            {/* Album Art */}
                                            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 shadow-lg group-hover:shadow-xl transition-all">
                                                {imageUrl && (
                                                    <Image
                                                        src={imageUrl}
                                                        alt={group.name}
                                                        width={56}
                                                        height={56}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    />
                                                )}
                                                {/* Play Overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Music size={16} className="text-white" />
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-zinc-200 group-hover:text-white truncate transition-colors text-[15px]">{decodeHtml(group.name)}</h3>
                                                <p className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate mt-0.5 font-medium">{decodeHtml(group.primaryArtists)}</p>
                                            </div>

                                            {/* Quality Badges */}
                                            <div className="flex gap-1 flex-shrink-0">
                                                {qualities.map(q => (
                                                    <button
                                                        key={q}
                                                        onClick={() => handleQualityClick(group, q)}
                                                        className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${QUALITY_COLORS[q]} hover:brightness-110 active:scale-95 transition-all shadow-lg`}
                                                        title={`Add in ${q}`}
                                                    >
                                                        {QUALITY_LABELS[q]}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {bestSong && (
                                                    <button
                                                        onClick={() => onToggleFavorite(bestSong)}
                                                        className={`p-2 rounded-full transition-all hover:bg-white/10 ${favorites.has(bestSong.id)
                                                            ? 'text-red-500 scale-110'
                                                            : 'text-zinc-500 hover:text-white'
                                                            }`}
                                                    >
                                                        <span className="text-sm">{favorites.has(bestSong.id) ? '❤️' : '♡'}</span>
                                                    </button>
                                                )}

                                                {/* Add Best Quality Button */}
                                                {bestSong && (
                                                    <button
                                                        onClick={() => {
                                                            const bestQ = group.bestQuality;
                                                            const songWithQuality = {
                                                                ...bestSong,
                                                                _quality: bestQ,
                                                                _qualityTier: bestQ === '24-bit' ? 0 : bestQ === 'FLAC' ? 1 : bestQ === '320kbps' ? 2 : 3
                                                            };
                                                            handleAdd(songWithQuality as JioSaavnSong);
                                                        }}
                                                        disabled={isAdded}
                                                        className={`h-9 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg ${isAdded
                                                            ? 'bg-zinc-800 text-zinc-500 cursor-default'
                                                            : 'bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95'
                                                            }`}
                                                    >
                                                        {isAdded ? (
                                                            <>Added <Check size={14} /></>
                                                        ) : (
                                                            <>Add ✨</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
