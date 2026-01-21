"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Download, Share2, Palette, Smartphone, X, Settings, Plus, Maximize2, FileDown, Share as ShareIcon, Volume1, Moon, Sun, Camera, Pencil, Disc, Mic2 } from "lucide-react";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { Visualizer } from "@/components/ui/visualizer";
import { toPng } from 'html-to-image';
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { SlidersHorizontal } from "lucide-react";

interface ZenStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    // onSwitchToMobile prop removed
    onOpenSettings?: () => void;
    onEditMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onCreateMix?: () => void;
    onCinemaMode?: () => void;
    onOpenThemeSelector?: () => void;
    onSnapshotMix?: (mix: Mix) => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: Mix) => void;
}

export function ZenStage({ currentTheme, onThemeChange, onSelectTheme, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowQueue, onShareMix, onSnapshotMix }: ZenStageProps) {
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded, eq
    } = usePlayback();

    const { playClick, playClunk, playEject } = useAudio();
    // const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

    // Default to LIGHT mode as requested by user ("Zen Minimalist" implies light). 
    // In a real app, we might persist this or respect system pref.
    const [isDark, setIsDark] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);

    // Drag Logic Helpers
    const isDraggingRef = useRef(false);
    const handleDragStart = () => { isDraggingRef.current = true; };
    const handleDragEndAction = () => { setTimeout(() => { isDraggingRef.current = false; }, 50); };
    const handleClick = (callback: () => void) => { if (!isDraggingRef.current) callback(); };

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
        <div ref={containerRef} className="w-full h-screen font-sans overflow-hidden relative bg-[#0a0a0a] text-white selection:bg-white selection:text-black cursor-default"
        >
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Subtle gradient overlay for depth */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

            <div className="w-full h-full px-4 py-6 relative z-10 flex flex-col">
                {/* Header */}
                <header className="flex justify-between items-center mb-6 pointer-events-none shrink-0">
                    <motion.div
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-3 pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                        {/* Logo Icon */}
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20">
                            <div className="flex gap-0.5">
                                <div className="w-1 h-3 rounded-full bg-white"></div>
                                <div className="w-1 h-3 rounded-full bg-white"></div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase select-none">Melora <span className="text-xs align-top text-white/60">ZEN</span></h1>
                    </motion.div>

                    <motion.nav
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                        <button onClick={onCinemaMode} className="hidden md:block font-mono text-sm tracking-widest uppercase text-white/50 hover:text-white transition-colors border-b border-transparent hover:border-white/30 pb-1">
                            Cinema Mode
                        </button>
                        <button onClick={onCreateMix} className="font-mono text-sm tracking-widest uppercase text-white/50 hover:text-white transition-colors border-b border-transparent hover:border-white/30 pb-1">
                            + Create Mix
                        </button>

                        <div className="flex gap-4 ml-4 border-l border-white/10 pl-6">
                            {/* Theme Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => onOpenThemeSelector?.()}
                                    className="p-2 text-white/40 hover:text-white transition-colors"
                                    title="Change Theme"
                                >
                                    <Palette size={20} />
                                </button>
                            </div>

                            <button onClick={onOpenSettings} className="p-2 text-white/40 hover:text-white transition-colors">
                                <Settings size={20} />
                            </button>
                        </div>
                    </motion.nav>
                </header>

                <main className="grid lg:grid-cols-12 gap-8 flex-grow items-start h-full relative">
                    {/* Left Column: Grid of Mixtapes */}
                    <section className="lg:col-span-7 h-full flex flex-col relative z-50">
                        <motion.h2 drag dragConstraints={containerRef} className="font-mono text-xl uppercase tracking-widest mb-4 opacity-60 text-white pl-2 cursor-grab active:cursor-grabbing w-fit">Your Mixtapes</motion.h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                            {mixes.map((mix) => {
                                if (mix.id === activeMixId) return null;

                                return (
                                    <motion.div
                                        key={mix.id}
                                        layout
                                        drag
                                        dragConstraints={containerRef}
                                        dragElastic={0.2}
                                        dragMomentum
                                        onDragStart={handleDragStart}
                                        onDragEnd={(e, info) => {
                                            handleDragEndAction();
                                            // Check drop on player
                                            if (playerRef.current) {
                                                const rect = playerRef.current.getBoundingClientRect();
                                                const x = info.point.x;
                                                const y = info.point.y;
                                                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                                                    playClunk();
                                                    loadMix(mix.id);
                                                }
                                            }
                                        }}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05, zIndex: 50, transition: { duration: 0.2 } }}
                                        whileDrag={{ scale: 1.1, zIndex: 100, rotate: 2, cursor: "grabbing" }}
                                        onClick={() => handleClick(() => {
                                            playClunk();
                                            loadMix(mix.id);
                                        })}
                                        className="group relative w-full aspect-[3/2] bg-[#111] rounded-lg shadow-lg border border-white/10 p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-visible z-0"
                                    >
                                        {/* Screws */}
                                        <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-white/10 flex items-center justify-center"><div className="w-1 h-[0.5px] bg-white/30 rotate-45"></div></div>
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/10 flex items-center justify-center"><div className="w-1 h-[0.5px] bg-white/30 rotate-45"></div></div>
                                        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-white/10 flex items-center justify-center"><div className="w-1 h-[0.5px] bg-white/30 rotate-45"></div></div>
                                        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-white/10 flex items-center justify-center"><div className="w-1 h-[0.5px] bg-white/30 rotate-45"></div></div>

                                        {/* Label */}
                                        <div className="relative bg-white mx-1 mt-1 h-3/5 rounded-sm shadow-sm p-1 transform rotate-0 group-hover:rotate-[0.5deg] transition-transform duration-500 flex flex-col justify-center items-center overflow-hidden z-10">
                                            <div className="absolute top-1 left-1 font-mono font-bold text-black text-xs opacity-60">A</div>
                                            <h3 className="font-hand font-bold text-sm text-black tracking-tight text-center line-clamp-2 w-full px-1">
                                                {mix.title}
                                            </h3>
                                            <p className="font-mono text-[8px] text-black/40 absolute bottom-1 uppercase tracking-widest">Melora High Bias</p>
                                        </div>

                                        {/* Reels */}
                                        <div className="mx-2 mb-1 h-8 bg-white/5 rounded-full flex items-center justify-between px-2 relative border border-white/5">
                                            {/* Left Reel */}
                                            <div className="w-6 h-6 bg-transparent rounded-full border-2 border-white/40 flex items-center justify-center relative group-hover:rotate-180 transition-transform duration-700">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                <div className="absolute inset-0 border border-white/20 rounded-full border-dashed"></div>
                                            </div>

                                            <div className="flex-grow h-3 mx-1 flex items-center justify-center">
                                                <span className="text-[5px] text-white/30 font-mono">TYPE I</span>
                                            </div>

                                            {/* Right Reel */}
                                            <div className="w-6 h-6 bg-transparent rounded-full border-2 border-white/40 flex items-center justify-center relative group-hover:rotate-180 transition-transform duration-700">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                <div className="absolute inset-0 border border-white/20 rounded-full border-dashed"></div>
                                            </div>
                                        </div>

                                        {/* Song Count Badge */}
                                        <div className="absolute -right-1 top-2/3 bg-white text-black text-[8px] font-bold py-0.5 px-1.5 rounded-l-sm shadow-md">
                                            {mix.songs.length} SONGS
                                        </div>

                                        {/* Action Buttons (Edit/Snapshot/Share/Add) */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => onEditMix?.(mix)} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Edit"><Pencil size={10} className="text-black" /></button>
                                            <button onClick={() => onSnapshotMix?.(mix)} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Snapshot"><Camera size={10} className="text-black" /></button>
                                            <button onClick={() => onShareMix?.(mix)} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Share"><Share2 size={10} className="text-black" /></button>
                                            <button onClick={() => onOpenSearch?.(mix.id)} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Add Songs"><Plus size={10} className="text-black" /></button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div
                                onClick={onCreateMix}
                                className="w-full aspect-[3/2] rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group gap-2"
                            >
                                <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <Plus className="text-white/40 group-hover:text-white" />
                                </div>
                                <span className="font-mono text-xs text-white/40 group-hover:text-white uppercase tracking-widest">Create Mix</span>
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Player - Sticky & Compact like Metal Theme */}
                    {/* Right Column: Player - Sticky & Draggable */}
                    <motion.section
                        ref={playerRef}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={false}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEndAction}
                        dragElastic={0.1}
                        className="lg:col-span-5 w-full flex justify-center sticky top-8 h-fit z-40 cursor-grab active:cursor-grabbing"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="bg-[#0a0a0a] w-full max-w-[340px] p-5 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl">
                            {/* Decorative Screws */}
                            <div className="absolute top-4 left-4 text-white/10"><Plus size={14} /></div>
                            <div className="absolute top-4 right-4 text-white/10"><Plus size={14} /></div>
                            <div className="absolute bottom-4 left-4 text-white/10"><Plus size={14} /></div>
                            <div className="absolute bottom-4 right-4 text-white/10"><Plus size={14} /></div>

                            <div className="flex justify-between items-center mb-6 px-4">
                                <h2 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-white/40 text-center w-full">Stereo Cassette Player</h2>
                            </div>

                            {/* Player Screen / Window - Shows Cassette Inside */}
                            <div className="bg-black/50 w-full aspect-[16/9] rounded-lg shadow-inner relative mb-4 border border-white/10 flex items-center justify-center overflow-hidden group">
                                {/* Glass Reflections */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20"></div>

                                {isLoaded && activeMix ? (
                                    <motion.div
                                        className="w-[95%] h-[92%] rounded-md bg-[#111] border border-white/10 p-1.5 flex flex-col justify-between relative z-10 shadow-xl"
                                    >
                                        {/* Tape Label Area */}
                                        <div className="relative bg-white mx-1 mt-0.5 h-16 rounded-sm shadow-sm p-1 flex flex-col justify-center items-center z-10">
                                            <span className="absolute top-1 left-1 font-mono font-bold text-black text-[9px] opacity-60">A</span>
                                            <h3 className="font-hand font-bold text-sm text-black tracking-tight text-center line-clamp-1 w-full px-2 truncate">
                                                {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                            </h3>
                                            <p className="font-mono text-[7px] text-black/40 absolute bottom-0.5 uppercase tracking-widest">Melora High Bias</p>
                                        </div>

                                        {/* Reels Area */}
                                        <div className="mx-3 mb-0.5 h-6 bg-white/5 rounded-full flex items-center justify-between px-2 relative">
                                            {/* Left Reel */}
                                            <motion.div
                                                className="w-6 h-6 bg-transparent rounded-full border-2 border-white/60 flex items-center justify-center relative"
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            >
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                <div className="absolute inset-0 border border-white/20 rounded-full border-dashed"></div>
                                            </motion.div>

                                            {/* Bridge */}
                                            <div className="h-2 flex-grow mx-2 bg-black border border-white/10 relative overflow-hidden opacity-50"></div>

                                            {/* Right Reel */}
                                            <motion.div
                                                className="w-6 h-6 bg-transparent rounded-full border-2 border-white/60 flex items-center justify-center relative"
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            >
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                <div className="absolute inset-0 border border-white/20 rounded-full border-dashed"></div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <p className="font-mono text-white/30 text-xs tracking-widest">NO CASSETTE</p>
                                )}
                            </div>

                            {/* Digital Display */}
                            <div className="bg-[#111] h-8 w-full rounded border border-white/10 flex items-center px-3 mb-4 shadow-inner">
                                <span className="font-mono text-white/80 text-xs tracking-wider truncate">
                                    {currentSong ? `▶ ${decodeHtml(currentSong.name)}` : "READY"}
                                </span>
                            </div>

                            {/* Visualizer */}
                            <Visualizer isPlaying={isPlaying} accentColor="#ffffff" className="w-full h-8 rounded mb-4 opacity-50" />

                            {/* Time & Progress */}
                            <div className="mb-6 px-1">
                                <div className="flex justify-between text-[10px] font-mono text-white/40 mb-1">
                                    <span>{formatTime(progress * duration)}</span>
                                    <span>{formatTime(duration || 0)}</span>
                                </div>
                                <div
                                    className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
                                    onClick={(e) => {
                                        if (duration && isLoaded) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            seek(percent);
                                        }
                                    }}
                                >
                                    <motion.div
                                        className="h-full bg-white group-hover:bg-white/80 transition-colors"
                                        style={{ width: `${progress * 100}%` }}
                                    ></motion.div>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center justify-center gap-6 mb-8">
                                <button onClick={() => handleClick(() => { playClick(); prev(); })} className="p-3 text-white/40 hover:text-white transition-colors">
                                    <SkipBack size={20} className="fill-current" />
                                </button>
                                <button
                                    onClick={() => handleClick(() => { playClick(); togglePlay(); })}
                                    className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current pl-1" />}
                                </button>
                                <button onClick={() => handleClick(() => { playClick(); next(); })} className="p-3 text-white/40 hover:text-white transition-colors">
                                    <SkipForward size={20} className="fill-current" />
                                </button>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleClick(() => { playEject(); loadMix(null as any); })}
                                        className="flex items-center gap-2 text-[10px] font-mono font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest"
                                    >
                                        <LogOut size={12} /> Eject
                                    </button>

                                    <button
                                        onClick={() => setShowLyrics(prev => !prev)}
                                        className={`flex items-center gap-2 text-[10px] font-mono font-bold transition-colors uppercase tracking-widest ${showLyrics ? 'text-white' : 'text-white/30 hover:text-white'}`}
                                    >
                                        <Mic2 size={12} /> Lyrics
                                    </button>

                                    <button
                                        onClick={() => setShowEq(prev => !prev)}
                                        className={`flex items-center gap-2 text-[10px] font-mono font-bold transition-colors uppercase tracking-widest ${showEq ? 'text-white' : 'text-white/30 hover:text-white'}`}
                                    >
                                        <SlidersHorizontal size={12} /> EQ
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 group cursor-pointer relative" onPointerDown={(e) => e.stopPropagation()}>
                                    <Volume2 size={14} className="text-white/30 group-hover:text-white" />
                                    <div className="w-16 h-1 bg-white/10 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-white/50 group-hover:bg-white transition-colors"
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
                    </motion.section>

                    <AnimatePresence>
                        {showLyrics && (
                            <LyricsView
                                currentSong={currentSong}
                                currentTime={progress * duration}
                                onClose={() => setShowLyrics(false)}
                            />
                        )}
                        {showEq && (
                            <EqualizerView
                                onClose={() => setShowEq(false)}
                                bands={eq.bands}
                                setBand={eq.setBand}
                                isEnabled={eq.isEnabled}
                                setIsEnabled={eq.setIsEnabled}
                                currentPreset={eq.currentPreset}
                                setPreset={eq.setPreset}
                                presets={eq.presets}
                            />
                        )}
                    </AnimatePresence>
                </main>

                <footer className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center mx-auto bg-white/5 text-white/30 font-mono text-xs font-bold">
                        N
                    </div>
                </footer>
            </div>
        </div>
    );
}
