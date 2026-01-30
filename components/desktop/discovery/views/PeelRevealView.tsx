"use client";

import React, { useState, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ChevronRight, Play, Disc3, ArrowLeft } from "lucide-react";
import { JioSaavnSong, getAlbumDetails } from "@/lib/jiosaavn";
import { usePlayback } from "@/components/providers/playback-context";
import { decodeHtml } from "@/lib/utils";

interface PeelRevealViewProps {
    album: JioSaavnSong;
    onBack: () => void;
    onPlay: (song: JioSaavnSong) => void;
}

export function PeelRevealView({ album, onBack, onPlay }: PeelRevealViewProps) {
    const [phase, setPhase] = useState<'sealed' | 'opened'>('sealed');
    const [tracks, setTracks] = useState<JioSaavnSong[]>([]);
    const [loading, setLoading] = useState(true);
    const { playInstantMix, isPlaying, currentSong } = usePlayback();

    const dragX = useMotionValue(0);
    const cdControls = useAnimation();
    const layoutControls = useAnimation();

    const sleeveWidth = 280; // Smaller sleeve
    const dragRange = [0, sleeveWidth];

    const peelClip = useTransform(dragX, dragRange, ["inset(0% 0% 0% 0%)", "inset(0% 0% 0% 100%)"]);
    const stripOpacity = useTransform(dragX, [sleeveWidth - 50, sleeveWidth], [1, 0]);
    const shineRotate = useTransform(dragX, dragRange, [0, 90]);
    const zipperY = useTransform(dragX, (x) => Math.sin(x / 5) * 2);

    useEffect(() => {
        loadTracks();
    }, [album.id]);

    const loadTracks = async () => {
        setLoading(true);
        try {
            const data = await getAlbumDetails(album.id);
            setTracks(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event: any, info: PanInfo) => {
        if (info.offset.x > 100) {
            setPhase('opened');
            cdControls.start({ x: 120, rotate: 360, transition: { type: "spring", stiffness: 60, damping: 12, mass: 1.2 } });
            layoutControls.start({ scale: 0.75, y: -20, transition: { duration: 0.6, ease: "circOut" } });
        }
    };

    const playAll = () => {
        if (tracks.length > 0) {
            playInstantMix({ id: `album-${album.id}`, title: album.name, color: 'blue', songs: tracks, currentSongIndex: 0 });
        }
    };

    const getArt = () => {
        if (!album.image) return '';
        if (typeof album.image === 'string') return album.image;
        if (Array.isArray(album.image)) return album.image.find(i => i.quality === '500x500')?.link || album.image[album.image.length - 1]?.link || '';
        return '';
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-black text-white">

            {/* BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center opacity-60 scale-125 blur-[90px] saturate-[1.6]" style={{ backgroundImage: `url(${getArt()})` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />
            </div>

            {/* HEADER (Compact) */}
            <div className="relative z-50 flex items-center justify-between px-4 py-3">
                <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all active:scale-95">
                    <ArrowLeft size={20} className="text-white/80" />
                </button>
                {phase !== 'opened' && (
                    <button onClick={() => { setPhase('opened'); cdControls.start({ x: 120, rotate: 360 }); layoutControls.start({ scale: 0.75, y: -20 }); }} className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80">
                        Skip
                    </button>
                )}
            </div>

            {/* SCROLLABLE CONTENT (Tight Vertical Layout) */}
            <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide">
                <div className="min-h-full flex flex-col items-center pt-2 pb-20">

                    {/* ALBUM PACKAGE (Smaller) */}
                    <motion.div animate={layoutControls} className="relative flex flex-col items-center flex-shrink-0">
                        <div className="relative" style={{ width: 340, height: sleeveWidth }}>

                            {/* CD (Realistic Silver) */}
                            <motion.div animate={cdControls} className="absolute top-0 left-[30px]" style={{ width: sleeveWidth, height: sleeveWidth, zIndex: 5 }}>
                                <div className="w-full h-full rounded-full relative shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#c0c0c0,#e8e8e8,#a0a0a0,#e8e8e8,#c0c0c0)] rounded-full" />
                                    <div className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay" style={{ background: `conic-gradient(from 0deg, transparent 0%, #ff0000 10%, #00ff00 20%, #0000ff 30%, transparent 40%)` }} />
                                    <div className="absolute inset-0 rounded-full opacity-30" style={{ background: 'repeating-radial-gradient(transparent 0, transparent 1.5px, #000 2px)' }} />
                                    <div className="absolute top-[35%] left-[35%] width-[30%] height-[30%] rounded-full overflow-hidden border-2 border-neutral-300/20 shadow-inner">
                                        <img src={getArt()} className="w-[84px] h-[84px] object-cover" />
                                    </div>
                                    <div className="absolute top-[46%] left-[46%] w-5 h-5 bg-black rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.4)]" />
                                </div>
                            </motion.div>

                            {/* SLEEVE */}
                            <div className="absolute top-0 left-[30px] rounded-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-10 overflow-hidden" style={{ width: sleeveWidth, height: sleeveWidth }}>
                                <img src={getArt()} alt={album.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none" />
                            </div>

                            {/* PLASTIC WRAP & STRIP */}
                            <motion.div className="absolute top-0 left-[30px] rounded-md overflow-hidden pointer-events-none" style={{ width: sleeveWidth, height: sleeveWidth, zIndex: 20, clipPath: peelClip }}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 opacity-60" />
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-12 bg-black/20 backdrop-blur-[1px] border-y border-white/20 flex items-center overflow-hidden">
                                    <div className="flex gap-6 animate-marquee whitespace-nowrap opacity-60">
                                        {Array(10).fill("PEEL TO OPEN  •  ").map((t, i) => <span key={i} className="text-[8px] font-mono tracking-[0.2em] text-white font-bold">{t}</span>)}
                                    </div>
                                </div>
                            </motion.div>

                            {/* DRAG TAB */}
                            {phase === 'sealed' && (
                                <motion.div drag="x" dragConstraints={{ left: 0, right: sleeveWidth }} dragElastic={0.05} dragMomentum={false} onDragEnd={handleDragEnd} style={{ x: dragX, y: zipperY, zIndex: 30, opacity: stripOpacity }} className="absolute top-1/2 -translate-y-1/2 left-[10px] cursor-grab active:cursor-grabbing">
                                    <div className="w-12 h-12 rounded-full bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center hover:scale-110 transition-transform">
                                        <ChevronRight size={24} strokeWidth={3} />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* TITLE (Tight) */}
                        <motion.div className="text-center mt-4 mb-4 px-4 max-w-md" animate={{ opacity: phase === 'opened' ? 0 : 1, y: phase === 'opened' ? 20 : 0, height: phase === 'opened' ? 0 : 'auto' }}>
                            <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">{decodeHtml(album.name)}</h2>
                            <p className="text-white/60 mt-1 text-base">{decodeHtml(album.primaryArtists || '')}</p>
                        </motion.div>
                    </motion.div>

                    {/* TRACKLIST (Appears immediately below) */}
                    {phase === 'opened' && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 20, delay: 0.1 }} className="w-full max-w-3xl px-4 mt-2">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button onClick={playAll} className="px-8 py-3 rounded-full bg-white text-black font-bold tracking-wide shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                                    <Play fill="currentColor" size={20} /> PLAY ALBUM
                                </button>
                            </div>
                            <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-1 shadow-xl">
                                {tracks.map((track, i) => {
                                    const isActive = currentSong?.id === track.id;
                                    return (
                                        <motion.div key={track.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                            onClick={() => playInstantMix({ id: `album-${album.id}`, title: album.name, color: 'blue', songs: tracks, currentSongIndex: i })}
                                            className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                            <span className={`w-6 text-center font-mono text-xs ${isActive ? 'text-white font-bold' : 'text-white/40'}`}>{isActive && isPlaying ? <Disc3 className="animate-spin" size={14} /> : i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-medium truncate ${isActive ? 'text-white font-bold' : 'text-white'}`}>{decodeHtml(track.name)}</h4>
                                                <p className="text-white/40 text-xs truncate">{decodeHtml(track.primaryArtists)}</p>
                                            </div>
                                            <span className="text-white/30 text-xs font-mono">{Math.floor(parseInt(String(track.duration)) / 60)}:{(parseInt(String(track.duration)) % 60).toString().padStart(2, '0')}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
            <style jsx global>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 20s linear infinite; }`}</style>
        </div>
    );
}
