import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Music, Disc, Mic, Layers } from 'lucide-react';

export type SearchFilterType = 'all' | 'song' | 'album' | 'artist';

interface SearchFiltersProps {
    value: SearchFilterType;
    onChange: (value: SearchFilterType) => void;
}

const FILTERS: { value: SearchFilterType; label: string; icon: any }[] = [
    { value: 'all', label: 'All', icon: Layers },
    { value: 'song', label: 'Songs', icon: Music },
    { value: 'album', label: 'Albums', icon: Disc },
    { value: 'artist', label: 'Artists', icon: Mic },
];

export function SearchFilters({ value, onChange }: SearchFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedFilter = FILTERS.find(f => f.value === value) || FILTERS[0];
    const Icon = selectedFilter.icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all text-sm font-medium text-white/90"
            >
                <Icon className="w-4 h-4 text-white/70" />
                <span>{selectedFilter.label}</span>
                <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        {FILTERS.map((filter) => {
                            const FilterIcon = filter.icon;
                            const isSelected = value === filter.value;
                            return (
                                <button
                                    key={filter.value}
                                    onClick={() => {
                                        onChange(filter.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <FilterIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-white/50'}`} />
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
