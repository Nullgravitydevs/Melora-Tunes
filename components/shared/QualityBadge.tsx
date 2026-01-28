import React from 'react';
import { cn } from '@/lib/utils';
import { AudioQuality } from '@/lib/types';

interface QualityBadgeProps {
    quality: AudioQuality | undefined | null;
    variant?: 'mini' | 'full';
    className?: string;
}

/**
 * Premium Quality Badge Component
 * 
 * Supports two tiers:
 * 1. 'mini' (Default) - For usage in lists, search results, recent played.
 *    Compact, punchy tags: [HI-RES] [LOSSLESS] [HQ]
 * 
 * 2. 'full' - For usage in Now Playing, Deck, Main Player.
 *    Detailed technical specs: "🔥 LOSSLESS · HI-RES · 24-bit / 96kHz"
 */
export const QualityBadge: React.FC<QualityBadgeProps> = ({
    quality,
    variant = 'mini',
    className
}) => {
    if (!quality) return null;

    // --------------------------------------------------------------------------
    // TIER 1: MINI BADGES (Lists, Search)
    // --------------------------------------------------------------------------
    if (variant === 'mini') {
        switch (quality) {
            case 'hires':
                return (
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-yellow-500/20 text-yellow-500 border border-yellow-500/30", className)}>
                        HI-RES
                    </span>
                );
            case 'flac':
                return (
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30", className)}>
                        LOSSLESS
                    </span>
                );
            case '320':
                return (
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-green-500/20 text-green-400 border border-green-500/30", className)}>
                        HQ
                    </span>
                );
            case '160':
                return (
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-neutral-700/50 text-neutral-400 border border-white/10", className)}>
                        MQ
                    </span>
                );
            case '96':
                return (
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-red-900/20 text-red-400 border border-red-900/30", className)}>
                        LQ
                    </span>
                );
            default:
                return null;
        }
    }

    // --------------------------------------------------------------------------
    // TIER 2: FULL TECHNICAL BADGES (Player, Deck)
    // --------------------------------------------------------------------------
    if (variant === 'full') {
        switch (quality) {
            case 'hires':
                return (
                    <div className={cn("flex flex-col items-center gap-1", className)}>
                        <span className="text-yellow-500 font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                            🔥 Hi-Res Studio Quality
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
                            LOSSLESS · HI-RES · 24-bit / 96kHz
                        </span>
                    </div>
                );
            case 'flac':
                return (
                    <div className={cn("flex flex-col items-center gap-1", className)}>
                        <span className="text-blue-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                            💿 CD Quality Lossless
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
                            LOSSLESS · CD · 16-bit / 44.1kHz
                        </span>
                    </div>
                );
            case '320':
                return (
                    <div className={cn("flex flex-col items-center gap-1", className)}>
                        <span className="text-green-500 font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                            🎶 High-Quality Streaming
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
                            HQ · 320 kbps
                        </span>
                    </div>
                );
            case '160':
                return (
                    <div className={cn("flex flex-col items-center gap-1", className)}>
                        <span className="text-neutral-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                            🎵 Standard Streaming
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
                            MQ · 160 kbps
                        </span>
                    </div>
                );
            case '96':
                return (
                    <div className={cn("flex flex-col items-center gap-1", className)}>
                        <span className="text-red-400 font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                            📻 Data Saver
                        </span>
                        <span className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
                            LQ · 96 kbps
                        </span>
                    </div>
                );
            default:
                return null;
        }
    }

    return null;
};
