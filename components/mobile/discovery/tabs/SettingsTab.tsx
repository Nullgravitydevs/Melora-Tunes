"use client";

import React, { useState, useMemo } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { motion, AnimatePresence } from "framer-motion";
import {
    Disc, ChevronRight, Volume2, Moon, Gauge, Globe,
    Trash2, Info, User, Monitor, Database, Heart, Coffee,
    Github, MessageCircle, Check, Layout, Radio, Server
} from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getStats } from "@/lib/stats";
import { FREQUENCIES } from "@/hooks/useEqualizer";
import { factoryReset } from "@/lib/cleanup";

const LANGUAGES = [
    "english", "hindi", "punjabi", "tamil", "telugu",
    "marathi", "gujarati", "bengali", "kannada", "bhojpuri",
    "malayalam", "urdu", "haryanvi", "rajasthani", "odia", "assamese",
];

type Tab = "profile" | "experience" | "audio" | "library" | "stats" | "support" | "about";

const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "experience", label: "Experience", icon: Monitor },
    { id: "audio", label: "Audio & Language", icon: Volume2 },
    { id: "library", label: "Library", icon: Database },
    { id: "stats", label: "Stats", icon: Server },
    { id: "support", label: "Support", icon: Heart },
    { id: "about", label: "About", icon: Info },
];

