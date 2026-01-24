import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, Disc, Check } from 'lucide-react';
import { usePlayback, ensurePlayableTrack } from '@/components/providers/playback-context';

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

export function getArt(song: any) {
    if (!song) return '';
    // Handle both new unified format and raw jiosaavn
    let img = song.image || song.art;
    if (Array.isArray(img)) {
        img = img[img.length - 1]?.link || img[0]?.link || '';
    }
    // Force High Quality - Robust Regex
    if (typeof img === 'string') {
        return img
            .replace(/150x150/g, '500x500')
            .replace(/50x50/g, '500x500')
            .replace(/_150\./g, '_500.')
            .replace(/_50\./g, '_500.');
    }
    return img || '';
}

// --- SHARED COMPONENTS ---

export function NavItem({ icon, label, active, colors, onClick }: any) {
    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors"
            style={{
                backgroundColor: 'transparent',
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

export function PlaylistItem({ icon, title, subtitle, active, colors, onClick }: any) {
    return (
        <motion.div
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            style={{
                backgroundColor: 'transparent',
                opacity: active ? 1 : 0.7
            }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', opacity: 1 }}
            onClick={onClick}
            transition={{ duration: 0.2 }}
        >
            {icon ? (
                <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.accent, color: colors.bg }}>{icon}</div>
            ) : (
                <div className="w-9 h-9 rounded-md" style={{ backgroundColor: colors.border }}></div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{title}</p>
                <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>{subtitle}</p>
            </div>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
        </motion.div>
    );
}

export function TrackRow({ index, track, colors, isPlaying, onPlay }: { index: number, track: TrackData, colors: DiscoveryThemeColors, isPlaying: boolean, onPlay: () => void }) {
    return (
        <motion.div
            className="flex items-center px-4 py-3 rounded-lg cursor-pointer group relative transition-colors"
            style={{ backgroundColor: isPlaying ? 'rgba(255, 255, 255, 0.1)' : 'transparent' }} // Standardized White Highlight for Monochrome
            whileHover={{
                backgroundColor: 'rgba(255,255,255,0.08)',
            }}
            onClick={onPlay}
            transition={{ duration: 0.1 }}
        >
            {/* Index / Playing Indicator */}
            <span
                className="w-8 text-xs font-medium text-center"
                style={{ color: isPlaying ? '#ffffff' : colors.textMuted }}
            >
                {isPlaying ? (
                    <div className="flex items-end justify-center gap-[2px] h-4">
                        <motion.div className="w-[3px] bg-white rounded-sm" animate={{ height: ['40%', '100%', '60%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                        <motion.div className="w-[3px] bg-white rounded-sm" animate={{ height: ['100%', '40%', '100%', '60%', '100%'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
                        <motion.div className="w-[3px] bg-white rounded-sm" animate={{ height: ['60%', '100%', '40%', '100%', '60%'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
                    </div>
                ) : (
                    <span className="group-hover:hidden">{index}</span>
                )}
                {!isPlaying && (
                    <Play size={14} className="hidden group-hover:block mx-auto text-white" />
                )}
            </span>

            {/* Album Art Thumbnail */}
            <div className="w-10 h-10 rounded-md mr-4 overflow-hidden flex-shrink-0 shadow-lg bg-neutral-900 border border-white/10">
                {track.art ? (
                    <img src={track.art} alt={track.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center"><Disc size={16} className="opacity-20 text-white" /></div>}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPlaying ? 'text-white' : 'text-zinc-200'}`}>
                    {track.title}
                </p>
            </div>

            {/* Artist */}
            <span className="w-36 text-xs truncate px-2 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {track.artist}
            </span>

            {/* Quality Badge */}
            {track.quality && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 ${track.quality === 'hires' || track.quality === 'flac' ? 'bg-white text-black' : 'bg-white/10 text-white/50'
                    }`}>
                    {track.quality === 'hires' ? 'HI-RES' : track.quality === 'flac' ? 'FLAC' : 'HQ'}
                </span>
            )}

            {/* Duration */}
            <span className="w-14 text-xs text-right text-zinc-600 font-mono">
                {track.duration}
            </span>
        </motion.div>
    );
}

export function FeatureCard({ title, subtitle, isNew, colors, image, onClick, type = 'MIX' }: any) {
    const hasImage = !!image;

    return (
        <motion.div
            className="flex-1 min-w-[200px] h-48 rounded-2xl cursor-pointer relative overflow-hidden group border border-white/5"
            style={{
                backgroundColor: hasImage ? '#000' : '#111',
            }}
            onClick={onClick}
            whileHover={{ y: -6 }}
        >
            {/* Background Image */}
            {hasImage && (
                <>
                    <img
                        src={image}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 h-full p-5 flex flex-col justify-end">
                {isNew && (
                    <span className="absolute top-4 left-4 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white text-black">
                        New
                    </span>
                )}
                <p className="text-[10px] uppercase tracking-widest mb-1 font-bold text-white/60">
                    {type}
                </p>
                <p className="text-xl font-bold leading-tight text-white mb-1 line-clamp-2">
                    {title}
                </p>
                <p className="text-xs text-white/50 line-clamp-1">
                    {subtitle}
                </p>
            </div>

            {/* Play Button on Hover */}
            <motion.div
                className="absolute right-4 bottom-4 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white text-black shadow-lg"
                initial={{ y: 10 }}
                whileHover={{ scale: 1.1 }}
                animate={{ y: 0 }}
            >
                <Play size={18} fill="black" className="ml-0.5" />
            </motion.div>
        </motion.div>
    );
}

export function MoodPill({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${active
                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                : 'bg-transparent text-white/60 border-white/10 hover:border-white/50 hover:text-white'
                }`}
            whileTap={{ scale: 0.95 }}
        >
            {label}
        </motion.button>
    );
}

export function SectionHeader({ title, subtitle, action }: { title: string, subtitle?: string, action?: { label: string, onClick: () => void } }) {
    return (
        <div className="flex items-end justify-between mb-6 px-2 border-b border-white/5 pb-2">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-white/40 mt-1">{subtitle}</p>}
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors pb-1"
                >
                    {action.label}
                </button>
            )}
        </div>
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
