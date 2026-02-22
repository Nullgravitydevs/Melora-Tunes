"use client";

import React, { useState, useEffect } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { motion } from "framer-motion";
import {
    ChevronLeft, Play, Pause, Shuffle, Heart, UserPlus, UserCheck,
    Disc3, ChevronRight
} from "lucide-react";
import { getArtistDetails, searchArtists, searchSongs, searchAlbums, JioSaavnSong } from "@/lib/jiosaavn";
import { loadSettings } from "@/lib/settings";
import { decodeHtml } from "@/lib/utils";
import { shuffleArray } from "@/lib/helpers";
import { getArt, type ViewState } from "../DiscoveryEntry";

interface Props {
    artist: any;
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
}

export function ArtistView({ artist, onBack, onNavigate }: Props) {
    const [artistData, setArtistData] = useState<any>(null);
    const [topSongs, setTopSongs] = useState<JioSaavnSong[]>([]);
    const [albums, setAlbums] = useState<any[]>([]);
    const [similarArtists, setSimilarArtists] = useState<any[]>([]);
    const [bio, setBio] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [showFullBio, setShowFullBio] = useState(false);
    const { playInstantMix, loadMix, currentSong, isPlaying, togglePlay } = usePlayback();
    const { addMix, updateMix, mixes, toggleFollowArtist, isArtistFollowed } = useLibrary();

    const artistId = artist?.id || artist?.artistId || "";
    const artistName = decodeHtml(artist?.name || artist?.title || "");
    const followed = isArtistFollowed(artistId);
    const art = getArt(artist);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                const settings = loadSettings();
                const langStr = (settings.languages || ["english", "hindi"]).join(",");

                if (artistId) {
                    const data = await getArtistDetails(artistId);
                    if (cancelled) return;
                    setArtistData(data);
                    setTopSongs(data?.topSongs || []);
                    setAlbums(data?.topAlbums || []);
                    setSimilarArtists(data?.similarArtists || []);
                    setBio(data?.bio || data?.dominantType || "");
                } else if (artistName) {
                    const [artists, songs, albs] = await Promise.all([
                        searchArtists(artistName, 1, 5).catch(() => []),
                        searchSongs(artistName, 1, 20, langStr).catch(() => []),
                        searchAlbums(artistName, 1, 10, langStr).catch(() => []),
                    ]);
                    if (cancelled) return;
                    setTopSongs(songs);
                    setAlbums(albs);
                    if (artists.length > 1) setSimilarArtists(artists.slice(1));
                }
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [artistId, artistName, retryCount]);

    const playSongs = (songs: JioSaavnSong[], index: number, shuffled = false) => {
        const list = shuffled ? shuffleArray(songs) : songs;
        const mixId = `artist-${artistId || artistName}`;
        const existing = mixes.find((m) => m.id === mixId);
        if (existing) {
            updateMix(mixId, { songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        } else {
            addMix({ id: mixId, title: artistName, color: "white", songs: list, currentSongIndex: shuffled ? 0 : index });
            loadMix(mixId);
        }
    };

    const isCurrent = (song: any) => currentSong && (currentSong as any).id === song.id;
    const heroArt = artistData?.image ? getArt(artistData) : art;
    const followerCount = artistData?.followerCount || artistData?.fan_count;

    return (
        <div className="h-full bg-black overflow-y-auto no-scrollbar pb-44">
            {/* Header BG */}
            <div className="relative h-[320px] overflow-hidden">
                {heroArt && (
                    <img src={heroArt} className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.3) saturate(0)" }} alt="" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Back button */}
                <button onClick={onBack} className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <ChevronLeft size={20} className="text-white" />
                </button>

                {/* Artist info */}
                <div className="absolute bottom-6 left-5 right-5 z-10">
                    <div className="flex items-end gap-4">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/[0.06] border-2 border-white/[0.08] flex-shrink-0">
                            {heroArt && <img src={heroArt} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                            <h1 className="text-2xl font-bold text-white truncate">{artistName}</h1>
                            {followerCount && (
                                <p className="text-[11px] text-white/30 mt-0.5">{Number(followerCount).toLocaleString()} followers</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 py-4">
                <button
                    onClick={() => topSongs.length > 0 && playSongs(topSongs, 0)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-[13px] font-semibold active:scale-95 transition-transform"
                >
                    <Play size={16} fill="currentColor" /> Play
                </button>
                <button
                    onClick={() => topSongs.length > 0 && playSongs(topSongs, 0, true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.06] text-white/70 rounded-xl text-[13px] font-semibold border border-white/[0.06] active:scale-95 transition-transform"
                >
                    <Shuffle size={16} /> Shuffle
                </button>
                <button
                    onClick={() => toggleFollowArtist(artist)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${followed ? "bg-white text-black border-white" : "bg-transparent text-white/50 border-white/[0.08] active:bg-white/[0.06]"}`}
                >
                    {followed ? <UserCheck size={18} /> : <UserPlus size={18} />}
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Error */}
            {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                    <p className="text-white/40 text-sm mb-4">Failed to load artist profile</p>
                    <button onClick={() => { setError(false); setRetryCount(c => c + 1); }} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full active:scale-95 transition-transform">
                        Retry
                    </button>
                </div>
            )}

            {/* Popular Songs */}
            {topSongs.length > 0 && (
                <div className="px-5 mb-6">
                    <h2 className="text-base font-bold text-white/90 mb-3">Popular</h2>
                    <div className="space-y-0.5">
                        {topSongs.slice(0, 10).map((song, i) => {
                            const current = isCurrent(song);
                            const songArt = getArt(song);
                            return (
                                <button
                                    key={song.id + i}
                                    onClick={() => current ? togglePlay() : playSongs(topSongs, i)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.04] transition-colors ${current ? "bg-white/[0.03]" : ""}`}
                                >
                                    <span className={`w-5 text-right text-[11px] font-bold flex-shrink-0 ${current ? "text-white" : "text-white/15"}`}>
                                        {current && isPlaying ? (
                                            <span className="flex gap-0.5 justify-end">
                                                <span className="w-[2px] h-3 bg-white rounded-full animate-pulse" />
                                                <span className="w-[2px] h-2 bg-white rounded-full animate-pulse delay-75" />
                                                <span className="w-[2px] h-3.5 bg-white rounded-full animate-pulse delay-150" />
                                            </span>
                                        ) : i + 1}
                                    </span>
                                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                                        {songArt && <img src={songArt} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className={`text-[13px] font-medium truncate ${current ? "text-white" : "text-white/80"}`}>{decodeHtml(song.name)}</p>
                                        <p className="text-[11px] text-white/30 truncate">{decodeHtml(song.primaryArtists)}</p>
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

            {/* Discography */}
            {albums.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-base font-bold text-white/90 mb-3 px-5">Discography</h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
                        {albums.map((album: any, i: number) => {
                            const albumArt = getArt(album);
                            return (
                                <button
                                    key={album.id + i}
                                    onClick={() => onNavigate({ id: "album", data: album })}
                                    className="flex-shrink-0 w-[120px] active:scale-95 transition-transform text-left"
                                >
                                    <div className="w-[120px] h-[120px] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
                                        {albumArt && <img src={albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                    </div>
                                    <p className="mt-2 text-[11px] font-medium text-white/70 truncate">{decodeHtml(album.name || album.title || "")}</p>
                                    <p className="text-[9px] text-white/25 truncate">{album.year || ""}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bio */}
            {bio && (
                <div className="px-5 mb-6">
                    <h2 className="text-base font-bold text-white/90 mb-3">About</h2>
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                        <p className={`text-[12px] text-white/40 leading-relaxed ${showFullBio ? "" : "line-clamp-4"}`}>
                            {typeof bio === "string" ? bio : JSON.stringify(bio)}
                        </p>
                        {bio.length > 200 && (
                            <button onClick={() => setShowFullBio(!showFullBio)} className="text-[11px] text-white/50 font-medium mt-2">
                                {showFullBio ? "Show Less" : "Read More"}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Similar artists */}
            {similarArtists.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-base font-bold text-white/90 mb-3 px-5">Fans Also Like</h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
                        {similarArtists.map((a: any, i: number) => (
                            <button
                                key={(a.id || a.artistId || i) + "-sim"}
                                onClick={() => onNavigate({ id: "artist", data: a })}
                                className="flex-shrink-0 flex flex-col items-center w-[76px] active:scale-95 transition-transform"
                            >
                                <div className="w-[68px] h-[68px] rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                                    {getArt(a) && <img src={getArt(a)} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                </div>
                                <p className="mt-1.5 text-[10px] text-white/50 font-medium text-center truncate w-full">
                                    {decodeHtml(a.name || a.title || "")}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
