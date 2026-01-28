"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ListMusic } from "lucide-react";
import { decodeHtml } from "@/lib/utils";

interface CoverFlowMobileProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIndex?: number;
    items?: any[];
    isFlipped?: boolean;
    trackIndex?: number; // Selected track when flipped
}

export function CoverFlowMobile({
    isOpen,
    onClose,
    selectedIndex = 0,
    items = [] as any[],
    isFlipped = false,
    trackIndex = 0
}: CoverFlowMobileProps) {
    // Map unbounded index to 0..N-1 correctly handling negatives
    const length = items.length || 1;
    const safeIndex = ((selectedIndex % length) + length) % length;
    const safeTrackIndex = trackIndex || 0;

    // Get current item data
    const activeItem = items[safeIndex]?.data;

    if (!isOpen) return null;

    // Use items or fallback loop if empty
    const displayItems = items.length > 0 ? items : [];

    // Performance: Only render visible window (+/- 4 items)
    // We generate relative offsets and map to actual items
    const visibleOffsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

    return (
        <div className="w-full h-full bg-black relative overflow-hidden flex flex-col items-center justify-center perspective-[800px]">

            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black z-0" />

            {/* 3D Stage */}
            <div className="relative w-full h-[50%] flex items-center justify-center transform-style-3d z-10 mt-[40px]">
                <AnimatePresence mode='popLayout'>
                    {visibleOffsets.map((offset) => {
                        // Calculate actual index for this offset (Circular)
                        const i = ((safeIndex + offset) % length + length) % length;
                        const item = displayItems[i];
                        if (!item) return null;

                        const isCenter = offset === 0;

                        // Classic iPod Physics (adjusted for proper screen fit)
                        const x = offset * 55; // Spacing for cards
                        const z = Math.abs(offset) * -170; // Depth push

                        // FLIP LOGIC: If center and flipped, rotate 180. unique state.
                        let rotateY = offset === 0 ? 0 : offset > 0 ? -70 : 70;
                        if (isCenter && isFlipped) rotateY = 180;

                        const opacity = isCenter ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.2);
                        const scale = isCenter ? 1.2 : 1;
                        const zIndex = 100 - Math.abs(offset);

                        const src = item.data?.image || "";
                        // Stable ID for key
                        const itemKey = item.data?.id || item.id || `item-${i}`;

                        return (
                            <motion.div
                                key={itemKey}
                                className={`absolute w-36 h-36 bg-transparent pointer-events-auto cursor-pointer`}
                                initial={false}
                                animate={{
                                    x,
                                    z,
                                    rotateY,
                                    scale,
                                    opacity,
                                    zIndex
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 120,
                                    damping: 18,
                                    mass: 0.8
                                }}
                                style={{
                                    transformStyle: "preserve-3d",
                                }}
                                onClick={() => {
                                    // Make center clickable for flip, or sides clickable for scroll?
                                    // For now, allow pointer events so parent can potentially handle if passed props.
                                    // But we don't have onSelect prop here. 
                                    // Assuming parent handles rotation via selectedIndex.
                                }}
                            >
                                {/* FRONT FACE (Artwork) */}
                                <div
                                    className="absolute inset-0 w-full h-full backface-hidden"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <div className={`w-full h-full rounded-sm shadow-2xl relative bg-black border-[1px] ${isCenter ? 'border-white/50' : 'border-white/10'}`}>
                                        {src ? (
                                            <img
                                                src={src}
                                                alt="Album cover"
                                                className="w-full h-full object-cover object-center rounded-[1px]"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                                <span className="text-2xl">♪</span>
                                            </div>
                                        )}
                                        {/* Subtle Gloss */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                    </div>

                                    {/* Subtle Reflection (Front only - Optimized to center only) */}
                                    {Math.abs(offset) <= 1 && (
                                        <div className="absolute top-[102%] left-0 w-full h-full opacity-25 transform scale-y-[-1] pointer-events-none">
                                            {src && (
                                                <img
                                                    src={src}
                                                    alt="Reflection"
                                                    className="w-full h-full object-cover object-center rounded-[1px]"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent" />
                                        </div>
                                    )}
                                </div>

                                {/* BACK FACE (Tracklist) */}
                                <div
                                    className="absolute inset-0 w-full h-full bg-white rounded-sm backface-hidden rotate-y-180 overflow-hidden border border-zinc-400 shadow-xl"
                                    style={{
                                        transform: 'rotateY(180deg)',
                                        backfaceVisibility: 'hidden'
                                    }}
                                >
                                    {/* Tracklist Header */}
                                    <div className="h-6 bg-zinc-100 border-b border-zinc-300 flex items-center px-2">
                                        <p className="text-[8px] font-bold text-black truncate w-full text-center">
                                            {item.data?.title}
                                        </p>
                                    </div>
                                    {/* Tracks */}
                                    <div className="p-1 space-y-0.5">
                                        {(item.data?.songs || []).slice(0, 7).map((song: any, t: number) => {
                                            const isSelected = t === safeTrackIndex;
                                            return (
                                                <div key={t} className={`flex items-center px-1 py-0.5 ${isSelected ? 'bg-blue-600' : 'even:bg-zinc-50'}`}>
                                                    <span className={`text-[6px] font-medium w-3 ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{t + 1}</span>
                                                    <span className={`text-[6px] truncate max-w-[70%] ${isSelected ? 'text-white font-bold' : 'text-black'}`}>
                                                        {song.name ? decodeHtml(song.name) : `Track ${t + 1}`}
                                                    </span>
                                                    <span className={`text-[6px] ml-auto ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                                        {song.duration ? `${Math.floor(song.duration / 60)}:${Math.floor(song.duration % 60).toString().padStart(2, '0')}` : '3:42'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {(item.data?.songs?.length || 0) > 7 && (
                                            <div className="text-[5px] text-zinc-400 text-center font-medium mt-0.5">
                                                ...and {(item.data?.songs?.length || 0) - 7} more
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Metadata Display - Hide when flipped or change? Classic hides it when flipped usually, or keeps it. We'll keep it. */}
            <div className={`z-20 mt-12 text-center text-white h-20 flex flex-col justify-start items-center transition-opacity duration-300 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                <motion.div
                    key={safeIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center max-w-[80%]"
                >
                    <h3 className="text-xs font-bold tracking-tight leading-tight drop-shadow-md text-zinc-100 truncate w-full">
                        {activeItem?.title || "Unknown Album"}
                    </h3>
                    <p className="text-[10px] text-zinc-300 font-normal mt-0.5 truncate w-full">
                        {activeItem?.artist || "Unknown Artist"}
                    </p>

                    <p className="text-[9px] text-zinc-500 font-medium mt-1 uppercase tracking-widest">
                        {safeIndex + 1} of {items.length || 0}
                    </p>
                </motion.div>
            </div>

            {/* Info Text for Flip */}
            <div className={`z-20 absolute bottom-4 text-center text-zinc-500 transition-opacity duration-300 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-[9px]">Press Center to Flip</p>
            </div>

        </div>
    );
}
