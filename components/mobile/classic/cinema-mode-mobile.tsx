"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { getArt } from "@/lib/helpers";

interface CinemaModeMobileProps {
    isOpen: boolean;
    onClose: () => void;
    currentSong: JioSaavnSong | null;
}

const HERO_IMAGES = [
    "/hero-images/hero1.png",
    "/hero-images/hero2.jpg",
    "/hero-images/hero3.jpg",
    "/hero-images/hero4.jpg",
    "/hero-images/hero5.jpg",
];

export function CinemaModeMobile({
    isOpen,
    onClose,
    currentSong
}: CinemaModeMobileProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Use current song art if available, otherwise fall back to hero images
    const images = useMemo(() => {
        const songArt = currentSong ? getArt(currentSong) : '';
        if (songArt) return [songArt];
        return HERO_IMAGES;
    }, [currentSong]);

    // Slideshow effect
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [isOpen, images]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
            {/* Fullscreen Image Slideshow - ONLY IMAGES */}
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex % images.length]}
                    alt="Cinema"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                />
            </AnimatePresence>

            {/* Close Button Removed - Exit via Menu Key */}
        </motion.div>
    );
}
