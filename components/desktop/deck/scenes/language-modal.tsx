"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Globe, ChevronRight } from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/settings";

interface LanguageModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LANGUAGES = [
    { id: 'hindi', label: 'Hindi', native: 'Hindi', artist: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { id: 'english', label: 'English', native: 'English', artist: 'Justin Bieber', image: 'https://c.saavncdn.com/artists/Justin_Bieber_005_20201127112218_500x500.jpg' },
    { id: 'punjabi', label: 'Punjabi', native: 'Punjabi', artist: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg' },
    { id: 'tamil', label: 'Tamil', native: 'Tamil', artist: 'Anirudh Ravichander', image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg' },
    { id: 'telugu', label: 'Telugu', native: 'Telugu', artist: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg' },
    { id: 'kannada', label: 'Kannada', native: 'Kannada', artist: 'Vijay Prakash', image: 'https://c.saavncdn.com/artists/Vijay_Prakash_007_20250225123208_500x500.jpg' },
    { id: 'malayalam', label: 'Malayalam', native: 'Malayalam', artist: 'Vineeth Sreenivasan', image: 'https://c.saavncdn.com/artists/Vineeth_Sreenivasan_003_20240508103358_500x500.jpg' },
    { id: 'marathi', label: 'Marathi', native: 'Marathi', artist: 'Ajay-Atul', image: 'https://c.saavncdn.com/artists/Ajay_Atul_003_20230228105414_500x500.jpg' },
    { id: 'gujarati', label: 'Gujarati', native: 'Gujarati', artist: 'Kinjal Dave', image: 'https://c.saavncdn.com/artists/Kinjal_Dave_003_20241217095517_500x500.jpg' },
    { id: 'bengali', label: 'Bengali', native: 'Bengali', artist: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { id: 'bhojpuri', label: 'Bhojpuri', native: 'Bhojpuri', artist: 'Pawan Singh', image: 'https://c.saavncdn.com/artists/Pawan_Singh_003_20241119074737_500x500.jpg' },
    { id: 'haryanvi', label: 'Haryanvi', native: 'Haryanvi', artist: 'Amit Saini Rohtaki', image: 'https://c.saavncdn.com/artists/Amit_Saini_Rohtakiya_002_20220328101709_500x500.jpg' }
];

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
    const [selected, setSelected] = useState<string[]>([]);

    // Load initial settings when opening
    useEffect(() => {
        if (isOpen) {
            const settings = loadSettings();
            setSelected(settings.languages || ['english', 'hindi']);
        }
    }, [isOpen]);

    const toggleLanguage = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) {
                // Prevent deselecting all (keep at least one)
                if (prev.length === 1) return prev;
                return prev.filter(l => l !== id);
            }
            return [...prev, id];
        });
    };

    const handleSave = () => {
        saveSettings({ languages: selected });
        window.location.reload();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-5xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-8 text-center bg-gradient-to-b from-white/5 to-transparent">
                            <h2 className="text-3xl font-bold text-white mb-2">What kind of music do you like?</h2>
                            <p className="text-white/50 text-base">Pick all you want. We'll curate your experience.</p>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-8 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {LANGUAGES.map(lang => {
                                    const isSelected = selected.includes(lang.id);
                                    return (
                                        <motion.div
                                            key={lang.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => toggleLanguage(lang.id)}
                                            className={`
                                                relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group border-2 transition-all
                                                ${isSelected ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}
                                            `}
                                        >
                                            {/* Artist Image Background */}
                                            <img
                                                src={lang.image}
                                                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-110 saturate-100' : 'scale-100 saturate-0 group-hover:saturate-50'}`}
                                                alt={lang.native}
                                            />

                                            {/* Gradient Overlay */}
                                            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity ${isSelected ? 'opacity-80' : 'opacity-60'}`} />

                                            {/* Content */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2 shadow-lg"
                                                    >
                                                        <Check size={16} className="text-black mb-0" />
                                                    </motion.div>
                                                )}

                                                <span className={`text-xl font-bold uppercase tracking-widest text-white transition-all ${isSelected ? 'scale-110' : ''}`}>
                                                    {lang.native}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-white/50 mt-1 tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {lang.artist}
                                                </span>
                                            </div>

                                            {/* Selection Border Glow */}
                                            {isSelected && <div className="absolute inset-0 border-2 border-white rounded-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]" />}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-[#181818] flex justify-between items-center">
                            <span className="text-xs text-white/30">
                                {selected.length} languages selected
                            </span>
                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-full font-bold text-sm text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-10 py-3 bg-[#2bc5b4] text-black rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-[#2bc5b4]/20"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
