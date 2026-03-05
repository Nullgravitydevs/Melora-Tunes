"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Check, X, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack, AudioQuality } from "@/lib/types";

interface DownloadJob {
    song: JioSaavnSong | PlayableTrack;
    quality: AudioQuality;
    status: 'pending' | 'downloading' | 'error' | 'done';
}

interface DownloadQueuePanelProps {
    queue: DownloadJob[];
}

export function DownloadQueuePanel({ queue }: DownloadQueuePanelProps) {
    const [expanded, setExpanded] = useState(true);

    if (queue.length === 0) return null;

    const activeCount = queue.filter(j => j.status === 'downloading').length;
    const doneCount = queue.filter(j => j.status === 'done').length;
    const errorCount = queue.filter(j => j.status === 'error').length;
    const pendingCount = queue.filter(j => j.status === 'pending').length;
    const totalCount = queue.length;
    const progress = totalCount > 0 ? ((doneCount + errorCount) / totalCount) * 100 : 0;

    const getSongName = (song: JioSaavnSong | PlayableTrack) => {
        return ('name' in song) ? song.name : song.title;
    };

    const getStatusIcon = (status: DownloadJob['status']) => {
        switch (status) {
            case 'pending': return <Download size={14} className="text-white/30" />;
            case 'downloading': return <Loader2 size={14} className="text-teal-400 animate-spin" />;
            case 'done': return <Check size={14} className="text-green-400" />;
            case 'error': return <AlertCircle size={14} className="text-red-400" />;
        }
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 right-6 z-[100] w-80"
        >
            <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Download size={16} className="text-teal-400" />
                        <span className="text-sm font-semibold text-white">
                            {activeCount > 0
                                ? `Downloading ${doneCount}/${totalCount}`
                                : doneCount === totalCount
                                    ? `Downloaded ${totalCount} songs`
                                    : `${doneCount}/${totalCount} complete`
                            }
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {errorCount > 0 && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                                {errorCount} failed
                            </span>
                        )}
                        {expanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                    </div>
                </button>

                {/* Progress Bar */}
                <div className="h-0.5 bg-white/5 relative">
                    <motion.div
                        className="h-full bg-teal-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Expanded List */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-0.5 scroll">
                                {queue.map((job, i) => (
                                    <motion.div
                                        key={`${job.song.id}-${i}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${job.status === 'downloading' ? 'bg-teal-500/10' :
                                                job.status === 'done' ? 'bg-green-500/5' :
                                                    job.status === 'error' ? 'bg-red-500/5' :
                                                        'bg-transparent'
                                            }`}
                                    >
                                        {getStatusIcon(job.status)}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium truncate ${job.status === 'done' ? 'text-white/50' :
                                                    job.status === 'error' ? 'text-red-300/70' :
                                                        'text-white/80'
                                                }`}>
                                                {getSongName(job.song)}
                                            </p>
                                        </div>
                                        {job.status === 'downloading' && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
