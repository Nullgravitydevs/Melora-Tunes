"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, ChevronRight, Disc3, Music, Mic } from "lucide-react";
import { decodeHtml } from "@/lib/utils";
import { JioSaavnSong } from "@/lib/jiosaavn";

/* --- LAYOUT WRAPPERS --- */

export function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
    return (
        <div className="flex items-end justify-between mb-4 md:mb-6 px-8">
            <div>
                {subtitle && <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">{subtitle}</p>}
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h2>
            </div>
            {onSeeAll && (
                <button
                    onClick={onSeeAll}
                    className="text-xs font-bold text-white/40 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors pb-1"
                >
                    See All <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
}

export function HorizontalScroll({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto pb-8 pt-2 scroll-smooth px-8" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-6 w-max">
                {children}
            </div>
        </div>
    );
}

/* --- CARD: POSTER (Vertical, for Charts/Global Hits) --- */
export function PosterCard({ item, index, subtitle, onClick }: { item: any; index: number; subtitle: string; onClick: () => void }) {
    const getArt = () => {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="group relative flex-shrink-0 w-48 cursor-pointer"
        >
            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden mb-3 relative shadow-lg bg-black border border-white/5">
                {getArt() ? (
                    <img src={getArt()} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <Disc3 size={32} className="text-white/20" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 ml-0" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Play fill="currentColor" size={20} className="ml-1" />
                    </div>
                </div>

                {/* Rank Number (Optional aesthetic) */}
                <div className="absolute top-2 left-2 font-black text-6xl text-white/10 select-none">
                    {index + 1}
                </div>
            </div>

            <h3 className="font-bold text-white truncate text-base leading-tight">{decodeHtml(item.title || item.name)}</h3>
            <p className="text-sm text-white/40 font-medium truncate mt-1">{subtitle}</p>
        </motion.div>
    );
}

/* --- CARD: FEATURE (Wide, for Playlists/Editorials) --- */
export function FeatureCard({ item, index, description, onClick }: { item: any; index: number; description?: string; onClick: () => void }) {
    const [imgError, setImgError] = React.useState(false);
    const getArt = () => {
        if (imgError) return '';
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="group relative flex-shrink-0 w-80 h-48 rounded-xl overflow-hidden cursor-pointer shadow-lg bg-black border border-white/5"
        >
            {getArt() && (
                <div className="absolute inset-0">
                    <img
                        src={getArt()}
                        alt=""
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-40 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                </div>
            )}

            <div className="relative z-10 p-6 flex flex-col justify-end h-full">
                <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">{description || item.type}</p>
                <h3 className="text-2xl font-bold text-white leading-tight mb-1 line-clamp-2">{decodeHtml(item.title || item.name)}</h3>
                {item.subtitle && <p className="text-sm text-white/40 line-clamp-1">{decodeHtml(item.subtitle)}</p>}
            </div>

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                    <Play fill="currentColor" size={24} className="ml-1" />
                </div>
            </div>
        </motion.div>
    );
}

/* --- CARD: STANDARD (Square, for Songs/Albums) --- */
export function StandardCard({ item, index, subtitle, onClick, rank }: { item: any; index: number; subtitle?: string; onClick: () => void; rank?: number }) {
    const [imgError, setImgError] = React.useState(false);
    const getArt = () => {
        if (imgError) return '';
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="group w-40 md:w-48 flex-shrink-0 cursor-pointer"
        >
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black shadow-md border border-white/5">
                {getArt() ? (
                    <img
                        src={getArt()}
                        alt={item.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:opacity-80"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#000000]">
                        <Music size={32} className="text-white/20" />
                    </div>
                )}

                {/* Overlay Play */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform hover:scale-110">
                        <Play fill="currentColor" size={16} className="ml-0.5" />
                    </div>
                </div>

                {rank && (
                    <div className="absolute top-0 left-0 bg-white/10 backdrop-blur-md px-2 py-1 rounded-br-lg">
                        <span className="text-xs font-bold text-white">#{rank}</span>
                    </div>
                )}
            </div>

            <h4 className="font-semibold text-white truncate text-[15px]">{decodeHtml(item.name || item.title)}</h4>
            <p className="text-sm text-white/40 truncate mt-0.5">{decodeHtml(subtitle || item.subtitle || '')}</p>
        </motion.div>
    );
}

/* --- NEW: VIBE ALBUM CARD (Realistic CD Animation) --- */
export function VibeAlbumCard({ item, onClick }: { item: any; onClick: () => void }) {
    const [imgError, setImgError] = React.useState(false);
    const getArt = () => {
        if (imgError) return '';
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            onClick={onClick}
            className="group relative w-32 h-32 cursor-pointer perspective-1000"
            whileHover={{ scale: 1.05 }}
        >
            {/* The CD (Sticks out on hover) */}
            <div
                className="absolute top-2 left-2 w-28 h-28 rounded-full shadow-xl transition-all duration-500 ease-out group-hover:translate-x-10 group-hover:rotate-[120deg]"
                style={{ zIndex: 0 }}
            >
                <div className="w-full h-full rounded-full relative overflow-hidden">
                    {/* Realistic Silver Finish */}
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#e0e0e0,#ffffff,#d0d0d0,#ffffff,#e0e0e0)] rounded-full" />
                    <div className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay" style={{ background: `conic-gradient(from 0deg, transparent 0%, #ff0000 10%, #00ff00 20%, #0000ff 30%, transparent 40%)` }} />
                    <div className="absolute inset-0 rounded-full opacity-20" style={{ background: 'repeating-radial-gradient(transparent 0, transparent 1px, #000 2px)' }} />

                    {/* Tiny Art Center */}
                    <div className="absolute top-[35%] left-[35%] w-[30%] h-[30%] rounded-full overflow-hidden border-2 border-neutral-300">
                        {getArt() && <img src={getArt()} className="w-full h-full object-cover scale-[4]" onError={() => setImgError(true)} />}
                    </div>
                    {/* Center Hole */}
                    <div className="absolute top-[46%] left-[46%] w-2 h-2 bg-black rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]" />
                </div>
            </div>

            {/* The Sleeve (On Top) */}
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl z-10 bg-black border border-white/5">
                {getArt() && <img src={getArt()} alt={item.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />}

                {/* Glassy Overlay with Title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-100 flex items-end p-2.5">
                    <div>
                        <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Vibe</p>
                        <h3 className="text-white text-[10px] font-bold leading-tight line-clamp-2 drop-shadow-md">{decodeHtml(item.title || item.name)}</h3>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* --- QUICK PICK ITEM --- */
export function QuickPickItem({ item, index, onClick }: { item: any; index: number; onClick: () => void }) {
    const [imgError, setImgError] = React.useState(false);
    const getArt = () => {
        if (imgError) return '';
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '150x150')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="flex items-center gap-3 p-2 pr-4 rounded-lg bg-transparent hover:bg-white/5 transition-colors cursor-pointer group border border-white/5 hover:border-white/10"
        >
            <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[#000000]">
                {getArt() ? (
                    <img
                        src={getArt()}
                        alt={item.title}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music size={16} className="text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} fill="currentColor" className="text-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm truncate">{decodeHtml(item.name || item.title)}</h4>
                <p className="text-xs text-white/40 truncate">{decodeHtml(item.primaryArtists || item.subtitle)}</p>
            </div>
        </motion.div>
    );
}

// === RADIO CARD ===
export function RadioCard({ radio, index, onClick }: { radio: any; index: number; onClick: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="group relative w-40 h-40 rounded-full overflow-hidden cursor-pointer border-4 border-white/5 hover:border-white/20 transition-all flex-shrink-0"
        >
            <div className="absolute inset-0 animate-[spin_10s_linear_infinite] group-hover:animate-[spin_3s_linear_infinite]">
                {/* Placeholder for radio gradient/art */}
                <div className="w-full h-full bg-white/10 opacity-80" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/20">
                <Mic size={24} className="text-white drop-shadow-lg" />
            </div>
            <div className="absolute bottom-6 left-0 right-0 text-center px-2">
                <p className="text-xs font-bold text-white truncate drop-shadow-md">{radio.name}</p>
            </div>
        </motion.div>
    );
}

// === COMPACT CARD (List Style) ===
export function CompactCard({ item, index, onClick }: { item: any; index: number; onClick: () => void }) {
    const getArt = () => {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '150x150')?.link || item.image[0]?.link || '';
        return '';
    };

    return (
        <div onClick={onClick} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group border-b border-white/5 last:border-0 hover:border-transparent">
            <span className="font-bold text-white/20 w-4 text-center group-hover:text-white/60">{index + 1}</span>
            <img src={getArt()} className="w-12 h-12 rounded-lg object-cover bg-[#000000]" />
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{decodeHtml(item.name)}</h4>
                <p className="text-sm text-white/40 truncate">{decodeHtml(item.primaryArtists)}</p>
            </div>
            <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10">
                <Play size={14} fill="currentColor" />
            </button>
        </div>
    )
}

/* --- DEPRECATED: MoodCard (Will be replaced by VibeAlbumCard) --- */
export function MoodCard({ title, color, onClick }: { title: string; color: string; onClick: () => void }) {
    const colors: any = {
        rose: 'from-white/20 to-white/5',
        violet: 'from-white/15 to-white/[0.02]',
        orange: 'from-white/20 to-white/5',
        emerald: 'from-white/10 to-white/[0.02]',
        blue: 'from-white/15 to-white/5',
        sky: 'from-white/10 to-white/[0.02]',
    };

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`h-32 rounded-xl bg-gradient-to-br ${colors[color] || 'from-zinc-700 to-zinc-900'} p-4 relative overflow-hidden cursor-pointer shadow-lg`}
        >
            <h3 className="text-2xl font-black text-white absolute bottom-3 left-4 tracking-tight drop-shadow-md">{title}</h3>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/20 blur-xl" />
        </motion.div>
    );
}

export function AlbumCard({ album, onClick }: { album: any; onClick: () => void }) {
    const getImg = (item: any) => {
        if (!item?.image) return '';
        if (typeof item.image === 'string') return item.image;
        if (Array.isArray(item.image)) return item.image.find((i: any) => i.quality === '500x500')?.link || item.image[0]?.link || '';
        return '';
    };
    return (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClick} className="w-40 flex-shrink-0 cursor-pointer group snap-start">
            <div className="w-40 h-40 rounded-2xl overflow-hidden bg-white/5 shadow-lg mb-2">
                <img src={getImg(album)} alt={album?.name || ''} className="w-full h-full object-cover" />
            </div>
            <p className="text-sm font-bold text-white truncate">{decodeHtml(album?.name || '')}</p>
            <p className="text-xs text-white/40 truncate">{album?.year || decodeHtml(album?.primaryArtists || '')}</p>
        </motion.div>
    );
}
