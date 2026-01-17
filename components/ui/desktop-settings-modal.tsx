"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Music, Database, Info, Layout, Smartphone, Disc, Radio } from "lucide-react";
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

    if (!isOpen) return null;

    const tabs = [
        { id: 'layout', label: 'Layout Mode', icon: Layout },
        { id: 'audio', label: 'Audio Quality', icon: Music },
        { id: 'data', label: 'Data & Storage', icon: Database },
        { id: 'about', label: 'About Melora', icon: Info },
    ] as const;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-4xl h-[600px] bg-zinc-950 border border-zinc-800/50 rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-white/5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Sidebar */}
                    <div className="w-64 bg-zinc-950/50 border-r border-white/5 p-6 flex flex-col gap-8">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tighter text-white mb-1">Settings</h2>
                            <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">Control Center</p>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as SettingsTab)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${isActive
                                            ? 'bg-white/10 text-white shadow-lg shadow-black/20'
                                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-600'} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="mt-auto">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-white/5">
                                <p className="text-xs text-zinc-400 font-mono">Melora Tunes</p>
                                <p className="text-[10px] text-zinc-600 mt-1">v1.2.0-beta</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-gradient-to-br from-zinc-900/20 via-black to-black p-8 overflow-y-auto relative">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="max-w-xl mx-auto py-4">
                            {/* LAYOUT TAB */}
                            {activeTab === 'layout' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Interface Mode</h3>
                                        <p className="text-zinc-400 text-sm">Choose your preferred operating experience.</p>
                                    </div>

                                    <div className="grid gap-4">
                                        {/* Deck Studio */}
                                        <button
                                            onClick={() => onSwitchLayout?.('deck')}
                                            className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${currentLayout === 'deck'
                                                ? 'bg-gradient-to-br from-purple-500/20 to-blue-600/5 border-purple-500/50 ring-1 ring-purple-500/20'
                                                : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/80 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${currentLayout === 'deck' ? 'bg-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'}`}>
                                                <Radio size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-base">Deck Studio</span>
                                                    {currentLayout === 'deck' && <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Active</span>}
                                                </div>
                                                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                                    Professional cassette deck interface. Features realistic physics, multiple deck themes (Zen, Bauhaus), and tactile controls.
                                                </p>
                                            </div>
                                        </button>

                                        {/* Discovery Mode */}
                                        <button
                                            onClick={() => onSwitchLayout?.('discovery')}
                                            className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${currentLayout === 'discovery'
                                                ? 'bg-gradient-to-br from-pink-500/20 to-purple-600/5 border-pink-500/50 ring-1 ring-pink-500/20'
                                                : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/80 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${currentLayout === 'discovery' ? 'bg-pink-500 text-white shadow-lg shadow-pink-900/50' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'}`}>
                                                <Disc size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-base">Discovery Mode OS</span>
                                                    {currentLayout === 'discovery' && <span className="bg-pink-500/20 text-pink-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Active</span>}
                                                </div>
                                                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                                    Modern glassmorphic interface focused on exploration and visuals. Ideal for fullscreen listening and ambient mode.
                                                </p>
                                            </div>
                                        </button>

                                        {/* iPod Classic */}
                                        <button
                                            onClick={() => onSwitchLayout?.('ipod')}
                                            className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${currentLayout === 'ipod'
                                                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-600/5 border-blue-500/50 ring-1 ring-blue-500/20'
                                                : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/80 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${currentLayout === 'ipod' ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/50' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'}`}>
                                                <Smartphone size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-base">iPod Classic</span>
                                                    {currentLayout === 'ipod' && <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Active</span>}
                                                </div>
                                                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                                    Retro mobile simulator with click wheel navigation. Perfect for distraction-free listening.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AUDIO TAB */}
                            {activeTab === 'audio' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Audio Quality</h3>
                                        <p className="text-zinc-400 text-sm">Customize playback settings.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <span className="font-medium text-white">Streaming Quality</span>
                                                    <div className="text-xs text-zinc-500 mt-1">Higher quality uses more data</div>
                                                </div>
                                                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md font-medium">
                                                    {bitrate === '320' ? 'Lossless' : bitrate === '160' ? 'High' : bitrate === '96' ? 'Normal' : bitrate === '48' ? 'Low' : 'Very Low'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[
                                                    { value: '12', label: 'Very Low', desc: 'Data saver' },
                                                    { value: '48', label: 'Low', desc: 'Basic' },
                                                    { value: '96', label: 'Normal', desc: 'Standard' },
                                                    { value: '160', label: 'High', desc: 'Better' },
                                                    { value: '320', label: 'Lossless', desc: 'Best quality' }
                                                ].map((q) => (
                                                    <button
                                                        key={q.value}
                                                        onClick={() => setBitrate(q.value as any)}
                                                        className={`py-3 px-2 rounded-xl text-center transition-all ${bitrate === q.value
                                                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/30'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-bold">{q.label}</div>
                                                        <div className="text-[10px] opacity-70 mt-0.5">{q.desc}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-white">Crossfade Songs</div>
                                                <div className="text-xs text-zinc-500 mt-1">Smooth transitions between tracks</div>
                                            </div>
                                            <button
                                                onClick={() => setCrossfadeDuration(crossfadeDuration > 0 ? 0 : 3)}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors ${crossfadeDuration > 0 ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${crossfadeDuration > 0 ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-white">Volume Normalization</div>
                                                <div className="text-xs text-zinc-500 mt-1">Consistent volume across tracks</div>
                                            </div>
                                            <button
                                                onClick={() => setNormalize(prev => !prev)}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors ${normalize ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${normalize ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {/* Playback Speed */}
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-medium text-white">Playback Speed</span>
                                                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md font-mono">{playbackSpeed}x</span>
                                            </div>
                                            <div className="grid grid-cols-6 gap-2">
                                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => setPlaybackSpeed(speed)}
                                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${playbackSpeed === speed
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                                                            }`}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sleep Timer */}
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <div className="font-medium text-white">Sleep Timer</div>
                                                    <div className="text-xs text-zinc-500 mt-1">Auto-pause after set time</div>
                                                </div>
                                                {sleepTimer && (
                                                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-md font-mono">
                                                        {Math.ceil((sleepTimer.endTime - Date.now()) / 60000)}m left
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[
                                                    { label: 'Off', mins: 0 },
                                                    { label: '15m', mins: 15 },
                                                    { label: '30m', mins: 30 },
                                                    { label: '45m', mins: 45 },
                                                    { label: '1h', mins: 60 }
                                                ].map(({ label, mins }) => (
                                                    <button
                                                        key={label}
                                                        onClick={() => {
                                                            if (mins === 0) {
                                                                setSleepTimer(null);
                                                            } else {
                                                                setSleepTimer({
                                                                    endTime: Date.now() + mins * 60 * 1000,
                                                                    duration: mins * 60 * 1000
                                                                });
                                                            }
                                                        }}
                                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${(mins === 0 && !sleepTimer) || (sleepTimer && sleepTimer.duration === mins * 60 * 1000)
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                                                            }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DATA TAB */}
                            {activeTab === 'data' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Data & Storage</h3>
                                        <p className="text-zinc-400 text-sm">Manage your library and settings.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                                            <h4 className="font-bold text-white mb-4">Backup Library</h4>
                                            <div className="flex gap-3">
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
                                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium text-sm transition-colors border border-white/5"
                                                >
                                                    Export JSON
                                                </button>
                                                <label className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium text-sm transition-colors border border-white/5 cursor-pointer text-center">
                                                    Import JSON
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

                                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                                            <h4 className="font-bold text-red-500 mb-2">Danger Zone</h4>
                                            <p className="text-xs text-red-400/70 mb-4">Irreversible actions.</p>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Are you sure? This will delete all playlists and reset settings.")) {
                                                        localStorage.clear();
                                                        window.location.reload();
                                                    }
                                                }}
                                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-medium text-sm transition-colors"
                                            >
                                                Reset Application
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABOUT TAB */}
                            {activeTab === 'about' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center pt-4">
                                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl mx-auto shadow-2xl flex items-center justify-center mb-4 ring-4 ring-white/10">
                                            <Music size={40} className="text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tighter text-white mb-1">Melora</h2>
                                        <p className="text-zinc-500 tracking-widest text-xs uppercase">The Ultimate Audiophile OS</p>
                                    </div>

                                    {/* Listening Stats */}
                                    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
                                        <h4 className="font-bold text-white mb-4 text-center">Your Listening Stats</h4>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="p-4 bg-zinc-800/50 rounded-xl">
                                                <div className="text-2xl font-bold text-purple-400">{mixes.reduce((acc, m) => acc + m.songs.length, 0)}</div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Songs Saved</div>
                                            </div>
                                            <div className="p-4 bg-zinc-800/50 rounded-xl">
                                                <div className="text-2xl font-bold text-pink-400">{mixes.length}</div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Playlists</div>
                                            </div>
                                            <div className="p-4 bg-zinc-800/50 rounded-xl">
                                                <div className="text-2xl font-bold text-blue-400">
                                                    {(() => {
                                                        const liked = JSON.parse(localStorage.getItem('melora-liked-songs') || '[]');
                                                        return liked.length;
                                                    })()}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Liked</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-w-sm mx-auto p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-xs text-zinc-400 leading-relaxed text-center">
                                        Designed for music lovers who appreciate the tactile feel of physical media and the convenience of modern streaming.
                                    </div>

                                    <div className="text-xs text-zinc-600 text-center">
                                        &copy; 2024 Melora Tunes. Built with ❤️ for music.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
