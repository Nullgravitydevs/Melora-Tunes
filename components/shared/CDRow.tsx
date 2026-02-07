
import React from 'react';
import { Plus } from 'lucide-react';
import { decodeHtml } from '@/lib/utils';
import { PlayableTrack, PlayableSource } from '@/lib/types';
import { JioSaavnSong } from '@/lib/jiosaavn';

export interface CDRowProps {
    track: PlayableTrack | any;
    onPlay: () => void;
    onAdd: (e?: React.MouseEvent) => void;
}

export function CDRowComponent({ track, onPlay, onAdd }: CDRowProps) {
    // Extract Quality Badge
    let badge = null;
    const sources = track.sources || [];
    if (sources.some((s: PlayableSource) => s.quality === 'hires')) badge = "Hi-Res";
    else if (sources.some((s: PlayableSource) => s.quality === 'flac')) badge = "FLAC";
    else if (sources.some((s: PlayableSource) => s.quality === '320')) badge = "320kbps";

    // Handle Image Extraction
    const getImage = (item: any) => {
        const song = item.song;
        if (!song) return '';
        if (typeof song.image === 'string') return song.image;
        if (Array.isArray(song.image)) {
            // Get highest quality (500x500) or last
            const highRes = song.image.find((i: any) => i.quality === '500x500');
            return highRes?.link || song.image[song.image.length - 1]?.link || '';
        }
        return '';
    };

    const art = getImage(track);

    return (
        <div
            className="group relative h-20 w-full flex items-center p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            onClick={onPlay}
        >
            {/* BOX + CD ANIMATION CONTAINER */}
            <div className="relative w-16 h-16 mr-4 flex-shrink-0 z-10">
                {/* THE DISC (Behind the Art) - Hover Translate */}
                <div className="absolute top-1 left-1 w-14 h-14 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center shadow-xl group-hover:translate-x-8 transition-transform duration-500 ease-out z-0">
                    <div className="w-4 h-4 rounded-full bg-black border border-white/10" />
                    {/* Shiny gradient overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50" />
                </div>

                {/* ALBUM ART (In Front) */}
                <div className="absolute inset-0 rounded-md overflow-hidden bg-neutral-900 shadow-lg z-10 border border-white/5">
                    {art && (
                        <img
                            src={art}
                            className="w-full h-full object-cover"
                            alt={track.song?.name || "Album Art"}
                            loading="lazy"
                            decoding="async"
                        />
                    )}
                </div>
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center z-20 pl-4 bg-transparent">
                {/* Added transparent bg to ensure text doesn't block disc if it slides under? No, disc slides right. */}
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm truncate">{decodeHtml(track.song?.name || "Unknown")}</h3>
                    {badge && (
                        <span className={`text-[9px] px-1 rounded uppercase font-bold tracking-wider 
                            ${badge === 'Hi-Res' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20' :
                                badge === 'FLAC' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' :
                                    'bg-zinc-700/50 text-zinc-400 border border-zinc-700'}
                        `}>
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-xs text-white/50 truncate">{decodeHtml(track.song?.primaryArtists || "")}</p>
            </div>

            {/* QUICK ACTIONS */}
            <button
                onClick={(e) => { e.stopPropagation(); onAdd(e); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors text-white/60 hover:text-white z-20 relative"
            >
                <Plus size={18} />
            </button>
        </div>
    );
}

export const CDRow = React.memo(CDRowComponent, (prev, next) => {
    return prev.track.id === next.track.id && prev.track.image === next.track.image;
});
