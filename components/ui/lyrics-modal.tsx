"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

interface LyricsModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: JioSaavnSong | null;
}

export function LyricsModal({ isOpen, onClose, song }: LyricsModalProps) {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isOpen || !song) {
            setLyrics(null);
            setError(false);
            return;
        }

        setLoading(true);
        setError(false);

        // Fetch lyrics from your API
        fetch(`/api/lyrics?id=${song.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.lyrics) {
                    setLyrics(data.lyrics);
                } else {
                    setError(true);
                }
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [isOpen, song]);

    if (!isOpen) return null;

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
                        className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl w-[500px] max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Music2 className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Lyrics</h2>
                                    {song && (
                                        <p className="text-xs text-zinc-500">{decodeHtml(song.name)}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Lyrics Content */}
                        <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="text-purple-500 animate-spin mb-4" size={48} />
                                    <p className="text-zinc-500 font-medium">Loading lyrics...</p>
                                </div>
                            )}

                            {error && !loading && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Music2 className="text-zinc-700 mb-4" size={48} />
                                    <p className="text-zinc-500 font-medium">Lyrics not available</p>
                                    <p className="text-xs text-zinc-600 mt-1">This song doesn't have lyrics yet</p>
                                </div>
                            )}

                            {lyrics && !loading && (
                                <div className="space-y-4">
                                    {song && (
                                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
                                            <img
                                                src={song.image[2]?.link || song.image[0]?.link}
                                                alt={song.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                            <div>
                                                <p className="font-medium text-white">{decodeHtml(song.name)}</p>
                                                <p className="text-sm text-zinc-400">{decodeHtml(song.primaryArtists)}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-white leading-relaxed whitespace-pre-line text-center font-light text-lg">
                                        {decodeHtml(lyrics)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
