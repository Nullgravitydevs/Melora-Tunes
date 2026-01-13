import { motion } from "framer-motion";
import { toPng } from 'html-to-image';
import { clsx } from "clsx";
import { usePlayback } from "@/components/providers/playback-context";
import { useAudio } from "@/hooks/use-audio";
import { ThemeConfig, ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useState, useRef } from "react";
import { decodeHtml } from "@/lib/utils";
import { Download, Upload, Settings, Smartphone, Palette, Maximize2, Plus, Pencil, Camera } from "lucide-react";
import { Visualizer } from "@/components/ui/visualizer";
import { Mix } from "@/components/providers/playback-context";

interface StudioStageProps {
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


export function StudioStage({ currentTheme, onThemeChange, onSelectTheme, onSwitchToMobile, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode }: StudioStageProps) {
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded
    } = usePlayback();

    const { playClick, playClunk, playEject } = useAudio();
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
                    playClunk();
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
        <div ref={containerRef} className="bg-black text-gray-100 min-h-screen flex flex-col font-sans overflow-x-hidden selection:bg-purple-500 selection:text-white">
            {/* Header */}
            <header className="w-full px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative">
                <div className="flex items-center gap-3 select-none">
                    {/* Logo - matching default theme */}
                    <img src="/cassette-icon.png" alt="Cassette" className="w-10 h-10 pointer-events-none" />
                    <h1 className="font-display text-4xl tracking-tighter text-white mt-1">
                        Melora
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10" title="Backup Library">
                        <Download size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10" title="Restore Library">
                        <Upload size={20} />
                    </button>

