"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Download, Share2, Palette, Smartphone, X, Settings, Plus, Maximize2, FileDown, Share as ShareIcon, Volume1, Moon, Sun } from "lucide-react";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";

interface ZenStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    onSwitchToMobile?: () => void;
    onOpenSettings?: () => void;
    onEditMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onCreateMix?: () => void;
    onCinemaMode?: () => void;
    onOpenThemeSelector?: () => void;
    onSnapshotMix?: (mix: any) => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: any) => void;
}

export function ZenStage({ currentTheme, onThemeChange, onSelectTheme, onSwitchToMobile, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowQueue, onShareMix }: ZenStageProps) {
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded
    } = usePlayback();

    const { playClick, playClunk, playEject } = useAudio();
    // const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

    // Default to LIGHT mode as requested by user ("Zen Minimalist" implies light). 
    // In a real app, we might persist this or respect system pref.
    const [isDark, setIsDark] = useState(false);

    const activeMix = mixes.find(m => m.id === activeMixId) || null;
    const hasCassette = isLoaded && !!activeMix;

    // Derived state for display
    const currentMixTitle = activeMix?.title || "No Cassette Loaded";
    // const songName = currentSong ? decodeHtml(currentSong.name) : (activeMix ? "Ready to Play" : "NO CASSETTE"); // Unused
    // const artistName = currentSong ? decodeHtml(currentSong.primaryArtists || "") : (activeMix ? "Melora High Bias" : ""); // Unused

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={containerRef} className={clsx(
            "w-full h-full font-sans overflow-hidden relative transition-colors duration-500",
            isDark ? "dark text-stone-200" : "text-stone-900 selection:bg-zen-primary selection:text-white"
        )}
            style={{ backgroundColor: isDark ? '#1c1917' : '#fcfbf9' }}
        >
            {/* Paper Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20 mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")` }}
            />

            <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 relative z-10 flex flex-col h-screen max-h-[1080px] w-full">
                {/* Header */}
                <header className="flex justify-between items-center mb-12 md:mb-20">
                    <div className="flex items-center gap-3">
                        {/* Logo Icon */}
                        <div className={clsx("w-8 h-8 rounded flex items-center justify-center transition-colors", isDark ? "bg-stone-800 text-stone-100" : "bg-stone-200 text-stone-800")}>
                            <div className="flex gap-0.5">
                                <div className={clsx("w-1 h-3 rounded-full", isDark ? "bg-white" : "bg-stone-800")}></div>
                                <div className={clsx("w-1 h-3 rounded-full", isDark ? "bg-white" : "bg-stone-800")}></div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase">Melora <span className="text-xs align-top text-zen-primary">ZEN</span></h1>
                    </div>

                    <nav className="flex items-center gap-6">
                        <button onClick={onCinemaMode} className="hidden md:block font-mono text-sm tracking-widest uppercase hover:text-zen-primary transition-colors border-b border-transparent hover:border-zen-primary pb-1">
                            Cinema Mode
                        </button>
                        <button onClick={onCreateMix} className="font-mono text-sm tracking-widest uppercase hover:text-zen-primary transition-colors border-b border-transparent hover:border-zen-primary pb-1">
                            + Create Mix
                        </button>

                        <div className="flex gap-4 ml-4 border-l border-stone-200 dark:border-stone-700 pl-6">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Theme Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => onOpenThemeSelector?.()}
                                    className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                                    title="Change Theme"
                                >
                                    <Palette size={20} />
                                </button>
                            </div>

                            <button onClick={onOpenSettings} className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">
                                <Settings size={20} />
                            </button>
                        </div>
                    </nav>
                </header>

                <main className="grid lg:grid-cols-12 gap-12 lg:gap-24 flex-grow items-center">
                    {/* Left Column: Now Playing & Up Next */}
                    <section className="lg:col-span-7 flex flex-col justify-center items-center lg:items-start perspective-1000">
                        <div className="mb-8 opacity-60">
                            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-stone-500 dark:text-stone-400">Now Playing</h2>
                        </div>

                        {/* Large Cassette Display */}
                        {activeMix ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative w-full max-w-lg aspect-[3/2] transform hover:scale-[1.01] transition-transform duration-500 ease-out group cursor-default"
                            >
                                <div className="absolute inset-0 bg-stone-800 dark:bg-stone-900 rounded-xl shadow-2xl overflow-hidden border-b-4 border-stone-900 dark:border-black">
                                    {/* Glass/Plastic texture */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-10"></div>
                                    <div className="absolute top-0 left-0 right-0 h-1/6 bg-stone-700/50 dark:bg-stone-800/50 border-b border-stone-900/30"></div>

                                    {/* Label Area */}
                                    <div className="absolute top-[10%] bottom-[10%] left-[5%] right-[5%] bg-[#F0EFEB] rounded-lg shadow-inner flex flex-col items-center justify-between p-4 z-0">
                                        <div className="w-full flex justify-between items-start">
                                            <span className="font-mono font-bold text-2xl text-stone-800 opacity-90">A</span>
                                            <div className="flex flex-col items-end">
                                                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">Type I</span>
                                                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">Normal Position</span>
                                            </div>
                                        </div>

                                        {/* Handwriting Title */}
                                        <div className="w-full flex-grow flex items-center justify-center my-2 relative">
                                            {/* Lines */}
                                            <div className="w-full border-b border-stone-300 absolute top-1/2 opacity-30"></div>
                                            <div className="w-full border-b border-stone-300 absolute top-1/3 opacity-30"></div>
                                            <div className="w-full border-b border-stone-300 absolute bottom-1/3 opacity-30"></div>

                                            <h3 className="font-hand text-2xl md:text-3xl text-stone-800 z-10 bg-[#F0EFEB] px-4 rotate-[-1deg] translate-y-[-2px] tracking-tight truncate max-w-full text-center">
                                                {activeMix.title}
                                            </h3>
                                        </div>

                                        <div className="w-full flex justify-center">
                                            <span className="font-mono text-[10px] font-bold text-stone-400 tracking-[0.3em] uppercase">MELORA HIGH BIAS</span>
                                        </div>
                                    </div>

                                    {/* Reels Window */}
                                    <div className="absolute top-[35%] bottom-[35%] left-[20%] right-[20%] bg-stone-900/90 rounded-full border-2 border-stone-600/30 shadow-inner flex justify-center items-center gap-8 z-20 backdrop-blur-sm">
                                        {/* Left Reel */}
                                        <motion.div
                                            className="w-12 h-12 rounded-full border-4 border-white/80 bg-transparent relative flex items-center justify-center"
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                        >
                                            <div className="w-full h-full border-2 border-dashed border-stone-500/50 rounded-full absolute"></div>
                                            <div className="w-2 h-2 bg-stone-200 rounded-full"></div>
                                        </motion.div>

                                        {/* Tape Bridge */}
                                        <div className="flex-grow h-8 bg-stone-800/50 flex items-center px-1 overflow-hidden relative">
                                            <div className="w-full h-6 bg-stone-900 border-t border-b border-stone-700 relative overflow-hidden">
                                                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-stone-800/80 rounded-r-full"></div>
                                                <div className="absolute top-0 bottom-0 right-0 w-1/4 bg-stone-800/80 rounded-l-full"></div>
                                            </div>
                                        </div>

                                        {/* Right Reel */}
                                        <motion.div
                                            className="w-12 h-12 rounded-full border-4 border-white/80 bg-transparent relative flex items-center justify-center"
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                        >
                                            <div className="w-full h-full border-2 border-dashed border-stone-500/50 rounded-full absolute"></div>
                                            <div className="w-2 h-2 bg-stone-200 rounded-full"></div>
                                        </motion.div>
                                    </div>

                                    {/* Screws */}
                                    <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-stone-600 shadow-inner flex items-center justify-center"><div className="w-1 h-[1px] bg-stone-800 rotate-45"></div></div>
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-stone-600 shadow-inner flex items-center justify-center"><div className="w-1 h-[1px] bg-stone-800 rotate-12"></div></div>
                                    <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-stone-600 shadow-inner flex items-center justify-center"><div className="w-1 h-[1px] bg-stone-800 rotate-90"></div></div>
                                    <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-stone-600 shadow-inner flex items-center justify-center"><div className="w-1 h-[1px] bg-stone-800 rotate-[135deg]"></div></div>
                                </div>
                                <div className="absolute -bottom-8 left-4 right-4 h-4 bg-black/20 blur-xl rounded-full"></div>

                                {/* Edit/Action Buttons overlay on hover */}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                                    <button onClick={() => onEditMix?.(activeMix)} className="bg-white text-stone-800 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Settings size={16} /></button>
                                    <button onClick={() => onOpenSearch?.(activeMix.id)} className="bg-zen-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={16} /></button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="w-full max-w-lg aspect-[3/2] bg-stone-200 dark:bg-stone-800 rounded-xl flex items-center justify-center border-2 border-dashed border-stone-300 dark:border-stone-700 text-stone-400 font-mono text-sm tracking-widest uppercase">
                                No Mixtape Selected
                            </div>
                        )}

                        {/* Up Next List */}
                        <div className="mt-8 lg:flex flex-col w-full max-w-lg pl-4 min-h-0 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden -mr-4 pr-4">
                            <h4 className="font-mono text-xs text-stone-400 uppercase tracking-widest mb-4">Your Collection</h4>
                            <ul className="space-y-3">
                                {mixes.map((mix) => (
                                    <li
                                        key={mix.id}
                                        onClick={() => {
                                            if (mix.id !== activeMixId) {
                                                playClick();
                                                loadMix(mix.id);
                                            }
                                        }}
                                        className={clsx(
                                            "group flex items-center justify-between text-sm cursor-pointer transition-colors border-b border-transparent hover:border-stone-200 dark:hover:border-stone-700 pb-2",
                                            mix.id === activeMixId ? "text-zen-primary font-bold" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                                        )}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={clsx("w-1.5 h-1.5 rounded-full transition-colors", mix.id === activeMixId ? "bg-zen-primary animate-pulse" : "bg-stone-300 dark:bg-stone-600 group-hover:bg-zen-primary")}></span>
                                            {mix.title}
                                        </span>
                                        <span className="font-mono text-xs opacity-50">{mix.songs.length} Songs</span>
                                    </li>
                                ))}
                                <li onClick={onCreateMix} className="flex items-center gap-3 text-sm text-stone-400 hover:text-zen-primary cursor-pointer pt-2 group">
                                    <Plus size={14} /> Create New Mix
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Right Column: Player */}
                    <section className="lg:col-span-5 w-full">
                        <div className="bg-zen-surface-light dark:bg-zen-surface-dark p-8 md:p-12 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-stone-800 transition-all">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-stone-400">Stereo Cassette Player</h2>
                                <div className="flex gap-1 items-center">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full toggle-pulse", isLoaded ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide">{isLoaded ? "Ready" : "Empty"}</span>
                                </div>
                            </div>

                            {/* Player Screen */}
                            <div className="bg-stone-100 dark:bg-black/40 rounded-lg p-6 mb-8 border border-stone-200 dark:border-stone-800 h-32 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                {isLoaded ? (
                                    <>
                                        <p className="font-mono text-sm text-stone-800 dark:text-stone-300 tracking-widest transition-colors cursor-default z-10 text-center truncate w-full px-4 group-hover:text-zen-primary">
                                            {currentSong ? decodeHtml(currentSong.name) : activeMix?.title.toUpperCase()}
                                        </p>
                                        <p className="font-mono text-xs text-stone-400 mt-1 uppercase tracking-wider">{currentSong ? decodeHtml(currentSong.primaryArtists || "") : "Tape Loaded"}</p>
                                    </>
                                ) : (
                                    <p className="font-mono text-sm text-stone-400 tracking-widest group-hover:text-zen-primary transition-colors cursor-default">NO CASSETTE LOADED</p>
                                )}
                                {/* Scanlines */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='1' fill='rgba(0,0,0,0.1)'/%3E%3C/svg%3E")` }}></div>
                            </div>

                            {/* Time & Progress */}
                            <div className="flex justify-between items-end mb-4 font-mono text-xs text-stone-400">
                                <span>{formatTime(progress * duration)}</span>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] tracking-widest uppercase">Tape A</span>
                                    <span>{formatTime(duration || 0)}</span>
                                </div>
                            </div>

                            <div
                                className="relative h-1 w-full bg-stone-200 dark:bg-stone-800 rounded-full mb-12 overflow-hidden cursor-pointer group"
                                onClick={(e) => {
                                    if (duration && isLoaded) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = (e.clientX - rect.left) / rect.width;
                                        seek(percent);
                                    }
                                }}
                            >
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-stone-800 dark:bg-stone-200 group-hover:bg-zen-primary transition-colors"
                                    style={{ width: `${progress * 100}%` }}
                                ></motion.div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-8 md:gap-12 mb-12">
                                <button onClick={() => { playClick(); prev(); }} className="p-4 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300 transform hover:scale-105">
                                    <SkipBack className="fill-current" size={24} />
                                </button>
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="p-6 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 shadow-lg hover:shadow-xl hover:bg-zen-primary dark:hover:bg-zen-primary dark:hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95 group"
                                >
                                    {isPlaying ? <Pause className="fill-current" size={32} /> : <Play className="fill-current pl-1" size={32} />}
                                </button>
                                <button onClick={() => { playClick(); next(); }} className="p-4 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300 transform hover:scale-105">
                                    <SkipForward className="fill-current" size={24} />
                                </button>
                            </div>

                            {/* Footer Controls (Eject, Volume) */}
                            <div className="flex justify-between items-center pt-6 border-t border-stone-100 dark:border-stone-800">
                                <button
                                    onClick={() => { playEject(); loadMix(null as any); }}
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-stone-400 hover:text-zen-primary transition-colors uppercase tracking-widest group"
                                >
                                    <LogOut size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                                    Eject
                                </button>

                                <div className="flex items-center gap-3 group cursor-pointer relative">
                                    <Volume2 size={18} className="text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300" />
                                    <div className="w-20 h-1 bg-stone-200 dark:bg-stone-800 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-stone-400 dark:bg-stone-500 group-hover:bg-zen-primary transition-colors"
                                            style={{ width: `${volume * 100}%` }}
                                        ></div>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05" value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-800 flex items-center justify-center mx-auto bg-stone-50 dark:bg-stone-900 text-stone-300 dark:text-stone-600 font-mono text-xs font-bold">
                        N
                    </div>
                </footer>
            </div>
        </div>
    );
}