export function SettingsTab() {
    const {
        volume, setVolume, qualityPreference, setQualityPreference,
        sleepTimer, setSleepTimer, notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed, stopAtEndOfSong, setStopAtEndOfSong,
        likedSongs, mixes, setMixes, recentlyPlayed, eq,
    } = usePlayback();

    const [activeTab, setActiveTab] = useState<Tab>("profile");
    const settings = useMemo(() => loadSettings(), []);
    const [selectedLangs, setSelectedLangs] = useState<string[]>(settings.languages || ["english", "hindi"]);

    // Profile
    const [profileName, setProfileName] = useState(settings.userName || "");
    const [profileDOB, setProfileDOB] = useState(settings.userDOB || "");

    const [showConfirm, setShowConfirm] = useState<{ message: string; action: () => void; destructive?: boolean } | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const stats = useMemo(() => {
        try { return getStats(); } catch { return { totalPlays: 0, totalTime: 0 }; }
    }, []);

    const handleLangToggle = (lang: string) => {
        const updated = selectedLangs.includes(lang)
            ? selectedLangs.filter((l) => l !== lang)
            : [...selectedLangs, lang];
        if (updated.length === 0) return;
        setSelectedLangs(updated);
        saveSettings({ languages: updated });
        window.dispatchEvent(new CustomEvent("melora-settings-changed"));
    };

    const saveProfile = () => {
        saveSettings({ userName: profileName, userDOB: profileDOB });
    };

    const handleSwitchMode = (mode: string) => {
        setShowConfirm({
            message: `Switch to ${mode === "CLASSIC" ? "iPod Classic" : mode === "DECK" ? "Deck Studio" : "Discovery"} interface?`,
            action: () => {
                window.dispatchEvent(new CustomEvent("melora-mode-change", { detail: mode }));
                setShowConfirm(null);
            }
        });
    };

    const handleClearCache = () => {
        setShowConfirm({
            message: "Clear all cached data? This won't affect downloads or playlists.",
            action: () => {
                try {
                    const keys = Object.keys(localStorage);
                    keys.forEach((k) => {
                        if (k.startsWith("api-cache-") || k.startsWith("search-cache-")) localStorage.removeItem(k);
                    });
                } catch { }
                setShowConfirm(null);
            }
        });
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const setSleepMinutes = (minutes: number) => {
        if (minutes === 0) { setSleepTimer(null); return; }
        setSleepTimer({ endTime: Date.now() + minutes * 60 * 1000, duration: minutes * 60 * 1000 });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-4">
            <div className="px-5 pt-14 pb-2">
                <h1 className="text-[26px] font-bold text-white tracking-tight">Settings</h1>
            </div>

            {/* Tab bar - horizontal scroll */}
            <div className="px-5 mb-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 pb-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all flex-shrink-0
                                    ${isActive
                                        ? "bg-white text-black border-white"
                                        : "bg-white/[0.03] text-white/40 border-white/[0.06] active:bg-white/[0.06]"
                                    }`}
                            >
                                <Icon size={13} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-5 pb-44">
                <AnimatePresence mode="wait">
                    {/* ─── PROFILE ─── */}
                    {activeTab === "profile" && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        {profileName ? profileName.charAt(0).toUpperCase() : <User size={28} />}
                                    </div>
                                    <div>
                                        <p className="text-[16px] font-bold text-white">{profileName || "Guest User"}</p>
                                        <p className="text-[11px] text-white/30">Local Profile</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-white/25 tracking-[0.1em] mb-1.5 block">Display Name</label>
                                        <input
                                            type="text"
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            onBlur={saveProfile}
                                            placeholder="Enter your name"
                                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-white/25 tracking-[0.1em] mb-1.5 block">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={profileDOB}
                                            onChange={(e) => setProfileDOB(e.target.value)}
                                            onBlur={saveProfile}
                                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/[0.12]"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={saveProfile}
                                    className="mt-4 w-full py-2.5 bg-white text-black text-[12px] font-bold rounded-xl active:scale-95 transition-transform"
                                >
                                    Save Changes
                                </button>
                            </div>

                            {/* Stats card */}
                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
                                <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-3">Your Stats</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">{stats.totalPlays}</p>
                                        <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Plays</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">{formatTime(stats.totalTime || 0)}</p>
                                        <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Listen Time</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">{likedSongs.length}</p>
                                        <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">Liked</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── EXPERIENCE ─── */}
                    {activeTab === "experience" && (
                        <motion.div key="experience" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <p className="text-[12px] text-white/30 mb-2">Choose your visual interface</p>

                            {[
                                { id: "DECK", title: "Deck Studio", desc: "Analog cassette physics", icon: Radio },
                                { id: "DISCOVERY", title: "Discovery Glass", desc: "Modern digital library", icon: Disc },
                                { id: "CLASSIC", title: "iPod Classic", desc: "Click Wheel interface", icon: Disc },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => handleSwitchMode(mode.id)}
                                    className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 active:bg-white/[0.06] transition-colors"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center">
                                        <mode.icon size={20} className="text-white/60" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[14px] font-bold text-white">{mode.title}</p>
                                        <p className="text-[11px] text-white/30">{mode.desc}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-white/20" />
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* ─── AUDIO & LANGUAGE ─── */}
                    {activeTab === "audio" && (
                        <motion.div key="audio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                            {/* Languages */}
                            <SettingsGroup title="Content Languages">
                                <div className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {LANGUAGES.map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => handleLangToggle(lang)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border capitalize transition-colors flex items-center gap-1
                                                    ${selectedLangs.includes(lang)
                                                        ? "bg-white text-black border-white"
                                                        : "bg-transparent text-white/30 border-white/[0.06]"
                                                    }`}
                                            >
                                                {lang}
                                                {selectedLangs.includes(lang) && <Check size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </SettingsGroup>

                            {/* Quality */}
                            <SettingsGroup title="Streaming Quality">
                                <div className="p-4">
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {([
                                            { id: "hires", label: "Hi-Res", sub: "24-bit" },
                                            { id: "flac", label: "Lossless", sub: "16-bit" },
                                            { id: "320", label: "High", sub: "320k" },
                                            { id: "160", label: "Standard", sub: "160k" },
                                            { id: "96", label: "Saver", sub: "96k" },
                                            { id: "auto", label: "Auto", sub: "Adaptive" },
                                        ] as const).map((q) => (
                                            <button
                                                key={q.id}
                                                onClick={() => setQualityPreference(q.id as any)}
                                                className={`py-2.5 rounded-lg border transition-colors text-center
                                                    ${qualityPreference === q.id
                                                        ? "bg-white text-black border-white"
                                                        : "bg-transparent text-white/30 border-white/[0.06] active:bg-white/[0.04]"
                                                    }`}
                                            >
                                                <div className="text-[11px] font-bold">{q.label}</div>
                                                <div className={`text-[9px] ${qualityPreference === q.id ? "text-black/50" : "text-white/15"}`}>{q.sub}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </SettingsGroup>

                            {/* Playback Speed */}
                            <SettingsGroup title="Playback Speed">
                                <div className="p-4">
                                    <div className="flex gap-1.5">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setPlaybackSpeed(s)}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-semibold border transition-colors
                                                    ${playbackSpeed === s
                                                        ? "bg-white text-black border-white"
                                                        : "bg-transparent text-white/30 border-white/[0.06]"
                                                    }`}
                                            >
                                                {s}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </SettingsGroup>

                            {/* Volume */}
                            <SettingsGroup title="Volume">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Volume2 size={14} className="text-white/30" />
                                        <span className="text-[11px] text-white/30 font-mono">{Math.round(volume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.01" value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full accent-white h-1"
                                    />
                                </div>
                            </SettingsGroup>

                            {/* Equalizer */}
                            <SettingsGroup title="Equalizer">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <select
                                            value={eq.currentPreset}
                                            onChange={(e) => eq.setPreset(e.target.value)}
                                            className="bg-white/[0.06] text-white text-[11px] font-medium rounded-lg px-2 py-1.5 outline-none border border-white/[0.06]"
                                            disabled={!eq.isEnabled}
                                        >
                                            {eq.presets.map((p: string) => (
                                                <option key={p} value={p} className="bg-black">{p}</option>
                                            ))}
                                            <option value="Custom" className="bg-black">Custom</option>
                                        </select>
                                        <button
                                            onClick={() => eq.setIsEnabled(!eq.isEnabled)}
                                            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${eq.isEnabled ? "bg-white" : "bg-white/10"}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full transition-transform ${eq.isEnabled ? "translate-x-4 bg-black" : "translate-x-0 bg-white/30"}`} />
                                        </button>
                                    </div>

                                    <div className={`transition-opacity ${eq.isEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                                        <div className="flex items-end justify-between gap-1 h-24">
                                            {FREQUENCIES.map((freq, i) => (
                                                <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                                                    <div className="relative h-16 w-1 bg-white/10 rounded-full">
                                                        <div
                                                            className="absolute bottom-0 w-full bg-white/40 rounded-full"
                                                            style={{ height: `${((eq.bands[i] + 12) / 24) * 100}%` }}
                                                        />
                                                        <input
                                                            type="range" min="-12" max="12" step="0.5"
                                                            value={eq.bands[i]}
                                                            onChange={(e) => eq.setBand(i, parseFloat(e.target.value))}
                                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 -rotate-90 opacity-0 cursor-pointer"
                                                        />
                                                        <div
                                                            className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg pointer-events-none"
                                                            style={{ bottom: `${((eq.bands[i] + 12) / 24) * 100}%`, transform: "translate(-50%, 50%)" }}
                                                        />
                                                    </div>
                                                    <span className="text-[7px] text-white/25 font-mono">
                                                        {freq >= 1000 ? `${freq / 1000}k` : freq}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SettingsGroup>

                            {/* Sleep Timer */}
                            <SettingsGroup title="Sleep Timer">
                                <div className="p-4">
                                    {sleepTimer ? (
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-indigo-400 text-[12px] font-bold">Timer Active</p>
                                                <p className="text-[10px] text-white/40">
                                                    Stops in {Math.max(0, Math.round((sleepTimer.endTime - Date.now()) / 60000))}m
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSleepTimer(null)}
                                                className="px-3 py-1.5 bg-indigo-500/80 text-white text-[11px] font-bold rounded-lg active:scale-95 transition-transform"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[
                                                { min: 5, label: "5m" },
                                                { min: 15, label: "15m" },
                                                { min: 30, label: "30m" },
                                                { min: 45, label: "45m" },
                                                { min: 60, label: "1h" },
                                                { min: 120, label: "2h" },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.min}
                                                    onClick={() => setSleepMinutes(opt.min)}
                                                    className="px-3.5 py-2 rounded-lg text-[11px] font-semibold border bg-transparent text-white/30 border-white/[0.06] active:bg-white/[0.04] transition-colors"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SettingsGroup>

                            {/* Toggle rows */}
                            <SettingsGroup title="Playback Options">
                                <ToggleRow label="Stop at end of song" value={stopAtEndOfSong} onChange={setStopAtEndOfSong} />
                                <ToggleRow label="Push notifications" value={notificationsEnabled} onChange={setNotificationsEnabled} />
                            </SettingsGroup>
                        </motion.div>
                    )}

                    {/* ─── LIBRARY ─── */}
                    {activeTab === "library" && (
                        <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            {/* Export */}
                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-bold text-white">Export Data</p>
                                    <p className="text-[11px] text-white/30">Save your mixes as JSON</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mixes));
                                        const a = document.createElement("a");
                                        a.setAttribute("href", dataStr);
                                        a.setAttribute("download", "melora-backup.json");
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                    }}
                                    className="px-4 py-2 bg-white text-black text-[11px] font-bold rounded-xl active:scale-95 transition-transform"
                                >
                                    Export
                                </button>
                            </div>

                            {/* Import */}
                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-bold text-white">Import Data</p>
                                    <p className="text-[11px] text-white/30">Restore mixes from backup</p>
                                </div>
                                <label className="px-4 py-2 bg-white/[0.06] text-white text-[11px] font-bold rounded-xl active:scale-95 transition-transform cursor-pointer">
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
                                                    const imported = JSON.parse(event.target?.result as string);
                                                    if (Array.isArray(imported)) {
                                                        setMixes(imported);
                                                        window.dispatchEvent(new CustomEvent("melora-library-updated"));
                                                    }
                                                } catch { }
                                            };
                                            reader.readAsText(file);
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Clear Cache */}
                            <button
                                onClick={handleClearCache}
                                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between active:bg-white/[0.05] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Trash2 size={16} className="text-white/30" />
                                    <span className="text-[13px] font-medium text-white/70">Clear Cache</span>
                                </div>
                                <ChevronRight size={14} className="text-white/15" />
                            </button>

                            {/* Factory Reset */}
                            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mt-6">
                                <p className="text-red-400/80 text-[11px] font-bold uppercase tracking-wider mb-3">Danger Zone</p>
                                {!showResetConfirm ? (
                                    <button
                                        onClick={() => setShowResetConfirm(true)}
                                        className="w-full py-3 bg-red-500/10 text-red-400/70 rounded-xl text-[12px] font-bold active:bg-red-500/20 transition-colors"
                                    >
                                        Factory Reset App
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowResetConfirm(false)}
                                            className="flex-1 py-3 bg-white/[0.06] text-white/50 rounded-xl text-[12px] font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => factoryReset()}
                                            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[12px] font-bold active:scale-95 transition-transform"
                                        >
                                            Confirm Reset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STATS ─── */}
                    {activeTab === "stats" && (
                        <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Total Plays", value: stats.totalPlays },
                                    { label: "Listen Time", value: formatTime(stats.totalTime || 0) },
                                    { label: "Liked Songs", value: likedSongs.length },
                                    { label: "Playlists", value: mixes.length },
                                    { label: "Total Songs", value: mixes.reduce((acc, m) => acc + m.songs.length, 0) },
                                    { label: "Recent", value: recentlyPlayed.length },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{s.value}</p>
                                        <p className="text-[9px] text-white/25 uppercase tracking-wider mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-8 text-center border border-dashed border-white/[0.06] rounded-2xl text-white/15 text-[12px]">
                                More insights coming soon
                            </div>
                        </motion.div>
                    )}

                    {/* ─── SUPPORT ─── */}
                    {activeTab === "support" && (
                        <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-10 space-y-6">
                            <div className="w-16 h-16 bg-pink-500 rounded-full mx-auto flex items-center justify-center text-white shadow-xl shadow-pink-500/20">
                                <Heart size={28} fill="currentColor" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Support Melora</h2>
                                <p className="text-[13px] text-white/40 max-w-xs mx-auto leading-relaxed">
                                    Melora is an open-source passion project. If you love the music, consider supporting development.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 px-4">
                                <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 bg-white text-black rounded-2xl text-[13px] font-bold active:scale-95 transition-transform">
                                    <Coffee size={16} /> Buy us a Coffee
                                </a>
                                <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 bg-white/[0.06] text-white/70 rounded-2xl text-[13px] font-bold border border-white/[0.06] active:scale-95 transition-transform">
                                    <Github size={16} /> Star on GitHub
                                </a>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── ABOUT ─── */}
                    {activeTab === "about" && (
                        <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-12 space-y-6">
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter mb-2">MELORA</h2>
                                <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-mono">v2.0.0</span>
                            </div>
                            <p className="text-[13px] text-white/30 max-w-xs mx-auto">
                                Designed for audiophiles who miss the tangible feel of music.
                            </p>

                            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl overflow-hidden mx-4">
                                <div className="divide-y divide-white/[0.04]">
                                    <InfoRow label="Version" value="2.0.0" />
                                    <InfoRow label="Playlists" value={String(mixes.length)} />
                                    <InfoRow label="Recent Songs" value={String(recentlyPlayed.length)} />
                                    <InfoRow label="Liked Songs" value={String(likedSongs.length)} />
                                </div>
                            </div>

                            <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-white/30 text-[12px] font-bold pt-4">
                                <MessageCircle size={14} /> Join our Discord
                            </a>

                            <p className="text-[9px] text-white/10 pt-8">
                                © 2026 Melora Tunes Project
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Confirm Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center px-8"
                        onClick={() => setShowConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-[14px] text-white/80 font-medium mb-6">{showConfirm.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirm(null)} className="flex-1 py-2.5 text-[13px] font-semibold text-white/50 bg-white/[0.05] rounded-xl active:bg-white/[0.08]">
                                    Cancel
                                </button>
                                <button
                                    onClick={showConfirm.action}
                                    className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl active:scale-95 transition-transform ${
                                        showConfirm.destructive
                                            ? "bg-red-500/80 text-white"
                                            : "bg-white text-black"
                                    }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Sub-components ──────────────────────────────────────

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-[11px] font-bold uppercase text-white/25 tracking-[0.15em] mb-2 px-1">{title}</h3>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
                {children}
            </div>
        </div>
    );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button onClick={() => onChange(!value)} className="w-full p-4 flex items-center justify-between border-t border-white/[0.04] first:border-t-0 active:bg-white/[0.02] transition-colors">
            <span className="text-[13px] font-medium text-white/70">{label}</span>
            <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${value ? "bg-white" : "bg-white/10"}`}>
                <div className={`w-5 h-5 rounded-full transition-transform ${value ? "translate-x-4 bg-black" : "translate-x-0 bg-white/30"}`} />
            </div>
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-4 flex justify-between items-center">
            <span className="text-[13px] font-medium text-white/70">{label}</span>
            <span className="text-[11px] text-white/30 font-mono">{value}</span>
        </div>
    );
}
