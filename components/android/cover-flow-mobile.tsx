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
    // Map unbounded index to 0..N-1
    const safeIndex = Math.abs(selectedIndex) % (items.length || 1);
    const safeTrackIndex = trackIndex || 0;

    // Get current item data
    const activeItem = items[safeIndex]?.data;

    if (!isOpen) return null;

    // Use items or fallback loop if empty
    const displayItems = items.length > 0 ? items : [];

    return (
        <div className="w-full h-full bg-black relative overflow-hidden flex flex-col items-center justify-center perspective-[800px]">

            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black z-0" />

            {/* 3D Stage */}
            <div className="relative w-full h-[50%] flex items-center justify-center transform-style-3d z-10 mt-[40px]">
                <AnimatePresence mode='popLayout'>
                    {displayItems.map((item, i) => {
                        const length = displayItems.length;

                        // Circular logic
                        let offset = i - safeIndex;
                        if (offset > length / 2) offset -= length;
                        if (offset < -length / 2) offset += length;

                        // Render visible range
                        if (Math.abs(offset) > 4) return null;

                        const isCenter = offset === 0;

                        // Classic iPod Physics (adjusted for proper screen fit)
                        const x = offset * 55; // Spacing for cards
                        const z = Math.abs(offset) * -170; // Depth push

                        // FLIP LOGIC: If center and flipped, rotate 180. unique state.
                        let rotateY = offset === 0 ? 0 : offset > 0 ? -70 : 70;
                        if (isCenter && isFlipped) rotateY = 180;

                        const opacity = isCenter ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.2);
                        const scale = isCenter ? 1.2 : 1; // Reduced from 1.4 to fit screen
                        const zIndex = 100 - Math.abs(offset);

                        const src = item.data?.image || "";

                        return (
                            <motion.div
                                key={i}
                                className={`absolute w-36 h-36 bg-transparent pointer-events-none`}
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
                            >
                                {/* FRONT FACE (Artwork) */}
                                <div
                                    className="absolute inset-0 w-full h-full backface-hidden"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <div className={`w-full h-full rounded-sm shadow-2xl relative bg-black border-[1px] ${isCenter ? 'border-white/50' : 'border-white/10'}`}>
                                        <img
                                            src={src}
                                            alt="Album cover"
                                            className="w-full h-full object-cover object-center rounded-[1px]"
                                        />
                                        {/* Subtle Gloss */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                    </div>

                                    {/* Subtle Reflection (Front only) */}
                                    <div className="absolute top-[102%] left-0 w-full h-full opacity-25 transform scale-y-[-1]">
                                        <img
                                            src={src}
                                            alt="Reflection"
                                            className="w-full h-full object-cover object-center rounded-[1px]"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent" />
                                    </div>
                                </div>

                                {/* BACK FACE (Tracklist) */}
                                <div
                                    className="absolute inset-0 w-full h-full bg-white rounded-sm backface-hidden rotate-y-180 overflow-hidden border border-zinc-400 shadow-xl"
                                    style={{
                                        transform: 'rotateY(180deg)',
                                        backfaceVisibility: 'hidden' // Wait, if I rotateY(180) on parent, this face at 180 will be front? 
                                        // No, parent rotates 180. 
                                        // Front is 0deg. Back is 180deg relative to parent? 
                                        // Standard CSS flip: Back face is absolute, rotated 180deg. 
                                        // When parent rotates 180, back face (180+180=360) becomes visible? 
                                        // Actually simplest is: Back face is rotated 180deg. Parent rotates 180deg. 
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
                                        {(item.data?.songs || []).slice(0, 7).map((song: any, t: number) => (
                                            <div key={t} className={`flex items-center px-1 py-0.5 ${t === 0 ? 'bg-blue-600' : 'even:bg-zinc-50'}`}>
                                                <span className={`text-[6px] font-medium w-3 ${t === 0 ? 'text-white' : 'text-zinc-500'}`}>{t + 1}</span>
                                                <span className={`text-[6px] truncate max-w-[70%] ${t === 0 ? 'text-white font-bold' : 'text-black'}`}>
                                                    {song.name ? decodeHtml(song.name) : `Track ${t + 1}`}
                                                </span>
                                                <span className={`text-[6px] ml-auto ${t === 0 ? 'text-white' : 'text-zinc-400'}`}>
                                                    {song.duration ? `${Math.floor(song.duration / 60)}:${Math.floor(song.duration % 60).toString().padStart(2, '0')}` : '3:42'}
                                                </span>
                                            </div>
                                        ))}
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
                        {safeIndex + 1} of {displayItems.length}
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
