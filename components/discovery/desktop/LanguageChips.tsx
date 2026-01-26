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
    // Filter chips to show only selected languages + "All"
    // If no languages selected in settings, show common ones? 
    // Actually, improved UX: Show "All" + whatever is in settings.

    // Normalize settings langs to match our IDs
    const chipsToShow = LANGUAGES.filter(l =>
        l.id === 'all' || selectedLanguages.includes(l.id)
    );

    // If settings has minimal langs, maybe show them all? No, stick to settings for personalization.
    // If settings empty (new user), show defaults.
    const finalChips = chipsToShow.length > 1 ? chipsToShow : LANGUAGES.slice(0, 5);

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-6 md:px-12 -mt-4 mb-4 relative z-30">
            {finalChips.map(lang => {
                const isActive = (activeLanguage === lang.id) || (activeLanguage === null && lang.id === 'all');
                return (
                    <button
                        key={lang.id}
                        onClick={() => onSelect(lang.id === 'all' ? null : lang.id)}
                        className={`
                            px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                            ${isActive
                                ? 'bg-white text-black font-bold'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                            }
                        `}
                    >
                        {lang.label}
                    </button>
                );
            })}
        </div>
    );
}
