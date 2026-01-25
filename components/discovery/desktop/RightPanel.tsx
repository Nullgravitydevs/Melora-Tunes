import React from "react";
import { motion } from "framer-motion";
import { Download, Play } from "lucide-react";
import { getArt } from "../DiscoveryShared";

interface RightPanelProps {
    recent: any[];
    handlePlay: (item: any) => void;
    colors: any;
    navigateToArtist: (name: string) => void;
}

export function RightPanel({
    recent,
    handlePlay,
    colors: c,
    navigateToArtist
}: RightPanelProps) {
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
                <span className="text-[10px] cursor-pointer hover:underline font-medium" style={{ color: c.textMuted }}>See All</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {recent.length === 0 && (
                    <p className="text-xs text-center opacity-50 mt-4">No recent songs</p>
                )}
                {recent.slice(0, 20).map(item => {
                    if (!item.track || !item.track.song) return null;
                    return (
                        <motion.div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer group relative"
                            style={{ backgroundColor: 'transparent' }}
                            whileHover={{
                                backgroundColor: c.accentSoft,
                                x: 2
                            }}
                            // FIXED: Use song object
                            onClick={() => handlePlay(item.track.song)}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                            {/* Album Art with Play Overlay */}
                            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                {getArt(item.track.song) ? (
                                    <img
                                        src={getArt(item.track.song)}
                                        alt={item.track.song.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: c.border }} />
                                )}
                                {/* Play overlay on hover */}
                                <motion.div
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    transition={{ duration: 0.15 }}
                                >
                                    <Play size={16} fill="#fff" color="#fff" />
                                </motion.div>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                {/* FIXED: Non-null assertion for safe TS access */}
                                <p className="text-xs font-semibold truncate hover:underline" onClick={(e) => { e.stopPropagation(); navigateToArtist(item.track.song!.primaryArtists.split(',')[0].trim()); }}>{item.track.song!.name}</p>
                                <p className="text-[10px] truncate hover:text-white transition-colors" style={{ color: c.textMuted }} onClick={(e) => { e.stopPropagation(); navigateToArtist(item.track.song!.primaryArtists.split(',')[0].trim()); }}>{item.track.song!.primaryArtists}</p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Downloads / Offline Card */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                            <Download size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white group-hover:text-white transition-colors">Downloads</p>
                            <p className="text-[10px] text-white/50 font-mono tracking-wider">OFFLINE</p>
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
