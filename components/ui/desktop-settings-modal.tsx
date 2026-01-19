"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Music, Database, Info, Layout, Smartphone, Disc, Radio, Monitor, Zap, Volume2, Moon, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlayback } from "@/components/providers/playback-context";

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchLayout?: (layout: 'deck' | 'ipod' | 'discovery') => void;
    currentLayout?: 'deck' | 'ipod' | 'discovery';
}

type SettingsTab = 'layout' | 'audio' | 'data' | 'about';

export function DesktopSettingsModal({ isOpen, onClose, onSwitchLayout, currentLayout = 'deck' }: DesktopSettingsModalProps) {
    const {
        bitrate, setBitrate,
        crossfadeDuration, setCrossfadeDuration,
        playbackSpeed, setPlaybackSpeed,
        sleepTimer, setSleepTimer,
        mixes, setMixes
    } = usePlayback();

    // UI State for things not yet in context
    const [normalize, setNormalize] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('layout');
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    if (!isOpen) return null;

    const tabs = [
        { id: 'layout', label: 'Experience', sub: 'Visuals & UI', icon: Monitor },
        { id: 'audio', label: 'Acoustics', sub: 'Audio Quality', icon: Volume2 },
        { id: 'data', label: 'Library', sub: 'Data & Backup', icon: Database },
        { id: 'about', label: 'System', sub: 'About Melora', icon: Zap },
    ] as const;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-5xl h-[650px] bg-black border border-white/10 rounded-3xl shadow-[0_0_120px_-30px_rgba(255,255,255,0.1)] flex overflow-hidden backdrop-blur-3xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Sidebar - Premium Minimalist */}
                    <div className="w-72 bg-zinc-950 border-r border-white/5 p-6 flex flex-col gap-8 relative z-10">
                        <div className="pl-2">
                            <h2 className="text-3xl font-bold tracking-tighter text-white mb-1 flex items-center gap-2">
                                Settings <span className="text-zinc-600 text-lg">⚙️</span>
                            </h2>
                            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">Control Center</p>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as SettingsTab)}
                                        className={`group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${isActive
                                            ? 'bg-white text-black shadow-xl shadow-white/5'
                                            : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-black text-white' : 'bg-zinc-900 text-zinc-500 group-hover:text-white'}`}>
                                            <Icon size={18} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-sm font-bold ${isActive ? 'text-black' : 'text-zinc-300 group-hover:text-white'}`}>{tab.label}</div>
                                            <div className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-zinc-500' : 'text-zinc-600'}`}>{tab.sub}</div>
                                        </div>
                                        {isActive && (
                                            <motion.div layoutId="active-indicator" className="absolute right-4 w-1.5 h-1.5 rounded-full bg-black" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="mt-auto pl-2">
                            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                    <Music size={14} className="text-black fill-current" />
                                </div>
                                <div>
                                    <p className="text-xs text-white font-bold">Melora OS</p>
                                    <p className="text-[10px] text-zinc-500">v1.2.4 • Beta</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-black p-10 overflow-y-auto relative [&::-webkit-scrollbar]:hidden">
                        {/* Background Gradients */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-zinc-900/40 to-transparent rounded-full blur-[120px] pointer-events-none" />

                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 p-3 bg-zinc-900/50 hover:bg-white text-zinc-500 hover:text-black rounded-full transition-all duration-300 z-20 group"
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform" />
                        </button>

                        <div className="max-w-2xl mx-auto relative z-10 pb-20">
                            {/* LAYOUT TAB */}
                            {activeTab === 'layout' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-10"
                                >
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                            Interface Mode <span className="text-2xl">🖥️</span>
                                        </h3>
                                        <p className="text-zinc-500 font-medium">Choose your operating frequency.</p>
                                    </div>

                                    <div className="grid gap-4">
                                        {[
                                            { id: 'deck', title: 'Deck Studio', desc: 'Analog cassette experience with tactile physics.', icon: Radio, color: 'purple' },
                                            { id: 'discovery', title: 'Discovery Glass', desc: 'Modern formatting for visual exploration.', icon: Disc, color: 'pink' },
                                            { id: 'ipod', title: 'iPod Classic', desc: 'Retro pocket simulator. Distraction free.', icon: Smartphone, color: 'blue' }
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => onSwitchLayout?.(mode.id as any)}
                                                className={`group relative flex items-center gap-6 p-6 rounded-3xl border transition-all duration-500 text-left overflow-hidden ${currentLayout === mode.id
                                                    ? 'bg-white border-white'
                                                    : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/80 hover:border-white/20'
                                                    }`}
                                            >
                                                {/* Active Glow */}
                                                {currentLayout === mode.id && <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 via-white to-zinc-200 opacity-20 blur-xl" />}

                                                <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${currentLayout === mode.id ? 'bg-black text-white shadow-2xl scale-110' : 'bg-black/40 text-zinc-500 group-hover:text-white group-hover:scale-105'}`}>
                                                    <mode.icon size={28} strokeWidth={1.5} />
                                                </div>

                                                <div className="flex-1 relative">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`text-lg font-bold ${currentLayout === mode.id ? 'text-black' : 'text-white'}`}>{mode.title}</span>
                                                        {currentLayout === mode.id && (
                                                            <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-lg">Active</span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm font-medium ${currentLayout === mode.id ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                                        {mode.desc}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* AUDIO TAB */}
                            {activeTab === 'audio' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-10"
                                >
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                            Acoustics <span className="text-2xl">🎧</span>
                                        </h3>
                                        <p className="text-zinc-500 font-medium">Fine-tune your sonic experience.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Quality */}
                                        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <div className="font-bold text-xl text-white mb-1">Stream Quality</div>
                                                    <div className="text-xs text-zinc-500 uppercase tracking-widest">Select Bitrate</div>
                                                </div>
                                                <div className="px-3 py-1 bg-white text-black rounded-lg text-xs font-bold">
                                                    {bitrate === '320' ? 'Lossless FLAC' : 'Standard'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-5 gap-3">
                                                {[
                                                    { value: '12', label: '12k', emoji: '🌑' },
                                                    { value: '48', label: '48k', emoji: '🌘' },
                                                    { value: '96', label: '96k', emoji: '🌗' },
                                                    { value: '160', label: '160k', emoji: '🌖' },
                                                    { value: '320', label: '320k', emoji: '🌕' }
                                                ].map((q) => (
                                                    <button
                                                        key={q.value}
                                                        onClick={() => setBitrate(q.value as any)}
                                                        className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 ${bitrate === q.value
                                                            ? 'bg-white text-black shadow-lg scale-105'
                                                            : 'bg-black/40 text-zinc-500 hover:bg-black/60 hover:text-white'
                                                            }`}
                                                    >
                                                        <span className="text-lg">{q.emoji}</span>
                                                        <span className="text-xs font-bold">{q.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between h-32 hover:bg-zinc-900/50 transition-colors group">
                                                <div className="flex justify-between items-start">
                                                    <div className="p-2 bg-black rounded-xl text-white group-hover:scale-110 transition-transform"><Sparkles size={18} /></div>
                                                    <button
                                                        onClick={() => setNormalize(prev => !prev)}
                                                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${normalize ? 'bg-white' : 'bg-black border border-zinc-800'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${normalize ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-600'}`} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">Normalization</div>
                                                    <div className="text-[10px] text-zinc-500 font-medium mt-1">Consistent Volume</div>
                                                </div>
                                            </div>

                                            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between h-32 hover:bg-zinc-900/50 transition-colors group">
                                                <div className="flex justify-between items-start">
                                                    <div className="p-2 bg-black rounded-xl text-white group-hover:scale-110 transition-transform"><Zap size={18} /></div>
                                                    <button
                                                        onClick={() => setCrossfadeDuration(crossfadeDuration > 0 ? 0 : 3)}
                                                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${crossfadeDuration > 0 ? 'bg-white' : 'bg-black border border-zinc-800'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${crossfadeDuration > 0 ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-600'}`} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">Crossfade</div>
                                                    <div className="text-[10px] text-zinc-500 font-medium mt-1">3s Overlap</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* DATA TAB */}
                            {activeTab === 'data' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-10"
                                >
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                            Library Data <span className="text-2xl">💾</span>
                                        </h3>
                                        <p className="text-zinc-500 font-medium">Manage and backup your collection.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8">
                                            <h4 className="font-bold text-white mb-6 flex items-center gap-2">JSON Backup <span className="text-xs px-2 py-1 bg-white/10 rounded-md text-zinc-400">Portable</span></h4>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => {
                                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mixes));
                                                        const downloadAnchorNode = document.createElement('a');
                                                        downloadAnchorNode.setAttribute("href", dataStr);
                                                        downloadAnchorNode.setAttribute("download", "melora-backup.json");
                                                        document.body.appendChild(downloadAnchorNode);
                                                        downloadAnchorNode.click();
                                                        downloadAnchorNode.remove();
                                                    }}
                                                    className="flex-1 py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-white/5"
                                                >
                                                    Export Data 📤
                                                </button>
                                                <label className="flex-1 py-4 bg-black border border-zinc-800 hover:border-white/20 hover:bg-zinc-900/50 rounded-2xl text-white font-bold text-sm transition-all cursor-pointer text-center flex items-center justify-center gap-2">
                                                    Import Data 📥
                                                    <input
                                                        type="file"
                                                        accept=".json"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                try {
                                                                    const importedMixes = JSON.parse(event.target?.result as string);
                                                                    if (Array.isArray(importedMixes)) {
                                                                        setMixes(importedMixes);
                                                                        window.location.reload();
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                }
                                                            };
                                                            reader.readAsText(file);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8">
                                            <h4 className="font-bold text-red-500 mb-2 flex items-center gap-2">Danger Zone ⚠️</h4>
                                            <p className="text-zinc-500 text-xs mb-6 font-medium">Irreversible actions. Proceed with caution.</p>
                                            {!showResetConfirm ? (
                                                <button
                                                    onClick={() => setShowResetConfirm(true)}
                                                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold text-sm transition-colors border border-red-500/20"
                                                >
                                                    Factory Reset Melora ☢️
                                                </button>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowResetConfirm(false)}
                                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold text-sm transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            localStorage.clear();
                                                            window.location.reload();
                                                        }}
                                                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-colors"
                                                    >
                                                        Yes, Reset ☢️
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ABOUT TAB */}
                            {activeTab === 'about' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-10 flex flex-col items-center"
                                >
                                    <div className="relative mb-8 group">
                                        <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="w-32 h-32 bg-white rounded-[2rem] mx-auto shadow-2xl flex items-center justify-center relative z-10 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                            <Music size={56} className="text-black fill-current" />
                                        </div>
                                    </div>

                                    <h2 className="text-5xl font-black tracking-tighter text-white mb-4">Melora <span className="text-zinc-700">OS</span></h2>
                                    <p className="text-zinc-500 tracking-[0.5em] text-xs font-bold uppercase mb-12">The Audiophile Workstation</p>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-6 w-full mb-12">
                                        {[
                                            { label: 'Songs', value: mixes.reduce((acc, m) => acc + m.songs.length, 0), color: 'text-white' },
                                            { label: 'Mixes', value: mixes.length, color: 'text-white' },
                                            { label: 'Liked', value: (JSON.parse(localStorage.getItem('melora-liked-songs') || '[]') as any[]).length, color: 'text-white' }
                                        ].map((stat) => (
                                            <div key={stat.label} className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl text-center group hover:bg-white/5 transition-colors">
                                                <div className={`text-3xl font-black ${stat.color} mb-1 group-hover:scale-110 transition-transform`}>{stat.value}</div>
                                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-zinc-400 font-mono">Build v1.2.4-beta</p>
                                        <p className="text-[10px] text-zinc-600 mt-2">© 2024 Melora Tunes • Made with 🖤</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
