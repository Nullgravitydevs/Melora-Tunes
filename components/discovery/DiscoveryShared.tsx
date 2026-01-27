import React from 'react';
import { motion } from 'framer-motion';
import { Play, Disc } from 'lucide-react';

/* =========================
   TYPES
========================= */

export interface TrackData {
    id: string;
    title: string;
    artist: string;
    duration: string | number;
    art?: string;
    quality?: 'hires' | 'flac' | 'hq';
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

/* =========================
   HELPERS
========================= */

export function getArt(item: any): string {
    if (!item) return '';

    const images =
        item.image ||
        item.images ||
        item.art ||
        [];

    if (Array.isArray(images)) {
        const best =
            images.find((i: any) => i?.quality === '500x500') ||
            images.find((i: any) => i?.quality === '150x150') ||
            images[images.length - 1];

        return best?.link || '';
    }

    if (typeof images === 'object' && images?.link) {
        return images.link;
    }

    if (typeof images === 'string') {
        return images;
    }

    return '';
}

/* =========================
   SHARED UI
========================= */

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="flex items-end justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
            </div>
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
            className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
            whileHover={{ scale: 1.03 }}
            onClick={onClick}
        >
            {image ? (
                <img
                    src={image}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
            ) : (
                <div className="absolute inset-0 bg-neutral-800" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-6">
                {isNew && (
                    <span className="inline-block px-2 py-1 mb-2 text-[10px] font-bold bg-white text-black rounded-full uppercase">
                        New
                    </span>
                )}
                <h3 className="text-xl font-bold text-white truncate">{title}</h3>
                <p className="text-sm text-white/60 truncate">{subtitle}</p>

                <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full
                    flex items-center justify-center opacity-0 group-hover:opacity-100
                    transition-all shadow-xl pointer-events-none">
                    <Play size={20} fill="black" />
                </div>
            </div>
        </motion.div>
    );
}

/* =========================
   TRACK ROW
========================= */

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
            className="flex items-center px-4 py-3 rounded-lg cursor-pointer group relative border border-transparent"
            style={{
                backgroundColor: isPlaying ? 'rgba(34,197,94,0.12)' : 'transparent',
                borderColor: isPlaying ? 'rgba(34,197,94,0.35)' : 'transparent'
            }}
            whileHover={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)'
            }}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onPlay();
            }}
        >
            {isPlaying && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-green-400 rounded-full" />
            )}

            <span
                className="w-8 text-xs text-center font-mono"
                style={{ color: isPlaying ? '#fff' : colors.textMuted }}
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
                    <img src={track.art} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc size={16} className="text-white/20" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${isPlaying ? 'text-green-400' : 'text-white'}`}>
                    {track.title}
                </p>
                <p className="text-xs text-white/40 truncate">{track.artist}</p>
            </div>

            {track.quality && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 ml-2 text-[9px] font-bold rounded border
                    bg-white/10 text-white/70 border-white/20">
                    {track.quality === 'hires'
                        ? 'HI-RES'
                        : track.quality === 'flac'
                            ? 'LOSSLESS'
                            : 'HQ'}
                </span>
            )}

            <span className="w-14 text-xs text-right text-white/30 font-mono">
                {track.duration}
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
                \${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
            onClick={onClick}
        >
            <div
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors min-w-[32px]
                    \${active ? 'bg-white text-black' : 'bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10'}`}
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
                <p
                    className={`text-sm truncate font-medium \${active ? 'text-white' : 'text-white/80'}`}
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
