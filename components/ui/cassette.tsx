"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

interface CassetteProps {
    id?: string;
    title?: string;
    color?: "orange" | "purple" | "white" | "green" | "red";
    className?: string;
    onDragStart?: (event: any, info: any) => void;
    onDragEnd?: (event: any, info: any, id?: string) => void;
    drag?: boolean;
    dragConstraints?: React.RefObject<Element>;
}

const colors = {
    orange: { body: "#ff6600", label: "#ffcc00", accent: "#ff8800" },
    purple: { body: "#9933ff", label: "#cc99ff", accent: "#aa55ff" },
    white: { body: "#e0e0e0", label: "#ffffff", accent: "#cccccc" },
    green: { body: "#00cc66", label: "#66ff99", accent: "#33dd77" },
    red: { body: "#ff0055", label: "#ff99aa", accent: "#ff3377" },
};

export const Cassette = memo(function Cassette({
    id,
    title = "Mixtape Vol. 1",
    color = "orange",
    className,
    onDragStart,
    onDragEnd,
    drag = true,
    dragConstraints,
    songCount = 0,
}: CassetteProps & { songCount?: number }) {
    const theme = colors[color];

    return (
        <motion.div
            className={clsx(
                "relative w-64 h-40 cursor-grab active:cursor-grabbing rounded-2xl",
                className
            )}
            style={{
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transform: 'translateZ(0)',
                willChange: 'transform'
            }}
            drag={drag}
            dragConstraints={dragConstraints}
            dragSnapToOrigin
            dragElastic={0.1}
            dragMomentum={false}
            whileDrag={{
                zIndex: 50,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                scale: 1.02
            }}
            onDragStart={onDragStart}
            onDragEnd={(e, info) => onDragEnd?.(e, info, id)}
        >
            <svg viewBox="0 0 400 250" className="w-full h-full">
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={theme.body} />
                        <stop offset="100%" stopColor={theme.body} stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id={`shine-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Main Body - NO FILTER for performance */}
                <rect x="10" y="10" width="380" height="230" rx="15" fill={`url(#grad-${color})`} stroke="#111" strokeWidth="4" />

                {/* Shine overlay */}
                <rect x="10" y="10" width="380" height="230" rx="15" fill={`url(#shine-${color})`} opacity="0.6" pointerEvents="none" />

                {/* Top area */}
                <path d="M 60 10 L 340 10 L 320 60 L 80 60 Z" fill="#222" opacity="0.2" />

                {/* Label */}
                <rect x="80" y="70" width="240" height="100" rx="5" fill="#f5f5dc" opacity="0.95" />

                {/* Title */}
                <text
                    x="200"
                    y="105"
                    textAnchor="middle"
                    fontFamily="'Courier New', monospace"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#222"
                >
                    {title.length > 12 ? title.substring(0, 12) + "..." : title}
                </text>

                {/* Lines */}
                <line x1="90" y1="120" x2="310" y2="120" stroke="#ccc" strokeWidth="1" opacity="0.5" />
                <line x1="90" y1="135" x2="310" y2="135" stroke="#ccc" strokeWidth="1" opacity="0.5" />
                <line x1="90" y1="150" x2="310" y2="150" stroke="#ccc" strokeWidth="1" opacity="0.5" />

                <text x="200" y="163" textAnchor="middle" fontFamily="'Press Start 2P', monospace" fontSize="8" fill="#666" opacity="0.6">
                    M
                </text>

                {/* Reels */}
                <circle cx="130" cy="200" r="18" fill="#2a2a2a" stroke="#111" strokeWidth="2" />
                <circle cx="130" cy="200" r="13" fill={theme.accent} opacity="0.7" />
                <circle cx="130" cy="200" r="6" fill="#fff" />
                <path d="M 130 188 L 130 212 M 118 200 L 142 200" stroke="#111" strokeWidth="1.5" />

                <circle cx="270" cy="200" r="18" fill="#2a2a2a" stroke="#111" strokeWidth="2" />
                <circle cx="270" cy="200" r="15" fill={theme.accent} opacity="0.7" />
                <circle cx="270" cy="200" r="6" fill="#fff" />
                <path d="M 270 188 L 270 212 M 258 200 L 282 200" stroke="#111" strokeWidth="1.5" />

                {/* Tape */}
                <rect x="148" y="197" width="104" height="6" fill="#3a2410" opacity="0.6" />

                {/* Screws */}
                {[
                    { cx: 30, cy: 30 }, { cx: 370, cy: 30 },
                    { cx: 30, cy: 220 }, { cx: 370, cy: 220 }
                ].map((pos, i) => (
                    <g key={i}>
                        <circle cx={pos.cx} cy={pos.cy} r="5" fill="#666" stroke="#333" strokeWidth="1" />
                        <path d={`M ${pos.cx - 3} ${pos.cy - 3} L ${pos.cx + 3} ${pos.cy + 3} M ${pos.cx + 3} ${pos.cy - 3} L ${pos.cx - 3} ${pos.cy + 3}`} stroke="#333" strokeWidth="1.5" />
                    </g>
                ))}

                {/* Wear effects */}
                <g opacity="0.25">
                    <line x1="50" y1="25" x2="75" y2="40" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
                    <line x1="330" y1="180" x2="360" y2="200" stroke="#000" strokeWidth="0.5" opacity="0.4" />
                    <line x1="100" y1="220" x2="130" y2="225" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
                    <rect x="10" y="10" width="35" height="35" fill="#fff" opacity="0.15" />
                    <rect x="355" y="195" width="35" height="35" fill="#000" opacity="0.12" />
                </g>

                {/* Side marker */}
                <text x="50" y="105" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#111" opacity="0.8">A</text>

                {/* Type */}
                <text x="200" y="230" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#111" opacity="0.6">
                    TYPE I - 90 MIN
                </text>
            </svg>

            {/* Song Count Badge (Integrated) */}
            <div className="absolute bottom-3 right-5 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-mono pointer-events-none border border-white/20 shadow-sm">
                {songCount} SONGS
            </div>
        </motion.div>
    );
});
