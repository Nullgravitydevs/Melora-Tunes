"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { isPlayableTrack } from "@/lib/types";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
    Palette, Settings, Plus, Tv, Pencil, Camera, Search, Share2, LogOut
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";
import { getThumbnailUrl } from "@/lib/jiosaavn";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal } from "lucide-react";

interface BoomboxStageProps {
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

// Draggable Polaroid component that manages its own position
export interface Position { x: number; y: number; rotation: number; }

// Draggable Polaroid component that manages its own position
function DraggablePolaroid({
    mix,
    position,
    isInsidePlayer,
    albumArt,
    playerRef,
    onDropOnPlayer,
    onHoverPlayer,
    onEditMix,
    onSnapshotMix,
    onOpenSearch,
    onShareMix,
    onPositionChange
}: {
    mix: Mix;
    position: Position;
    isInsidePlayer: boolean;
    albumArt: string | null;
    playerRef: React.RefObject<HTMLDivElement | null>;
    onDropOnPlayer: (mix: Mix) => void;
    onHoverPlayer: (isOver: boolean) => void;
    onEditMix?: (mix: Mix) => void;
    onSnapshotMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onShareMix?: (mix: Mix) => void;
    onPositionChange: (id: string, newPos: { x: number, y: number }) => void;
}) {
    const x = useMotionValue(position.x);
    const y = useMotionValue(position.y);
    const [showButtons, setShowButtons] = useState(false);

    // Cache rect to avoid thrashing
    const playerRectRef = useRef<DOMRect | null>(null);

    // Sync MotionValues if parent updates (e.g. reload)
    useEffect(() => {
        x.set(position.x);
        y.set(position.y);
    }, [position.x, position.y, x, y]);

    const handleDragStart = () => {
        if (playerRef.current) {
            playerRectRef.current = playerRef.current.getBoundingClientRect();
        }
    };

    const handleDrag = (_: any, info: any) => {
        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            const isOver = info.point.x >= rect.left && info.point.x <= rect.right &&
                info.point.y >= rect.top && info.point.y <= rect.bottom;
            onHoverPlayer(isOver);
        }
    };

    const handleDragEnd = (_: any, info: any) => {
        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            if (info.point.x >= rect.left && info.point.x <= rect.right &&
                info.point.y >= rect.top && info.point.y <= rect.bottom) {
                onDropOnPlayer(mix);
            }
        }
        onHoverPlayer(false);
        playerRectRef.current = null; // Clear cache

