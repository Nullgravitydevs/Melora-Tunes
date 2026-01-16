"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Music, Volume2, Database, Bell, BarChart3, Clock } from 'lucide-react';
import { usePlayback } from '@/components/providers/playback-context';
import { saveSettings, clearCache, resetSettings } from '@/lib/settings';
import { decodeHtml } from "@/lib/utils";
import { getStats, getTopSongs, getTopArtists, GlobalStats } from "@/lib/stats";

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
        mixes, setMixes,
        notificationsEnabled, setNotificationsEnabled
    } = usePlayback();

    const [stats, setStats] = useState<GlobalStats | null>(null);

    const [activeTab, setActiveTab] = useState<'playback' | 'audio' | 'data' | 'stats'>('playback');

    useEffect(() => {
        if (isOpen && activeTab === 'stats') {
            setStats(getStats());
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notifications");
            return;
        }

        if (Notification.permission === "granted") {
            setNotificationsEnabled(!notificationsEnabled);
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                setNotificationsEnabled(true);
                new Notification("Melora Notification", { body: "Notifications enabled!" });
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl w-[500px] max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center shadow-lg">
                                    <SettingsIcon className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                                    <p className="text-xs text-zinc-500">Customize your experience</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-1 p-2 mx-6 mt-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                            {[
                                { id: 'playback', icon: Music, label: 'Playback' },
                                { id: 'audio', icon: Volume2, label: 'Audio' },
                                { id: 'stats', icon: BarChart3, label: 'Stats' },
                                { id: 'data', icon: Database, label: 'Data' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                                        }`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            <AnimatePresence mode="wait">
                                {activeTab === 'playback' && (
                                    <motion.div
                                        key="playback"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        {/* Notifications */}
                                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                                                    <Bell size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">Desktop Notifications</div>
                                                    <div className="text-xs text-zinc-500">Show alerts on song change</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={requestNotificationPermission}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationsEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                                            >
                                                <motion.div
                                                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                                                    animate={{ x: notificationsEnabled ? 24 : 0 }}
                                                />
                                            </button>
                                        </div>

                                        {/* Shuffle & Repeat Controls */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setShuffle(!shuffle)}
                                                className={`p-4 rounded-xl border transition-all text-left ${shuffle
                                                    ? 'border-blue-500/50 bg-blue-500/10'
                                                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className={`text-sm font-medium mb-1 ${shuffle ? 'text-blue-400' : 'text-white'}`}>Shuffle</div>
                                                <div className="text-xs text-zinc-500">{shuffle ? 'On' : 'Off'}</div>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                                                    setRepeat(nextRepeat);
                                                }}
                                                className={`p-4 rounded-xl border transition-all text-left ${repeat !== 'off'
                                                    ? 'border-blue-500/50 bg-blue-500/10'
                                                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className={`text-sm font-medium mb-1 ${repeat !== 'off' ? 'text-blue-400' : 'text-white'}`}>Repeat</div>
                                                <div className="text-xs text-zinc-500">{repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}</div>
                                            </button>
                                        </div>

                                        {/* Sleep Timer */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Sleep Timer</h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'Off', action: () => { setSleepTimer(null); setStopAtEndOfSong(false); }, active: !sleepTimer && !stopAtEndOfSong },
                                                    { label: '15m', action: () => setSleepTimer({ endTime: Date.now() + 15 * 60 * 1000, duration: 15 }), active: sleepTimer?.duration === 15 },
                                                    { label: '30m', action: () => setSleepTimer({ endTime: Date.now() + 30 * 60 * 1000, duration: 30 }), active: sleepTimer?.duration === 30 },
                                                    { label: '1h', action: () => setSleepTimer({ endTime: Date.now() + 60 * 60 * 1000, duration: 60 }), active: sleepTimer?.duration === 60 },
                                                ].map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={opt.action}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${opt.active
                                                            ? 'bg-zinc-200 text-black'
                                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => { setSleepTimer(null); setStopAtEndOfSong(true); }}
                                                    className={`col-span-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${stopAtEndOfSong
                                                        ? 'bg-zinc-200 text-black'
                                                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                        }`}
                                                >
                                                    End of Song
                                                </button>
                                            </div>
                                            {sleepTimer && (
                                                <p className="text-xs text-blue-400 text-center mt-3 bg-blue-500/10 py-1 rounded border border-blue-500/20">
                                                    ⏱️ {Math.ceil((sleepTimer.endTime - Date.now()) / 60000)} min remaining
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'audio' && (
                                    <motion.div
                                        key="audio"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        {/* Volume */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Master Volume</h3>
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
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
                                                    className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-white"
                                                    style={{
                                                        background: `linear-gradient(to right, #fff 0%, #fff ${volume * 100}%, #3f3f46 ${volume * 100}%, #3f3f46 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                                                    <Volume2 size={14} />
                                                    <span>{Math.round(volume * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audio Quality */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Stream Quality</h3>
                                            <div className="space-y-2">
                                                {[
                                                    { value: '320', label: '320 kbps', desc: 'Highest Quality' },
                                                    { value: '160', label: '160 kbps', desc: 'High Quality' },
                                                    { value: '96', label: '96 kbps', desc: 'Standard' },
                                                    { value: '48', label: '48 kbps', desc: 'Low Bandwidth' },
                                                ].map(q => (
                                                    <button
                                                        key={q.value}
                                                        onClick={() => setBitrate(q.value as any)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${bitrate === q.value
                                                            ? 'bg-zinc-800 border-zinc-700 text-white'
                                                            : 'bg-zinc-900/30 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-sm">{q.label}</span>
                                                        <span className="text-xs opacity-60">{q.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Crossfade */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Crossfade</h3>
                                            <div className="flex gap-2">
                                                {[0, 3, 5, 10, 12].map(sec => (
                                                    <button
                                                        key={sec}
                                                        onClick={() => setCrossfadeDuration(sec)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${crossfadeDuration === sec
                                                            ? 'bg-zinc-200 text-black'
                                                            : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        {sec === 0 ? 'Off' : `${sec}s`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'stats' && (
                                    <motion.div
                                        key="stats"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-xl">
                                                <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Total Plays</div>
                                                <div className="text-3xl font-bold text-white">{stats?.totalPlays || 0}</div>
                                            </div>
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-xl">
                                                <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Listening Time</div>
                                                <div className="text-3xl font-bold text-white">
                                                    {Math.floor((stats?.totalTime || 0) / 60)}<span className="text-sm font-normal text-zinc-500 ml-1">mins</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Top Songs */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Top Songs</h3>
                                            <div className="space-y-2">
                                                {Object.values(stats?.topSongs || {})
                                                    .sort((a, b) => b.plays - a.plays)
                                                    .slice(0, 5)
                                                    .map((song, i) => (
                                                        <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
                                                            <div className="font-mono text-zinc-600 w-4 text-center text-sm font-bold">{i + 1}</div>
                                                            <img src={song.image} alt={song.name} className="w-10 h-10 rounded object-cover" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm text-white truncate">{decodeHtml(song.name)}</div>
                                                                <div className="text-xs text-zinc-500 truncate">{song.artist}</div>
                                                            </div>
                                                            <div className="text-xs font-medium text-zinc-400 px-2 py-1 bg-zinc-800 rounded">{song.plays} plays</div>
                                                        </div>
                                                    ))}
                                                {(stats?.totalPlays || 0) === 0 && (
                                                    <div className="text-center py-8 text-zinc-600 text-sm">
                                                        Play some music to see your stats!
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top Artists */}
                                        <div>
                                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Top Artists</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(stats?.topArtists || {})
                                                    .map(([name, plays]) => ({ name, plays }))
                                                    .sort((a, b) => b.plays - a.plays)
                                                    .slice(0, 5)
                                                    .map((artist, i) => (
                                                        <div key={artist.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700">
                                                            <span className="text-sm text-zinc-300">{artist.name}</span>
                                                            <span className="text-xs text-zinc-500 bg-black/30 px-1.5 rounded">{artist.plays}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                    </motion.div>
                                )}

                                {activeTab === 'data' && (
                                    <motion.div
                                        key="data"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                                            <h3 className="text-sm font-medium text-white mb-1">Library Management</h3>
                                            <p className="text-xs text-zinc-500 mb-4">Export your playlists or restore from backup.</p>

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
                                                    className="p-3 bg-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span>📦 Backup</span>
                                                </button>

                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept=".json"
                                                        className="hidden"
                                                        id="restore-upload"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                try {
                                                                    const json = JSON.parse(event.target?.result as string);
                                                                    if (json.playlists && Array.isArray(json.playlists)) {
                                                                        if (confirm(`Found ${json.playlists.length} playlists. Restore?`)) {
                                                                            setMixes(json.playlists);
                                                                            alert('Restored!');
                                                                            window.location.reload();
                                                                        }
                                                                    } else { alert('Invalid file'); }
                                                                } catch (err) { console.error(err); }
                                                            };
                                                            reader.readAsText(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => document.getElementById('restore-upload')?.click()}
                                                        className="w-full p-3 bg-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <span>📥 Restore</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-zinc-800">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Reset all settings?')) {
                                                        resetSettings();
                                                        window.location.reload();
                                                    }
                                                }}
                                                className="w-full p-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                Reset to Default Settings
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
