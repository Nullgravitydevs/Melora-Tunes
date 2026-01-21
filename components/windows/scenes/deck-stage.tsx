import { motion, AnimatePresence } from "framer-motion";
import { toPng } from 'html-to-image';
import { clsx } from "clsx";
import { usePlayback } from "@/components/providers/playback-context";
import { useAudio } from "@/hooks/use-audio";
import { ThemeConfig, ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useState, useRef, useEffect } from "react";
import { decodeHtml } from "@/lib/utils";
import { Settings, Smartphone, Palette, Maximize2, Plus, Pencil, Camera, Play, Pause, SkipBack, SkipForward, Volume2, Disc, Share2 } from "lucide-react";
import { Visualizer } from "@/components/ui/visualizer";
import { Mix } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal } from "lucide-react";

interface DeckStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    isMobileDevice?: boolean;
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


export function DeckStage({ currentTheme, onThemeChange, onSelectTheme, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowLyrics, onShowQueue, onShareMix, isMobileDevice }: DeckStageProps) {
    const [viewMode, setViewMode] = useState<'split' | 'rack' | 'player'>('split');
    const [isCompact, setIsCompact] = useState(false);

    // Guardrail Logic
    // Guardrail Logic (Pure Responsive)
    useEffect(() => {
        const checkGuardrail = () => {
            const width = window.innerWidth;
            const isSmall = width < 780; // Small Monitor / standard phone landscape

            if (isSmall) {
                // Safety: Force view mode if too small
                if (viewMode === 'split') setViewMode('rack');
                setIsCompact(false);
            } else {
                // Wide enough regarding width
                if (viewMode !== 'split') setViewMode('split');
                setIsCompact(width < 1024);
            }
        };

        checkGuardrail();
        window.addEventListener('resize', checkGuardrail);
        return () => window.removeEventListener('resize', checkGuardrail);
    }, [viewMode]);

    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isEjecting, setIsEjecting] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded, eq
    } = usePlayback();

    const isDraggingRef = useRef(false);

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEndAction = () => {
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 50);
    };

    const handleClick = (callback: () => void) => {
        if (!isDraggingRef.current) {
            callback();
        }
    };

    const { playClick, playClunk, playEject, playInsert } = useAudio();
    const theme = THEMES[currentTheme];

    const activeMix = mixes.find(m => m.id === activeMixId);
    const hasCassette = !!activeMix;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const songDuration = currentSong?.duration ? parseInt(currentSong.duration.toString()) : 200;
    const currentTime = progress * songDuration;

    const handleDragEnd = (event: any, info: any, mixId: string) => {
        if (playerRef.current) {
            const playerRect = playerRef.current.getBoundingClientRect();
            const { x, y } = info.point;

            if (
                x >= playerRect.left &&
                x <= playerRect.right &&
                y >= playerRect.top &&
                y <= playerRect.bottom
            ) {
                if (activeMixId !== mixId) {
                    playInsert();
                    loadMix(mixId);
                }
            }
        }
    };

    const cassetteColors: Record<string, string> = {
        purple: "bg-purple-600",
        orange: "bg-orange-500",
        green: "bg-green-600",
        red: "bg-red-600",
        white: "bg-gray-200"
    };

    const accentColors: Record<string, string> = {
        purple: "bg-purple-300",
        orange: "bg-orange-300",
        green: "bg-green-300",
        red: "bg-red-300",
        white: "bg-gray-400"
    };

    return (
        <div ref={containerRef} className={clsx(
            "min-h-screen flex flex-col font-sans overflow-x-hidden selection:bg-purple-500 selection:text-white",
            theme.bodyGradient // Use theme background
        )}>
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {/* Header - Consolidated Layout but Individually Draggable Items */}
            <header className="w-full px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 z-50 relative pointer-events-none">
                {/* Title Section */}
                <motion.div
                    className="flex items-center gap-3 select-none pointer-events-auto transform-gpu cursor-move"
                    drag
                    dragMomentum={true}
                    dragConstraints={containerRef}
                    dragElastic={0.2}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEndAction}
                >
                    {currentTheme !== 'METAL' && (
                        <img src="/cassette-icon.png" alt="Cassette" className="w-10 h-10 pointer-events-none" />
                    )}
                    <h1 className={clsx("font-display text-4xl tracking-tighter mt-1",
                        currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' || currentTheme === 'SILVERFROST' ? "text-gray-900" : "text-white"
                    )}>
                        Melora Tunes
                    </h1>
                </motion.div>

                {/* Toolbar Section */}
                <div className="flex items-center gap-4 pointer-events-auto">
                    {/* Settings Button */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEndAction}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onOpenSettings?.(); })}
                            className={clsx("p-2 rounded-full transition-colors",
                                currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' ? "text-gray-500 hover:bg-black/5" : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title="Settings"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Settings size={20} />
                        </button>
                    </motion.div>

                    {/* Theme Palette Button */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEndAction}
                        className="relative transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onOpenThemeSelector?.(); })}
                            className={clsx("p-2 rounded-full transition-colors",
                                currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' ? "text-gray-500 hover:bg-black/5" : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title="Change Theme"
                        >
                            <Palette size={20} />
                        </button>
                    </motion.div>

                    {/* Cinema Mode */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEndAction}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onCinemaMode?.(); })}
                            className="hidden md:flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                        >
                            <Maximize2 size={16} />
                            Cinema Mode
                        </button>
                    </motion.div>

                    {/* Create Mix */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEndAction}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onCreateMix?.(); })}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-white text-black font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                        >
                            <Plus size={16} />
                            Create Mix
                        </button>
                    </motion.div>
                </div>
            </header>

            {/* Main Content - Grid Layout */}
            <main className={clsx(
                "flex-grow w-full max-w-7xl mx-auto p-4 transition-all duration-300 items-start relative",
                isCompact ? "gap-2 p-1" : "gap-12 lg:p-8",
                viewMode === 'split' ? "grid grid-cols-1 lg:grid-cols-12" : "flex flex-col"
            )}>
                {/* Navigation Controls (Guardrail Mode Only) */}
                {viewMode !== 'split' && (
                    <div className="w-full flex justify-center gap-4 mb-4 sticky top-0 z-[60] py-2 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-md rounded-xl">
                        <button
                            onClick={() => { playClick(); setViewMode('rack'); }}
                            className={clsx("px-6 py-2 rounded-full font-bold shadow-lg transition-all border-2",
                                viewMode === 'rack' ? "bg-white text-black border-white scale-105" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                            )}
                        >
                            Tape Rack
                        </button>
                        <button
                            onClick={() => { playClick(); setViewMode('player'); }}
                            className={clsx("px-6 py-2 rounded-full font-bold shadow-lg transition-all border-2",
                                viewMode === 'player' ? "bg-white text-black border-white scale-105" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                            )}
                        >
                            Go to Player
                        </button>
                    </div>
                )}

                {/* Left Column: Mixtapes */}
                {viewMode !== 'player' && (
                    <section className={clsx(
                        "flex flex-col gap-8 transition-all",
                        viewMode === 'split' ? "lg:col-span-7" : "w-full"
                    )}>
                        {viewMode === 'split' && (
                            <motion.h2
                                className={clsx("font-display text-2xl md:text-3xl uppercase tracking-widest mb-4 opacity-80 pl-2 cursor-move transform-gpu inline-block",
                                    currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' ? "text-gray-800" : "text-gray-600"
                                )}
                                drag
                                dragMomentum={false}
                                dragConstraints={containerRef}
                            >
                                Your Mixtapes
                            </motion.h2>
                        )}
                        <div className={clsx(
                            "grid gap-4 pb-12",
                            isCompact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                        )}>
                            {mixes.map((mix, i) => {
                                if (mix.id === activeMixId) return null;

                                const bgColor = cassetteColors[mix.color] || "bg-orange-500";
                                const accentColor = accentColors[mix.color] || "bg-orange-300";

                                return (
                                    <motion.div
                                        key={mix.id}
                                        drag={viewMode === 'split'} // Disable drag in Rack Mode (Click only)
                                        dragConstraints={containerRef}
                                        dragElastic={0.2}
                                        dragMomentum={true}
                                        onDragEnd={(e, info) => handleDragEnd(e, info, mix.id)}
                                        // Click handler for Guardrail (Rack Mode)
                                        onClick={() => {
                                            if (viewMode === 'rack') {
                                                playClunk();
                                                loadMix(mix.id);
                                                setViewMode('player'); // Auto-switch
                                                setToast(`Loading ${mix.title}...`);
                                            }
                                        }}
                                        whileDrag={{ zIndex: 9999, scale: 1.1, cursor: "grabbing" }}
                                        className={clsx(
                                            "group relative w-full aspect-[3/2] rounded-lg shadow-lg hover:shadow-xl p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transform-gpu will-change-transform",
                                            bgColor
                                        )}
                                        id={`studio-mix-${mix.id}`}
                                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 4px)' }}
                                    >
                                        {/* Screws */}
                                        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-300 shadow-inner flex items-center justify-center">
                                            <div className="w-1 h-0.5 bg-gray-400 rotate-45"></div>
                                        </div>
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-300 shadow-inner flex items-center justify-center">
                                            <div className="w-1 h-0.5 bg-gray-400 -rotate-45"></div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-300 shadow-inner flex items-center justify-center">
                                            <div className="w-1 h-0.5 bg-gray-400 rotate-12"></div>
                                        </div>
                                        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-300 shadow-inner flex items-center justify-center">
                                            <div className="w-1 h-0.5 bg-gray-400 -rotate-12"></div>
                                        </div>

                                        {/* Label */}
                                        <div className="relative bg-amber-50 mx-2 mt-1 h-20 rounded-sm shadow-sm p-1 transform rotate-0 group-hover:rotate-[0.5deg] transition-transform duration-500 flex flex-col justify-center items-center">
                                            <div className={clsx("absolute top-0 left-0 w-full h-3 opacity-20", accentColor)}></div>
                                            <div className="absolute top-1 left-1 font-mono font-bold text-gray-800 text-sm opacity-60">A</div>
                                            <h3 className="font-hand font-bold text-sm text-gray-900 tracking-tight text-center line-clamp-2">
                                                {mix.title}
                                            </h3>
                                            <p className="font-mono text-[10px] text-gray-400 absolute bottom-1 uppercase tracking-widest">Melora High Bias</p>
                                            <div className="w-full h-px bg-gray-200 mt-2 mb-1"></div>
                                            <div className="w-full h-px bg-gray-200"></div>
                                        </div>

                                        {/* Reels */}
                                        <div className="mx-4 mb-1 h-8 bg-black/20 rounded-full flex items-center justify-between px-2 relative backdrop-blur-sm">
                                            {/* Left Reel */}
                                            <div className={clsx(
                                                "w-8 h-8 bg-white rounded-full border-2 border-gray-800 flex items-center justify-center relative",
                                                "group-hover:animate-spin"
                                            )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400"></div>
                                                <div className="absolute w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                                            </div>

                                            <div className="flex-grow h-4 mx-1 flex items-center justify-center">
                                                <span className="text-[6px] text-white/50 font-mono">TYPE I</span>
                                            </div>

                                            {/* Right Reel */}
                                            <div className={clsx(
                                                "w-8 h-8 bg-white rounded-full border-2 border-gray-800 flex items-center justify-center relative",
                                                "group-hover:animate-spin"
                                            )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400"></div>
                                                <div className="absolute w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                                            </div>
                                        </div>

                                        {/* Song Count Badge */}
                                        <div className="absolute -right-1 top-2/3 bg-black text-white text-[9px] font-bold py-0.5 px-2 rounded shadow-md border border-gray-700">
                                            {mix.songs.length} SONGS
                                        </div>

                                        {/* Action Buttons (Edit/Share/Add) */}
                                        <div className="absolute -top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 ease-out no-snapshot z-50" onPointerDown={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }}
                                                className="flex items-center justify-center w-6 h-7 bg-[#fef3c7] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                title="Edit Mix"
                                            >
                                                <Pencil size={12} className="text-blue-900" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const node = document.getElementById(`studio-mix-${mix.id}`);
                                                    if (node) {
                                                        toPng(node, {
                                                            filter: (n) => !n.classList?.contains('no-snapshot'),
                                                            pixelRatio: 2,
                                                            cacheBust: true,
                                                            fontEmbedCSS: ''
                                                        })
                                                            .then((dataUrl) => {
                                                                const link = document.createElement('a');
                                                                link.download = `melora-studio-${mix.title.replace(/\s+/g, '-').toLowerCase()}.png`;
                                                                link.href = dataUrl;
                                                                link.click();
                                                                const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                                navigator.clipboard.writeText(shareUrl);
                                                                setToast("Snapshot saved! Link copied 📸");
                                                                setTimeout(() => setToast(null), 3000);
                                                            })
                                                            .catch((err) => {
                                                                console.error("Snapshot failed", err);
                                                                const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                                navigator.clipboard.writeText(shareUrl);
                                                                setToast("Snapshot failed. Link copied!");
                                                                setTimeout(() => setToast(null), 3000);
                                                            });
                                                    }
                                                }}
                                                className="flex items-center justify-center w-6 h-7 bg-[#f4f4f5] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                title="Share Snapshot"
                                            >
                                                <Camera size={12} className="text-zinc-800" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }}
                                                className="flex items-center justify-center w-6 h-7 bg-[#e0f2fe] shadow-md hover:-translate-y-0.5 transition-transform"
                                                title="Share Mix"
                                            >
                                                <Share2 size={12} className="text-blue-900" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }}
                                                className="flex items-center justify-center w-6 h-7 bg-[#dcfce7] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                title="Add Songs"
                                            >
                                                <Plus size={12} className="text-green-900" strokeWidth={3} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Right Column: Player */}
                {viewMode !== 'rack' && (
                    <motion.section
                        className={clsx(
                            "sticky top-8 z-40 transform-gpu will-change-transform",
                            viewMode === 'split' ? "lg:col-span-5" : "w-full flex justify-center"
                        )}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={true}
                        dragElastic={0.2}
                        whileDrag={{ zIndex: 100, cursor: "grabbing" }}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent interfering with parent gestures if any
                    >
                        <div
                            ref={playerRef}
                            className={clsx(
                                "bg-[#f8fafc] text-gray-800 rounded-2xl p-4 md:p-5 shadow-md border-4 border-gray-300 relative overflow-hidden",
                                isCompact ? "max-w-full w-full" : "max-w-[340px]"
                            )}
                        >
                            {/* Corner Screws */}
                            <div className="absolute top-4 left-4 text-gray-400">
                                <Plus size={14} />
                            </div>
                            <div className="absolute top-4 right-4 text-gray-400">
                                <Plus size={14} />
                            </div>
                            <div className="absolute bottom-4 left-4 text-gray-400">
                                <Plus size={14} />
                            </div>
                            <div className="absolute bottom-4 right-4 text-gray-400">
                                <Plus size={14} />
                            </div>

                            {/* Title */}
                            {!isCompact && (
                                <div className="text-center mb-4">
                                    <h2 className="font-display text-gray-300 text-lg uppercase tracking-tighter">
                                        Stereo Cassette Player
                                    </h2>
                                    <p className="text-[10px] font-mono text-gray-400 tracking-[0.2em] mt-0.5">AUTO REVERSE</p>
                                </div>
                            )}

                            {/* Screen */}
                            <div className={clsx(
                                "bg-[#1e1e1e] w-full rounded-lg shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6)] relative mb-4 border-b-2 border-gray-700 flex items-center justify-center overflow-hidden",
                                isCompact ? "h-32" : "aspect-[16/9]"
                            )}>
                                {/* Scanlines */}
                                <div className="absolute inset-0 z-10 pointer-events-none opacity-20" style={{
                                    background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))',
                                    backgroundSize: '100% 4px'
                                }}></div>
                                {/* Glass Reflection */}
                                <div className="absolute top-2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent z-10"></div>
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent z-20 pointer-events-none"></div>

                                {hasCassette && activeMix ? (
                                    <motion.div
                                        className="w-[95%] h-[92%] rounded-md shadow-lg border-t border-l border-white/20 border-b border-r border-black/30 p-1.5 flex flex-col justify-between relative z-10"
                                        style={{
                                            backgroundColor: activeMix.color === 'purple' ? '#9333ea' :
                                                activeMix.color === 'orange' ? '#f97316' :
                                                    activeMix.color === 'green' ? '#16a34a' :
                                                        activeMix.color === 'red' ? '#dc2626' : '#e5e7eb',
                                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 4px)'
                                        }}
                                    >
                                        {/* Screws */}
                                        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-gray-300 shadow-sm flex items-center justify-center"><div className="w-full h-[0.5px] bg-gray-500 rotate-45"></div></div>
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gray-300 shadow-sm flex items-center justify-center"><div className="w-full h-[0.5px] bg-gray-500 rotate-45"></div></div>
                                        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-gray-300 shadow-sm flex items-center justify-center"><div className="w-full h-[0.5px] bg-gray-500 rotate-45"></div></div>
                                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-gray-300 shadow-sm flex items-center justify-center"><div className="w-full h-[0.5px] bg-gray-500 rotate-45"></div></div>

                                        {/* Label */}
                                        <div className="relative bg-amber-50 mx-1 mt-0.5 h-16 rounded-sm shadow-sm p-1 flex flex-col justify-center items-center">
                                            <div className="absolute top-0 left-0 w-full h-2 opacity-20 bg-black/10"></div>
                                            <div className="absolute top-1 left-1 font-mono font-bold text-gray-800 text-[10px] opacity-60">A</div>
                                            <h3 className="font-hand font-bold text-xs text-gray-900 tracking-tight text-center line-clamp-1">
                                                {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                            </h3>
                                            <p className="font-mono text-[8px] text-gray-400 absolute bottom-0.5 uppercase tracking-widest">Melora High Bias</p>
                                        </div>

                                        {/* Reels */}
                                        <div className="mx-3 mb-0.5 h-6 bg-black/20 rounded-full flex items-center justify-between px-2 relative">
                                            {/* Left Reel */}
                                            <motion.div
                                                className="w-6 h-6 bg-white rounded-full border-2 border-gray-800 flex items-center justify-center relative"
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            >
                                                <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400"></div>
                                                <div className="absolute w-1 h-1 bg-gray-800 rounded-full"></div>
                                            </motion.div>

                                            <div className="flex-grow h-3 mx-1 flex items-center justify-center">
                                                <span className="text-[5px] text-white/50 font-mono">TYPE I</span>
                                            </div>

                                            {/* Right Reel */}
                                            <motion.div
                                                className="w-6 h-6 bg-white rounded-full border-2 border-gray-800 flex items-center justify-center relative"
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            >
                                                <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400"></div>
                                                <div className="absolute w-1 h-1 bg-gray-800 rounded-full"></div>
                                            </motion.div>
                                        </div>

                                        {/* Song Count Badge */}
                                        <div className="absolute -right-1 top-2/3 bg-black text-white text-[8px] font-bold py-0 px-1.5 rounded shadow-md border border-gray-700">
                                            {activeMix.songs.length} SONGS
                                        </div>
                                    </motion.div>
                                ) : (
                                    <p className="font-mono text-gray-600 text-sm tracking-widest z-0">NO CASSETTE</p>
                                )}
                            </div>

                            {/* LCD Display */}
                            <div className="bg-[#9ca3af] h-10 w-full rounded-md shadow-inner mb-3 flex items-center px-3 border border-gray-400/30">
                                <span className="font-mono text-black font-bold tracking-widest text-sm">
                                    {currentSong ? `▶ ${decodeHtml(currentSong.name).substring(0, 16)}...` : "READY"}
                                </span>
                            </div>

                            {/* Visualizer */}
                            <Visualizer isPlaying={isPlaying} accentColor="#22c55e" className="w-full h-6 rounded mb-4" />

                            {/* Progress Bar */}
                            <div className="mb-6 px-1">
                                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(songDuration)}</span>
                                </div>
                                <div
                                    className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner cursor-pointer"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div className="h-full bg-gray-800" style={{ width: `${progress * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Playback Controls */}
                            <div className="flex justify-center items-center gap-4 mb-6">
                                <button
                                    onClick={() => { playClick(); prev(); }}
                                    className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-2 border-blue-300"
                                >
                                    <SkipBack size={20} />
                                </button>
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-4 border-blue-300 z-10"
                                >
                                    {isPlaying ? <Pause size={28} /> : <Play size={28} className="pl-0.5" />}
                                </button>
                                <button
                                    onClick={() => { playClick(); next(); }}
                                    className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-2 border-blue-300"
                                >
                                    <SkipForward size={20} />
                                </button>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex items-center justify-between px-4 text-xs font-mono text-gray-500 font-bold">
                                {!isCompact && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 shadow-inner"></div>
                                            <span>REC</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <span>BATT</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        playEject();
                                        setIsEjecting(true);
                                        setTimeout(() => {
                                            loadMix("");
                                            setIsEjecting(false);
                                            // Auto Switch back to Rack
                                            if (viewMode === 'player') setViewMode('rack');
                                        }, 500);
                                    }}
                                    disabled={isEjecting}
                                    className={`flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors ${isEjecting ? 'opacity-50' : ''}`}
                                >
                                    <Disc size={14} />
                                    <span className="mt-0.5 tracking-widest text-[9px]">EJECT</span>
                                </button>

                                <button
                                    onClick={() => setShowLyrics(prev => !prev)}
                                    className={`flex flex-col items-center cursor-pointer transition-colors ${showLyrics ? 'text-blue-500' : 'hover:text-blue-600'}`}
                                >
                                    <Mic2 size={14} />
                                    <span className="mt-0.5 tracking-widest text-[9px]">LYRICS</span>
                                </button>

                                <button
                                    onClick={() => setShowEq(prev => !prev)}
                                    className={`flex flex-col items-center cursor-pointer transition-colors ${showEq ? 'text-blue-500' : 'hover:text-blue-600'}`}
                                >
                                    <SlidersHorizontal size={14} />
                                    <span className="mt-0.5 tracking-widest text-[9px]">EQ</span>
                                </button>

                                <div className="flex items-center gap-2 w-24">
                                    <Volume2 size={14} className="text-gray-400" />
                                    <div
                                        className="h-1 flex-grow bg-gray-300 rounded-full relative cursor-pointer z-50"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const p = (e.clientX - rect.left) / rect.width;
                                            setVolume(Math.min(Math.max(p, 0), 1));
                                        }}
                                    >
                                        <div className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }}></div>
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-400 rounded-full shadow-sm pointer-events-none"
                                            style={{ left: `calc(${volume * 100}% - 4px)` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}
            </main>
            {/* Overlays */}
            <AnimatePresence>
                {showLyrics && (
                    <LyricsView
                        currentSong={currentSong}
                        currentTime={progress * songDuration} // DeckStage uses progress ratio * derived duration
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
        </div >
    );
}
