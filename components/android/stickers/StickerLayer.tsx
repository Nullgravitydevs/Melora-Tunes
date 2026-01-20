import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Trash2, ShoppingBag, CheckCircle, Star, Heart, Music, Zap, Smile, Ghost, Skull } from "lucide-react";
import { ResidueItem } from "./ResidueItem";
import { cn } from "@/lib/utils";

export type StickerType =
    | "star"
    | "heart"
    | "music"
    | "zap"
    | "smile"
    | "ghost"
    | "skull";

export interface Sticker {
    id: number;
    type: StickerType;
    xPct: number;
    yPct: number;
    rotation: number;
    color: string;
    isResidue?: boolean;
    scrubOpacity?: number;
    isStuck?: boolean;
}

interface StickerLayerProps {
    stickers: Sticker[];
    onUpdate: (id: number, updates: Partial<Sticker>) => void;
    onRemove: (id: number) => void;
    isLocked: boolean;
    iPodBodyRef: React.RefObject<HTMLDivElement | null>;
    onNotify: (msg: string) => void;
    constraintsRef?: React.RefObject<HTMLDivElement | null>; // Kept for compatibility if passed
}

// 1. Extracted Component to respect React Hook Rules
const StickerItem = ({
    sticker,
    body,
    isLocked,
    onUpdate,
    onNotify,
    onContextMenu
}: {
    sticker: Sticker;
    body: HTMLDivElement;
    isLocked: boolean;
    onUpdate: (id: number, updates: Partial<Sticker>) => void;
    onNotify: (msg: string) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) => {
    // 2. User's Logic: useMotionValue for source of truth
    const x = useMotionValue(sticker.xPct * body.offsetWidth);
    const y = useMotionValue(sticker.yPct * body.offsetHeight);

    // 3. Sync: If properties update (e.g. refresh/load), update motion value
    useEffect(() => {
        x.set(sticker.xPct * body.offsetWidth);
        y.set(sticker.yPct * body.offsetHeight);
    }, [sticker.xPct, sticker.yPct, body.offsetWidth, body.offsetHeight, x, y]);

    const Icon = {
        star: Star, heart: Heart, music: Music, zap: Zap, smile: Smile, ghost: Ghost, skull: Skull
    }[sticker.type] || Star;

    return (
        <motion.div
            key={sticker.id}
            drag={!isLocked && !sticker.isResidue && !sticker.isStuck}
            // 4. Added Boundaries (Padded by 32px to avoid rounded corners/overflow)
            dragConstraints={{
                left: 32,
                top: 32,
                right: body.offsetWidth - 32,
                bottom: body.offsetHeight - 32
            }}
            dragMomentum={false}
            dragElastic={0}
            style={{
                x,
                y,
                rotate: sticker.rotation,
                translateX: "-50%", // Center anchor
                translateY: "-50%",
                zIndex: 80,
                position: "absolute",
                top: 0, // Reset CSS positioning
                left: 0
            }}
            onDragEnd={() => {
                // 5. Save normalized percentage on drop
                onUpdate(sticker.id, {
                    xPct: x.get() / body.offsetWidth,
                    yPct: y.get() / body.offsetHeight,
                });
            }}
            onContextMenu={onContextMenu}
            className={cn(
                "w-12 h-12 flex items-center justify-center pointer-events-auto touch-none",
                isLocked
                    ? "cursor-not-allowed"
                    : "cursor-grab active:cursor-grabbing"
            )}
        >
            <div className="relative group">
                <Icon
                    size={48}
                    className="absolute inset-0 text-black/20 blur-[2px] translate-x-[1px] translate-y-[2px]"
                />
                <Icon
                    size={48}
                    fill={sticker.color}
                    stroke="white"
                    strokeWidth={1.5}
                    className="relative z-10 drop-shadow-sm transition-transform group-hover:scale-105 active:scale-95"
                />

                {!sticker.isStuck && !sticker.isResidue && !isLocked && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(sticker.id, { isStuck: true });
                            onNotify("Stuck! 🧱");
                        }}
                        className="absolute -top-3 -right-3 bg-green-500 rounded-full p-1 shadow-md hover:bg-green-400 transition-colors z-20"
                    >
                        <CheckCircle size={14} className="text-white" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export function StickerLayer({
    stickers,
    onUpdate,
    onRemove,
    isLocked,
    iPodBodyRef,
    onNotify,
}: StickerLayerProps) {
    const [contextMenu, setContextMenu] = useState<{
        id: number;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, []);

    const handlePeelOff = (id: number) => {
        onNotify("Scrub to remove gum! 🧼");
        onUpdate(id, { isResidue: true, scrubOpacity: 0.8 });
        setContextMenu(null);
    };

    const handleScrub = (id: number) => {
        const sticker = stickers.find(s => s.id === id);
        if (!sticker || !sticker.isResidue) return;

        const current = sticker.scrubOpacity ?? 0.8;
        const newOpacity = current - 0.005; // Slower scrub speed

        if (newOpacity <= 0) {
            onRemove(id);
        } else {
            onUpdate(id, { scrubOpacity: newOpacity });
        }
    };

    if (!iPodBodyRef.current) return null;
    const body = iPodBodyRef.current;

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                width: body.offsetWidth,
                height: body.offsetHeight,
                zIndex: 60,
            }}
        >
            <AnimatePresence>
                {stickers.map((sticker) => (
                    <React.Fragment key={sticker.id}>
                        {sticker.isResidue ? (
                            <ResidueItem
                                sticker={sticker}
                                body={body}
                                onScrub={() => handleScrub(sticker.id)}
                            />
                        ) : (
                            <StickerItem
                                sticker={sticker}
                                body={body}
                                isLocked={isLocked}
                                onUpdate={onUpdate}
                                onNotify={onNotify}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    // Always allow menu to open so we can "Peel Off" even if stuck/locked
                                    setContextMenu({
                                        id: sticker.id,
                                        x: e.clientX,
                                        y: e.clientY,
                                    });
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </AnimatePresence>

            {contextMenu && (
                <div
                    className="fixed z-[100] bg-zinc-900 border border-zinc-700/50 rounded-lg py-1 w-32 sticker-context-menu overflow-hidden shadow-2xl backdrop-blur-md pointer-events-auto"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => handlePeelOff(contextMenu.id)}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} className="text-zinc-400" /> Peel Off
                    </button>
                </div>
            )}
        </div>
    );
}
