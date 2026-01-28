import React from 'react';
import { motion } from 'framer-motion';
import { Play, Disc } from 'lucide-react';
import { PlayableTrack, AudioQuality } from '@/lib/types';
import { JioSaavnSong } from '@/lib/jiosaavn';
import { QualityBadge } from '@/components/shared/QualityBadge';

/* =========================
   TYPES
========================= */

// Wrapper for UI-safe track representation
export interface TrackData {
    id: string;
    title: string;
    artist: string;
    duration: number; // Normalized to seconds
    art?: string;
    // Align with global enum (lowercase 'flac', '320' etc)
    quality?: AudioQuality;

    // Original payload for playback context
    original: PlayableTrack | JioSaavnSong; // Explicit Typing
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

/* =========================
   HELPERS
========================= */

// Deterministic Art Fetcher
export function getArt(item: any): string {
    if (!item) return '';

    // 1. PlayableTrack / HistoryItem wrapper
    if (item.track && item.track.art) return item.track.art; // HistoryItem
    if (item.art) return item.art; // already defined

    // 2. JioSaavn Song Structure
    const images = item.image || item.images || [];

    if (Array.isArray(images)) {
        // Priority: 500x500 > 150x150 > Last (High) > First (Low)
        const best =
            images.find((i: any) => i?.quality === '500x500') ||
            images.find((i: any) => i?.quality === '150x150') ||
            images[images.length - 1]; // Usually highest res in Saavn array

        return best?.link || '';
    }

    // 3. Single Object
    if (typeof images === 'object' && images?.link) {
        return images.link;
    }

    // 4. Direct String
    if (typeof images === 'string') {
        return images;
    }

    return '';
}

// SSR-Safe Decoder
export function decodeHtml(html: string) {
    if (!html) return "";
    if (typeof window === 'undefined') return html;

    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// Identity Normalizer
export function normalizeTrackIdentity(title: string, artist: string): string {
    const t = (title || '').toLowerCase()
        .split('(')[0]
        .split('[')[0]
        .replace(/[^a-z0-9]/g, '')
        .trim();
    const a = (artist || '').toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '').trim();
    return `${t}|${a}`;
}

// Duration Formatter (Seconds -> MM:SS)
export function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}


/* =========================
   SHARED UI
========================= */

export function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
    return (
        <div className="flex items-end justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight leading-none">{title}</h2>
                {subtitle && <p className="text-sm text-white/50 mt-1.5 font-medium tracking-wide">{subtitle}</p>}
            </div>
            {onSeeAll && (
                <button
                    onClick={onSeeAll}
                    className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors pb-1 border-b border-transparent hover:border-white/20"
                >
                    See All
                </button>
            )}
        </div>
    );
}

