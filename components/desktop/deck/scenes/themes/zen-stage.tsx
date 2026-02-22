"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Share2, Palette, Settings, Plus, Camera, Pencil, Mic2, SlidersHorizontal, Sun, Moon, ListMusic, Shuffle, Repeat } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { Visualizer } from "@/components/ui/visualizer";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { QualityBadge } from "@/components/shared/QualityBadge";import { useAudioProgress } from "@/hooks/use-audio-progress";


interface ZenStageProps {
    currentTheme?: ThemeKey; // Made optional as unused
    onThemeChange?: () => void; // Made optional
    onSelectTheme?: (theme: ThemeKey) => void;
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

export function ZenStage({
    // currentTheme, // Unused
    // onThemeChange, // Unused
    // onSelectTheme, // Unused
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    // onShowQueue, // Unused
    onShareMix,
    onSnapshotMix
}: ZenStageProps) { const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cache player rect for drag target detection
    const playerRectRef = useRef<DOMRect | null>(null);

    const { activeMixId, isPlaying, currentSong, currentTrack, volume, duration, loadMix, togglePlay, next, prev, seek, setVolume, isLoaded, eq, activeQuality, shuffle, setShuffle, repeat, setRepeat } = usePlayback();
    const { mixes, isDownloaded } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playClunk, playEject } = useAudio();

    // Zen Mode Persistence - Run once
    const [isDark, setIsDark] = useState(true);
    useEffect(() => {
        const savedMode = localStorage.getItem('melora-zen-mode');
        if (savedMode) {
            setIsDark(savedMode === 'dark');
        }
    }, []);

    const toggleZenMode = useCallback(() => {
        const newMode = !isDark;
        setIsDark(newMode);
        localStorage.setItem('melora-zen-mode', newMode ? 'dark' : 'light');
        playClick();
    }, [isDark, playClick]);

    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    // Drag Logic Helpers
    const isDraggingRef = useRef(false);

    const handleDragStart = useCallback((e: PointerEvent | MouseEvent | TouchEvent | React.PointerEvent) => {
        isDraggingRef.current = true;
        // Capture player rect for hit testing once at start
        if (playerRef.current) {
            playerRectRef.current = playerRef.current.getBoundingClientRect();
        }
    }, []);

