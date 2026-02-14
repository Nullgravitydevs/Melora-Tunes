"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music, AlertCircle, RefreshCcw, ChevronRight, Disc3 } from "lucide-react";
import { getStrictLaunchData, LaunchData, JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, Mix } from "@/components/providers/playback-context";

/* ==========================================================================
   HOME VIEW — Premium Discovery Home
   Framer-motion stagger transitions, 5-min cache, self-contained
   ========================================================================== */

interface HomeViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onPlaySong: (song: JioSaavnSong) => void;
    currentSongId?: string;
    isPlaying: boolean;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

const CACHE_TTL = 300_000; // 5 minutes

function getGreeting(name?: string) {
    const h = new Date().getHours();
    const g = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    return name ? `${g}, ${name}` : g;
}

import { getArt } from "@/lib/helpers";

// ─── SKELETON ─────────────────────────────────────────────────────────────
function HomeSkeleton() {
    return (
        <div className="animate-pulse space-y-10 p-8">
            <div className="h-[400px] bg-white/[0.02] rounded-3xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[60px] bg-white/[0.02] rounded-xl" />
                ))}
            </div>
            {[1, 2].map(k => (
                <div key={k} className="space-y-3">
                    <div className="h-5 w-36 bg-white/[0.02] rounded ml-8" />
                    <div className="flex gap-4 px-8">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-44 h-56 bg-white/[0.02] rounded-2xl shrink-0" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── HERO — Cinematic full-bleed ──────────────────────────────────────────
function Hero({ song, onPlay, userName, isCurrent, isPlaying }: {
    song: JioSaavnSong | null;
    onPlay: (s: JioSaavnSong) => void;
    userName?: string;
    isCurrent: boolean;
    isPlaying: boolean;
}) {
    if (!song) return null;
    const art = getArt(song);

    return (
        <div className="relative h-[420px] w-full mb-8 group overflow-hidden rounded-b-[2rem]">
            {/* Ambient BG */}
            <div className="absolute inset-0">
                {art && <img src={art} alt="" className="w-full h-full object-cover blur-[80px] opacity-5 scale-150 saturate-0" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-black" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            </div>

            {/* Noise overlay */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
            }} />

            <div className="relative z-10 h-full flex items-center px-12 gap-12">
                {/* Album Art */}
                <div className="shrink-0 hidden md:block">
                    <div className="w-[260px] h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/[0.08]">
                        {art ? (
                            <img src={art} alt={song.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={48} className="text-white/10" /></div>
                        )}
                    </div>
                </div>

                {/* Text Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.06] backdrop-blur-sm rounded-full text-[10px] font-bold tracking-[0.15em] text-white/50 uppercase border border-white/[0.04]">
                            <Disc3 size={10} className="opacity-60" /> Featured
                        </span>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-white/25 text-xs font-medium tracking-wide">{getGreeting(userName)}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.05] mb-3 tracking-[-0.02em] line-clamp-2">
                        {decodeHtml(song.name)}
                    </h1>

                    <p className="text-base text-white/35 font-medium mb-8 truncate max-w-lg">
                        {decodeHtml(song.primaryArtists || "")} {song.year ? `· ${song.year}` : ''}
                    </p>

                    <div className="flex items-center gap-4">
                        <button
                            className="px-8 py-3.5 bg-white text-black rounded-full font-bold text-sm flex items-center gap-2.5 hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg shadow-white/5"
                            onClick={() => onPlay(song)}
                        >
                            {isCurrent && isPlaying ? <Pause fill="currentColor" size={16} /> : <Play fill="currentColor" size={16} className="ml-0.5" />}
                            {isCurrent && isPlaying ? 'Playing' : 'Play Now'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
        </div>
    );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────
function SectionHead({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
    return (
        <div className="flex items-end justify-between mb-5 px-8">
            <div>
                {subtitle && <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">{subtitle}</p>}
                <h2 className="text-xl font-bold tracking-[-0.01em] text-white">{title}</h2>
            </div>
            {onSeeAll && (
                <button onClick={onSeeAll} className="text-[11px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest flex items-center gap-0.5 transition-colors group">
                    See All <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </button>
            )}
        </div>
    );
}

// ─── H-SCROLL ─────────────────────────────────────────────────────────────
function HScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto pb-1 px-8 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-5 w-max">{children}</div>
        </div>
    );
}

// ─── SONG CARD — Hoverable square ─────────────────────────────────────────
function SongCard({ item, onClick, rank, isCurrent, isPlaying, onContextMenu }: {
    item: any; onClick: () => void; rank?: number; isCurrent?: boolean; isPlaying?: boolean; onContextMenu?: (e: React.MouseEvent) => void;
}) {
    const art = getArt(item);
    return (
        <div onClick={onClick} onContextMenu={onContextMenu} className="group w-[172px] shrink-0 cursor-pointer">
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.12] transition-all duration-300">
                {art ? (
                    <img src={art} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music size={28} className="text-white/10" /></div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 shadow-xl ${isCurrent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                        {isCurrent && isPlaying ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
                    </div>
                </div>
                {/* Rank */}
                {rank && (
                    <div className="absolute top-0 left-0 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-br-xl rounded-tl-2xl">
                        <span className="text-[11px] font-black text-white/80 tabular-nums">#{rank}</span>
                    </div>
                )}
                {/* Currently playing indicator */}
                {isCurrent && (
                    <div className="absolute bottom-2 right-2 flex gap-[3px] items-end h-4">
                        <span className="w-[3px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
                        <span className="w-[3px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-[3px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
                    </div>
                )}
            </div>
            <h4 className={`font-semibold text-[13px] truncate leading-tight ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                {decodeHtml(item.name || item.title)}
            </h4>
            <p className="text-[11px] text-white/25 truncate mt-0.5">{decodeHtml(item.primaryArtists || item.subtitle || '')}</p>
        </div>
    );
}

// ─── WIDE CARD (Charts + Playlists) ───────────────────────────────────────
function WideCard({ item, onClick, label }: { item: any; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-[280px] h-[160px] rounded-2xl overflow-hidden cursor-pointer bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.12] transition-all duration-300">
            {art && (
                <div className="absolute inset-0">
                    <img src={art} alt="" className="w-full h-full object-cover opacity-40 saturate-[0.3] transition-all duration-500 group-hover:opacity-50 group-hover:scale-105" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                </div>
            )}
            <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                {label && (
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1.5 inline-block">
                        {label}
                    </span>
                )}
                <h3 className="text-base font-bold text-white leading-snug line-clamp-2">{decodeHtml(item.title || item.name)}</h3>
                {item.subtitle && <p className="text-[11px] text-white/25 line-clamp-1 mt-1">{decodeHtml(item.subtitle)}</p>}
            </div>
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.06] backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/[0.06]">
                <Play fill="currentColor" size={14} className="text-white ml-0.5" />
            </div>
        </div>
    );
}

// ─── QUICK PICK ROW ───────────────────────────────────────────────────────
function QuickPick({ item, onClick, isCurrent, isPlaying, onContextMenu }: { item: any; onClick: () => void; isCurrent?: boolean; isPlaying?: boolean; onContextMenu?: (e: React.MouseEvent) => void }) {
    const art = getArt(item, '150x150');
    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`flex items-center gap-3 p-2 pr-4 rounded-xl transition-all duration-200 cursor-pointer group ring-1 ${isCurrent
                    ? 'bg-white/[0.06] ring-white/[0.1]'
                    : 'bg-white/[0.02] ring-white/[0.03] hover:bg-white/[0.05] hover:ring-white/[0.08]'
                }`}
        >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
                {art ? <img src={art} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/10" /></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" className="text-white" /> : <Play size={12} fill="currentColor" className="text-white ml-0.5" />}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-[13px] truncate ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                    {decodeHtml(item.name || item.title)}
                </h4>
                <p className="text-[11px] text-white/25 truncate">{decodeHtml(item.primaryArtists || item.subtitle || '')}</p>
            </div>
            {isCurrent && isPlaying && (
                <div className="flex gap-[2px] items-end h-3.5 mr-1">
                    <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '0ms' }} />
                    <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                    <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '300ms' }} />
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN: HOME VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function HomeView({ onNavigate, onPlaySong, currentSongId, isPlaying, onContextMenu }: HomeViewProps) {
    const { playInstantMix, addMix, updateMix, loadMix } = usePlayback();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launchData, setLaunchData] = useState<LaunchData | null>(null);
    const [heroSong, setHeroSong] = useState<JioSaavnSong | null>(null);
    const [displayLangs, setDisplayLangs] = useState<string[]>(['English']);
    const [userName, setUserName] = useState("");
    const cacheRef = useRef<{ data: LaunchData; lang: string; ts: number } | null>(null);

    const fetchData = useCallback(async () => {
        let storedLangs = ['english'];
        let name = "";
        try {
            const stored = localStorage.getItem('melora-settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.languages) {
                    const l = parsed.languages;
                    storedLangs = Array.isArray(l) ? l : [l];
                }
                if (parsed.userName) name = parsed.userName;
            }
        } catch { /* ignored */ }
        setUserName(name);

        const validLangs = storedLangs.map(l => l.toLowerCase().trim()).filter(Boolean);
        const langString = validLangs.join(',') || 'english';
        setDisplayLangs(validLangs.map(l => l.charAt(0).toUpperCase() + l.slice(1)));

        if (cacheRef.current && cacheRef.current.lang === langString && Date.now() - cacheRef.current.ts < CACHE_TTL) {
            setLaunchData(cacheRef.current.data);
            const pool = [...(cacheRef.current.data.new_trending || []), ...(cacheRef.current.data.new_albums || [])];
            if (pool.length > 0) setHeroSong(pool[Math.floor(Math.random() * Math.min(pool.length, 5))]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getStrictLaunchData(langString);
            if (!data) throw new Error("No data returned");
            setLaunchData(data);
            cacheRef.current = { data, lang: langString, ts: Date.now() };
            const pool = [...(data.new_trending || []), ...(data.new_albums || [])];
            if (pool.length > 0) setHeroSong(pool[Math.floor(Math.random() * Math.min(pool.length, 5))]);
        } catch {
            setError("Failed to load content.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const handler = () => { cacheRef.current = null; fetchData(); };
        window.addEventListener('melora-settings-changed', handler);
        return () => window.removeEventListener('melora-settings-changed', handler);
    }, [fetchData]);

    if (loading) return <HomeSkeleton />;

    if (error || !launchData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="p-12 rounded-3xl max-w-md border border-white/[0.05] bg-white/[0.02]">
                    <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={28} className="text-white/30" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
                    <p className="text-white/25 text-sm mb-6">{error || "Couldn't load content."}</p>
                    <button onClick={() => fetchData()} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:bg-white/90 transition-colors mx-auto">
                        <RefreshCcw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const { new_trending, new_albums, top_playlists, retro, top_charts, quick_picks } = launchData;

    // Helper: play a song within a list context (so clicking plays the right song, not just the first)
    const playSongInList = (listId: string, listTitle: string, songs: JioSaavnSong[], index: number) => {
        const mix: Mix = {
            id: `home-${listId}`,
            title: listTitle,
            color: 'blue' as const,
            songs,
            currentSongIndex: index
        };
        const added = addMix(mix);
        if (!added) updateMix(`home-${listId}`, { songs, currentSongIndex: index });
        loadMix(`home-${listId}`);
    };

    return (
        <div className="pb-32 w-full overflow-x-hidden">
            {/* HERO */}
            <Hero
                song={heroSong}
                onPlay={onPlaySong}
                userName={userName}
                isCurrent={currentSongId === heroSong?.id}
                isPlaying={isPlaying}
            />

            <motion.div className="space-y-8" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
                {/* QUICK PICKS */}
                {quick_picks && quick_picks.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title="Quick Picks" subtitle="Jump right in" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 px-8">
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

                {/* TRENDING */}
                {new_trending.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title="Trending Now" onSeeAll={() => onNavigate({ id: 'trending', data: { items: new_trending, title: 'Trending Now' } })} />
                        <HScroll>
                            {new_trending.slice(0, 12).map((song, i) => (
                                <SongCard
                                    key={song.id}
                                    item={song}
                                    onClick={() => playSongInList('trending', 'Trending Now', new_trending.slice(0, 12), i)}
                                    rank={i + 1}
                                    isCurrent={currentSongId === song.id}
                                    isPlaying={isPlaying}
                                    onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                />
                            ))}
                        </HScroll>
                    </motion.section>
                )}

                {/* NEW ALBUMS */}
                {new_albums.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title="New Arrivals" onSeeAll={() => onNavigate({ id: 'albums', data: { items: new_albums, title: 'New Arrivals' } })} />
                        <HScroll>
                            {new_albums.slice(0, 12).map(album => (
                                <SongCard key={album.id} item={album} onClick={() => onNavigate({ id: 'peel-reveal', data: album })} />
                            ))}
                        </HScroll>
                    </motion.section>
                )}

                {/* TOP CHARTS */}
                {top_charts && top_charts.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title="Top Charts" />
                        <HScroll>
                            {top_charts.map(pl => (
                                <WideCard key={pl.id} item={pl} label="Chart" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                            ))}
                        </HScroll>
                    </motion.section>
                )}

                {/* BEST OF LANGUAGE */}
                {top_playlists && top_playlists.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title={`Best of ${displayLangs[0]}`} subtitle="Editor's Picks" />
                        <HScroll>
                            {top_playlists.map(pl => (
                                <WideCard key={pl.id} item={pl} label="Playlist" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                            ))}
                        </HScroll>
                    </motion.section>
                )}

                {/* RETRO */}
                {retro && retro.length > 0 && (
                    <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                        <SectionHead title="Retro Rewind" subtitle="Timeless classics" />
                        <HScroll>
                            {retro.slice(0, 12).map((song, i) => (
                                <SongCard
                                    key={song.id}
                                    item={song}
                                    onClick={() => playSongInList('retro', 'Retro Rewind', retro.slice(0, 12), i)}
                                    isCurrent={currentSongId === song.id}
                                    isPlaying={isPlaying}
                                    onContextMenu={onContextMenu ? (e) => onContextMenu(e, song) : undefined}
                                />
                            ))}
                        </HScroll>
                    </motion.section>
                )}
            </motion.div>
        </div>
    );
}
