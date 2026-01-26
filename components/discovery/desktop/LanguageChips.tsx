import React from 'react';
import { motion } from 'framer-motion';

const LANGUAGES = [
    { id: 'all', label: 'All' },
    { id: 'telugu', label: 'Telugu' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'english', label: 'English' },
    { id: 'tamil', label: 'Tamil' },
    { id: 'punjabi', label: 'Punjabi' },
    { id: 'malayalam', label: 'Malayalam' },
    { id: 'kannada', label: 'Kannada' },
    { id: 'bengali', label: 'Bengali' },
];

interface LanguageChipsProps {
    activeLanguage: string | null;
    selectedLanguages: string[]; // From settings
    onSelect: (lang: string | null) => void;
}

export function LanguageChips({ activeLanguage, selectedLanguages, onSelect }: LanguageChipsProps) {
    const finalChips = selectedLanguages.length
        ? [
            { id: 'all', label: 'All' },
            ...selectedLanguages
                .map(id => LANGUAGES.find(l => l.id === id))
                .filter(Boolean)
        ]
        : LANGUAGES.slice(0, 5);

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-6 md:px-12 -mt-4 mb-4 relative z-30">
            {finalChips.map(lang => {
                // Fix: Type-safe access since we filter(Boolean) above, but TS might not know
                if (!lang) return null;

                const isActive =
                    (lang.id === 'all' && activeLanguage === null) ||
                    (lang.id !== 'all' && activeLanguage === lang.id);

                return (
                    <motion.button
                        key={lang.id}
                        aria-pressed={isActive}
                        aria-label={`Filter by ${lang.label}`}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: isActive ? 1 : 1.05 }}
                        onClick={() => onSelect(lang.id === 'all' ? null : lang.id)}
                        className={`
                            px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                            ${isActive
                                ? 'bg-white text-black font-bold'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                            }
                        `}
                    >
                        {lang.label}
                    </motion.button>
                );
            })}
        </div>
    );
}
