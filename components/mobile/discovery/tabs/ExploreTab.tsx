"use client";

import React, { useState, useEffect } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { Play, ChevronRight, Radio, Globe, Sparkles, Headphones, Music } from "lucide-react";
import { searchSongs, searchPlaylists, searchAlbums, searchArtists, JioSaavnSong } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { shuffleArray } from "@/lib/helpers";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props { onNavigate: (v: ViewState) => void }

interface ExploreData {
    chartToppers: any[];
    trending: JioSaavnSong[];
    newReleases: any[];
    topPlaylists: any[];
    bollywood: any[];
    tollywood: any[];
    hollywood: any[];
    artistRadio: { name: string; image: string; query: string }[];
}

const ARTIST_STATIONS = [
    { name: "Arijit Singh", query: "Arijit Singh hits" },
    { name: "The Weeknd", query: "The Weeknd hits" },
    { name: "Taylor Swift", query: "Taylor Swift hits" },
    { name: "Pritam", query: "Pritam hits" },
    { name: "AP Dhillon", query: "AP Dhillon hits" },
    { name: "Sid Sriram", query: "Sid Sriram hits" },
];

const DECADE_STATIONS = [
    { name: "90s Hits", query: "90s greatest hits", era: "'90s" },
    { name: "2000s Hits", query: "2000s greatest hits", era: "'00s" },
    { name: "2010s Hits", query: "2010s greatest hits", era: "'10s" },
];

const VIBE_STATIONS = [
    { name: "Lo-Fi", query: "lo-fi chill beats", icon: Headphones },
    { name: "Workout", query: "workout energy hits", icon: Music },
    { name: "Sleep", query: "sleep relaxing music", icon: Sparkles },
];

