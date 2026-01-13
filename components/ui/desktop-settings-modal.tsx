"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Music, Volume2, Clock, Database } from 'lucide-react';
import { usePlayback } from '@/components/providers/playback-context';
import { saveSettings, clearCache, resetSettings } from '@/lib/settings';

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DesktopSettingsModal({ isOpen, onClose }: DesktopSettingsModalProps) {
    const {
        bitrate, setBitrate,
        crossfadeDuration, setCrossfadeDuration,
        shuffle, setShuffle,
        repeat, setRepeat,
        sleepTimer, setSleepTimer,
        stopAtEndOfSong, setStopAtEndOfSong,
        volume, setVolume,
        mixes
    } = usePlayback();

    const [activeTab, setActiveTab] = useState<'playback' | 'audio' | 'data'>('playback');

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
                        className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl w-[480px] max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                    <SettingsIcon className="text-white" size={20} />
                                </div>
                                <h2 className="text-xl font-semibold text-white">Settings</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-2 p-4 border-b border-zinc-800/50">
                            <button
                                onClick={() => setActiveTab('playback')}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'playback'
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                    }`}
                            >
                                <Music size={16} className="inline mr-2" />
                                Playback
                            </button>
                            <button
                                onClick={() => setActiveTab('audio')}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'audio'
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                    }`}
                            >
                                <Volume2 size={16} className="inline mr-2" />
                                Audio
                            </button>
                            <button
                                onClick={() => setActiveTab('data')}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'data'
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                    }`}
                            >
                                <Database size={16} className="inline mr-2" />
                                Data
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            <AnimatePresence mode="wait">
                                {activeTab === 'playback' && (
                                    <motion.div
                                        key="playback"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6"
                                    >
                                        {/* Shuffle & Repeat */}
                                        <div>
                                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Controls</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setShuffle(!shuffle)}
                                                    className={`p-4 rounded-xl border-2 transition-all ${shuffle
                                                            ? 'border-orange-500 bg-orange-500/10'
                                                            : 'border-zinc-700 hover:border-zinc-600'
                                                        }`}
                                                >
                                                    <div className="text-left">
                                                        <div className={`text-sm font-medium ${shuffle ? 'text-orange-400' : 'text-white'}`}>
                                                            Shuffle
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-1">
                                                            {shuffle ? 'On' : 'Off'}
                                                        </div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                                                        setRepeat(nextRepeat);
                                                    }}
                                                    className={`p-4 rounded-xl border-2 transition-all ${repeat !== 'off'
                                                            ? 'border-orange-500 bg-orange-500/10'
                                                            : 'border-zinc-700 hover:border-zinc-600'
                                                        }`}
                                                >
                                                    <div className="text-left">
                                                        <div className={`text-sm font-medium ${repeat !== 'off' ? 'text-orange-400' : 'text-white'}`}>
                                                            Repeat
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-1">
                                                            {repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Volume */}
                                        <div>
                                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Volume</h3>
                                            <div className="bg-zinc-800/50 rounded-xl p-4">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={Math.round(volume * 100)}
                                                    onChange={(e) => {
                                                        const newVol = parseInt(e.target.value) / 100;
                                                        setVolume(newVol);
                                                        saveSettings({ volume: newVol });
                                                    }}
                                                    className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-orange-500"
                                                    style={{
                                                        background: `linear-gradient(to right, #f97316 0%, #f97316 ${volume * 100}%, #3f3f46 ${volume * 100}%, #3f3f46 100%)`
                                                    }}
                                                />
                                                <div className="text-center text-2xl font-bold text-white mt-3">
                                                    {Math.round(volume * 100)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sleep Timer */}
                                        <div>
                                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Sleep Timer</h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSleepTimer(null);
                                                        setStopAtEndOfSong(false);
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${!sleepTimer && !stopAtEndOfSong
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    Off
                                                </button>
                                                <button
                                                    onClick={() => setSleepTimer({ endTime: Date.now() + 15 * 60 * 1000, duration: 15 })}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${sleepTimer?.duration === 15
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    15m
                                                </button>
                                                <button
                                                    onClick={() => setSleepTimer({ endTime: Date.now() + 30 * 60 * 1000, duration: 30 })}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${sleepTimer?.duration === 30
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    30m
                                                </button>
                                                <button
                                                    onClick={() => setSleepTimer({ endTime: Date.now() + 60 * 60 * 1000, duration: 60 })}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${sleepTimer?.duration === 60
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    1h
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSleepTimer(null);
                                                        setStopAtEndOfSong(true);
                                                    }}
                                                    className={`col-span-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${stopAtEndOfSong
                                                            ? 'bg-white text-black'
                                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    End of Song
                                                </button>
                                            </div>
                                            {sleepTimer && (
                                                <p className="text-xs text-zinc-500 text-center mt-3">
                                                    ⏱️ {Math.ceil((sleepTimer.endTime - Date.now()) / 60000)} min remaining
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'audio' && (
                                    <motion.div
                                        key="audio"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-6"
                                    >
                                        {/* Audio Quality */}
                                        <div>
                                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Stream Quality</h3>
                                            <div className="space-y-2">
                                                {[
                                                    { value: '320', label: '320 kbps', desc: 'Highest' },
                                                    { value: '160', label: '160 kbps', desc: 'High' },
                                                    { value: '96', label: '96 kbps', desc: 'Medium' },
                                                    { value: '48', label: '48 kbps', desc: 'Low' },
                                                    { value: '12', label: '12 kbps', desc: 'Data Saver' },
                                                ].map(q => (
                                                    <button
                                                        key={q.value}
                                                        onClick={() => setBitrate(q.value as any)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${bitrate === q.value
                                                                ? 'bg-white text-black'
                                                                : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                                                            }`}
                                                    >
                                                        <span className="font-medium">{q.label}</span>
                                                        <span className={`text-xs ${bitrate === q.value ? 'text-black/60' : 'text-zinc-500'}`}>
                                                            {q.desc}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Crossfade */}
                                        <div>
                                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Crossfade</h3>
                                            <div className="flex gap-2">
                                                {[0, 3, 5, 10].map(sec => (
                                                    <button
                                                        key={sec}
                                                        onClick={() => setCrossfadeDuration(sec)}
                                                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${crossfadeDuration === sec
                                                                ? 'bg-white text-black'
                                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                            }`}
                                                    >
                                                        {sec === 0 ? 'Off' : `${sec}s`}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-zinc-500 text-center mt-3">
                                                Smooth transitions between songs
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'data' && (
                                    <motion.div
                                        key="data"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-3"
                                    >
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
                                                alert('Playlists exported successfully!');
                                            }}
                                            className="w-full p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">📦</div>
                                                <div>
                                                    <div className="font-medium">Backup Playlists</div>
                                                    <div className="text-xs text-blue-400/60 mt-0.5">Export as JSON</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (confirm('Clear all cached data? Settings will be preserved.')) {
                                                    clearCache();
                                                    alert('Cache cleared successfully!');
                                                }
                                            }}
                                            className="w-full p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">🗑️</div>
                                                <div>
                                                    <div className="font-medium">Clear Cache</div>
                                                    <div className="text-xs text-yellow-400/60 mt-0.5">Free up space</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                                                    resetSettings();
                                                    window.location.reload();
                                                }
                                            }}
                                            className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">⚠️</div>
                                                <div>
                                                    <div className="font-medium">Reset Settings</div>
                                                    <div className="text-xs text-red-400/60 mt-0.5">Restore defaults</div>
                                                </div>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-zinc-800 text-center">
                            <p className="text-xs text-zinc-500">Melora v2.0 • Premium Experience</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
