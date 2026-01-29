"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { toPng } from 'html-to-image';
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Share2, Palette, Settings, Plus, Maximize2, Pencil, Camera } from "lucide-react";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal } from "lucide-react";

interface BauhausStageProps {
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
    onSnapshotMix?: (mix: any) => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: any) => void;
}

export interface Position { x: number; y: number; rotation: number; }

// Helper to generate initial grid layout for free-floating canvas
const generateGridPositions = (count: number): Record<string, Position> => {
    const positions: Record<string, Position> = {};
    const cols = 4;
    const startX = 40;
    const startY = 160;
    const gapX = 220;
    const gapY = 160;

    for (let i = 0; i < count; i++) {
        // We can't know IDs here without mixes, so this is just logic helper.
        // We will do this in useEffect.
        // This function is placeholder or we move logic to component.
    }
    return {};
};

// Extracted Draggable Card
function DraggableMixCard({
    mix,
    position,
    isActive,
    containerRef,
    playerRef,
    onDragEnd,
    onEditMix,
    onSnapshotMix,
    onShareMix,
    onOpenSearch,
    loadMix,
    playClick
}: {
    mix: Mix;
    position: Position;
    isActive: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    playerRef: React.RefObject<HTMLDivElement>;
    onDragEnd: (id: string, pos: Position) => void;
    onEditMix?: (mix: Mix) => void;
    onSnapshotMix?: (mix: Mix) => void;
    onShareMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    loadMix: (id: string) => void;
    playClick: () => void;
}) {
    const x = useMotionValue(position.x);
    const y = useMotionValue(position.y);

    // Sync if parent updates
    useEffect(() => {
        x.set(position.x);
        y.set(position.y);
    }, [position.x, position.y, x, y]);

    return (
        <motion.div
            style={{ x, y, rotate: position.rotation }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{ scale: 1.05, zIndex: 100, rotate: 0 }}
            whileHover={{ scale: 1.02, zIndex: 50 }}
            className={clsx("absolute top-0 left-0 cursor-grab active:cursor-grabbing w-[200px]", isActive && "opacity-50 pointer-events-none grayscale")}
            onDragEnd={(e, info) => {
                // Check drop on player
                if (playerRef.current) {
                    const rect = playerRef.current.getBoundingClientRect();
                    const { x: dropX, y: dropY } = info.point;
                    if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                        playClick();
                        loadMix(mix.id);
                    }
                }
                // Persist Position
                onDragEnd(mix.id, { x: x.get(), y: y.get(), rotation: position.rotation });
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Card Content - Keeping existing design */}
            <div
                id={`mix-card-${mix.id}`}
                className={clsx(
                    "relative p-3 border-2 border-[#1a1a1a] transition-transform transform aspect-[3/2] flex flex-col justify-between shadow-[6px_6px_0px_0px_#1a1a1a] bg-white"
                )}
            >
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex flex-row gap-1 z-20 no-snapshot opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1 bg-white border border-black hover:bg-yellow-300"><Pencil size={10} /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1 bg-white border border-black hover:bg-yellow-300"><Camera size={10} /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1 bg-white border border-black hover:bg-yellow-300"><Share2 size={10} /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1 bg-white border border-black hover:bg-yellow-300"><Plus size={10} /></button>
                </div>

                {/* Tape Label */}
                <div className={clsx("flex justify-between items-start text-[#1a1a1a]")}>
                    <span className="text-xl font-black">A</span>
                    <div className="flex gap-1">
                        {isActive && <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>}
                    </div>
                </div>

                <div className={clsx("bg-white relative p-2 border-2 border-[#1a1a1a] shadow-sm mx-1 transform -rotate-1")}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black opacity-10 rounded-b"></div>
                    <p className="font-mono text-center text-xs font-bold text-[#1a1a1a] tracking-tight truncate uppercase">{mix.title}</p>
                    <div className="w-full h-0.5 bg-[#1a1a1a]/20 my-1"></div>
                </div>

                <div className="flex justify-between items-center mt-2 px-1">
                    <div className="flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center"><div className="w-full h-0.5 bg-[#1a1a1a]"></div></div>
                        <div className="w-6 h-6 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center"><div className="w-full h-0.5 bg-[#1a1a1a]"></div></div>
                    </div>
                    <span className="bg-[#1a1a1a] text-white px-2 py-0.5 text-[9px] font-bold">{mix.songs.length}</span>
                </div>
            </div>
        </motion.div>
    );
}

