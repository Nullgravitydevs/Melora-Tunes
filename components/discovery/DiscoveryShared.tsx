import React from 'react';
import { motion } from 'framer-motion';
import { Play, Disc } from 'lucide-react';

// Typings (Simplified)
export interface TrackData {
    id: string;
    title: string;
    artist: string;
    duration: string;
    art?: string;
    quality?: string;
    original?: any;
}

export interface DiscoveryThemeColors {
    bg: string;
    surface: string;
    card: string;
    cardHover: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    accentSoft: string;
}

// --- HELPER FUNCTIONS ---

export function getArt(song: any): string {
    if (!song) return '';

    let img = song.image || song.art || song.images;
    if (Array.isArray(img)) {
        img = img[img.length - 1]?.link || img[0]?.link || '';
    }

    if (typeof img === 'string') {
        return img
            .replace(/(\d{2,3})x\1/g, '500x500')
            .replace(/_(\d{2,3})\./g, '_500.')
            .replace(/\/(\d{2,3})\//g, '/500/');
    }

    return '';
}

// --- SHARED COMPONENTS ---

export function NavItem({ icon, label, active, onClick }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors"
            style={{
                color: active ? '#FFFFFF' : '#666666'
            }}
            whileHover={{
                color: '#FFFFFF',
                backgroundColor: 'rgba(255,255,255,0.05)'
            }}
            transition={{ duration: 0.1 }}
        >
            {icon}
            {label}
        </motion.button>
    );
}

export function PlaylistItem({ icon, title, subtitle, active, colors, onClick }: {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    active?: boolean;
    colors: DiscoveryThemeColors;
    onClick: () => void;
}) {
    return (
        <motion.div
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            style={{ opacity: active ? 1 : 0.7 }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', opacity: 1 }}
            onClick={onClick}
            transition={{ duration: 0.2 }}
        >
            <div
                className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: icon ? colors.accent : colors.border, color: colors.bg }}
            >
                {icon}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{title}</p>
                {subtitle && (
                    <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
        </motion.div>
    );
}

export function TrackRow({
    index,
    track,
    colors,
    isPlaying,
    onPlay
}: {
    index: number;
    track: TrackData;
    colors: DiscoveryThemeColors;
    isPlaying: boolean;
    onPlay: () => void;
}) {
    return (
        <motion.div
            className="flex items-center px-4 py-3 rounded-lg cursor-pointer group relative transition-colors"
            style={{ backgroundColor: isPlaying ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            onClick={onPlay}
            transition={{ duration: 0.1 }}
        >
            <span
                className="w-8 text-xs font-medium text-center"
                style={{ color: isPlaying ? '#ffffff' : colors.textMuted }}
            >
                {!isPlaying ? (
                    <>
                        <span className="group-hover:hidden">{index}</span>
                        <Play size={14} className="hidden group-hover:block mx-auto text-white" />
                    </>
                ) : (
                    <div className="flex items-end justify-center gap-[2px] h-4">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-[3px] bg-white rounded-sm"
                                animate={{ height: ['40%', '100%', '60%', '100%', '40%'] }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                            />
                        ))}
                    </div>
                )}
            </span>

            <div className="w-10 h-10 rounded-md mr-4 overflow-hidden flex-shrink-0 shadow-lg bg-neutral-900 border border-white/10">
                {track.art ? (
                    <img src={track.art} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc size={16} className="opacity-20 text-white" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPlaying ? 'text-white' : 'text-zinc-200'}`}>
                    {track.title}
                </p>
            </div>

            <span className="w-36 text-xs truncate px-2 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {track.artist}
            </span>

            {track.quality && (
                <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 ${track.quality === 'hires' || track.quality === 'flac'
                            ? 'bg-white text-black'
                            : 'bg-white/10 text-white/50'
                        }`}
                >
                    {track.quality === 'hires' ? 'HI-RES' : track.quality === 'flac' ? 'FLAC' : 'HQ'}
                </span>
            )}

            <span className="w-14 text-xs text-right text-zinc-600 font-mono">
                {track.duration}
            </span>
        </motion.div>
    );
}

// --- SKELETON LOADERS ---

export function SkeletonTrackRow() {
    return (
        <div className="flex items-center px-4 py-3 rounded-lg gap-4">
            <div className="w-8 h-4 rounded bg-white/5 animate-pulse" />
            <div className="w-10 h-10 rounded bg-white/10 animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="flex-1 min-w-[200px] h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5 relative overflow-hidden">
            <div className="absolute top-4 left-4 w-12 h-4 bg-white/10 rounded" />
            <div className="absolute bottom-5 left-5 right-5 space-y-2">
                <div className="h-6 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
            </div>
        </div>
    );
}

export function SkeletonHero() {
    return (
        <div className="relative w-full h-[50vh] min-h-[400px] bg-neutral-900 animate-pulse overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full p-12 flex items-end gap-12">
                <div className="hidden md:block w-52 h-52 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-4 mb-2">
                    <div className="w-32 h-6 rounded-full bg-white/10" />
                    <div className="w-3/4 h-16 rounded bg-white/10" />
                    <div className="w-1/2 h-6 rounded bg-white/5" />
                    <div className="flex gap-4 pt-4">
                        <div className="w-40 h-14 rounded-full bg-white/10" />
                        <div className="w-14 h-14 rounded-full bg-white/5" />
                    </div>
                </div>
            </div>
        </div>
    );
}
