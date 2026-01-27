import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Play, Clock, Heart } from "lucide-react";
import { TrackRow, DiscoveryThemeColors, getArt } from "./DiscoveryShared";
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

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent" />
            </div>
        );
    }

    if (!albumData || playableSongs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                    <Clock size={40} />
                </div>
                <p>Album not found or empty.</p>
                <button onClick={onBack} className="text-white hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full relative bg-black">

            {/* CONTENT */}
            <div className="absolute inset-0 overflow-y-auto pb-32 [&::-webkit-scrollbar]:hidden">

                {/* HEADER */}
                <div className="p-8 pt-12 flex flex-col md:flex-row items-end gap-8 bg-gradient-to-b from-white/10 to-black">
                    <div className="w-48 h-48 md:w-60 md:h-60 rounded-xl overflow-hidden shadow-2xl">
                        {albumData.image ? (
                            <img
                                src={albumData.image}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-800" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                            Album
                        </p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-none">
                            {albumData.name}
                        </h1>
                        <div className="flex items-center gap-2 text-white/80 font-medium">
                            <span>{albumData.artist}</span>
                            <span>•</span>
                            <span>{albumData.year}</span>
                            <span>•</span>
                            <span>{playableSongs.length} songs</span>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="px-8 py-6 flex items-center gap-4">
                    <button
                        onClick={() =>
                            onPlay(playableSongs[0], playableSongs)
                        }
                        className="h-14 w-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760]
                        text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                    >
                        <Play size={28} fill="black" className="ml-1" />
                    </button>

                    <button
                        className="w-10 h-10 rounded-full border border-white/20
                        flex items-center justify-center hover:border-white
                        text-white/50 hover:text-white transition-colors"
                    >
                        <Heart size={20} />
                    </button>
                </div>

                {/* TRACK LIST */}
                <div className="px-8">
                    <div className="flex flex-col gap-1">
                        {playableSongs.map((song: any, i: number) => (
                            <TrackRow
                                key={song.id}
                                index={i + 1}
                                track={{
                                    id: song.id,
                                    title: song.name,
                                    artist: song.primaryArtists,
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
                                onPlay={() =>
                                    onPlay(song, playableSongs)
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* BACK BUTTON */}
            <div className="absolute top-6 left-6 z-50">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md
                    flex items-center justify-center hover:bg-white/20 text-white"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>
        </div>
    );
}
