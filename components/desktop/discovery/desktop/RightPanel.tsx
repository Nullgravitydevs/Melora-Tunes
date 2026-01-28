import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Play } from "lucide-react";
import { getArt } from "../DiscoveryShared";

interface RecentItem {
    id: string;
    track?: {
        song?: {
            id: string;
            name: string;
            primaryArtists: string;
            image?: any;
        };
    };
}

interface RightPanelProps {
    recent: RecentItem[];
    handlePlay: (item: any) => void;
    colors: {
        surface: string;
        border: string;
        accentSoft: string;
        textMuted: string;
    };
    navigateToArtist: (name: string) => void;
}

export function RightPanel({
    recent,
    handlePlay,
    colors: c,
    navigateToArtist
}: RightPanelProps) {

    const handleArtistClick = useCallback(
        (e: React.MouseEvent, artists: string) => {
            e.stopPropagation();
            const name = artists.split(',')[0]?.trim();
            if (name) navigateToArtist(name);
        },
        [navigateToArtist]
    );

    return (
        <aside
            className="w-64 flex-shrink-0 flex flex-col overflow-hidden px-4 py-5"
            style={{
                backgroundColor: c.surface,
                borderLeft: `1px solid ${c.border}`
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                    Recent Played
                </span>
                <span
                    className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                    See all
                </span>
            </div>

            {/* List */}
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {recent.length === 0 && (
                    <p className="text-[10px] text-center text-white/30 mt-6">
                        Nothing played yet
                    </p>
                )}

                {recent.slice(0, 20).map(item => {
                    const song = item.track?.song;
                    if (!song) return null;

                    const art = getArt(song);

                    return (
                        <motion.div
                            key={item.id}
                            className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer group"
                            whileHover={{
                                backgroundColor: c.accentSoft
                            }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handlePlay(song)}
                        >
                            {/* Art */}
                            <div className="w-10 h-10 rounded-md overflow-hidden relative flex-shrink-0 bg-neutral-900">
                                {art && (
                                    <img
                                        src={art}
                                        alt={song.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={14} fill="white" />
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0 leading-tight">
                                <p
                                    className="text-xs font-medium text-white truncate"
                                >
                                    {song.name}
                                </p>
                                <p
                                    className="text-[10px] truncate text-white/40 hover:text-white/60 transition-colors"
                                    onClick={(e) => handleArtistClick(e, song.primaryArtists)}
                                >
                                    {song.primaryArtists}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Downloads */}
            <div className="mt-5 pt-4 border-t border-white/5">
                <div className="rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                            <Download size={16} className="text-white/80" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">
                                Downloads
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-white/40">
                                Offline
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[2px] bg-white/10 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-white/60 w-3/4 rounded-full" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
