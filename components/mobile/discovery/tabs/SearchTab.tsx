"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Clock, TrendingUp } from "lucide-react";
import { searchUnified } from "@/lib/unified-search";
import { loadSettings, saveSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props { onNavigate: (v: ViewState) => void }

const TRENDING_SEARCHES = ["Arijit Singh", "Diljit Dosanjh", "Taylor Swift", "Atif Aslam", "Pritam", "AR Rahman", "The Weeknd", "AP Dhillon"];

const BROWSE_CATEGORIES = [
    { query: "top charts", label: "Charts" },
    { query: "new releases 2026", label: "New Releases" },
    { query: "chill vibes", label: "Chill" },
    { query: "bollywood hits", label: "Bollywood" },
    { query: "romance songs", label: "Romance" },
    { query: "party anthems", label: "Party" },
    { query: "devotional", label: "Devotional" },
    { query: "classical", label: "Classical" },
];

export function SearchTab({ onNavigate }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [qualityFilter, setQualityFilter] = useState<string>("auto");
    const [typeFilter, setTypeFilter] = useState<"song" | "album" | "playlist" | "artist">("song");
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
    const { playInstantMix, loadMix, activeMixId, currentSong, isPlaying, togglePlay } = usePlayback();
    const { addMix, updateMix, mixes, addSongToMix } = useLibrary();

    // Load quality preference
    useEffect(() => {
        try {
            const s = loadSettings();
            if (s.qualityPreference) setQualityFilter(s.qualityPreference);
        } catch { }
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }

        // Cancel any previous in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = setTimeout(async () => {
            setIsLoading(true);
            try {
                const settings = loadSettings();
                const lang = (settings.languages || ["english", "hindi"]).join(",");
                const r = await searchUnified(query, lang, typeFilter as any, qualityFilter as any);
                if (!controller.signal.aborted) {
                    setResults(r);
                    if (r.length > 0) addSearch(query.trim());
                }
            } catch { } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }, 350);
        return () => { clearTimeout(timeout); controller.abort(); };
    }, [query, qualityFilter, typeFilter]);

    const handleResultClick = (track: any, index: number) => {
        if (typeFilter === "album") {
            onNavigate({ id: "album", data: track });
            return;
        }
        if (typeFilter === "playlist") {
            onNavigate({ id: "playlist", data: track });
            return;
        }
        if (typeFilter === "artist") {
            onNavigate({ id: "artist", data: track });
            return;
        }

        const mixId = "search-results";
        const existing = mixes.find((m) => m.id === mixId);
        if (existing) {
            updateMix(mixId, { songs: results, currentSongIndex: index });
            loadMix(mixId, index);
        } else {
            addMix({ id: mixId, title: "Search Results", color: "white", songs: results, currentSongIndex: index });
            loadMix(mixId, index);
        }
    };

    const isCurrent = (track: any) => {
        if (!currentSong) return false;
        const tid = track.id || track.song?.id;
        const cid = (currentSong as any).id;
        return tid === cid;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-14 pb-1">
                <h1 className="text-[26px] font-bold text-white tracking-tight mb-4">Search</h1>

                {/* Search input */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Songs, artists, albums..."
                        className="w-full bg-white/[0.05] border border-white/[0.06] py-3 pl-11 pr-10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.12] font-medium transition-colors"
                        autoFocus
                    />
                    {query && (
                        <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full">
                            <X size={12} className="text-white/60" />
                        </button>
                    )}
                </div>

                {/* Quality filter */}
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                    {[
                        { value: "auto", label: "Auto" },
                        { value: "hires", label: "Hi-Res" },
                        { value: "flac", label: "FLAC" },
                        { value: "320", label: "320k" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setQualityFilter(opt.value);
                                saveSettings({ qualityPreference: opt.value as any });
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors
                                ${qualityFilter === opt.value
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-white/40 border-white/[0.06] active:bg-white/[0.06]"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Type filter */}
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                    {[
                        { value: "song", label: "Songs" },
                        { value: "album", label: "Albums" },
                        { value: "playlist", label: "Playlists" },
                        { value: "artist", label: "Artists" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setTypeFilter(opt.value as any)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors
                                ${typeFilter === opt.value
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-white/40 border-white/[0.06] active:bg-white/[0.06]"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results / Default state */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-44">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-7 h-7 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-4">Searching...</span>
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-0.5">
                        {results.map((track, i) => {
                            const current = isCurrent(track);
                            const name = decodeHtml(track.title || track.song?.name || "");
                            const artist = decodeHtml(track.artist || track.song?.primaryArtists || "");
                            const art = track.art || getArt(track.song || track);
                            const quality = track.sources?.some((s: any) => s.quality === 'hires') ? 'hires'
                                : track.sources?.some((s: any) => s.quality === 'flac') ? 'flac'
                                : track.sources?.some((s: any) => s.quality === '320') ? '320'
                                : track.preferredQuality || '320';
                            const duration = track.duration || track.song?.duration || 0;

                                return (
                                    <button
                                        key={(track.id || i) + "-" + i}
                                        onClick={() => current && typeFilter === "song" ? togglePlay() : handleResultClick(track, i)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors ${current && typeFilter === "song" ? "bg-white/[0.03]" : ""}`}
                                    >
                                        <div className={`w-12 h-12 overflow-hidden bg-white/[0.04] flex-shrink-0 relative ${typeFilter === "artist" ? "rounded-full" : "rounded-lg"}`}>
                                            {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                            {current && isPlaying && typeFilter === "song" && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <span className="flex gap-0.5">
                                                        <span className="w-[2px] h-3 bg-white rounded-full animate-pulse" />
                                                        <span className="w-[2px] h-2 bg-white rounded-full animate-pulse delay-75" />
                                                        <span className="w-[2px] h-3.5 bg-white rounded-full animate-pulse delay-150" />
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`text-[13px] font-medium truncate ${current && typeFilter === "song" ? "text-white" : "text-white/80"}`}>{name}</p>
                                                {quality && typeFilter === "song" && <QualityBadge quality={quality} variant="mini" />}
                                            </div>
                                            <p className="text-[11px] text-white/30 truncate mt-0.5">{artist}</p>
                                        </div>
                                        {typeFilter === "song" && (
                                            <span className="text-[10px] text-white/15 font-mono flex-shrink-0">
                                                {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : ""}
                                            </span>
                                        )}
                                    </button>
                                );
                        })}
                    </div>
                ) : query ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-white/25 text-sm">No results found</p>
                    </div>
                ) : (
                    <>
                        {/* Search history */}
                        {history.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em]">Recent</h3>
                                    <button onClick={clearHistory} className="text-[10px] text-white/20 active:text-white/40">Clear</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {history.map((term) => (
                                        <div key={term} className="flex items-center bg-white/[0.04] border border-white/[0.05] rounded-full overflow-hidden">
                                            <button onClick={() => setQuery(term)} className="pl-3 pr-1.5 py-1.5 text-[12px] text-white/60 font-medium flex items-center gap-1.5">
                                                <Clock size={10} className="text-white/25" />{term}
                                            </button>
                                            <button onClick={() => removeSearch(term)} className="pr-2.5 py-1.5 text-white/20 active:text-white/50">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trending */}
                        <div className="mb-6">
                            <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3 flex items-center gap-1.5">
                                <TrendingUp size={11} /> Trending Searches
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {TRENDING_SEARCHES.map((term) => (
                                    <button
                                        key={term}
                                        onClick={() => setQuery(term)}
                                        className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.05] rounded-full text-[12px] text-white/50 font-medium active:bg-white/[0.06] transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Browse categories */}
                        <div>
                            <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3">Browse</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {BROWSE_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.label}
                                        onClick={() => onNavigate({ id: "section", data: { id: `hub-${cat.query}`, title: cat.label, query: cat.query } })}
                                        className="h-20 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 flex items-end pb-3 active:bg-white/[0.05] transition-colors"
                                    >
                                        <span className="text-[13px] font-semibold text-white/60">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
}
