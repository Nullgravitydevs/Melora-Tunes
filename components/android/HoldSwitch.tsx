"use client";

import { motion } from "framer-motion";

interface HoldSwitchProps {
    isLocked: boolean;
    onToggle: () => void;
}

export function HoldSwitch({ isLocked, onToggle }: HoldSwitchProps) {
    return (
        <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onToggle}
            title="Hold Switch"
        >
            {/* Switch Housing */}
            <div className={`
                relative w-14 h-6 rounded-full 
                bg-gradient-to-b from-[#b0b0b0] to-[#e0e0e0]
                border border-[#888]
                shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]
                flex items-center p-0.5
                overflow-hidden
            `}>
                {/* Orange Indicator (Revealed when Locked) */}
                <div className={`
                    absolute left-1 top-1 bottom-1 w-full bg-[#ff3b30]
                    shadow-[inset_0_2px_3px_rgba(0,0,0,0.3)]
                    rounded-l-full
                    transition-opacity duration-300
                    ${isLocked ? 'opacity-100' : 'opacity-0'}
                `} />

                {/* Metallic Knob */}
                <motion.div
                    className="relative w-7 h-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10 box-border"
                    style={{
                        background: 'linear-gradient(180deg, #f0f0f0 0%, #d4d4d4 50%, #a0a0a0 100%)',
                        border: '1px solid #999'
                    }}
                    animate={{ x: isLocked ? 26 : 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 25 }}
                >
                    {/* Grip Lines */}
                    <div className="absolute inset-0 flex items-center justify-center gap-[2px] opacity-30">
                        <div className="w-[1px] h-3 bg-black"></div>
                        <div className="w-[1px] h-3 bg-black"></div>
                        <div className="w-[1px] h-3 bg-black"></div>
                    </div>
                    {/* Highlight */}
                    <div className="absolute top-0.5 left-1 right-1 h-[2px] bg-white/60 rounded-full" />
                </motion.div>

                {/* Unlocked backdrop (Zinc/Silver) */}
                <div className={`
                    absolute right-1 top-1 bottom-1 w-full bg-zinc-400
                     shadow-[inset_0_2px_3px_rgba(0,0,0,0.3)]
                    rounded-r-full
                    transition-opacity duration-300
                    ${isLocked ? 'opacity-0' : 'opacity-100'}
                `} />
            </div>

            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block drop-shadow-sm">
                Hold
            </span>
        </div>
    );
}
