"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music, AlertCircle, RefreshCcw, ChevronRight } from "lucide-react";
import { getStrictLaunchData, LaunchData, JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, Mix, useLibrary } from "@/components/providers/playback-context";
import { getArt } from "@/lib/helpers";

/* ==========================================================================
   HOME VIEW — Premium Apple Music / Spotify Minimalist Vibe
   ========================================================================== */

interface HomeViewProps {
    onNavigate: (view: { id: string; data?: unknown }) => void;
    onPlaySong: (song: JioSaavnSong) => void;
    currentSongId?: string;
    isPlaying: boolean;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

const CACHE_TTL = 300_000;

let globalHomeCache: { data: LaunchData; lang: string; ts: number } | null = null;
let globalHeroSong: JioSaavnSong | null = null;

function deduplicate<T extends { id: string; name?: string }>(arr: T[]): T[] {
    const seen = new Set();
    const seenNames = new Set();
    return arr.filter(item => {
        if (seen.has(item.id)) return false;
        if (item.name) {
            const lowerName = decodeHtml(item.name).toLowerCase().trim();
            if (seenNames.has(lowerName)) return false;
            seenNames.add(lowerName);
        }
        seen.add(item.id);
        return true;
    });
}

function getGreeting(name?: string) {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    return name ? `${g}, ${name}` : g;
}

// ─── SKELETON ─────────────────────────────────────────────────────────────
function HomeSkeleton() {
    return (
        <div className="animate-pulse space-y-12 p-6 lg:p-10 bg-black min-h-screen">
            <div className="flex gap-8">
                <div className="flex-1 space-y-4 pt-8">
                    <div className="h-4 w-32 bg-white/10 rounded-full" />
                    <div className="h-12 w-2/3 bg-white/10 rounded-lg" />
                    <div className="h-5 w-1/3 bg-white/10 rounded-full" />
                </div>
                <div className="w-[240px] h-[240px] bg-white/5 rounded-2xl shrink-0" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-lg" />
                ))}
            </div>
            {[1, 2].map(k => (
                <div key={k} className="space-y-4">
                    <div className="h-6 w-48 bg-white/10 rounded-full" />
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-[160px] h-[160px] bg-white/5 rounded-xl shrink-0" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── HERO — Refined & Cinematic ───────────────────────────────────────────
function CarouselHero({ items, onNavigate, onPlayRadio, userName }: {
    items: any[];
    onNavigate: (item: any) => void;
    onPlayRadio: (item: any) => void;
    userName?: string;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (!items || items.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [items]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const art = getArt(currentItem, '500x500');

    return (
        <div className="w-full max-w-[1500px] mx-auto px-6 lg:px-10 mt-8 mb-6">
            <div
                className="relative w-full h-[220px] md:h-[260px] rounded-3xl overflow-hidden group border border-white/10 bg-[#0a0a0a] shadow-[0_20px_40px_rgba(0,0,0,0.8)] cursor-pointer flex items-center"
                onClick={() => onNavigate(currentItem)}
            >
                {/* Text Area */}
                <div className="relative z-20 flex-1 px-8 md:px-12 py-8 flex flex-col justify-center h-full max-w-[60%]">
                    <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                        {getGreeting(userName)}
                    </p>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`hero-text-${currentItem.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h1 className="text-3xl md:text-5xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-2 line-clamp-2">
                                {decodeHtml(currentItem.name)}
                            </h1>
                            <p className="text-base md:text-lg text-white/50 font-medium line-clamp-1 mb-6 uppercase tracking-wider text-xs">
                                {currentItem.language ? `Trending ${currentItem.language} Playlist` : "Trending Playlist"}
                            </p>
                            <div className="flex items-center gap-4">
                                <button
                                    className="w-12 h-12 bg-white text-black hover:scale-105 active:scale-95 rounded-full flex items-center justify-center shadow-lg transition-transform"
                                    onClick={(e) => { e.stopPropagation(); onPlayRadio(currentItem); }}
                                >
                                    <Play fill="currentColor" size={20} className="ml-1" />
                                </button>
                                <span
                                    className="text-white/40 text-xs font-bold tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); onPlayRadio(currentItem); }}
                                >
                                    Play Radio
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Side Art with Crossfade */}
                <div className="absolute right-0 top-0 bottom-0 w-[55%] md:w-[45%] z-0 h-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent z-10" />
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={`hero-img-${currentItem.id}`}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 0.8, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            src={art}
                            alt={currentItem.name}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                            loading="lazy"
                        />
                    </AnimatePresence>
                </div>

                {/* Widescreen dark accent */}
                <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-black/40 to-transparent z-10 pointer-events-none" />

                {/* Carousel Indicators */}
                {items.length > 1 && (
                    <div className="absolute bottom-4 left-8 md:left-12 flex gap-2 z-20">
                        {items.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────
function SectionHead({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
    return (
        <div className="flex items-end justify-between mb-5 px-6 lg:px-10">
            <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
            {onSeeAll && (
                <button onClick={onSeeAll} className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group">
                    See All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
}

// ─── H-SCROLL ─────────────────────────────────────────────────────────────
function HScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto pb-8 pt-2 px-6 lg:px-10 scrollbar-none" style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
            <div className="flex gap-5 w-max">{children}</div>
        </div>
    );
}

// ─── SONG CARD ────────────────────────────────────────────────────────────
function SongCard({ item, onClick, rank, isCurrent, isPlaying, onContextMenu }: {
    item: JioSaavnSong; onClick: () => void; rank?: number; isCurrent?: boolean; isPlaying?: boolean; onContextMenu?: (e: React.MouseEvent) => void;
}) {
    const art = getArt(item);
    return (
        <div onClick={onClick} onContextMenu={onContextMenu} className="group w-[150px] md:w-[180px] shrink-0 cursor-pointer scroll-snap-align-start relative perspective-[1000px]">
            <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-zinc-900 shadow-xl group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] group-hover:-translate-y-2 transition-all duration-500 ease-out ring-1 ring-white/[0.05] group-hover:ring-white/20 group-hover:rotate-x-[2deg]">
                {art ? (
                    <img src={art} alt="" className="w-full h-full object-cover transition-transform duration-[10s] ease-out group-hover:scale-110" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Music size={32} className="text-white/20" /></div>
                )}

                <div className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-all duration-500 flex items-center justify-center ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white hover:text-black rounded-full flex items-center justify-center shadow-2xl transform translate-y-4 group-hover:translate-y-0 scale-75 group-hover:scale-100 transition-all duration-500">
                        {isCurrent && isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
                    </div>
                </div>

                {rank && (
                    <div className="absolute top-2 left-2 w-7 h-7 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
                        {rank}
                    </div>
                )}

                {isCurrent && (
                    <div className="absolute bottom-2 right-2 flex gap-1 items-end h-3">
                        <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%' }} />
                        <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
                    </div>
                )}
            </div>

            <h4 className={`font-semibold text-sm truncate tracking-tight transition-colors ${isCurrent ? 'text-white' : 'text-zinc-100 group-hover:text-white'}`}>
                {decodeHtml(item.name)}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{decodeHtml(item.primaryArtists || '')}</p>
        </div>
    );
}

// ─── PLAYLIST CARD (Best Of) ──────────────────────────────────────────────
function PlaylistCard({ item, onClick, label }: { item: JioSaavnSong; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-[180px] md:w-[220px] aspect-square rounded-[1.5rem] overflow-hidden cursor-pointer bg-zinc-900 scroll-snap-align-start shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.05] hover:ring-white/20 hover:-translate-y-2 transition-all duration-500 ease-out perspective-[1000px] hover:rotate-x-[2deg]">
            {art && (
                <div className="absolute inset-0">
                    <img src={art} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-[10s] ease-out group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                </div>
            )}
            <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                {label && (
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1 drop-shadow-md">
                        {label}
                    </span>
                )}
                <h3 className="text-xl font-bold text-white tracking-tight line-clamp-2 drop-shadow-xl">{decodeHtml(item.name)}</h3>
            </div>
            <div className="absolute bottom-5 right-5 w-12 h-12 bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 rounded-full shadow-2xl scale-75 group-hover:scale-100">
                <Play fill="currentColor" size={20} className="ml-1" />
            </div>
        </div>
    );
}

// ─── GLASS MIX CARD (Indie / Acoustic) ────────────────────────────────────
function GlassMixCard({ item, onClick, label }: { item: JioSaavnSong; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-[160px] md:w-[190px] cursor-pointer scroll-snap-align-start">
            {/* Circular art with glow */}
            <div className="relative mx-auto w-[140px] h-[140px] md:w-[170px] md:h-[170px] rounded-full overflow-hidden ring-2 ring-white/[0.08] group-hover:ring-white/30 shadow-2xl group-hover:shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all duration-500">
                {art ? (
                    <img src={art} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><Music size={32} className="text-white/20" /></div>
                )}
                {/* Center play button */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                        <Play fill="black" size={18} className="text-black ml-0.5" />
                    </div>
                </div>
            </div>
            {/* Label */}
            <div className="text-center mt-3 px-2">
                {label && <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">{label}</span>}
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate mt-0.5 transition-colors">{decodeHtml(item.name)}</h3>
            </div>
        </div>
    );
}

// ─── CINEMATIC BANNER (Featured Playlists) ─────────────────────────────────
function CinematicBanner({ item, onClick, label }: { item: JioSaavnSong; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-[300px] md:w-[380px] h-[140px] md:h-[170px] rounded-2xl overflow-hidden cursor-pointer bg-zinc-900/80 scroll-snap-align-start border border-white/[0.06] hover:border-white/20 transition-all duration-500 hover:-translate-y-1">
            {/* Background art — left aligned, fading right */}
            {art && (
                <div className="absolute inset-0 flex">
                    <div className="relative w-2/5 h-full shrink-0">
                        <img src={art} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-900/90 to-zinc-900" />
                </div>
            )}
            {/* Content right side */}
            <div className="relative z-10 h-full flex flex-col justify-center pl-[42%] pr-5">
                {label && (
                    <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em] mb-1.5">{label}</span>
                )}
                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight line-clamp-2 leading-tight">{decodeHtml(item.name)}</h3>
                <span className="text-[11px] text-zinc-500 mt-1.5 font-medium">Tap to explore →</span>
            </div>
            {/* Hover play pill */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-full text-[10px] font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10">
                Play
            </div>
        </div>
    );
}

// ─── WIDE CARD (Charts) ───────────────────────────────────────────────────
function WideCard({ item, onClick, label }: { item: JioSaavnSong; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-[280px] md:w-[340px] h-[160px] rounded-[1.5rem] overflow-hidden cursor-pointer bg-zinc-900 scroll-snap-align-start shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.05] hover:ring-white/20 hover:-translate-y-2 transition-all duration-500 ease-out perspective-[1000px] hover:rotate-x-[2deg]">
            {art && (
                <div className="absolute inset-0">
                    <img src={art} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-[10s] ease-out group-hover:scale-110 grayscale group-hover:grayscale-0" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                </div>
            )}
            <div className="relative z-10 p-6 flex flex-col justify-end h-full">
                {label && (
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1 drop-shadow-md">
                        {label}
                    </span>
                )}
                <h3 className="text-2xl font-bold text-white tracking-tight line-clamp-2 w-5/6 drop-shadow-xl">{decodeHtml(item.name)}</h3>
            </div>

            <div className="absolute bottom-5 right-5 w-12 h-12 bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 rounded-full shadow-2xl scale-75 group-hover:scale-100">
                <Play fill="currentColor" size={20} className="ml-1" />
            </div>
        </div>
    );
}

// ─── QUICK PICK GRID ITEM ─────────────────────────────────────────────────
function QuickPick({ item, onClick, isCurrent, isPlaying, onContextMenu }: { item: JioSaavnSong; onClick: () => void; isCurrent?: boolean; isPlaying?: boolean; onContextMenu?: (e: React.MouseEvent) => void }) {
    const art = getArt(item, '150x150');
    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/5 ${isCurrent ? 'bg-white/10' : ''}`}
        >
            <div className="relative w-12 h-12 rounded-lg shrink-0 overflow-hidden shadow-sm">
                {art ? <img src={art} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><Music size={16} className="text-white/20" /></div>}

                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" className="text-white drop-shadow-md" /> : <Play size={16} fill="currentColor" className="text-white ml-0.5 drop-shadow-md" />}
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-2">
                <h4 className={`font-semibold text-sm truncate tracking-tight transition-colors ${isCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                    {decodeHtml(item.name)}
                </h4>
            </div>

            {isCurrent && isPlaying && (
                <div className="flex gap-1 items-end h-3 shrink-0 pr-2">
                    <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%' }} />
                    <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                    <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
                </div>
            )}
        </div>
    );
}

// ─── HISTORY CARD (RECENTLY PLAYED) ───────────────────────────────────────
function HistoryCard({ item, onClick, isCurrent, isPlaying, onContextMenu }: { item: JioSaavnSong; onClick: () => void; isCurrent?: boolean; isPlaying?: boolean; onContextMenu?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void }) {
    const art = getArt(item, '150x150');
    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`flex items-center gap-4 w-[280px] p-2.5 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/5 border border-transparent hover:border-white/10 flex-shrink-0 ${isCurrent ? 'bg-white/10 border-white/10' : ''}`}
        >
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shadow-md shrink-0">
                {art ? <img src={art} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music size={18} className="text-white/20" /></div>}

                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" className="text-white" /> : <Play size={18} fill="currentColor" className="text-white ml-0.5" />}
                </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-sm text-white truncate mb-0.5 group-hover:text-white transition-colors">
                    {decodeHtml(item.name)}
                </h4>
                <p className="text-xs text-white/50 truncate font-medium">
                    {decodeHtml(item.primaryArtists || 'Unknown')}
                </p>
                <div className="mt-1 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    <span className="text-[9px] text-white/60 uppercase tracking-widest font-bold">Jump back in</span>
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN: HOME VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function HomeView({ onNavigate, onPlaySong, currentSongId, isPlaying, onContextMenu }: HomeViewProps) {
    const { playInstantMix, startRadio } = usePlayback();
    const { recentlyPlayed } = useLibrary();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launchData, setLaunchData] = useState<LaunchData | null>(null);
    const [heroSong, setHeroSong] = useState<JioSaavnSong | null>(null);
    const [displayLangs, setDisplayLangs] = useState<string[]>(['English']);
    const [userName, setUserName] = useState("");

    const heroSongRef = useRef<JioSaavnSong | null>(null);
    // Keep ref in sync
    useEffect(() => { heroSongRef.current = heroSong; }, [heroSong]);

    const fetchData = useCallback(async () => {
        let storedLangs = ['english'];
        let name = "";
        try {
            const stored = localStorage.getItem('melora-settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.languages && Array.isArray(parsed.languages) && parsed.languages.length > 0) {
                    storedLangs = parsed.languages;
                }
                if (parsed.userName) name = parsed.userName;
            }
        } catch { /* ignored */ }

        setUserName(name);

        const validLangs = storedLangs.map(l => l.toLowerCase().trim()).filter(Boolean);
        // Sort languages for consistent cache key ("english,telugu" === "telugu,english")
        const sortedForCache = [...validLangs].sort().join(',') || 'english';
        const langString = validLangs.join(',') || 'english';
        setDisplayLangs(validLangs.map(l => l.charAt(0).toUpperCase() + l.slice(1)));

        if (globalHomeCache && globalHomeCache.lang === sortedForCache && Date.now() - globalHomeCache.ts < CACHE_TTL) {
            setLaunchData(globalHomeCache.data);
            const pool = deduplicate([...(globalHomeCache.data.new_trending || []), ...((globalHomeCache.data.new_albums || []) as JioSaavnSong[])]);
            if (pool.length > 0) {
                if (!globalHeroSong) {
                    globalHeroSong = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
                }
                setHeroSong(globalHeroSong);
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getStrictLaunchData(langString);
            if (!data) throw new Error("No data returned");

            data.quick_picks = deduplicate(data.quick_picks || []);
            data.new_trending = deduplicate(data.new_trending || []);
            data.new_albums = deduplicate(data.new_albums || []);
            data.retro = deduplicate(data.retro || []);
            data.top_playlists = deduplicate(data.top_playlists || []);

            setLaunchData(data);
            globalHomeCache = { data, lang: sortedForCache, ts: Date.now() };

            const pool = deduplicate([...(data.new_trending || []), ...((data.new_albums || []) as JioSaavnSong[])]);
            if (pool.length > 0) {
                globalHeroSong = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
                setHeroSong(globalHeroSong);
            }
        } catch (e) {
            console.error("HomeView fetch error:", e);
            setError("Failed to load content.");
        } finally {
            setLoading(false);
        }
    }, []); // No heroSong dependency — use heroSongRef instead

    useEffect(() => {
        fetchData();
        const handler = () => { globalHomeCache = null; globalHeroSong = null; fetchData(); };
        window.addEventListener('melora-settings-changed', handler);
        return () => window.removeEventListener('melora-settings-changed', handler);
    }, [fetchData]);

    // Create carousel items from the top playlist of each selected language in BestOf
    const carouselItems = useMemo(() => {
        if (!launchData?.bestOf) return [];
        const items: any[] = [];
        launchData.bestOf.forEach(langGroup => {
            if (langGroup.items && langGroup.items.length > 0) {
                const topPL = langGroup.items[0];
                items.push({
                    ...topPL,
                    language: langGroup.lang
                });
            }
        });
        // Fallback if empty
        if (items.length === 0 && heroSongRef.current) {
            items.push(heroSongRef.current);
        }
        return items;
    }, [launchData?.bestOf]);

    if (loading) return <HomeSkeleton />;

    if (error || !launchData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-black">
                <div className="max-w-md">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={24} className="text-zinc-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Something went wrong</h2>
                    <p className="text-zinc-400 text-sm mb-8">{error || "We couldn't load your content."}</p>
                    <button onClick={() => fetchData()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform mx-auto">
                        <RefreshCcw size={16} /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { new_trending, new_albums, retro, top_charts, quick_picks, tag_mixes, promo, bestOf } = launchData;

    const playSongInList = (listId: string, listTitle: string, songs: JioSaavnSong[], index: number) => {
        const mix: Mix = {
            id: `home-${listId}`,
            title: listTitle,
            color: 'blue' as const,
            songs,
            currentSongIndex: index
        };
        playInstantMix(mix);
    };

    return (
        <div className="pb-16 w-full overflow-x-hidden bg-black text-white min-h-screen relative">
            <div className="relative z-10 w-full max-w-[1800px] mx-auto">
                <CarouselHero
                    items={carouselItems}
                    onNavigate={(item) => onNavigate({ id: 'playlist', data: item })}
                    onPlayRadio={(item) => {
                        // For now, if they click play on the playlist hero, we navigate to the playlist 
                        // so they can play it from there, or we could fetch playlist details here.
                        // Let's just navigate to the playlist for safety since we lack the full song list here.
                        onNavigate({ id: 'playlist', data: item });
                    }}
                    userName={userName}
                />

                <motion.div className="space-y-10 pt-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>

                    {/* QUICK PICKS - Spotify Style Grid */}
                    {quick_picks && quick_picks.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Quick Picks" />
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 px-6 lg:px-10">
                                {quick_picks.slice(0, 8).map((song, i) => (
                                    <QuickPick
                                        key={song.id}
                                        item={song}
                                        onClick={() => playSongInList('quick-picks', 'Quick Picks', quick_picks.slice(0, 8), i)}
                                        isCurrent={currentSongId === song.id}
                                        isPlaying={isPlaying}
                                        onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                    />
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* RECENTLY PLAYED */}
                    {recentlyPlayed && recentlyPlayed.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Recently Played" onSeeAll={() => onNavigate({ id: 'recently-played', data: { items: recentlyPlayed, title: 'Recently Played' } })} />
                            <HScroll>
                                {recentlyPlayed.slice(0, 15).map((song, i) => (
                                    <HistoryCard
                                        key={`recent-${song.id}`}
                                        item={song}
                                        onClick={() => {
                                            // Play the clicked song directly — NOT radio
                                            const songs = recentlyPlayed.slice(0, 15);
                                            playInstantMix({
                                                id: 'recently-played-queue',
                                                title: 'Recently Played',
                                                color: 'blue',
                                                songs,
                                                currentSongIndex: i,
                                            });
                                        }}
                                        isCurrent={currentSongId === song.id}
                                        isPlaying={isPlaying}
                                        onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                    />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* TRENDING NOW */}
                    {new_trending.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Trending Now" onSeeAll={() => onNavigate({ id: 'trending', data: { items: new_trending, title: 'Trending Now' } })} />
                            <HScroll>
                                {new_trending.slice(0, 15).map((song, i) => (
                                    <SongCard
                                        key={song.id}
                                        item={song}
                                        onClick={() => playSongInList('trending', 'Trending Now', new_trending.slice(0, 15), i)}
                                        isCurrent={currentSongId === song.id}
                                        isPlaying={isPlaying}
                                        onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                    />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* NEW ARRIVALS */}
                    {new_albums.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="New Releases" onSeeAll={() => onNavigate({ id: 'albums', data: { items: new_albums, title: 'New Releases' } })} />
                            <HScroll>
                                {new_albums.slice(0, 10).map(album => (
                                    <SongCard key={album.id} item={album} onClick={() => onNavigate({ id: 'peel-reveal', data: album })} />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* BEST OF — Dynamic per language */}
                    {bestOf && bestOf.length > 0 && bestOf.map((section, sectionIdx) => (
                        <motion.section key={`bestof-${section.lang}`} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title={`Best of ${section.lang}`} onSeeAll={() => onNavigate({ id: 'best-of', data: { items: section.items, title: `Best of ${section.lang}` } })} />
                            <HScroll>
                                {section.items.slice(0, 10).map((pl: any, idx: number) => (
                                    <PlaylistCard key={pl.id || idx} item={pl} label="Playlist" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                                ))}
                            </HScroll>
                        </motion.section>
                    ))}

                    {/* TOP CHARTS */}
                    {top_charts && top_charts.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Charts" onSeeAll={() => onNavigate({ id: 'charts', data: { items: top_charts, title: 'Charts' } })} />
                            <HScroll>
                                {top_charts.slice(0, 10).map((pl: any, idx: number) => (
                                    <WideCard key={pl.id || idx} item={pl} label="Chart" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* RETRO */}
                    {retro && retro.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Retro Classics" onSeeAll={() => onNavigate({ id: 'retro', data: { items: retro, title: 'Retro Classics' } })} />
                            <HScroll>
                                {retro.slice(0, 15).map((song, i) => (
                                    <SongCard
                                        key={song.id}
                                        item={song}
                                        onClick={() => playSongInList('retro', 'Retro Rewind', retro.slice(0, 15), i)}
                                        isCurrent={currentSongId === song.id}
                                        isPlaying={isPlaying}
                                        onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                    />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* GENRE / TAG MIXES */}
                    {tag_mixes && tag_mixes.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Indie & Acoustic" onSeeAll={() => onNavigate({ id: 'indie-mixes', data: { items: tag_mixes, title: 'Indie & Acoustic' } })} />
                            <HScroll>
                                {tag_mixes.slice(0, 10).map((pl: any, idx: number) => (
                                    <GlassMixCard key={pl.id || idx} item={pl} label="Mix" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}

                    {/* FEATURED PLAYLISTS */}
                    {promo && promo.length > 0 && (
                        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <SectionHead title="Featured Playlists" onSeeAll={() => onNavigate({ id: 'featured-playlists', data: { items: promo, title: 'Featured Playlists' } })} />
                            <HScroll>
                                {promo.slice(0, 10).map((pl: any, idx: number) => (
                                    <CinematicBanner key={pl.id || idx} item={pl} label="Featured" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                                ))}
                            </HScroll>
                        </motion.section>
                    )}



                </motion.div>
            </div>
        </div>
    );
}