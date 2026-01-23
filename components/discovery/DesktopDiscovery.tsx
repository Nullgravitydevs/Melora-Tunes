import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";
import { getTrending, getTopCharts } from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { HistoryStore } from "@/lib/history-store";
import { OfflineStore } from "@/lib/offline-store";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { useLyrics } from "@/hooks/useLyrics";
import { Search, Home, Library, Heart, Disc, Bell, Plus, Play, Pause, SkipForward, SkipBack, Volume2, Volume1, VolumeX, Shuffle, Repeat, MoreHorizontal, ChevronRight, ChevronDown, Loader2, Download, Compass, Maximize2 } from "lucide-react";

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

// --- Audio Quality Badge ---
const qualityTooltips: any = {
    'hires': { title: '🔥 Hi-Res Studio Quality', desc: 'LOSSLESS · HI-RES · 24-bit / 96kHz' },
    'flac': { title: '💿 CD Quality Lossless', desc: 'LOSSLESS · CD · 16-bit / 44.1kHz' },
    '320': { title: '🎶 High-Quality Streaming', desc: 'HQ · 320 kbps' },
    '160': { title: '🎵 Standard Streaming', desc: 'MQ · 160 kbps' },
    '96': { title: '📻 Data Saver', desc: 'LQ · 96 kbps' },
};

function QualityBadge({ quality }: { quality: string }) {
    const norm = quality?.toLowerCase().trim() || '320';
    let q = '160';
    if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
    else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
    else if (norm === '320' || norm.includes('hq') || norm.includes('high')) q = '320';
    else if (norm === '96' || norm.includes('lq')) q = '96';
    else if (norm === '160' || norm.includes('mq')) q = '160';
    const info = qualityTooltips[q];
    const [show, setShow] = useState(false);

    return (
        <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-help ${q === 'hires' || q === 'flac' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                {q === 'hires' ? 'HI-RES' : q === 'flac' ? 'FLAC' : q === '320' ? 'HQ' : 'MQ'}
            </span>
            {/* Tooltip */}
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 border border-white/10 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-xl"
                >
                    <p className="text-white font-bold text-xs mb-1">{info.title}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{info.desc}</p>
                </motion.div>
            )}
        </div>
    );
}

