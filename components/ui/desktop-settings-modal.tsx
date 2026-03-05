"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Database, Info, Layout, Disc, Radio, Monitor, Zap, Volume2, Moon, Heart, Coffee, Github, MessageCircle, Server, User } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { usePlayback, useLibrary, useUI } from "@/components/providers/playback-context";
import { useSettings } from "@/components/providers/settings-provider";
import { FREQUENCIES } from "@/hooks/useEqualizer";
import { factoryReset } from "@/lib/cleanup";
import { AppSettings, loadSettings, saveSettings } from "@/lib/settings";
import { getStats, getTopSongs, getTopArtists, GlobalStats, SongStats } from "@/lib/stats";
import { formatDuration } from "@/lib/helpers";

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchLayout?: (layout: 'deck' | 'ipod' | 'discovery') => void;
    currentLayout?: 'deck' | 'ipod' | 'discovery';
}

type SettingsTab = 'profile' | 'experience' | 'audio' | 'library' | 'stats' | 'support' | 'about';

const BACKUP_SCHEMA_VERSION = 2;

type ImportBackupPayload = {
    mixes: unknown[];
    likedSongs: unknown[];
    recentlyPlayed: unknown[];
    savedAlbums: unknown[];
    savedArtists: unknown[];
    settings: Partial<AppSettings>;
};

type PendingImport = {
    source: 'legacy' | 'v2';
    payload: ImportBackupPayload;
};

type RestoreMode = 'mixes-only' | 'full';

function formatDelta(nextValue: number, currentValue: number): string {
    const delta = nextValue - currentValue;
    if (delta === 0) return '±0';
    return delta > 0 ? `+${delta}` : `${delta}`;
}

type ParseImportResult = {
    pending: PendingImport | null;
    error: string | null;
};

