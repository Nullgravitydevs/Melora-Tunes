"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { useSettings } from "@/components/providers/settings-provider";
import {
    ChevronRight, Volume2, Globe, Trash2, Info, User,
    Monitor, Database, Heart, Coffee, Github, MessageCircle,
    Check, Activity
} from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getStats } from "@/lib/stats";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FREQUENCIES } from "@/hooks/useEqualizer";
import { factoryReset } from "@/lib/cleanup";

const LANGUAGES = [
    "english", "hindi", "punjabi", "tamil", "telugu",
    "marathi", "gujarati", "bengali", "kannada", "bhojpuri",
    "malayalam", "urdu", "haryanvi", "rajasthani", "odia", "assamese",
];

export function SettingsTab() {
    const { volume, setVolume, qualityPreference, setQualityPreference, sleepTimer, setSleepTimer, notificationsEnabled, setNotificationsEnabled, playbackSpeed, setPlaybackSpeed, stopAtEndOfSong, setStopAtEndOfSong, eq } = usePlayback();
    const { crossfadeDuration, setCrossfadeDuration } = useSettings();
    const { likedSongs, mixes, setMixes, recentlyPlayed } = useLibrary();

    const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
    const [profileName, setProfileName] = useState("");
    const [profileDOB, setProfileDOB] = useState("");

    useEffect(() => {
        const settings = loadSettings();
        setSelectedLangs(settings.languages || ["english", "hindi"]);
        setProfileName(settings.userName || "");
        setProfileDOB(settings.userDOB || "");
    }, []);

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
        <div className="pb-44 flex flex-col h-full font-sans overflow-y-auto no-scrollbar">
            <div className="px-5 pt-14 pb-6 sticky top-0 bg-black/80 backdrop-blur-xl z-20 border-b border-white/[0.05]">
                <h1 className="text-[32px] font-bold text-white tracking-tight">Settings</h1>
            </div>

            <div className="px-5 space-y-8 pt-4">
                
                {/* ─── PROFILE ─── */}
                <SettingsGroup title="Profile" icon={User}>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                {profileName ? profileName.charAt(0).toUpperCase() : <User size={28} />}
                            </div>
                            <div>
                                <p className="text-[16px] font-bold text-white">{profileName || "Guest User"}</p>
                                <p className="text-[11px] text-white/30">Local Profile</p>
                            </div>
                        </div>
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
                </SettingsGroup>

                {/* ─── VISUAL EXPERIENCE ─── */}
                <SettingsGroup title="Visual Experience" icon={Monitor}>
                    <div className="p-2 space-y-1">
                        {[
                            { id: "DISCOVERY", title: "Discovery Mobile", desc: "Modern touch-first player" },
                            { id: "CLASSIC", title: "iPod Classic", desc: "Click Wheel interface" },
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => handleSwitchMode(mode.id)}
                                className="w-full p-3 flex items-center gap-3 rounded-xl active:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex-1 text-left">
                                    <p className="text-[14px] font-bold text-white">{mode.title}</p>
                                    <p className="text-[11px] text-white/30">{mode.desc}</p>
                                </div>
                                <ChevronRight size={16} className="text-white/20" />
                            </button>
                        ))}
                    </div>
                </SettingsGroup>

                {/* ─── AUDIO & CONTENT ─── */}
                <SettingsGroup title="Audio & Content" icon={Volume2}>
                    <div className="p-4 border-b border-white/[0.04]">
                        <label className="text-[10px] font-bold uppercase text-white/25 tracking-[0.1em] mb-2 block">Content Languages</label>
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

                    <div className="p-4 border-b border-white/[0.04]">
                        <label className="text-[10px] font-bold uppercase text-white/25 tracking-[0.1em] mb-2 block">Streaming Quality</label>
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
                                    className={`py-2 rounded-lg border transition-colors text-center
                                        ${qualityPreference === q.id
                                            ? "bg-white text-black border-white"
                                            : "bg-transparent text-white/30 border-white/[0.06]"
                                        }`}
                                >
                                    <div className="text-[11px] font-bold">{q.label}</div>
                                    <div className={`text-[9px] ${qualityPreference === q.id ? "text-black/50" : "text-white/15"}`}>{q.sub}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-b border-white/[0.04]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-white/50">Crossfade Duration</span>
                            <span className="text-[11px] text-white/30 font-mono">{crossfadeDuration}s</span>
                        </div>
                        <input
                            type="range" min="0" max="12" step="1" value={crossfadeDuration}
                            onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                            className="w-full accent-white h-1"
                        />
                    </div>
                    
                    {/* Equalizer */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[11px] font-bold text-white/50">Equalizer</label>
                            <div className="flex items-center gap-3">
                                <select
                                    value={eq.currentPreset}
                                    onChange={(e) => eq.setPreset(e.target.value)}
                                    className="bg-white/[0.06] text-white text-[11px] font-medium rounded-lg px-2 py-1 outline-none border border-white/[0.06]"
                                    disabled={!eq.isEnabled}
                                >
                                    {eq.presets.map((p: string) => <option key={p} value={p} className="bg-black">{p}</option>)}
                                    <option value="Custom" className="bg-black">Custom</option>
                                </select>
                                <button
                                    onClick={() => eq.setIsEnabled(!eq.isEnabled)}
                                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${eq.isEnabled ? "bg-white" : "bg-white/10"}`}
                                >
                                    <div className={`w-5 h-5 rounded-full transition-transform ${eq.isEnabled ? "translate-x-4 bg-black" : "translate-x-0 bg-white/30"}`} />
                                </button>
                            </div>
                        </div>

                        <div className={`transition-opacity mt-4 ${eq.isEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                            <div className="flex items-end justify-between gap-1 h-20">
                                {FREQUENCIES.map((freq, i) => (
                                    <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                                        <div className="relative h-14 w-1 bg-white/10 rounded-full">
                                            <div
                                                className="absolute bottom-0 w-full bg-white/40 rounded-full"
                                                style={{ height: `${((eq.bands[i] + 12) / 24) * 100}%` }}
                                            />
                                            <input
                                                type="range" min="-12" max="12" step="0.5"
                                                value={eq.bands[i]}
                                                onChange={(e) => eq.setBand(i, parseFloat(e.target.value))}
                                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 -rotate-90 opacity-0 cursor-pointer"
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

                {/* ─── PLAYBACK OPTIONS ─── */}
                <SettingsGroup title="Playback Options" icon={Activity}>
                    <ToggleRow label="Stop at end of song" value={stopAtEndOfSong} onChange={setStopAtEndOfSong} />
                    <ToggleRow label="Push notifications" value={notificationsEnabled} onChange={setNotificationsEnabled} />
                    
                    <div className="p-4 border-t border-white/[0.04]">
                        <label className="text-[10px] font-bold uppercase text-white/25 tracking-[0.1em] mb-2 block">Sleep Timer</label>
                        {sleepTimer ? (
                            <div className="bg-white/[0.06] p-3 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-white text-[12px] font-bold">Timer Active</p>
                                    <p className="text-[10px] text-white/40">Stops in {Math.max(0, Math.round((sleepTimer.endTime - Date.now()) / 60000))}m</p>
                                </div>
                                <button onClick={() => setSleepTimer(null)} className="px-3 py-1 bg-white/10 text-white text-[11px] font-bold rounded-lg">Cancel</button>
                            </div>
                        ) : (
                            <div className="flex gap-1.5 flex-wrap">
                                {[5, 15, 30, 45, 60, 120].map((min) => (
                                    <button
                                        key={min}
                                        onClick={() => setSleepMinutes(min)}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-transparent text-white/30 border-white/[0.06]"
                                    >
                                        {min}m
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </SettingsGroup>

                {/* ─── DATA & STORAGE ─── */}
                <SettingsGroup title="Data & Storage" icon={Database}>
                    <button onClick={handleClearCache} className="w-full p-4 flex items-center justify-between active:bg-white/[0.02]">
                        <div className="flex items-center gap-3"><Trash2 size={16} className="text-white/30" /><span className="text-[13px] font-medium text-white/70">Clear Cache</span></div>
                        <ChevronRight size={14} className="text-white/15" />
                    </button>
                    <div className="p-4 border-t border-white/[0.04]">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mixes));
                                    a.download = "melora-backup.json";
                                    document.body.appendChild(a); a.click(); a.remove();
                                }}
                                className="flex-1 py-2.5 bg-white/[0.06] text-white text-[12px] font-bold rounded-xl"
                            >
                                Export Data
                            </button>
                            <label className="flex-1 py-2.5 bg-white/[0.06] text-white text-[12px] font-bold rounded-xl text-center cursor-pointer">
                                Import Data
                                <input
                                    type="file" accept=".json" className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            try {
                                                const imported = JSON.parse(event.target?.result as string);
                                                if (Array.isArray(imported)) { setMixes(imported); window.dispatchEvent(new CustomEvent("melora-library-updated")); }
                                            } catch { }
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="p-4 border-t border-white/[0.04]">
                        {!showResetConfirm ? (
                            <button onClick={() => setShowResetConfirm(true)} className="w-full py-2.5 bg-red-500/10 text-red-400 rounded-xl text-[12px] font-bold">Factory Reset</button>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 bg-white/[0.06] text-white/50 rounded-xl text-[12px] font-bold">Cancel</button>
                                <button onClick={() => factoryReset()} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-[12px] font-bold">Confirm Reset</button>
                            </div>
                        )}
                    </div>
                </SettingsGroup>

                {/* ─── ABOUT & STATS ─── */}
                <SettingsGroup title="About" icon={Info}>
                    <div className="p-6 text-center">
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-1">MELORA</h2>
                        <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-mono">v3.0.0</span>
                    </div>
                    <div className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
                        <InfoRow label="Total Plays" value={String(stats.totalPlays)} />
                        <InfoRow label="Listen Time" value={formatTime(stats.totalTime || 0)} />
                        <InfoRow label="Liked Songs" value={String(likedSongs.length)} />
                        <InfoRow label="Playlists" value={String(mixes.length)} />
                    </div>
                    <div className="p-4 flex flex-col gap-2 border-t border-white/[0.04]">
                        <a href="https://discord.gg/657ZJJUkkH" target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-2 py-2.5 bg-[#5865F2]/15 text-[#5865F2] rounded-xl text-[12px] font-bold">
                            <MessageCircle size={14} /> Discord
                        </a>
                        <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-2 py-2.5 bg-white/[0.04] text-white/40 rounded-xl text-[12px] font-bold">
                            <Github size={14} /> GitHub
                        </a>
                    </div>
                </SettingsGroup>

            </div>

            <ConfirmDialog
                open={showConfirm !== null}
                message={showConfirm?.message || ''}
                onConfirm={() => showConfirm?.action()}
                onCancel={() => setShowConfirm(null)}
                destructive={showConfirm?.destructive}
            />
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────

function SettingsGroup({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-[13px] font-bold text-white/50 mb-3 ml-2 flex items-center gap-2">
                <Icon size={16} /> {title}
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-sm backdrop-blur-md">
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
        <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-[13px] font-medium text-white/70">{label}</span>
            <span className="text-[11px] text-white/30 font-mono">{value}</span>
        </div>
    );
}
