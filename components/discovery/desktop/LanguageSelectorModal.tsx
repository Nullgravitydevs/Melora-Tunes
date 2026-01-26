import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { loadSettings, saveSettings } from '@/lib/settings';

const LANGUAGES = [
    { id: 'english', label: 'English', native: 'English' },
    { id: 'hindi', label: 'Hindi', native: 'हिंदी' },
    { id: 'telugu', label: 'Telugu', native: 'తెలుగు' },
    { id: 'tamil', label: 'Tamil', native: 'தமிழ்' },
    { id: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { id: 'marathi', label: 'Marathi', native: 'मराठी' },
    { id: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
    { id: 'bengali', label: 'Bengali', native: 'বাংলা' },
    { id: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { id: 'bhojpuri', label: 'Bhojpuri', native: 'भोजपुरी' },
    { id: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
    { id: 'urdu', label: 'Urdu', native: 'اردو' },
    { id: 'haryanvi', label: 'Haryanvi', native: 'हरियाणवि' },
    { id: 'rajasthani', label: 'Rajasthani', native: 'राजस्थानी' },
    { id: 'odia', label: 'Odia', native: 'ଓଡ଼ିଆ' },
    { id: 'assamese', label: 'Assamese', native: 'অসমীয়া' }
];

interface LanguageSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function LanguageSelectorModal({ isOpen, onClose, onSave }: LanguageSelectorModalProps) {
    const [selected, setSelected] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const settings = loadSettings();
            setSelected(settings.languages || ['english', 'hindi']);
        }
    }, [isOpen]);

    const toggleLanguage = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(l => l !== id)
                : [...prev, id]
        );
    };

    const handleSave = () => {
        if (selected.length === 0) {
            // Prevent saving empty selection, default to English/Hindi or just English
            // But let's just alert or keep english
            if (selected.length === 0) {
                setSelected(['english']);
                return;
            }
        }

        saveSettings({ languages: selected });
        onSave();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-neutral-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">Music Languages</h2>
                                <p className="text-sm text-neutral-400 mt-1">Select languages for your music feed</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {LANGUAGES.map(lang => {
                                    const isSelected = selected.includes(lang.id);
                                    return (
                                        <motion.button
                                            key={lang.id}
                                            onClick={() => toggleLanguage(lang.id)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                relative p-4 rounded-xl border text-left transition-all
                                                ${isSelected
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-neutral-900 text-white border-white/5 hover:border-white/20 hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <div className="text-sm font-bold mb-1">{lang.native}</div>
                                            <div className={`text-xs ${isSelected ? 'text-black/60' : 'text-white/40'}`}>
                                                {lang.label}
                                            </div>

                                            {isSelected && (
                                                <div className="absolute top-2 right-2 text-black">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-full text-sm font-medium text-white hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={selected.length === 0}
                                className="px-8 py-2.5 rounded-full text-sm font-bold text-black bg-white hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Update Feed
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
