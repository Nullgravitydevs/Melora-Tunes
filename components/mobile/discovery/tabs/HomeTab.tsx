"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Play, Pause, ChevronRight } from "lucide-react";
import { getStrictLaunchData, searchPlaylists, JioSaavnSong } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props { onNavigate: (v: ViewState) => void }

export function HomeTab({ onNavigate }: Props) {
    const [launchData, setLaunchData] = useState<any>(null);
    const [vibePlaylists, setVibePlaylists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return "Good Morning";
        if (h < 18) return "Good Afternoon";
        return "Good Evening";
    }, []);

    const userName = useMemo(() => {
        try { return loadSettings().userName || ""; } catch { return ""; }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setError(false);
            try {
                const settings = loadSettings();
                const langs = settings.languages || ["english", "hindi"];
                const langStr = langs.join(",");
                const primaryLang = langs[0] || "english";

                const [data, ...vibes] = await Promise.all([
                    getStrictLaunchData(langStr),
                    ...["Love", "Party", "Chill", "Workout", "Sad", "Focus"].map((m) =>
                        searchPlaylists(`${primaryLang} ${m} songs`, 1, 4, langStr).catch(() => [])
                    ),
                ]);

                if (cancelled) return;
                setLaunchData(data);
                setVibePlaylists(
                    ["Love", "Party", "Chill", "Workout", "Sad", "Focus"]
                        .map((mood, i) => ({ mood, items: vibes[i]?.slice(0, 4) || [] }))
                        .filter((v) => v.items.length > 0)
                );
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        const handler = () => load();
        window.addEventListener("melora-settings-changed", handler);
        return () => { cancelled = true; window.removeEventListener("melora-settings-changed", handler); };
    }, [retryCount]);

    const playSong = (song: JioSaavnSong) => {
        playInstantMix({ id: `quick-${Date.now()}`, title: "Quick Play", color: "white", songs: [song], currentSongIndex: 0 });
    };

    const playList = (songs: JioSaavnSong[], title: string) => {
        if (songs.length === 0) return;
        playInstantMix({ id: `home-${Date.now()}`, title, color: "white", songs, currentSongIndex: 0 });
    };

    const isCurrent = (song: any) => currentSong && (currentSong as any).id === song.id;

    if (isLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-14">
                <div className="h-7 w-48 bg-white/[0.04] rounded-lg mb-8 animate-pulse" />
                <div className="w-full aspect-[16/9] bg-white/[0.04] rounded-2xl mb-8 animate-pulse" />
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3 mb-4">
                        <div className="w-14 h-14 bg-white/[0.04] rounded-xl animate-pulse" />
                        <div className="flex-1 space-y-2 pt-2">
                            <div className="h-3 w-3/4 bg-white/[0.04] rounded animate-pulse" />
                            <div className="h-2.5 w-1/2 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full px-8">
                <p className="text-white/40 text-sm mb-4">Failed to load. Check your connection.</p>
                <button onClick={() => setRetryCount(c => c + 1)} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full active:scale-95 transition-transform">
                    Retry
                </button>
            </motion.div>
        );
    }

    const trending = launchData?.new_trending?.slice(0, 12) || [];
    const newAlbums = launchData?.new_albums?.slice(0, 10) || [];
    const topCharts = launchData?.top_charts?.slice(0, 8) || [];
    const quickPicks = launchData?.quick_picks?.slice(0, 8) || [];
    const retro = launchData?.retro?.slice(0, 10) || [];
    const heroSong = trending[0];

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-4">
            {/* Header */}
            <div className="px-5 pt-14 pb-2">
                <h1 className="text-[26px] font-bold text-white tracking-tight">
                    {greeting}{userName ? `, ${userName}` : ""}
                </h1>
            </div>

            {/* Hero */}
            {heroSong && (
                <div className="px-5 mb-6">
                    <div
                        className="w-full aspect-[16/9] rounded-2xl border border-white/[0.06] overflow-hidden relative group active:scale-[0.98] transition-transform"
                        onClick={() => playSong(heroSong)}
                    >
                        {getArt(heroSong) && (
                            <img src={getArt(heroSong)} className="absolute inset-0 w-full h-full object-cover" alt="" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-16">
                            <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-[0.15em] text-white/80 mb-1.5 inline-block">
                                Trending
                            </span>
                            <h3 className="text-lg font-bold text-white leading-tight truncate">{decodeHtml(heroSong.name)}</h3>
                            <p className="text-[11px] text-white/50 truncate mt-0.5">{decodeHtml(heroSong.primaryArtists)}</p>
                        </div>
                        <div className="absolute bottom-4 right-4 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg">
                            {isCurrent(heroSong) && isPlaying ? (
                                <Pause size={18} fill="black" className="text-black" />
                            ) : (
                                <Play size={18} fill="black" className="text-black ml-0.5" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Picks */}
            {quickPicks.length > 0 && (
                <Section title="Quick Picks" onSeeAll={() => onNavigate({ id: "section", data: { id: "quick_picks", title: "Quick Picks", songs: quickPicks } })}>
                    <div className="px-5 space-y-1">
                        {quickPicks.slice(0, 6).map((song: JioSaavnSong, i: number) => (
                            <TrackRow key={song.id + i} song={song} index={i + 1} onPlay={() => playSong(song)} isCurrent={!!isCurrent(song)} isPlaying={isPlaying} onToggle={togglePlay} />
                        ))}
                    </div>
                </Section>
            )}

            {/* Trending */}
            {trending.length > 1 && (
                <Section title="Trending Now" icon={<TrendingUp size={14} />} onSeeAll={() => onNavigate({ id: "section", data: { id: "trending", title: "Trending Now", songs: trending } })}>
                    <HScroll>
                        {trending.slice(1, 10).map((song: JioSaavnSong, i: number) => (
                            <SongCard key={song.id + i} item={song} onPlay={() => playSong(song)} rank={i + 1} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* New Albums */}
            {newAlbums.length > 0 && (
                <Section title="New Releases" icon={<Sparkles size={14} />} onSeeAll={() => onNavigate({ id: "section", data: { id: "albums", title: "New Releases" } })}>
                    <HScroll>
                        {newAlbums.map((album: any, i: number) => (
                            <AlbumCard key={album.id + i} item={album} onTap={() => onNavigate({ id: "album", data: album })} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* Vibe Check */}
            {vibePlaylists.length > 0 && (
                <Section title="Vibe Check">
                    <div className="px-5 grid grid-cols-2 gap-2.5">
                        {vibePlaylists.map((vibe) => (
                            <button
                                key={vibe.mood}
                                onClick={() => {
                                    if (vibe.items[0]) onNavigate({ id: "playlist", data: vibe.items[0] });
                                }}
                                className="h-16 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center px-4 gap-3 active:bg-white/[0.06] transition-colors overflow-hidden relative"
                            >
                                {vibe.items[0] && getArt(vibe.items[0]) && (
                                    <img src={getArt(vibe.items[0])} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                )}
                                <span className="text-sm font-semibold text-white/80 truncate">{vibe.mood}</span>
                            </button>
                        ))}
                    </div>
                </Section>
            )}

            {/* Top Charts */}
            {topCharts.length > 0 && (
                <Section title="Top Charts" onSeeAll={() => onNavigate({ id: "section", data: { id: "charts", title: "Top Charts" } })}>
                    <HScroll>
                        {topCharts.map((chart: any, i: number) => (
                            <PlaylistCard key={chart.id + i} item={chart} onTap={() => onNavigate({ id: "playlist", data: chart })} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* Retro */}
            {retro.length > 0 && (
                <Section title="Retro Rewind" onSeeAll={() => onNavigate({ id: "section", data: { id: "retro", title: "Retro Rewind", songs: retro } })}>
                    <HScroll>
                        {retro.map((song: JioSaavnSong, i: number) => (
                            <SongCard key={song.id + i} item={song} onPlay={() => playSong(song)} />
                        ))}
                    </HScroll>
                </Section>
            )}
        </motion.div>
    );
}

// ─── Reusable Pieces ─────────────────────────────────────

function Section({ title, icon, onSeeAll, children }: { title: string; icon?: React.ReactNode; onSeeAll?: () => void; children: React.ReactNode }) {
    return (
        <div className="mb-7">
            <div className="flex items-center justify-between px-5 mb-3">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-white/40">{icon}</span>}
                    <h2 className="text-base font-bold text-white/90 tracking-tight">{title}</h2>
                </div>
                {onSeeAll && (
                    <button onClick={onSeeAll} className="text-[11px] font-semibold text-white/30 uppercase tracking-wider active:text-white/50">
                        See All <ChevronRight size={12} className="inline -mt-0.5" />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function HScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
            {children}
        </div>
    );
}

function SongCard({ item, onPlay, rank }: { item: any; onPlay: () => void; rank?: number }) {
    const art = getArt(item);
    return (
        <button onClick={onPlay} className="flex-shrink-0 w-[140px] active:scale-95 transition-transform text-left">
            <div className="w-[140px] h-[140px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                {rank && (
                    <span className="absolute top-2 left-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-md flex items-center justify-center text-[10px] font-bold text-white/80">
                        {rank}
                    </span>
                )}
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play size={12} fill="white" className="text-white ml-0.5" />
                </div>
            </div>
            <p className="mt-2 text-[12px] font-medium text-white/80 truncate leading-tight">{decodeHtml(item.name || item.title || "")}</p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">{decodeHtml(item.primaryArtists || item.subtitle || "")}</p>
        </button>
    );
}

function AlbumCard({ item, onTap }: { item: any; onTap: () => void }) {
    const art = getArt(item);
    return (
        <button onClick={onTap} className="flex-shrink-0 w-[130px] active:scale-95 transition-transform text-left">
            <div className="w-[130px] h-[130px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
            </div>
            <p className="mt-2 text-[12px] font-medium text-white/80 truncate">{decodeHtml(item.name || item.title || "")}</p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">{decodeHtml(item.primaryArtists || "Album")}</p>
        </button>
    );
}

function PlaylistCard({ item, onTap }: { item: any; onTap: () => void }) {
    const art = getArt(item);
    return (
        <button onClick={onTap} className="flex-shrink-0 w-[150px] active:scale-95 transition-transform text-left">
            <div className="w-[150px] h-[150px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-white/80 truncate">{decodeHtml(item.name || item.title || "")}</p>
        </button>
    );
}

function TrackRow({ song, index, onPlay, isCurrent, isPlaying, onToggle }: {
    song: JioSaavnSong; index: number; onPlay: () => void;
    isCurrent: boolean; isPlaying: boolean; onToggle: () => void;
}) {
    const art = getArt(song);
    return (
        <button
            onClick={isCurrent ? onToggle : onPlay}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors ${isCurrent ? "bg-white/[0.03]" : ""}`}
        >
            <span className={`w-5 text-right text-[11px] font-medium flex-shrink-0 ${isCurrent ? "text-white" : "text-white/20"}`}>
                {isCurrent && isPlaying ? (
                    <span className="flex gap-0.5 justify-end">
                        <span className="w-[2px] h-3 bg-white rounded-full animate-pulse" />
                        <span className="w-[2px] h-2 bg-white rounded-full animate-pulse delay-75" />
                        <span className="w-[2px] h-3.5 bg-white rounded-full animate-pulse delay-150" />
                    </span>
                ) : index}
            </span>
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className={`text-[13px] font-medium truncate ${isCurrent ? "text-white" : "text-white/80"}`}>
                    {decodeHtml(song.name)}
                </p>
                <p className="text-[11px] text-white/30 truncate">{decodeHtml(song.primaryArtists)}</p>
            </div>
            <span className="text-[10px] text-white/20 font-mono flex-shrink-0">
                {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, "0")}` : ""}
            </span>
        </button>
    );
}
