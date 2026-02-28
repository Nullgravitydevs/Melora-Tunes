"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, Pause, Radio, CheckCircle, Share2, Heart,
    MoreHorizontal, Clock, Calendar, MapPin, Disc, Music
} from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { getArt } from "@/lib/helpers";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { usePlayback } from "@/components/providers/playback-context";

interface ArtistViewProps {
    artist: any; // Initial artist object
    details: any; // Full details from API
    isFollowed: boolean;
    onToggleFollow: () => void;
    onPlaySong: (song: JioSaavnSong) => void;
    onPlayAll: () => void;
    onShare: () => void;
    isLoading?: boolean;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function ArtistView({
    artist, details, isFollowed, onToggleFollow,
    onPlaySong, onPlayAll, onShare, isLoading
}: ArtistViewProps) {
    const [activeTab, setActiveTab] = useState<'popular' | 'albums' | 'singles'>('popular');
    const { startRadio } = usePlayback();

    const heroImage = getArt(details || artist);
    const name = decodeHtml(details?.name || artist?.name || "Artist");
    const followers = details?.follower_count ? parseInt(details.follower_count).toLocaleString() : "0";

    if (isLoading && !details) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden bg-[#030303] rounded-2xl border border-white/5 relative">
            <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">

                {/* HERO SECTION */}
                <div className="relative h-[420px] w-full shrink-0">
                    <div className="absolute inset-0 z-0 mask-image-b-transparent">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent z-10"></div>
                        {heroImage ? (
                            <Image
                                src={heroImage}
                                alt={name}
                                fill
                                className="object-cover object-top opacity-80"
                                unoptimized
                                style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-neutral-900" />
                        )}
                    </div>

                    {/* Header Content */}
                    <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex flex-col items-start">
                        {details?.isVerified && (
                            <div className="flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-md">
                                <CheckCircle size={14} className="text-blue-400" fill="currentColor" />
                                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-100">Verified Artist</span>
                            </div>
                        )}

                        <h1 className="text-7xl md:text-8xl font-black text-white mb-4 tracking-tight drop-shadow-2xl leading-[0.9]">
                            {name}
                        </h1>

                        <p className="text-white/60 text-lg mb-8 font-medium flex items-center gap-2">
                            <span>{followers} Listeners</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                            <span className="text-white/40 capitalize">{details?.genre?.[0] || 'Artist'}</span>
                        </p>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={onPlayAll}
                                className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]"
                            >
                                <Play size={28} fill="currentColor" className="ml-1" />
                            </button>

                            <button
                                onClick={onToggleFollow}
                                className={`px-8 py-3.5 rounded-full border text-sm font-bold tracking-wide transition-all ${isFollowed ? 'bg-white text-black border-white' : 'border-white/30 text-white hover:bg-white/10 hover:border-white'}`}
                            >
                                {isFollowed ? "FOLLOWING" : "FOLLOW"}
                            </button>

                            <button
                                onClick={() => startRadio(artist)}
                                className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Start Radio"
                            >
                                <Radio size={22} />
                            </button>

                            <button
                                onClick={onShare}
                                className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Share2 size={22} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTENT TABS */}
                <div className="px-8 pb-32">
                    <div className="flex items-center gap-8 mb-8 border-b border-white/5 pb-4 sticky top-0 bg-[#030303]/90 backdrop-blur-xl z-30 pt-4">
                        <button
                            onClick={() => setActiveTab('popular')}
                            className={`text-sm font-bold tracking-wide transition-colors ${activeTab === 'popular' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            POPULAR
                        </button>
                        <button
                            onClick={() => setActiveTab('albums')}
                            className={`text-sm font-bold tracking-wide transition-colors ${activeTab === 'albums' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            ALBUMS
                        </button>
                        <button
                            onClick={() => setActiveTab('singles')}
                            className={`text-sm font-bold tracking-wide transition-colors ${activeTab === 'singles' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            SINGLES
                        </button>
                    </div>

                    {/* VIEW: POPULAR */}
                    {activeTab === 'popular' && (
                        <div className="flex flex-col gap-1">
                            <div className="grid grid-cols-[40px_1fr_1fr_60px] px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5 mb-2">
                                <span>#</span>
                                <span>Title</span>
                                <span>Album</span>
                                <span className="text-right"><Clock size={12} /></span>
                            </div>

                            {details?.topSongs?.map((song: JioSaavnSong, i: number) => (
                                <div
                                    key={song.id}
                                    onClick={() => onPlaySong(song)}
                                    className="group grid grid-cols-[40px_1fr_1fr_60px] items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                                >
                                    <div className="text-white/40 font-mono text-sm group-hover:hidden">{i + 1}</div>
                                    <div className="hidden group-hover:flex text-white"><Play size={16} fill="currentColor" /></div>

                                    <div className="flex items-center gap-4 min-w-0 pr-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800 relative overflow-hidden shrink-0">
                                            <Image src={getArt(song)} alt="" fill className="object-cover" unoptimized />
                                        </div>
                                        <span className="font-bold text-white truncate text-sm">{decodeHtml(song.name)}</span>
                                    </div>

                                    <div className="text-white/40 text-xs truncate pr-4">{decodeHtml(song.album?.name || "")}</div>
                                    <div className="text-right text-white/40 text-xs font-mono">{formatTime(song.duration)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIEW: ALBUMS / SINGLES */}
                    {(activeTab === 'albums' || activeTab === 'singles') && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {(activeTab === 'albums' ? details?.albums : details?.singles)?.map((album: any) => (
                                <div key={album.id} className="group p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10">
                                    <div className="aspect-square rounded-xl overflow-hidden mb-4 relative shadow-lg bg-black/50">
                                        <Image src={getArt(album)} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
                                                <Play size={24} fill="black" className="ml-1 text-black" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white text-sm truncate mb-1">{decodeHtml(album.name)}</h3>
                                    <p className="text-xs text-white/40">{album.year} • {album.type || 'Album'}</p>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </main>

            {/* SIDEBAR */}
            <aside className="w-80 border-l border-white/5 bg-[#050505] hidden xl:flex flex-col shrink-0 overflow-y-auto">
                <div className="p-6">
                    {/* Top Albums Widget */}
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                Top Albums <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {details?.albums?.slice(0, 3).map((album: any, i: number) => (
                                <div key={album.id} className="flex gap-4 items-center group cursor-pointer p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex overflow-hidden shrink-0 border border-white/5 group-hover:border-white/20 transition-colors relative">
                                        <Image src={getArt(album)} alt="" fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate block max-w-[170px]">{decodeHtml(album.name)}</h4>
                                        <p className="text-xs text-white/40">{album.year} • {album.type || 'Album'}</p>
                                    </div>
                                </div>
                            ))}
                            {(!details?.albums || details.albums.length === 0) && (
                                <div className="text-white/40 text-sm">No albums found.</div>
                            )}
                        </div>
                    </div>

                    {/* Fans Also Like */}
                    <div>
                        <h3 className="font-bold text-white text-lg mb-6">Fans Also Like</h3>
                        <div className="space-y-4">
                            {details?.similarArtists?.slice(0, 5).map((artist: any) => (
                                <div key={artist.id} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                                        <Image src={getArt(artist)} alt="" width={48} height={48} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{decodeHtml(artist.name)}</h4>
                                        <p className="text-[10px] text-white/40 truncate">Artist</p>
                                    </div>
                                    <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                        <Heart size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

// Ensure custom scrollbar styles are applied globally or in a local style block
