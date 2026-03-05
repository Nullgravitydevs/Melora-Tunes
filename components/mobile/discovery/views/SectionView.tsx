"use client";

import React, { useState, useEffect } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { ChevronLeft, Play, Disc3 } from "lucide-react";
import {
    getTrending, getNewReleases, getTopCharts,
    searchSongs, searchPlaylists, searchAlbums, searchArtists,
    JioSaavnSong
} from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { loadSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface SectionData {
    id: string;
    title: string;
    songs?: any[];
    query?: string;
}

interface Props {
    section: SectionData;
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
}

export function SectionView({ section, onBack, onNavigate }: Props) {
    const [songs, setSongs] = useState<any[]>(section.songs || []);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [albums, setAlbums] = useState<any[]>([]);
    const [artists, setArtists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!section.songs?.length);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { loadMix, playInstantMix, currentSong, isPlaying, togglePlay } = usePlayback();
    const { addMix, updateMix, mixes } = useLibrary();

    const sectionId = section.id;
    const sectionTitle = section.title;
    const isHub = sectionId.startsWith("hub-");

    useEffect(() => {
        if (section.songs?.length) return;

        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                const settings = loadSettings();
                const langStr = (settings.languages || ["english", "hindi"]).join(",");
                const query = section.query || sectionTitle;

                if (isHub) {
                    // Category hub: fetch songs, playlists, albums, artists
                    const [s, p, al, ar] = await Promise.all([
                        searchSongs(query, 1, 30, langStr).catch(() => []),
                        searchPlaylists(query, 1, 10, langStr).catch(() => []),
                        searchAlbums(query, 1, 10, langStr).catch(() => []),
                        searchArtists(query, 1, 6).catch(() => []),
                    ]);
                    if (!cancelled) {
                        setSongs(s);
                        setPlaylists(p);
                        setAlbums(al);
                        setArtists(ar);
                    }
                } else {
                    // Standard section
                    let data: any[] = [];
                    switch (sectionId) {
                        case "trending":
                            data = await getTrending(langStr);
                            break;
                        case "albums":
                            data = await getNewReleases(50, langStr);
                            setAlbums(data);
                            break;
                        case "charts":
                            data = await getTopCharts(langStr);
                            setPlaylists(data);
                            break;
                        case "retro":
                            data = await searchSongs(`${langStr.split(",")[0]} 90s hits`, 1, 40, langStr);
                            break;
                        case "editors_picks":
                            data = await searchPlaylists("Editor's Picks", 1, 30, langStr);
                            setPlaylists(data);
                            break;
                        default:
                            if (sectionId.startsWith("mood-")) {
                                const mood = sectionId.replace("mood-", "");
                                data = await searchSongs(`${langStr.split(",")[0]} ${mood} songs`, 1, 40, langStr);
                            } else {
                                data = await searchSongs(query, 1, 40, langStr);
                            }
                    }
                    if (!cancelled && data.length > 0) setSongs(data);
                }
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sectionId, sectionTitle, retryCount]);

    const playSong = (index: number) => {
        if (songs.length === 0) return;
        const mixId = `section-${sectionId}`;
        const existing = mixes.find((m) => m.id === mixId);
        if (existing) {
            updateMix(mixId, { songs, currentSongIndex: index });
            loadMix(mixId, index);
        } else {
            addMix({ id: mixId, title: sectionTitle, color: "white", songs, currentSongIndex: index });
            loadMix(mixId, index);
        }
    };

    const playAll = () => {
        if (songs.length > 0) playSong(0);
    };

    const isCurrent = (song: any) => {
        if (!currentSong) return false;
        return (song as any).id === (currentSong as any).id;
    };

    return (
        <div className="h-full bg-black overflow-y-auto no-scrollbar pb-44">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/[0.04]">
                <div className="flex items-center gap-3 px-4 pt-12 pb-3">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                        <ChevronLeft size={22} className="text-white/70" />
                    </button>
                    <h1 className="text-lg font-bold text-white truncate flex-1">{sectionTitle}</h1>
                    {songs.length > 0 && (
                        <button onClick={playAll} className="px-4 py-2 bg-white text-black text-[11px] font-semibold rounded-full active:scale-95 transition-transform flex items-center gap-1.5">
                            <Play size={12} fill="currentColor" /> Play All
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-7 h-7 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 px-8">
                    <p className="text-white/40 text-sm mb-4">Failed to load content</p>
                    <button onClick={() => { setError(false); setRetryCount(c => c + 1); }} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full active:scale-95 transition-transform">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="pt-2">
                    {/* Artist highlights (hub mode) */}
                    {artists.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3 px-5">Artists</h3>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
                                {artists.map((a: any, i: number) => (
                                    <button
                                        key={(a.id || i) + "-art"}
                                        onClick={() => onNavigate({ id: "artist", data: a })}
                                        className="flex-shrink-0 flex flex-col items-center w-[72px] active:scale-95 transition-transform"
                                    >
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                                            {getArt(a) && <img src={getArt(a)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                        </div>
                                        <p className="mt-1.5 text-[9px] text-white/50 font-medium text-center truncate w-full">{decodeHtml(a.name || a.title || "")}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Albums grid (for albums/charts section or hub) */}
                    {albums.length > 0 && sectionId !== "trending" && sectionId !== "retro" && (
                        <div className="mb-6">
                            {isHub && <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3 px-5">Albums</h3>}
                            <div className="px-5 grid grid-cols-3 gap-3">
                                {albums.slice(0, 12).map((album: any, i: number) => (
                                    <button
                                        key={album.id + i}
                                        onClick={() => onNavigate({ id: "album", data: album })}
                                        className="text-left active:scale-95 transition-transform"
                                    >
                                        <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
                                            {getArt(album) && <img src={getArt(album)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                        </div>
                                        <p className="mt-1.5 text-[10px] font-medium text-white/60 truncate">{decodeHtml(album.name || album.title || "")}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Playlists grid */}
                    {playlists.length > 0 && (
                        <div className="mb-6">
                            {isHub && <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3 px-5">Playlists</h3>}
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
                                {playlists.map((pl: any, i: number) => (
                                    <button
                                        key={pl.id + i}
                                        onClick={() => onNavigate({ id: "playlist", data: pl })}
                                        className="flex-shrink-0 w-[130px] active:scale-95 transition-transform text-left"
                                    >
                                        <div className="w-[130px] h-[130px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] relative">
                                            {getArt(pl) && <img src={getArt(pl)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                        </div>
                                        <p className="mt-1.5 text-[10px] font-semibold text-white/60 truncate">{decodeHtml(pl.name || pl.title || "")}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Song list */}
                    {songs.length > 0 && (
                        <div className="px-5">
                            {isHub && <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3">Top Songs</h3>}
                            <div className="space-y-0.5">
                                {songs.map((song: any, i: number) => {
                                    const current = isCurrent(song);
                                    const name = decodeHtml((song as any).name || (song as any).title || "");
                                    const artist = decodeHtml((song as any).primaryArtists || (song as any).artist || "");
                                    const art = (song as any).art || getArt(song.song || song);
                                    const duration = (song as any).duration || (song as any).song?.duration || 0;

                                    return (
                                        <button
                                            key={((song as any).id || i) + "-sec-" + i}
                                            onClick={() => current ? togglePlay() : playSong(i)}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors ${current ? "bg-white/[0.03]" : ""}`}
                                        >
                                            <span className={`w-5 text-right text-[11px] font-bold flex-shrink-0 ${current ? "text-white" : "text-white/15"}`}>
                                                {current && isPlaying ? (
                                                    <Disc3 size={14} className="text-white animate-spin" />
                                                ) : i + 1}
                                            </span>
                                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                                                {art && <img src={art} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-[13px] font-medium truncate ${current ? "text-white" : "text-white/70"}`}>{name}</p>
                                                <p className="text-[10px] text-white/25 truncate">{artist}</p>
                                            </div>
                                            <span className="text-[10px] text-white/15 font-mono flex-shrink-0">
                                                {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : ""}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty */}
                    {songs.length === 0 && albums.length === 0 && playlists.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <p className="text-white/25 text-sm">Nothing found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