                    <button
                        onClick={() => { playClick(); onOpenSettings?.(); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>

                    {onSwitchToMobile && (
                        <button
                            onClick={() => { playClick(); onSwitchToMobile(); }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Switch to iPod Mode"
                        >
                            <Smartphone size={20} />
                        </button>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => { playClick(); setIsThemeMenuOpen(!isThemeMenuOpen); }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Change Theme"
                        >
                            <Palette size={20} />
                        </button>

                        {/* Theme Dropdown */}
                        {isThemeMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-2 min-w-[180px] z-50">
                                {Object.entries(THEMES).map(([key, theme]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            playClick();
                                            onSelectTheme?.(key as ThemeKey);
                                            setIsThemeMenuOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2",
                                            currentTheme === key ? "text-purple-400 bg-zinc-800" : "text-gray-300"
                                        )}
                                    >
                                        {currentTheme === key && <span className="text-purple-400">✓</span>}
                                        {theme.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => { playClick(); onCinemaMode?.(); }}
                        className="hidden md:flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                    >
                        <Maximize2 size={16} />
                        Cinema Mode
                    </button>
                    <button
                        onClick={() => { playClick(); onCreateMix?.(); }}
                        className="flex items-center gap-2 bg-gray-200 hover:bg-white text-black font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                    >
                        <Plus size={16} />
                        Create Mix
                    </button>
                </div>
            </header>

            {/* Main Content - Grid Layout */}
            <main className="flex-grow w-full max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
                {/* Left Column: Mixtapes */}
                <section className="lg:col-span-7 flex flex-col gap-8">
                    <h2 className="font-display text-2xl md:text-3xl text-gray-600 uppercase tracking-widest mb-4 opacity-80 pl-2">
                        Your Mixtapes
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                        {mixes.map((mix, i) => {
                            if (mix.id === activeMixId) return null;

                            const bgColor = cassetteColors[mix.color] || "bg-orange-500";
                            const accentColor = accentColors[mix.color] || "bg-orange-300";

                            return (
                                <motion.div
                                    layoutId={mix.id}
                                    key={mix.id}
                                    drag
                                    dragConstraints={containerRef}
                                    dragElastic={0.2}
                                    dragMomentum={true}
                                    onDragEnd={(e, info) => handleDragEnd(e, info, mix.id)}
                                    whileDrag={{ zIndex: 1000, scale: 1.05 }}
                                    className={clsx(
                                        "group relative w-full aspect-[3/2] rounded-lg shadow-lg hover:shadow-xl p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing",
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
                                    <div className="absolute -top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 ease-out no-snapshot" onPointerDown={(e) => e.stopPropagation()}>
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

                                                            // Also Copy Link
                                                            const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                            navigator.clipboard.writeText(shareUrl);
                                                            alert("Snapshot Downloading... Link Copied to Clipboard! 📸 clipboard");
                                                        })
                                                        .catch((err) => {
                                                            console.error("Snapshot failed", err);
                                                            // Fallback: Just copy link if image fails
                                                            const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                            navigator.clipboard.writeText(shareUrl);
                                                            alert("Snapshot failed (Security Block). Link Copied instead!");
                                                        });
                                                }
                                            }}
                                            className="flex items-center justify-center w-6 h-7 bg-[#f4f4f5] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                            title="Share Snapshot"
                                        >
                                            <Camera size={12} className="text-zinc-800" />
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

                {/* Right Column: Player */}
                <section className="lg:col-span-5 sticky top-8 z-50">
                    <motion.div
                        ref={playerRef}
                        drag
                        dragConstraints={containerRef}
                        dragElastic={0.1}
                        dragMomentum={true}
                        className="bg-[#f8fafc] text-gray-800 rounded-2xl p-4 md:p-5 shadow-2xl border-4 border-gray-300 relative overflow-hidden ring-1 ring-black/5 max-w-[340px] cursor-grab active:cursor-grabbing"
                    >
                        {/* Corner Screws */}
                        <div className="absolute top-4 left-4 text-gray-400">
                            <span className="material-icons-round text-sm">add</span>
                        </div>
                        <div className="absolute top-4 right-4 text-gray-400">
                            <span className="material-icons-round text-sm">add</span>
                        </div>
                        <div className="absolute bottom-4 left-4 text-gray-400">
                            <span className="material-icons-round text-sm">add</span>
                        </div>
                        <div className="absolute bottom-4 right-4 text-gray-400">
                            <span className="material-icons-round text-sm">add</span>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-4">
                            <h2 className="font-display text-gray-300 text-lg uppercase tracking-tighter drop-shadow-md">
                                Stereo Cassette Player
                            </h2>
                            <p className="text-[10px] font-mono text-gray-400 tracking-[0.2em] mt-0.5">AUTO REVERSE</p>
                        </div>

                        {/* Screen */}
                        <div className="bg-[#1e1e1e] w-full aspect-[16/9] rounded-lg shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6)] relative mb-4 border-b-2 border-gray-700 flex items-center justify-center overflow-hidden">
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
                                    layoutId={activeMix.id}
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
                                    <div className="mx-3 mb-0.5 h-6 bg-black/20 rounded-full flex items-center justify-between px-2 relative backdrop-blur-sm">
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
                                <span className="material-icons-round text-xl drop-shadow-md">skip_previous</span>
                            </button>
                            <button
                                onClick={() => { playClick(); togglePlay(); }}
                                className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-4 border-blue-300 z-10"
                            >
                                <span className="material-icons-round text-3xl ml-0.5 drop-shadow-md">
                                    {isPlaying ? 'pause' : 'play_arrow'}
                                </span>
                            </button>
                            <button
                                onClick={() => { playClick(); next(); }}
                                className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-2 border-blue-300"
                            >
                                <span className="material-icons-round text-xl drop-shadow-md">skip_next</span>
                            </button>
                        </div>

                        {/* Footer Controls */}
                        <div className="flex items-center justify-between px-4 text-xs font-mono text-gray-500 font-bold">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 shadow-inner"></div>
                                    <span>REC</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse"></div>
                                    <span>BATT</span>
                                </div>
                            </div>

                            <button
                                onClick={() => { playEject(); loadMix(""); }}
                                className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
                            >
                                <span className="material-icons-round text-sm">eject</span>
                                <span className="mt-0.5 tracking-widest text-[9px]">EJECT</span>
                            </button>

                            <div className="flex items-center gap-2 w-24">
                                <span className="material-icons-round text-base text-gray-400">volume_up</span>
                                <div
                                    className="h-1 flex-grow bg-gray-300 rounded-full relative cursor-pointer"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        setVolume(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full" style={{ width: `${volume * 100}%` }}></div>
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-400 rounded-full shadow-sm"
                                        style={{ left: `calc(${volume * 100}% - 4px)` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>
            </main>
        </div >
    );
}
