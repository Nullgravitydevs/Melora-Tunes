import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Play, Check, Disc, Shuffle } from "lucide-react";
import { TrackRow, SectionHeader, DiscoveryThemeColors, getArt, decodeHtml } from "./DiscoveryShared";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack } from "@/lib/types";

// High-res artwork helper
function getHighResArt(img: any) {
    if (!img) return '';
    let src =
        typeof img === 'string'
            ? img
            : Array.isArray(img)
                ? img[img.length - 1]?.link
                : img?.link;

    return (src || '')
        .replace(/50x50/g, '500x500')
        .replace(/150x150/g, '500x500');
}

interface ArtistViewProps {
    artistName: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onPlay: (song: JioSaavnSong, list?: JioSaavnSong[]) => void;
    onNavigate?: (view: string, data: any) => void;
}

interface ArtistDataState {
    name: string;
    image?: string;
    listeners?: string;
    topSongs: JioSaavnSong[];
    albums: { id: string; name: string; image: string; year: string }[];
}

export function ArtistView({
    artistName,
    colors,
    onBack,
    onPlay,
    onNavigate
}: ArtistViewProps) {
    const { currentSong, isPlaying } = usePlayback();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    const [artistData, setArtistData] = useState<ArtistDataState>({
        name: artistName,
        topSongs: [],
        albums: []
    });

    // ─── LOAD ARTIST DATA ─────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const loadArtist = async () => {
            setLoading(true);
            try {
                // Determine if artistName is actually a "Query" or a pure name.
                // We searchUnified which returns songs.
                const results = await searchUnified(artistName);

                const songs = results
                    .map(r => r?.song as JioSaavnSong)
                    .filter((s): s is JioSaavnSong => !!s);

                if (!songs.length) {
                    if (!cancelled) {
                        setArtistData({
                            name: artistName, // Keep original query name if nothing found
                            topSongs: [],
                            albums: []
                        });
                    }
                    return;
                }

                // Extract unique albums from song list
                const albumMap = new Map<string, any>();
                songs.forEach(song => {
                    if (song.album?.id && !albumMap.has(song.album.id)) {
                        albumMap.set(song.album.id, {
                            id: song.album.id,
                            name: decodeHtml(song.album.name),
                            image: getHighResArt(song.image),
                            year: song.year || ''
                        });
                    }
                });

                if (!cancelled) {
                    // Try to find the best image for the artist (usually from first song)
                    const heroArt = getHighResArt(getArt(songs[0]));

                    // Decode the artist name from the first result for better presentation
                    // But assume the first song's primary artist MIGHT be the search term
                    // Ideally we should match the artistName to the song's artists
                    // distinctArtistName is safer
                    const likelyName = decodeHtml(songs[0].primaryArtists.split(',')[0]);

                    setArtistData({
                        name: likelyName || decodeHtml(artistName),
                        image: heroArt,
                        listeners: `${songs.length}+ Popular Tracks`,
                        topSongs: songs.slice(0, 10),
                        albums: Array.from(albumMap.values()).slice(0, 8)
                    });
                }
            } catch (e) {
                console.error("Artist fetch failed:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadArtist();
        return () => {
            cancelled = true;
        };
    }, [artistName]);

    // ─── SCROLL ─────────────────────────────
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 280);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black">
                <div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent" />
            </div>
        );
    }

    // ─── NORMALIZE PLAYABLE SONGS ─────────────────────
    const playableSongs = artistData.topSongs
        .map(s => ensurePlayableTrack(s))
        .filter((t): t is PlayableTrack => !!t && !!t.song)
        .map(t => t.song!);

    return (
        <div className="flex-1 h-full relative bg-black overflow-hidden">

            {/* STICKY HEADER */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 h-20 flex items-center px-6 gap-6 transition-all duration-300
                ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
            >
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center transition-colors border border-white/5"
                >
                    <ChevronLeft size={22} className="text-white" />
                </button>

                <span
                    className={`text-xl font-bold text-white transition-all duration-300 transform
                    ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                    {artistData.name}
                </span>
            </div>

            <div
                ref={scrollRef}
                className="absolute inset-0 overflow-y-auto pb-32 [&::-webkit-scrollbar]:hidden scroll-smooth"
                onScroll={handleScroll}
            >

                {/* HERO SECTION */}
                <div className="relative h-[45vh] min-h-[350px] w-full group">
                    {/* Dynamic Blur Backdrop */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        {artistData.image && (
                            <motion.img
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 0.6, scale: 1 }}
                                transition={{ duration: 1.5 }}
                                src={artistData.image}
                                className="w-full h-full object-cover blur-3xl opacity-50"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-8 z-10 flex items-end gap-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-48 h-48 rounded-full border-4 border-black/50 overflow-hidden shadow-2xl relative shrink-0"
                        >
                            {artistData.image ? (
                                <img
                                    src={artistData.image}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                    <Disc size={40} className="text-white/20" />
                                </div>
                            )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 mb-3 text-white/70 text-xs font-bold uppercase tracking-widest"
                            >
                                <span className="w-4 h-4 rounded-full bg-[#1DA1F2] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                </span>
                                Verified Artist
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-2xl"
                            >
                                {decodeHtml(artistData.name)}
                            </motion.h1>

                            {artistData.listeners && (
                                <p className="text-white/60 mb-6 font-medium">
                                    {artistData.listeners}
                                </p>
                            )}

                            {playableSongs.length > 0 && (
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onPlay(playableSongs[0], playableSongs)}
                                        className="h-12 px-8 bg-white hover:bg-neutral-200
                                        text-black rounded-full font-bold uppercase tracking-wider
                                        flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                                    >
                                        <Play size={20} fill="black" /> Play
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            // Shuffle play
                                            const shuffled = [...playableSongs].sort(() => 0.5 - Math.random());
                                            onPlay(shuffled[0], shuffled);
                                        }}
                                        className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20
                                        flex items-center justify-center backdrop-blur-md border border-white/10"
                                    >
                                        <Shuffle size={20} className="text-white" />
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="px-8 py-8 space-y-12">

                    {/* TOP SONGS */}
                    {playableSongs.length > 0 && (
                        <section className="max-w-6xl">
                            <SectionHeader title="Popular" subtitle="Top hits and fan favorites" />
                            <div className="flex flex-col gap-1">
                                {playableSongs.map((song, i) => (
                                    <TrackRow
                                        key={song.id}
                                        index={i + 1}
                                        track={{
                                            id: song.id,
                                            title: decodeHtml(song.name),
                                            artist: decodeHtml(song.primaryArtists),
                                            duration: Number(song.duration || 0),
                                            art: getHighResArt(song.image),

                                            original: song
                                        }}
                                        colors={colors}
                                        isPlaying={currentSong?.id === song.id && isPlaying}
                                        onPlay={() => onPlay(song, playableSongs)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ALBUMS */}
                    {artistData.albums.length > 0 && (
                        <section>
                            <SectionHeader title="Discography" subtitle="Albums and Singles" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {artistData.albums.map(album => (
                                    <motion.div
                                        key={album.id}
                                        whileHover={{ y: -5 }}
                                        className="cursor-pointer group"
                                        onClick={() => onNavigate?.('album', album.id)}
                                    >
                                        <div className="aspect-square rounded-lg bg-neutral-900 mb-3 overflow-hidden shadow-lg border border-white/5 relative">
                                            <img
                                                src={album.image}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-200">
                                                    <Disc size={20} className="text-black" />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-white truncate group-hover:text-green-400 transition-colors">
                                            {album.name}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-white/50 mt-1">
                                            <span>Album</span>
                                            <span>{album.year}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </div>
    );
}
