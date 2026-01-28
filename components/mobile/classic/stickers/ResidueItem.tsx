import { Sticker } from "./StickerLayer";
import { motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";

export const ResidueItem = ({
    sticker,
    body,
    onScrub
}: {
    sticker: Sticker;
    body: HTMLDivElement;
    onScrub: () => void;
}) => {
    // Exact same positioning logic as StickerItem
    const x = useMotionValue(sticker.xPct * body.offsetWidth);
    const y = useMotionValue(sticker.yPct * body.offsetHeight);

    useEffect(() => {
        x.set(sticker.xPct * body.offsetWidth);
        y.set(sticker.yPct * body.offsetHeight);
    }, [sticker.xPct, sticker.yPct, body.offsetWidth, body.offsetHeight, x, y]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: sticker.scrubOpacity }}
            exit={{ opacity: 0 }}
            className="w-16 h-16 flex items-center justify-center pointer-events-auto cursor-wait"
            style={{
                x,
                y,
                rotate: sticker.rotation,
                translateX: "-50%",
                translateY: "-50%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 70
            }}
            onMouseMove={onScrub}
        >
            {/* Ragged Paper Texture */}
            <div className="w-10 h-10 bg-[#e3e0c5] mask-image-grunge rounded-[2px] opacity-90 blur-[0.5px] border-[0.5px] border-[#d6d3b8] shadow-sm transform rotate-3" />
            <div className="absolute w-10 h-10 bg-white/20 blur-md rounded-full pointer-events-none" />
        </motion.div>
    );
};
