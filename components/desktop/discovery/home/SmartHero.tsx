"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { getArt } from "@/lib/helpers";

interface SmartHeroProps {
    item: any;
    type: 'song' | 'album';
    greeting: string;
    isPlaying: boolean;
    onPlay: () => void;
    onToggle: () => void;
}

export function SmartHero({ item, type, greeting, isPlaying, onPlay, onToggle }: SmartHeroProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    // Reset load state when item changes
    useEffect(() => {
        setImageLoaded(false);
    }, [item?.id]);

    if (!item) return null;

    const artUrl = getArt(item);

    return (
        <div className="relative h-[60vh] min-h-[500px] w-full mb-8 group overflow-hidden">
            {/* 1. CINEMATIC BACKGROUND BLUR */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    key={item.id + "-bg"}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${artUrl})`,
                        filter: 'blur(60px) brightness(0.4) saturate(1.2)',
                    }}
                />

                {/* Slow Zoom Effect Layer - Adds the "Motion" */}
                <motion.div
                    className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                    style={{ backgroundImage: `url(${artUrl})` }}
                    animate={{ scale: [1, 1.1] }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                />
            </div>

            {/* 2. GRADIENT OVERLAYS */}
            {/* Bottom fade for seamless transition to content */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />

            {/* Left vignette for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

            {/* 3. CONTENT CONTAINER */}
            <div className="relative h-full flex flex-col justify-end px-8 py-12 z-10">
                <div className="max-w-4xl flex items-end gap-8">

                    {/* Primary Artwork - Shadow & Depth */}
                    <motion.div
                        key={item.id + "-art"}
                        initial={{ opacity: 0, y: 20, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
                        className="hidden md:block relative shrink-0"
                    >
                        <div className="w-52 h-52 rounded-lg shadow-2xl overflow-hidden border border-white/10">
                            <img
                                src={artUrl}
                                alt={item.name}
                                className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                            />
                        </div>
                    </motion.div>

                    {/* Text & Action */}
                    <div className="flex-1 mb-2">
                        <motion.div
                            key={item.id + "-text"}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            {/* Eyebrow Label */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-1 rounded bg-white/10 backdrop-blur-md border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                                    {type === 'song' ? 'Pick of the Day' : 'New Release'}
                                </span>
                                <span className="text-white/40 text-sm font-medium tracking-wide">
                                    • {greeting}
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2 line-clamp-2 md:line-clamp-1 tracking-tight">
                                {decodeHtml(item.name || item.title)}
                            </h1>

                            {/* Artist / Subtitle */}
                            <p className="text-lg md:text-xl text-white/60 font-medium mb-8 line-clamp-1">
                                {decodeHtml(item.primaryArtists || item.subtitle || item.artist)}
                                {item.year ? <span className="text-white/30 mx-2">• {item.year}</span> : null}
                            </p>

                            {/* SINGLE ACTION BUTTON */}
                            <motion.button
                                onClick={isPlaying ? onToggle : onPlay}
                                className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] transition-shadow duration-300"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                            >
                                {isPlaying ? (
                                    <>
                                        <Pause fill="currentColor" size={24} />
                                        <span>Pause</span>
                                    </>
                                ) : (
                                    <>
                                        <Play fill="currentColor" size={24} className="ml-1" />
                                        <span>Play Now</span>
                                    </>
                                )}

                                {/* Button Glow Effect */}
                                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 blur-md transition-opacity" />
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
