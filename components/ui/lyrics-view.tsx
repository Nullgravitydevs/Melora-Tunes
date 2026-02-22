import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLyrics, LyricLine } from '@/hooks/useLyrics';
import { JioSaavnSong } from '@/lib/jiosaavn';
import { usePlayback } from '@/components/providers/playback-context';

interface LyricsViewProps {
    currentSong: JioSaavnSong | undefined;
    currentTime: number; // Current playback time in seconds
    onClose: () => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({ currentSong, currentTime, onClose }) => {
    const { lyrics, plainLyrics, isSynced, isLoading, error, offset, setOffset } = useLyrics(currentSong);
    const { seek, duration } = usePlayback();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    // Find active line
    useEffect(() => {
        if (!isSynced || lyrics.length === 0) return;

        const adjustedTime = currentTime - offset;
        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return adjustedTime >= line.time && (!nextLine || adjustedTime < nextLine.time);
        });

        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
        }
    }, [currentTime, lyrics, isSynced]);

    // Auto-scroll to active line
    useEffect(() => {
        if (activeIndex !== -1 && scrollRef.current) {
            const activeEl = scrollRef.current.children[activeIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
    }, [activeIndex]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-black/80 backdrop-blur-xl rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">{currentSong?.name || "No Song Playing"}</h2>
                <div className="flex items-center justify-center gap-4">
                    <p className="text-white/60 text-sm">{currentSong?.primaryArtists}</p>
                    {isSynced && (
                        <div className="flex items-center gap-2 bg-white/5 opacity-50 hover:opacity-100 transition-opacity px-3 py-1 rounded-full border border-white/10">
                            <span className="text-[9px] text-white/60 font-bold tracking-widest uppercase">Sync</span>
                            <input
                                type="range" min="-5" max="5" step="0.1"
                                value={offset} onChange={e => setOffset(parseFloat(e.target.value))}
                                className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white font-mono tabular-nums w-8 text-right">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="w-full max-w-2xl h-full overflow-y-auto no-scrollbar mask-gradient" ref={scrollRef}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-400">
                        {error}
                    </div>
                ) : isSynced ? (
                    <div className="flex flex-col gap-6 py-[50vh]">
                        {lyrics.map((line, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: i === activeIndex ? 1 : 0.3,
                                    scale: i === activeIndex ? 1.05 : 1,
                                    y: 0,
                                    filter: i === activeIndex ? 'blur(0px)' : 'blur(0.5px)'
                                }}
                                className={`text-2xl md:text-4xl font-bold text-center transition-all duration-300 cursor-pointer ${i === activeIndex ? 'text-white' : 'text-white/40'
                                    }`}
                                onClick={() => {
                                    seek(line.time / (duration || 1));
                                }}
                            >
                                {line.text}
                            </motion.p>
                        ))}
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap text-center text-xl text-white/80 leading-loose">
                        {plainLyrics || "No lyrics found."}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .mask-gradient {
                    mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
                }
            `}</style>
        </motion.div>
    );
};
