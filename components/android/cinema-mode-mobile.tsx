"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
    const isMobile = useIsMobile();

    // Slideshow effect
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [isOpen]);

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
                    src={HERO_IMAGES[currentImageIndex]}
                    alt="Cinema"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                />
            </AnimatePresence>

            {/* Close Button - ONLY on Desktop (TFI Studio) */}
            {!isMobile && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/70 active:scale-90 transition-all"
                >
                    <X size={20} className="text-white" />
                </button>
            )}
        </motion.div>
    );
}
