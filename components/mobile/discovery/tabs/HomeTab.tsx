"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { TrendingUp, Sparkles, Play, Pause, ChevronRight, Disc3 } from "lucide-react";
import { JioSaavnSong, searchSongs, searchPlaylists, getStrictLanguageTrending, getStrictLanguageAlbums } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { getArt, type ViewState } from "../DiscoveryEntry";

/* ==========================================================================
   MOBILE HOME TAB — Premium Discovery (Progressive Load)
   ========================================================================== */

const CACHE_TTL = 300_000;
let globalHomeTabCache: { data: any; lang: string; ts: number } | null = null;

interface Props { onNavigate: (v: ViewState) => void }

export function HomeTab({ onNavigate }: Props) {
    const [launchData, setLaunchData] = useState<any>({});
    const [isHeroLoading, setIsHeroLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    }, []);

    const [userName, setUserName] = useState("");

    useEffect(() => {
        let cancelled = false;
        const settings = loadSettings();
        setUserName(settings.userName || "");
        const langs = settings.languages || ["english", "hindi"];
        const langStr = langs.join(",");
        const primaryLang = langs[0] || 'english';

        if (globalHomeTabCache && globalHomeTabCache.lang === langStr && Date.now() - globalHomeTabCache.ts < CACHE_TTL) {
            setLaunchData(globalHomeTabCache.data);
            setIsHeroLoading(false);
            return;
        }

        setIsHeroLoading(true);
        setError(false);
        setLaunchData({});

        const updateData = (key: string, value: any) => {
            if (cancelled) return;
            setLaunchData((prev: any) => {
                const next = { ...prev, [key]: value };
                globalHomeTabCache = { data: next, lang: langStr, ts: Date.now() };
                return next;
            });
        };

        const fetchProgressively = async () => {
            try {
                // 1. Fetch Hero/Trending & Quick Picks First (Instant Paint)
                getStrictLanguageTrending(primaryLang).then(d => { updateData('new_trending', d); setIsHeroLoading(false); });
                searchSongs(`${primaryLang} songs`, 1, 16, primaryLang).then(d => updateData('quick_picks', d));
                
                // 2. Fetch the rest asynchronously
                getStrictLanguageAlbums(primaryLang).then(d => updateData('new_albums', d));
                searchPlaylists(`${primaryLang} Top 50`, 1, 10, primaryLang).then(d => updateData('top_charts', d));
                searchSongs(`${primaryLang} 90s hits`, 1, 15, primaryLang).then(d => updateData('retro', d));
                
                // Moods
                Promise.all([
                    searchPlaylists(`${primaryLang} Love Songs`, 1, 5, primaryLang),
                    searchPlaylists(`${primaryLang} Party`, 1, 5, primaryLang),
                ]).then(([love, party]) => updateData('moods', { love, party }));

                // Promos
                searchPlaylists(`${primaryLang} trending playlist`, 1, 10, primaryLang).then(d => updateData('promo', d));

            } catch (e) {
                if (!cancelled) setError(true);
            }
        };

        fetchProgressively();

        const handler = () => { globalHomeTabCache = null; setRetryCount(c => c + 1); };
        window.addEventListener("melora-settings-changed", handler);
        return () => { cancelled = true; window.removeEventListener("melora-settings-changed", handler); };
    }, [retryCount]);

    const playSong = (song: JioSaavnSong) => {
        playInstantMix({ id: "quick-play", title: "Quick Play", color: "white", songs: [song], currentSongIndex: 0 });
    };

    const isCurrent = (song: any) => currentSong && (currentSong as any).id === song.id;

    if (error && Object.keys(launchData).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-8 pt-20">
                <p className="text-white/30 text-sm mb-4">Failed to load. Check your connection.</p>
                <button onClick={() => setRetryCount(c => c + 1)} className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full active:scale-95 transition-transform">
                    Retry
                </button>
            </div>
        );
    }

    const trending = launchData?.new_trending || [];
    const newAlbums = launchData?.new_albums || [];
    const topCharts = launchData?.top_charts || [];
    const quickPicks = launchData?.quick_picks || [];
    const retro = launchData?.retro || [];

    return (
        <div className="pb-4">
            {/* ─── HEADER ─── */}
            <div className="px-5 pt-14 pb-3">
                <h1 className="text-[26px] font-bold text-white tracking-tight">
                    {greeting}{userName ? `, ${userName}` : ""}
                </h1>
            </div>

            {/* ─── SKELETON (Progressive Load) ─── */}
            {isHeroLoading && (
                <div className="px-5 mt-2">
                    <div className="w-full aspect-[4/3] bg-white/[0.03] rounded-3xl mb-8 animate-pulse shadow-md" />
                    <div className="h-6 w-32 bg-white/[0.03] rounded-md mb-4 animate-pulse" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/[0.03] rounded-xl animate-pulse" />
                            <div className="flex-1 space-y-2 pt-2">
                                <div className="h-3 w-3/4 bg-white/[0.03] rounded animate-pulse" />
                                <div className="h-2.5 w-1/2 bg-white/[0.03] rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isHeroLoading && (
                <>

            {/* ─── HERO CAROUSEL ─── */}
            {trending.length > 0 && (
                <div className="px-5 mb-8">
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                        {trending.slice(0, 5).map((heroSong: any, i: number) => (
                            <div
                                key={heroSong.id + i}
                                className="min-w-full aspect-[4/3] rounded-3xl overflow-hidden relative active:scale-[0.98] transition-transform shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05] snap-center shrink-0"
                                onClick={() => playSong(heroSong)}
                            >
                                {getArt(heroSong) && (
                                    <img src={getArt(heroSong, '500x500')} className="absolute inset-0 w-full h-full object-cover" alt="" loading="lazy" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

                                <div className="absolute bottom-5 left-5 right-20">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.08] backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-white/80 mb-3 border border-white/10 shadow-sm">
                                        <Disc3 size={10} className="opacity-70" /> Featured
                                    </span>
                                    <h3 className="text-[22px] font-bold text-white leading-tight truncate tracking-tight drop-shadow-md">{decodeHtml(heroSong.name)}</h3>
                                    <p className="text-[13px] font-medium text-white/60 truncate mt-1 drop-shadow-md">{decodeHtml(heroSong.primaryArtists)}</p>
                                </div>
                                <div className="absolute bottom-5 right-5 w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-2xl hover:bg-white hover:text-black transition-colors">
                                    {isCurrent(heroSong) && isPlaying ? (
                                        <Pause size={20} fill="currentColor" className="text-white hover:text-black" />
                                    ) : (
                                        <Play size={20} fill="currentColor" className="text-white hover:text-black ml-1" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── QUICK PICKS ─── */}
            {quickPicks.length > 0 && (
                <Section title="Quick Picks" onSeeAll={() => onNavigate({ id: "section", data: { id: "quick_picks", title: "Quick Picks", songs: quickPicks } })}>
                    <div className="px-5 space-y-0.5">
                        {quickPicks.slice(0, 6).map((song: JioSaavnSong, i: number) => (
                            <TrackRow key={song.id + i} song={song} index={i + 1} onPlay={() => playSong(song)} isCurrent={!!isCurrent(song)} isPlaying={isPlaying} onToggle={togglePlay} />
                        ))}
                    </div>
                </Section>
            )}

            {/* ─── TRENDING ─── */}
            {trending.length > 1 && (
                <Section title="Trending Now" icon={<TrendingUp size={14} />} onSeeAll={() => onNavigate({ id: "section", data: { id: "trending", title: "Trending Now", songs: trending } })}>
                    <HScroll>
                        {trending.slice(1, 10).map((song: JioSaavnSong, i: number) => (
                            <SongCard key={song.id + i} item={song} onPlay={() => playSong(song)} rank={i + 1} isCurrent={!!isCurrent(song)} isPlaying={isPlaying} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* ─── NEW ALBUMS ─── */}
            {newAlbums.length > 0 && (
                <Section title="New Releases" icon={<Sparkles size={14} />} onSeeAll={() => onNavigate({ id: "section", data: { id: "albums", title: "New Releases" } })}>
                    <HScroll>
                        {newAlbums.map((album: any, i: number) => (
                            <AlbumCard key={album.id + i} item={album} onTap={() => onNavigate({ id: "album", data: album })} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* ─── TOP CHARTS ─── */}
            {topCharts.length > 0 && (
                <Section title="Top Charts" onSeeAll={() => onNavigate({ id: "section", data: { id: "charts", title: "Top Charts" } })}>
                    <HScroll>
                        {topCharts.map((chart: any, i: number) => (
                            <PlaylistCard key={chart.id + i} item={chart} onTap={() => onNavigate({ id: "playlist", data: chart })} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* ─── RETRO ─── */}
            {retro.length > 0 && (
                <Section title="Retro Rewind" onSeeAll={() => onNavigate({ id: "section", data: { id: "retro", title: "Retro Rewind", songs: retro } })}>
                    <HScroll>
                        {retro.map((song: JioSaavnSong, i: number) => (
                            <SongCard key={song.id + i} item={song} onPlay={() => playSong(song)} isCurrent={!!isCurrent(song)} isPlaying={isPlaying} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* ─── BEST OF ─── */}
            {launchData?.bestOf && launchData.bestOf.map((bo: any, i: number) => (
                <Section key={`bo-${i}`} title={`Best of ${bo.lang}`} onSeeAll={() => onNavigate({ id: "section", data: { id: `bestof-${bo.lang}`, title: `Best of ${bo.lang}` } })}>
                    <HScroll>
                        {bo.items.map((playlist: any, j: number) => (
                            <PlaylistCard key={playlist.id + j} item={playlist} onTap={() => onNavigate({ id: "playlist", data: playlist })} />
                        ))}
                    </HScroll>
                </Section>
            ))}

            {/* ─── MOODS ─── */}
            {launchData?.moods?.love && launchData.moods.love.length > 0 && (
                <Section title="Romance & Chill" onSeeAll={() => onNavigate({ id: "section", data: { id: "mood-love", title: "Romance & Chill" } })}>
                    <HScroll>
                        {launchData.moods.love.map((playlist: any, j: number) => (
                            <PlaylistCard key={playlist.id + j} item={playlist} onTap={() => onNavigate({ id: "playlist", data: playlist })} />
                        ))}
                    </HScroll>
                </Section>
            )}
            
            {launchData?.moods?.party && launchData.moods.party.length > 0 && (
                <Section title="Party & Workout" onSeeAll={() => onNavigate({ id: "section", data: { id: "mood-party", title: "Party & Workout" } })}>
                    <HScroll>
                        {launchData.moods.party.map((playlist: any, j: number) => (
                            <PlaylistCard key={playlist.id + j} item={playlist} onTap={() => onNavigate({ id: "playlist", data: playlist })} />
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* ─── PROMO ─── */}
            {launchData?.promo && launchData.promo.length > 0 && (
                <div className="px-5 mb-8">
                    <h2 className="text-[18px] font-bold text-white/90 tracking-tight mb-4">Featured Playlists</h2>
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                        {launchData.promo.map((promo: any, i: number) => (
                            <div
                                key={promo.id + i}
                                className="min-w-[85%] aspect-[2/1] rounded-2xl overflow-hidden relative active:scale-[0.98] transition-transform shadow-lg ring-1 ring-white/[0.05] snap-center shrink-0 cursor-pointer"
                                onClick={() => onNavigate({ id: "playlist", data: promo })}
                            >
                                {getArt(promo, '500x500') && (
                                    <img src={getArt(promo, '500x500')} className="absolute inset-0 w-full h-full object-cover" alt="" loading="lazy" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <h3 className="absolute bottom-4 left-4 right-4 text-[16px] font-bold text-white tracking-tight drop-shadow-md line-clamp-2">{decodeHtml(promo.name)}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Section({ title, icon, onSeeAll, children }: { title: string; icon?: React.ReactNode; onSeeAll?: () => void; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <div className="flex items-end justify-between px-5 mb-4">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-white/20">{icon}</span>}
                    <h2 className="text-[18px] font-bold text-white/90 tracking-tight">{title}</h2>
                </div>
                {onSeeAll && (
                    <button onClick={onSeeAll} className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] active:text-white/50 flex items-center gap-0.5 transition-colors">
                        See All <ChevronRight size={14} className="opacity-50" />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function HScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5" style={{ scrollbarWidth: 'none' }}>
            {children}
        </div>
    );
}

function SongCard({ item, onPlay, rank, isCurrent, isPlaying }: {
    item: any; onPlay: () => void; rank?: number; isCurrent?: boolean; isPlaying?: boolean;
}) {
    const art = getArt(item);
    return (
        <button onClick={onPlay} className="flex-shrink-0 w-[140px] active:scale-[0.96] transition-transform text-left group">
            <div className={`w-[140px] h-[140px] rounded-[20px] overflow-hidden bg-zinc-900 border mb-3 relative shadow-md transition-colors ${isCurrent ? 'border-white/20' : 'border-white/[0.03]'}`}>
                {art && <img src={art} className="w-full h-full object-cover transition-transform duration-500 group-active:scale-105" alt="" loading="lazy" />}
                {rank && (
                    <span className="absolute top-0 left-0 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-br-[14px] text-[10px] font-black text-white/90 tabular-nums shadow-sm">
                        #{rank}
                    </span>
                )}

                <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <div className={`w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-xl transition-all ${isCurrent ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-active:opacity-100 group-active:scale-100'}`}>
                        {isCurrent && isPlaying ? (
                            <Pause size={16} fill="currentColor" className="text-white" />
                        ) : (
                            <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                        )}
                    </div>
                </div>

                {/* Currently playing indicator */}
                {isCurrent && (
                    <div className="absolute bottom-3 right-3 flex gap-[2px] items-end h-3">
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
                    </div>
                )}
            </div>
            <p className={`text-[13px] font-semibold truncate leading-tight tracking-tight ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                {decodeHtml(item.name || item.title || "")}
            </p>
            <p className="text-[11px] font-medium text-white/40 truncate mt-0.5">{decodeHtml(item.primaryArtists || item.subtitle || "")}</p>
        </button>
    );
}

function AlbumCard({ item, onTap }: { item: any; onTap: () => void }) {
    const art = getArt(item);
    return (
        <button onClick={onTap} className="flex-shrink-0 w-[140px] active:scale-[0.96] transition-transform text-left group">
            <div className="w-[140px] h-[140px] rounded-[20px] overflow-hidden bg-zinc-900 border border-white/[0.03] shadow-md mb-3 relative">
                {art && <img src={art} className="w-full h-full object-cover transition-transform duration-500 group-active:scale-105" alt="" loading="lazy" />}
            </div>
            <p className="text-[13px] font-semibold text-white/80 truncate tracking-tight">{decodeHtml(item.name || item.title || "")}</p>
            <p className="text-[11px] font-medium text-white/40 truncate mt-0.5">{decodeHtml(item.primaryArtists || "Album")}</p>
        </button>
    );
}

function PlaylistCard({ item, onTap }: { item: any; onTap: () => void }) {
    const art = getArt(item);
    return (
        <button onClick={onTap} className="flex-shrink-0 w-[150px] active:scale-[0.96] transition-transform text-left group">
            <div className="w-[150px] h-[150px] rounded-[24px] overflow-hidden bg-zinc-900 border border-white/[0.03] shadow-md relative">
                {art && <img src={art} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <h3 className="absolute bottom-4 left-4 right-4 text-[13px] font-bold text-white tracking-tight drop-shadow-md line-clamp-2">{decodeHtml(item.name || item.title || "")}</h3>
            </div>
        </button>
    );
}

function TrackRow({ song, index, onPlay, isCurrent, isPlaying, onToggle }: {
    song: JioSaavnSong; index: number; onPlay: () => void;
    isCurrent: boolean; isPlaying: boolean; onToggle: () => void;
}) {
    const art = getArt(song, '150x150');
    return (
        <button
            onClick={isCurrent ? onToggle : onPlay}
            className={`w-full flex items-center gap-4 p-2.5 rounded-[16px] active:bg-white/[0.05] transition-colors group ${isCurrent ? "bg-white/[0.05] ring-1 ring-white/[0.08]" : ""}`}
        >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.02] shrink-0 shadow-sm">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] opacity-0 group-active:opacity-100 transition-opacity">
                    {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" className="text-white" /> : <Play size={14} fill="currentColor" className="text-white ml-0.5" />}
                </div>
            </div>

            <div className="flex-1 min-w-0 text-left">
                <p className={`text-[14px] font-bold tracking-tight truncate ${isCurrent ? "text-white" : "text-white/90"}`}>
                    {decodeHtml(song.name)}
                </p>
                <p className="text-[12px] font-medium text-white/40 truncate tracking-tight">{decodeHtml(song.primaryArtists)}</p>
            </div>

            <div className="w-8 flex items-center justify-end">
                {isCurrent && isPlaying ? (
                    <div className="flex gap-[3px] items-end h-[10px]">
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-[2px] bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <span className="text-[11px] text-white/20 font-medium tabular-nums group-active:opacity-0 transition-opacity">
                        {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, "0")}` : ""}
                    </span>
                )}
            </div>
        </button>
    );
}
