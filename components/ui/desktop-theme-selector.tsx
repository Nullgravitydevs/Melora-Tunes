"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { Check, Star, Monitor, X } from "lucide-react";
import { clsx } from "clsx";

interface DesktopThemeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: ThemeKey;
    onSelectTheme: (theme: ThemeKey) => void;
}

export function DesktopThemeSelector({ isOpen, onClose, currentTheme, onSelectTheme }: DesktopThemeSelectorProps) {
    if (!isOpen) return null;

    const handleSetDefault = (key: ThemeKey, e: React.MouseEvent) => {
        e.stopPropagation();
        localStorage.setItem('melora-theme', key);
        onSelectTheme(key);
        // Optional: toast or feedback here
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Monitor className="text-purple-500" size={24} />
                                    Select Theme
                                </h2>
                                <p className="text-zinc-400 text-sm mt-0.5">Choose your preferred desktop interface.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 max-h-[60vh] overflow-y-auto">
                            {Object.entries(THEMES).map(([key, theme]) => {
                                const isActive = currentTheme === key;
                                const isStoredDefault = typeof window !== 'undefined' && localStorage.getItem('melora-theme') === key;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => onSelectTheme(key as ThemeKey)}
                                        className={clsx(
                                            "relative group text-left rounded-xl border-2 transition-all overflow-hidden flex flex-col",
                                            isActive
                                                ? "border-purple-500 bg-zinc-800/50 ring-4 ring-purple-500/10"
                                                : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800"
                                        )}
                                    >
                                        {/* Status Badge */}
                                        <div className="absolute top-3 right-3 flex gap-2 z-10">
                                            {isActive && (
                                                <span className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                                                    <Check size={10} strokeWidth={4} /> Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Preview Area (Abstract) */}
                                        <div className={clsx("h-24 w-full relative", theme.bodyGradient)}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            {/* Mini UI Representation */}
                                            <div className="absolute bottom-3 left-4 right-4 flex gap-2 items-end opacity-80">
                                                <div className={clsx("w-8 h-8 rounded-full shadow-lg border-2 border-white/20", theme.buttonBg)}></div>
                                                <div className={clsx("col-span-2 h-6 rounded flex-grow shadow-lg border border-white/10", theme.screenBg)}></div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4 flex flex-col gap-1">
                                            <h3 className="font-bold text-base text-zinc-100 group-hover:text-purple-400 transition-colors">
                                                {theme.name}
                                            </h3>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wide">
                                                    Layout: {theme.layout}
                                                </span>

                                                <div
                                                    onClick={(e) => handleSetDefault(key as ThemeKey, e)}
                                                    className={clsx(
                                                        "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 border",
                                                        isStoredDefault
                                                            ? "bg-amber-500/10 border-amber-500/50 text-amber-500"
                                                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-400/50"
                                                    )}
                                                    title="Set as default theme on startup"
                                                >
                                                    <Star size={12} className={isStoredDefault ? "fill-current" : ""} />
                                                    {isStoredDefault ? "Default" : "Set Default"}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="px-6 py-4 bg-zinc-950/30 border-t border-zinc-800 text-zinc-500 text-xs text-center font-mono">
                            New themes coming soon to Melora Cloud.
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
