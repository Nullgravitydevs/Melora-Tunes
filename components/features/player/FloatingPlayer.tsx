"use client";

import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Mic2 } from 'lucide-react';
import { usePlayback } from '@/components/providers/playback-context';
import { decodeHtml } from '@/lib/utils';
import Image from 'next/image';import { useAudioProgress } from "@/hooks/use-audio-progress";


interface FloatingPlayerProps {
    onExpandClick?: () => void;
    onLyricsClick?: () => void;
    className?: string;
    theme?: 'glass' | 'dark' | 'light';
}

export function FloatingPlayer({
    onExpandClick,
    onLyricsClick,
    className = "",
    theme = 'glass'
}: FloatingPlayerProps) { const { currentSong, isPlaying, togglePlay, next, prev, duration, volume, setVolume, seek, activeQuality } = usePlayback();
    const { progress } = useAudioProgress();

    if (!currentSong) return null;

    const imageUrl = currentSong.image?.find((img: any) => img.quality === '500x500')?.link
        || currentSong.image?.[0]?.link
        || '';

    // Use activeQuality as single source of truth (DO NOT infer from _quality or source)
    const quality = activeQuality;

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTime = progress * duration;

    const themeClasses = {
        glass: 'bg-black/60 backdrop-blur-xl border border-white/10',
        dark: 'bg-gray-900 border border-gray-800',
        light: 'bg-white border border-gray-200 text-gray-900'
    };

    return (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl rounded-2xl shadow-2xl z-50 ${themeClasses[theme]} ${className}`}>
            <div className="p-3 flex items-center gap-4">
                {/* Album Art */}
                <div
                    className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    onClick={onExpandClick}
                >
                    {imageUrl && (
                        <Image
                            src={imageUrl}
                            alt={currentSong.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpandClick}>
                    <p className="font-medium text-white truncate">{decodeHtml(currentSong.name)}</p>
                    <p className="text-xs text-gray-400 truncate">
                        {decodeHtml(currentSong.primaryArtists || '')}
                    </p>
                </div>

                {/* Quality Badge - Only show if activeQuality is set */}
                {quality && (
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${quality === 'hires' ? 'bg-amber-500 text-black' :
                                quality === 'flac' ? 'bg-white/90 text-black' :
                                    'bg-green-500/80 text-white'
                            }`}>
                            {quality === 'hires' ? 'HI-RES' : quality === 'flac' ? 'LOSSLESS' : 'HQ'}
                        </span>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button onClick={prev} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <SkipBack size={18} />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="p-3 bg-white rounded-full text-black hover:scale-105 transition-transform"
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                    <button onClick={next} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <SkipForward size={18} />
                    </button>
                </div>

                {/* Progress */}
                <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-400 w-40">
                    <span className="w-8 text-right">{formatTime(currentTime)}</span>
                    <div
                        className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            seek((e.clientX - rect.left) / rect.width);
                        }}
                    >
                        <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <span className="w-8">{formatTime(duration)}</span>
                </div>

                {/* Volume */}
                <div className="hidden lg:flex items-center gap-2 w-24">
                    <Volume2 size={14} className="text-gray-400" />
                    <div
                        className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setVolume((e.clientX - rect.left) / rect.width);
                        }}
                    >
                        <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${volume * 100}%` }}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                    {onLyricsClick && (
                        <button
                            onClick={onLyricsClick}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Lyrics"
                        >
                            <Mic2 size={16} />
                        </button>
                    )}
                    {onExpandClick && (
                        <button
                            onClick={onExpandClick}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Full Screen"
                        >
                            <Maximize2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
