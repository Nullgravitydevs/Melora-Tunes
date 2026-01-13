"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { usePlayback } from '@/components/providers/playback-context';
import { DesktopPlayer } from '@/components/ui/desktop-player';
import { Cassette } from '@/components/ui/cassette';
import { DesktopSettingsModal } from '@/components/ui/desktop-settings-modal';
import { SearchModal } from '@/components/ui/search-modal';
import { QueueModal } from "@/components/ui/queue-modal";
import { LyricsModal } from "@/components/ui/lyrics-modal"; // Import Lyrics Modal
import { Settings, Search } from 'lucide-react';

export function Stage() {
    const {
        currentSong,
        isPlaying,
        play,
        pause,
        nextSong,
        prevSong,
        volume,
        setVolume,
        seek,
        mixes,
        setMixes,
        activeMixId,
        setActiveMixId,
        playMix,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
    } = usePlayback();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Modal States
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);

    // Progress updates
    useEffect(() => {
        if (isPlaying) {
            progressIntervalRef.current = setInterval(() => {
                setProgress(p => (p >= 1 ? 0 : p + 0.001)); // Mock progress
            }, 100);
        } else if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [isPlaying]);

    // Handle Eject
    const handleEject = () => {
        setActiveMixId(null);
        pause();
    };

    return (
        <div className="relative w-full h-screen bg-stone-900 overflow-hidden flex items-center justify-center">

            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800 via-stone-900 to-black opacity-80 pointer-events-none"></div>

            {/* Quick Actions (Top Right) */}
            <div className="absolute top-6 right-6 flex gap-4 z-20">
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shadow-lg backdrop-blur-sm group"
                    title="Search"
                >
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shadow-lg backdrop-blur-sm group"
                    title="Settings"
                >
                    <Settings className="w-5 h-5 group-hover:spin-slow transition-transform" />
                </button>
            </div>

            {/* Main Stage Area */}
            <div className="flex gap-12 items-center justify-center w-full max-w-6xl z-10">

                {/* Left: Cassette Rack (Mixes) */}
                <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto w-64 p-4 scrollbar-hide">
                    <h2 className="text-stone-400 text-xs font-bold tracking-widest uppercase mb-2 sticky top-0 bg-stone-900/50 backdrop-blur pb-2">Your Mixtapes</h2>
                    {mixes.map((mix) => (
                        <div key={mix.id} className="relative group hover:scale-[1.02] transition-transform duration-200">
                            {/* If active, show indicator? */}
                            <Cassette
                                title={mix.title}
                                color={mix.color}
                                songCount={mix.songs.length}
                                onPlay={() => playMix(mix.id)}
                                className={activeMixId === mix.id ? "ring-2 ring-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : ""}
                            />
                        </div>
                    ))}
                    {/* Add New Mix Placeholder */}
                    <div className="w-40 h-24 rounded-lg border-2 border-dashed border-stone-700 flex items-center justify-center text-stone-600 hover:text-stone-400 hover:border-stone-500 cursor-pointer transition-colors" title="Create New Mix">
                        <span className="text-2xl font-thin">+</span>
                    </div>
                </div>

                {/* Center: Player */}
                <div className="relative">
                    <DesktopPlayer
                        isPlaying={isPlaying}
                        hasCassette={activeMixId !== null}
                        cassetteTitle={activeMixId ? mixes.find(m => m.id === activeMixId)?.title : undefined}
                        cassetteColor={activeMixId ? mixes.find(m => m.id === activeMixId)?.color : undefined}
                        currentSong={currentSong || undefined}
                        onPlayToggle={isPlaying ? pause : play}
                        onNext={nextSong}
                        onPrev={prevSong}
                        volume={volume}
                        onVolumeChange={setVolume}
                        progress={progress}
                        onSeek={seek}
                        shuffle={shuffle}
                        onShuffleToggle={() => setShuffle(!shuffle)}
                        repeat={repeat}
                        onRepeatToggle={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                        onOpenQueue={() => setShowQueue(!showQueue)}
                        onOpenLyrics={() => setShowLyrics(!showLyrics)}
                        onEject={handleEject}
                        className="scale-110" // Slightly larger for emphasis
                    />
                </div>

                {/* Right: Info / Visualizer Placeholder (Future) */}
                {/* Currently empty or could show Upcoming */}
            </div>

            {/* Modals */}
            <DesktopSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />

            {/* Queue & Lyrics Side Modals / Overlays */}
            <AnimatePresence>
                {showQueue && (
                    <QueueModal
                        isOpen={showQueue}
                        onClose={() => setShowQueue(false)}
                    />
                )}
                {showLyrics && (
                    <LyricsModal
                        isOpen={showLyrics}
                        onClose={() => setShowLyrics(false)}
                    />
                )}
            </AnimatePresence>

        </div>
    );
}

// Helper Types
interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        text: string;
        accent: string;
        background: string;
    };
}
