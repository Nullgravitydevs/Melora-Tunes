"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Music } from "lucide-react";

interface CassetteProps {
    title: string;
    color?: string; // "orange" | "purple" | "white" | "green" | "red" etc
    songCount?: number;
    className?: string;
    drag?: boolean;
    dragConstraints?: React.RefObject<Element>;
    onPlay?: () => void;
    id?: string;
}

export function Cassette({
    title,
    color = "orange",
    songCount,
    className,
    drag = true,
    dragConstraints,
    onPlay
}: CassetteProps) {

    // Minimal mapping for cassette colors vs styles
    const colors: Record<string, string> = {
        orange: "bg-orange-500",
        purple: "bg-purple-500",
        white: "bg-gray-200",
        green: "bg-green-500",
        red: "bg-red-500",
        blue: "bg-blue-500",
    };

    const baseColor = colors[color] || colors.orange;

    return (
        <div className={clsx("relative w-40 h-24 rounded-lg shadow-lg flex flex-col items-center justify-center border border-black/10 overflow-hidden select-none", baseColor, className)}>
            {/* Cassette Texture/Label */}
            <div className="absolute inset-2 bg-white/90 rounded border border-gray-300 flex flex-col items-center justify-center p-1">
                <div className="w-full h-2 bg-red-500/20 mb-1"></div>
                <h3 className="text-xs font-bold text-black font-mono text-center truncate w-full px-1">{title}</h3>
                {songCount !== undefined && (
                    <p className="text-[8px] text-gray-500 font-mono">{songCount} songs</p>
                )}
                <div className="flex gap-4 mt-2">
                    <div className="w-4 h-4 rounded-full bg-black ring-1 ring-gray-400"></div>
                    <div className="w-4 h-4 rounded-full bg-black ring-1 ring-gray-400"></div>
                </div>
            </div>
            {/* Screws */}
            <div className="absolute top-1 left-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute top-1 right-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
    );
}