export function ExploreTab({ onNavigate }: Props) {
    const [data, setData] = useState<ExploreData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { playInstantMix } = usePlayback();

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setError(false);
            try {
                const settings = loadSettings();
                const langs = settings.languages || ["english", "hindi"];
                const langStr = langs.join(",");

                const [chartToppers, trending, newReleases, topPlaylists, bollywood, tollywood, hollywood, ...artistResults] =
                    await Promise.all([
                        searchPlaylists("Global Top 50", 1, 6, langStr).catch(() => []),
                        searchSongs("Top Hits 2026", 1, 12, langStr).catch(() => []),
                        searchAlbums("New Releases 2026", 1, 10, langStr).catch(() => []),
                        searchPlaylists("Top Playlists", 1, 8, langStr).catch(() => []),
                        searchSongs("Bollywood Hits", 1, 8, langStr).catch(() => []),
                        searchSongs("Tollywood Hits", 1, 8, langStr).catch(() => []),
                        searchSongs("Hollywood Hits", 1, 8, langStr).catch(() => []),
                        ...ARTIST_STATIONS.map((a) => searchArtists(a.name, 1, 1).catch(() => [])),
                    ]);

                if (cancelled) return;
                setData({
                    chartToppers, trending, newReleases, topPlaylists,
                    bollywood, tollywood, hollywood,
                    artistRadio: ARTIST_STATIONS.map((a, i) => ({
                        ...a,
                        image: artistResults[i]?.[0]?.image
                            ? (typeof artistResults[i][0].image === "string" ? artistResults[i][0].image : getArt(artistResults[i][0]))
                            : "",
                    })),
                });
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [retryCount]);

    const startRadio = async (query: string, title: string) => {
        try {
            const songs = await searchSongs(query, 1, 30);
            if (songs.length > 0) {
                playInstantMix({
                    id: `radio-${Date.now()}`,
                    title: `${title} Radio`,
                    color: "white",
                    songs: shuffleArray(songs),
                    currentSongIndex: 0,
                });
            }
        } catch { }
    };

    if (isLoading) {
        return (
            <div className="p-5 pt-14">
                <div className="h-7 w-40 bg-white/[0.04] rounded-lg mb-6 animate-pulse" />
                <div className="w-full h-40 bg-white/[0.04] rounded-2xl mb-6 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-square bg-white/[0.04] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-8">
                <p className="text-white/40 text-sm mb-4">Failed to load</p>
                <button onClick={() => setRetryCount(c => c + 1)} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full active:scale-95">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="pb-4">
            {/* Header */}
            <div className="px-5 pt-14 pb-4">
                <h1 className="text-[26px] font-bold text-white tracking-tight">Explore</h1>
                <p className="text-[12px] text-white/30 mt-1">Discover new music across the globe</p>
            </div>

            {/* Radio stations hero */}
            <div className="px-5 mb-7">
                <button
                    onClick={() => startRadio("top hits 2026", "Melora FM")}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 active:bg-white/[0.05] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center">
                            <Radio size={20} className="text-white/60" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-white">Melora FM</span>
                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold uppercase tracking-wider text-white/60">On Air</span>
                            </div>
                            <p className="text-[11px] text-white/30 mt-0.5">Your personal radio station</p>
                        </div>
                        <Play size={20} fill="white" className="text-white/60" />
                    </div>
                </button>
            </div>

            {/* Artist Radio */}
            <Section title="Artist Radio">
                <HScroll>
                    {data.artistRadio.map((artist) => (
                        <button
                            key={artist.name}
                            onClick={() => startRadio(artist.query, artist.name)}
                            className="flex-shrink-0 flex flex-col items-center w-[80px] active:scale-95 transition-transform"
                        >
                            <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06] mb-2">
                                {artist.image && <img src={artist.image} className="w-full h-full object-cover" alt="" loading="lazy" />}
                            </div>
                            <p className="text-[10px] text-white/60 font-medium text-center truncate w-full">{artist.name}</p>
                        </button>
                    ))}
                </HScroll>
            </Section>

            {/* Time Machine */}
            <Section title="Time Machine">
                <div className="px-5 flex gap-2.5">
                    {DECADE_STATIONS.map((d) => (
                        <button
                            key={d.name}
                            onClick={() => startRadio(d.query, d.name)}
                            className="flex-1 h-20 bg-white/[0.03] border border-white/[0.05] rounded-xl flex flex-col items-center justify-center gap-1 active:bg-white/[0.06] transition-colors"
                        >
                            <span className="text-lg font-black text-white/70">{d.era}</span>
                            <span className="text-[9px] text-white/30 uppercase tracking-wider">Hits</span>
                        </button>
                    ))}
                </div>
            </Section>

            {/* Vibe Stations */}
            <Section title="Vibe Stations">
                <div className="px-5 flex gap-2.5">
                    {VIBE_STATIONS.map((v) => (
                        <button
                            key={v.name}
                            onClick={() => startRadio(v.query, v.name)}
                            className="flex-1 h-20 bg-white/[0.03] border border-white/[0.05] rounded-xl flex flex-col items-center justify-center gap-1.5 active:bg-white/[0.06] transition-colors"
                        >
                            <v.icon size={18} className="text-white/40" />
                            <span className="text-[11px] text-white/60 font-semibold">{v.name}</span>
                        </button>
                    ))}
                </div>
            </Section>

            {/* Trending */}
            {data.trending.length > 0 && (
                <Section title="Trending Globally" icon={<Globe size={13} />} onSeeAll={() => onNavigate({ id: "section", data: { id: "trending", title: "Trending Globally", songs: data.trending } })}>
                    <div className="px-5 space-y-0.5">
                        {data.trending.slice(0, 6).map((song, i) => (
                            <CompactTrack
                                key={song.id + i}
                                song={song}
                                rank={i + 1}
                                onPlay={() => playInstantMix({ id: `explore-${Date.now()}`, title: "Trending", color: "white", songs: data.trending, currentSongIndex: i })}
                            />
                        ))}
                    </div>
                </Section>
            )}

            {/* Chart Toppers */}
            {data.chartToppers.length > 0 && (
                <Section title="Chart Toppers" onSeeAll={() => onNavigate({ id: "section", data: { id: "charts", title: "Charts" } })}>
                    <HScroll>
                        {data.chartToppers.map((pl, i) => (
                            <button
                                key={pl.id + i}
                                onClick={() => onNavigate({ id: "playlist", data: pl })}
                                className="flex-shrink-0 w-[140px] active:scale-95 transition-transform text-left"
                            >
                                <div className="w-[140px] h-[140px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative">
                                    {getArt(pl) && <img src={getArt(pl)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                </div>
                                <p className="mt-2 text-[11px] font-semibold text-white/70 truncate">{decodeHtml(pl.name || (pl as any).title || "")}</p>
                            </button>
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* New Releases */}
            {data.newReleases.length > 0 && (
                <Section title="New Releases" onSeeAll={() => onNavigate({ id: "section", data: { id: "albums", title: "New Releases" } })}>
                    <HScroll>
                        {data.newReleases.map((album, i) => (
                            <button
                                key={album.id + i}
                                onClick={() => onNavigate({ id: "album", data: album })}
                                className="flex-shrink-0 w-[120px] active:scale-95 transition-transform text-left"
                            >
                                <div className="w-[120px] h-[120px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
                                    {getArt(album) && <img src={getArt(album)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                </div>
                                <p className="mt-2 text-[11px] font-medium text-white/70 truncate">{decodeHtml(album.name || (album as any).title || "")}</p>
                                <p className="text-[9px] text-white/25 truncate">{decodeHtml(album.primaryArtists || "")}</p>
                            </button>
                        ))}
                    </HScroll>
                </Section>
            )}

            {/* Regional: Global Sounds */}
            <div className="px-5 mb-7">
                <h2 className="text-base font-bold text-white/90 tracking-tight mb-4">Global Sounds</h2>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                    {[
                        { title: "Bollywood", songs: data.bollywood },
                        { title: "Tollywood", songs: data.tollywood },
                        { title: "Hollywood", songs: data.hollywood },
                    ]
                        .filter((r) => r.songs.length > 0)
                        .map((region) => (
                            <div key={region.title} className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[12px] font-semibold text-white/60">{region.title}</span>
                                    <button
                                        onClick={() => onNavigate({ id: "section", data: { id: `hub-${region.title}`, title: region.title, query: `${region.title} hits` } })}
                                        className="text-[10px] text-white/20 font-medium"
                                    >
                                        More <ChevronRight size={10} className="inline" />
                                    </button>
                                </div>
                                <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                                    {region.songs.slice(0, 5).map((song, i) => (
                                        <button
                                            key={song.id + i}
                                            onClick={() => playInstantMix({ id: `region-${Date.now()}`, title: region.title, color: "white", songs: region.songs, currentSongIndex: i })}
                                            className="flex-shrink-0 w-16 text-left active:scale-95 transition-transform"
                                        >
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/[0.04]">
                                                {getArt(song) && <img src={getArt(song)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                            </div>
                                            <p className="mt-1 text-[9px] text-white/40 truncate">{decodeHtml(song.name)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Top Playlists */}
            {data.topPlaylists.length > 0 && (
                <Section title="Top Playlists">
                    <HScroll>
                        {data.topPlaylists.map((pl, i) => (
                            <button
                                key={pl.id + i}
                                onClick={() => onNavigate({ id: "playlist", data: pl })}
                                className="flex-shrink-0 w-[130px] active:scale-95 transition-transform text-left"
                            >
                                <div className="w-[130px] h-[130px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative">
                                    {getArt(pl) && <img src={getArt(pl)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                </div>
                                <p className="mt-2 text-[11px] font-semibold text-white/70 truncate">{decodeHtml(pl.name || (pl as any).title || "")}</p>
                            </button>
                        ))}
                    </HScroll>
                </Section>
            )}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────

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
    return <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">{children}</div>;
}

function CompactTrack({ song, rank, onPlay }: { song: JioSaavnSong; rank: number; onPlay: () => void }) {
    const art = getArt(song);
    return (
        <button onClick={onPlay} className="w-full flex items-center gap-3 p-2 rounded-xl active:bg-white/[0.04] transition-colors">
            <span className="w-5 text-right text-[11px] font-bold text-white/15 flex-shrink-0">{rank}</span>
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-medium text-white/70 truncate">{decodeHtml(song.name)}</p>
                <p className="text-[10px] text-white/25 truncate">{decodeHtml(song.primaryArtists)}</p>
            </div>
            <Play size={14} className="text-white/20 flex-shrink-0" />
        </button>
    );
}
