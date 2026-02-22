"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, GripVertical, Pin, Play, Disc, ArrowDownAZ, Hash } from "lucide-react";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { clsx } from "clsx";
import { isUserPlaylistMix } from "@/lib/mix-id-utils";

interface TapeRackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TapeRackModal({ isOpen, onClose }: TapeRackModalProps) {
    const { activeMixId, togglePin } = usePlayback();
    const { mixes, setMixes } = useLibrary();
    const [items, setItems] = useState<Mix[]>([]);

    // Sync mixes to local items on open
    useEffect(() => {
        if (isOpen) {
            setItems(mixes);
        }
    }, [isOpen, mixes]);

    const handleReorder = (newOrder: Mix[]) => {
        setItems(newOrder);
        setMixes(newOrder);
    };

    const rebuildWithSystemMixes = (orderedUserMixes: Mix[]) => {
        // Keep system mixes at their current positions or append? 
        // Strategy: Keep all non-user mixes (system) and append/merge the new user order.
        // Actually, simplest is: Take all system mixes from current `items` + new `orderedUserMixes`.
        const systemMixes = items.filter(m => !isUserPlaylistMix(m));
        return [...systemMixes, ...orderedUserMixes];
    };

    if (!isOpen) return null;

    // Filter out system mixes - only show user tapes
    const userMixes = items.filter(isUserPlaylistMix);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md z-10">
                        <div>
                            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                <Disc className="text-purple-500 animate-spin-slow" size={24} />
                                Tape Rack Manager
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                Drag to reorder. <span className="text-white font-bold">Pinned tapes</span> will appear on your Studio Deck.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Quick Sort Buttons */}
                            <button
                                onClick={() => {
                                    const sortedUsers = userMixes
                                        .slice()
                                        .sort((a, b) => a.title.localeCompare(b.title));
                                    handleReorder(rebuildWithSystemMixes(sortedUsers));
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                                title="Sort A-Z"
                            >
                                <ArrowDownAZ size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    const sortedUsers = userMixes
                                        .slice()
                                        .sort((a, b) => b.songs.length - a.songs.length);
                                    handleReorder(rebuildWithSystemMixes(sortedUsers));
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                                title="Sort by Song Count"
                            >
                                <Hash size={18} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        <Reorder.Group axis="y" values={userMixes} onReorder={(newOrder) => {
                            handleReorder(rebuildWithSystemMixes(newOrder));
                        }}>
                            {userMixes.map((mix, index) => {
                                const isPlaying = activeMixId === mix.id;

                                return (
                                    <Reorder.Item
                                        key={mix.id}
                                        value={mix}
                                        className="relative mb-3"
                                        whileDrag={{ scale: 1.02, zIndex: 50 }}
                                    >
                                        <div className={clsx(
                                            "flex items-center gap-4 p-3 rounded-lg border transition-colors group cursor-grab active:cursor-grabbing",
                                            mix.pinned
                                                ? "bg-zinc-800/50 border-zinc-700 hover:border-purple-500/50"
                                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 opacity-60 hover:opacity-100"
                                        )}>
                                            {/* Drag Handle */}
                                            <div className="text-zinc-600 group-hover:text-zinc-400">
                                                <GripVertical size={20} />
                                            </div>

                                            {/* Index / Status */}
                                            <div className="w-8 text-center font-mono text-sm text-zinc-500 font-bold">
                                                {index + 1}
                                            </div>

                                            {/* Tape Prep */}
                                            <div className="w-12 h-8 rounded border border-zinc-700 bg-zinc-800 shadow-sm flex items-center justify-center relative overflow-hidden group-hover:border-zinc-500 transition-colors">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                                                <div className="w-full h-1 bg-black/40 absolute top-2 flex items-center justify-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <h3 className={clsx("font-bold text-sm", isPlaying ? "text-green-400" : "text-zinc-200")}>
                                                    {mix.title}
                                                </h3>
                                                <p className="text-xs text-zinc-500">{mix.songs.length} songs</p>
                                            </div>

                                            {/* Pin Indicator */}
                                            <div className="pr-4 z-10" onPointerDown={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePin(mix.id);
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                                    title={mix.pinned ? "Unpin from Deck" : "Pin to Deck"}
                                                >
                                                    <Pin
                                                        size={18}
                                                        className={clsx(
                                                            "transition-transform active:scale-95",
                                                            mix.pinned ? "text-purple-400 fill-purple-400/20" : "text-zinc-700 hover:text-zinc-400"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                );
                            })}
                        </Reorder.Group>

                        {userMixes.length === 0 && (
                            <div className="text-center py-20 text-zinc-500">
                                <p>No custom tapes created yet.</p>
                                <p className="text-sm mt-2">Create a mix to start building your rack.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
