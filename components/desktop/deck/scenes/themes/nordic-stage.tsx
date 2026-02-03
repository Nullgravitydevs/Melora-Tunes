"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    SkipBack, SkipForward, Volume2, LogOut,
    Palette, Settings, Plus, Camera, Share2, Play, Pause
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal, ListMusic } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";

interface NordicStageProps {
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
    onShowLyrics?: () => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: Mix) => void;
}

export function NordicStage({
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
    onShowLyrics,
    onShowQueue,
    onShareMix
}: NordicStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, togglePlay, next, prev, seek, setVolume,
        isLoaded, eq
    } = usePlayback();

    const { playClick, playEject } = useAudio();
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full font-sans overflow-hidden relative bg-[#1a1c20] text-slate-200 [&::-webkit-scrollbar]:hidden"
        >
            {/* Global Styles: Hide Scrollbars - Handled by utility now */}

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col h-screen w-full">

                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-['Pacifico'] tracking-tight text-white">Melora Tunes</h1>
                    </div>

                    <nav className="flex items-center gap-6">
                        <button onClick={onCinemaMode} className="hidden md:block font-mono text-sm tracking-widest uppercase hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400 pb-1">
                            Cinema Mode
                        </button>
                        <button onClick={() => setIsRackOpen(true)} className="hidden md:block font-mono text-sm tracking-widest uppercase hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400 pb-1 flex items-center gap-2">
                            <ListMusic size={14} /> Rack
                        </button>
                        <button onClick={onCreateMix} className="font-mono text-sm tracking-widest uppercase hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400 pb-1">
                            + Create Mix
                        </button>

                        <div className="flex gap-4 ml-4 border-l border-slate-700 pl-6">
                            {/* Mobile Switch Removed */}
                            <button onClick={onOpenThemeSelector} className="p-2 text-slate-400 hover:text-white transition-colors" title="Change Theme">
                                <Palette size={20} />
                            </button>
                            <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white transition-colors" title="Settings">
                                <Settings size={20} />
                            </button>
                        </div>
                    </nav>
                </header>

                {/* Main Content */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">

                    {/* Left Column: Mixtape List */}
                    <section className="lg:col-span-7 flex flex-col h-full overflow-hidden">
                        <h2 className="font-mono text-sm tracking-widest text-slate-500 mb-6 border-b border-slate-800 pb-2 inline-block uppercase">Your Mixtapes</h2>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-4 [&::-webkit-scrollbar]:hidden">
                            {mixes
                                .filter(m => (m.id === 'discovery-mix' || m.pinned) && !['search-results', 'quick-play', 'otg-tape'].includes(m.id))
                                .map((mix) => (
                                    <div
                                        key={mix.id}
                                        onClick={() => {
                                            if (activeMixId === mix.id) return; // Prevent reload
                                            playClick();
                                            loadMix(mix.id);
                                        }}
                                        className={clsx(
                                            "group flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 border",
                                            mix.id === activeMixId
                                                ? "bg-slate-800 border-blue-500/50 shadow-lg"
                                                : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Mini Cassette Icon */}
                                            {(() => {
                                                const colorMap: Record<string, string> = {
                                                    orange: "from-orange-500 to-orange-600 border-orange-400",
                                                    purple: "from-purple-500 to-purple-600 border-purple-400",
                                                    white: "from-slate-200 to-slate-300 border-slate-400",
                                                    green: "from-green-500 to-green-600 border-green-400",
                                                    red: "from-red-500 to-red-600 border-red-400",
                                                    blue: "from-blue-500 to-blue-600 border-blue-400",
                                                    cyan: "from-cyan-500 to-cyan-600 border-cyan-400",
                                                    pink: "from-pink-500 to-pink-600 border-pink-400",
                                                    black: "from-slate-800 to-slate-900 border-slate-600",
                                                    yellow: "from-yellow-400 to-yellow-500 border-yellow-300",
                                                };

                                                // Nordic Color Logic: Deterministic Hash (Ignore mix.color)
                                                // Theme decides the color based on ID to ensure Icy Aesthetic
                                                const icyOptions = ['blue', 'cyan', 'white', 'purple'];
                                                let hash = 0;
                                                for (let i = 0; i < mix.id.length; i++) hash = mix.id.charCodeAt(i) + ((hash << 5) - hash);
                                                const effectiveColor = icyOptions[Math.abs(hash) % icyOptions.length];

                                                const colorClass = colorMap[effectiveColor] || "from-slate-600 to-slate-700 border-slate-500";
                                                const isWhite = effectiveColor === 'white';

                                                return (
                                                    <div className={clsx(
                                                        "w-12 h-8 bg-gradient-to-br rounded flex items-center justify-center border shadow-sm",
                                                        colorClass
                                                    )}>
                                                        <div className={clsx(
                                                            "w-6 h-4 rounded-sm flex items-center justify-around",
                                                            isWhite ? "bg-slate-300" : "bg-black/30"
                                                        )}>
                                                            <div className={clsx("w-1.5 h-1.5 rounded-full border", isWhite ? "border-slate-500" : "border-white/50")}></div>
                                                            <div className={clsx("w-1.5 h-1.5 rounded-full border", isWhite ? "border-slate-500" : "border-white/50")}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <div>
                                                <h3 className={clsx("font-mono font-bold text-sm", mix.id === activeMixId ? "text-blue-400" : "text-white")}>{mix.title}</h3>
                                                <p className="text-xs text-slate-400">{mix.songs.length} songs</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }}
                                                className="p-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                                                title="Snapshot"
                                            >
                                                <Camera size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                                                title="Share"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </section>

                    {/* Right Column: Player */}
                    <section className="lg:col-span-5 w-full">
                        <motion.div
                            drag
                            dragConstraints={containerRef}
                            dragMomentum={true}
                            dragElastic={0.2}
                            whileDrag={{ scale: 1.02, zIndex: 50 }}
                            className="bg-[#24272b] p-8 rounded-2xl shadow-2xl border border-slate-700/50 cursor-grab active:cursor-grabbing"
                        >

                            {/* Player Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-mono text-xs font-bold tracking-widest uppercase text-slate-400">Stereo Cassette Player</h2>
                                <div className="flex gap-1 items-center">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", isLoaded ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">{isLoaded ? "Ready" : "Empty"}</span>
                                </div>
                            </div>

                            {/* Player Screen */}
                            <div className="bg-black/60 rounded-lg p-6 mb-6 border border-slate-800 h-28 flex flex-col items-center justify-center relative overflow-hidden">
                                {isLoaded && activeMix ? (
                                    <>
                                        <p className="font-mono text-sm text-slate-300 tracking-widest text-center truncate w-full px-4">
                                            {currentSong ? decodeHtml(currentSong.name) : activeMix.title.toUpperCase()}
                                        </p>
                                        <p className="font-mono text-xs text-slate-500 mt-1 uppercase tracking-wider">
                                            {currentSong ? decodeHtml(currentSong.primaryArtists || "") : "Tape Loaded"}
                                        </p>
                                    </>
                                ) : (
                                    <p className="font-mono text-sm text-slate-600 tracking-widest">NO CASSETTE LOADED</p>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2">
                                    <span>{formatTime(progress * duration)}</span>
                                    <span>{formatTime(duration || 0)}</span>
                                </div>
                                <div
                                    className="h-1 w-full bg-slate-800 rounded-full cursor-pointer group relative"
                                    onClick={(e) => {
                                        if (duration && isLoaded) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            seek(Math.max(0, Math.min(1, percent)));
                                        }
                                    }}
                                >
                                    <div
                                        className="absolute top-0 left-0 h-full bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors"
                                        style={{ width: `${Math.min(progress * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <button
                                    onClick={() => { playClick(); prev(); }}
                                    className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <SkipBack className="fill-current" size={24} />
                                </button>
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="p-5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    {isPlaying ? <Pause className="fill-current" size={28} /> : <Play className="fill-current pl-1" size={28} />}
                                </button>
                                <button
                                    onClick={() => { playClick(); next(); }}
                                    className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <SkipForward className="fill-current" size={24} />
                                </button>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => { playEject(); loadMix(""); }}
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-blue-400 transition-colors uppercase tracking-widest"
                                >
                                    <LogOut size={16} />
                                    Eject
                                </button>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            if (!showLyrics) setShowEq(false);
                                            setShowLyrics(prev => !prev);
                                        }}
                                        className={`flex items-center gap-2 text-xs font-mono font-bold transition-colors uppercase tracking-widest ${showLyrics ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400'}`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <Mic2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!showEq) setShowLyrics(false);
                                            setShowEq(prev => !prev);
                                        }}
                                        className={`flex items-center gap-2 text-xs font-mono font-bold transition-colors uppercase tracking-widest ${showEq ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400'}`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <SlidersHorizontal size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 relative">
                                    <Volume2 size={18} className="text-slate-400" />
                                    <div className="w-20 h-1 bg-slate-800 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-slate-500 hover:bg-blue-400 transition-colors"
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
                        </motion.div>
                    </section>
                </main>
            </div>
            {/* Overlays */}
            <div className="relative z-[10000]">
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


            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div >
    );
}
