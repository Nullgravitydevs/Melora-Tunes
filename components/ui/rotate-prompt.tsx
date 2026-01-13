"use client";

import { motion } from "framer-motion";
import { MoveHorizontal, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

export function RotatePrompt() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if device is mobile width AND execution portrait
            // Using 900px to cover most tablets/phones in portrait
            const isMobile = window.innerWidth <= 900;
            const isPortrait = window.innerHeight > window.innerWidth;

            setIsVisible(isMobile && isPortrait);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-retro-black flex flex-col items-center justify-center p-8 text-center text-retro-white">
            <motion.div
                animate={{ rotate: 90 }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    repeatDelay: 1,
                    ease: "easeInOut"
                }}
                className="mb-8 p-4 rounded-xl border-4 border-retro-white bg-retro-gray/20"
            >
                <Smartphone size={64} />
            </motion.div>

            <h2 className="text-2xl font-retro uppercase mb-4 text-retro-white tracking-widest text-shadow-glow">
                Rotate Device
            </h2>

            <p className="font-mono text-retro-gray text-sm md:text-base max-w-md leading-relaxed">
                Melora requires a landscape view for the authentic cassette experience.
            </p>

            <div className="mt-8 flex items-center gap-2 text-retro-orange animate-pulse">
                <MoveHorizontal size={20} />
                <span className="font-bold font-mono text-xs uppercase">Turn it sideways</span>
            </div>

            {/* Background Grid Effect */}
            <div className="absolute inset-0 z-[-1] opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
    );
}
