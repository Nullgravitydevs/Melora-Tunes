"use client";

import React, { useState, useEffect } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import {
    ChevronLeft, Play, Pause, Shuffle, Heart, Disc3
} from "lucide-react";
import { getAlbumDetails, searchAlbums, JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { shuffleArray } from "@/lib/helpers";
import { getArt, type ViewState } from "../DiscoveryEntry";
import { MetadataStore } from "@/lib/metadata-store";
import { AudioAnalysisResult } from "@/lib/audio-analysis";

interface Props {
    album: any;
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
}

export function AlbumView({ album, onBack, onNavigate }: Props) {
    const [tracks, setTracks] = useState<JioSaavnSong[]>([]);
    const [moreAlbums, setMoreAlbums] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [trackMetadataMap, setTrackMetadataMap] = useState<Record<string, AudioAnalysisResult>>({});
    const { loadMix, playInstantMix, currentSong, isPlaying, togglePlay, togglePin } = usePlayback();
    const { addMix, updateMix, mixes, toggleSaveAlbum, isAlbumSaved } = useLibrary();

    const albumId = album?.id || "";
    const albumName = decodeHtml(album?.name || album?.title || "");
    const albumArtist = decodeHtml(album?.primaryArtists || album?.subtitle || album?.more_info?.artistMap?.primary_artists?.[0]?.name || "");
    const albumYear = album?.year || album?.more_info?.year || "";
    const albumArt = getArt(album);
    const saved = isAlbumSaved(albumId);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                if (albumId) {
                    const data = await getAlbumDetails(albumId);
                    if (cancelled) return;
                    const songList = data?.songs || data?.list || [];
                    setTracks(songList);

                    // Get more from artist
                    if (albumArtist) {
                        const more = await searchAlbums(albumArtist, 1, 8).catch(() => []);
                        if (!cancelled) setMoreAlbums(more.filter((a: any) => a.id !== albumId).slice(0, 6));
                    }
                }
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [albumId, albumArtist, retryCount]);

    useEffect(() => {
        let active = true;
        const fetchMeta = async () => {
            if (tracks.length === 0) return;
            const newMeta: Record<string, AudioAnalysisResult> = {};
            let hasChanges = false;
            for (const t of tracks) {
                const id = t.id;
                if (id && !trackMetadataMap[id]) {
                    const meta = await MetadataStore.getMetadata(id);
                    if (meta && active) {
                        newMeta[id] = meta as AudioAnalysisResult;
                        hasChanges = true;
                    }
                }
            }
            if (hasChanges && active) {
                setTrackMetadataMap(prev => ({ ...prev, ...newMeta }));
            }
        };
        fetchMeta();
        return () => { active = false; };
    }, [tracks]);

    const playSongs = (index: number, shuffled = false) => {
        if (tracks.length === 0) return;
        const list = shuffled ? shuffleArray(tracks) : tracks;
        const mixId = `album-${albumId}`;
        const existing = mixes.find((m) => m.id === mixId);
        if (existing) {
            updateMix(mixId, { songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        } else {
            addMix({ id: mixId, title: albumName, color: "white", songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        }
    };

    const isCurrent = (song: any) => currentSong && (currentSong as any).id === song.id;

    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const totalMinutes = Math.floor(totalDuration / 60);

    return (
        <div className="h-full bg-black overflow-y-auto no-scrollbar pb-44">
            {/* Hero */}
            <div className="relative px-5 pt-16 pb-5">
                {/* Background */}
                {albumArt && (
                    <div className="absolute inset-0 overflow-hidden">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `url(${albumArt})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                filter: "blur(80px) brightness(0.15) saturate(0)",
                                transform: "scale(1.5)",
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black" />
                    </div>
                )}

                {/* Back */}
                <button onClick={onBack} className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronLeft size={20} className="text-white" />
                </button>

                {/* Album layout */}
                <div className="relative z-10 flex gap-5 pt-4">
                    {/* Art */}
                    <div className="w-[140px] h-[140px] rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex-shrink-0">
                        {albumArt && <img src={albumArt} className="w-full h-full object-cover" alt="" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-end pb-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25 mb-1">Album</span>
                        <h1 className="text-lg font-bold text-white leading-tight line-clamp-2">{albumName}</h1>
                        <button
                            onClick={() => {
                                if (albumArtist) {
                                    const artistId = album?.primaryArtistsId?.split(",")[0]?.trim();
                                    onNavigate({ id: "artist", data: { id: artistId, name: albumArtist } });
                                }
                            }}
                            className="text-[12px] text-white/40 mt-1 truncate text-left active:text-white/60"
                        >
                            {albumArtist}
                        </button>
                        {albumYear && <p className="text-[10px] text-white/20 mt-0.5">{albumYear}</p>}
                        <p className="text-[10px] text-white/15 mt-0.5">
                            {tracks.length} song{tracks.length !== 1 ? "s" : ""}{totalMinutes > 0 ? ` · ${totalMinutes} min` : ""}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 px-5 pb-4">
                <button
                    onClick={() => playSongs(0)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-[13px] font-semibold active:scale-95 transition-transform"
                >
                    <Play size={16} fill="currentColor" /> Play
                </button>
                <button
                    onClick={() => playSongs(0, true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.06] text-white/70 rounded-xl text-[13px] font-semibold border border-white/[0.06] active:scale-95 transition-transform"
                >
                    <Shuffle size={16} /> Shuffle
                </button>
                <button
                    onClick={() => toggleSaveAlbum(album)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${saved ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/[0.08]"}`}
                >
                    <Heart size={18} fill={saved ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Track list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                    <p className="text-white/40 text-sm mb-4">Failed to load album</p>
                    <button onClick={() => { setError(false); setRetryCount(c => c + 1); }} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full active:scale-95 transition-transform">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="px-5 mb-6">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.03]">
                        {tracks.map((song, i) => {
                            const current = isCurrent(song);
                            return (
                                <button
                                    key={song.id + i}
                                    onClick={() => current ? togglePlay() : playSongs(i)}
                                    className={`w-full flex items-center gap-3 p-3.5 transition-colors ${current ? "bg-white/[0.04]" : "active:bg-white/[0.03]"}`}
                                >
                                    <span className={`w-5 text-right text-[11px] font-medium flex-shrink-0 ${current ? "text-white" : "text-white/15"}`}>
                                        {current && isPlaying ? (
                                            <Disc3 size={14} className="text-white animate-spin" />
                                        ) : i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className={`text-[13px] font-medium truncate ${current ? "text-white" : "text-white/70"}`}>
                                            {decodeHtml(song.name)}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {song.primaryArtists !== albumArtist && (
                                                <p className="text-[10px] text-white/25 truncate">{decodeHtml(song.primaryArtists)}</p>
                                            )}
                                            {trackMetadataMap[song.id] && (
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="text-[8px] bg-white/10 text-white/60 px-1 py-0.5 rounded uppercase font-bold tracking-widest leading-none border border-white/5">
                                                        {trackMetadataMap[song.id].bpm} BPM
                                                    </span>
                                                    <span className="text-[8px] bg-white/10 text-white/60 px-1 py-0.5 rounded uppercase font-bold tracking-widest leading-none border border-white/5">
                                                        {trackMetadataMap[song.id].key}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/15 font-mono flex-shrink-0">
                                        {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, "0")}` : ""}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* More from artist */}
            {moreAlbums.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-base font-bold text-white/90 mb-3 px-5">More from {albumArtist.split(",")[0]}</h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
                        {moreAlbums.map((a: any, i: number) => (
                            <button
                                key={a.id + i}
                                onClick={() => onNavigate({ id: "album", data: a })}
                                className="flex-shrink-0 w-[110px] active:scale-95 transition-transform text-left"
                            >
                                <div className="w-[110px] h-[110px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
                                    {getArt(a) && <img src={getArt(a)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                </div>
                                <p className="mt-1.5 text-[10px] font-medium text-white/60 truncate">{decodeHtml(a.name || a.title || "")}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
