
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Music } from "lucide-react";

/* --- CARD: MOOD (Vibe Check) --- */
export function MoodCard({ title, color, onClick }: { title: string; color: string; onClick: () => void }) {
    // Dynamic Gradient Maps
    const gradients: Record<string, string> = {
        'love': 'from-white/20 via-white/10 to-white/5',
        'party': 'from-white/15 via-white/8 to-white/[0.02]',
        'workout': 'from-white/20 via-white/12 to-white/5',
        'chill': 'from-white/10 via-white/5 to-white/[0.02]',
        'sad': 'from-white/8 via-white/4 to-white/[0.02]',
        'focus': 'from-white/12 via-white/6 to-white/[0.02]',
    };

    const gradient = gradients[title.toLowerCase()] || 'from-white/20 via-white/10 to-white/5';

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.96 }}
            className="relative h-40 rounded-2xl overflow-hidden cursor-pointer group"
        >
            {/* Background Mesh Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />

            {/* Glass Surface */}
            <div className="absolute inset-0 backdrop-blur-3xl bg-white/[0.02] border border-white/10 group-hover:border-white/20 transition-colors" />

            {/* Noise Texture Overlay */}
            <div className={`absolute inset-0 opacity-20`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-5 z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                    <Play size={16} fill="currentColor" className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-0.5" />
                    <Music size={18} className="text-white opacity-100 group-hover:opacity-0 transition-opacity duration-300 absolute" />
                </div>

                <h3 className="text-2xl font-black text-white tracking-tight leading-none group-hover:translate-x-1 transition-transform">{title}</h3>
                <p className="text-xs font-medium text-white/50 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                    Vibe Check
                </p>
            </div>

            {/* Decorative Glow */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 blur-[60px] rounded-full group-hover:bg-white/30 transition-colors duration-500" />
        </motion.div>
    );
}