export function FeatureCard({
    title,
    subtitle,
    image,
    onClick,
    isNew
}: {
    title: string;
    subtitle: string;
    image?: string;
    onClick: () => void;
    isNew?: boolean;
}) {
    return (
        <motion.div
            className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group shadow-lg bg-neutral-900 border border-white/5"
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={onClick}
        >
            {image ? (
                <img
                    src={image}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            ) : (
                <div className="absolute inset-0 bg-neutral-800" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            <div className="absolute bottom-0 left-0 w-full p-6 z-10">
                {isNew && (
                    <span className="inline-block px-2.5 py-1 mb-3 text-[10px] font-bold bg-white text-black rounded-full uppercase tracking-wide">
                        New
                    </span>
                )}
                <h3 className="text-xl font-bold text-white truncate leading-tight mb-1">{title}</h3>
                <p className="text-sm text-white/60 truncate font-medium">{subtitle}</p>
            </div>

            {/* Hover Play Button */}
            <div className="absolute bottom-6 right-6 w-12 h-12 bg-green-500 rounded-full
                flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0
                transition-all duration-300 shadow-xl z-20">
                <Play size={22} fill="black" className="text-black ml-0.5" />
            </div>

            {/* Hover Glow */}
            <div className="absolute -inset-1 bg-white/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />
        </motion.div>
    );
}

/* =========================
   TRACK ROW (Pure Component)
========================= */

export function TrackRow({
    index,
    track,
    colors,
    isPlaying,
    onPlay
}: {
    index: number;
    track: TrackData; // Accepts normalized wrapper
    colors: DiscoveryThemeColors;
    isPlaying: boolean;
    onPlay: () => void;
}) {
    return (
        <motion.div
            className="flex items-center px-4 py-3 rounded-xl cursor-pointer group relative border border-transparent transition-all duration-200"
            initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
            style={{
                backgroundColor: isPlaying ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0)',
            }}
            whileHover={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                y: -1
            }}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onPlay();
            }}
        >
            {isPlaying && (
                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-green-500 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            )}

            <span
                className="w-8 text-xs text-center font-bold tracking-tighter"
                style={{ color: isPlaying ? '#22c55e' : colors.textMuted }}
            >
                {!isPlaying ? (
                    <>
                        <span className="group-hover:hidden opacity-50">{index}</span>
                        <Play
                            size={14}
                            className="hidden group-hover:block mx-auto opacity-0 group-hover:opacity-100 pointer-events-none"
                            fill="white"
                        />
                    </>
                ) : (
                    <div className="flex items-end justify-center gap-[2px] h-3 min-w-[14px]">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-[3px] bg-green-400 rounded-sm"
                                animate={{ height: ['30%', '100%', '40%'] }}
                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.12 }}
                            />
                        ))}
                    </div>
                )}
            </span>

            <div className="w-10 h-10 rounded-md mr-4 overflow-hidden bg-neutral-900 border border-white/5">
                {track.art ? (
                    <img src={track.art} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc size={16} className="text-white/20" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${isPlaying ? 'text-green-400' : 'text-white'}`}>
                    {decodeHtml(track.title)}
                </p>
                <p className="text-xs text-white/40 truncate">{decodeHtml(track.artist)}</p>
            </div>

            {/* Quality Badge (Unified) */}
            <div className="hidden md:block ml-3">
                <QualityBadge quality={track.quality} variant="mini" />
            </div>

            <span className="w-14 text-xs text-right text-white/30 font-mono">
                {formatDuration(track.duration)}
            </span>
        </motion.div>
    );
}

/* =========================
   SKELETONS
========================= */

export function SkeletonTrackRow() {
    return (
        <div className="flex items-center px-4 py-3 gap-4 animate-pulse">
            <div className="w-8 h-4 bg-white/5 rounded" />
            <div className="w-10 h-10 bg-white/10 rounded" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-white/10 rounded" />
                <div className="h-3 w-1/4 bg-white/5 rounded" />
            </div>
            <div className="w-12 h-3 bg-white/5 rounded" />
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
    );
}

export function SkeletonHero() {
    return (
        <div className="w-full h-[50vh] min-h-[400px] bg-neutral-900 animate-pulse" />
    );
}

/* =========================
   NAVIGATION ITEMS
========================= */

export function NavItem({
    icon,
    label,
    active,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group
            ${active ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
            <div className={`transition-transform duration-200 ${active ? "scale-110 text-white" : "group-hover:scale-110"}`}>
                {React.isValidElement(icon)
                    ? React.cloneElement(icon as React.ReactElement<any>, {
                        size: 18,
                        strokeWidth: active ? 2.5 : 2
                    })
                    : icon}
            </div>
            <span className="text-sm tracking-tight">{label}</span>
        </div>
    );
}

export function PlaylistItem({
    icon,
    title,
    subtitle,
    colors,
    active,
    onClick
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    colors: DiscoveryThemeColors;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all group
                ${active ? 'bg-white/10' : 'hover:bg-white/5'}`} // Fixed Template Literal
            onClick={onClick}
            title={title}
        >
            <div
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors min-w-[32px]
                    ${active ? 'bg-white text-black' : 'bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10'}`} // Fixed Template Literal
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
                <p
                    className={`text-sm truncate font-medium ${active ? 'text-white' : 'text-white/80'}`} // Fixed Template Literal
                    style={{ color: active ? colors.text : colors.textMuted }}
                >
                    {title}
                </p>
                <p className="text-[10px] truncate opacity-50 block w-full" style={{ color: colors.textMuted }}>
                    {subtitle}
                </p>
            </div>
            {active && (
                <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            )}
        </div>
    );
}

