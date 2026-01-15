"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Play, Pause, SkipBack, SkipForward, LogOut } from "lucide-react";
// ...


import { JioSaavnSong, getLyricsWithFallback } from "@/lib/jiosaavn";

interface CinemaModeProps {
    isOpen: boolean;
    onClose: () => void;
    currentSong: JioSaavnSong | null;
    isPlaying: boolean;
    className?: string; // Allow overriding positioning
    showCloseButton?: boolean;
    onPlayPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

const HERO_IMAGES = [
    "/hero-images/hero1.png",
    "/hero-images/hero2.jpg",
    "/hero-images/hero3.jpg",
    "/hero-images/hero4.jpg",
    "/hero-images/hero5.jpg",
];

export function CinemaModeDesktop({
    isOpen,
    onClose,
    currentSong,
    isPlaying,
    className,
    showCloseButton = false,
    onPlayPause,
    onNext,
    onPrev
}: CinemaModeProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Slideshow effect
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) return null;

    const decodeHtmlEntities = (text: string) => {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    };


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`bg-black flex flex-col overflow-hidden ${className || 'fixed inset-0 z-[100]'}`} // Default to fixed/fullscreen
        >
            {/* Background Slideshow or Song Art */}
            <div className="absolute inset-0 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentImageIndex}
                        src={HERO_IMAGES[currentImageIndex]}
                        alt="Hero Background"
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />
                </AnimatePresence>
                {/* Gradient removed for full clarity as requested */}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col p-12">
                {/* Header */}
                {/* Header */}
                {showCloseButton && (
                    <div className="absolute top-8 right-8 z-50">
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 backdrop-blur-md rounded-full text-white transition-all border border-white/10 shadow-2xl group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-end pb-12">
                    {currentSong && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            key={currentSong.id}
                            className="max-w-4xl"
                        >
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                                {decodeHtmlEntities(currentSong.name)}
                            </h1>
                            <p className="text-base md:text-lg text-gray-300 font-light">
                                {decodeHtmlEntities(currentSong.primaryArtists)}
                            </p>
                        </motion.div>
                    )}

                    {/* Static Scrollable Lyrics - Bottom Right (Hidden Scrollbar) */}
                    {/* Static Scrollable Lyrics - Bottom Right (Hidden Scrollbar) */}


                    {/* Desktop Controls Overlay - REMOVED as per user request */}
                    {/* Only Show close button at top - kept */}
                    {/* User wants only images + lyrics + close button */}
                </div>
            </div>
        </motion.div>
    );
}
