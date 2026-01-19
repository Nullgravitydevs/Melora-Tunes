import React, { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Music, Zap, Smile, Ghost, Skull, Trash2, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have utils

export type StickerType = 'star' | 'heart' | 'music' | 'zap' | 'smile' | 'ghost' | 'skull';

export interface Sticker {
    id: number;
    type: StickerType;
    x: number;
    y: number;
    rotation: number;
    color: string;
    isResidue?: boolean;
    scrubOpacity?: number; // 0 to 1
}

interface StickerLayerProps {
    stickers: Sticker[];
    onUpdate: (id: number, updates: Partial<Sticker>) => void;
    onRemove: (id: number) => void;
    isLocked: boolean;
    constraintsRef: React.RefObject<HTMLDivElement | null>;
    iPodBodyRef: React.RefObject<HTMLDivElement | null>;
    onNotify: (message: string) => void;
}

export function StickerLayer({ stickers, onUpdate, onRemove, isLocked, constraintsRef, iPodBodyRef, onNotify }: StickerLayerProps) {
    const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);

    // Close context menu on click elsewhere
    useEffect(() => {
        const closeMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.sticker-context-menu')) {
                setContextMenu(null);
            }
        };

        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLocked) return;
        setContextMenu({ id, x: e.clientX, y: e.clientY });
    };

    const handlePeelOff = (id: number) => {
        const sticker = stickers.find(s => s.id === id);
        if (!sticker) return;

        // Skip confirmation, just warn via toast
        onNotify("⚠️ Cheap glue detected! Residue left behind.");
        onUpdate(id, { isResidue: true, scrubOpacity: 0.8 });
    };

    const handleBuyNew = () => {
        onNotify("Don't buy a new one! Just scrub it off. 🧼");
    };

    const handleScrub = (id: number) => {
        const sticker = stickers.find(s => s.id === id);
        if (!sticker || !sticker.isResidue) return;

        const current = sticker.scrubOpacity ?? 0.8;
        const newOpacity = current - 0.006; // slower + realistic

        if (newOpacity <= 0) {
            onRemove(id);
            // TODO: play clean sound
        } else {
            onUpdate(id, { scrubOpacity: newOpacity });
        }
    };

    // Simplified drag end - just passes final update
    // Actual constraints handled by Framer Motion props
    const handleUpdatePosition = (id: number, x: number, y: number) => {
        onUpdate(id, { x, y });
    };

    const renderStickerContent = (sticker: Sticker) => {
        const Icon = {
            star: Star, heart: Heart, music: Music, zap: Zap, smile: Smile, ghost: Ghost, skull: Skull
        }[sticker.type] || Star;

        if (sticker.isResidue) {
            return (
                <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: sticker.scrubOpacity }}
                    transition={{ duration: 0.1 }}
                    className="w-full h-full bg-[#e8e4c9] rounded-lg flex items-center justify-center border-2 border-[#dcd8bc] backdrop-blur-sm"
                >
                    <div className="w-3/4 h-3/4 bg-[#d4d0b0] rounded-sm blur-[1px]" />
                </motion.div>
            );
        }

        return (
            <div className={`relative transition-transform ${isLocked ? '' : 'group-hover:scale-105 active:scale-95'}`}>
                {/* Shadow/Edge for realism */}
                <Icon size={48} className="absolute inset-0 text-black/20 blur-[2px] translate-x-[1px] translate-y-[2px]" strokeWidth={2.5} />
                <Icon size={48} fill={sticker.color} stroke="white" strokeWidth={1.5} className="relative z-10 drop-shadow-sm" />
            </div>
        );
    };

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                width: iPodBodyRef.current?.offsetWidth,
                height: iPodBodyRef.current?.offsetHeight,
                zIndex: 60
            }}
        >
            {/* Note: pointer-events-none on container so we can click through to body/wheel if no sticker.
                 Stickers themselves will have pointer-events-auto */}

            <AnimatePresence>
                {stickers.map(sticker => (
                    <motion.div
                        key={sticker.id}
                        drag={!isLocked && !sticker.isResidue}
                        dragConstraints={iPodBodyRef}
                        dragMomentum={false}
                        dragElastic={0}
                        onDragEnd={(e, info) => {
                            const target = e.currentTarget as HTMLElement;
                            const rect = target.getBoundingClientRect();
                            const parentRect = iPodBodyRef.current!.getBoundingClientRect();

                            // Calculate position relative to container
                            handleUpdatePosition(sticker.id,
                                rect.left - parentRect.left,
                                rect.top - parentRect.top
                            );
                        }}
                        onContextMenu={(e) => handleContextMenu(e, sticker.id)}
                        onMouseMove={() => {
                            if (sticker.isResidue) handleScrub(sticker.id);
                        }}
                        className={cn(
                            "absolute w-12 h-12 flex items-center justify-center pointer-events-auto group touch-none",
                            sticker.isResidue
                                ? "cursor-wait"
                                : isLocked
                                    ? "cursor-not-allowed pointer-events-none"
                                    : "cursor-grab active:cursor-grabbing"
                        )}
                        style={{
                            left: sticker.x,
                            top: sticker.y,
                            rotate: sticker.rotation,
                            zIndex: 80
                        }}
                    >
                        {renderStickerContent(sticker)}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Context Menu Portal-like Behavior (Fixed position relative to viewport usually better, but simplified here) */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 w-40 overflow-hidden pointer-events-auto sticker-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => { handlePeelOff(contextMenu.id); setContextMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Peel Off
                    </button>
                    <button
                        onClick={() => { handleBuyNew(); setContextMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm text-amber-500 hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <ShoppingBag size={14} /> Buy New iPod
                    </button>
                </div>
            )}
        </div>
    );
}
