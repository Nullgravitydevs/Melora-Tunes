"use client";

import { motion } from "framer-motion";

interface CoverFlow3DProps {
    items: { id: string; image: string; title: string; artist?: string }[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    isFlipped?: boolean;
    trackIndex?: number;
    scrollDirection?: 'left' | 'right' | null;
    tracks?: any[]; // JioSaavnSong[]
    onScanLibrary?: () => void;
}

export function CoverFlow3D({
    items,
    selectedIndex,
    onSelect,
    isFlipped = false,
    trackIndex = 0,
    scrollDirection,
    tracks = [],
    onScanLibrary
}: CoverFlow3DProps) {
    if (!items || items.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-inner">
                    <span className="text-2xl opacity-50">💿</span>
                </div>
                <div>
                    <h3 className="text-white font-medium text-xs tracking-wide">No Music Found</h3>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Your library is empty.</p>
                </div>
                <button
                    onClick={() => {
                        if (onScanLibrary) onScanLibrary();
                        else alert("Please add music to your library.");
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium rounded-full transition-colors shadow-lg shadow-blue-900/20"
                >
                    Scan Library
                </button>
            </div>
        );
    }

    // Safety Bounds
    const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
    const activeItem = items[safeIndex];
    if (!activeItem) return null; // Should not happen with check above

    // Performance: Only render visible window (+/- 5 items)
    // We map only the indices around selectedIndex
    const VISIBLE_RANGE = 5;
    const startIndex = Math.max(0, safeIndex - VISIBLE_RANGE);
    const endIndex = Math.min(items.length - 1, safeIndex + VISIBLE_RANGE);

    // Create array of indices to map
    const visibleIndices = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleIndices.push(i);
    }

    return (
        <div className="relative w-full h-full bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
            {/* 3D Cover Flow Container */}
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ perspective: '1000px' }}
            >
                {/* Render only visible albums */}
                {visibleIndices.map((index) => {
                    const item = items[index];
                    const offset = index - safeIndex;
                    const isCenter = offset === 0;
                    const isLeft = offset < 0;

                    // Calculate transforms
                    const translateX = isCenter ? 0 : offset * 70;
                    const rotateY = isCenter ? 0 : (isLeft ? 45 : -45);
                    const scale = isCenter ? 1 : 0.75 - Math.abs(offset) * 0.05;
                    const opacity = isCenter ? 1 : 0.7 - Math.abs(offset) * 0.1;
                    const zIndex = 100 - Math.abs(offset); // Higher zIndex ensures proper stacking

                    return (
                        <motion.div
                            key={`${item.id}-${index}`} // Composite key for stability
                            className="absolute cursor-pointer"
                            style={{
                                width: '140px',
                                height: '140px',
                                zIndex,
                                transformStyle: 'preserve-3d',
                            }}
                            animate={{
                                x: translateX,
                                rotateY: rotateY,
                                scale: scale,
                                opacity: Math.max(0.3, opacity),
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                                mass: 0.8
                            }}
                            onClick={() => {
                                // Block clicks on side items? 
                                // Standard iPod behavior: Clicking side item scrolls to it. Clicking center selects it.
                                // Implementation: Call onSelect. The parent can decide if it's a "Select" or "Scroll" based on index diff.
                                // Actually, for click safety during scroll, we could throttle this.
                                // But simpler is: Just pass index.
                                onSelect(index);
                            }}
                        >
                            {/* Album Cover */}
                            <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl border border-white/10 relative bg-zinc-900">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        loading="eager"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <span className="text-3xl opacity-50">💿</span>
                                    </div>
                                )}
                                {/* Glass overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                            </div>

                            {/* Floor Reflection (Optimized: Only immediate neighbors) */}
                            {Math.abs(offset) <= 1 && item.image && (
                                <div
                                    className="absolute top-full left-0 right-0 h-20 opacity-30 pointer-events-none"
                                    style={{
                                        transform: 'scaleY(-1)',
                                        background: `url(${item.image})`,
                                        backgroundSize: 'cover',
                                        filter: 'blur(4px)',
                                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Title Bar at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center justify-end pb-4 px-4 pointer-events-none">
                <motion.h3
                    key={`title-${activeItem.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white font-bold text-sm truncate max-w-full text-center"
                >
                    {activeItem.title || 'Unknown Album'}
                </motion.h3>
                <motion.p
                    key={`artist-${activeItem.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-zinc-400 text-xs truncate max-w-full text-center"
                >
                    {activeItem.artist || 'Unknown Artist'}
                </motion.p>
            </div>

            {/* Scroll Direction Indicator */}
            {scrollDirection && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-zinc-500 text-lg animate-pulse z-20">
                    {scrollDirection === 'left' ? '◀' : '▶'}
                </div>
            )}

            {/* Flipped State: Track List Overlay */}
            {isFlipped && activeItem && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col z-50 text-left font-sans"
                >
                    {/* Album Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-zinc-800 shrink-0">
                        <img
                            src={activeItem.image}
                            alt=""
                            className="w-12 h-12 rounded-md shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{activeItem.title}</h4>
                            <p className="text-zinc-400 text-xs truncate">{activeItem.artist}</p>
                        </div>
                    </div>

                    {/* Track List */}
                    <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                        {tracks.length > 0 ? (
                            <div className="flex flex-col pb-4">
                                {tracks.map((track, i) => {
                                    const isSelected = i === trackIndex;
                                    const trackName = track.name || track.title || "Unknown Track"; // Safe Access
                                    return (
                                        <div
                                            key={track.id || i}
                                            className={`px-4 py-2.5 flex items-center gap-3 text-xs border-b border-white/5 ${isSelected ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
                                        >
                                            <span className={`w-4 text-right ${isSelected ? 'text-blue-200' : 'text-zinc-600'}`}>{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`truncate font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                    {trackName
                                                        .replace(/&quot;/g, '"')
                                                        .replace(/&amp;/g, '&')
                                                        .replace(/&#039;/g, "'")}
                                                </p>
                                                {isSelected && (
                                                    <p className="text-[10px] text-blue-200 truncate">{track.primaryArtists}</p>
                                                )}
                                            </div>
                                            {isSelected && <span className="text-[10px]">●</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32">
                                <span className="text-zinc-500 text-xs">No tracks available</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
