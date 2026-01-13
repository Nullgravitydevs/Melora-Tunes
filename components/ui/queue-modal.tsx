"use client";

import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Music, GripVertical, Trash2 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    queue: JioSaavnSong[];
    currentIndex: number;
    onReorder?: (newQueue: JioSaavnSong[]) => void;
    onRemove?: (index: number) => void;
    onJumpTo?: (index: number) => void;
}

export function QueueModal({
    isOpen,
    onClose,
    queue,
    currentIndex,
    onReorder,
    onRemove,
    onJumpTo
}: QueueModalProps) {
    if (!isOpen) return null;

    const currentSong = queue[currentIndex];
    const upNext = queue.slice(currentIndex + 1);
    const played = queue.slice(0, currentIndex);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl w-[500px] max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                    <Music className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Queue</h2>
                                    <p className="text-xs text-zinc-500">{queue.length} songs</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Queue Content */}
                        <div className="overflow-y-auto max-h-[calc(80vh-100px)] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {/* Now Playing */}
                            {currentSong && (
                                <div className="p-4 border-b border-zinc-800/50">
                                    <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Now Playing</p>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30">
                                        <img
                                            src={currentSong.image[2]?.link || currentSong.image[0]?.link}
                                            alt={currentSong.name}
                                            className="w-12 h-12 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">{decodeHtml(currentSong.name)}</p>
                                            <p className="text-xs text-zinc-400 truncate">{decodeHtml(currentSong.primaryArtists)}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="w-1 h-4 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1 h-4 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1 h-4 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Up Next */}
                            {upNext.length > 0 && (
                                <div className="p-4">
                                    <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Up Next ({upNext.length})</p>
                                    <div className="space-y-2">
                                        {upNext.map((song, idx) => {
                                            const actualIndex = currentIndex + 1 + idx;
                                            return (
                                                <div
                                                    key={song.id + actualIndex}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-all group"
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => onJumpTo?.(actualIndex)}>
                                                        <span className="text-xs text-zinc-600 font-mono w-6 text-right">{idx + 1}</span>
                                                        <img
                                                            src={song.image[2]?.link || song.image[0]?.link}
                                                            alt={song.name}
                                                            className="w-10 h-10 rounded object-cover"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white truncate">{decodeHtml(song.name)}</p>
                                                            <p className="text-xs text-zinc-500 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                        </div>
                                                    </div>
                                                    {onRemove && (
                                                        <button
                                                            onClick={() => onRemove(actualIndex)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Previously Played */}
                            {played.length > 0 && (
                                <div className="p-4 border-t border-zinc-800/50">
                                    <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Previously Played ({played.length})</p>
                                    <div className="space-y-2 opacity-60">
                                        {played.reverse().map((song, idx) => {
                                            const actualIndex = currentIndex - 1 - idx;
                                            return (
                                                <div
                                                    key={song.id + actualIndex}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30 transition-all cursor-pointer"
                                                    onClick={() => onJumpTo?.(actualIndex)}
                                                >
                                                    <span className="text-xs text-zinc-700 font-mono w-6 text-right">-{idx + 1}</span>
                                                    <img
                                                        src={song.image[2]?.link || song.image[0]?.link}
                                                        alt={song.name}
                                                        className="w-10 h-10 rounded object-cover"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-zinc-400 truncate">{decodeHtml(song.name)}</p>
                                                        <p className="text-xs text-zinc-600 truncate">{decodeHtml(song.primaryArtists)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {queue.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Music className="text-zinc-700 mb-4" size={48} />
                                    <p className="text-zinc-500 font-medium">No songs in queue</p>
                                    <p className="text-xs text-zinc-600 mt-1">Add a cassette to start playing</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
