"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from 'html-to-image';
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Share2, Palette, Smartphone, Settings, Plus, Maximize2, Pencil, Camera } from "lucide-react";
import { ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { Mix, usePlayback } from "@/components/providers/playback-context";

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

export function BauhausStage({ currentTheme, onThemeChange, onSelectTheme, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowQueue, onShareMix, onSnapshotMix }: BauhausStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded
    } = usePlayback();

    const { playClick, playClunk, playEject } = useAudio();
    // const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

    const activeMix = mixes.find(m => m.id === activeMixId) || null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={containerRef} className="bg-[#f4f4f0] text-[#1a1a1a] h-screen flex flex-col font-sans overflow-hidden selection:bg-[#0052cc] selection:text-white relative">
            {/* Bauhaus Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-40 z-0"
                style={{
                    backgroundImage: `
                        linear-gradient(#e5e5e5 1px, transparent 1px), 
                        linear-gradient(90deg, #e5e5e5 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="w-full h-full mx-auto p-0 relative z-10 flex flex-col">

                {/* Header */}
                <header className="w-full p-4 flex flex-col md:flex-row justify-between items-center bg-white border-b-4 border-[#1a1a1a] relative z-20 gap-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] mb-4">
                    <div className="flex items-center gap-4 select-none">
                        <img src="/cassette-icon.png" alt="Cassette" className="w-10 h-10 pointer-events-none" />
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Melora</h1>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-center font-bold">
                        <button onClick={onCinemaMode} className="hidden md:flex items-center gap-2 bg-[#0052cc] text-white px-4 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all border-2 border-[#1a1a1a] text-sm">
                            <Maximize2 size={14} /> Cinema Mode
                        </button>
                        {/* Mobile Switch Removed */}
                        <button onClick={onCreateMix} className="flex items-center gap-2 bg-[#ffcc00] text-[#1a1a1a] border-2 border-[#1a1a1a] px-4 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-sm">
                            <Plus size={14} /> Create Mix
                        </button>

                        {/* Theme Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => onOpenThemeSelector?.()}
                                className="p-3 bg-white border-2 border-[#1a1a1a] hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                                title="Change Theme"
                            >
                                <Palette size={20} />
                            </button>
                        </div>

                        <button onClick={onOpenSettings} className="p-3 bg-white border-2 border-[#1a1a1a] hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                <main className="h-full overflow-hidden relative">
                    {/* Left Column: Mixtapes Grid */}
                    <section className="w-full h-full p-4 lg:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-32">
                        <div className="flex items-end gap-4 mb-8">
                            <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter">Your<br />Mixtapes</h2>
                            <div className="h-4 w-24 bg-[#ff3333] mb-2 hidden md:block"></div>
                            <div className="h-4 w-4 bg-[#0052cc] mb-2 rounded-full hidden md:block"></div>
                        </div>


                        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-w-full pb-32 pr-[400px]">
                            {mixes.map((mix, index) => {
                                // Assign colors cyclically
                                const mixColors = [
                                    { bg: "bg-[#0052cc]", text: "text-[#0052cc]" }, // Blue
                                    { bg: "bg-[#ff3333]", text: "text-[#ff3333]" }, // Red
                                    { bg: "bg-[#ffcc00]", text: "text-[#1a1a1a]" }, // Yellow
                                ];
                                const color = mixColors[index % mixColors.length];

                                return (
                                    <motion.div
                                        layoutId={mix.id}
                                        key={mix.id}
                                        drag
                                        dragConstraints={containerRef}
                                        whileDrag={{ scale: 1.05, zIndex: 100, rotate: 2 }}
                                        dragMomentum={false}
                                        onDragEnd={(e, info) => {
                                            const player = document.getElementById('stereo-player');
                                            if (player) {
                                                const rect = player.getBoundingClientRect();
                                                const { x, y } = info.point;
                                                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                                                    playClick();
                                                    loadMix(mix.id);
                                                }
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                        className={clsx("relative group cursor-grab active:cursor-grabbing hover:z-50", mix.id === activeMixId && "invisible pointer-events-none")}
                                    >
                                        <div
                                            id={`mix-card-${mix.id}`}
                                            className={clsx(
                                                "relative p-3 border-2 border-[#1a1a1a] transition-transform transform group-hover:scale-[1.02] h-42 flex flex-col justify-between shadow-[8px_8px_0px_0px_#1a1a1a]",
                                                color.bg
                                            )}
                                        >
                                            {/* Action Buttons */}
                                            <div className="absolute top-2 right-2 flex flex-row gap-1 z-20 no-snapshot">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }}
                                                    className="p-1.5 bg-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffcc00] transition-colors"
                                                    title="Edit Mix"
                                                >
                                                    <Pencil size={10} />
                                                </button>
                                                {/* Snapshot Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Use prop if available, or fallback to local logic?
                                                        // For now, keep local logic as it targets specific ID structure, but use onSnapshotMix if simpler?
                                                        // actually the prop version in stage.tsx is generic handles document.getElementById("snapshot-studio-node").
                                                        // Bauhaus has specific IDs like `mix-card-${mix.id}`.
                                                        // Let's keep the custom logic but switch icon to Camera
                                                        const node = document.getElementById(`mix-card-${mix.id}`);
                                                        if (node) {
                                                            toPng(node, {
                                                                filter: (n) => !n.classList?.contains('no-snapshot'),
                                                                cacheBust: true,
                                                                fontEmbedCSS: ''
                                                            })
                                                                .then((dataUrl) => {
                                                                    const link = document.createElement('a');
                                                                    link.download = `melora-${mix.title.replace(/\s+/g, '-').toLowerCase()}.png`;
                                                                    link.href = dataUrl;
                                                                    link.click();
                                                                    const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                                    navigator.clipboard.writeText(shareUrl);
                                                                })
                                                                .catch((err) => {
                                                                    console.error('Snapshot failed', err);
                                                                    const shareUrl = `${window.location.origin}?mix=${mix.id}`;
                                                                    navigator.clipboard.writeText(shareUrl);
                                                                    // Toast handled by parent
                                                                });
                                                        }
                                                    }}
                                                    className="p-1.5 bg-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffcc00] transition-colors"
                                                    title="Save Snapshot"
                                                >
                                                    <Camera size={10} />
                                                </button>
                                                {/* Share Button (New) */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }}
                                                    className="p-1.5 bg-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffcc00] transition-colors"
                                                    title="Share Mix"
                                                >
                                                    <Share2 size={10} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }}
                                                    className="p-1.5 bg-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffcc00] transition-colors"
                                                    title="Add Songs"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            </div>
                                            <div className={clsx("flex justify-between items-start", index % 3 === 2 ? "text-[#1a1a1a]" : "text-white/90")}>
                                                <span className="text-2xl font-black">A</span>
                                                <div className="flex gap-1">
                                                    {mix.id === activeMixId && <div className="animate-pulse w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                            </div>

                                            {/* Tape Label */}
                                            <div className={clsx("bg-white relative p-2 border-2 border-[#1a1a1a] shadow-sm mx-1", index % 2 === 0 ? "transform -rotate-1" : "transform rotate-1")}>
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black opacity-10 rounded-b"></div>
                                                <p className="font-mono text-center text-sm font-bold text-[#1a1a1a] tracking-tight truncate uppercase">{mix.title}</p>
                                                <div className="w-full h-0.5 bg-[#1a1a1a]/20 my-1"></div>
                                                <p className="text-[8px] text-center text-[#1a1a1a]/60 uppercase tracking-[0.2em]">TFI High Fidelity</p>
                                            </div>

                                            <div className="flex justify-between items-center mt-4 px-2">
                                                <div className="flex gap-6 items-center">
                                                    <div className={clsx("w-10 h-10 rounded-full border-4 flex items-center justify-center", index % 3 === 2 ? "border-[#1a1a1a]" : "border-white")}>
                                                        <div className={clsx("w-full h-0.5", index % 3 === 2 ? "bg-[#1a1a1a]" : "bg-white")}></div>
                                                    </div>
                                                    <div className={clsx("w-10 h-10 rounded-full border-4 flex items-center justify-center", index % 3 === 2 ? "border-[#1a1a1a]" : "border-white")}>
                                                        <div className={clsx("w-full h-0.5", index % 3 === 2 ? "bg-[#1a1a1a]" : "bg-white")}></div>
                                                    </div>
                                                </div>
                                                <span className="bg-[#1a1a1a] text-white px-3 py-1 text-xs font-bold border-2 border-white">{mix.songs.length} SONGS</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Right Column: Player */}
                    <motion.section
                        id="stereo-player"
                        drag
                        dragMomentum={false}
                        dragConstraints={containerRef}
                        whileDrag={{ scale: 1.02 }}
                        className="fixed right-6 top-24 w-[380px] bg-white border-4 border-[#1a1a1a] p-4 flex flex-col gap-4 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] z-50 max-h-[calc(100vh-80px)] overflow-y-auto [&::-webkit-scrollbar]:hidden cursor-move"
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
                                    {/* Render the Exact Card Design */}
                                    {(() => {
                                        const mixColors = [
                                            { bg: "bg-[#0052cc]", text: "text-white" },
                                            { bg: "bg-[#ff3333]", text: "text-white" },
                                            { bg: "bg-[#ffcc00]", text: "text-[#1a1a1a]" },
                                        ];
                                        const activeIndex = mixes.findIndex(m => m.id === activeMix.id);
                                        const color = activeIndex >= 0 ? mixColors[activeIndex % mixColors.length] : mixColors[0];

                                        return (
                                            <div className="relative w-[380px]">
                                                <div className={clsx(
                                                    "relative p-3 border-2 border-[#1a1a1a] h-42 flex flex-col justify-between shadow-[8px_8px_0px_0px_#1a1a1a]",
                                                    color.bg
                                                )}>
                                                    <div className={clsx("flex justify-between items-start", activeIndex % 3 === 2 ? "text-[#1a1a1a]" : "text-white/90")}>
                                                        <span className="text-2xl font-black">A</span>
                                                        <div className="flex gap-1">
                                                            <div className="animate-pulse w-2 h-2 bg-white rounded-full"></div>
                                                        </div>
                                                    </div>

                                                    <div className={clsx("bg-white relative p-2 border-2 border-[#1a1a1a] shadow-sm mx-1", activeIndex % 2 === 0 ? "transform -rotate-1" : "transform rotate-1")}>
                                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black opacity-10 rounded-b"></div>
                                                        <p className="font-mono text-center text-sm font-bold text-[#1a1a1a] tracking-tight truncate uppercase">{activeMix.title}</p>
                                                        <div className="w-full h-0.5 bg-[#1a1a1a]/20 my-1"></div>
                                                        <p className="text-[8px] text-center text-[#1a1a1a]/60 uppercase tracking-[0.2em]">TFI High Fidelity</p>
                                                    </div>

                                                    <div className="flex justify-between items-center mt-4 px-2">
                                                        <div className="flex gap-6 items-center">
                                                            <motion.div
                                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                                className={clsx("w-10 h-10 rounded-full border-4 flex items-center justify-center", activeIndex % 3 === 2 ? "border-[#1a1a1a]" : "border-white")}
                                                            >
                                                                <div className={clsx("w-full h-0.5", activeIndex % 3 === 2 ? "bg-[#1a1a1a]" : "bg-white")}></div>
                                                            </motion.div>
                                                            <motion.div
                                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                                className={clsx("w-10 h-10 rounded-full border-4 flex items-center justify-center", activeIndex % 3 === 2 ? "border-[#1a1a1a]" : "border-white")}
                                                            >
                                                                <div className={clsx("w-full h-0.5", activeIndex % 3 === 2 ? "bg-[#1a1a1a]" : "bg-white")}></div>
                                                            </motion.div>
                                                        </div>
                                                        <span className="bg-[#1a1a1a] text-white px-3 py-1 text-xs font-bold border-2 border-white">{activeMix.songs.length} SONGS</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </motion.div>

                            ) : (
                                <div className="absolute text-gray-400 font-mono text-sm tracking-widest bg-black px-2 py-1 animate-pulse">NO CASSETTE</div>
                            )}
                            <div className="absolute -top-10 -right-10 w-40 h-80 bg-gradient-to-l from-white/10 to-transparent skew-x-12 rotate-12 pointer-events-none z-30"></div>
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
                                        seek(percent);
                                    }
                                }}
                            >
                                <motion.div
                                    className="h-full bg-[#0052cc] relative"
                                    style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/20"></div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Meters */}
                        <div className="h-6 w-full flex gap-1 items-end">
                            <div className="flex-1 h-full flex gap-0.5 items-end opacity-80">
                                {[30, 60, 100, 50, 75, 40, 80, 100].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-[#ff3333]"
                                        animate={{ height: isPlaying ? [`${h}%`, `${Math.random() * 100}%`, `${h}%`] : `${h}%` }}
                                        transition={{ repeat: Infinity, duration: 0.2 }}
                                    />
                                ))}
                            </div>
                            <div className="flex-1 h-full flex gap-0.5 items-end justify-end opacity-80">
                                {[30, 60, 100, 50, 75].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-[#0052cc]"
                                        animate={{ height: isPlaying ? [`${h}%`, `${Math.random() * 100}%`, `${h}%`] : `${h}%` }}
                                        transition={{ repeat: Infinity, duration: 0.2 }}
                                    />
                                ))}
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Controls */}
                        <div className="flex items-end justify-between px-2 pb-4">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("w-3 h-3 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]", isLoaded ? "bg-red-500" : "bg-gray-400")}></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">PWR</span>
                                </div>
                                <button onClick={() => { playEject(); loadMix(null as any); }} className="w-10 h-10 bg-gray-200 border-2 border-[#1a1a1a] flex items-center justify-center hover:bg-[#ff3333] hover:text-white transition-colors group">
                                    <LogOut size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={() => { playClick(); prev(); }} className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
                                    <SkipBack size={24} className="fill-current" />
                                </button>
                                <button onClick={() => { playClick(); togglePlay(); }} className="w-24 h-24 bg-[#0052cc] text-white rounded-full border-4 border-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center">
                                    {isPlaying ? <Pause size={48} className="fill-current" /> : <Play size={48} className="fill-current ml-2" />}
                                </button>
                                <button onClick={() => { playClick(); next(); }} className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
                                    <SkipForward size={24} className="fill-current" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-2 h-full justify-end group">
                                <div className="w-3 h-20 bg-gray-100 border-2 border-[#1a1a1a] relative overflow-hidden flex items-end cursor-pointer rounded-full">
                                    <motion.div className="w-full bg-[#ffcc00] group-hover:bg-yellow-400" style={{ height: `${volume * 100}%` }} />
                                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <Volume2 size={16} className="text-gray-400" />
                            </div>
                        </div>
                    </motion.section >
                </main >
            </div >
        </div >
    );
}
