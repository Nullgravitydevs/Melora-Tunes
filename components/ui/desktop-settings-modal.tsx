"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Music, Database, Info, Layout, Smartphone, Disc, Radio, Monitor, Zap, Volume2, Moon, Sparkles, Heart, Coffee, Github, MessageCircle, Server } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { FREQUENCIES } from "@/hooks/useEqualizer";
import { factoryReset } from "@/lib/cleanup";
import { loadSettings, saveSettings } from "@/lib/settings";

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
        mixes, setMixes, eq, sleepTimer, setSleepTimer
    } = usePlayback();

    // Local State for Performance (Detached from Context)
    const [activeTab, setActiveTab] = useState<SettingsTab>('experience');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [languages, setLanguages] = useState<string[]>([]);

    // Load settings once on mount
    useEffect(() => {
        const s = loadSettings();
        setLanguages(s.languages || ['english', 'hindi']);
    }, []);

    const updateLanguages = (newLangs: string[]) => {
        setLanguages(newLangs);
        // saveSettings already dispatches 'melora-settings-changed' event
        saveSettings({ languages: newLangs });
    };

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
                                        <h1 className="text-3xl font-bold text-white mb-2">Audio & Language</h1>
                                        <p className="text-zinc-500">Master your sonic output.</p>
                                    </header>

                                    {/* Language Preference */}
                                    <section>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <MessageCircle size={18} /> Music Languages
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {['English', 'Hindi', 'Telugu', 'Tamil', 'Punjabi', 'Marathi', 'Gujarati', 'Bengali', 'Kannada', 'Malayalam', 'Bhojpuri'].map(lang => {
                                                const isActive = languages.includes(lang.toLowerCase());
                                                return (
                                                    <button
                                                        key={lang}
                                                        onClick={() => {
                                                            const lower = lang.toLowerCase();
                                                            let newLangs;
                                                            if (isActive) {
                                                                newLangs = languages.filter(l => l !== lower);
                                                                if (newLangs.length === 0) newLangs = ['english']; // Prevent empty
                                                            } else {
                                                                newLangs = [...languages, lower];
                                                            }
                                                            updateLanguages(newLangs);
                                                        }}
                                                        className={`px-4 py-2 rounded-full font-bold text-sm border transition-all ${isActive
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-white'}`}
                                                    >
                                                        {lang}
                                                        {isActive && <Check size={14} className="inline-block ml-2 -mt-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

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

                                    {/* Equalizer */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-white font-bold flex items-center gap-2">
                                                <Layout size={18} /> Equalizer
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={eq.currentPreset}
                                                    onChange={(e) => eq.setPreset(e.target.value)}
                                                    className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 outline-none"
                                                    disabled={!eq.isEnabled}
                                                >
                                                    {eq.presets.map(p => (
                                                        <option key={p} value={p} className="bg-zinc-900">{p}</option>
                                                    ))}
                                                    <option value="Custom" className="bg-zinc-900">Custom</option>
                                                </select>
                                                <button
                                                    onClick={() => eq.setIsEnabled(!eq.isEnabled)}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${eq.isEnabled ? 'bg-green-500' : 'bg-white/10'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${eq.isEnabled ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`bg-black/40 rounded-xl p-4 border border-white/5 overflow-x-auto transition-opacity ${eq.isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                            <div className="flex items-end justify-between gap-2 h-32 min-w-[300px]">
                                                {FREQUENCIES.map((freq, i) => (
                                                    <div key={freq} className="flex flex-col items-center gap-2 flex-1 group">
                                                        <div className="relative h-24 w-1.5 bg-white/10 rounded-full">
                                                            <div
                                                                className="absolute bottom-0 w-full bg-white/40 rounded-full"
                                                                style={{ height: `${((eq.bands[i] + 12) / 24) * 100}%` }}
                                                            />
                                                            <input
                                                                type="range"
                                                                min="-12"
                                                                max="12"
                                                                step="0.5"
                                                                value={eq.bands[i]}
                                                                onChange={(e) => eq.setBand(i, parseFloat(e.target.value))}
                                                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 -rotate-90 opacity-0 cursor-pointer"
                                                                tabIndex={0}
                                                                aria-label={`${freq} Hz`}
                                                            />
                                                            <div
                                                                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none transition-all group-hover:scale-125"
                                                                style={{ bottom: `${((eq.bands[i] + 12) / 24) * 100}%`, transform: 'translate(-50%, 50%)' }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-white/40 font-mono">
                                                            {freq >= 1000 ? `${freq / 1000}k` : freq}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Sleep Timer */}
                                    <section>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Moon size={18} /> Sleep Timer
                                        </h3>
                                        {sleepTimer ? (
                                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <div className="text-indigo-400 font-bold mb-1">Timer Active</div>
                                                    <div className="text-sm text-white/60">
                                                        Stops in {Math.ceil((sleepTimer.endTime - Date.now()) / 60000)} minutes
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSleepTimer(null)}
                                                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                                {[5, 15, 30, 60].map(mins => (
                                                    <button
                                                        key={mins}
                                                        onClick={() => setSleepTimer({
                                                            duration: mins * 60 * 1000,
                                                            endTime: Date.now() + (mins * 60 * 1000)
                                                        })}
                                                        className="py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
                                                    >
                                                        {mins}m
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
                                                                    window.dispatchEvent(new CustomEvent('melora-library-updated'));
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
