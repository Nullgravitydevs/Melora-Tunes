"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Settings as SettingsIcon } from 'lucide-react';
import { usePlayback } from '@/components/providers/playback-context';

interface DesktopSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DesktopSettingsModal({ isOpen, onClose }: DesktopSettingsModalProps) {
    const { bitrate, setBitrate, crossfadeDuration, setCrossfadeDuration } = usePlayback();


    const qualities = [
        { value: '320', label: '320 kbps (Extreme)' },
        { value: '160', label: '160 kbps (High)' },
        { value: '96', label: '96 kbps (Standard)' },
        { value: '48', label: '48 kbps (Data Saver)' },
        { value: '12', label: '12 kbps (Lo-Fi)' },
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-retro-black border-4 border-retro-white rounded-xl p-6 w-[400px] shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6 border-b-2 border-retro-gray/30 pb-4">
                            <div className="flex items-center gap-3">
                                <SettingsIcon className="text-retro-white" size={24} />
                                <h2 className="text-xl font-retro text-retro-white">PREFERENCES</h2>
                            </div>
                            <button onClick={onClose} className="text-retro-gray hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-mono text-retro-gray mb-3 uppercase tracking-wider">Audio Stream Quality</h3>
                                <div className="space-y-2">
                                    {qualities.map(q => (
                                        <button
                                            key={q.value}
                                            onClick={() => setBitrate(q.value as any)}
                                            className={`w-full flex justify-between items-center p-3 rounded border-2 transition-all ${bitrate === q.value
                                                ? 'border-retro-white bg-retro-white/20 text-retro-white'
                                                : 'border-retro-gray/30 text-retro-gray hover:border-retro-gray hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="font-mono">{q.label}</span>
                                            {bitrate === q.value && <div className="bg-green-500 rounded-full p-0.5"><Check size={12} className="text-black" /></div>}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-retro-gray/50 mt-2 font-mono text-center">
                                    Higher quality uses more bandwidth.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-mono text-retro-gray mb-3 uppercase tracking-wider">Crossfade</h3>
                                <div className="flex gap-2">
                                    {[0, 3, 5, 10].map(sec => (
                                        <button
                                            key={sec}
                                            onClick={() => setCrossfadeDuration(sec)}
                                            className={`flex-1 p-2 rounded border-2 font-mono text-sm transition-all ${crossfadeDuration === sec
                                                ? 'border-retro-white bg-retro-white/20 text-retro-white'
                                                : 'border-retro-gray/30 text-retro-gray hover:border-retro-gray hover:bg-white/5'
                                                }`}
                                        >
                                            {sec === 0 ? "OFF" : `${sec}s`}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-retro-gray/50 mt-2 font-mono text-center">
                                    Overlap songs for smooth transitions.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t-2 border-retro-gray/30 text-center">
                            <p className="font-mono text-xs text-retro-gray uppercase">Melora v1.0.0 (Electron)</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
