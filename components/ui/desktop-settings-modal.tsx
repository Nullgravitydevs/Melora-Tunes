"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Music, Database, Info, Layout, Smartphone, Disc, Radio, Monitor, Zap, Volume2, Moon, Sparkles, Heart, Coffee, Github, MessageCircle, Server } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { factoryReset } from "@/lib/cleanup";

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchLayout?: (layout: 'deck' | 'ipod' | 'discovery') => void;
    currentLayout?: 'deck' | 'ipod' | 'discovery';
}

type SettingsTab = 'experience' | 'audio' | 'library' | 'stats' | 'support' | 'about';

export function DesktopSettingsModal({ isOpen, onClose, onSwitchLayout, currentLayout = 'deck' }: DesktopSettingsModalProps) {
    const {
        qualityPreference, setQualityPreference,
        crossfadeDuration, setCrossfadeDuration,
        mixes, setMixes
    } = usePlayback();

    // Local State for Performance (Detached from Context)
    const [localCrossfade, setLocalCrossfade] = useState(crossfadeDuration);
    const [activeTab, setActiveTab] = useState<SettingsTab>('experience');
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Sync local state when open
    useEffect(() => {
        if (isOpen) {
            setLocalCrossfade(crossfadeDuration);
        }
    }, [isOpen, crossfadeDuration]);

    // Commit changes on unmount or specific actions
    const handleCrossfadeCommit = useCallback(() => {
        if (localCrossfade !== crossfadeDuration) {
            setCrossfadeDuration(localCrossfade);
        }
    }, [localCrossfade, crossfadeDuration, setCrossfadeDuration]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'experience', label: 'Experience', icon: Monitor },
        { id: 'audio', label: 'Audio', icon: Volume2 },
        { id: 'library', label: 'Library', icon: Database },
        { id: 'stats', label: 'Stats', icon: Server },
        { id: 'support', label: 'Support', icon: Heart },
        { id: 'about', label: 'About', icon: Info },
    ] as const;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-5xl h-[700px] bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl flex overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Sidebar */}
                    <div className="w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col gap-2">
                        <h2 className="text-xl font-bold text-white px-2 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
                                <Zap size={18} fill="currentColor" />
                            </div>
                            Control
                        </h2>

                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-white text-black font-bold shadow-lg'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}

                        <div className="mt-auto px-2">
                            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                                Melora OS Beta
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-black/20 p-8 overflow-y-auto relative">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="max-w-2xl mx-auto py-4">
                            {/* EXPERIENCE TAB */}
                            {activeTab === 'experience' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">Experience</h1>
                                        <p className="text-zinc-500">Customize your visual interface.</p>
                                    </header>

                                    <div className="grid gap-4">
                                        {[
                                            { id: 'deck', title: 'Deck Studio', desc: 'Analog cassette physics.', icon: Radio },
                                            { id: 'discovery', title: 'Discovery Glass', desc: 'Modern digital library.', icon: Disc },
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        // page.tsx expects 'CLASSIC' uppercased
                                                        window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: mode.id.toUpperCase() }));
                                                    }
                                                    onSwitchLayout?.(mode.id as any);
                                                }}
                                                className={`flex items-center gap-5 p-5 rounded-2xl border transition-all text-left group ${currentLayout === mode.id
                                                    ? 'bg-white/10 border-white/20 ring-1 ring-white/10'
                                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
                                                    }`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${currentLayout === mode.id ? 'bg-white text-black' : 'bg-black text-zinc-500 group-hover:text-white'
                                                    }`}>
                                                    <mode.icon size={24} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-lg flex items-center gap-2">
                                                        {mode.title}
                                                        {currentLayout === mode.id && (
                                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-zinc-500">{mode.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AUDIO TAB */}
                            {activeTab === 'audio' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">Audio</h1>
                                        <p className="text-zinc-500">Master your sonic output.</p>
                                    </header>

                                    {/* Quality */}
                                    <section>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Volume2 size={18} /> Streaming Quality
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'auto', label: 'Auto', sub: 'Adaptive' },
                                                { id: 'hires', label: 'Hi-Res', sub: '24-bit / 96kHz' },
                                                { id: 'flac', label: 'Lossless', sub: '16-bit / 44.1kHz' },
                                                { id: '320', label: 'High', sub: '320 kbps' },
                                                { id: '160', label: 'Standard', sub: '160 kbps' },
                                                { id: '96', label: 'Saver', sub: '96 kbps' },
                                            ].map((q) => (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setQualityPreference(q.id as any)}
                                                    className={`p-4 rounded-xl border text-left transition-all ${qualityPreference === q.id
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                        : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-zinc-800'
                                                        }`}
                                                >
                                                    <div className="font-bold">{q.label}</div>
                                                    <div className={`text-xs ${qualityPreference === q.id ? 'text-blue-200' : 'text-zinc-600'}`}>{q.sub}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Crossfade */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-white font-bold flex items-center gap-2">
                                                <Sparkles size={18} /> Crossfade
                                            </h3>
                                            <span className="text-zinc-400 font-mono text-sm">{localCrossfade}s</span>
                                        </div>
                                        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                                            <input
                                                type="range"
                                                min="0" max="12" step="1"
                                                value={localCrossfade}
                                                onChange={(e) => setLocalCrossfade(Number(e.target.value))}
                                                onMouseUp={handleCrossfadeCommit}
                                                onTouchEnd={handleCrossfadeCommit}
                                                className="w-full appearance-none bg-zinc-700 h-1.5 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[10px] text-zinc-600 mt-2 font-mono uppercase">
                                                <span>Off</span>
                                                <span>12s</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* LIBRARY TAB */}
                            {activeTab === 'library' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">Library</h1>
                                        <p className="text-zinc-500">Manage your data.</p>
                                    </header>

                                    <div className="grid gap-4">
                                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <div>
                                                <div className="text-white font-bold">Export Data</div>
                                                <div className="text-zinc-500 text-sm">Save your mixes as JSON.</div>
                                            </div>
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
                                                className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-zinc-200"
                                            >
                                                Export
                                            </button>
                                        </div>

                                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <div>
                                                <div className="text-white font-bold">Import Data</div>
                                                <div className="text-zinc-500 text-sm">Restore mixes from backup.</div>
                                            </div>
                                            <label className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-bold text-sm hover:bg-zinc-700 cursor-pointer">
                                                Import
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
                                                            } catch (err) { console.error(err); }
                                                        };
                                                        reader.readAsText(file);
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10">
                                            <div className="text-red-500 font-bold mb-4">Danger Zone</div>
                                            {!showResetConfirm ? (
                                                <button
                                                    onClick={() => setShowResetConfirm(true)}
                                                    className="w-full py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 font-bold text-sm"
                                                >
                                                    Factory Reset App
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-lg font-bold text-sm">Cancel</button>
                                                    <button
                                                        onClick={() => factoryReset()}
                                                        className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-500"
                                                    >
                                                        Confirm Reset
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STATS TAB */}
                            {activeTab === 'stats' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">Statistics</h1>
                                        <p className="text-zinc-500">Your listening DNA.</p>
                                    </header>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Total Mixes', value: mixes.length },
                                            { label: 'Total Songs', value: mixes.reduce((acc, m) => acc + m.songs.length, 0) },
                                        ].map(s => (
                                            <div key={s.label} className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5">
                                                <div className="text-4xl font-extrabold text-white mb-1">{s.value}</div>
                                                <div className="text-xs uppercase tracking-widest text-zinc-500">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-10 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-600">
                                        More insights coming soon.
                                    </div>
                                </div>
                            )}

                            {/* SUPPORT TAB */}
                            {activeTab === 'support' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10">
                                    <div className="w-20 h-20 bg-pink-500 rounded-full mx-auto flex items-center justify-center text-white shadow-xl shadow-pink-500/20 mb-6">
                                        <Heart size={32} fill="currentColor" />
                                    </div>
                                    <h1 className="text-4xl font-bold text-white">Support Melora</h1>
                                    <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
                                        Melora is an open-source passion project. If you love the music, consider supporting the development.
                                    </p>
                                    <div className="flex gap-4 justify-center pt-4">
                                        <a href="#" className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors">
                                            <Coffee size={18} /> Buy us a Coffee
                                        </a>
                                        <a href="#" className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-full font-bold hover:bg-zinc-700 transition-colors">
                                            <Github size={18} /> Star on GitHub
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* ABOUT TAB */}
                            {activeTab === 'about' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
                                    <div>
                                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">MELORA</h1>
                                        <div className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-mono inline-block">v1.2.4-beta</div>
                                    </div>
                                    <p className="text-zinc-500 max-w-sm mx-auto">
                                        Designed for audiophiles who miss the tangible feel of music.
                                    </p>
                                    <div className="pt-8">
                                        <a href="#" className="text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-sm font-bold transition-colors">
                                            <MessageCircle size={16} /> Join our Discord
                                        </a>
                                    </div>
                                    <div className="text-[10px] text-zinc-700 pt-20">
                                        © 2024 Melora Tunes Project
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