        // Persist new position
        onPositionChange(mix.id, { x: x.get(), y: y.get() });
    };

    return (
        <motion.div
            drag={!isInsidePlayer}
            dragMomentum={false} // Disable momentum for precise drops
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onMouseEnter={() => setShowButtons(true)}
            onMouseLeave={() => setShowButtons(false)}
            style={{ x, y, rotate: position.rotation }}
            className={clsx(
                "absolute top-0 left-0 cursor-grab active:cursor-grabbing select-none z-20",
                isInsidePlayer && "opacity-50 cursor-default" // Stuck in player
            )}
            whileDrag={{ scale: 1.1, zIndex: 100, rotate: 0 }}
            whileHover={{ scale: 1.05, zIndex: 50 }}
        >
            {!isInsidePlayer && (
                <div className="bg-white p-2 pb-6 shadow-lg transition-all duration-300">
                    <div className="w-24 h-24 relative overflow-hidden">
                        {albumArt ? (
                            <img
                                src={albumArt}
                                alt={mix.title}
                                className="w-full h-full object-cover filter sepia-[0.2] contrast-[1.1]"
                                draggable={false}
                            />
                        ) : (
                            <div className="bg-neutral-800 w-full h-full flex items-center justify-center">
                                <div className="flex gap-4">
                                    <div className="w-4 h-4 rounded-full bg-white/20" />
                                    <div className="w-4 h-4 rounded-full bg-white/20" />
                                </div>
                            </div>
                        )}
                        {showButtons && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1">
                                {/* Stop Propagation on pointer events to prevent drag start */}
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Edit Mix"><Pencil size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Snapshot"><Camera size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Share"><Share2 size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Add Songs"><Search size={12} className="text-gray-700" /></button>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-800 text-[9px] font-bold text-center mt-1 truncate max-w-[96px]" style={{ fontFamily: "'Permanent Marker', cursive" }}>
                        {mix.title}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// Generate single random position
const generatePosition = (index: number): Position => {
    const side = index % 4;
    let x, y;
    if (side === 0) { x = 40 + Math.random() * 150; y = 120 + Math.random() * 200; }
    else if (side === 1) { x = 40 + Math.random() * 180; y = 400 + Math.random() * 120; }
    else if (side === 2) { x = 680 + Math.random() * 200; y = 100 + Math.random() * 180; }
    else { x = 650 + Math.random() * 250; y = 400 + Math.random() * 120; }
    return { x, y, rotation: -12 + Math.random() * 24 };
};

export function BoomboxStage({
    currentTheme, onThemeChange, onSelectTheme, onOpenSettings,
    onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onSnapshotMix, onShowQueue, onShareMix
}: BoomboxStageProps) {
    const playerRef = useRef<HTMLDivElement>(null!); // Corrected type safety
    const [isOverPlayer, setIsOverPlayer] = useState(false);

    // State Refactor: Record<mixId, Position>
    const [positions, setPositions] = useState<Record<string, Position>>({});

    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);

    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, togglePlay, next, prev, setVolume, isLoaded, seek,
        shuffle, setShuffle, repeat, setRepeat, eq
    } = usePlayback();

    const { playClick, playInsert } = useAudio();

    // Memoized active mix check
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Robust Initialization & Sync
    useEffect(() => {
        setPositions(prev => {
            const nextState = { ...prev };
            let hasChanges = false;

            mixes.forEach((mix, index) => {
                if (!nextState[mix.id]) {
                    nextState[mix.id] = generatePosition(index);
                    hasChanges = true;
                }
            });

            return hasChanges ? nextState : prev;
        });
    }, [mixes]); // Runs when mixes change (add/remove)

    const updatePosition = (id: string, newPos: { x: number, y: number }) => {
        setPositions(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newPos }
        }));
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMixImage = (mix: Mix): string | null => {
        if (mix.songs.length > 0) {
            const item = mix.songs[0];
            const song = isPlayableTrack(item) ? item.song : item;
            if (song) return getThumbnailUrl(song);
        }
        return null;
    };

    const handleDropOnPlayer = (mix: Mix) => {
        playInsert();
        loadMix(mix.id);
        setIsOverPlayer(false); // Reset hover
    };

    // Exclusive Overlay Toggles
    const toggleLyrics = () => {
        if (!showLyrics) setShowEq(false); // Close others
        setShowLyrics(!showLyrics);
    };

    const toggleEq = () => {
        if (!showEq) setShowLyrics(false); // Close others
        setShowEq(!showEq);
    };

    // Safe Progress
    const safeProgress = Math.min(Math.max(progress || 0, 0), 1);
    const displayedTime = formatTime(Math.min(safeProgress * duration, duration));

    return (
        <div
            className="w-full h-screen overflow-hidden relative"
            style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: '#3e2f24',
                backgroundImage: 'radial-gradient(#4a3b32 15%, transparent 16%), radial-gradient(#36281e 15%, transparent 16%)',
                backgroundSize: '60px 60px',
                backgroundPosition: '0 0, 30px 30px'
            }}
        >
            <style jsx global>{`::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-30">
                <div className="transform -rotate-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 py-2 shadow-lg border-2 border-white/20"
                    style={{ clipPath: 'polygon(5% 0%, 100% 0%, 100% 85%, 95% 100%, 0% 100%, 0% 15%)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-300 text-2xl">📻</span>
                        <h1 className="font-black tracking-tighter text-xl italic uppercase">Melora Tunes</h1>
                    </div>
                </div>
                <nav className="hidden md:flex gap-4 items-center">
                    <button onClick={onCinemaMode} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform -rotate-1 shadow hover:-translate-y-1 transition-transform">
                        <Tv size={14} className="inline mr-1" /> Cinema
                    </button>
                    <button onClick={onCreateMix} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform rotate-1 shadow hover:-translate-y-1 transition-transform">
                        <Plus size={14} className="inline mr-1" /> New Tape
                    </button>
                </nav>
                <div className="flex gap-2">
                    <button onClick={onOpenThemeSelector} className="bg-neutral-800 border-2 border-neutral-600 rounded-full p-2 hover:border-yellow-400 transition-colors shadow-lg"><Palette size={18} className="text-white" /></button>
                    <button onClick={onOpenSettings} className="bg-neutral-800 border-2 border-neutral-600 rounded-full p-2 hover:border-yellow-400 transition-colors shadow-lg"><Settings size={18} className="text-white" /></button>
                </div>
            </header>

            {/* Sticky Note */}
            <div className="absolute top-20 left-6 z-20 bg-yellow-100 text-gray-900 p-4 shadow-md transform rotate-1 max-w-[180px]" style={{ fontFamily: "'Permanent Marker', cursive" }}>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm border border-red-700" />
                <p className="text-sm leading-tight">Drag tapes anywhere! Drop on boombox to play 🎵</p>
            </div>

            {/* BOOMBOX */}
            <div ref={playerRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[550px] px-4">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1/2 h-14 border-[14px] border-neutral-700 rounded-t-3xl -z-10 shadow-lg" />
                <div className={clsx(
                    "bg-yellow-400 w-full rounded-[32px] p-2 shadow-2xl border-b-8 border-r-8 border-black/20 transition-all duration-200",
                    isOverPlayer && "ring-4 ring-blue-500/50 scale-[1.02]"
                )}>
                    <div className="bg-yellow-400 border-[10px] border-neutral-700 rounded-[24px] p-4 flex flex-col gap-3 relative overflow-hidden">
                        {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
                            <div key={i} className={`absolute ${pos} w-3 h-3 bg-zinc-400 rounded-full flex items-center justify-center shadow-inner`}><div className="w-2 h-0.5 bg-zinc-600 rotate-45" /></div>
                        ))}

                        <div className="flex gap-3 items-center">
                            <div className="hidden md:block w-20 h-20 rounded-full border-[5px] border-zinc-700 shadow-inner bg-neutral-800 relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(#000 30%, transparent 31%)', backgroundSize: '4px 4px' }} />
                            </div>
                            <div className="flex-1 bg-neutral-800 p-2 rounded-lg border-4 border-zinc-700 shadow-inner flex flex-col gap-2">
                                <div className="relative h-14 rounded border-2 border-zinc-600/50 overflow-hidden" style={{ background: '#9ea792' }}>
                                    <div className="absolute inset-0 flex justify-between items-end p-2 text-neutral-800">
                                        <div className="flex flex-col"><span className="text-[8px] font-bold opacity-60 uppercase">Track</span><span className="text-lg font-bold font-mono leading-none">{isLoaded ? String(mixes.findIndex(m => m.id === activeMixId) + 1).padStart(2, '0') : '--'}</span></div>
                                        <div className="flex flex-col items-center flex-1 mx-2"><span className="text-[10px] font-mono font-bold uppercase truncate max-w-[150px]">{isLoaded ? (currentSong ? decodeHtml(currentSong.name) : activeMix?.title) : 'Insert Tape'}</span></div>
                                        <div className="flex flex-col items-end"><span className="text-[8px] font-bold opacity-60 uppercase">Time</span><span className="text-base font-bold font-mono leading-none">{displayedTime}</span></div>
                                    </div>
                                </div>
                                <div className="bg-neutral-900 rounded border border-zinc-700 h-16 relative flex items-center justify-center overflow-hidden">
                                    {isLoaded && activeMix ? (
                                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex gap-6">
                                            <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-5 h-5 rounded-full bg-white/20 border border-white/30" />
                                            <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-5 h-5 rounded-full bg-white/20 border border-white/30" />
                                        </motion.div>
                                    ) : (<span className="text-white/30 text-xs uppercase tracking-wider">Empty</span>)}
                                    {isLoaded && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                                </div>
                            </div>
                            <div className="hidden md:block w-20 h-20 rounded-full border-[5px] border-zinc-700 shadow-inner bg-neutral-800 relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(#000 30%, transparent 31%)', backgroundSize: '4px 4px' }} />
                            </div>
                        </div>

                        <div className="bg-neutral-800 rounded-lg p-2 border-t-2 border-white/10 flex flex-col gap-2">
                            <div
                                className="relative w-full h-4 flex items-center px-1 cursor-pointer overflow-hidden rounded-full"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const p = (e.clientX - rect.left) / rect.width;
                                    seek(Math.min(Math.max(p, 0), 1));
                                }}
                            >
                                <div className="absolute w-full h-1.5 bg-black rounded-full shadow-inner" />
                                <div className="absolute h-1.5 bg-blue-500 rounded-l-full" style={{ width: `${safeProgress * 100}%` }} />
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => { playClick(); setShuffle(!shuffle); }}
                                        className={`w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow active:translate-y-0.5 ${shuffle ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
                                        title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                    ><Shuffle size={14} /></button>
                                    <button
                                        onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                        className={`w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow active:translate-y-0.5 ${repeat !== 'off' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
                                        title={`Repeat: ${repeat.toUpperCase()}`}
                                    ><Repeat size={14} />{repeat === 'one' && <span className="absolute text-[8px] font-bold">1</span>}</button>
                                    <button
                                        onClick={() => { playClick(); toggleLyrics(); }}
                                        className={`w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow active:translate-y-0.5 ${showLyrics ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
                                        title="Lyrics"
                                    ><Mic2 size={14} /></button>
                                    <button
                                        onClick={() => { playClick(); toggleEq(); }}
                                        className={`w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow active:translate-y-0.5 ${showEq ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
                                        title="Equalizer"
                                    ><SlidersHorizontal size={14} /></button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => { playClick(); prev(); }} className="w-10 h-10 rounded bg-zinc-600 border-b-4 border-zinc-900 text-white flex items-center justify-center shadow active:translate-y-1 hover:bg-zinc-500"><SkipBack size={18} className="fill-current" /></button>
                                    <button onClick={() => { playClick(); togglePlay(); }} className="w-14 h-14 rounded-full bg-blue-500 border-b-[5px] border-blue-900 text-white flex items-center justify-center shadow-lg active:translate-y-[5px] hover:bg-blue-400">{isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current pl-0.5" />}</button>
                                    <button onClick={() => { playClick(); next(); }} className="w-10 h-10 rounded bg-zinc-600 border-b-4 border-zinc-900 text-white flex items-center justify-center shadow active:translate-y-1 hover:bg-zinc-500"><SkipForward size={18} className="fill-current" /></button>
                                </div>
                                <div className="hidden md:flex flex-col items-center gap-0.5 relative">
                                    <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-black shadow-lg relative flex items-center justify-center" style={{ transform: `rotate(${volume * 270 - 135}deg)` }}><div className="w-0.5 h-4 bg-white absolute -top-0 rounded" /></div>
                                    <span className="text-[8px] font-bold uppercase text-zinc-500">Vol</span>
                                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                {isLoaded && (
                                    <button
                                        onClick={() => { playClick(); loadMix(""); }} // Safe Call
                                        className="w-8 h-8 rounded bg-red-900/80 border-b-4 border-black text-white/70 flex items-center justify-center shadow active:translate-y-1 hover:bg-red-800 hover:text-white ml-2"
                                        title="Eject Tape"
                                    ><LogOut size={14} /></button>
                                )}
                            </div>
                        </div>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 font-black italic text-neutral-700/20 text-xs tracking-widest uppercase">Sport Edition</span>
                    </div>
                </div>
            </div>

            {/* DRAGGABLE POLAROIDS - Each manages its own position from persisted state */}
            {mixes.map((mix) => {
                const pos = positions[mix.id];
                if (!pos) return null; // Wait for init

                return (
                    <DraggablePolaroid
                        key={mix.id}
                        mix={mix}
                        position={pos}
                        isInsidePlayer={isLoaded && activeMixId === mix.id}
                        albumArt={getMixImage(mix)}
                        playerRef={playerRef}
                        onDropOnPlayer={handleDropOnPlayer}
                        onHoverPlayer={setIsOverPlayer}
                        onEditMix={onEditMix}
                        onSnapshotMix={onSnapshotMix}
                        onOpenSearch={onOpenSearch}
                        onShareMix={onShareMix}
                        onPositionChange={updatePosition}
                    />
                );
            })}

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
