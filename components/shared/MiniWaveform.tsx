import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function seededRandom(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return () => {
        hash = Math.sin(hash) * 10000;
        return hash - Math.floor(hash);
    };
}

export function MiniWaveform({ seed, active = false, numBars = 16, className = "" }: { seed: string, active?: boolean, numBars?: number, className?: string }) {
    const bars = useMemo(() => {
        const rand = seededRandom(seed);
        const result = [];
        for (let i = 0; i < numBars; i++) {
            // Envelope so the middle bars are slightly taller natively, to look like a waveform
            const envelope = Math.sin((i / (numBars - 1)) * Math.PI);
            const height = 15 + Math.floor(rand() * 40) + Math.floor(envelope * 45);
            result.push(height);
        }
        return result;
    }, [seed, numBars]);

    return (
        <div className={`flex items-end gap-[2px] h-6 shrink-0 ${className}`}>
            {bars.map((height, i) => (
                <motion.div
                    key={i}
                    className="w-[2px] rounded-t-sm"
                    style={{
                        height: `${height}%`,
                        backgroundColor: active ? 'rgb(45, 212, 191)' : 'rgba(255, 255, 255, 0.15)'
                    }}
                    animate={active ? {
                        height: [`${height}%`, `${Math.max(15, height - 20)}%`, `${Math.min(100, height + 20)}%`, `${height}%`]
                    } : {}}
                    transition={active ? {
                        duration: 0.6 + (i % 4) * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    } : undefined}
                />
            ))}
        </div>
    );
}
