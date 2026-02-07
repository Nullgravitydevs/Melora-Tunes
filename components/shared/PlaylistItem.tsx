
import React from 'react';
import { motion } from "framer-motion";
import { Disc } from "lucide-react";
import { Mix } from "@/components/providers/playback-context";
import { isPlayableTrack } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";

interface PlaylistItemProps {
    mix: Mix;
    index: number;
    onClick: () => void;
    onDropSong: (song: any) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function PlaylistItemComponent({ mix, index, onClick, onDropSong, onContextMenu }: PlaylistItemProps) {
    const [isDragOver, setIsDragOver] = React.useState(false);

    // Generate 2x2 Art Grid
    const gridArt = React.useMemo(() => {
        if (!mix.songs || mix.songs.length === 0) return [];
        // Get first 4 unique images
        const images: string[] = [];
        for (const s of mix.songs) {
            if (images.length >= 4) break;
            const art = isPlayableTrack(s) ? s.art : ensurePlayableTrack(s).art;
            if (art && !images.includes(art)) images.push(art);
        }
        return images;
    }, [mix.songs]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            onContextMenu={(e) => onContextMenu(e, mix.id)}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    try {
                        const song = JSON.parse(data);
                        onDropSong(song);
                    } catch (e) {
                        console.error("Drop failed", e);
                    }
                }
            }}
            className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${isDragOver
                ? 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
        >
            {/* ARTWORK */}
            <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-white/5 relative shadow-sm group-hover:shadow-md transition-shadow">
                {gridArt.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Disc size={16} />
                    </div>
                ) : gridArt.length < 4 ? (
                    <img src={gridArt[0]} alt={mix.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <div className="grid grid-cols-2 w-full h-full">
                        {gridArt.map((src, i) => (
                            <img key={i} src={src} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ))}
                    </div>
                )}
                {/* Playing Indicator Overlay could go here if Active */}
            </div>

            <div className="min-w-0">
                <div className="text-sm font-medium text-white/80 group-hover:text-white truncate transition-colors leading-tight">
                    {mix.title}
                </div>
                <div className="text-[10px] text-white/40 truncate mt-0.5">
                    {mix.songs.length} songs
                </div>
            </div>
        </motion.div>
    );
}

export const PlaylistItem = React.memo(PlaylistItemComponent, (prev, next) => {
    return prev.mix.id === next.mix.id &&
        prev.mix.title === next.mix.title &&
        prev.mix.songs.length === next.mix.songs.length && // Shallow check for performace
        prev.index === next.index;
});
