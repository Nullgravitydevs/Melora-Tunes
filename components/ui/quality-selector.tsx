import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Music2, Cpu } from 'lucide-react';
import { AudioQuality } from '@/lib/types';

export type QualityFilterType = 'auto' | 'hires' | 'flac' | '320';

interface QualitySelectorProps {
    value: QualityFilterType;
    onChange: (value: QualityFilterType) => void;
}

const QUALITIES: { value: QualityFilterType; label: string; icon: any; color: string }[] = [
    { value: 'auto', label: 'Auto', icon: Sparkles, color: 'text-blue-400' },
    { value: 'hires', label: 'Hi-Res', icon: Zap, color: 'text-amber-400' },
    { value: 'flac', label: 'FLAC', icon: Music2, color: 'text-purple-400' },
    { value: '320', label: 'HQ', icon: Cpu, color: 'text-green-400' },
];

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
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

    const selected = QUALITIES.find(q => q.value === value) || QUALITIES[0];
    const Icon = selected.icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all text-sm font-medium text-white/90 group"
            >
                <Icon className={`w-4 h-4 ${selected.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <span>{selected.label}</span>
                <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        <div className="px-3 py-2 text-[10px] uppercase font-bold text-white/30 tracking-wider">
                            Target Quality
                        </div>
                        {QUALITIES.map((q) => {
                            const QIcon = q.icon;
                            const isSelected = value === q.value;
                            return (
                                <button
                                    key={q.value}
                                    onClick={() => {
                                        onChange(q.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <QIcon className={`w-4 h-4 ${q.color} ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                                    <span>{q.label}</span>
                                    {isSelected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
