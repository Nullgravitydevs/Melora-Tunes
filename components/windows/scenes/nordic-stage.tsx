"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, Volume2, LogOut,
    Download, Upload, Palette, Smartphone, Settings, Plus, Maximize2, Camera, Share2
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { Mix, usePlayback } from "@/components/providers/playback-context";

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
        loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        isLoaded
    } = usePlayback();

    const { playClick, playEject } = useAudio();
    const activeMix = mixes.find(m => m.id === activeMixId) || null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full font-sans overflow-hidden relative bg-[#1a1c20] text-slate-200"
        >
            {/* Global Styles: Hide Scrollbars */}
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col h-screen w-full">

                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                            <div className="flex gap-1">
                                <div className="w-1 h-3 rounded-full bg-slate-300"></div>
                                <div className="w-1 h-3 rounded-full bg-slate-300"></div>
                            </div>
                        </div>
                        <h1 className="font-mono text-2xl font-bold tracking-widest uppercase text-white">
                            Melora <span className="text-xs align-top text-blue-400">NORDIC</span>
                        </h1>
                    </div>

                    <nav className="flex items-center gap-6">
                        <button onClick={onCinemaMode} className="hidden md:block font-mono text-sm tracking-widest uppercase hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400 pb-1">
                            Cinema Mode
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

                        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                            {mixes.map((mix) => (
                                <div
                                    key={mix.id}
                                    onClick={() => { playClick(); loadMix(mix.id); }}
                                    className={clsx(
                                        "group flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 border",
                                        mix.id === activeMixId
                                            ? "bg-slate-800 border-blue-500/50 shadow-lg"
                                            : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Mini Cassette Icon */}
                                        <div className="w-12 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded flex items-center justify-center border border-slate-500">
                                            <div className="w-6 h-4 bg-slate-900 rounded-sm flex items-center justify-around">
                                                <div className="w-1.5 h-1.5 rounded-full border border-slate-500"></div>
                                                <div className="w-1.5 h-1.5 rounded-full border border-slate-500"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-mono font-bold text-sm text-white">{mix.title}</h3>
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
                        <div className="bg-[#24272b] p-8 rounded-2xl shadow-2xl border border-slate-700/50">

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
                                            seek(percent);
                                        }
                                    }}
                                >
                                    <div
                                        className="absolute top-0 left-0 h-full bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors"
                                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <button
                                    onClick={() => { playClick(); prev(); }}
                                    className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                >
                                    <SkipBack className="fill-current" size={24} />
                                </button>
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="p-5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                                >
                                    {isPlaying ? <Pause className="fill-current" size={28} /> : <Play className="fill-current pl-1" size={28} />}
                                </button>
                                <button
                                    onClick={() => { playClick(); next(); }}
                                    className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                >
                                    <SkipForward className="fill-current" size={24} />
                                </button>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => { playEject(); loadMix(null as any); }}
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-blue-400 transition-colors uppercase tracking-widest"
                                >
                                    <LogOut size={16} />
                                    Eject
                                </button>

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
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