// --- Custom Waveform Loader ---
// --- Custom Loader (New Concept) ---
function WaveLoader() {
    return (
        <div className="flex items-center gap-1.5 h-6">
            {[1, 2, 3].map(i => (
                <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                        boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 10px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)']
                    }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}

// Animation Config
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

// --- Now Playing Overlay ---
// --- Now Playing Overlay ---
// --- Now Playing Overlay ---
function NowPlayingOverlay({ song, nextSong, quality, onClose, playback }: { song: any, nextSong: any, quality: string, onClose: () => void, playback: any }) {
    const Art = getArt(song);
    const { lyrics, plainLyrics, isSynced, isLoading } = useLyrics(song);
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync Lyrics - Robust
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;

        // Find the current line index
        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return playback.progress >= line.time && (!nextLine || playback.progress < nextLine.time);
        });

        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
            // Smooth scroll to active line - Fix nesting access
            const lyricsContainer = scrollRef.current?.firstElementChild;
            const activeEl = lyricsContainer?.children[index] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [playback.progress, lyrics, isSynced]); // activeIndex dep removed to prevent loop, strictly driven by progress

    // Smart Right Panel Decision
    const hasLyrics = (isSynced && lyrics.length > 0) || !!plainLyrics;
    const showQueue = !hasLyrics && !isLoading;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
        >
            {/* 1. Ambient Dynamic Background */}
            {Art && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img src={Art} className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-70 scale-150 animate-pulse saturate-200" style={{ animationDuration: '10s' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6">
                <button onClick={onClose} className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors">
                    <ChevronDown size={18} /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex gap-8 px-12 pb-8 w-full h-full items-center overflow-hidden">

                {/* Left: Art & Controls */}
                <div className="w-1/2 flex flex-col justify-center gap-6 max-w-xl mx-auto h-full p-4 lg:p-8 relative">

                    {/* Art */}
                    <div className="w-full h-auto max-h-[45vh] flex items-center justify-center">
                        <motion.div
                            className="relative max-h-full w-auto shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden ring-1 ring-white/10"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {Art ? (
                                <img src={Art} alt={song.name} className="w-auto h-auto max-w-full max-h-[45vh] object-contain" />
                            ) : (
                                <div className="w-[280px] h-[280px] bg-neutral-900 flex items-center justify-center"><Disc size={48} className="opacity-20 text-white" /></div>
                            )}
                        </motion.div>
                    </div>

                    {/* Title & Progress */}
                    <div className="flex flex-col gap-5 items-center text-center">
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">{song.name}</h1>
                            <p className="text-lg text-white/60 font-medium drop-shadow-sm">{song.primaryArtists}</p>
                        </div>

                        <div className="flex flex-col gap-2 w-full max-w-md">
                            <div className="bg-white/10 h-1.5 rounded-full w-full cursor-pointer relative group backdrop-blur-sm"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    playback.seek((e.clientX - rect.left) / rect.width);
                                }}
                            >
                                <div className="bg-white h-full rounded-full relative overflow-hidden" style={{ width: `${playback.duration > 0 ? (playback.progress / playback.duration) * 100 : 0}%` }}>
                                    <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-white to-transparent opacity-50" />
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ left: `${playback.duration > 0 ? (playback.progress / playback.duration) * 100 : 0}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                                <span>{Math.floor(playback.progress / 60)}:{(Math.floor(playback.progress) % 60).toString().padStart(2, '0')}</span>
                                <span>{Math.floor(playback.duration / 60)}:{(Math.floor(playback.duration) % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-10 w-full">
                            <button onClick={() => playback.setShuffle(!playback.shuffle)} className={`transition-all ${playback.shuffle ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'}`}><Shuffle size={18} /></button>
                            <div className="flex items-center gap-6">
                                <button onClick={playback.prev} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipBack size={32} strokeWidth={1.5} /></button>
                                <button onClick={playback.togglePlay} className="w-16 h-16 bg-white/90 text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] backdrop-blur-md">
                                    {playback.isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
                                </button>
                                <button onClick={playback.next} className="text-white hover:scale-110 transition-transform drop-shadow-md"><SkipForward size={32} strokeWidth={1.5} /></button>
                            </div>
                            <button onClick={() => playback.setRepeat(playback.repeat === 'one' ? 'none' : playback.repeat === 'all' ? 'one' : 'all')} className={`transition-all ${playback.repeat !== 'none' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'text-white/40 hover:text-white'}`}><Repeat size={18} /></button>
                        </div>
                    </div>

                    {/* Left Down: Audio Tags (Fixed Placement) */}
                    <div className="absolute bottom-0 left-0">
                        {(() => {
                            const norm = quality?.toLowerCase().trim() || '320';
                            let q = '320';
                            if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
                            else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
                            const info = qualityTooltips[q] || qualityTooltips['320'];

                            return (
                                <div className="flex flex-col items-start gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-help group">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${q === 'hires' || q === 'flac' ? 'text-white' : 'text-white/70'}`}>
                                        {(q === 'hires' || q === 'flac') && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />}
                                        {info.title}
                                    </div>
                                    <div className="text-[10px] text-white/40 font-mono group-hover:text-white/60 transition-colors">
                                        {info.desc}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right: Lyrics & Up Next */}
                <div className="w-1/2 h-full flex flex-col gap-6 relative border-l border-white/5 pl-8">

                    {/* RESTORED: Up Next Card - Always Visible at Top */}
                    {nextSong ? (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-white/10 group cursor-pointer flex-shrink-0" onClick={playback.next}>
                            <div className="w-12 h-12 rounded bg-neutral-800 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                                {getArt(nextSong) ? <img src={getArt(nextSong)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <Disc className="text-white/20" size={20} />}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"><SkipForward size={16} className="text-white" /></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Up Next</p>
                                    <span className="text-[9px] text-white/30 font-mono">0:00</span> {/* Placeholder for duration if needed */}
                                </div>
                                <p className="text-sm text-white font-medium truncate">{nextSong.name}</p>
                                <p className="text-[10px] text-white/50 truncate">{nextSong.primaryArtists}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 opacity-50">
                            <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center"><Disc className="text-white/20" size={20} /></div>
                            <p className="text-sm text-white/50 font-medium">End of Playlist</p>
                        </div>
                    )}

                    {showQueue ? (
                        /* Queue List Mode */
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Queue</h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mask-gradient-b">
                                {(playback.queue || []).slice(playback.currentIndex + 1).map((s: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => playback.seekToQueueItem?.(playback.currentIndex + 1 + i)}>
                                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                            <img src={getArt(s)} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/80 group-hover:text-white truncate">{s.name}</p>
                                            <p className="text-[10px] text-white/40 truncate">{s.primaryArtists}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Lyrics Mode (Fixed Focus) */
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden mask-gradient-y scroll-smooth" ref={scrollRef}>
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin opacity-50" size={24} /></div>
                            ) : (
                                <div className="py-[30vh] space-y-6 text-center px-4">
                                    {lyrics.map((line, i) => (
                                        <motion.div
                                            key={i}
                                            initial={false}
                                            animate={{
                                                opacity: i === activeIndex ? 1 : 0.4, // Increased inactive opacity
                                                scale: i === activeIndex ? 1.05 : 0.98,
                                                filter: i === activeIndex ? 'blur(0px)' : 'blur(1px)', // Reduced blur significantly
                                                color: i === activeIndex ? '#ffffff' : '#a0a0a0',
                                            }}
                                            transition={{ duration: 0.3 }}
                                            className={`cursor-pointer transition-colors origin-center`}
                                            onClick={() => playback.seek(line.time / playback.duration)}
                                        >
                                            <p className={`text-xl md:text-3xl font-bold leading-tight tracking-tight ${i === activeIndex ? 'drop-shadow-lg' : ''}`}>
                                                {line.text}
                                            </p>
                                        </motion.div>
                                    ))}
                                    {lyrics.length === 0 && (
                                        <div className="mt-10 px-4">
                                            <p className="whitespace-pre-wrap text-xl md:text-3xl font-bold leading-normal tracking-tight text-white drop-shadow-lg text-center hover:scale-[1.02] transition-transform duration-500 cursor-default select-text">
                                                {plainLyrics || "No lyrics available."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <style jsx>{`
                                .mask-gradient-y { mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); }
                                .mask-gradient-b { mask-image: linear-gradient(to bottom, black 85%, transparent); }
                            `}</style>
                        </div>
                    )}

                    {/* About Artist Footer */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between mt-auto cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                <img src={Art} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">About the Artist</p>
                                <p className="text-sm text-white font-bold">{song.primaryArtists.split(',')[0]}</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                            <ChevronRight size={12} className="text-white/50" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// --- Subcomponents & Helpers ---

function getArt(song: any) {
    if (!song) return '';
    // Handle both new unified format and raw jiosaavn
    let img = song.image || song.art;
    if (Array.isArray(img)) {
        img = img[img.length - 1]?.link || img[0]?.link || '';
    }
    // Force High Quality - Robust Regex
    if (typeof img === 'string') {
        // Replace common low-res patterns with 500x500
        return img
            .replace(/150x150/g, '500x500')
            .replace(/50x50/g, '500x500')
            .replace(/_150\./g, '_500.') // Some providers use _150.jpg
            .replace(/_50\./g, '_500.');
    }
    return img || '';
}

function NavItem({ icon, label, active, colors, onClick }: any) {
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

function Pill({ label, active, colors }: any) {
    return (
        <button
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{
                backgroundColor: active ? colors.accent : 'transparent',
                color: active ? colors.bg : colors.textMuted,
                borderColor: active ? colors.accent : colors.border
            }}
        >{label}</button>
    );
}

function PlaylistItem({ icon, title, subtitle, active, colors, onClick }: any) {
    return (
        <motion.div
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            style={{
                backgroundColor: 'transparent',
                opacity: active ? 1 : 0.7
            }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', opacity: 1 }}
            onClick={onClick}
            transition={spring}
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

function MoodPill({ label, active, onClick, colors }: any) {
    return (
        <motion.button
            onClick={onClick}
            className="px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all"
            style={{
                backgroundColor: active ? '#fff' : 'transparent',
                borderColor: active ? '#fff' : 'rgba(255,255,255,0.2)',
                color: active ? '#000' : 'rgba(255,255,255,0.6)',
            }}
            whileHover={{
                borderColor: '#fff',
                color: active ? '#000' : '#fff'
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
        >
            {label}
        </motion.button>
    );
}

function FeatureCard({ title, subtitle, isNew, colors, image, onClick }: any) {
    // Premium Feature Card with background art and hover effects
    const hasImage = !!image;

    return (
        <motion.div
            className="flex-1 h-48 rounded-xl cursor-pointer relative overflow-hidden group"
            style={{
                backgroundColor: hasImage ? 'transparent' : '#0f0f0f',
                border: hasImage ? 'none' : '1px solid rgba(255,255,255,0.06)'
            }}
            onClick={onClick}
            whileHover={{
                y: -6,
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
            transition={{ duration: 0.2 }}
        >
            {/* Background Image */}
            {hasImage && (
                <>
                    <img
                        src={image}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Clean Dark Overlay */}
                    <div className="absolute inset-0 bg-black/50" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 h-full p-5 flex flex-col justify-end">
                {isNew && (
                    <span
                        className="absolute top-4 left-4 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-md"
                        style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.9)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                        }}
                    >
                        New Release
                    </span>
                )}
                <p
                    className="text-[10px] uppercase tracking-widest mb-1.5 font-medium"
                    style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : colors.textMuted }}
                >
                    {isNew ? 'Album' : 'Daily Mix'}
                </p>
                <p
                    className="text-base font-bold leading-tight"
                    style={{ color: hasImage ? '#fff' : colors.text }}
                >
                    {title}
                </p>
                <p
                    className="text-[11px] mt-1"
                    style={{ color: hasImage ? 'rgba(255,255,255,0.6)' : colors.textMuted }}
                >
                    {subtitle}
                </p>
            </div>

            {/* Play Button on Hover */}
            <motion.div
                className="absolute right-4 bottom-4 w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                style={{
                    backgroundColor: '#ffffff',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)',
                    color: '#000'
                }}
                initial={{ y: 10, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <Play size={18} fill="#fff" color="#fff" />
            </motion.div>
        </motion.div>
    );
}

function TrackRow({ index, track, colors, isPlaying, onPlay }: any) {
    return (
        <motion.div
            className="flex items-center px-4 py-3 rounded-lg cursor-pointer group relative transition-colors"
            style={{ backgroundColor: isPlaying ? 'rgba(29, 185, 84, 0.1)' : 'transparent' }}
            whileHover={{
                backgroundColor: 'rgba(255,255,255,0.04)',
            }}
            onClick={onPlay}
            transition={{ duration: 0.15 }}
        >
            {/* Index / Playing Indicator */}
            <span
                className="w-8 text-xs font-medium text-center"
                style={{ color: isPlaying ? '#ffffff' : colors.textMuted }}
            >
                {isPlaying ? (
                    <div className="flex items-end justify-center gap-[2px] h-4">
                        <motion.div
                            className="w-[3px] bg-white rounded-sm"
                            animate={{ height: ['40%', '100%', '60%', '100%', '40%'] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                        />
                        <motion.div
                            className="w-[3px] bg-[#1DB954] rounded-sm"
                            animate={{ height: ['100%', '40%', '100%', '60%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut', delay: 0.2 }}
                        />
                        <motion.div
                            className="w-[3px] bg-white rounded-sm"
                            animate={{ height: ['60%', '100%', '40%', '100%', '60%'] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut', delay: 0.4 }}
                        />
                    </div>
                ) : (
                    <span className="group-hover:hidden">{index}</span>
                )}
                {!isPlaying && (
                    <Play
                        size={14}
                        className="hidden group-hover:block mx-auto"
                        style={{ color: colors.text }}
                    />
                )}
            </span>

            {/* Album Art Thumbnail */}
            <div
                className="w-12 h-12 rounded-md mr-4 overflow-hidden flex-shrink-0 shadow-lg"
                style={{ backgroundColor: '#1a1a1a' }}
            >
                {track.art ? (
                    <img
                        src={track.art}
                        alt={track.title}
                        className="w-full h-full object-cover"
                    />
                ) : null}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-sm font-medium truncate"
                    style={{ color: isPlaying ? '#ffffff' : colors.text }}
                >
                    {track.title}
                </p>
            </div>

            {/* Artist */}
            <span
                className="w-36 text-xs truncate px-2"
                style={{ color: colors.textMuted }}
            >
                {track.artist}
            </span>

            {/* Quality Badge */}
            {track.quality && (
                <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                        backgroundColor: track.quality === 'flac' || track.quality === 'hires' ? '#10B981' :
                            track.quality === '320' ? '#3B82F6' : '#6B7280',
                        color: '#fff'
                    }}
                >
                    {track.quality === 'hires' ? 'Hi-Res' : track.quality === 'flac' ? 'FLAC' : track.quality}
                </span>
            )}

            {/* Duration */}
            <span
                className="w-14 text-xs text-right"
                style={{ color: colors.textMuted }}
            >
                {track.duration}
            </span>

            {/* Like Button */}
            <Heart
                size={14}
                className="ml-3 cursor-pointer transition-colors hover:scale-110"
                style={{ color: isPlaying ? '#F43F5E' : colors.textMuted }}
                fill={isPlaying ? '#F43F5E' : 'transparent'}
            />
        </motion.div>
    );
}

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    const isMidnight = theme === 'midnight';
    const { playInstantMix, currentSong, currentTrack, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, toggleLike, isLiked, likedSongs, activeMixId, activeMix } = usePlayback();

    const [activeView, setActiveView] = useState('home');
    const [activeTab, setActiveTab] = useState('playlist');
    const [activeMood, setActiveMood] = useState<string | null>(null);

    // MINIMALIST PALETTE (Project Linear)
    const c = {
        bg: '#000000', // PURE BLACK
        surface: '#000000', // No surface differentiation
        card: '#0a0a0a', // Subtle card bg
        cardHover: '#141414',
        text: '#FFFFFF',
        textMuted: '#666666',
        border: 'rgba(255,255,255,0.08)', // Sharp minimal border
        accent: '#FFFFFF', // High contrast accent
        accentSoft: 'rgba(255,255,255,0.08)', // Subtle hover
    };

    const moods = ['Energize', 'Feel Good', 'Relax', 'Workout', 'Sad', 'Party'];

    // Data State
    const [trending, setTrending] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Library State
    const [downloads, setDownloads] = useState<any[]>([]);

    // Playlist State
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Trending
                const trendingSongs = await getTrending();

                // 2. Fetch Charts
                const topCharts = await getTopCharts();

                // 3. Load Recent from HistoryStore
                const history = HistoryStore.getHistory();
                setRecent(history.map(h => ({
                    id: h.track.id,
                    title: h.track.song.name,
                    artist: h.track.song.primaryArtists,
                    art: getArt(h.track.song),
                    original: h.track
                })));

                // 4. Load Downloads
                const downloadedSongs = await OfflineStore.getAllDownloadedSongs();
                setDownloads(downloadedSongs.map(s => ({
                    id: s.id,
                    title: s.name,
                    artist: s.primaryArtists,
                    art: getArt(s),
                    original: { song: s, sources: [] } // Minimal PlayableTrack wrapper
                })));

                setTrending(trendingSongs.slice(0, 10)); // Top 10 trending

                // Map charts to feature cards - filtered for playlists/charts
                const usefulCharts = topCharts
                    .filter((c: any) => c.image) // Must have image
                    .slice(0, 3) // Take top 3
                    .map((c: any) => ({
                        id: c.id,
                        title: c.title || c.name,
                        subtitle: c.subtitle || `${c.language || 'Global'} • ${c.type}`,
                        image: c.image || c.image?.[2]?.link,
                        isNew: c.isNew || false
                    }));

                setCharts(usefulCharts);
            } catch (e) {
                console.error("Discovery Load Failed:", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Listen for history updates
        const onHistoryUpdate = () => {
            const history = HistoryStore.getHistory();
            setRecent(history.map(h => ({
                id: h.track.id,
                title: h.track.song.name,
                artist: h.track.song.primaryArtists,
                art: getArt(h.track.song),
                original: h.track
            })));
        };

        window.addEventListener('melora-history-update', onHistoryUpdate);

        // Load playlists
        setPlaylists(PlaylistStore.getPlaylists());
        const onPlaylistUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener('melora-playlists-update', onPlaylistUpdate);

        return () => {
            window.removeEventListener('melora-history-update', onHistoryUpdate);
            window.removeEventListener('melora-playlists-update', onPlaylistUpdate);
        };
    }, []);



    const handlePlay = (song: any, allSongs: any[] = []) => {
        if (!song) return;

        let songList: any[] = [];
        let startIndex = 0;

        if (allSongs.length > 0) {
            // Contextual Play (Playlist/Album/Charts) - Use the provided list
            songList = allSongs;
            startIndex = songList.findIndex(s => s.id === song.id);
        } else {
            // Single Song Play (Search) - Build from History (Session Tape)
            // Get last 40 songs from history to create a seamless "Recent Timeline"
            const history = HistoryStore.getHistory().slice(0, 40).reverse().map(h => h.track);

            // Remove the target song from history if it exists (to avoid duplicate at end)
            const cleanHistory = history.filter(h => h.id !== song.id);

            songList = [...cleanHistory, song];
            startIndex = songList.length - 1;
        }

        const newMix: Mix = {
            id: 'discovery-mix', // Persistent Session ID
            title: "Discovery Mix",
            color: 'blue',
            songs: songList,
            currentSongIndex: startIndex >= 0 ? startIndex : 0
        };

        playInstantMix(newMix);
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setActiveView('search');

        try {
            const results = await searchUnified(query);
            // Map to UI format
            const mapped = results.map(item => ({
                id: item.id,
                title: item.song.name,
                artist: item.song.primaryArtists,
                duration: item.song.duration ? Math.floor(item.song.duration / 60) + ':' + (item.song.duration % 60).toString().padStart(2, '0') : '--:--',
                art: getArt(item.song),
                // Keep original item for playback
                original: item
            }));
            setSearchResults(mapped);
        } catch (e) {
            console.error("Search Failed:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            performSearch(e.currentTarget.value);
        }
    };

    const renderContent = () => {
        switch (activeView) {
            case 'search':
                return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search Input at Top */}
                        <div className="p-4 border-b" style={{ borderColor: c.border }}>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: c.card }}>
                                <Search size={18} style={{ color: c.textMuted }} />
                                <input
                                    type="text"
                                    placeholder="Search songs, artists, albums..."
                                    className="bg-transparent border-none outline-none text-sm w-full"
                                    style={{ color: c.text }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-xs opacity-50 hover:opacity-100">Clear</button>
                                )}
                            </div>
                        </div>
                        {isSearching ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                <WaveLoader />
                                <p className="text-sm opacity-50">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h2 className="text-xl font-bold">Top Results</h2>
                                    <span className="text-xs opacity-50">{searchResults.length} songs</span>
                                </div>
                                {searchResults.map((item, i) => {
                                    const quality = item.original?.sources?.[0]?.quality || item.original?.preferredQuality || '320';
                                    return (
                                        <TrackRow
                                            key={item.id}
                                            index={i + 1}
                                            track={{
                                                ...item,
                                                quality // Pass quality for badge
                                            }}
                                            colors={c}
                                            isPlaying={currentSong?.id === item.id && isPlaying}
                                            onPlay={() => handlePlay(item.original, searchResults.map(r => r.original))}
                                        />
                                    );
                                })}
                            </div>
                        ) : searchQuery ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">No results found</h2>
                                    <p className="text-sm mt-2">Try a different search term.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">Search Melora</h2>
                                    <p className="text-sm mt-2">Find songs from JioSaavn, HiFi, and more.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'explore':
                const genres = [
                    { id: 'pop', name: 'Pop', color: '#EC4899', icon: '🎤' },
                    { id: 'hiphop', name: 'Hip Hop', color: '#F59E0B', icon: '🔥' },
                    { id: 'rock', name: 'Rock', color: '#EF4444', icon: '🎸' },
                    { id: 'electronic', name: 'Electronic', color: '#8B5CF6', icon: '🎧' },
                    { id: 'rnb', name: 'R&B', color: '#6366F1', icon: '💜' },
                    { id: 'classical', name: 'Classical', color: '#10B981', icon: '🎻' },
                    { id: 'jazz', name: 'Jazz', color: '#14B8A6', icon: '🎷' },
                    { id: 'indie', name: 'Indie', color: '#F97316', icon: '🌻' },
                ];

                const exploreGenre = async (genre: any) => {
                    const results = await searchUnified(genre.name, 'song');
                    if (results.length > 0) {
                        const mix: Mix = {
                            id: `genre-${genre.id}`,
                            title: `${genre.name} Mix`,
                            color: 'purple',
                            songs: results,
                            currentSongIndex: 0
                        };
                        playInstantMix(mix);
                    } else {
                        alert(`No songs found for ${genre.name}`);
                    }
                };

                return (
                    <div className="flex-1 px-8 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold mb-2">Explore</h1>
                            <p className="text-white/50">Discover new sounds, moods, and trending hits.</p>
                        </div>

                        {/* Moods Section - Circular */}
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Vibe Check</h2>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                                {genres.map(genre => (
                                    <motion.div
                                        key={genre.id}
                                        className="min-w-[100px] h-[140px] rounded-full flex flex-col items-center gap-3 cursor-pointer group"
                                        whileHover={{ y: -5 }}
                                        onClick={() => exploreGenre(genre)}
                                    >
                                        <div
                                            className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-4xl shadow-xl transition-transform group-hover:scale-110 border-2 border-transparent group-hover:border-white/20"
                                            style={{ backgroundColor: genre.color }}
                                        >
                                            <span className="group-hover:scale-125 transition-transform duration-300">{genre.icon}</span>
                                        </div>
                                        <span className="text-xs font-bold font-mono tracking-widest uppercase text-white/60 group-hover:text-white transition-colors">{genre.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Featured Global Grid */}
                        <div className="mb-10">
                            <h2 className="text-lg font-bold mb-5">Trending Globally</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {trending.slice(0, 8).map((song, i) => (
                                    <motion.div
                                        key={song.id || i}
                                        className="bg-white/5 hover:bg-white/10 rounded-2xl p-3 flex gap-4 cursor-pointer group transition-colors shadow-lg border border-white/5"
                                        onClick={() => handlePlay(song, trending)}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="w-20 h-20 rounded-xl overflow-hidden relative flex-shrink-0">
                                            <img src={getArt(song)} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play size={20} fill="white" className="text-white" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0">
                                            <h3 className="font-bold truncate text-white mb-1 group-hover:text-white transition-colors">{song.name}</h3>
                                            <p className="text-xs text-white/50 truncate mb-2">{song.primaryArtists}</p>
                                            <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/40 self-start group-hover:bg-white/20 transition-colors">#{i + 1} Trending</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Top Charts Banner */}
                        <h2 className="text-lg font-bold mb-5">Charts</h2>
                        <div className="grid grid-cols-2 gap-6 relative">
                            {charts.slice(0, 2).map((chart, i) => (
                                <div key={chart.id} className="h-48 rounded-[32px] overflow-hidden relative group cursor-pointer" onClick={() => handlePlay(trending[0], trending)}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10" />
                                    <img src={chart.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 z-20 p-8 flex flex-col justify-center items-start">
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white mb-2">Top 50</span>
                                        <h3 className="text-3xl font-black text-white max-w-[200px] leading-none mb-4">{chart.title}</h3>
                                        <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                                            <Play size={18} fill="black" className="ml-0.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'library':
                return (
                    <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        <h2 className="text-xl font-bold mb-4 px-2 flex items-center gap-2">
                            <Download size={20} />
                            Downloads
                        </h2>
                        {downloads.length === 0 ? (
                            <div className="text-center opacity-50 py-10">
                                <Heart size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No downloaded songs yet.</p>
                            </div>
                        ) : (
                            downloads.map((item, i) => (
                                <TrackRow
                                    key={item.id}
                                    index={i + 1}
                                    track={item}
                                    colors={c}
                                    isPlaying={false}
                                    onPlay={() => handlePlay(item.original, downloads.map(d => d.original))}
                                />
                            ))
                        )}
                    </div>
                );
            case 'home':
            default:
                return (
                    <>
                        {/* Header: Search + Mood Pills */}
                        <header className="p-4 flex items-center gap-6" style={{ backgroundColor: 'transparent' }}>
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border flex-1 max-w-md transition-colors" style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)' }}>
                                <Search size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type="text"
                                    placeholder="Search songs, artists, albums..."
                                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-white/30"
                                    style={{ color: '#fff' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                />
                            </div>
                            <div className="flex gap-2">
                                {moods.map(mood => (
                                    <MoodPill key={mood} label={mood} active={activeMood === mood.toLowerCase().replace(' ', '')} onClick={() => setActiveMood(mood.toLowerCase().replace(' ', ''))} colors={c} />
                                ))}
                            </div>
                        </header>

                        {/* === HERO SECTION === */}
                        {loading ? (
                            <div className="mx-4 mb-5 h-48 rounded-2xl bg-gray-800 animate-pulse" />
                        ) : trending[0] ? (
                            <div className="relative mx-4 mb-5 h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-2xl">
                                {/* Blurred Background */}
                                <img
                                    src={getArt(trending[0])}
                                    alt="Featured"
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                                />
                                {/* Gradient Overlay - REMOVED, SHARP IMAGE */}
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                {/* Content */}
                                <div className="relative z-10 h-full flex items-center p-8 gap-8">
                                    {/* Album Art */}
                                    <motion.div
                                        className="w-40 h-40 rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-shrink-0"
                                        whileHover={{ scale: 1.05, rotate: 2 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <img
                                            src={getArt(trending[0])}
                                            alt={trending[0].name}
                                            className="w-full h-full object-cover"
                                        />
                                    </motion.div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col items-start gap-2">
                                        <motion.span
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/20 backdrop-blur-md text-white/90"
                                        >
                                            Trending Now
                                        </motion.span>
                                        <motion.h2
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-5xl font-black text-white leading-tight drop-shadow-2xl line-clamp-1"
                                        >
                                            {trending[0].name}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-lg text-white/80 font-medium mb-4 line-clamp-1"
                                        >
                                            {trending[0].primaryArtists} <span className="opacity-50 mx-2">•</span> {trending[0].year || '2024'}
                                        </motion.p>

                                        <div className="flex gap-3">
                                            <motion.button
                                                className="h-12 px-8 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-white/20"
                                                style={{ backgroundColor: '#ffffff', color: '#000' }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    if (currentSong?.id === trending[0].id && isPlaying) {
                                                        togglePlay();
                                                    } else {
                                                        handlePlay(trending[0], trending);
                                                    }
                                                }}
                                            >
                                                {currentSong?.id === trending[0].id && isPlaying ? (
                                                    <><Pause size={18} fill="#fff" /> PAUSE</>
                                                ) : (
                                                    <><Play size={18} fill="#fff" /> PLAY NOW</>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md text-white hover:bg-white/10"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Heart size={20} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Hero - Sexy Aesthetic */
                            <div className="relative mx-4 mb-5 h-72 rounded-[32px] overflow-hidden group cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
                                <img src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50 group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                <div className="relative z-10 h-full flex flex-col justify-end p-10 items-start">
                                    <div className="absolute top-8 right-8 w-16 h-16 rounded-full border border-white/20 flex items-center justify-center animate-spin-slow opacity-50">
                                        <Disc size={32} className="text-white" />
                                    </div>
                                    <h1 className="text-6xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">FEEL THE<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">RHYTHM</span></h1>
                                    <p className="text-lg text-white/80 mb-8 font-medium tracking-wide max-w-md">Your daily mix of energy and soul. Curated just for you.</p>
                                    <button className="px-10 py-4 bg-white text-black text-sm font-bold tracking-[0.2em] uppercase rounded-full hover:scale-105 hover:bg-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2">
                                        <Play size={16} fill="black" /> Start Listening
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Featured Cards Row */}
                        <div className="px-4 flex gap-4 mb-5">
                            {charts.map((chart) => (
                                <FeatureCard
                                    key={chart.id}
                                    title={chart.title}
                                    subtitle={chart.subtitle}
                                    colors={c}
                                    image={chart.image}
                                    isNew={chart.id === 'chart2'}
                                />
                            ))}
                        </div>



                        {/* Track List - Using Real Trending Data */}
                        <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">

                            {loading ? (
                                // Loading skeletons
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center px-3 py-2.5 gap-3 animate-pulse">
                                        <div className="w-8 h-4 rounded bg-gray-700" />
                                        <div className="w-10 h-10 rounded-lg bg-gray-700" />
                                        <div className="flex-1 h-4 rounded bg-gray-700" />
                                        <div className="w-20 h-4 rounded bg-gray-700" />
                                    </div>
                                ))
                            ) : trending.length > 0 ? (
                                trending.slice(0, 10).map((song, i) => {
                                    const trackData = {
                                        id: song.id,
                                        title: song.name,
                                        artist: song.primaryArtists,
                                        duration: song.duration ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0') : '--:--',
                                        art: getArt(song)
                                    };
                                    return (
                                        <TrackRow
                                            key={song.id}
                                            index={i + 1}
                                            track={trackData}
                                            colors={c}
                                            isPlaying={currentSong?.id === song.id && isPlaying}
                                            onPlay={() => handlePlay(song, trending)}
                                        />
                                    );
                                })
                            ) : (
                                <p className="text-center text-sm opacity-50 mt-8">No trending songs available</p>
                            )}
                        </div>
                    </>
                );
            case 'now-playing': // New Layout
                return currentSong ? (
                    <NowPlayingOverlay
                        song={currentSong}
                        nextSong={(activeMix?.songs || [])[(activeMix?.currentSongIndex || 0) + 1]}
                        quality={currentTrack?.preferredQuality || '320'}
                        onClose={() => setActiveView('home')}
                        playback={{
                            isPlaying, togglePlay, next, prev,
                            progress, duration, seek,
                            shuffle, setShuffle, repeat, setRepeat,
                            toggleLike, isLiked: (id: string) => likedSongs.some(s => s.id === id)
                        }}
                    />
                ) : <div className="flex-1 flex items-center justify-center text-white/50">No song playing</div>;
            case 'library':
                return (
                    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                        <h1 className="text-3xl font-bold mb-6">Your Library</h1>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {playlists.map(pl => (
                                <div key={pl.id} className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer" onClick={() => {
                                    playInstantMix({
                                        id: pl.id,
                                        title: pl.name,
                                        color: 'blue',
                                        songs: pl.tracks,
                                        currentSongIndex: 0
                                    });
                                }}>
                                    <div className="w-full aspect-square bg-neutral-800 rounded-lg mb-3 flex items-center justify-center">
                                        {pl.tracks[0] ? <img src={getArt(pl.tracks[0])} className="w-full h-full object-cover rounded-lg" /> : <Library size={32} className="text-white/20" />}
                                    </div>
                                    <p className="font-bold truncate">{pl.name}</p>
                                    <p className="text-xs text-white/50">{pl.tracks.length} songs</p>
                                </div>
                            ))}
                            <div className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer flex flex-col items-center justify-center border border-dashed border-white/20" onClick={() => {
                                const name = prompt("New Playlist Name");
                                if (name) PlaylistStore.createPlaylist(name);
                            }}>
                                <Plus size={32} className="text-white/50 mb-2" />
                                <p className="font-bold text-sm">New Playlist</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500 relative" style={{ backgroundColor: '#000', color: c.text }}>

            {/* === AMBIENT BACKGROUND GLOWS REMOVED === */}

            {/* === TOP SECTION (Sidebar + Main + Right Panel) === */}
            <div className="flex-1 flex overflow-hidden z-10 relative">

                {/* --- LEFT SIDEBAR (GLASS) --- */}
                <aside
                    className="w-60 flex-shrink-0 flex flex-col border-r p-5 transition-colors"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    {/* Logo */}
                    <div className="flex items-center mb-8 pl-1">
                        <span className="text-2xl font-bold tracking-tighter uppercase font-display text-white">Melora Tunes</span>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-1">
                        <NavItem icon={<Home size={20} />} label="Home" active={activeView === 'home'} colors={c} onClick={() => setActiveView('home')} />
                        <NavItem icon={<Search size={20} />} label="Search" active={activeView === 'search'} colors={c} onClick={() => setActiveView('search')} />
                        <NavItem icon={<Compass size={20} />} label="Explore" active={activeView === 'explore'} colors={c} onClick={() => setActiveView('explore')} />

                        <div className="my-2 border-t border-white/5" />
                        <NavItem icon={<Library size={20} />} label="Library" active={activeView === 'library'} colors={c} onClick={() => setActiveView('library')} />
                    </nav>

                    <div className="mt-8 mb-3 flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: c.textMuted }}>Library</span>
                        <Plus
                            size={14}
                            style={{ color: c.textMuted }}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => {
                                const name = prompt('Playlist name:');
                                if (name?.trim()) {
                                    PlaylistStore.createPlaylist(name.trim());
                                }
                            }}
                        />
                    </div>



                    {/* Playlist List */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden mask-gradient-b">
                        <PlaylistItem
                            icon={<Heart size={14} />}
                            title="Liked Songs"
                            subtitle={`${likedSongs?.length || 0} songs`}
                            colors={c}
                            active={activeMixId === 'liked-songs'}
                            onClick={() => {
                                if (likedSongs && likedSongs.length > 0) {
                                    const mix: Mix = {
                                        id: 'liked-songs',
                                        title: 'Liked Songs',
                                        color: 'pink',
                                        songs: likedSongs.map(s => ensurePlayableTrack(s)),
                                        currentSongIndex: 0
                                    };
                                    playInstantMix(mix);
                                }
                            }}
                        />
                        {playlists.map(pl => (
                            <PlaylistItem
                                key={pl.id}
                                title={pl.name}
                                subtitle={`${pl.tracks.length} songs`}
                                colors={c}
                                active={activeMixId === pl.id}
                                onClick={() => {
                                    if (pl.tracks.length > 0) {
                                        const mix: Mix = {
                                            id: pl.id,
                                            title: pl.name,
                                            color: 'blue',
                                            songs: pl.tracks,
                                            currentSongIndex: 0
                                        };
                                        playInstantMix(mix);
                                    }
                                }}
                            />
                        ))}
                        {playlists.length === 0 && (
                            <p className="text-[10px] text-center opacity-50 mt-4">No playlists yet</p>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <div className="pt-4 mt-2 border-t flex justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity" style={{ borderColor: c.border }}>
                        <button onClick={() => onThemeChange('midnight')} className={`w-4 h-4 rounded-full bg-black border ${theme === 'midnight' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border-gray-600'}`} />
                        <button onClick={() => onThemeChange('polar')} className={`w-4 h-4 rounded-full bg-white border ${theme === 'polar' ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'border-gray-300'}`} />
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {renderContent()}
                </main>

                {/* --- RIGHT PANEL (Recent Played - GLASS) --- */}
                <aside
                    className="w-64 flex-shrink-0 border-l p-4 flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold">Recent Played</span>
                        <span className="text-[10px] cursor-pointer hover:underline font-medium" style={{ color: c.textMuted }}>See All</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {recent.length === 0 && (
                            <p className="text-xs text-center opacity-50 mt-4">No recent songs</p>
                        )}
                        {recent.slice(0, 20).map(item => (
                            <motion.div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer group relative"
                                style={{ backgroundColor: 'transparent' }}
                                whileHover={{
                                    backgroundColor: c.accentSoft,
                                    x: 2
                                }}
                                onClick={() => handlePlay(item.original)}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                                {/* Album Art with Play Overlay */}
                                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                    {item.art ? (
                                        <img
                                            src={item.art}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full" style={{ backgroundColor: c.border }} />
                                    )}
                                    {/* Play overlay on hover */}
                                    <motion.div
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Play size={16} fill="#fff" color="#fff" />
                                    </motion.div>
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{item.title}</p>
                                    <p className="text-[10px] truncate" style={{ color: c.textMuted }}>{item.artist}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Downloads / Offline Card */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                                    <Download size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-white group-hover:text-white transition-colors">Downloads</p>
                                    <p className="text-[10px] text-white/50 font-mono tracking-wider">OFFLINE</p>
                                </div>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-white w-3/4 rounded-full opacity-50" />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* === BOTTOM PLAYER BAR === */}
            {/* === FLOATING GLASS PLAYER === */}
            {activeView !== 'now-playing' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="pointer-events-auto h-20 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex items-center px-2 pr-8 gap-4 overflow-visible"
                        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                    >
                        {/* Art & Info */}
                        <div className="flex items-center gap-4 w-1/3">
                            <div className="w-16 h-16 rounded-full overflow-hidden relative group flex-shrink-0 border border-white/5 ml-1">
                                {currentSong && getArt(currentSong) ? (
                                    <img src={getArt(currentSong)} alt={currentSong.name} className="w-full h-full object-cover animate-[spin_10s_linear_infinite]" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center"><Disc className="opacity-20" /></div>
                                )}
                                {/* Center Dot for Vinyl Look */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full bg-black/80 backdrop-blur-sm" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-white truncate cursor-pointer hover:underline" onClick={() => setActiveView('now-playing')}>{currentSong?.name || 'Not Playing'}</p>
                                    {/* Quality Badge - Use currentTrack for accurate streaming quality */}
                                    {currentSong && <QualityBadge quality={currentTrack?.preferredQuality || '320'} />}
                                </div>
                                <p className="text-xs text-white/50 truncate hover:text-white transition-colors cursor-pointer">{currentSong?.primaryArtists || 'Select a song'}</p>
                            </div>
                        </div>

                        {/* Controls (Center) */}
                        <div className="flex flex-col items-center justify-center gap-1 flex-1">
                            <div className="flex items-center gap-6">
                                <SkipBack size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={prev} />

                                {/* White Play Button */}
                                <motion.button
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-shadow"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={togglePlay}
                                >
                                    {isPlaying ? <Pause size={20} fill="black" className="text-black" /> : <Play size={20} fill="black" className="text-black ml-0.5" />}
                                </motion.button>

                                <SkipForward size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={next} />
                            </div>

                            {/* Progress Bar - Enhanced */}
                            <div className="w-72 flex items-center gap-2 group">
                                <span className="text-[9px] text-white/50 font-mono w-7 text-right">{Math.floor(progress / 60)}:{(Math.floor(progress) % 60).toString().padStart(2, '0')}</span>
                                <div
                                    className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden group-hover:h-2 transition-all"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pct = (e.clientX - rect.left) / rect.width;
                                        seek(pct);
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-white origin-left transform transition-transform" style={{ transform: `scaleX(${duration > 0 ? progress / duration : 0})` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${duration > 0 ? (progress / duration) * 100 : 0}%`, transform: 'translateX(-50%) translateY(-50%)' }} />
                                </div>
                                <span className="text-[9px] text-white/50 font-mono w-7">{Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Volume (Right) */}
                        <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
                            <div className="flex items-center gap-2 group">
                                <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/60 hover:text-white transition-colors">
                                    {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                                </button>
                                <div
                                    className="w-20 h-1 bg-white/10 rounded-full cursor-pointer relative"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const vol = (e.clientX - rect.left) / rect.width;
                                        setVolume(Math.max(0, Math.min(1, vol)));
                                    }}
                                >
                                    <div className="h-full bg-white rounded-full relative" style={{ width: `${volume * 100}%` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveView('now-playing')} className="p-2 ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                <Maximize2 size={18} />
                            </button>
                            {currentSong && (
                                <Heart
                                    size={18}
                                    className={`cursor-pointer transition-all ${isLiked(currentSong.id) ? 'text-[#e91e63] fill-[#e91e63]' : 'text-white/40 hover:text-white'}`}
                                    onClick={() => toggleLike(currentSong)}
                                />
                            )}
                            <MoreHorizontal size={18} className="text-white/40 hover:text-white cursor-pointer" />
                        </div>
                    </motion.div>
                </div>
            )}
            {/* End of Floating Player */}
        </div>
    );
}




