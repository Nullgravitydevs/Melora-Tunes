import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, Play, Clock, Heart, MoreVertical, Disc } from "lucide-react";
import { motion } from "framer-motion";
import { TrackRow, DiscoveryThemeColors, getArt, SkeletonTrackRow, decodeHtml } from "./DiscoveryShared";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { getAlbumDetails } from "@/lib/jiosaavn";

interface AlbumViewProps {
    albumId: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onPlay: (song: any, list?: any[]) => void;
}

export function AlbumView({
    albumId,
    colors,
    onBack,
    onPlay
}: AlbumViewProps) {
    const { currentSong, isPlaying } = usePlayback();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);

    const [loading, setLoading] = useState(true);
    const [albumData, setAlbumData] = useState<any>(null);

    // Defensive ID extraction
    const safeId =
        typeof albumId === "object" ? (albumId as any).albumId : albumId;

    useEffect(() => {
        let cancelled = false;

        const loadAlbum = async () => {
            setLoading(true);
            try {
                const songs = await getAlbumDetails(safeId);

                if (!cancelled && songs?.length) {
                    const first = songs[0];
                    setAlbumData({
                        name: first.album?.name || first.name,
                        artist: first.primaryArtists,
                        image: getArt(first),
                        year: first.year,
                        songs
                    });
                } else if (!cancelled) {
                    setAlbumData({ songs: [] });
                }
            } catch (e) {
                console.error("Album load failed:", e);
                if (!cancelled) setAlbumData({ songs: [] });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (safeId) loadAlbum();
        return () => {
            cancelled = true;
        };
    }, [safeId]);

    // ✅ Normalize playable tracks ONCE
    const playableTracks = useMemo(() => {
        return (albumData?.songs || [])
            .map((s: any) => ensurePlayableTrack(s))
            .filter((t: any): t is any => !!t?.song);
    }, [albumData]);

    const playableSongs = useMemo(
        () => playableTracks.map((t: any) => t.song),
        [playableTracks]
    );

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 50);
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-black">
                <div className="w-16 h-16 border-4 border-neutral-800 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-white/40 text-sm font-medium animate-pulse">Loading Album...</p>
            </div>
        );
    }

    if (!albumData || playableSongs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4 bg-black">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-2">
                    <Disc size={40} className="opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-white">Album Not Found</h3>
                <p className="text-sm max-w-xs text-center">We couldn't seem to find the tracks for this album. It might be unavailable.</p>
                <button
                    onClick={onBack}
                    className="mt-4 px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full relative bg-black overflow-hidden group">

            {/* DYNAMIC BACKDROP */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <motion.img
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    transition={{ duration: 1.5 }}
                    src={albumData.image}
                    className="w-full h-full object-cover blur-[100px] opacity-40 scale-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
            </div>

            {/* STICKY NAV */}
            <div
                className={`absolute top-0 left-0 right-0 z-40 h-16 flex items-center px-6 transition-colors duration-300 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
                    }`}
            >
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors mr-4"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className={`font-bold text-white text-lg transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}>
                    {decodeHtml(albumData.name)}
                </span>
            </div>

            {/* CONTENT */}
            <div
                className="absolute inset-0 z-30 overflow-y-auto pb-40 scrollbar-hide"
                onScroll={handleScroll}
                ref={scrollRef}
            >
                <div className="pt-24 px-8 md:px-12 max-w-7xl mx-auto">

                    {/* HERO SECTION */}
                    <div className="flex flex-col md:flex-row items-end gap-10 mb-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative group shrink-0"
                        >
                            <div className="w-56 h-56 md:w-72 md:h-72 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden relative z-10">
                                <img src={albumData.image} className="w-full h-full object-cover" />
                            </div>
                            {/* Vinyl Effect */}
                            <div className="absolute top-2 right-2 -mr-12 w-full h-full rounded-full bg-black flex items-center justify-center z-0 transition-transform duration-700 md:group-hover:translate-x-12">
                                <div className="w-24 h-24 rounded-full border-2 border-white/20" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex-1"
                        >
                            <span className="text-xs font-bold tracking-[0.2em] text-white/60 mb-2 block uppercase">
                                Album
                            </span>
                            <h1 className="text-4xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
                                {decodeHtml(albumData.name)}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/70">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden">
                                        <img src={albumData.image} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-white hover:underline cursor-pointer">
                                        {decodeHtml(albumData.artist)}
                                    </span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span>{albumData.year}</span>
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span>{playableSongs.length} songs</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* ACTION BAR */}
                    <div className="flex items-center gap-6 mb-10">
                        <button
                            onClick={() => onPlay(playableSongs[0], playableSongs)}
                            className="h-16 w-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/10"
                        >
                            <Play size={28} fill="black" className="ml-1" />
                        </button>

                        <button className="h-12 w-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 hover:border-white transition-all">
                            <Heart size={22} />
                        </button>

                        <button className="h-12 w-12 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors">
                            <MoreVertical size={24} />
                        </button>
                    </div>

                    {/* TRACKLIST */}
                    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-2 md:p-6 border border-white/5">
                        <div className="grid grid-cols-[16px_1fr_auto] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 border-b border-white/5 mb-4">
                            <span>#</span>
                            <span>Title</span>
                            <Clock size={14} />
                        </div>

                        <div className="flex flex-col gap-1">
                            {playableSongs.map((song: any, i: number) => (
                                <TrackRow
                                    key={song.id || i}
                                    index={i + 1}
                                    track={{
                                        id: song.id,
                                        title: decodeHtml(song.name || song.title),
                                        artist: decodeHtml(song.primaryArtists || song.artist),
                                        duration: song.duration
                                            ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
                                            : "--:--",
                                        art: getArt(song),
                                        original: song
                                    }}
                                    colors={colors}
                                    isPlaying={
                                        (currentSong as any)?.song?.id === song.id &&
                                        isPlaying
                                    }
                                    onPlay={() => onPlay(song, playableSongs)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
