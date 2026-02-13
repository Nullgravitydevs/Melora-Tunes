"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Play, Music, AlertCircle, RefreshCcw, ChevronRight } from "lucide-react";
import { getStrictLaunchData, LaunchData, JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

interface HomeViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
    onPlaySong: (song: JioSaavnSong) => void;
    currentSongId?: string;
    isPlaying: boolean;
    onContextMenu?: (e: React.MouseEvent, song: JioSaavnSong) => void;
}

function getGreeting(name?: string) {
    const hours = new Date().getHours();
    let g = "Good Morning";
    if (hours >= 12 && hours < 18) g = "Good Afternoon";
    if (hours >= 18) g = "Good Evening";
    return name ? `${g}, ${name}` : g;
}

// === HELPER: Extract image URL ===
function getArt(item: any, quality = '500x500'): string {
    if (!item?.image) return '';
    if (typeof item.image === 'string') return item.image;
    if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === quality)?.link || item.image[0]?.link || '';
    return '';
}

// === SKELETON ===
function HomeSkeleton() {
    return (
        <div className="animate-pulse space-y-8 p-8">
            <div className="h-[340px] bg-white/[0.03] rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/[0.03] rounded-xl" />
                ))}
            </div>
            <div className="space-y-3">
                <div className="h-6 w-40 bg-white/[0.03] rounded" />
                <div className="flex gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-44 h-56 bg-white/[0.03] rounded-xl shrink-0" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// === HERO ===