    const handleDragEnd = useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, mixId: string) => {
        // Use standard timeout for click-prevention, but safer
        setTimeout(() => { isDraggingRef.current = false; }, 50);

        // Check drop on player using CACHED rect
        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            const pt = info.point;
            if (pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom) {
                playClunk();
                loadMix(mixId);
            }
        }
    }, [playClunk, loadMix]);

    const handleClick = useCallback((callback: () => void) => {
        if (!isDraggingRef.current) callback();
    }, []);

    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Format time with Guards
    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const safeDuration = duration > 0 ? duration : 0;
    const safeProgress = Number.isFinite(progress) ? progress : 0;

    return (
        <div ref={containerRef} className={clsx(
            "w-full h-screen font-sans overflow-hidden relative transition-colors duration-500 cursor-default",
            isDark ? "bg-[#0a0a0a] text-white selection:bg-white selection:text-black" : "bg-[#f4f4f5] text-black selection:bg-black selection:text-white"
        )}
        >
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {/* Subtle gradient overlay for depth */}
            <div className={clsx("fixed inset-0 pointer-events-none z-0 bg-gradient-to-br transition-colors duration-500",
                isDark ? "from-white/[0.02] via-transparent to-transparent" : "from-black/[0.02] via-transparent to-transparent"
            )} />

            <div className="w-full h-full px-4 py-6 relative z-10 flex flex-col">
                {/* Header */}
                <header className="flex justify-between items-center mb-6 pointer-events-none shrink-0">
                    <motion.div
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-3 pointer-events-auto cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <h1 className={clsx("text-3xl tracking-normal select-none transition-colors",
                            "font-['Pacifico']",
                            isDark ? "text-white" : "text-black"
                        )}>Melora Tunes</h1>
                    </motion.div>

                    <motion.nav
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={onCinemaMode} className={clsx("hidden md:block font-mono text-sm tracking-widest uppercase transition-colors border-b border-transparent pb-1",
                            isDark ? "text-white/50 hover:text-white hover:border-white/30" : "text-black/50 hover:text-black hover:border-black/30"
                        )}>
                            Cinema Mode
                        </button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsRackOpen(true)} className={clsx("font-mono text-sm tracking-widest uppercase transition-colors border-b border-transparent pb-1 flex items-center gap-2",
                            isDark ? "text-white/50 hover:text-white hover:border-white/30" : "text-black/50 hover:text-black hover:border-black/30"
                        )}>
                            <ListMusic size={14} /> Rack
                        </button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={onCreateMix} className={clsx("font-mono text-sm tracking-widest uppercase transition-colors border-b border-transparent pb-1",
                            isDark ? "text-white/50 hover:text-white hover:border-white/30" : "text-black/50 hover:text-black hover:border-black/30"
                        )}>
                            + Create Mix
                        </button>

                        <div className={clsx("flex gap-4 ml-4 border-l pl-6 transition-colors", isDark ? "border-white/10" : "border-black/10")}>
                            {/* Theme Dropdown */}
                            <div className="relative">
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => onOpenThemeSelector?.()}
                                    className={clsx("p-2 transition-colors", isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")}
                                    title="Change Theme"
                                >
                                    <Palette size={20} />
                                </button>
                            </div>

                            {/* Dark/Light Toggle */}
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={toggleZenMode}
                                className={clsx("p-2 transition-colors", isDark ? "text-white/40 hover:text-yellow-300" : "text-black/40 hover:text-purple-600")}
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={onOpenSettings}
                                className={clsx("p-2 transition-colors", isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")}
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </motion.nav>
                </header>

                <main className="grid lg:grid-cols-12 gap-4 flex-grow items-start h-full relative">
                    {/* Left Column: Grid of Mixtapes */}
                    <section className="lg:col-span-7 h-full flex flex-col relative z-50">
                        <motion.h2 drag dragConstraints={containerRef} className={clsx("font-mono text-xl uppercase tracking-widest mb-4 opacity-60 pl-2 cursor-grab active:cursor-grabbing w-fit transition-colors",
                            isDark ? "text-white" : "text-black"
                        )}>Your Mixtapes</motion.h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                            {mixes
                                .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                                .map((mix) => {
                                    if (mix.id === activeMixId) return null;

                                    // Color Logic
                                    const cassetteColors: Record<string, string> = {
                                        // Zen is monochrome/minimal.
                                        purple: "bg-zinc-900",
                                        orange: "bg-zinc-900",
                                        green: "bg-zinc-900",
                                        red: "bg-zinc-900",
                                        white: "bg-zinc-200",
                                        blue: "bg-zinc-900",
                                        yellow: "bg-zinc-900",
                                        cyan: "bg-zinc-900",
                                        pink: "bg-zinc-900",
                                        black: "bg-zinc-900"
                                    };

                                    // Zen Aesthetic: Ignore mix color for body, enforce theme monochrome
                                    // But keep mix.color for accents if we want (currently not used much)
                                    // Effectively: Dark Mode -> Zinc 900, Light Mode -> Zinc 200

                                    const effectiveColor = mix.color || 'black';
                                    const colorClass = isDark ? "bg-zinc-900" : "bg-zinc-200";
                                    const isDarkCassette = isDark; // In dark mode, tapes are dark. In light mode, tapes are light.

                                    return (
                                        <motion.div
                                            key={mix.id}
                                            layout
                                            drag
                                            dragConstraints={containerRef}
                                            dragElastic={0.2}
                                            dragMomentum
                                            onDragStart={handleDragStart}
                                            onDragEnd={(e, info) => handleDragEnd(e, info, mix.id)}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05, zIndex: 50, transition: { duration: 0.2 } }}
                                            whileDrag={{ scale: 1.1, zIndex: 100, rotate: 2, cursor: "grabbing" }}
                                            onClick={() => handleClick(() => {
                                                playClunk();
                                                loadMix(mix.id);
                                            })}
                                            className={clsx("group relative w-full aspect-[3/2] rounded-lg shadow-lg border p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-visible z-0 transition-colors",
                                                colorClass,
                                                isDarkCassette ? "border-white/10" : "border-black/10 shadow-xl"
                                            )}
                                        >
                                            {/* Screws */}
                                            <div className={clsx("absolute top-2 left-2 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}><div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")}></div></div>
                                            <div className={clsx("absolute top-2 right-2 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}><div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")}></div></div>
                                            <div className={clsx("absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}><div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")}></div></div>
                                            <div className={clsx("absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}><div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")}></div></div>

                                            {/* Label */}
                                            <div className={clsx("relative mx-1 mt-1 h-3/5 rounded-sm shadow-sm p-1 transform rotate-0 group-hover:rotate-[0.5deg] transition-all duration-500 flex flex-col justify-center items-center overflow-hidden z-10",
                                                isDark ? "bg-white" : "bg-zinc-100 border border-zinc-200"
                                            )}>
                                                <div className="absolute top-1 left-1 font-mono font-bold text-black text-xs opacity-60">A</div>
                                                <h3 className="font-hand font-bold text-sm text-black tracking-tight text-center line-clamp-2 w-full px-1">
                                                    {mix.title}
                                                </h3>
                                                <p className="font-mono text-[8px] text-black/40 absolute bottom-1 uppercase tracking-widest">Melora High Bias</p>
                                            </div>

                                            {/* Reels */}
                                            <div className={clsx("mx-2 mb-1 h-8 rounded-full flex items-center justify-between px-2 relative border",
                                                isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
                                            )}>
                                                {/* Left Reel */}
                                                <div className={clsx("w-6 h-6 bg-transparent rounded-full border-2 flex items-center justify-center relative group-hover:rotate-180 transition-transform duration-700",
                                                    isDark ? "border-white/40" : "border-black/40"
                                                )}>
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", isDark ? "bg-white" : "bg-black")}></div>
                                                    <div className={clsx("absolute inset-0 border rounded-full border-dashed", isDark ? "border-white/20" : "border-black/20")}></div>
                                                </div>

                                                <div className="flex-grow h-3 mx-1 flex items-center justify-center">
                                                    <span className={clsx("text-[5px] font-mono", isDark ? "text-white/30" : "text-black/30")}>TYPE I</span>
                                                </div>

                                                {/* Right Reel */}
                                                <div className={clsx("w-6 h-6 bg-transparent rounded-full border-2 flex items-center justify-center relative group-hover:rotate-180 transition-transform duration-700",
                                                    isDark ? "border-white/40" : "border-black/40"
                                                )}>
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", isDark ? "bg-white" : "bg-black")}></div>
                                                    <div className={clsx("absolute inset-0 border rounded-full border-dashed", isDark ? "border-white/20" : "border-black/20")}></div>
                                                </div>
                                            </div>

                                            {/* Song Count Badge */}
                                            <div className={clsx("absolute -right-1 top-2/3 text-[8px] font-bold py-0.5 px-1.5 rounded-l-sm shadow-md",
                                                isDark ? "bg-white text-black" : "bg-black text-white"
                                            )}>
                                                {mix.songs.length} SONGS
                                            </div>

                                            {/* Action Buttons (Edit/Snapshot/Share/Add) */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Edit"><Pencil size={10} className="text-black" /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Snapshot"><Camera size={10} className="text-black" /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Share"><Share2 size={10} className="text-black" /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1 bg-white rounded-full shadow hover:scale-110 transition-transform" title="Add Songs"><Plus size={10} className="text-black" /></button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            <div
                                onClick={onCreateMix}
                                className={clsx("w-full aspect-[3/2] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group gap-2",
                                    isDark ? "border-white/10 hover:border-white/30 hover:bg-white/5" : "border-black/10 hover:border-black/30 hover:bg-black/5"
                                )}
                            >
                                <div className={clsx("p-3 rounded-full transition-colors", isDark ? "bg-white/5 group-hover:bg-white/10" : "bg-black/5 group-hover:bg-black/10")}>
                                    <Plus className={clsx("transition-colors", isDark ? "text-white/40 group-hover:text-white" : "text-black/40 group-hover:text-black")} />
                                </div>
                                <span className={clsx("font-mono text-xs uppercase tracking-widest transition-colors", isDark ? "text-white/40 group-hover:text-white" : "text-black/40 group-hover:text-black")}>Create Mix</span>
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Player - Sticky & Draggable */}
                    <motion.section
                        ref={playerRef}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={false}
                        onDragStart={handleDragStart}
                        dragElastic={0.1}
                        className="lg:col-span-5 w-full flex justify-center sticky top-8 h-fit z-40 cursor-grab active:cursor-grabbing"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className={clsx("w-full max-w-[340px] p-5 rounded-2xl shadow-2xl border relative overflow-hidden backdrop-blur-xl transition-colors",
                            isDark ? "bg-[#0a0a0a] border-white/10" : "bg-white border-black/10 text-black shadow-zinc-300"
                        )}>
                            {/* Decorative Screws */}
                            <div className={clsx("absolute top-4 left-4", isDark ? "text-white/10" : "text-black/10")}><Plus size={14} /></div>
                            <div className={clsx("absolute top-4 right-4", isDark ? "text-white/10" : "text-black/10")}><Plus size={14} /></div>
                            <div className={clsx("absolute bottom-4 left-4", isDark ? "text-white/10" : "text-black/10")}><Plus size={14} /></div>
                            <div className={clsx("absolute bottom-4 right-4", isDark ? "text-white/10" : "text-black/10")}><Plus size={14} /></div>

                            <div className="flex justify-between items-center mb-6 px-4">
                                <h2 className={clsx("font-mono text-xs font-bold tracking-[0.2em] uppercase text-center w-full",
                                    isDark ? "text-white/40" : "text-black/40"
                                )}>Stereo Cassette Player</h2>
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
                            <div className={clsx("h-8 w-full rounded border flex items-center px-3 mb-4 shadow-inner transition-colors overflow-hidden whitespace-nowrap",
                                isDark ? "bg-[#111] border-white/10" : "bg-zinc-100 border-black/10"
                            )}>
                                <span className={clsx("font-mono text-xs tracking-wider truncate flex-1 min-w-0 flex items-center gap-2", isDark ? "text-white/80" : "text-black/80")}>
                                    {currentSong ? (
                                        <>
                                            {isDownloaded(currentTrack?.id || currentSong.id) && <span className={clsx("px-1 rounded text-[9px]", isDark ? "bg-white/10" : "bg-black/10")}>OFFLINE</span>}
                                            <span className="truncate">▶ {decodeHtml(currentSong.name)}</span>
                                        </>
                                    ) : "READY"}
                                </span>
                                {/* LCD Quality Badge */}
                                {activeQuality && <QualityBadge quality={activeQuality} variant="mini" className="ml-2 shrink-0" />}
                            </div>

                            {/* Visualizer - Render only if loaded for perf, or opacity handled */}
                            {isLoaded && <Visualizer isPlaying={isPlaying} accentColor={isDark ? "#ffffff" : "#000000"} className="w-full h-8 rounded mb-4 opacity-50" />}
                            {!isLoaded && <div className="w-full h-8 rounded mb-4 opacity-10 bg-current"></div>}

                            {/* Time & Progress */}
                            <div className="mb-6 px-1">
                                <div className={clsx("flex justify-between text-[10px] font-mono mb-1", isDark ? "text-white/40" : "text-black/40")}>
                                    <span>{formatTime(safeProgress * safeDuration)}</span>
                                    <span>{formatTime(safeDuration || 0)}</span>
                                </div>
                                <div
                                    className={clsx("h-1 rounded-full overflow-hidden cursor-pointer group", isDark ? "bg-white/10" : "bg-black/10")}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        if (safeDuration && isLoaded) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            seek(Math.min(Math.max(percent, 0), 1));
                                        }
                                    }}
                                >
                                    <motion.div
                                        className={clsx("h-full transition-colors", isDark ? "bg-white group-hover:bg-white/80" : "bg-black group-hover:bg-black/80")}
                                        style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
                                    ></motion.div>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex items-center justify-center gap-6 mb-8">
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleClick(() => { playClick(); setShuffle(!shuffle); })} className={clsx("p-2 transition-colors", shuffle ? (isDark ? "text-white" : "text-black") : (isDark ? "text-white/25 hover:text-white/50" : "text-black/25 hover:text-black/50"))} title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}>
                                    <Shuffle size={16} />
                                </button>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleClick(() => { playClick(); prev(); })} className={clsx("p-3 transition-colors", isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")}>
                                    <SkipBack size={20} className="fill-current" />
                                </button>
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); togglePlay(); })}
                                    className={clsx("w-14 h-14 flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg",
                                        isDark ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.1)]"
                                    )}
                                >
                                    {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current pl-1" />}
                                </button>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleClick(() => { playClick(); next(); })} className={clsx("p-3 transition-colors", isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")}>
                                    <SkipForward size={20} className="fill-current" />
                                </button>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleClick(() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); })} className={clsx("p-2 transition-colors relative", repeat !== 'off' ? (isDark ? "text-white" : "text-black") : (isDark ? "text-white/25 hover:text-white/50" : "text-black/25 hover:text-black/50"))} title={`Repeat: ${repeat.toUpperCase()}`}>
                                    <Repeat size={16} />{repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold">1</span>}
                                </button>
                            </div>

                            <div className={clsx("flex justify-between items-center pt-4 border-t", isDark ? "border-white/5" : "border-black/5")}>
                                <div className="flex items-center gap-4">
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => handleClick(() => { playEject(); loadMix(""); })}
                                        className={clsx("flex items-center gap-2 text-[10px] font-mono font-bold transition-colors uppercase tracking-widest",
                                            isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black"
                                        )}
                                    >
                                        <LogOut size={12} /> Eject
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => {
                                            if (!showLyrics) setShowEq(false);
                                            setShowLyrics(prev => !prev);
                                        }}
                                        className={clsx("flex items-center gap-2 text-[10px] font-mono font-bold transition-colors uppercase tracking-widest",
                                            showLyrics ? (isDark ? "text-white" : "text-black") : (isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black")
                                        )}
                                    >
                                        <Mic2 size={12} /> Lyrics
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => {
                                            if (!showEq) setShowLyrics(false);
                                            setShowEq(prev => !prev);
                                        }}
                                        className={clsx("flex items-center gap-2 text-[10px] font-mono font-bold transition-colors uppercase tracking-widest",
                                            showEq ? (isDark ? "text-white" : "text-black") : (isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black")
                                        )}
                                    >
                                        <SlidersHorizontal size={12} /> EQ
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 group cursor-pointer relative" onPointerDown={(e) => e.stopPropagation()}>
                                    <Volume2 size={14} className={clsx("transition-colors", isDark ? "text-white/30 group-hover:text-white" : "text-black/30 group-hover:text-black")} />
                                    <div className={clsx("w-16 h-1 rounded-full relative overflow-hidden", isDark ? "bg-white/10" : "bg-black/10")}>
                                        <div
                                            className={clsx("absolute left-0 top-0 bottom-0 transition-colors", isDark ? "bg-white/50 group-hover:bg-white" : "bg-black/50 group-hover:bg-black")}
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

                    {/* Overlays - High Z-Index */}
                    <AnimatePresence>
                        {showLyrics && (
                            <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                                <div className="pointer-events-auto w-full h-full max-w-2xl max-h-[80vh]">
                                    <LyricsView
                                        currentSong={currentSong}
                                        currentTime={progress * duration}
                                        onClose={() => setShowLyrics(false)}
                                    />
                                </div>
                            </div>
                        )}
                        {showEq && (
                            <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                                <div className="pointer-events-auto">
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
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </main>

                <footer className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    {/* Footer Content */}
                </footer>
            </div>


            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div >
    );
}
