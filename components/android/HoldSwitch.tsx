"use client";

import { motion } from "framer-motion";

interface HoldSwitchProps {
    isLocked: boolean;
    onToggle: () => void;
}

export function HoldSwitch({ isLocked, onToggle }: HoldSwitchProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
        }
    };

    return (
        <div className="flex items-center gap-2 group select-none">
            {/* Switch Housing (Interactive Target) */}
            <div
                className={`
                    relative w-14 h-6 rounded-full 
                    bg-gradient-to-b from-[#b0b0b0] to-[#e0e0e0]
                    border border-[#888]
                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]
                    flex items-center p-0.5
                    overflow-hidden
                    cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-black
                `}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent parent clicks
                    onToggle();
                }}
                role="switch"
                aria-checked={isLocked}
                aria-label="Hold Switch"
                tabIndex={0}
                onKeyDown={handleKeyDown}
            >
                {/* Visual Indicators Container */}
                <div className="absolute inset-0 flex">
                    {/* Orange Indicator (Locked) */}
                    <motion.div
                        className="w-1/2 h-full bg-[#ff3b30] shadow-[inset_0_2px_3px_rgba(0,0,0,0.3)]"
                        initial={false}
                        animate={{ opacity: isLocked ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                    />
                    {/* Unlocked backdrop (Silver) */}
                    <motion.div
                        className="w-1/2 h-full bg-zinc-400 shadow-[inset_0_2px_3px_rgba(0,0,0,0.3)] ml-auto"
                        initial={false}
                        animate={{ opacity: isLocked ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                    />
                </div>

                {/* Metallic Knob */}
                <motion.div
                    className="relative w-7 h-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10 box-border"
                    style={{
                        background: 'linear-gradient(180deg, #f0f0f0 0%, #d4d4d4 50%, #a0a0a0 100%)',
                        border: '1px solid #999'
                    }}
                    animate={{ x: isLocked ? 26 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }} // Smoother spring
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
            </div>

            <span
                className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block drop-shadow-sm cursor-default"
                aria-hidden="true"
                onClick={onToggle} // Allow label click as legacy behavior, but main focus is on switch
            >
                Hold
            </span>
        </div>
    );
}