function Hero({ song, onPlay, userName }: { song: JioSaavnSong | null; onPlay: (s: JioSaavnSong) => void; userName?: string }) {
    if (!song) return null;
    const art = getArt(song);

    return (
        <div className="relative h-[360px] w-full mb-6 group overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                {art && <img src={art} alt="" className="w-full h-full object-cover blur-[60px] opacity-20 scale-125" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
            </div>

            <div className="relative z-10 h-full flex items-center px-10 gap-10">
                {/* Album Art */}
                <div className="shrink-0 w-64 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 hidden md:block transition-transform duration-500 group-hover:scale-[1.02]">
                    {art ? (
                        <img src={art} alt={song.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={48} className="text-white/10" /></div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="px-3 py-1 bg-white/[0.08] rounded-md text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                            Pick of the Day
                        </span>
                        <span className="text-white/30 text-sm">·</span>
                        <span className="text-white/30 text-sm font-medium">{getGreeting(userName)}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-3 tracking-tight line-clamp-2">
                        {decodeHtml(song.name)}
                    </h1>

                    <p className="text-lg text-white/40 font-medium mb-8 truncate">
                        {decodeHtml(song.primaryArtists || "")} {song.year ? `· ${song.year}` : ''}
                    </p>

                    <button
                        className="w-max px-8 py-3.5 bg-white text-black rounded-full font-bold text-sm flex items-center gap-2.5 hover:bg-white/90 active:scale-95 transition-all"
                        onClick={() => onPlay(song)}
                    >
                        <Play fill="currentColor" size={18} /> Play Now
                    </button>
                </div>
            </div>
        </div>
    );
}

// === SECTION HEADER ===
function SectionHead({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
    return (
        <div className="flex items-end justify-between mb-4 px-8">
            <div>
                {subtitle && <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">{subtitle}</p>}
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h2>
            </div>
            {onSeeAll && (
                <button onClick={onSeeAll} className="text-[11px] font-bold text-white/30 hover:text-white/60 uppercase tracking-wider flex items-center gap-0.5 transition-colors">
                    See All <ChevronRight size={12} />
                </button>
            )}
        </div>
    );
}

// === HORIZONTAL SCROLL (CSS only, no framer-motion) ===
function HScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto pb-4 px-8 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-5 w-max">{children}</div>
        </div>
    );
}

// === SONG CARD (Square art, minimal) ===
function SongCard({ item, onClick, rank }: { item: any; onClick: () => void; rank?: number }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group w-40 md:w-44 shrink-0 cursor-pointer">
            <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 bg-white/[0.03] ring-1 ring-white/[0.06]">
                {art ? (
                    <img src={art} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music size={28} className="text-white/10" /></div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                        <Play fill="currentColor" size={16} className="ml-0.5" />
                    </div>
                </div>
                {rank && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
                        <span className="text-[10px] font-bold text-white/70">#{rank}</span>
                    </div>
                )}
            </div>
            <h4 className="font-semibold text-white text-[13px] truncate leading-tight">{decodeHtml(item.name || item.title)}</h4>
            <p className="text-[11px] text-white/30 truncate mt-0.5">{decodeHtml(item.primaryArtists || item.subtitle || '')}</p>
        </div>
    );
}

// === WIDE CARD (for playlists/charts) ===
function WideCard({ item, onClick, label }: { item: any; onClick: () => void; label?: string }) {
    const art = getArt(item);
    return (
        <div onClick={onClick} className="group relative shrink-0 w-72 h-44 rounded-xl overflow-hidden cursor-pointer bg-white/[0.03] ring-1 ring-white/[0.06]">
            {art && (
                <div className="absolute inset-0">
                    <img src={art} alt="" className="w-full h-full object-cover opacity-50 transition-all duration-300 group-hover:opacity-40 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                </div>
            )}
            <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                {label && <p className="text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-[0.15em]">{label}</p>}
                <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{decodeHtml(item.title || item.name)}</h3>
                {item.subtitle && <p className="text-xs text-white/30 line-clamp-1 mt-1">{decodeHtml(item.subtitle)}</p>}
            </div>
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play fill="currentColor" size={14} className="text-white ml-0.5" />
            </div>
        </div>
    );
}

// === QUICK PICK ROW ===
function QuickPick({ item, onClick }: { item: any; onClick: () => void }) {
    const art = getArt(item, '150x150');
    return (
        <div onClick={onClick} className="flex items-center gap-3 p-2 pr-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group ring-1 ring-white/[0.04] hover:ring-white/[0.08]">
            <div className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 bg-white/[0.03]">
                {art ? <img src={art} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/10" /></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={12} fill="currentColor" className="text-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-[13px] truncate">{decodeHtml(item.name || item.title)}</h4>
                <p className="text-[11px] text-white/30 truncate">{decodeHtml(item.primaryArtists || item.subtitle || '')}</p>
            </div>
        </div>
    );
}



// === MAIN: HOME VIEW ===
export function HomeView({ onNavigate, onPlaySong, currentSongId, isPlaying, onContextMenu }: HomeViewProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launchData, setLaunchData] = useState<LaunchData | null>(null);
    const [heroSong, setHeroSong] = useState<JioSaavnSong | null>(null);
    const [displayLangs, setDisplayLangs] = useState<string[]>(['English']);
    const [userName, setUserName] = useState("");
    const cacheRef = useRef<{ data: LaunchData; lang: string; ts: number } | null>(null);

    const fetchData = useCallback(async () => {
        // Read settings
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

        // Use cache if <5 min old and same language
        if (cacheRef.current && cacheRef.current.lang === langString && Date.now() - cacheRef.current.ts < 300000) {
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
                <div className="p-12 rounded-2xl max-w-md border border-white/[0.06] bg-white/[0.02]">
                    <div className="w-16 h-16 bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-white/40" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                    <p className="text-white/30 text-sm mb-6">{error || "Couldn't load content. Check your connection."}</p>
                    <button onClick={() => fetchData()} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:bg-white/90 transition-colors mx-auto">
                        <RefreshCcw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const { new_trending, new_albums, top_playlists, retro, top_charts, quick_picks } = launchData;

    return (
        <div className="pb-32 w-full overflow-x-hidden">
            {/* HERO */}
            <Hero song={heroSong} onPlay={onPlaySong} userName={userName} />

            <div className="space-y-10">
                {/* QUICK PICKS */}
                {quick_picks && quick_picks.length > 0 && (
                    <section>
                        <SectionHead title="Quick Picks" subtitle="Jump right in" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 px-8">
                            {quick_picks.slice(0, 8).map(song => (
                                <QuickPick key={song.id} item={song} onClick={() => onPlaySong(song)} />
                            ))}
                        </div>
                    </section>
                )}

                {/* TRENDING */}
                {new_trending.length > 0 && (
                    <section>
                        <SectionHead title="Trending Now" onSeeAll={() => onNavigate({ id: 'trending', data: { items: new_trending, title: 'Trending Now' } })} />
                        <HScroll>
                            {new_trending.slice(0, 12).map((song, i) => (
                                <SongCard key={song.id} item={song} onClick={() => onPlaySong(song)} rank={i + 1} />
                            ))}
                        </HScroll>
                    </section>
                )}

                {/* NEW ALBUMS */}
                {new_albums.length > 0 && (
                    <section>
                        <SectionHead title="New Arrivals" onSeeAll={() => onNavigate({ id: 'albums', data: { items: new_albums, title: 'New Arrivals' } })} />
                        <HScroll>
                            {new_albums.slice(0, 12).map(album => (
                                <SongCard key={album.id} item={album} onClick={() => onNavigate({ id: 'peel-reveal', data: album })} />
                            ))}
                        </HScroll>
                    </section>
                )}

                {/* TOP CHARTS */}
                {top_charts && top_charts.length > 0 && (
                    <section>
                        <SectionHead title="Top Charts" />
                        <HScroll>
                            {top_charts.map(pl => (
                                <WideCard key={pl.id} item={pl} label="Chart" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                            ))}
                        </HScroll>
                    </section>
                )}

                {/* BEST OF LANGUAGE */}
                {top_playlists && top_playlists.length > 0 && (
                    <section>
                        <SectionHead title={`Best of ${displayLangs[0]}`} subtitle="Editor's Picks" />
                        <HScroll>
                            {top_playlists.map(pl => (
                                <WideCard key={pl.id} item={pl} label="Playlist" onClick={() => onNavigate({ id: 'playlist', data: pl })} />
                            ))}
                        </HScroll>
                    </section>
                )}

                {/* RETRO */}
                {retro && retro.length > 0 && (
                    <section>
                        <SectionHead title="Retro Rewind" subtitle="Timeless classics" />
                        <HScroll>
                            {retro.slice(0, 12).map(song => (
                                <SongCard key={song.id} item={song} onClick={() => onPlaySong(song)} />
                            ))}
                        </HScroll>
                    </section>
                )}
            </div>
        </div>
    );
}
