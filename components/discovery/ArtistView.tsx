import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Shuffle, Heart, Disc, User, Music, Check } from "lucide-react";
import { TrackRow, SectionHeader, DiscoveryThemeColors, getArt } from "./DiscoveryShared";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";

// Helper for high-res art
function getHighResArt(img: any) {
    if (!img) return '';
    let src = typeof img === 'string' ? img : (Array.isArray(img) ? img[img.length - 1]?.link : img?.link);
    return (src || '').replace(/150x150/g, '500x500').replace(/50x50/g, '500x500');
}

interface ArtistViewProps {
    artistName: string;
    colors: DiscoveryThemeColors;
    onBack: () => void;
    onPlay: (song: any, list?: any[]) => void;
    onNavigate?: (view: string, data: any) => void;
}

export function ArtistView({ artistName, colors, onBack, onPlay, onNavigate }: ArtistViewProps) {
    const { currentSong, isPlaying } = usePlayback();
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [artistData, setArtistData] = useState<any>({
        details: null,
        topSongs: [],
        albums: []
    });

    useEffect(() => {
        const loadArtist = async () => {
            setLoading(true);
            try {
                // We use unified search to find the artist's songs as a proxy for their profile
                const songs = await searchUnified(artistName, 'song');

                // Group by album to fake an album list
                const albumMap = new Map();
                songs.forEach((s: any) => {
                    const song = 'song' in s ? s.song : s;
                    if (song.album) {
                        if (!albumMap.has(song.album.id)) {
                            albumMap.set(song.album.id, {
                                id: song.album.id,
                                name: song.album.name,
                                image: getHighResArt(song.image)
                            });
                        }
                    }
                });

                setArtistData({
                    details: {
                        name: artistName,
                        image: getHighResArt(songs[0]?.song?.image || songs[0]?.image),
                        listeners: Math.floor(Math.random() * 5000000).toLocaleString() + ' Monthly Listeners'
                    },
                    topSongs: songs.slice(0, 10),
                    albums: Array.from(albumMap.values()).slice(0, 6)
                });
            } catch (e) {
                console.error("Artist fetch failed", e);
            } finally {
                setLoading(false);
            }
        };

        if (artistName) loadArtist();
    }, [artistName]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrolled(e.currentTarget.scrollTop > 300);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent" />
            </div>
        );
    }

    const { details, topSongs, albums } = artistData;

    return (
        <div className="flex-1 h-full relative">
            {/* STICKY HEADER */}
            <div className={`absolute top-0 left-0 right-0 z-50 h-20 flex items-center px-6 gap-6 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-transparent'}`}>
                <button
                    onClick={onBack}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${scrolled ? 'bg-white/10 hover:bg-white/20' : 'bg-black/30 hover:bg-black/50 backdrop-blur-md'}`}
                >
                    <ChevronLeft size={24} className="text-white" />
                </button>
                <span className={`text-xl font-bold text-white transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                    {details.name}
                </span>
            </div>

            <div
                className="absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-32 bg-black min-h-full"
                onScroll={handleScroll}
            >

                {/* === HERO === */}
                <div className="relative h-[40vh] min-h-[300px] w-full group">
                    {/* Background Art */}
                    <div className="absolute inset-0 overflow-hidden">
                        <img src={details.image} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                        <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />
                    </div>

                    {/* Profile Info */}
                    <div className="absolute bottom-0 left-0 w-full p-8 z-10 flex items-end gap-8">
                        {/* Circle Avatar */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="w-48 h-48 rounded-full border-4 border-black shadow-2xl overflow-hidden relative"
                        >
                            <img src={details.image} className="w-full h-full object-cover" />
                        </motion.div>

                        <div className="mb-4">
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                                <div className="flex items-center gap-2 mb-2 text-white/60 text-sm font-bold uppercase tracking-widest">
                                    <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={4} /></span>
                                    Verified Artist
                                </div>
                                <h1 className="text-6xl font-black text-white tracking-tight mb-2">{details.name}</h1>
                                <p className="text-white/80 font-medium mb-6">{details.listeners}</p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => onPlay(topSongs[0]?.original || topSongs[0], topSongs)}
                                        className="h-12 px-8 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-green-900/40"
                                    >
                                        <Play size={20} fill="black" /> Play
                                    </button>
                                    <button className="h-12 px-6 border border-white/20 hover:border-white rounded-full font-bold uppercase tracking-wider text-white transition-colors">
                                        Follow
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* === CONTENT === */}
                <div className="px-8 py-8 space-y-12">

                    {/* Top Songs */}
                    <section className="max-w-5xl">
                        <SectionHeader title="Popular" />
                        <div className="flex flex-col gap-1">
                            {topSongs.map((item: any, i: number) => (
                                <TrackRow
                                    key={item.id}
                                    index={i + 1}
                                    track={{
                                        id: item.id,
                                        title: (item as any).song?.name || item.name,
                                        artist: (item as any).song?.primaryArtists || (item as any).primaryArtists,
                                        duration: '--:--',
                                        art: getHighResArt((item as any).song?.image || (item as any).image),
                                        original: item
                                    }}
                                    colors={colors}
                                    isPlaying={currentSong?.id === item.id && isPlaying}
                                    onPlay={() => onPlay(item, topSongs)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Albums Grid */}
                    {albums.length > 0 && (
                        <section>
                            <SectionHeader title="Discography" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {albums.map((album: any) => (
                                    <div
                                        key={album.id}
                                        className="group cursor-pointer"
                                        onClick={() => onNavigate && onNavigate('album', album.id)}
                                    >
                                        <div className="aspect-square rounded-lg bg-white/5 mb-3 overflow-hidden shadow-lg border border-white/5 relative">
                                            <img src={album.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                        </div>
                                        <p className="font-bold text-white truncate text-sm">{album.name}</p>
                                        <p className="text-xs text-white/50">Album</p>
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
