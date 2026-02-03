"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, GripVertical, Pin, Play, Disc, ArrowDownAZ, Hash } from "lucide-react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { clsx } from "clsx";

interface TapeRackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TapeRackModal({ isOpen, onClose }: TapeRackModalProps) {
    const { mixes, setMixes, activeMixId } = usePlayback();
    const [items, setItems] = useState<Mix[]>([]);

    // Sync mixes to local items on open, but filter out system/deleted ones if needed
    useEffect(() => {
        if (isOpen) {
            // Sort by pinned first, or just keep current order? 
            // We assume the context order IS the visual order.
            // Filter out the "Discovery Mix" if we don't want it reorderable? 
            // User probably wants to reorder EVERYTHING.
            setItems(mixes);
        }
    }, [isOpen, mixes]);

    const handleReorder = (newOrder: Mix[]) => {
        setItems(newOrder);
        // Live sync or save on close? Live sync gives instant feedback on the deck behind.
        setMixes(newOrder);

        // Also ensure "Pinned" status is synced if we are using the "Top 8 = Pinned" logic?
        // Actually, the previous logic was: `mix.pinned` flag. 
        // If we move to "Top 8 are pinned", we should update the flag too?
        // Or just let the Deck render the first 8 Pinned items?
        // The user said: "drag and set in top 8 pinned". 
        // This implies the Top 8 of THIS LIST become the pinned ones.
        // So we should update the `pinned` property based on index.

        const updatedMixes = newOrder.map((m, index) => ({
            ...m,
            // If it's in top 8, it's pinned. Otherwise unpinned. (Excluding System Mixes?)
            // This might aggressively unpin things. 
            // Let's just update the ORDER for now. The Deck renders `mixes.filter(pinned).slice(0,8)`.
            // Wait, if the Deck filters by `pinned`, then unpinned items WON'T SHOW HERE?
            // "others stay in rack".
            // So this view must show ALL mixes.
            // And dragging one into Top 8 should SET `pinned = true`.
            // Dragging out should SET `pinned = false`.
        }));

        // We need a clearer logic.
        // Let's just reorder the WHOLE list.
        // And visually show "On Deck" for indices 0-7 OF THE PINNED SUBSET?
        // Or just show two lists?
        // "drag and set in top 8 pinned"

        // Let's do this:
        // 1. We display ONE list of ALL User Mixes.
        // 2. We sort them so Pinned are at top.
        // 3. Current State: `items`.
        // 4. Update: `setMixes(items)`.

        // Actually for V1, let's keep it simple:
        // This helper just REORDERS the global list. 
        // The Deck view renders `mixes` as they are, but restricted by the visual rack implementation.
        // The User said: "pinned have up so we can pin or else drag and set in top 8".
        // This implies manual reordering.

        // CRITICAL: We need to update the `pinned` status based on the new order if the user intends "Top 8 = Pinned".
        // Let's strictly enforce: Top 8 User Mixes = Pinned. Rest = Unpinned.

        const systemMixId = 'discovery-mix';
        const userMixes = newOrder.filter(m => m.id !== systemMixId);
        const systemMixes = newOrder.filter(m => m.id === systemMixId);

        const reindexedUserMixes = userMixes.map((m, i) => ({
            ...m,
            pinned: i < 8 // Auto-pin top 8
        }));

        const finalMixes = [...systemMixes, ...reindexedUserMixes];
        setMixes(finalMixes);
    };

    if (!isOpen) return null;

    // Separate System Mix (Discovery) from User Mixes for reordering
    // We only want to reorder User Mixes.
    const systemMix = items.find(m => m.id === 'discovery-mix');
    const userMixes = items.filter(m => m.id !== 'discovery-mix');

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
                                Drag your favorite tapes to the top. <span className="text-white font-bold">The first 8 tapes</span> will appear on your Studio Deck.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Quick Sort Buttons */}
                            <button
                                onClick={() => {
                                    const systemMix = items.find(m => m.id === 'discovery-mix');
                                    const sorted = items.filter(m => m.id !== 'discovery-mix').sort((a, b) => a.title.localeCompare(b.title));
                                    handleReorder(systemMix ? [systemMix, ...sorted] : sorted);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                                title="Sort A-Z"
                            >
                                <ArrowDownAZ size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    const systemMix = items.find(m => m.id === 'discovery-mix');
                                    const sorted = items.filter(m => m.id !== 'discovery-mix').sort((a, b) => b.songs.length - a.songs.length);
                                    handleReorder(systemMix ? [systemMix, ...sorted] : sorted);
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
                            // Reconstruct full list with system mix
                            const fullList = systemMix ? [systemMix, ...newOrder] : newOrder;
                            handleReorder(fullList);
                        }}>
                            {userMixes.map((mix, index) => {
                                const isPinnedSlot = index < 8;
                                const isPlaying = activeMixId === mix.id;

                                return (
                                    <Reorder.Item
                                        key={mix.id}
                                        value={mix}
                                        className="relative mb-3"
                                        whileDrag={{ scale: 1.02, zIndex: 50 }}
                                    >
                                        {/* Divider for "Rack Limit" */}
                                        {index === 8 && (
                                            <div className="flex items-center gap-4 my-6 opacity-50">
                                                <div className="h-px bg-zinc-700 flex-1"></div>
                                                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                                                    Storage Archive (Hidden from Deck)
                                                </span>
                                                <div className="h-px bg-zinc-700 flex-1"></div>
                                            </div>
                                        )}

                                        <div className={clsx(
                                            "flex items-center gap-4 p-3 rounded-lg border transition-colors group cursor-grab active:cursor-grabbing",
                                            isPinnedSlot
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
                                            {/* Tape Prep - Neutralized to match "Decoupled" Logic */}
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
                                            <div className="pr-4">
                                                <Pin
                                                    size={18}
                                                    className={clsx(
                                                        "transition-transform",
                                                        isPinnedSlot ? "text-purple-400 fill-purple-400/20" : "text-zinc-700 scale-90"
                                                    )}
                                                />
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
