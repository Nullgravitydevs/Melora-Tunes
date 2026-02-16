
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudUpload, CloudDownload, LogOut, RefreshCcw, Check, Loader2, X, AlertCircle } from "lucide-react";
import { usePlayback } from "@/components/providers/playback-context";
import { GoogleDriveService, BackupData } from "@/lib/gdrive";
import { saveSettings, loadSettings } from "@/lib/settings";

interface SyncSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SyncSettingsModal({ isOpen, onClose }: SyncSettingsModalProps) {
    const { showToast, mixes, likedSongs, recentlyPlayed } = usePlayback();
    const [isConnected, setIsConnected] = useState(false);
    const [lastSynced, setLastSynced] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<string | null>(null);

    // Initial Check
    useEffect(() => {
        const storedSync = localStorage.getItem('melora-sync-meta');
        if (storedSync) {
            const meta = JSON.parse(storedSync);
            setLastSynced(meta.lastSynced);
            setIsConnected(true); // Assume connected if we have meta, standard expiry applies
        }
    }, [isOpen]);

    const handleConnect = async () => {
        setLoading(true);
        setAction("Connecting...");
        const success = await GoogleDriveService.init();
        if (success) {
            try {
                await GoogleDriveService.signIn();
                setIsConnected(true);
                showToast("Connected to Google Drive", "success");
            } catch (e) {
                showToast("Failed to connect", "error");
            }
        } else {
            showToast("Failed to initialize Google Services", "error");
        }
        setLoading(false);
        setAction(null);
    };

    const handleDisconnect = () => {
        GoogleDriveService.signOut();
        setIsConnected(false);
        setLastSynced(null);
        localStorage.removeItem('melora-sync-meta');
        showToast("Disconnected from Drive", "info");
    };

    const handleBackup = async () => {
        if (!isConnected) return;
        setLoading(true);
        setAction("Backing up...");

        const backup: BackupData = {
            mixes,
            likedSongs,
            history: recentlyPlayed,
            settings: loadSettings(),
            timestamp: Date.now(),
            deviceId: 'web-client'
        };

        const success = await GoogleDriveService.uploadBackup(backup);
        if (success) {
            const now = Date.now();
            setLastSynced(now);
            localStorage.setItem('melora-sync-meta', JSON.stringify({ lastSynced: now }));
            showToast("Backup successful", "success");
        } else {
            showToast("Backup failed", "error");
        }
        setLoading(false);
        setAction(null);
    };

    const handleRestore = async () => {
        if (!isConnected) return;
        setLoading(true);
        setAction("Restoring...");

        const data = await GoogleDriveService.downloadBackup();
        if (data) {
            // Apply Data (This requires a page reload or deep context update)
            // For safety, we will save to localStorage and reload
            localStorage.setItem('melora-mixes', JSON.stringify(data.mixes));
            localStorage.setItem('melora-liked-songs', JSON.stringify(data.likedSongs));
            localStorage.setItem('melora-recently-played', JSON.stringify(data.history));
            saveSettings(data.settings);

            setLastSynced(data.timestamp);
            localStorage.setItem('melora-sync-meta', JSON.stringify({ lastSynced: data.timestamp }));

            showToast("Restore complete. Reloading...", "success");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast("No backup found or restore failed", "error");
        }
        setLoading(false);
        setAction(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <Cloud className="text-accent-blue" /> Cloud Sync
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-white/50" />
                            </button>
                        </div>

                        {!isConnected ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Cloud size={32} className="text-white/40" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Sync with Google Drive</h3>
                                <p className="text-sm text-white/50 mb-6 px-4">
                                    Keep your playlists, liked songs, and history safe. Sync across devices using your own Google Drive.
                                </p>
                                <button
                                    onClick={handleConnect}
                                    disabled={loading}
                                    className="px-6 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />}
                                    Connect Google Drive
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Check size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-blue-400 text-sm">Connected</h4>
                                        <p className="text-xs text-blue-300/60">
                                            {lastSynced ? `Last Synced: ${new Date(lastSynced).toLocaleString()}` : 'Not synced yet'}
                                        </p>
                                    </div>
                                    <button onClick={handleDisconnect} className="p-2 hover:bg-blue-500/20 rounded-full text-blue-400 transition-colors" title="Disconnect">
                                        <LogOut size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleBackup}
                                        disabled={loading}
                                        className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <CloudUpload size={20} className="text-white/70" />
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-white text-sm">Force Backup</div>
                                            <div className="text-[10px] text-white/40 mt-1">Upload current data</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleRestore}
                                        disabled={loading}
                                        className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <CloudDownload size={20} className="text-white/70" />
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-white text-sm">Restore Data</div>
                                            <div className="text-[10px] text-white/40 mt-1">Download from Drive</div>
                                        </div>
                                    </button>
                                </div>

                                {loading && (
                                    <div className="flex items-center justify-center gap-3 text-white/50 text-xs animate-pulse pt-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        {action}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 text-amber-500/80 text-xs">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                <p>Data is stored in your Google Drive's hidden AppFolder. Melora cannot access your personal files.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
