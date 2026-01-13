"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Download, Share2, Palette, Smartphone, X, Settings, Plus, Maximize2, FileDown, Share as ShareIcon, Volume1 } from "lucide-react";
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
}

export function ZenStage({ currentTheme, onThemeChange, onSelectTheme, onSwitchToMobile, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode }: ZenStageProps) {
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded//, currentSongIndex
    } = usePlayback();

    const { playClick, playClunk, playEject } = useAudio();
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [dragConstraint, setDragConstraint] = useState(0);

    const activeMix = mixes.find(m => m.id === activeMixId) || null;
    const hasCassette = isLoaded && !!activeMix; // In Zen mode, we assume 'loaded' means deck has cassette

    // Derived state for display
    const currentMixTitle = activeMix?.title || "No Cassette Loaded";
    const songName = currentSong ? decodeHtml(currentSong.name) : (activeMix ? "Ready to Play" : "NO CASSETTE");
    const artistName = currentSong ? decodeHtml(currentSong.primaryArtists || "") : (activeMix ? "Melora High Bias" : "");

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={containerRef} className="bg-[#fcfbf9] text-stone-800 h-screen overflow-hidden flex flex-col font-sans selection:bg-orange-500 selection:text-white relative">
            {/* Paper Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")` }}
            />

            <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 relative z-10 flex flex-col h-screen max-h-[1080px] w-full">
                {/* Header */}
                <header className="flex justify-between items-center mb-8 md:mb-12">
                    <div className="flex items-center gap-3">
                        {/* Logo */}
                        <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-white">
                            <div className="flex gap-0.5">
                                <div className="w-1 h-3 bg-white rounded-full"></div>
                                <div className="w-1 h-3 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-mono font-bold tracking-tighter text-stone-900 uppercase">Melora <span className="text-xs align-top text-orange-600">ZEN</span></h1>
                    </div>

                    <nav className="flex items-center gap-6">
                        <button onClick={onCinemaMode} className="hidden md:block font-mono text-sm tracking-widest uppercase hover:text-orange-600 transition-colors border-b border-transparent hover:border-orange-600 pb-1">
                            Cinema Mode
                        </button>
                        <button onClick={onCreateMix} className="font-mono text-sm tracking-widest uppercase hover:text-orange-600 transition-colors border-b border-transparent hover:border-orange-600 pb-1">
                            + Create Mix
                        </button>

                        <div className="flex gap-2 ml-4 border-l border-stone-200 pl-6">
                            {/* Theme Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                                    className="p-2 text-stone-400 hover:text-stone-800 transition-colors"
                                    title="Change Theme"
                                >
                                    <Palette size={20} />
                                </button>
                                {isThemeMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 bg-white border border-stone-200 rounded-lg shadow-xl py-2 min-w-[180px] z-50">
                                        {Object.entries(THEMES).map(([key, theme]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    onSelectTheme?.(key as ThemeKey);
                                                    setIsThemeMenuOpen(false);
                                                }}
                                                className={clsx(
                                                    "w-full px-4 py-2 text-left text-sm hover:bg-stone-50 transition-colors flex items-center gap-2 font-mono",
                                                    currentTheme === key ? "text-orange-600 bg-stone-50" : "text-stone-600"
                                                )}
                                            >
                                                {currentTheme === key && <span>✓</span>}
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={onOpenSettings} className="p-2 text-stone-400 hover:text-stone-800 transition-colors">
                                <Settings size={20} />
                            </button>
                        </div>
                    </nav>
                </header>

                <main className="grid lg:grid-cols-12 gap-12 lg:gap-24 flex-grow items-start pt-8 overflow-hidden h-full pb-8">
                    {/* Left Column: Now Playing & Up Next */}
                    <section className="lg:col-span-7 flex flex-col justify-start items-center lg:items-start perspective-1000 h-full overflow-hidden">
                        <div className="mb-8 opacity-60">
                            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-stone-500">Now Playing</h2>
                        </div>

                        {/* Large Cassette Display */}
                        {activeMix ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative w-full max-w-lg aspect-[3/2] transform hover:scale-[1.01] transition-transform duration-500 ease-out group cursor-default"
                            >
                                <div className="absolute inset-0 bg-stone-800 rounded-xl shadow-2xl overflow-hidden border-b-4 border-stone-900">
                                    {/* Glass/Plastic texture */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-10"></div>
                                    <div className="absolute top-0 left-0 right-0 h-1/6 bg-stone-700/50 border-b border-stone-900/30"></div>

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
                                            <div className="w-full border-b border-stone-300 absolute top-1/2 opacity-30"></div>
                                            <div className="w-full border-b border-stone-300 absolute top-1/3 opacity-30"></div>
                                            <div className="w-full border-b border-stone-300 absolute bottom-1/3 opacity-30"></div>
                                            <h3 className="font-hand text-2xl md:text-3xl text-stone-800 z-10 bg-[#F0EFEB] px-4 rotate-[-1deg] translate-y-[-2px] tracking-tight">
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
                                                {/* Tape visuals */}
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
                                    <button onClick={() => onOpenSearch?.(activeMix.id)} className="bg-orange-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={16} /></button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="w-full max-w-lg aspect-[3/2] bg-stone-200 rounded-xl flex items-center justify-center border-2 border-dashed border-stone-300 text-stone-400 font-mono text-sm tracking-widest uppercase">
                                No Mixtape Selected
                            </div>
                        )}

                        {/* Up Next List */}
                        <div className="mt-8 hidden lg:flex flex-col w-full max-w-lg pl-4 flex-grow overflow-y-auto [&::-webkit-scrollbar]:hidden -mr-4 pr-4">
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
                                            "group flex items-center justify-between text-sm cursor-pointer transition-colors border-b border-transparent hover:border-stone-200 pb-2",
                                            mix.id === activeMixId ? "text-orange-600 font-bold" : "text-stone-500 hover:text-stone-800"
                                        )}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={clsx("w-1.5 h-1.5 rounded-full transition-colors", mix.id === activeMixId ? "bg-orange-600 animate-pulse" : "bg-stone-300 group-hover:bg-orange-400")}></span>
                                            {mix.title}
                                        </span>
                                        <span className="font-mono text-xs opacity-50">{mix.songs.length} Songs</span>
                                    </li>
                                ))}
                                <li onClick={onCreateMix} className="flex items-center gap-3 text-sm text-stone-400 hover:text-orange-600 cursor-pointer pt-2 group">
                                    <Plus size={14} /> Create New Mix
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Right Column: Player */}
                    <section className="lg:col-span-5 w-full sticky top-12">
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl shadow-stone-200/50 transition-all border border-stone-100">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-stone-400">Stereo Cassette Player</h2>
                                <div className="flex gap-1 items-center">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", isLoaded ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide">{isLoaded ? "Ready" : "Empty"}</span>
                                </div>
                            </div>

                            {/* Player Screen */}
                            <div className="bg-stone-50 rounded-lg p-6 mb-8 border border-stone-200 h-32 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                                {isLoaded ? (
                                    <>
                                        <p className="font-mono text-sm text-stone-800 tracking-widest transition-colors cursor-default z-10 text-center truncate w-full px-4">
                                            {currentSong ? decodeHtml(currentSong.name) : activeMix?.title.toUpperCase()}
                                        </p>
                                        <p className="font-mono text-xs text-stone-400 mt-1 uppercase tracking-wider">{currentSong ? decodeHtml(currentSong.primaryArtists || "") : "Tape Loaded"}</p>
                                    </>
                                ) : (
                                    <p className="font-mono text-sm text-stone-400 tracking-widest group-hover:text-orange-600 transition-colors cursor-default">NO CASSETTE LOADED</p>
                                )}
                                {/* Scanlines */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='1' fill='rgba(0,0,0,0.2)'/%3E%3C/svg%3E")` }}></div>
                            </div>

                            {/* Time & Progress */}
                            <div className="flex justify-between items-end mb-4 font-mono text-xs text-stone-400">
                                <span>{formatTime(progress)}</span>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] tracking-widest uppercase">Tape A</span>
                                    <span>{formatTime(duration || 0)}</span>
                                </div>
                            </div>

                            <div
                                className="relative h-1 w-full bg-stone-200 rounded-full mb-12 overflow-hidden cursor-pointer group"
                                onClick={(e) => {
                                    if (duration && isLoaded) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = (e.clientX - rect.left) / rect.width;
                                        seek(percent * duration);
                                    }
                                }}
                            >
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-stone-800 group-hover:bg-orange-500 transition-colors"
                                    style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                                ></motion.div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-8 md:gap-12 mb-12">
                                <button onClick={() => { playClick(); prev(); }} className="p-4 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-50 transition-all duration-300 transform hover:scale-105">
                                    <SkipBack className="fill-current" size={24} />
                                </button>
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="p-6 rounded-full bg-stone-900 text-stone-50 shadow-soft hover:shadow-xl hover:bg-orange-600 transition-all duration-300 transform hover:scale-110 active:scale-95 group"
                                >
                                    {isPlaying ? <Pause className="fill-current" size={32} /> : <Play className="fill-current pl-1" size={32} />}
                                </button>
                                <button onClick={() => { playClick(); next(); }} className="p-4 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-50 transition-all duration-300 transform hover:scale-105">
                                    <SkipForward className="fill-current" size={24} />
                                </button>
                            </div>

                            {/* Footer Controls (Eject, Volume) */}
                            <div className="flex justify-between items-center pt-6 border-t border-stone-100">
                                <button
                                    onClick={() => { playEject(); loadMix(null as any); }} // Hacky way to unload, ideally loadMix accepts string|null
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-stone-400 hover:text-orange-600 transition-colors uppercase tracking-widest group"
                                >
                                    <LogOut size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                                    Eject
                                </button>

                                <div className="flex items-center gap-3 group cursor-pointer relative">
                                    <Volume2 size={18} className="text-stone-400 group-hover:text-stone-600" />
                                    <div className="w-20 h-1 bg-stone-200 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-stone-400 group-hover:bg-orange-500 transition-colors"
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
                    <div className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center mx-auto bg-[#fcfbf9] text-stone-300 font-mono text-xs font-bold">
                        N
                    </div>
                </footer>
            </div>
        </div>
    );
}
