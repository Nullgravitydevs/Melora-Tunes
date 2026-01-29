"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Copy, Check, Link2, QrCode } from "lucide-react";
import { useState } from "react";
import { Mix } from "@/components/providers/playback-context";
import { decodeHtml } from "@/lib/utils";

interface ShareMixModalProps {
    isOpen: boolean;
    onClose: () => void;
    mix: Mix | null;
}

export function ShareMixModal({ isOpen, onClose, mix }: ShareMixModalProps) {
    const [copied, setCopied] = useState(false);
    const [shareType, setShareType] = useState<'link' | 'qr'>('link');

    if (!isOpen || !mix) return null;

    // Create shareable URL with mix data encoded
    const shareData = {
        id: mix.id,
        title: mix.title,
        songs: mix.songs.map((s: any) => ({
            id: s.song?.id || s.id,
            name: s.song?.name || s.name,
            artists: s.song?.primaryArtists || s.primaryArtists
        }))
    };

    const encodedData = encodeURIComponent(btoa(JSON.stringify(shareData)));
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share?mix=${encodedData}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${mix.title} - Melora Mix`,
                    text: `Check out my mixtape "${mix.title}" with ${mix.songs.length} songs!`,
                    url: shareUrl
                });
            } catch (err) {
                console.error('Failed to share:', err);
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl w-[450px] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <Share2 className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Share Mix</h2>
                                    <p className="text-xs text-zinc-500">{decodeHtml(mix.title)}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Mix Preview */}
                            <div className="bg-zinc-800/50 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    {(mix.songs[0] as any).song?.image || (mix.songs[0] as any).image ? (
                                        <img
                                            src={((mix.songs[0] as any).song?.image?.[2]?.link || (mix.songs[0] as any).song?.image?.[0]?.link) || ((mix.songs[0] as any).image?.[2]?.link || (mix.songs[0] as any).image?.[0]?.link)}
                                            alt={mix.title}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                    ) : null}
                                    <div>
                                        <p className="font-medium text-white">{decodeHtml(mix.title)}</p>
                                        <p className="text-xs text-zinc-400">{mix.songs.length} songs</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {mix.songs.slice(0, 5).map((s, i) => (
                                        <span key={`${s.id}-${i}`} className="text-[10px] px-2 py-0.5 bg-zinc-700 rounded text-zinc-300">
                                            {decodeHtml((s as any).song?.name || (s as any).name || "").substring(0, 20)}...
                                        </span>
                                    ))}
                                    {mix.songs.length > 5 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-zinc-700 rounded text-zinc-400">
                                            +{mix.songs.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Share URL */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Share Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <Link2 size={14} className="text-zinc-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={shareUrl}
                                            readOnly
                                            className="bg-transparent text-sm text-zinc-300 w-full outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={copyToClipboard}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${copied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-500 hover:bg-blue-400 text-white'
                                            }`}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Native Share Button (if supported) */}
                            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                                <button
                                    onClick={shareNative}
                                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 size={18} />
                                    Share via...
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
