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
    songCount?: number;
}

const colors = {
    orange: "#f97316",
    purple: "#8b5cf6",
    white: "#e0e0e0",
    green: "#00cc66",
    red: "#ff0055",
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
}: CassetteProps) {
    const bgColor = colors[color];

    return (
        <motion.div
            drag={drag}
            dragConstraints={dragConstraints}
            dragSnapToOrigin
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={onDragStart}
            onDragEnd={(e, info) => onDragEnd?.(e, info, id)}
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "group relative w-full aspect-[3/2] rounded-xl shadow-lg cursor-grab active:cursor-grabbing",
                "border-t border-l border-white/20 border-b border-r border-black/30 p-3 flex flex-col justify-between",
                "tape-texture",
                className
            )}
            style={{ backgroundColor: bgColor }}
        >
            {/* Corner Screws */}
            {[
                { top: "8px", left: "8px", rotate: "rotate-45" },
                { top: "8px", right: "8px", rotate: "-rotate-45" },
                { bottom: "8px", left: "8px", rotate: "rotate-12" },
                { bottom: "8px", right: "8px", rotate: "-rotate-12" }
            ].map((pos, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-gray-300 shadow-inner flex items-center justify-center"
                    style={pos}
                >
                    <div className={`w-1 h-0.5 bg-gray-400 ${pos.rotate}`}></div>
                </div>
            ))}

            {/* Label */}
            <div className="relative bg-amber-50 mx-4 mt-2 h-32 rounded-sm shadow-sm p-2 transform rotate-0 group-hover:rotate-[0.5deg] transition-transform duration-500 flex flex-col justify-center items-center">
                <div className="absolute top-0 left-0 w-full h-4 opacity-20" style={{ backgroundColor: bgColor }}></div>
                <div className="absolute top-2 left-2 font-mono font-bold text-gray-800 text-lg opacity-60">A</div>
                <h3 className="font-hand font-bold text-xl text-gray-900 tracking-tight">
                    {title}
                </h3>
                <p className="font-mono text-[10px] text-gray-400 absolute bottom-1 uppercase tracking-widest">
                    TFI Stereo High Bias
                </p>
                <div className="w-full h-px bg-gray-200 mt-2 mb-1"></div>
                <div className="w-full h-px bg-gray-200"></div>
            </div>

            {/* Reels Container */}
            <div className="mx-8 mb-2 h-10 bg-black/20 rounded-full flex items-center justify-between px-4 relative backdrop-blur-sm">
                {/* Left Reel */}
                <div className="w-10 h-10 bg-white rounded-full border-4 border-gray-800 flex items-center justify-center group-hover:animate-[spin_4s_linear_infinite]">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400"></div>
                    <div className="absolute w-2 h-2 bg-gray-800 rounded-full"></div>
                    <div className="absolute w-full h-1 bg-transparent border-t-2 border-gray-800 rotate-45"></div>
                    <div className="absolute w-full h-1 bg-transparent border-t-2 border-gray-800 -rotate-45"></div>
                </div>

                {/* Tape Label */}
                <div className="flex-grow h-6 mx-2 bg-transparent flex items-center justify-center">
                    <span className="text-[8px] text-white/50 font-mono">TYPE I - 90 MIN</span>
                </div>

                {/* Right Reel */}
                <div className="w-10 h-10 bg-white rounded-full border-4 border-gray-800 flex items-center justify-center group-hover:animate-[spin_4s_linear_infinite]">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400"></div>
                    <div className="absolute w-2 h-2 bg-gray-800 rounded-full"></div>
                    <div className="absolute w-full h-1 bg-transparent border-t-2 border-gray-800 rotate-45"></div>
                    <div className="absolute w-full h-1 bg-transparent border-t-2 border-gray-800 -rotate-45"></div>
                </div>
            </div>

            {/* Song Count Badge */}
            <div className="absolute -right-2 top-3/4 bg-black text-white text-xs font-bold py-1 px-3 rounded shadow-md border border-gray-700 z-10">
                {songCount} SONGS
            </div>
        </motion.div>
    );
});
