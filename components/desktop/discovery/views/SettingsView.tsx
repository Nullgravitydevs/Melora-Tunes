"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Settings as SettingsIcon, Volume2, Palette, Music2, Download,
    Globe, Bell, Trash2, Info, ChevronRight, Check, X
} from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { loadSettings, saveSettings, resetSettings, clearCache, AppSettings } from "@/lib/settings";
import { AudioQuality } from "@/lib/types";

/* ============================================================================
   SETTINGS VIEW - Quality, Theme, Cache, etc.
   ============================================================================ */

interface SettingsViewProps {
    onNavigate: (view: { id: string; data?: any }) => void;
}

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
    { value: 'hires', label: 'Hi-Res Lossless', desc: '24-bit/192kHz - Best quality' },
    { value: 'flac', label: 'Lossless', desc: 'FLAC 16-bit/44.1kHz' },
    { value: '320', label: 'High', desc: '320kbps AAC' },
    { value: '160', label: 'Normal', desc: '160kbps AAC' },
    { value: '96', label: 'Low', desc: '96kbps - Saves data' },
];

const THEME_OPTIONS = [
    { value: 'classic', label: 'Classic White', color: '#f5f5f7' },
    { value: 'black', label: 'Midnight Black', color: '#1d1d1f' },
    { value: 'silver', label: 'Silver', color: '#c7c7cc' },
    { value: 'dark', label: 'Space Gray', color: '#3a3a3c' },
    { value: 'blue', label: 'Sky Blue', color: '#007aff' },
    { value: 'rosegold', label: 'Rose Gold', color: '#b76e79' },
];

export function SettingsView({ onNavigate }: SettingsViewProps) {
    const { qualityPreference, setQualityPreference, showToast } = usePlayback();
    const [settings, setLocalSettings] = useState<AppSettings | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    useEffect(() => {
        setLocalSettings(loadSettings());
    }, []);

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        if (!settings) return;
        const updated = { ...settings, [key]: value };
        setLocalSettings(updated);
        saveSettings({ [key]: value });

        if (key === 'qualityPreference') {
            setQualityPreference(value as AudioQuality);
        }
    };

    const handleClearCache = () => {
        clearCache();
        showToast('Cache cleared', 'success');
    };

    const handleFactoryReset = () => {
        if (confirmReset) {
            resetSettings();
            localStorage.clear();
            showToast('Factory reset complete. Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
        }
    };

    if (!settings) return null;

    return (
        <div className="min-h-full p-8 max-w-2xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <SettingsIcon className="text-white/40" />
                    Settings
                </h1>
                <p className="text-white/40">Customize your experience</p>
            </motion.div>

            {/* Audio Quality */}
            <Section title="Audio Quality" icon={<Music2 size={18} />}>
                <div className="space-y-2">
                    {QUALITY_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => updateSetting('qualityPreference', opt.value)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${settings.qualityPreference === opt.value
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent'
                                }`}
                        >
                            <div className="text-left">
                                <p className="font-medium">{opt.label}</p>
                                <p className="text-sm text-white/40">{opt.desc}</p>
                            </div>
                            {settings.qualityPreference === opt.value && (
                                <Check size={18} className="text-white/60" />
                            )}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Theme */}
            <Section title="iPod Theme" icon={<Palette size={18} />}>
                <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((theme) => (
                        <button
                            key={theme.value}
                            onClick={() => updateSetting('theme', theme.value as AppSettings['theme'])}
                            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${settings.theme === theme.value
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent'
                                }`}
                        >
                            <div
                                className="w-8 h-8 rounded-full border-2 border-white/20"
                                style={{ background: theme.color }}
                            />
                            <p className="text-xs">{theme.label}</p>
                        </button>
                    ))}
                </div>
            </Section>

            {/* Notifications */}
            <Section title="Notifications" icon={<Bell size={18} />}>
                <Toggle
                    label="Desktop Notifications"
                    description="Show now playing notifications"
                    value={settings.notificationsEnabled || false}
                    onChange={(v) => updateSetting('notificationsEnabled', v)}
                />
            </Section>

            {/* Playback */}
            <Section title="Playback" icon={<Volume2 size={18} />}>
                <Toggle
                    label="Stop at End of Song"
                    description="Don't auto-play next song"
                    value={settings.stopAtEndOfSong || false}
                    onChange={(v) => updateSetting('stopAtEndOfSong', v)}
                />
            </Section>

            {/* Storage */}
            <Section title="Storage & Data" icon={<Download size={18} />}>
                <button
                    onClick={handleClearCache}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                >
                    <div className="text-left">
                        <p className="font-medium">Clear Cache</p>
                        <p className="text-sm text-white/40">Remove temporary data</p>
                    </div>
                    <ChevronRight size={18} className="text-white/30" />
                </button>

                <button
                    onClick={handleFactoryReset}
                    className={`w-full flex items-center justify-between p-4 rounded-xl mt-2 transition-all ${confirmReset ? 'bg-red-500/20 border border-red-500/40' : 'bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                >
                    <div className="text-left">
                        <p className={`font-medium ${confirmReset ? 'text-red-400' : ''}`}>
                            {confirmReset ? 'Tap Again to Confirm' : 'Factory Reset'}
                        </p>
                        <p className="text-sm text-white/40">
                            {confirmReset ? 'This will delete all your data' : 'Delete all data and settings'}
                        </p>
                    </div>
                    <Trash2 size={18} className={confirmReset ? 'text-red-400' : 'text-white/30'} />
                </button>
            </Section>

            {/* About */}
            <Section title="About" icon={<Info size={18} />}>
                <div className="p-4 rounded-xl bg-white/[0.02]">
                    <p className="font-medium">Melora</p>
                    <p className="text-sm text-white/40">Version {settings.version || '2.0.0'}</p>
                </div>
            </Section>
        </div>
    );
}

// Section Component
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                {icon}
                {title}
            </h2>
            {children}
        </motion.section>
    );
}

// Toggle Component
function Toggle({ label, description, value, onChange }: {
    label: string;
    description: string;
    value: boolean;
    onChange: (v: boolean) => void
}) {
    return (
        <button
            onClick={() => onChange(!value)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all"
        >
            <div className="text-left">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-white/40">{description}</p>
            </div>
            <div className={`w-12 h-7 rounded-full p-1 transition-all ${value ? 'bg-white/30' : 'bg-white/10'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </button>
    );
}
