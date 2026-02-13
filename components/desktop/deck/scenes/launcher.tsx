"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Disc, Smartphone, CassetteTape, Github, MessageCircle, Coffee, AudioWaveform } from 'lucide-react';
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
                    src="/assets/intro-mobile.mp4"
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
                        <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <AudioWaveform size={20} className="text-white" />
                        </div>
                        <span className="font-display font-bold text-xl tracking-tighter uppercase">Melora Tunes</span>
                    </div>

                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/10 transition-colors"
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
            <h2 className="text-3xl font-bold text-center mb-10">Choose your Interface</h2>

            <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 max-w-4xl mx-auto'}`}>
                {/* === MOBILE MODES === */}
                {isMobile && (
                    <>
                        {/* 1. Mobile Discovery */}
                        <ModeCard
                            title="Discovery Mobile"
                            desc="Modern, touch-first player."
                            icon={<Disc size={32} />}
                            onClick={() => onSelect('DISCOVERY')}
                            color="from-white/15 to-white/5"
                        />
                        {/* 2. iPod Classic */}
                        <ModeCard
                            title="iPod Classic"
                            desc="Zen mode. Pure music."
                            icon={<Smartphone size={32} />}
                            onClick={() => onSelect('CLASSIC')}
                            color="from-white/10 to-white/[0.02]"
                        />
                    </>
                )}

                {/* === DESKTOP MODES === */}
                {!isMobile && (
                    <>
                        {/* 1. Desktop Discovery */}
                        <ModeCard
                            title="Discovery Desktop"
                            desc="The ultimate dashboard."
                            icon={<Disc size={32} />}
                            onClick={() => onSelect('DISCOVERY')}
                            color="from-white/15 to-white/5"
                        />
                        {/* 2. Deck Studio */}
                        <ModeCard
                            title="Deck Studio"
                            desc="Pro analog workspace."
                            icon={<CassetteTape size={32} />}
                            onClick={() => onSelect('DECK')}
                            color="from-white/10 to-white/[0.02]"
                        />
                    </>
                )}
            </div>
        </motion.div>
    );
}

function ModeCard({ title, desc, icon, onClick, color }: any) {
    return (
        <button
            onClick={onClick}
            className="relative group h-64 rounded-3xl overflow-hidden border border-white/10 hover:border-white transition-all text-left p-6 flex flex-col justify-end"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 group-hover:opacity-40 transition-opacity`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            {/* 3. Bottom Gradient (Text Legibility) */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            <div className="relative z-10 transform group-hover:-translate-y-2 transition-transform duration-300">
                <div className="mb-4 w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:bg-white group-hover:text-black transition-colors">
                    {icon}
                </div>
                <h3 className="text-2xl font-bold mb-1">{title}</h3>
                <p className="text-white/60 text-sm opacity-0 group-hover:opacity-100 transition-opacity transition-delay-100">{desc}</p>
            </div>
        </button>
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
