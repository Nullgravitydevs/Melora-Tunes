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
            className="w-64 flex-shrink-0 border-l p-4 flex flex-col overflow-hidden"
            style={{
                backgroundColor: c.surface,
                borderColor: c.border
            }}
        >
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold">Recent Played</span>
                <span
                    className="text-[10px] cursor-pointer hover:underline font-medium"
                    style={{ color: c.textMuted }}
                >
                    See All
                </span>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {recent.length === 0 && (
                    <p className="text-xs text-center opacity-50 mt-4">
                        No recent songs
                    </p>
                )}

                {recent.slice(0, 20).map(item => {
                    const song = item.track?.song;
                    if (!song) return null;

                    const art = getArt(song);

                    return (
                        <motion.div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer group relative"
                            whileHover={{
                                backgroundColor: c.accentSoft,
                                x: 2
                            }}
                            onClick={() => handlePlay(song)}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                            {/* Album Art */}
                            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                {art ? (
                                    <img
                                        src={art}
                                        alt={song.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full"
                                        style={{ backgroundColor: c.border }}
                                    />
                                )}

                                <motion.div
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    transition={{ duration: 0.15 }}
                                >
                                    <Play size={16} fill="#fff" color="#fff" />
                                </motion.div>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-xs font-semibold truncate hover:underline"
                                    onClick={(e) => handleArtistClick(e, song.primaryArtists)}
                                >
                                    {song.name}
                                </p>
                                <p
                                    className="text-[10px] truncate hover:text-white transition-colors"
                                    style={{ color: c.textMuted }}
                                    onClick={(e) => handleArtistClick(e, song.primaryArtists)}
                                >
                                    {song.primaryArtists}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Downloads Card */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                            <Download size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white">
                                Downloads
                            </p>
                            <p className="text-[10px] text-white/50 font-mono tracking-wider">
                                OFFLINE
                            </p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-white w-3/4 rounded-full opacity-50" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
