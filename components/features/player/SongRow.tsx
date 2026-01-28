"use client";

import { Heart, MoreVertical, Play, Pause } from 'lucide-react';
import { JioSaavnSong } from '@/lib/jiosaavn';
import { decodeHtml } from '@/lib/utils';
import Image from 'next/image';

interface SongRowProps {
    song: JioSaavnSong;
    index?: number;
    isPlaying?: boolean;
    isCurrentSong?: boolean;
    isLiked?: boolean;
    showIndex?: boolean;
    // NOTE: Quality badges removed. Quality is shown ONLY in player (activeQuality).
    showDuration?: boolean;
    onClick?: () => void;
    onLikeToggle?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
}

// NOTE: getQualityBadge removed. Quality badges are shown ONLY in the player via activeQuality.
// Song lists, search results, and queues do NOT display quality.

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function SongRow({
    song,
    index,
    isPlaying = false,
    isCurrentSong = false,
    isLiked = false,
    showIndex = true,
    showDuration = true,
    onClick,
    onLikeToggle,
    onContextMenu,
    className = ""
}: SongRowProps) {
    const imageUrl = song.image?.find((img: any) => img.quality === '500x500')?.link
        || song.image?.[0]?.link
        || '';

    const duration = typeof song.duration === 'string' ? parseInt(song.duration) : song.duration;

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${isCurrentSong ? 'bg-white/10' : ''
                } ${className}`}
        >
            {/* Index or Play Icon */}
            {showIndex && (
                <div className="w-6 text-center text-sm text-gray-500 group-hover:hidden">
                    {index !== undefined ? index + 1 : ''}
                </div>
            )}
            {showIndex && (
                <div className="w-6 hidden group-hover:flex items-center justify-center">
                    {isCurrentSong && isPlaying ? (
                        <Pause size={14} className="text-white" />
                    ) : (
                        <Play size={14} className="text-white" />
                    )}
                </div>
            )}

            {/* Album Art */}
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                {imageUrl && (
                    <Image
                        src={imageUrl}
                        alt={song.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Song Info */}
            <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isCurrentSong ? 'text-green-400' : 'text-white'}`}>
                    {decodeHtml(song.name)}
                </p>
                <p className="text-xs text-gray-400 truncate">
                    {decodeHtml(song.primaryArtists || '')}
                </p>
            </div>

            {/* Quality Badge REMOVED - quality is shown only in player via activeQuality */}

            {/* Duration */}
            {showDuration && duration > 0 && (
                <span className="text-xs text-gray-500 w-10 text-right">
                    {formatDuration(duration)}
                </span>
            )}

            {/* Like Button */}
            {onLikeToggle && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onLikeToggle();
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${isLiked ? 'text-red-500 opacity-100' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
            )}

            {/* More Menu */}
            {onContextMenu && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                >
                    <MoreVertical size={16} />
                </button>
            )}
        </div>
    );
}
