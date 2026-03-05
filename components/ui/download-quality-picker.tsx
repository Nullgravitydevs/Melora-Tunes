"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Disc3 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack, AudioQuality } from "@/lib/types";
import { ensurePlayableTrack } from "@/lib/track-utils";

interface DownloadQualityPickerProps {
    isOpen: boolean;
    song?: JioSaavnSong | PlayableTrack | null;
    songs?: (JioSaavnSong | PlayableTrack)[] | null;
    onClose: () => void;
    onDownload: (song: JioSaavnSong | PlayableTrack, quality: AudioQuality) => void;
    onDownloadBatch?: (songs: (JioSaavnSong | PlayableTrack)[], quality: AudioQuality) => void;
    defaultQualityPreference: AudioQuality;
}

export function DownloadQualityPicker({ isOpen, song, songs, onClose, onDownload, onDownloadBatch, defaultQualityPreference }: DownloadQualityPickerProps) {
    const [selectedQuality, setSelectedQuality] = useState<AudioQuality>(defaultQualityPreference);

    useEffect(() => {
        if (isOpen && (song || songs)) {
            // Check if track has HiFi sources to show/hide FLAC/HiRes if needed
            // But we don't strictly know until resolution, so we show all options with a generic disclaimer.
            setSelectedQuality(defaultQualityPreference);
        }
    }, [isOpen, song, songs, defaultQualityPreference]);

    if (!isOpen || (!song && !songs)) return null;

    const isBatch = !!(songs && songs.length > 0);
    const trackName = isBatch ? `Batch Download (${songs.length} songs)` : (song && ('name' in song ? song.name : song.title));
    const artists = isBatch ? 'Multiple Artists' : (song && ('primaryArtists' in song ? song.primaryArtists : song.artist));

    const qualities = [
        { id: 'hires' as AudioQuality, label: 'Hi-Res Lossless', sub: '~35-50 MB', icon: <Disc3 size={16} className="text-amber-400" /> },
        { id: 'flac' as AudioQuality, label: 'Lossless (FLAC)', sub: '~25-35 MB', icon: <Disc3 size={16} className="text-blue-400" /> },
        { id: '320' as AudioQuality, label: 'High Quality', sub: '~8-12 MB' },
        { id: '160' as AudioQuality, label: 'Standard', sub: '~4-6 MB' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel"
                    >
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Download size={20} className="text-teal-400" />
                                Download Song
                            </h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="mb-6">
                                <p className="text-sm font-bold text-white truncate">{trackName}</p>
                                <p className="text-xs text-white/50 truncate">{artists}</p>
                            </div>

                            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Choose Quality</p>

                            <div className="space-y-2 mb-6">
                                {qualities.map(q => (
                                    <button
                                        key={q.id}
                                        onClick={() => setSelectedQuality(q.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedQuality === q.id
                                            ? 'bg-teal-500/20 border-teal-500/30 text-white'
                                            : 'bg-white/5 border-transparent hover:bg-white/10 text-white/70'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {q.icon || <div className="w-4 h-4" />}
                                            <span className="font-semibold text-sm">{q.label}</span>
                                        </div>
                                        <span className={`text-xs ${selectedQuality === q.id ? 'text-teal-300' : 'text-white/40'}`}>
                                            {q.sub}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="text-[10px] text-white/30 text-center mb-6 px-2">
                                Highest available quality will be downloaded automatically if selected quality is unavailable.
                            </div>

                            <button
                                onClick={() => {
                                    if (isBatch && onDownloadBatch && songs) {
                                        onDownloadBatch(songs, selectedQuality);
                                    } else if (song) {
                                        onDownload(song, selectedQuality);
                                    }
                                    onClose();
                                }}
                                className="w-full py-3 rounded-full bg-teal-500 hover:bg-teal-400 text-black font-bold transition-colors shadow-[0_0_20px_rgba(20,184,166,0.2)] flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Start Download
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