export function BauhausStage({ currentTheme, onThemeChange, onSelectTheme, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowQueue, onShareMix, onSnapshotMix }: BauhausStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null!);

    // State Refactor
    const [positions, setPositions] = useState<Record<string, Position>>({});

    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded, eq
    } = usePlayback();

    const { playClick, playEject } = useAudio();
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);

    // Memoize activeMix
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Initialize Grid Positions
    useEffect(() => {
        setPositions(prev => {
            const nextState = { ...prev };
            let hasChanges = false;
            const cols = 3; // Grid columns

            mixes.forEach((mix, i) => {
                if (!nextState[mix.id]) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    nextState[mix.id] = {
                        x: 40 + (col * 220),
                        y: 120 + (row * 160),
                        rotation: -2 + Math.random() * 4
                    };
                    hasChanges = true;
                }
            });
            return hasChanges ? nextState : prev;
        });
    }, [mixes]);

    const handlePosChange = (id: string, pos: Position) => {
        setPositions(prev => ({ ...prev, [id]: pos }));
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Exclusive Toggles
    const toggleLyrics = () => {
        if (!showLyrics) setShowEq(false);
        setShowLyrics(!showLyrics);
    };

    const toggleEq = () => {
        if (!showEq) setShowLyrics(false);
        setShowEq(!showEq);
    };

    // Safe Progress
    const safeProgress = Math.min(Math.max(progress || 0, 0), 1);

    return (
        <div ref={containerRef} className="bg-[#f4f4f0] text-[#1a1a1a] h-screen flex flex-col font-sans overflow-hidden selection:bg-[#0052cc] selection:text-white relative">
            {/* Bauhaus Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-40 z-0"
                style={{
                    backgroundImage: `linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="w-full h-full mx-auto p-0 relative z-10 flex flex-col">
                {/* Header */}
                <header className="w-full p-4 flex flex-col md:flex-row justify-between items-center bg-white border-b-4 border-[#1a1a1a] relative z-20 gap-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] z-40">
                    <div className="flex items-center gap-4 select-none">
                        <h1 className="text-3xl font-['Pacifico'] tracking-tight">Melora Tunes</h1>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap justify-center font-bold">
                        <button onClick={onCinemaMode} className="hidden md:flex items-center gap-2 bg-[#0052cc] text-white px-4 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all border-2 border-[#1a1a1a] text-sm">
                            <Maximize2 size={14} /> Cinema Mode
                        </button>
                        <button onClick={onCreateMix} className="flex items-center gap-2 bg-[#ffcc00] text-[#1a1a1a] border-2 border-[#1a1a1a] px-4 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-sm">
                            <Plus size={14} /> Create Mix
                        </button>
                        <div className="relative">
                            <button onClick={() => onOpenThemeSelector?.()} className="p-3 bg-white border-2 border-[#1a1a1a] hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                <Palette size={20} />
                            </button>
                        </div>
                        <button onClick={onOpenSettings} className="p-3 bg-white border-2 border-[#1a1a1a] hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                <main className="h-full relative overflow-hidden">
                    {/* Free Floating Tapes */}
                    {mixes.map(mix => {
                        if (!positions[mix.id]) return null;
                        return (
                            <DraggableMixCard
                                key={mix.id}
                                mix={mix}
                                position={positions[mix.id]}
                                isActive={activeMixId === mix.id}
                                containerRef={containerRef}
                                playerRef={playerRef}
                                onDragEnd={handlePosChange}
                                loadMix={loadMix}
                                playClick={playClick}
                                onEditMix={onEditMix}
                                onSnapshotMix={onSnapshotMix}
                                onShareMix={onShareMix}
                                onOpenSearch={onOpenSearch}
                            />
                        );
                    })}

                    {/* Right Column: Player (Fixed Position but Draggable) */}
                    <motion.section
                        ref={playerRef}
                        id="stereo-player"
                        drag
                        dragMomentum={true}
                        dragElastic={0.2}
                        dragConstraints={containerRef}
                        whileDrag={{ scale: 1.02, zIndex: 100 }}
                        className="absolute right-6 top-6 w-full max-w-[340px] bg-white border-4 border-[#1a1a1a] p-4 flex flex-col gap-2 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] z-30 cursor-move"
                    >
                        {/* Screws */}
                        <div className="absolute top-2 left-2 text-gray-300 font-mono text-xl">+</div>
                        <div className="absolute top-2 right-2 text-gray-300 font-mono text-xl">+</div>
                        <div className="absolute bottom-2 left-2 text-gray-300 font-mono text-xl">+</div>
                        <div className="absolute bottom-2 right-2 text-gray-300 font-mono text-xl">+</div>

                        <div className="text-center space-y-2 mt-2">
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-[#1a1a1a]">Stereo Player</h3>
                            <div className="w-16 h-1 bg-[#ff3333] mx-auto"></div>
                            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.3em]">Auto Reverse System</p>
                        </div>

                        {/* Player Screen */}
                        <div className="bg-[#1a1a1a] p-0 rounded-sm border-4 border-gray-200 h-40 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group select-none">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/carbon-fibre.png")` }}></div>

                            {isLoaded && activeMix ? (
                                <motion.div layoutId={activeMix.id} className="transform scale-[0.95] origin-center w-full flex justify-center items-center pointer-events-none">
                                    <div className="relative w-full">
                                        <div className={clsx(
                                            "relative p-3 border-2 border-[#1a1a1a] aspect-[3/2] flex flex-col justify-between shadow-[8px_8px_0px_0px_#1a1a1a] bg-[#0052cc]"
                                        )}>
                                            <div className={clsx("flex justify-between items-start text-white")}>
                                                <span className="text-2xl font-black">A</span>
                                                <div className="flex gap-1">
                                                    <div className="animate-pulse w-2 h-2 bg-white rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className={clsx("bg-white relative p-2 border-2 border-[#1a1a1a] shadow-sm mx-1 transform -rotate-1")}>
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black opacity-10 rounded-b"></div>
                                                <p className="font-mono text-center text-sm font-bold text-[#1a1a1a] tracking-tight truncate uppercase">{activeMix.title}</p>
                                                <div className="w-full h-0.5 bg-[#1a1a1a]/20 my-1"></div>
                                                <p className="text-[8px] text-center text-[#1a1a1a]/60 uppercase tracking-[0.2em]">TFI High Fidelity</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-4 px-2">
                                                <div className="flex gap-6 items-center">
                                                    <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center"><div className="w-full h-0.5 bg-white"></div></motion.div>
                                                    <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center"><div className="w-full h-0.5 bg-white"></div></motion.div>
                                                </div>
                                                <span className="bg-[#1a1a1a] text-white px-3 py-1 text-xs font-bold border-2 border-white">{activeMix.songs.length} SONGS</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="absolute text-gray-400 font-mono text-sm tracking-widest bg-black px-2 py-1 animate-pulse">NO CASSETTE</div>
                            )}
                        </div>

                        {/* Status Bar */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-[#d4d8cc] p-3 border-2 border-[#1a1a1a] shadow-inner font-mono flex justify-between items-center">
                                <span className="text-[#1a1a1a] font-bold tracking-widest text-sm uppercase">STATUS: {isLoaded ? (isPlaying ? "PLAYING" : "PAUSED") : "EMPTY"}</span>
                            </div>
                            <div className="w-16 bg-[#1a1a1a] flex items-center justify-center border-2 border-[#1a1a1a]">
                                <span className="font-black text-white text-xl">A</span>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                                <span>{formatTime(progress * duration)}</span>
                                <span>Side A</span>
                                <span>{formatTime(duration || 0)}</span>
                            </div>
                            <div
                                className="h-6 bg-gray-100 w-full border-2 border-[#1a1a1a] relative group cursor-pointer"
                                onClick={(e) => {
                                    if (duration && isLoaded) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(percent, 0), 1));
                                    }
                                }}
                            >
                                <motion.div
                                    className="h-full bg-[#0052cc] relative"
                                    style={{ width: `${safeProgress * 100}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/20"></div>
                                </motion.div>
                            </div>
                        </div>

                        <hr className="border-gray-200 my-1" />

                        {/* Controls */}
                        <div className="flex justify-center items-center gap-3 mb-2">
                            <button onClick={() => { playClick(); prev(); }} className="w-10 h-10 rounded-full border-2 border-[#1a1a1a] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
                                <SkipBack size={18} className="fill-current" />
                            </button>
                            <button onClick={() => { playClick(); togglePlay(); }} className="w-14 h-14 bg-[#0052cc] text-white rounded-full border-4 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center">
                                {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
                            </button>
                            <button onClick={() => { playClick(); next(); }} className="w-10 h-10 rounded-full border-2 border-[#1a1a1a] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
                                <SkipForward size={18} className="fill-current" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-2 text-xs font-mono text-gray-500 font-bold">
                            <button onClick={() => { playEject(); loadMix(""); }} className="flex flex-col items-center cursor-pointer hover:text-[#ff3333] transition-colors">
                                <LogOut size={14} />
                                <span className="mt-0.5 tracking-widest text-[9px] font-bold">EJECT</span>
                            </button>
                            <button
                                onClick={toggleLyrics}
                                className={`flex flex-col items-center cursor-pointer transition-colors ${showLyrics ? 'text-[#0052cc]' : 'hover:text-[#0052cc]'}`}
                            >
                                <Mic2 size={14} />
                                <span className="mt-0.5 tracking-widest text-[9px] font-bold">LYRICS</span>
                            </button>
                            <button
                                onClick={toggleEq}
                                className={`flex flex-col items-center cursor-pointer transition-colors ${showEq ? 'text-[#0052cc]' : 'hover:text-[#0052cc]'}`}
                            >
                                <SlidersHorizontal size={14} />
                                <span className="mt-0.5 tracking-widest text-[9px] font-bold">EQ</span>
                            </button>
                            <div className="flex items-center gap-1.5">
                                <Volume2 size={14} className="text-gray-400" />
                                <div className="h-1.5 w-16 bg-gray-200 rounded-full relative cursor-pointer border border-[#1a1a1a]"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        setVolume(Math.min(Math.max(p, 0), 1));
                                    }}>
                                    <div className="absolute top-0 left-0 bottom-0 bg-[#ffcc00] rounded-full" style={{ width: `${volume * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                    </motion.section>
                </main>

                <AnimatePresence>
                    {showLyrics && (
                        <LyricsView currentSong={currentSong} currentTime={progress * duration} onClose={() => setShowLyrics(false)} />
                    )}
                    {showEq && (
                        <EqualizerView onClose={() => setShowEq(false)} bands={eq.bands} setBand={eq.setBand} isEnabled={eq.isEnabled} setIsEnabled={eq.setIsEnabled} currentPreset={eq.currentPreset} setPreset={eq.setPreset} presets={eq.presets} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
