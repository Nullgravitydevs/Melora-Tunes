"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, LogOut,
    Palette, Smartphone, Settings, Pencil, Camera, Search, Share2, Plus
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal } from "lucide-react";

interface OpenDeckStageProps {
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

export function OpenDeckStage({
    currentTheme,
    onThemeChange,
    onSelectTheme,
    // onSwitchToMobile removed
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onSnapshotMix,
    onShowQueue,
    onShareMix
}: OpenDeckStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const [isOverPlayer, setIsOverPlayer] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);
    const [draggingMix, setDraggingMix] = useState<{ mix: Mix, index: number } | null>(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);

    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, togglePlay, next, prev, setVolume, isLoaded, seek, eq
    } = usePlayback();

    const { playClick, playEject, playClunk, playInsert } = useAudio();
    const activeMix = mixes.find(m => m.id === activeMixId) || null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const cassetteStyles = [
        { bg: "from-[#e2e8f0] to-[#94a3b8]", text: "text-slate-700", reelBorder: "border-slate-400" },
        { bg: "from-[#1e293b] to-[#0f172a]", text: "text-slate-300", reelBorder: "border-slate-600" },
        { bg: "from-[#2d8652] to-[#14532d]", text: "text-emerald-100", reelBorder: "border-emerald-700" },
    ];

    const getStyleForMix = (index: number) => cassetteStyles[index % cassetteStyles.length];

    const handleDragStart = (mix: Mix, index: number, e: React.PointerEvent) => {
        setDraggingMix({ mix, index });
        setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleDragMove = (e: React.PointerEvent) => {
        if (draggingMix) {
            setDragPosition({ x: e.clientX, y: e.clientY });
            if (playerRef.current) {
                const rect = playerRef.current.getBoundingClientRect();
                const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom;
                setIsOverPlayer(isOver);
            }
        }
    };

    const handleDragEnd = () => {
        if (draggingMix && isOverPlayer) {
            playInsert();
            loadMix(draggingMix.mix.id);
        }
        setDraggingMix(null);
        setDragPosition(null);
        setIsOverPlayer(false);
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-screen font-sans overflow-hidden relative flex flex-col [&::-webkit-scrollbar]:hidden"
            style={{ backgroundColor: '#f6f5f4', fontFamily: 'Manrope, sans-serif' }}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
        >
            {/* Hide all scrollbars globally - Handled by utility now */}

            {/* Grainy Texture */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")` }} />

            {/* Header - Fixed height */}
            <header className="flex items-center justify-between px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-5 text-[#2d8652]">
                        <svg fill="none" viewBox="0 0 48 48"><path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor" /></svg>
                    </div>
                    <h2 className="text-[#101814] text-base font-bold tracking-tight uppercase">Melora</h2>
                </div>
                <div className="flex items-center gap-4">
                    <nav className="hidden md:flex items-center gap-5">
                        <button onClick={onCinemaMode} className="text-[#101814] text-[10px] font-semibold tracking-widest uppercase hover:text-[#2d8652]">Cinema Mode</button>
                        <button onClick={onCreateMix} className="text-[#101814] text-[10px] font-semibold tracking-widest uppercase hover:text-[#2d8652]">+ Create Mix</button>
                    </nav>
                    <div className="flex gap-2">
                        {/* Switch Mobile Removed */}
                        <button onClick={onOpenThemeSelector} className="flex size-8 items-center justify-center rounded-full bg-white border border-neutral-200 hover:bg-[#2d8652]/10"><Palette size={14} className="text-neutral-600" /></button>
                        <button onClick={onOpenSettings} className="flex size-8 items-center justify-center rounded-full bg-white border border-neutral-200 hover:bg-[#2d8652]/10"><Settings size={14} className="text-neutral-600" /></button>
                        <button onClick={() => setShowLyrics(prev => !prev)} className={`flex size-8 items-center justify-center rounded-full border border-neutral-200 transition-colors ${showLyrics ? 'bg-[#2d8652] text-white border-[#2d8652]' : 'bg-white text-neutral-600 hover:bg-[#2d8652]/10'}`}><Mic2 size={14} /></button>
                        <button onClick={() => setShowEq(prev => !prev)} className={`flex size-8 items-center justify-center rounded-full border border-neutral-200 transition-colors ${showEq ? 'bg-[#2d8652] text-white border-[#2d8652]' : 'bg-white text-neutral-600 hover:bg-[#2d8652]/10'}`}><SlidersHorizontal size={14} /></button>
                    </div>
                </div>
            </header>

            {/* Main Grid - Takes remaining space */}
            <main className="flex-1 grid grid-cols-12 px-6 pb-4 gap-4 min-h-0">

                {/* Left: Cassettes - SCROLLABLE */}
                <div className="col-span-3 flex flex-col min-h-0">
                    <div className="mb-3 shrink-0">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-[#2d8652]/60 uppercase">Selection</p>
                        <div className="h-px w-10 bg-[#2d8652]/20 mt-1" />
                    </div>
                    {/* Scrollable cassette list */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="flex flex-col gap-4 pb-4">
                            {mixes.map((mix, index) => {
                                const style = getStyleForMix(index);
                                const isInsidePlayer = isLoaded && activeMixId === mix.id;
                                const isDragging = draggingMix?.mix.id === mix.id;

                                return (
                                    <div
                                        key={mix.id}
                                        onPointerDown={(e) => { if (!isInsidePlayer) handleDragStart(mix, index, e); }}
                                        onClick={() => { if (!isInsidePlayer && !draggingMix) { playClick(); loadMix(mix.id); } }}
                                        className={clsx(
                                            "select-none shrink-0",
                                            isInsidePlayer ? "opacity-40 cursor-default" : "cursor-grab",
                                            isDragging && "opacity-20"
                                        )}
                                    >
                                        <div className={`w-36 h-24 bg-gradient-to-br ${style.bg} rounded shadow-lg relative overflow-hidden`}>
                                            <div className="absolute inset-1 flex items-center justify-center">
                                                <div className="w-full h-5 bg-black/20 flex justify-around items-center px-2">
                                                    <div className={`size-3 rounded-full border-2 ${style.reelBorder}`} />
                                                    <div className={`size-3 rounded-full border-2 ${style.reelBorder}`} />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-1.5 left-2 right-2">
                                                <p className={`text-[8px] font-bold tracking-tight ${style.text} truncate`}>{mix.title.toUpperCase()}</p>
                                            </div>
                                            {isInsidePlayer && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
                                                    <span className="text-[7px] font-bold text-white uppercase tracking-wider">Playing</span>
                                                </div>
                                            )}
                                            {/* Hover Actions Overlay */}
                                            {!isInsidePlayer && !isDragging && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1 bg-white/90 rounded-full hover:bg-white" title="Settings"><Pencil size={10} className="text-slate-800" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1 bg-white/90 rounded-full hover:bg-white" title="Snapshot"><Camera size={10} className="text-slate-800" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1 bg-white/90 rounded-full hover:bg-white" title="Share"><Share2 size={10} className="text-slate-800" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1 bg-white/90 rounded-full hover:bg-white" title="Add Songs"><Plus size={10} className="text-slate-800" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Center: Player */}
                <div className="col-span-6 flex flex-col items-center justify-center min-h-0">
                    <div className="mb-4 text-center shrink-0">
                        <h1 className="text-[#101814] tracking-[0.25em] text-xs font-bold uppercase">
                            {isLoaded ? (currentSong ? decodeHtml(currentSong.name) : activeMix?.title) : "Insert Cassette"}
                        </h1>
                        <p className="text-[#5c8a6f] text-[9px] tracking-[0.15em] uppercase mt-0.5">
                            Zen Player • {isLoaded ? (isPlaying ? "Playing" : "Ready") : "Waiting"}
                        </p>
                    </div>

                    <div ref={playerRef} className="w-full max-w-[480px]">
                        <div className={clsx(
                            "bg-white rounded-xl shadow-xl border border-neutral-200/50 flex flex-col transition-all duration-200",
                            isOverPlayer && "ring-4 ring-[#2d8652]/40 scale-[1.01]"
                        )}>
                            {/* Top Bar */}
                            <div className="h-10 border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-between px-4 rounded-t-xl">
                                <div className="flex gap-1.5">
                                    <div className={clsx("size-1.5 rounded-full", isLoaded ? "bg-green-500" : "bg-red-400")} />
                                    <div className="size-1.5 rounded-full bg-neutral-300" />
                                </div>
                                <span className="text-[7px] font-bold tracking-[0.2em] text-neutral-400 uppercase">MELORA STEREO DECK</span>
                            </div>

                            {/* Deck */}
                            <div className="flex items-center justify-center p-4 bg-neutral-50">
                                <div className="w-full max-w-[300px] h-36 bg-neutral-200 rounded-lg shadow-inner border-2 border-neutral-300 flex items-center justify-center relative overflow-hidden">
                                    {!isLoaded && (
                                        <div className="flex gap-12">
                                            <div className="size-11 rounded-full border-4 border-neutral-300 bg-neutral-100 flex items-center justify-center"><div className="size-1.5 rounded-full bg-neutral-400" /></div>
                                            <div className="size-11 rounded-full border-4 border-neutral-300 bg-neutral-100 flex items-center justify-center"><div className="size-1.5 rounded-full bg-neutral-400" /></div>
                                        </div>
                                    )}
                                    {isLoaded && activeMix && (() => {
                                        const idx = mixes.findIndex(m => m.id === activeMix.id);
                                        const style = getStyleForMix(idx >= 0 ? idx : 0);
                                        return (
                                            <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-2">
                                                <div className={`w-full h-full bg-gradient-to-br ${style.bg} rounded shadow-lg flex flex-col items-center justify-center relative`}>
                                                    <div className="flex gap-10">
                                                        <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className={`size-9 rounded-full border-2 ${style.reelBorder} bg-black/30 flex items-center justify-center`}><div className="size-1 rounded-full bg-white/60" /></motion.div>
                                                        <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className={`size-9 rounded-full border-2 ${style.reelBorder} bg-black/30 flex items-center justify-center`}><div className="size-1 rounded-full bg-white/60" /></motion.div>
                                                    </div>
                                                    <div className="absolute bottom-2 left-3 right-3 text-center"><p className={`text-[8px] font-bold ${style.text} truncate`}>{activeMix.title.toUpperCase()}</p></div>
                                                </div>
                                            </motion.div>
                                        );
                                    })()}
                                    {isOverPlayer && <div className="absolute inset-0 bg-[#2d8652]/20 animate-pulse rounded-lg" />}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div
                                className="h-6 px-4 flex items-center cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const p = (e.clientX - rect.left) / rect.width;
                                    seek(Math.min(Math.max(p, 0), 1));
                                }}
                            >
                                <div className="relative h-1 w-full bg-neutral-200 rounded-full">
                                    <div className="absolute inset-y-0 left-0 bg-[#2d8652] rounded-full" style={{ width: `${progress * 100}%` }} />
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="h-12 border-t border-neutral-200 flex items-center justify-center gap-6 px-4">
                                <button onClick={() => { playClick(); prev(); }} disabled={!isLoaded} className={clsx("p-1.5", isLoaded ? "text-neutral-500 hover:text-[#2d8652]" : "text-neutral-300")}><SkipBack size={18} className="fill-current" /></button>
                                <button onClick={() => { playClick(); togglePlay(); }} className="size-10 rounded-full bg-[#2d8652] flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform">{isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current pl-0.5" />}</button>
                                <button onClick={() => { playClick(); next(); }} disabled={!isLoaded} className={clsx("p-1.5", isLoaded ? "text-neutral-500 hover:text-[#2d8652]" : "text-neutral-300")}><SkipForward size={18} className="fill-current" /></button>
                                <div className="relative h-1 w-16 bg-neutral-200 rounded-full ml-3">
                                    <div className="absolute inset-y-0 left-0 bg-[#2d8652]/50 rounded-full" style={{ width: `${volume * 100}%` }} />
                                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {isLoaded && (
                        <button onClick={() => { playEject(); loadMix(null as any); }} className="mt-4 flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-neutral-400 hover:text-[#2d8652] uppercase"><LogOut size={12} /> Eject</button>
                    )}
                    <p className="mt-4 text-[8px] tracking-widest text-neutral-300 uppercase">Drag cassette to insert</p>
                </div>

                {/* Right: Status - Positioned to fit within viewport */}
                <div className="col-span-3 flex flex-col justify-center items-end min-h-0">
                    <div className="text-right">
                        <p className="text-[9px] font-bold tracking-widest text-[#2d8652] uppercase">Status</p>
                        <p className="text-base font-light text-[#101814]">{isLoaded ? "Now Playing" : "Waiting"}</p>
                        {activeMix && <p className="text-xs text-neutral-500 truncate max-w-[120px]">{activeMix.title}</p>}
                        <div className="pt-3 space-y-1 text-neutral-400">
                            <div className="flex items-center justify-end gap-2"><span className="text-[8px] font-bold uppercase">Time</span><span className="text-[9px] font-mono">{formatTime(progress * duration)}/{formatTime(duration || 0)}</span></div>
                            <div className="flex items-center justify-end gap-2"><span className="text-[8px] font-bold uppercase">Vol</span><span className="text-[9px] font-mono">{Math.round(volume * 100)}%</span></div>
                        </div>
                    </div>
                </div>
            </main>

            {/* FLOATING DRAG GHOST - Always on top */}
            {draggingMix && dragPosition && (
                <div
                    className="fixed pointer-events-none"
                    style={{ left: dragPosition.x - 72, top: dragPosition.y - 48, zIndex: 99999, transform: 'rotate(5deg) scale(1.1)' }}
                >
                    {(() => {
                        const style = getStyleForMix(draggingMix.index);
                        return (
                            <div className={`w-36 h-24 bg-gradient-to-br ${style.bg} rounded shadow-2xl relative overflow-hidden`}>
                                <div className="absolute inset-1 flex items-center justify-center">
                                    <div className="w-full h-5 bg-black/20 flex justify-around items-center px-2">
                                        <div className={`size-3 rounded-full border-2 ${style.reelBorder}`} />
                                        <div className={`size-3 rounded-full border-2 ${style.reelBorder}`} />
                                    </div>
                                </div>
                                <div className="absolute bottom-1.5 left-2 right-2">
                                    <p className={`text-[8px] font-bold tracking-tight ${style.text} truncate`}>{draggingMix.mix.title.toUpperCase()}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
            {/* Overlays */}
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
        </div>
    );
}
