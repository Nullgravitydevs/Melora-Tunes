import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Check } from "lucide-react";
import { TrackRow, SectionHeader, DiscoveryThemeColors, getArt } from "./DiscoveryShared";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";

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
    onPlay: (song: any, list?: any[]) => void;
    onNavigate?: (view: string, data: any) => void;
}

export function ArtistView({
    artistName,
    colors,
    onBack,
    onPlay,
    onNavigate
}: ArtistViewProps) {
    const { currentSong, isPlaying } = usePlayback();

    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    const [artistData, setArtistData] = useState<{
        name: string;
        image?: string;
        listeners?: string;
        topSongs: any[];
        albums: any[];
    }>({
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
                const results = await searchUnified(artistName);

                const songs = results
                    .map(r => r?.song)
                    .filter((s): s is any => !!s);

                if (!songs.length) {
                    if (!cancelled) {
                        setArtistData({
                            name: artistName,
                            topSongs: [],
                            albums: []
                        });
                    }
                    return;
                }

                const albumMap = new Map<string, any>();
                songs.forEach(song => {
                    if (song.album?.id && !albumMap.has(song.album.id)) {
                        albumMap.set(song.album.id, {
                            id: song.album.id,
                            name: song.album.name,
                            image: getHighResArt(song.image)
                        });
                    }
                });

                if (!cancelled) {
                    setArtistData({
                        name: artistName,
                        image: getHighResArt(getArt(songs[0])),
                        listeners: `${songs.length} tracks`,
                        topSongs: songs.slice(0, 10),
                        albums: Array.from(albumMap.values()).slice(0, 6)
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
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent" />
            </div>
        );
    }

    // ─── NORMALIZE PLAYABLE SONGS ─────────────────────
    const playableSongs = artistData.topSongs
        .map(s => ensurePlayableTrack(s))
        .filter((t): t is any => !!t?.song)
        .map(t => t.song);

    return (
        <div className="flex-1 h-full relative bg-black">

            {/* STICKY HEADER */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 h-20 flex items-center px-6 gap-6 transition-all
                ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
            >
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center"
                >
                    <ChevronLeft size={22} className="text-white" />
                </button>

                <span
                    className={`text-xl font-bold text-white transition-opacity
                    ${scrolled ? 'opacity-100' : 'opacity-0'}`}
                >
                    {artistData.name}
                </span>
            </div>

            <div
                className="absolute inset-0 overflow-y-auto pb-32 [&::-webkit-scrollbar]:hidden"
                onScroll={handleScroll}
            >

                {/* HERO */}
                <div className="relative h-[40vh] min-h-[300px] w-full">
                    <div className="absolute inset-0">
                        {artistData.image && (
                            <img
                                src={artistData.image}
                                className="w-full h-full object-cover opacity-60"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
                        <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-8 z-10 flex items-end gap-8">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-48 h-48 rounded-full border-4 border-black overflow-hidden shadow-2xl"
                        >
                            {artistData.image && (
                                <img
                                    src={artistData.image}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </motion.div>

                        <div>
                            <div className="flex items-center gap-2 mb-2 text-white/60 text-xs font-bold uppercase tracking-widest">
                                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                </span>
                                Verified Artist
                            </div>

                            <h1 className="text-6xl font-black text-white mb-2">
                                {artistData.name}
                            </h1>

                            {artistData.listeners && (
                                <p className="text-white/70 mb-6">
                                    {artistData.listeners}
                                </p>
                            )}

                            {playableSongs.length > 0 && (
                                <button
                                    onClick={() => onPlay(playableSongs[0], playableSongs)}
                                    className="h-12 px-8 bg-[#1DB954] hover:bg-[#1ed760]
                                    text-black rounded-full font-bold uppercase tracking-wider
                                    flex items-center gap-2 shadow-lg"
                                >
                                    <Play size={18} fill="black" /> Play
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="px-8 py-8 space-y-12">

                    {/* TOP SONGS */}
                    {playableSongs.length > 0 && (
                        <section className="max-w-5xl">
                            <SectionHeader title="Popular" />
                            <div className="flex flex-col gap-1">
                                {playableSongs.map((song, i) => (
                                    <TrackRow
                                        key={song.id}
                                        index={i + 1}
                                        track={{
                                            id: song.id,
                                            title: song.name,
                                            artist: song.primaryArtists,
                                            duration: song.duration
                                                ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}`
                                                : '--:--',
                                            art: getHighResArt(song.image),
                                            original: song
                                        }}
                                        colors={colors}
                                        isPlaying={(currentSong as any)?.song?.id === song.id && isPlaying}
                                        onPlay={() => onPlay(song, playableSongs)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ALBUMS */}
                    {artistData.albums.length > 0 && (
                        <section>
                            <SectionHeader title="Discography" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {artistData.albums.map(album => (
                                    <div
                                        key={album.id}
                                        className="cursor-pointer"
                                        onClick={() => onNavigate?.('album', album.id)}
                                    >
                                        <div className="aspect-square rounded-lg bg-white/5 mb-3 overflow-hidden">
                                            <img
                                                src={album.image}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-white truncate">
                                            {album.name}
                                        </p>
                                        <p className="text-xs text-white/50">
                                            Album
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </div>
    );
}
