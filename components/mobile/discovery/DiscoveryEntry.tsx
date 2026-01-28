"use client";

import React, { useState } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { Home, Search, Library, Settings, Disc, Play, Heart, MoreHorizontal, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- TABS ---
type Tab = 'HOME' | 'SEARCH' | 'LIBRARY' | 'SETTINGS';

export function DiscoveryEntry() {
    const [activeTab, setActiveTab] = useState<Tab>('HOME');
    const { currentSong, isPlaying, togglePlay } = usePlayback();

    return (
        <div className="w-full h-[100dvh] bg-black text-white flex flex-col font-sans overflow-hidden relative">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar z-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'HOME' && <HomeTab key="home" />}
                    {activeTab === 'SEARCH' && <SearchTab key="search" />}
                    {activeTab === 'LIBRARY' && <LibraryTab key="library" />}
                    {activeTab === 'SETTINGS' && <SettingsTab key="settings" />}
                </AnimatePresence>
            </div>

            {/* FLOATING GLASS DOCK */}
            <div className="absolute bottom-0 left-0 w-full z-50">
                {/* MINI PLAYER */}
                {currentSong && (
                    <div className="mx-2 mb-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                        {/* Art */}
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden relative flex-shrink-0">
                            {currentSong.image && <img src={currentSong.image as string} className="w-full h-full object-cover" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 px-3">
                            <p className="text-sm font-bold text-white truncate leading-tight">{currentSong.name}</p>
                            <p className="text-xs text-white/50 truncate font-medium">{currentSong.primaryArtists}</p>
                        </div>

                        {/* Controls */}
                        <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white">
                            {isPlaying ? (
                                <span className="flex gap-1">
                                    <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                                    <span className="w-1 h-3 bg-white rounded-full animate-pulse delay-75" />
                                </span>
                            ) : <Play size={20} fill="currentColor" />}
                        </button>
                    </div>
                )}

                {/* TAB BAR */}
                <div className="h-[80px] bg-black/80 backdrop-blur-2xl border-t border-white/5 flex items-start justify-around pt-4 pb-8">
                    <NavIcon icon={<Home size={24} />} label="Home" active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} />
                    <NavIcon icon={<Search size={24} />} label="Search" active={activeTab === 'SEARCH'} onClick={() => setActiveTab('SEARCH')} />
                    <NavIcon icon={<Library size={24} />} label="Library" active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} />
                    <NavIcon icon={<Settings size={24} />} label="Settings" active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} />
                </div>
            </div>
        </div>
    );
}

function NavIcon({ icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all duration-300 relative group
            ${active ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
        >
            <div className={`transition-transform duration-300 ${active ? 'scale-110 -translate-y-1' : ''}`}>
                {active ? React.cloneElement(icon, { fill: "currentColor" }) : icon}
            </div>
            <span className={`text-[10px] font-medium tracking-wide transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 absolute -bottom-2'}`}>
                {label}
            </span>
            {active && <div className="absolute -top-3 w-8 h-8 bg-white/10 blur-xl rounded-full pointer-events-none" />}
        </button>
    );
}

// --- SUB-SCREENS ---

function HomeTab() {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 pt-12">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 mb-6">
                Good Afternoon
            </h1>

            {/* HERO CARD */}
            <div className="w-full aspect-[16/9] bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative mb-8 group">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest text-white mb-2 inline-block">
                        Featured Mix
                    </span>
                    <h3 className="text-2xl font-bold text-white leading-tight">Late Night <br />Vibes</h3>
                </div>
                <button className="absolute bottom-5 right-5 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform text-black">
                    <Play size={20} fill="black" className="ml-0.5" />
                </button>
            </div>

            {/* SECTION */}
            <h2 className="text-lg font-bold text-white/90 mb-4 px-1">Jump Back In</h2>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden active:scale-95 transition-transform">
                        <div className="w-full h-2/3 bg-neutral-800" />
                        <div className="p-3">
                            <div className="h-2 w-16 bg-white/20 rounded mb-2" />
                            <div className="h-2 w-8 bg-white/10 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function SearchTab() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-12">
            <h1 className="text-3xl font-bold mb-6">Search</h1>
            <div className="relative">
                <Search className="absolute left-4 top-4 text-white/40" size={20} />
                <input
                    type="text"
                    placeholder="Artists, Songs, Lyrics..."
                    className="w-full bg-neutral-900/80 border border-white/10 p-4 pl-12 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-neutral-900 transition-all font-medium"
                    autoFocus
                />
            </div>
            <div className="mt-8">
                <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest mb-4">Browse All</h3>
                <div className="grid grid-cols-2 gap-3">
                    {['Pop', 'Hip-Hop', 'Indie', 'Rock', 'Electronic', 'Jazz'].map(genre => (
                        <div key={genre} className="h-24 bg-neutral-900/50 border border-white/5 rounded-xl p-4 relative overflow-hidden active:opacity-80">
                            <span className="font-bold text-white/80">{genre}</span>
                            <div className="absolute -bottom-2 -right-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function LibraryTab() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Library</h1>
                <div className="flex gap-4">
                    <Search size={24} className="text-white/50" />
                    <Settings size={24} className="text-white/50" />
                </div>
            </div>

            <div className="space-y-2">
                {['Playlists', 'Liked Songs', 'Albums', 'Artists'].map(item => (
                    <div key={item} className="flex items-center p-4 active:bg-white/5 rounded-xl transition-colors">
                        <div className="w-12 h-12 bg-neutral-800 rounded-lg mr-4 border border-white/5" />
                        <span className="text-lg font-medium">{item}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function SettingsTab() {
    const handleSwitchToClassic = () => {
        if (confirm("Switch to iPod Classic interface?")) {
            window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: 'CLASSIC' }));
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-12">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <div className="space-y-8">
                {/* SWITCHER */}
                <div className="p-1 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                    <button
                        onClick={handleSwitchToClassic}
                        className="w-full bg-black/90 backdrop-blur rounded-[20px] p-5 flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
                                <Disc size={20} className="text-white" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white">iPod Classic</p>
                                <p className="text-xs text-white/60">Switch to Click Wheel interface</p>
                            </div>
                        </div>
                        <ChevronRight className="text-white/40" />
                    </button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest px-2">Account</h3>
                    <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                        <div className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
                            <div>
                                <p className="font-bold">Justin</p>
                                <p className="text-xs text-white/50">Premium Plan</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest px-2">App Info</h3>
                    <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                        <div className="p-5 flex justify-between items-center bg-transparent">
                            <span className="font-medium">Version</span>
                            <span className="text-white/50 font-mono text-xs">2.0.0 (Beta)</span>
                        </div>
                        <div className="p-5 flex justify-between items-center bg-transparent">
                            <span className="font-medium">Cache</span>
                            <span className="text-white/50 font-mono text-xs">124 MB</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
