"use client";

import React, { useState, useRef } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";

interface MoodTunerProps {
    theme: DiscoveryTheme;
}

export function MoodTuner({ theme }: MoodTunerProps) {
    const isMidnight = theme === 'midnight';
    const [mood, setMood] = useState({ x: 0, y: 0 }); // -1 to 1
    const ref = useRef<HTMLDivElement>(null);

    // Spring animation for smooth puck movement
    const puckX = useSpring(50, { stiffness: 300, damping: 30 });
    const puckY = useSpring(50, { stiffness: 300, damping: 30 });

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        // Calculate percentage position
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp between 5% and 95% to keep puck inside
        const clampedX = Math.max(5, Math.min(95, xPercent));
        const clampedY = Math.max(5, Math.min(95, yPercent));

        puckX.set(clampedX);
        puckY.set(clampedY);

        // Normalize to -1 to 1 for mood logic
        const normalizedX = (clampedX - 50) / 50;
        const normalizedY = (clampedY - 50) / 50;
        setMood({ x: normalizedX, y: normalizedY });
    };

    const getMoodLabel = () => {
        const energy = mood.y < -0.3 ? 'ENERGETIC' : mood.y > 0.3 ? 'CHILL' : 'BALANCED';
        const tone = mood.x < -0.3 ? 'DARK' : mood.x > 0.3 ? 'BRIGHT' : 'NEUTRAL';
        return `${energy} • ${tone}`;
    };

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Header Row */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <h3 className={`text-xl font-bold tracking-tight ${isMidnight ? 'text-white' : 'text-gray-900'}`}>
                        Select Your Vibe
                    </h3>
                    <p className={`text-xs ${isMidnight ? 'text-gray-500' : 'text-gray-400'}`}>
                        Drag to tune the algorithm
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border ${isMidnight ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                    }`}>
                    {getMoodLabel()}
                </div>
            </div>

            {/* The XY Pad (SOLID COLORS - NO GRADIENTS) */}
            <div
                ref={ref}
                className={`relative w-full h-[280px] rounded-2xl overflow-hidden cursor-crosshair select-none border transition-colors ${isMidnight
                        ? 'bg-[#0a0a0a] border-[#222]'
                        : 'bg-[#f0f0f0] border-[#d0d0d0]'
                    }`}
                onPointerMove={(e) => e.buttons === 1 && handlePointerMove(e)}
                onPointerDown={handlePointerMove}
            >
                {/* Grid Lines (Subtle, Solid Color) */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${isMidnight ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isMidnight ? '#fff' : '#000'} 1px, transparent 1px)`,
                        backgroundSize: '56px 56px'
                    }}
                />

                {/* Axis Labels (Corners) */}
                <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.2em] uppercase ${isMidnight ? 'text-gray-600' : 'text-gray-400'}`}>ENERGETIC</span>
                <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.2em] uppercase ${isMidnight ? 'text-gray-600' : 'text-gray-400'}`}>CHILL</span>
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold tracking-[0.2em] uppercase ${isMidnight ? 'text-gray-600' : 'text-gray-400'}`}>DARK</span>
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[9px] font-bold tracking-[0.2em] uppercase ${isMidnight ? 'text-gray-600' : 'text-gray-400'}`}>BRIGHT</span>

                {/* The Puck (Solid, Animated) */}
                <motion.div
                    className={`absolute w-12 h-12 rounded-full flex items-center justify-center pointer-events-none border-2 shadow-xl ${isMidnight
                            ? 'bg-white border-gray-300'
                            : 'bg-black border-gray-700'
                        }`}
                    style={{
                        left: puckX,
                        top: puckY,
                        x: '-50%',
                        y: '-50%',
                    }}
                >
                    <div className={`w-2 h-2 rounded-full ${isMidnight ? 'bg-black' : 'bg-white'}`} />
                </motion.div>
            </div>
        </div>
    );
}
