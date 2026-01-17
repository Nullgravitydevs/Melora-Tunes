"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Palette, Volume2, Database, BarChart3, Monitor, Smartphone, Disc, Sliders } from 'lucide-react';
import { usePlayback } from '@/components/providers/playback-context';
import { saveSettings, clearCache, resetSettings } from '@/lib/settings';
import { decodeHtml } from "@/lib/utils";
import { getStats, GlobalStats } from "@/lib/stats";

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchLayout?: (layout: 'glass' | 'deck' | 'ipod') => void;
    currentLayout?: 'glass' | 'deck' | 'ipod';
}

// Theme options
const THEMES = [
    { id: 'onyx', name: 'Monochrome Onyx', desc: 'Deep blacks and sharp whites', preview: 'bg-gradient-to-br from-zinc-900 to-black' },
    { id: 'midnight', name: 'Midnight Glass', desc: 'Blur, translucency, and depth', preview: 'bg-gradient-to-br from-blue-900/50 to-purple-900/50' },
    { id: 'deep', name: 'Deep Black', desc: 'Pure OLED black, minimal light', preview: 'bg-black' },
];

export function DesktopSettingsModal({ isOpen, onClose, onSwitchLayout, currentLayout = 'glass' }: DesktopSettingsModalProps) {
    const {
        bitrate, setBitrate,
        crossfadeDuration, setCrossfadeDuration,
        shuffle, setShuffle,
        repeat, setRepeat,
        sleepTimer, setSleepTimer,
        stopAtEndOfSong, setStopAtEndOfSong,
        volume, setVolume,
        mixes, setMixes,
        notificationsEnabled, setNotificationsEnabled
    } = usePlayback();

    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [activeTab, setActiveTab] = useState<'appearance' | 'audio' | 'data' | 'stats'>('appearance');
    const [selectedTheme, setSelectedTheme] = useState('onyx');
    const [normalizeVolume, setNormalizeVolume] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'stats') {
            setStats(getStats());
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#0a0a0f] border border-white/10 rounded-3xl w-[520px] max-h-[85vh] overflow-hidden shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Settings</h2>
                                <p className="text-sm text-gray-500">Manage your preferences and app experience</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content - No tabs, just scrollable sections */}
                        <div className="px-6 pb-6 max-h-[calc(85vh-100px)] overflow-y-auto no-scrollbar space-y-8">

                            {/* Appearance Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Palette size={18} className="text-purple-400" />
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Appearance</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {THEMES.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setSelectedTheme(theme.id)}
                                            className={`rounded-2xl p-3 border transition-all text-left ${selectedTheme === theme.id
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 hover:border-white/20 bg-white/5'
                                                }`}
                                        >
                                            <div className={`w-full h-16 rounded-xl mb-3 ${theme.preview} flex items-center justify-center`}>
                                                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur"></div>
                                            </div>
                                            <div className="text-xs font-semibold text-white mb-0.5">{theme.name}</div>
                                            <div className="text-[10px] text-gray-500 leading-tight">{theme.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Monitor size={18} className="text-blue-400" />
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Layout Mode</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'glass', name: 'Glass Stage', icon: Monitor, desc: 'Modern desktop' },
                                        { id: 'deck', name: 'Deck Studio', icon: Sliders, desc: 'Pro controls' },
                                        { id: 'ipod', name: 'iPod Classic', icon: Smartphone, desc: 'Retro vibes' },
                                    ].map((layout) => (
                                        <button
                                            key={layout.id}
                                            onClick={() => onSwitchLayout?.(layout.id as any)}
                                            className={`rounded-2xl p-4 border transition-all text-center ${currentLayout === layout.id
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 hover:border-white/20 bg-white/5'
                                                }`}
                                        >
                                            <layout.icon size={28} className={`mx-auto mb-2 ${currentLayout === layout.id ? 'text-blue-400' : 'text-gray-400'}`} />
                                            <div className="text-xs font-semibold text-white">{layout.name}</div>
                                            <div className="text-[10px] text-gray-500">{layout.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Audio Quality Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Volume2 size={18} className="text-green-400" />
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Audio Quality</h3>
                                </div>

                                {/* Streaming Quality */}
                                <div className="bg-white/5 rounded-2xl p-4 mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="text-sm font-medium text-white">Streaming Quality</div>
                                            <div className="text-xs text-gray-500">Adjust audio fidelity for playback</div>
                                        </div>
                                        <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                                            {['Normal', 'High', 'Lossless'].map((q, i) => {
                                                const val = ['96', '160', '320'][i];
                                                return (
                                                    <button
                                                        key={q}
                                                        onClick={() => setBitrate(val as any)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${bitrate === val
                                                                ? 'bg-white/20 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                            }`}
                                                    >
                                                        {q} {q === 'Lossless' && '+'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Crossfade Slider */}
                                <div className="bg-white/5 rounded-2xl p-4 mb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-medium text-white">Crossfade</div>
                                        <div className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">{crossfadeDuration}s</div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="range"
                                            min="0"
                                            max="12"
                                            value={crossfadeDuration}
                                            onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(crossfadeDuration / 12) * 100}%, rgba(255,255,255,0.1) ${(crossfadeDuration / 12) * 100}%, rgba(255,255,255,0.1) 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>off</span>
                                            <span>12s</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Normalize Volume */}
                                <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-white">Normalize Volume</div>
                                        <div className="text-xs text-gray-500">Set the same volume level for all tracks</div>
                                    </div>
                                    <button
                                        onClick={() => setNormalizeVolume(!normalizeVolume)}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${normalizeVolume ? 'bg-blue-500' : 'bg-white/20'}`}
                                    >
                                        <motion.div
                                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                                            animate={{ x: normalizeVolume ? 24 : 0 }}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Data Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Database size={18} className="text-orange-400" />
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Data & Storage</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            const playlistsData = {
                                                version: '2.0.0',
                                                exportDate: new Date().toISOString(),
                                                playlists: mixes.map(mix => ({
                                                    id: mix.id,
                                                    title: mix.title,
                                                    color: mix.color,
                                                    songs: mix.songs
                                                }))
                                            };
                                            const dataStr = JSON.stringify(playlistsData, null, 2);
                                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                            const url = URL.createObjectURL(dataBlob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `melora-playlists-${new Date().toISOString().split('T')[0]}.json`;
                                            link.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-center transition-all border border-white/5"
                                    >
                                        <span className="text-2xl mb-2 block">📦</span>
                                        <span className="text-sm font-medium text-white">Backup</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Reset all settings to default?')) {
                                                resetSettings();
                                                window.location.reload();
                                            }
                                        }}
                                        className="p-4 bg-white/5 hover:bg-red-500/10 rounded-2xl text-center transition-all border border-white/5 hover:border-red-500/30"
                                    >
                                        <span className="text-2xl mb-2 block">🔄</span>
                                        <span className="text-sm font-medium text-white">Reset</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
