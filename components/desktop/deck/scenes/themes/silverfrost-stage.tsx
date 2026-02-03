"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
    Palette, Settings, Plus, Tv, Pencil, Camera, Search, Share2
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { getThumbnailUrl } from "@/lib/jiosaavn";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal, ListMusic } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";

interface SilverFrostStageProps {
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

export function SilverFrostStage({
    currentTheme, onThemeChange, onSelectTheme, onOpenSettings,
    onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onSnapshotMix, onShowLyrics, onShowQueue, onShareMix
}: SilverFrostStageProps) {
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, togglePlay, next, prev, setVolume, isLoaded, seek,
        shuffle, setShuffle, repeat, setRepeat, eq
    } = usePlayback();

    const { playClick, playClunk } = useAudio();
    const activeMix = mixes.find(m => m.id === activeMixId) || null;
    const [hoveredMix, setHoveredMix] = useState<string | null>(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getMixImage = (mix: Mix): string | null => {
        if (mix.songs.length > 0) {
            const firstItem = mix.songs[0];
            // Handle PlayableTrack (has .song) vs raw JioSaavnSong
            const actualSong = (firstItem as any)?.song || firstItem;
            return getThumbnailUrl(actualSong);
        }
        return null;
    };

    // Visualizer bars animation
    const bars = [20, 45, 85, 60, 90, 35, 15, 55, 70, 40];

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f7f7f8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <style jsx global>{`
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0, 170, 255, 0.2); border-radius: 10px; }
            `}</style>

            {/* Header */}
            <header className="flex items-center justify-between px-10 py-4 border-b border-white/20 bg-[#f8fbfc]/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-2xl font-['Pacifico'] leading-tight tracking-tight text-[#00aaff]">Melora Tunes</h2>
                            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Silver Frost Lab</p>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 ml-10">
                        <button onClick={onCinemaMode} className="text-sm font-bold border-b-2 border-[#00aaff] pb-1 text-slate-800"><Tv size={14} className="inline mr-1" />Cinema</button>
                        <button onClick={() => setIsRackOpen(true)} className="text-sm font-medium text-slate-600 hover:text-[#00aaff] transition-colors"><ListMusic size={14} className="inline mr-1" />Rack</button>
                        <button onClick={onCreateMix} className="text-sm font-medium text-slate-600 hover:text-[#00aaff] transition-colors"><Plus size={14} className="inline mr-1" />Create Mix</button>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center bg-white/50 rounded-lg px-3 py-1.5 border border-white/20 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">System: Optimal</span>
                    </div>
                    {/* Switch Mobile Removed */}
                    <button onClick={onOpenThemeSelector} className="size-10 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white/50 hover:bg-white transition-colors"><Palette size={18} className="text-slate-600" /></button>
                    <button onClick={onOpenSettings} className="size-10 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white/50 hover:bg-white transition-colors"><Settings size={18} className="text-slate-600" /></button>
                    <button onClick={() => setShowLyrics(prev => !prev)} className={`size-10 rounded-full border-2 border-slate-300 flex items-center justify-center transition-colors ${showLyrics ? 'bg-[#00aaff] text-white border-[#00aaff]' : 'bg-white/50 text-slate-600 hover:bg-white'}`}><Mic2 size={18} /></button>
                    <button onClick={() => setShowEq(prev => !prev)} className={`size-10 rounded-full border-2 border-slate-300 flex items-center justify-center transition-colors ${showEq ? 'bg-[#00aaff] text-white border-[#00aaff]' : 'bg-white/50 text-slate-600 hover:bg-white'}`}><SlidersHorizontal size={18} /></button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar - Brushed Metal */}
                <aside className="w-72 border-r border-white/30 flex flex-col p-5 relative overflow-hidden shrink-0 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.05)]"
                    style={{ background: 'linear-gradient(135deg, #e0e6eb 0%, #b6bec5 50%, #e0e6eb 100%)' }}>
                    <div className="mb-6">
                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Mixtape Rack</h3>
                        <p className="text-[11px] text-[#00aaff] font-bold">Mechanical Axis Active</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">{mixes.filter(m => m.pinned).length}/8 slots used</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {mixes
                            .filter(m => (m.id === 'discovery-mix' || m.pinned) && !['search-results', 'quick-play', 'otg-tape'].includes(m.id))
                            .map((mix) => {
                                const isActive = activeMixId === mix.id && isLoaded;
                                const albumArt = getMixImage(mix);
                                // Silverfrost Color Logic: UNIFORM FROST
                                // All cassettes use the same silver/frost gradient - no playlist colors
                                const fallbackBg = "linear-gradient(135deg, #c1d2e0 0%, #8ea6b8 100%)";

                                return (
                                    <div
                                        key={mix.id}
                                        onClick={() => { playClick(); loadMix(mix.id); }}
                                        onMouseEnter={() => setHoveredMix(mix.id)}
                                        onMouseLeave={() => setHoveredMix(null)}
                                        className={clsx(
                                            "p-1 rounded-lg cursor-pointer transition-all",
                                            "bg-white/40 backdrop-blur-sm border border-white/60 shadow-sm",
                                            isActive && "scale-[1.02] shadow-[0_0_15px_rgba(0,170,255,0.4)] border-[#00aaff]/40",
                                            !isActive && "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <div className="h-20 w-full rounded-md mb-2 relative overflow-hidden"
                                            style={{ background: fallbackBg }}>
                                            {albumArt && (
                                                <img
                                                    src={albumArt}
                                                    alt={mix.title}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
                                                />
                                            )}
                                            {isActive && <span className="absolute bottom-1 left-1 bg-[#00aaff] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Playing</span>}
                                            {hoveredMix === mix.id && !isActive && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"><Pencil size={12} className="text-gray-700" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"><Camera size={12} className="text-gray-700" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center" title="Snapshot"><Camera size={12} className="text-gray-700" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center" title="Share"><Share2 size={12} className="text-gray-700" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center" title="Add Songs"><Search size={12} className="text-gray-700" /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-2 pb-2">
                                            <p className="text-xs font-bold truncate">{mix.title}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-medium">{mix.songs.length} tracks</p>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/30">
                        <button onClick={onCreateMix} className="w-full py-3 bg-[#00aaff] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-[#00aaff]/30 flex items-center justify-center gap-2 hover:bg-[#0099ee] transition-colors">
                            <Plus size={16} /> New Mixtape
                        </button>
                    </div>
                </aside>

                {/* Main Player */}
                <section className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Soft Bokeh */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00aaff]/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-slate-300/20 rounded-full blur-[80px]" />

                    {/* Headline */}
                    <div className="text-center mb-8 z-10">
                        <div className="inline-block px-3 py-1 bg-white/40 border border-white/60 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">
                            Laboratory Audio Stream
                        </div>
                        <h1 className="text-3xl md:text-[42px] font-black text-slate-800 tracking-tighter leading-none mb-2">
                            {isLoaded ? (currentSong ? decodeHtml(currentSong.name) : activeMix?.title) : 'Select a Tape'}
                        </h1>
                        <p className="text-[#00aaff] font-bold tracking-widest uppercase text-xs">
                            {isLoaded ? `Track ${String(mixes.findIndex(m => m.id === activeMixId) + 1).padStart(2, '0')} // Spectral Analysis Active` : 'System Ready'}
                        </p>
                    </div>

                    {/* Glass Player */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragElastic={0.1}
                        className="w-full max-w-[750px] bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-6 md:p-8 relative z-10 shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
                    >
                        {/* Screws */}
                        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-400/30 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-slate-500/40 rotate-45" /></div>
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-400/30 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-slate-500/40 rotate-45" /></div>
                        <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-slate-400/30 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-slate-500/40 rotate-45" /></div>
                        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-400/30 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-slate-500/40 rotate-45" /></div>

                        {/* Reflection */}
                        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/10 to-transparent skew-x-12 opacity-50 pointer-events-none" />

                        <div className="flex flex-col lg:flex-row gap-6 items-stretch relative z-10">
                            {/* Reel Window */}
                            <div className="flex-1 bg-slate-200/30 backdrop-blur-sm rounded-xl p-6 relative min-h-[250px] flex items-center justify-center border-2 border-white/30 shadow-inner">
                                <div className="relative w-36 h-36 border-[10px] border-slate-300 rounded-full flex items-center justify-center shadow-[inset_0_4px_10px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.1)]">
                                    <motion.div
                                        className="absolute inset-2 border-4 border-dashed border-slate-400/30 rounded-full"
                                        animate={isPlaying ? { rotate: 360 } : {}}
                                        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                                    />
                                    <div className="w-12 h-12 bg-[#00aaff]/20 rounded-full border-4 border-[#00aaff] flex items-center justify-center">
                                        <motion.div
                                            className="w-3 h-3 bg-[#00aaff] rounded-full"
                                            animate={isPlaying ? { opacity: [1, 0.5, 1] } : {}}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        />
                                    </div>
                                </div>
                                {/* HUD Overlay */}
                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                    <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10">
                                        <p className="text-[9px] text-[#00aaff] font-bold uppercase">Sample Rate</p>
                                        <p className="text-xs text-white font-mono">320kbps</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-600 leading-none">{formatTime(Math.max(0, duration - (progress * duration)))}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Remaining</p>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="w-full lg:w-56 flex flex-col gap-4">
                                {/* Visualizer */}
                                <div className="bg-black rounded-lg p-3 h-24 flex items-end gap-1">
                                    {bars.map((h, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex-1 bg-[#00aaff] rounded-t-sm"
                                            animate={isPlaying ? { height: [`${h}%`, `${(h + 30) % 100}%`, `${h}%`] } : { height: '10%' }}
                                            transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, ease: "easeInOut" }}
                                        />
                                    ))}
                                </div>

                                {/* Playback */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => { playClick(); prev(); }} className="bg-white/50 border border-white/60 aspect-square rounded-lg flex items-center justify-center hover:bg-white transition-all shadow-sm">
                                        <SkipBack size={22} className="text-slate-700" />
                                    </button>
                                    <button onClick={() => { playClick(); togglePlay(); }} className="bg-[#00aaff] aspect-square rounded-lg flex items-center justify-center shadow-lg shadow-[#00aaff]/40 text-white hover:scale-105 active:scale-95 transition-all">
                                        {isPlaying ? <Pause size={26} /> : <Play size={26} className="pl-0.5" />}
                                    </button>
                                    <button onClick={() => { playClick(); next(); }} className="bg-white/50 border border-white/60 aspect-square rounded-lg flex items-center justify-center hover:bg-white transition-all shadow-sm">
                                        <SkipForward size={22} className="text-slate-700" />
                                    </button>
                                </div>

                                {/* Volume */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                        <span>Gain Control</span>
                                        <span>{Math.round(volume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05" value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#00aaff]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6 pt-4 border-t border-slate-200/50">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 w-10">{formatTime(Math.min(progress * duration, duration))}</span>
                                <div
                                    className="flex-1 h-1 bg-slate-200 rounded-full relative cursor-pointer overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div className="h-full bg-[#00aaff] rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 w-10 text-right">{formatTime(duration)}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Status Grid */}
                    <div className="mt-8 w-full max-w-[750px] grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
                        {[
                            { icon: '📊', label: 'Mode', value: 'Pure Stereo' },
                            { icon: '🌡️', label: 'Status', value: 'Optimal' },
                            { icon: '💾', label: 'Buffer', value: 'Adaptive' },
                            { icon: '🎧', label: 'Output', value: 'Stable' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/40 backdrop-blur border border-white/60 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                <span className="text-sm">{item.icon}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{item.label}</span>
                                <span className="text-xs font-black uppercase text-slate-700">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="h-14 bg-[#f8fbfc] border-t border-slate-200 flex items-center justify-between px-8 z-50 shrink-0">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => { playClick(); setShuffle(!shuffle); }}
                        className={`flex items-center gap-2 transition-colors ${shuffle ? 'text-[#00aaff] font-bold' : 'text-slate-500 hover:text-[#00aaff]'}`}
                        title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                    >
                        <Shuffle size={16} /><span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Shuffle</span>
                    </button>
                    <button
                        onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                        className={`flex items-center gap-2 ${repeat !== 'off' ? 'text-[#00aaff] font-bold' : 'text-slate-500 hover:text-[#00aaff]'}`}
                        title={`Repeat: ${repeat.toUpperCase()}`}
                    >
                        <Repeat size={16} /><span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Repeat{repeat === 'one' ? ' 1' : ''}</span>
                    </button>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isLoaded ? `Now Playing: ${currentSong ? decodeHtml(currentSong.name) : activeMix?.title}` : 'Ready'}
                </div>
            </footer>
            {/* Overlays */}
            {/* Overlays */}
            <AnimatePresence>
                {showLyrics && (
                    <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                        <div className="pointer-events-auto">
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


            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div >
    );
}