const VALID_MIX_COLORS = new Set([
    'orange', 'purple', 'white', 'green', 'red', 'blue', 'cyan', 'pink', 'teal', 'yellow', 'black'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function hasString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidSongLike(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return hasString(value.id) && (hasString(value.name) || hasString(value.title));
}

function isValidMix(value: unknown): boolean {
    if (!isRecord(value)) return false;

    if (!hasString(value.id)) return false;
    if (!hasString(value.title)) return false;
    if (!hasString(value.color) || !VALID_MIX_COLORS.has(value.color)) return false;
    if (typeof value.currentSongIndex !== 'number') return false;
    if (!Array.isArray(value.songs)) return false;

    return value.songs.every(isValidSongLike);
}

function isValidEntity(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return hasString(value.id) || hasString(value.token) || hasString(value.browseId);
}

function sanitizeSettings(value: unknown): Partial<AppSettings> {
    if (!isRecord(value)) return {};

    const out: Partial<AppSettings> = {};

    if (typeof value.volume === 'number') out.volume = value.volume;
    if (typeof value.clickSounds === 'boolean') out.clickSounds = value.clickSounds;
    if (hasString(value.theme)) out.theme = value.theme as AppSettings['theme'];
    if (hasString(value.qualityPreference)) out.qualityPreference = value.qualityPreference as AppSettings['qualityPreference'];
    if (typeof value.lastPlayedSongId === 'string' || value.lastPlayedSongId === null) out.lastPlayedSongId = value.lastPlayedSongId;
    if (hasString(value.version)) out.version = value.version;
    if (hasString(value.userName)) out.userName = value.userName;
    if (hasString(value.userDOB)) out.userDOB = value.userDOB;
    if (Array.isArray(value.languages) && value.languages.every((l) => typeof l === 'string')) out.languages = value.languages;
    if (typeof value.stopAtEndOfSong === 'boolean') out.stopAtEndOfSong = value.stopAtEndOfSong;
    if (typeof value.notificationsEnabled === 'boolean') out.notificationsEnabled = value.notificationsEnabled;
    if (hasString(value.downloadDirectory)) out.downloadDirectory = value.downloadDirectory;

    return out;
}

function validateArray(name: string, arr: unknown[], validator: (value: unknown) => boolean): string | null {
    const invalidIndex = arr.findIndex((item) => !validator(item));
    if (invalidIndex >= 0) return `${name} has invalid item at index ${invalidIndex}`;
    return null;
}

function parseImportData(raw: unknown): ParseImportResult {
    if (Array.isArray(raw)) {
        const err = validateArray('mixes', raw, isValidMix);
        if (err) return { pending: null, error: err };

        return {
            pending: {
                source: 'legacy',
                payload: {
                    mixes: raw,
                    likedSongs: [],
                    recentlyPlayed: [],
                    savedAlbums: [],
                    savedArtists: [],
                    settings: {}
                }
            },
            error: null
        };
    }

    if (!isRecord(raw)) return { pending: null, error: 'Backup must be an object or legacy mixes array' };

    if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
        return { pending: null, error: `Unsupported schema version: ${String(raw.schemaVersion ?? 'missing')}` };
    }

    const mixes = toArray(raw.mixes);
    const liked = toArray(raw.likedSongs);
    const recent = toArray(raw.recentlyPlayed);
    const albums = toArray(raw.savedAlbums);
    const artists = toArray(raw.savedArtists);

    const validationError =
        validateArray('mixes', mixes, isValidMix) ||
        validateArray('likedSongs', liked, isValidSongLike) ||
        validateArray('recentlyPlayed', recent, isValidSongLike) ||
        validateArray('savedAlbums', albums, isValidEntity) ||
        validateArray('savedArtists', artists, isValidEntity);

    if (validationError) return { pending: null, error: validationError };

    return {
        pending: {
            source: 'v2',
            payload: {
                mixes,
                likedSongs: liked,
                recentlyPlayed: recent,
                savedAlbums: albums,
                savedArtists: artists,
                settings: sanitizeSettings(raw.settings)
            }
        },
        error: null
    };
}

export function DesktopSettingsModal({ isOpen, onClose, onSwitchLayout, currentLayout = 'deck' }: DesktopSettingsModalProps) {
    const { qualityPreference, setQualityPreference, eq, sleepTimer, setSleepTimer } = usePlayback();
    const { crossfadeDuration, setCrossfadeDuration, stopAtEndOfSong, setStopAtEndOfSong } = useSettings();
    const { mixes, likedSongs, recentlyPlayed, savedAlbums, savedArtists } = useLibrary();
    const { showToast } = useUI();

    // Local State for Performance (Detached from Context)
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [restoreMode, setRestoreMode] = useState<RestoreMode>('mixes-only');
    const [initialSettings] = useState(() => loadSettings());
    const [languages, setLanguages] = useState<string[]>(initialSettings.languages || ['english', 'hindi']);

    // Profile State
    const [profileName, setProfileName] = useState(initialSettings.userName || "");
    const [profileDOB, setProfileDOB] = useState(initialSettings.userDOB || "");
    const [downloadDir, setDownloadDir] = useState(initialSettings.downloadDirectory || "");

    // Stats State
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [topSongs, setTopSongs] = useState<SongStats[]>([]);
    const [topArtists, setTopArtists] = useState<{ name: string, plays: number }[]>([]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setGlobalStats(getStats());
            setTopSongs(getTopSongs(5));
            setTopArtists(getTopArtists(5));
        }
    }, [activeTab]);

    const currentCounts = {
        mixes: mixes.length,
        likedSongs: likedSongs.length,
        recentlyPlayed: recentlyPlayed.length,
        savedAlbums: savedAlbums.length,
        savedArtists: savedArtists.length,
    };

    const incomingCounts = pendingImport
        ? {
            mixes: pendingImport.payload.mixes.length,
            likedSongs: pendingImport.payload.likedSongs.length,
            recentlyPlayed: pendingImport.payload.recentlyPlayed.length,
            savedAlbums: pendingImport.payload.savedAlbums.length,
            savedArtists: pendingImport.payload.savedArtists.length,
        }
        : null;

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const updateLanguages = (newLangs: string[]) => {
        setLanguages(newLangs);
        // saveSettings already dispatches 'melora-settings-changed' event
        saveSettings({ languages: newLangs });
    };

    const saveProfile = () => {
        saveSettings({ userName: profileName, userDOB: profileDOB });
    };

    const handleExportBackup = () => {
        const backupPayload = {
            schemaVersion: BACKUP_SCHEMA_VERSION,
            exportedAt: Date.now(),
            mixes,
            likedSongs,
            recentlyPlayed,
            savedAlbums,
            savedArtists,
            settings: loadSettings()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "melora-backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        showToast("Backup exported", "success");
    };

    const applyImport = () => {
        if (!pendingImport) return;

        const { payload, source } = pendingImport;

        localStorage.setItem('melora-mixes', JSON.stringify(payload.mixes));

        if (restoreMode === 'full') {
            localStorage.setItem('melora-liked-songs', JSON.stringify(payload.likedSongs));
            localStorage.setItem('melora-recently-played', JSON.stringify(payload.recentlyPlayed));
            localStorage.setItem('melora-saved-albums', JSON.stringify(payload.savedAlbums));
            localStorage.setItem('melora-saved-artists', JSON.stringify(payload.savedArtists));
            saveSettings(payload.settings);
        }

        window.dispatchEvent(new CustomEvent('melora-library-updated'));
        const restoreLabel = restoreMode === 'full' ? 'Full restore' : 'Mixes-only restore';
        showToast(source === 'legacy' ? `${restoreLabel} complete (legacy backup). Reloading...` : `${restoreLabel} complete. Reloading...`, "success");

        setPendingImport(null);
        setImportError(null);
        setRestoreMode('mixes-only');
        setTimeout(() => window.location.reload(), 800);
    };

    const handleImportFile = async (file: File) => {
        try {
            const fileText = await file.text();
            const parsed = JSON.parse(fileText) as unknown;
            const result = parseImportData(parsed);

            if (!result.pending) {
                setPendingImport(null);
                setImportError(result.error || "Invalid backup format");
                showToast("Backup validation failed", "error");
                return;
            }

            setImportError(null);
            setPendingImport(result.pending);
            setRestoreMode(result.pending.source === 'legacy' ? 'mixes-only' : 'full');
            showToast("Backup loaded. Confirm restore.", "info");
        } catch (error) {
            console.error(error);
            setPendingImport(null);
            setImportError("Invalid JSON file");
            setRestoreMode('mixes-only');
            showToast("Invalid JSON file", "error");
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
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
                onClick={handleClose}
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
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="max-w-2xl mx-auto py-4">
                            {/* PROFILE TAB */}
                            {activeTab === 'profile' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                                        <p className="text-zinc-500">Manage your identity.</p>
                                    </header>

                                    <div className="bg-zinc-900/40 p-8 rounded-3xl border border-white/5 space-y-6">
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="w-24 h-24 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
                                                {profileName ? profileName.charAt(0).toUpperCase() : <User size={40} />}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{profileName || "Guest User"}</h3>
                                                <p className="text-zinc-500 text-sm">Local Profile</p>
                                            </div>
                                        </div>

                                        <div className="grid gap-6">
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Display Name</label>
                                                <input
                                                    type="text"
                                                    value={profileName}
                                                    onChange={(e) => {
                                                        setProfileName(e.target.value);
                                                    }}
                                                    onBlur={saveProfile}
                                                    placeholder="Enter your name"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    value={profileDOB}
                                                    onChange={(e) => {
                                                        setProfileDOB(e.target.value);
                                                    }}
                                                    onBlur={saveProfile}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <button
                                                onClick={saveProfile}
                                                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors text-sm"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* EXPERIENCE TAB */}
                            {activeTab === 'experience' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <header>
                                        <h1 className="text-3xl font-bold text-white mb-2">Experience</h1>
                                        <p className="text-zinc-500">Customize your visual interface.</p>
                                    </header>

                                    <div className="grid gap-4">
                                        {([
                                            { id: 'deck', title: 'Deck Studio', desc: 'Analog cassette physics.', icon: Radio },
                                            { id: 'discovery', title: 'Discovery Glass', desc: 'Modern digital library.', icon: Disc },
                                        ] as const).map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        // page.tsx expects 'CLASSIC' uppercased
                                                        window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: mode.id.toUpperCase() }));
                                                    }
                                                    onSwitchLayout?.(mode.id);
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
                                            {([
                                                { id: 'hires', label: 'Hi-Res', sub: '24-bit / 96kHz' },
                                                { id: 'flac', label: 'Lossless', sub: '16-bit / 44.1kHz' },
                                                { id: '320', label: 'High', sub: '320 kbps' },
                                                { id: '160', label: 'Standard', sub: '160 kbps' },
                                                { id: '96', label: 'Saver', sub: '96 kbps' },
                                            ] as const).map((q) => (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setQualityPreference(q.id)}
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
                                                        Stops in {Math.ceil(sleepTimer.duration / 60000)} minutes
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

                                    {/* Crossfade */}
                                    <section>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Radio size={18} /> Crossfade
                                        </h3>
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-zinc-400 text-sm font-bold">Overlap duration</div>
                                                <div className="text-white font-mono">{crossfadeDuration}s</div>
                                            </div>
                                            <input
                                                type="range" min="0" max="12" step="1" value={crossfadeDuration}
                                                onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                                                className="w-full accent-blue-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
                                                Smoothly crossfade between songs. Set to 0s to play songs gapless.
                                            </p>
                                        </div>
                                    </section>

                                    {/* Playback Configuration */}
                                    <section>
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Layout size={18} /> Playback Behavior
                                        </h3>
                                        <div className="grid gap-2">
                                            <button
                                                onClick={() => setStopAtEndOfSong(!stopAtEndOfSong)}
                                                className="flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                                            >
                                                <div>
                                                    <div className="font-bold text-white text-sm">Stop at end of song</div>
                                                    <div className="text-xs text-zinc-500 mt-0.5">Pause playback instead of auto-playing the next track</div>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full transition-colors relative ${stopAtEndOfSong ? 'bg-blue-500' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stopAtEndOfSong ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </button>
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
                                                <div className="text-zinc-500 text-sm">Save mixes, likes, history, library, and settings.</div>
                                            </div>
                                            <button
                                                onClick={handleExportBackup}
                                                className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-zinc-200"
                                            >
                                                Export
                                            </button>
                                        </div>

                                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <div>
                                                <div className="text-white font-bold">Import Data</div>
                                                <div className="text-zinc-500 text-sm">Validate backup file before restoring data.</div>
                                            </div>
                                            <label className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-bold text-sm hover:bg-zinc-700 cursor-pointer">
                                                Import
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) await handleImportFile(file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        {importError && (
                                            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-sm text-red-300">
                                                Import blocked: {importError}
                                            </div>
                                        )}

                                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 space-y-4">
                                            <div>
                                                <div className="text-white font-bold flex items-center gap-2">
                                                    Storage Location
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wide">Desktop App</span>
                                                </div>
                                                <div className="text-zinc-500 text-sm mt-1">Choose where offline music and cache are downloaded.</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={downloadDir}
                                                    onChange={(e) => setDownloadDir(e.target.value)}
                                                    onBlur={() => saveSettings({ downloadDirectory: downloadDir })}
                                                    placeholder="C:\Users\Name\Music\Melora"
                                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                                                />
                                                <button
                                                    onClick={() => {
                                                        // Fallback for web until Tauri is bridged
                                                        showToast("Folder picker is native-only. Please manually enter a path.", "info");
                                                    }}
                                                    className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 font-bold hover:bg-white/10 transition-colors whitespace-nowrap"
                                                >
                                                    Browse...
                                                </button>
                                            </div>
                                        </div>

                                        {pendingImport && (
                                            <div className="p-6 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-4">
                                                <div className="text-amber-300 font-bold">Confirm Restore</div>
                                                <div className="text-sm text-amber-100/80">
                                                    {pendingImport.source === 'legacy'
                                                        ? 'Legacy backup detected. Full restore is unavailable because it only contains mixes.'
                                                        : 'Choose whether to restore only mixes or the full library + settings.'}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-amber-100/80">
                                                    <div>Mixes: {pendingImport.payload.mixes.length}</div>
                                                    <div>Liked: {pendingImport.payload.likedSongs.length}</div>
                                                    <div>Recent: {pendingImport.payload.recentlyPlayed.length}</div>
                                                    <div>Albums: {pendingImport.payload.savedAlbums.length}</div>
                                                    <div>Artists: {pendingImport.payload.savedArtists.length}</div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-black/30 border border-amber-500/20">
                                                    <div className="text-xs font-bold uppercase tracking-wide text-amber-200 mb-2">Restore Impact Preview</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-100/90">
                                                        <div>Mixes: {currentCounts.mixes} → {incomingCounts?.mixes ?? 0} ({formatDelta(incomingCounts?.mixes ?? 0, currentCounts.mixes)})</div>
                                                        <div>Liked: {currentCounts.likedSongs} → {restoreMode === 'full' ? (incomingCounts?.likedSongs ?? 0) : currentCounts.likedSongs} ({restoreMode === 'full' ? formatDelta(incomingCounts?.likedSongs ?? 0, currentCounts.likedSongs) : 'unchanged'})</div>
                                                        <div>Recent: {currentCounts.recentlyPlayed} → {restoreMode === 'full' ? (incomingCounts?.recentlyPlayed ?? 0) : currentCounts.recentlyPlayed} ({restoreMode === 'full' ? formatDelta(incomingCounts?.recentlyPlayed ?? 0, currentCounts.recentlyPlayed) : 'unchanged'})</div>
                                                        <div>Albums: {currentCounts.savedAlbums} → {restoreMode === 'full' ? (incomingCounts?.savedAlbums ?? 0) : currentCounts.savedAlbums} ({restoreMode === 'full' ? formatDelta(incomingCounts?.savedAlbums ?? 0, currentCounts.savedAlbums) : 'unchanged'})</div>
                                                        <div>Artists: {currentCounts.savedArtists} → {restoreMode === 'full' ? (incomingCounts?.savedArtists ?? 0) : currentCounts.savedArtists} ({restoreMode === 'full' ? formatDelta(incomingCounts?.savedArtists ?? 0, currentCounts.savedArtists) : 'unchanged'})</div>
                                                        <div>Settings: {restoreMode === 'full' ? 'will be overwritten' : 'unchanged'}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setRestoreMode('mixes-only')}
                                                        className={`p-3 rounded-lg border text-left text-sm transition-colors ${restoreMode === 'mixes-only'
                                                            ? 'bg-amber-500 text-black border-amber-400'
                                                            : 'bg-zinc-900/50 text-amber-100 border-amber-500/20 hover:border-amber-400/50'
                                                            }`}
                                                    >
                                                        <div className="font-bold">Restore mixes only</div>
                                                        <div className="text-xs opacity-80">Safest option; keeps likes/history/library/settings unchanged.</div>
                                                    </button>
                                                    <button
                                                        onClick={() => setRestoreMode('full')}
                                                        disabled={pendingImport.source === 'legacy'}
                                                        className={`p-3 rounded-lg border text-left text-sm transition-colors ${restoreMode === 'full'
                                                            ? 'bg-amber-500 text-black border-amber-400'
                                                            : 'bg-zinc-900/50 text-amber-100 border-amber-500/20 hover:border-amber-400/50'
                                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                    >
                                                        <div className="font-bold">Restore full library + settings</div>
                                                        <div className="text-xs opacity-80">Overwrites likes, history, albums, artists, and settings.</div>
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setPendingImport(null);
                                                            setImportError(null);
                                                            setRestoreMode('mixes-only');
                                                        }}
                                                        className="flex-1 py-2 bg-zinc-800 text-white rounded-lg font-bold text-sm hover:bg-zinc-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={applyImport}
                                                        className="flex-1 py-2 bg-amber-500 text-black rounded-lg font-bold text-sm hover:bg-amber-400"
                                                    >
                                                        Confirm Restore
                                                    </button>
                                                </div>
                                            </div>
                                        )}

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
                                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                            Statistics
                                            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 font-bold rounded-full uppercase tracking-widest mt-1">Premium Analytics</span>
                                        </h1>
                                        <p className="text-zinc-500">Your listening DNA recorded entirely locally.</p>
                                    </header>

                                    {/* Top Level Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Total Plays', value: globalStats?.totalPlays || 0, icon: Disc },
                                            { label: 'Time Listened', value: formatDuration(globalStats?.totalTime || 0), icon: Monitor },
                                            { label: 'Saved Songs', value: likedSongs.length, icon: Heart },
                                            { label: 'Curated Mixes', value: mixes.length, icon: Radio },
                                        ].map((s, i) => {
                                            const Icon = s.icon;
                                            return (
                                                <div key={i} className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <Icon size={48} />
                                                    </div>
                                                    <div className="text-3xl font-extrabold text-white mb-1 tracking-tight">{s.value}</div>
                                                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{s.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Top Songs */}
                                        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 shadow-xl">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center justify-between">
                                                Top Tracks
                                                <span className="text-xs font-mono text-white/30 truncate block max-w-32 text-right">ALL TIME</span>
                                            </h3>
                                            <div className="space-y-4">
                                                {topSongs.length > 0 ? topSongs.map((song, idx) => (
                                                    <div key={song.id} className="flex items-center gap-4 group">
                                                        <div className="w-6 text-center text-xs font-bold text-zinc-600 group-hover:text-white transition-colors">{idx + 1}</div>
                                                        <img src={song.image || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-lg object-cover bg-white/10" alt="" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-white font-medium text-sm truncate">{song.name}</div>
                                                            <div className="text-zinc-500 text-xs truncate">{song.artist}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-white font-bold text-sm tracking-tight">{song.plays}</div>
                                                            <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Plays</div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-8 text-zinc-600 text-sm">No listening history yet.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top Artists & Quick Insight */}
                                        <div className="space-y-6 flex flex-col">
                                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 shadow-xl flex-1">
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Top Artists</h3>
                                                <div className="space-y-4">
                                                    {topArtists.length > 0 ? topArtists.map((artist, idx) => (
                                                        <div key={artist.name + idx} className="flex items-center gap-4 text-sm">
                                                            <div className="flex-1 truncate font-medium text-white/90">{artist.name}</div>
                                                            <div className="text-xs font-bold bg-white/5 px-2 py-1 rounded text-white/70">{artist.plays} plays</div>
                                                        </div>
                                                    )) : (
                                                        <div className="text-center py-6 text-zinc-600 text-sm">No artist data.</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl mt-auto">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                                                        <Zap size={20} fill="currentColor" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Your Vibe</div>
                                                        <p className="text-sm text-indigo-200/70 leading-relaxed font-medium">
                                                            {globalStats && globalStats.totalPlays > 100
                                                                ? `You are an avid listener! You've streamed ${formatDuration(globalStats.totalTime)} of pure audio across ${globalStats.totalPlays} tracks.`
                                                                : `You're just getting started. Keep playing music to build your unique Melora acoustic profile.`}
                                                            {likedSongs.length > 0 ? ` Your library is growing with ${likedSongs.length} favorites.` : ' Start liking tracks to catalog your taste.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                                        <a href="https://buymeacoffee.com/melora" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors">
                                            <Coffee size={18} /> Buy us a Coffee
                                        </a>
                                        <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-full font-bold hover:bg-zinc-700 transition-colors">
                                            <Github size={18} /> Star on GitHub
                                        </a>
                                    </div>
                                    <div className="pt-2">
                                        <a href="https://discord.gg/657ZJJUkkH" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2]/20 text-[#5865F2] rounded-full font-bold hover:bg-[#5865F2]/30 transition-colors border border-[#5865F2]/20">
                                            <MessageCircle size={18} /> Join our Discord
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* ABOUT TAB */}
                            {activeTab === 'about' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
                                    <div>
                                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">MELORA</h1>
                                        <div className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-mono inline-block">v3.0.0</div>
                                    </div>
                                    <p className="text-zinc-500 max-w-sm mx-auto">
                                        Designed for audiophiles who miss the tangible feel of music.
                                    </p>
                                    <div className="flex gap-4 justify-center pt-4">
                                        <a href="https://discord.gg/657ZJJUkkH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#5865F2]/15 text-[#5865F2] rounded-full font-bold hover:bg-[#5865F2]/25 transition-colors border border-[#5865F2]/20">
                                            <MessageCircle size={16} /> Join our Discord
                                        </a>
                                        <a href="https://github.com/Nullgravitydevs/Melora-Tunes" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-full font-bold hover:bg-zinc-700 transition-colors">
                                            <Github size={16} /> GitHub
                                        </a>
                                    </div>
                                    <div className="text-[10px] text-zinc-700 pt-20">
                                        © 2026 Melora Tunes Project
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
