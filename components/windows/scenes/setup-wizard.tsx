"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { saveSettings, loadSettings } from "@/lib/settings";
import { AudioWaveform, Smartphone, Disc, CassetteTape, ArrowRight, Github, MessageCircle, Coffee, Shield, User, Check, Volume2, VolumeX } from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";

interface SetupWizardProps {
    onComplete: (mode: 'CLASSIC' | 'DISCOVERY' | 'DECK') => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
    const isMobile = useIsMobile();
    const [step, setStep] = useState(0);
    const [profile, setProfile] = useState({ name: "", dob: "" });
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initial Load Settings if revisiting? Usually fresh.
    useEffect(() => {
        // Ensure video plays
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
        }
    }, [step]);

    const handleNext = () => setStep(p => p + 1);

    const handleComplete = (mode: 'CLASSIC' | 'DISCOVERY' | 'DECK') => {
        // Save Profile
        saveSettings({ userName: profile.name, userDOB: profile.dob });
        // Complete
        onComplete(mode);
    };

    return (
        <div className="relative w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans">
            {/* === BACKGROUND LAYER === */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                {/* 1. Video Layer */}
                <video
                    ref={videoRef}
                    src="/assets/intro.mp4"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000"
                    loop
                    muted={isMuted}
                    playsInline
                    autoPlay
                />

                {/* 2. Vignette Overlay (Edges Only) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.5)_100%)]" />

                {/* 3. Bottom Gradient (Text Legibility) */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>

            {/* === CONTENT LAYER === */}
            <div className="relative z-10 flex-1 flex flex-col">

                {/* Header Logo */}
                <header className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <AudioWaveform size={20} className="text-white" />
                        </div>
                        <span className="font-display font-bold text-xl tracking-tighter uppercase">Melora Tunes</span>
                    </div>
                    {/* Progress Dots */}
                    <div className="flex gap-2">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-500 ${i <= step ? 'bg-white' : 'bg-white/20'}`} />
                        ))}
                    </div>

                    {/* Volume Toggle */}
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/10 transition-colors"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </header>

                {/* Main Stage */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <StepWelcome key="step0" onNext={handleNext} />
                        )}
                        {step === 1 && (
                            <StepIdentity key="step1" profile={profile} setProfile={setProfile} onNext={handleNext} />
                        )}
                        {step === 2 && (
                            <StepPrivacy key="step2" onNext={handleNext} />
                        )}
                        {step === 3 && (
                            <StepMode key="step3" isMobile={isMobile} onSelect={handleComplete} />
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Socials */}
                <footer className="p-8 flex justify-center gap-8 mb-4">
                    <SocialLink href="https://github.com/NullGravity-Labs/Melora-Tunes" icon={<Github size={18} />} label="Open Source" />
                    <SocialLink href="https://discord.gg/melora" icon={<MessageCircle size={18} />} label="Join Colony" />
                    <SocialLink href="https://buymeacoffee.com/melora" icon={<Coffee size={18} />} label="Support" />
                </footer>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function StepWelcome({ onNext }: { onNext: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-2xl"
        >
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl">
                FEEL THE<br />
                <span className="text-transparent stroke-white" style={{ WebkitTextStroke: '1px white' }}>EMOTION</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-10 font-light max-w-lg mx-auto leading-relaxed">
                Music isn't just audio. It's a memory. <br />
                Experience the next generation of high-fidelity playback.
            </p>
            <button
                onClick={onNext}
                className="group relative px-10 py-4 bg-white text-black font-bold tracking-[0.2em] rounded-full overflow-hidden hover:scale-105 transition-transform"
            >
                <span className="relative z-10 flex items-center gap-3">INITIALIZE SYSTEM <ArrowRight size={16} /></span>
            </button>
        </motion.div>
    );
}

function StepIdentity({ profile, setProfile, onNext }: { profile: any, setProfile: any, onNext: () => void }) {
    const isValid = profile.name.length > 2;
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md bg-black/40 backdrop-blur-xl p-10 rounded-3xl border border-white/10"
        >
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <User size={32} />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-center">Who are you?</h2>
            <p className="text-white/50 text-center mb-8 text-sm">We use this to personalize your mix.</p>

            <div className="space-y-6">
                <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">Name</label>
                    <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white transition-colors"
                        placeholder="Enter your name"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">Date of Birth</label>
                    <input
                        type="date"
                        value={profile.dob}
                        onChange={e => setProfile({ ...profile, dob: e.target.value })}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white transition-colors text-white"
                    />
                </div>

                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`w-full py-4 rounded-xl font-bold tracking-widest transition-all ${isValid ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                >
                    CONTINUE
                </button>
            </div>
        </motion.div>
    );
}

function StepPrivacy({ onNext }: { onNext: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-xl text-center"
        >
            <Shield size={64} className="mx-auto mb-8 text-white/80" />
            <h2 className="text-4xl font-bold mb-6">Your Data is Yours.</h2>
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-left space-y-4 mb-8 backdrop-blur-md">
                <PrivacyItem label="Local Storage" desc="All preferences, history, and downloads stay on your device." />
                <PrivacyItem label="No Tracking" desc="We don't sell your listening habits to advertisers." />
                <PrivacyItem label="Open Source" desc="The code is public. Trust through transparency." />
            </div>
            <button
                onClick={onNext}
                className="px-10 py-3 border border-white/30 rounded-full hover:bg-white hover:text-black transition-all font-bold tracking-widest uppercase text-sm"
            >
                Start Listening
            </button>
        </motion.div>
    );
}

function PrivacyItem({ label, desc }: any) {
    return (
        <div className="flex gap-4">
            <div className="mt-1"><Check size={16} className="text-green-400" /></div>
            <div>
                <h3 className="font-bold text-lg">{label}</h3>
                <p className="text-white/60 text-sm">{desc}</p>
            </div>
        </div>
    );
}

function StepMode({ isMobile, onSelect }: { isMobile: boolean, onSelect: (m: any) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full max-w-5xl"
        >
            <h2 className="text-3xl font-bold text-center mb-10">Choose your Interface</h2>

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

function SocialLink({ href, icon, label }: any) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
        >
            {icon}
            <span className="hidden md:inline">{label}</span>
        </a>
    );
}
