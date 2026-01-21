"use client";

import { motion } from "framer-motion";
import { ThemeKey } from "@/components/ui/desktop-player";
import { Disc, CassetteTape, Smartphone, Zap, ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
    onSelectMode: (mode: ThemeKey) => void;
    onSelectIpod?: () => void;
    onSelectDeck?: () => void;
}

export function WelcomeScreen({ onSelectMode, onSelectIpod, onSelectDeck }: WelcomeScreenProps) {
    return (
        <div className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-white selection:text-black">
            {/* Minimal Grid Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <div className="z-10 w-full max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* Left: Branding */}
                <div className="text-left space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 border border-white rounded-full flex items-center justify-center">
                                <Disc size={20} className="animate-spin-slow" />
                            </div>
                            <span className="font-mono text-sm tracking-widest uppercase opacity-60">Est. 2026</span>
                        </div>
                        <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
                            MELORA<br /><span className="text-transparent stroke-white" style={{ WebkitTextStroke: '1px white' }}>TUNES</span>
                        </h1>
                        <div className="h-1 w-24 bg-white mb-6"></div>
                        <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
                            The ultimate high-fidelity audio experience. <br />
                            Select your interface to begin.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Mode Selection */}
                <div className="space-y-4">
                    <ModeItem
                        title="DECK STUDIO"
                        subtitle="Analog Warmth & Cassettes"
                        icon={<CassetteTape size={24} />}
                        onClick={() => onSelectDeck ? onSelectDeck() : onSelectMode('METAL')}
                        delay={0.2}
                    />
                    <ModeItem
                        title="IPOD CLASSIC"
                        subtitle="Click Wheel Navigation"
                        icon={<Smartphone size={24} />}
                        onClick={() => onSelectIpod?.()}
                        delay={0.3}
                    />
                    <ModeItem
                        title="MODERN FLOW"
                        subtitle="Discovery & Streaming"
                        icon={<Zap size={24} />}
                        onClick={() => onSelectMode('GLASS')}
                        delay={0.4}
                        active
                    />
                </div>
            </div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 left-0 right-0 text-center"
            >
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600">
                    Engineered for Audiophiles
                </p>
            </motion.div>
        </div>
    );
}

function ModeItem({ title, subtitle, icon, onClick, delay, active }: any) {
    return (
        <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.8, ease: "easeOut" }}
            onClick={onClick}
            className={`group w-full text-left p-6 border border-white/10 hover:border-white hover:bg-white/5 transition-all duration-300 flex items-center justify-between relative overflow-hidden backdrop-blur-sm ${active ? 'bg-white/5 border-white/30' : ''}`}
        >
            <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="font-bold text-xl tracking-wide">{title}</h3>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wider group-hover:text-gray-300 transition-colors">{subtitle}</p>
                </div>
            </div>
            <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />

            {/* Hover Glare */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
        </motion.button>
    );
}
