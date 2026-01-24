"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Disc, Smartphone, CassetteTape, Github, MessageCircle, Coffee } from 'lucide-react';
import type { UIMode } from '@/app/page';

interface LauncherProps {
    onSelect: (mode: UIMode) => void;
}

export function Launcher({ onSelect }: LauncherProps) {
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="relative w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <video
                    ref={videoRef}
                    src="/assets/intro.mp4"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000"
                    loop
                    muted={isMuted}
                    playsInline
                    autoPlay
                />
                {/* Vignette Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.8)_100%)]" />
                {/* Bottom Gradient for Text Legibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex-1 flex flex-col">
                {/* Header */}
                <header className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <span className="font-bold text-xs tracking-tighter">MT</span>
                        </div>
                        <span className="font-bold tracking-widest text-sm text-white/70">MELORA TUNES</span>
                    </div>

                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all text-white/50 hover:text-white"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </header>

                {/* Main Stage */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <ModeSelector isMobile={isMobile} onSelect={onSelect} />
                </div>

                {/* Footer */}
                <footer className="p-8 flex justify-center gap-8 mb-4">
                    <SocialLink href="https://github.com/NullGravity-Labs/Melora-Tunes" icon={<Github size={18} />} label="Open Source" />
                    <SocialLink href="https://discord.gg/melora" icon={<MessageCircle size={18} />} label="Join Colony" />
                    <SocialLink href="https://buymeacoffee.com/melora" icon={<Coffee size={18} />} label="Support" />
                </footer>
            </div>
        </div>
    );
}

// Reusing the Mode Selection Logic
function ModeSelector({ isMobile, onSelect }: { isMobile: boolean, onSelect: (m: UIMode) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl"
        >
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 drop-shadow-2xl">Choose your Interface</h2>

            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {/* 1. DISCOVERY */}
                <ModeCard
                    title="Discovery"
                    desc="Modern dashboard for exploration."
                    icon={<Disc size={32} />}
                    onClick={() => onSelect('DISCOVERY')}
                    color="from-blue-500 to-indigo-600"
                />

                {/* 2. CLASSIC */}
                <ModeCard
                    title="Classic"
                    desc="Tactile Click Wheel experience."
                    icon={<Smartphone size={32} />}
                    onClick={() => onSelect('CLASSIC')}
                    color="from-gray-700 to-black"
                />

                {/* 3. DECK (Desktop Only) */}
                {!isMobile && (
                    <ModeCard
                        title="Deck Studio"
                        desc="Professional analog simulation."
                        icon={<CassetteTape size={32} />}
                        onClick={() => onSelect('DECK')}
                        color="from-orange-500 to-amber-600"
                    />
                )}
            </div>
        </motion.div>
    );
}

function ModeCard({ title, desc, icon, onClick, color }: any) {
    return (
        <motion.button
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative group h-64 md:h-80 rounded-3xl overflow-hidden text-left p-8 flex flex-col justify-end bg-gradient-to-br ${color} shadow-2xl border border-white/10`}
        >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />

            {/* Icon */}
            <div className="absolute top-8 left-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-lg">
                {icon}
            </div>

            <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">{title}</h3>
                <p className="text-white/70 font-medium group-hover:text-white transition-colors">{desc}</p>
            </div>
        </motion.button>
    );
}

function SocialLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group"
        >
            <span className="group-hover:-translate-y-1 transition-transform duration-300">{icon}</span>
            <span>{label}</span>
        </a>
    );
}
