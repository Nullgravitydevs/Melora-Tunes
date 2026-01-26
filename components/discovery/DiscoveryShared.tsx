import React from 'react';
import { motion } from 'framer-motion';
import { Play, Disc, ArrowRight } from 'lucide-react';

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

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="flex items-end justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{title}</h2>
                {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}

export function FeatureCard({
    title,
    subtitle,
    image,
    colors,
    onClick,
    isNew
}: {
    title: string;
    subtitle: string;
    image?: string;
    colors: DiscoveryThemeColors;
    onClick: () => void;
    isNew?: boolean;
}) {
    return (
        <motion.div
            className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
            whileHover={{ scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
            onClick={onClick}
        >
            {/* Background Image */}
            {image ? (
                <img src={image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
                <div className="absolute inset-0 bg-neutral-800" />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-6">
                {isNew && (
                    <span className="inline-block px-2 py-1 mb-2 text-[10px] font-bold text-black bg-white rounded-full uppercase tracking-wider">
                        New
                    </span>
                )}
                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{title}</h3>
                <p className="text-sm text-neutral-300 line-clamp-1">{subtitle}</p>

                {/* Hover Play Button */}
                <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 translate-y-3 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 shadow-2xl">
                    <Play size={20} fill="black" className="ml-1" />
                </div>
            </div>
        </motion.div>
    );
}

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
            className="flex items-center px-4 py-3 rounded-lg cursor-pointer group relative transition-colors border border-transparent"
            style={{
                backgroundColor: isPlaying ? 'rgba(34,197,94,0.12)' : 'transparent',
                borderColor: isPlaying ? 'rgba(34,197,94,0.35)' : 'transparent'
            }}
            whileHover={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                scale: 1.004
            }}
            whileTap={{ scale: 0.995 }}
            onClick={onPlay}
        >
            {isPlaying && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            )}

            <span
                className="w-8 text-xs font-medium text-center font-mono"
                style={{ color: isPlaying ? '#ffffff' : colors.textMuted }}
            >
                {!isPlaying ? (
                    <>
                        <span className="group-hover:hidden opacity-50">{index}</span>
                        <Play size={14} className="hidden group-hover:block mx-auto text-white transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" fill="white" />
                    </>
                ) : (
                    <div className="flex items-end justify-center gap-[2px] h-3">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-[3px] bg-green-400 rounded-sm"
                                animate={{ height: ['30%', '100%', '40%', '90%', '30%'] }}
                                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut', delay: i * 0.12 }}
                            />
                        ))}
                    </div>
                )}
            </span>

            <div className="w-10 h-10 rounded-md mr-4 overflow-hidden flex-shrink-0 shadow-lg bg-neutral-900 border border-white/5 relative">
                {track.art ? (
                    <img
                        src={track.art}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc size={16} className="opacity-20 text-white" />
                    </div>
                )}
                {isPlaying && <div className="absolute inset-0 bg-black/20" />}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPlaying ? 'text-green-400' : 'text-white/90'}`}>
                    {track.title}
                </p>
                <p className="text-xs text-white/40 truncate group-hover:text-white/60 transition-colors">
                    {track.artist}
                </p>
            </div>

            {track.quality && (
                <span className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded ml-2 border text-[9px] font-bold tracking-wider
                ${track.quality === 'hires'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                        : track.quality === 'flac'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            : 'bg-white/10 text-white/70 border-white/20'
                    }`}
                >
                    {track.quality === 'hires' ? 'HI-RES' : track.quality === 'flac' ? 'LOSSLESS' : 'HQ'}
                </span>
            )}

            <span className="w-14 text-xs text-right text-white/30 font-mono tabular-nums">
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
