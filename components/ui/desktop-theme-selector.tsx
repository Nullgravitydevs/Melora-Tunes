"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { Check, Monitor, X, Palette, Smartphone, Disc, Radio } from "lucide-react";
import { clsx } from "clsx";

interface DesktopThemeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: ThemeKey;
    onSelectTheme: (theme: ThemeKey) => void;
}

export function DesktopThemeSelector({ isOpen, onClose, currentTheme, onSelectTheme }: DesktopThemeSelectorProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
                    <motion.div
                        initial={{ scale: 0.95, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 20, opacity: 0 }}
                        className="bg-zinc-950 border border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-zinc-900/50 to-transparent">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                                    <Palette className="text-purple-500" size={24} />
                                    Theme Gallery
                                </h2>
                                <p className="text-zinc-500 text-sm mt-1">Select your preferred visual style.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors border border-transparent hover:border-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 max-h-[60vh] overflow-y-auto bg-black/40">
                            {Object.entries(THEMES)
                                .filter(([_, theme]) => {
                                    // Determine if current mode is "Discovery" (Glass) or "Deck" (Everything else)
                                    const isCurrentGlass = THEMES[currentTheme]?.layout === 'glass';
                                    const isThemeGlass = theme.layout === 'glass';

                                    // If currently in glass mode, only show glass themes
                                    if (isCurrentGlass) return isThemeGlass;

                                    // If currently in deck mode, show everything EXCEPT glass
                                    return !isThemeGlass;
                                })
                                .map(([key, theme]) => {
                                    const isActive = currentTheme === key;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                onSelectTheme(key as ThemeKey);
                                                // Auto-save on click for seamless feel
                                                localStorage.setItem('melora-theme', key);
                                            }}
                                            className={clsx(
                                                "relative group text-left rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col h-full",
                                                isActive
                                                    ? "border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-blue-500/5 ring-1 ring-purple-500/20 shadow-lg shadow-purple-900/20"
                                                    : "border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1"
                                            )}
                                        >
                                            {/* Preview Area */}
                                            <div className={clsx("h-32 w-full relative overflow-hidden", theme.bodyGradient)}>
                                                {/* Overlay Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                                                {/* Active Badge */}
                                                <div className="absolute top-3 right-3 z-10">
                                                    {isActive && (
                                                        <span className="px-2.5 py-1 bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5">
                                                            <Check size={10} strokeWidth={4} /> Active
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Abstract UI Representation */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                                    <div className="flex gap-2 items-end opacity-90">
                                                        <div className={clsx("w-10 h-10 rounded-full shadow-lg border-2 border-white/20 flex items-center justify-center", theme.buttonBg)}>
                                                            <div className="w-2 h-2 rounded-full bg-white/50" />
                                                        </div>
                                                        <div className={clsx("h-8 rounded-lg flex-grow shadow-lg border border-white/10 flex items-center px-2", theme.screenBg)}>
                                                            <div className="w-12 h-1 bg-white/20 rounded-full" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex flex-col gap-2 flex-grow bg-zinc-950/30">
                                                <div className="flex justify-between items-start">
                                                    <h3 className={clsx("font-bold text-lg transition-colors", isActive ? "text-white" : "text-zinc-300 group-hover:text-white")}>
                                                        {theme.name}
                                                    </h3>
                                                    {theme.layout === 'glass' ? <Disc size={16} className="text-pink-500" /> : <Radio size={16} className="text-purple-500" />}
                                                </div>

                                                <div className="flex items-center gap-2 mt-auto pt-2">
                                                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest border border-zinc-800 rounded px-1.5 py-0.5">
                                                        {theme.layout}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>

                        <div className="px-8 py-4 bg-zinc-950/50 border-t border-white/5 text-zinc-600 text-xs text-center font-mono">
                            New premium themes added weekly.
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
