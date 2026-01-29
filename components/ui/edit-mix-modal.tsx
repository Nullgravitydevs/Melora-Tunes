"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ArrowUp, ArrowDown, Save, Share2 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

import { Mix } from "@/components/providers/playback-context";
import { PlayableTrack, isPlayableTrack } from "@/lib/types";

interface EditMixModalProps {
    isOpen: boolean;
    onClose: () => void;
    mix: Mix | null;
    onUpdateMix: (updatedMix: Mix) => void;
    onShareMix?: (mix: Mix) => void;
    onDeleteMix?: (mixId: string) => void;
}

export function EditMixModal({ isOpen, onClose, mix, onUpdateMix, onShareMix, onDeleteMix }: EditMixModalProps) {
    const [editedSongs, setEditedSongs] = useState<(JioSaavnSong | PlayableTrack)[]>([]);
    const [editedTitle, setEditedTitle] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (mix && isOpen) {
            setEditedSongs(mix.songs);
            setEditedTitle(mix.title);
        }
        setShowDeleteConfirm(false);
    }, [isOpen, mix?.id]);

    const handleDelete = (index: number) => {
        const newSongs = [...editedSongs];
        newSongs.splice(index, 1);
        setEditedSongs(newSongs);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newSongs = [...editedSongs];
        [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
        setEditedSongs(newSongs);
    };

    const handleMoveDown = (index: number) => {
        if (index === editedSongs.length - 1) return;
        const newSongs = [...editedSongs];
        [newSongs[index + 1], newSongs[index]] = [newSongs[index], newSongs[index + 1]];
        setEditedSongs(newSongs);
    };

    const handleSave = () => {
        if (mix) {
            // Rule 5: Defensive Deduplication (Within Mix)
            // Ensure no duplicate IDs exist before saving.
            // We use a Map to keep the *first* occurrence or last? 
            // Usually first occurrence is preferred order.
            const uniqueSongs: (JioSaavnSong | PlayableTrack)[] = [];
            const seenIds = new Set<string>();

            for (const s of editedSongs) {
                // Strict Asset Deduplication: Check ID + Quality
                const id = 'id' in s ? s.id : (s as any).id;
                const quality = isPlayableTrack(s) ? s.preferredQuality : '320';
                const assetId = `${id}_${quality}`;

                if (!seenIds.has(assetId)) {
                    seenIds.add(assetId);
                    uniqueSongs.push(s);
                }
            }

            if (uniqueSongs.length < editedSongs.length) {
                // If we removed something, maybe warn? or just silent fix?
                // Spec says "Remove duplicate track.id within same mix". Silent is fine/better UX than error.
            }

            onUpdateMix({
                ...mix,
                title: editedTitle,
                songs: uniqueSongs
            });
            onClose();
        }
    };

    const handleShare = () => {
        if (mix && onShareMix) {
            onShareMix({ ...mix, songs: editedSongs });
        }
    };

    const handleDeleteClick = () => {
        if (mix && onDeleteMix && showDeleteConfirm) {
            onDeleteMix(mix.id);
            setShowDeleteConfirm(false);
        } else {
            setShowDeleteConfirm(true);
        }
    };

    const getQualityBadge = (item: any) => {
        let quality = item._quality; // Legacy support
        if (isPlayableTrack(item)) {
            quality = item.preferredQuality;
        }

        if (!quality) return null;

        let colorClass = "bg-zinc-800 text-zinc-400";
        if (quality === "hires" || quality === "HI_RES_LOSSLESS") {
            quality = "Hi-Res";
            colorClass = "bg-yellow-500/20 text-yellow-300 border border-yellow-500/20";
        } else if (quality === "flac" || quality === "LOSSLESS") {
            quality = "FLAC";
            colorClass = "bg-purple-500/20 text-purple-300 border border-purple-500/20";
        } else if (quality === "320") {
            quality = "320kbps";
            colorClass = "bg-blue-500/20 text-blue-300 border border-blue-500/20";
        } else if (quality === "160") {
            quality = "160kbps";
            colorClass = "bg-green-500/20 text-green-300 border border-green-500/20";
        }

        return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-2 ${colorClass}`}>
                {quality}
            </span>
        );
    };

    if (!isOpen || !mix) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/90 p-8 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-zinc-800 ring-1 ring-white/5"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8 pb-4 border-b border-zinc-800">
                            <div className="flex-1 mr-4">
                                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Mixtape Title</label>
                                <input
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="text-3xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full placeholder:text-zinc-700"
                                    placeholder="Untitled Mix"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all border border-transparent hover:border-zinc-700"
                                    title="Share Mixtape"
                                >
                                    <Share2 size={18} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all border border-transparent hover:border-zinc-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Song List */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-1 mb-8">
                            {editedSongs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-xl">
                                    <p className="text-sm font-medium">Empty Mixtape</p>
                                    <p className="text-xs mt-1">Add songs from search</p>
                                </div>
                            ) : (
                                editedSongs.map((item, index) => {
                                    const song = isPlayableTrack(item) ? item.song : item;
                                    return (
                                        <div
                                            key={`${song?.id || 'unknown'}-${index}`}
                                            className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800/50"
                                        >
                                            <div className="flex items-center flex-1 min-w-0 mr-4">
                                                <span className="text-xs font-mono text-zinc-600 w-6 text-right mr-4 opacity-50">{index + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center">
                                                        <p className="font-medium text-sm truncate text-zinc-200">{decodeHtml(song?.name || "")}</p>
                                                        {getQualityBadge(item)}
                                                    </div>
                                                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{decodeHtml(song?.primaryArtists || "")}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-zinc-600 hover:text-white disabled:opacity-0 transition-colors"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === editedSongs.length - 1}
                                                    className="p-1.5 text-zinc-600 hover:text-white disabled:opacity-0 transition-colors"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                                <div className="w-px h-3 bg-zinc-800 mx-1" />
                                                <button
                                                    onClick={() => handleDelete(index)}
                                                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                                                    title="Remove Song"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-zinc-900">
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-white text-black py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm tracking-wide"
                                >
                                    <Save size={16} /> SAVE CHANGES
                                </button>

                                {onDeleteMix && !showDeleteConfirm && (
                                    <button
                                        onClick={handleDeleteClick}
                                        className="px-4 py-3 bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-zinc-900/80 rounded-lg font-bold transition-colors text-sm border border-zinc-800"
                                        title="Delete Mixtape"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Delete Confirmation */}
                            {showDeleteConfirm && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 bg-red-950/20 border border-red-900/30 rounded-lg p-4"
                                >
                                    <p className="text-xs text-red-400 text-center font-medium mb-3">Delete this mixtape permanently?</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleDeleteClick}
                                            className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition-colors text-xs"
                                        >
                                            CONFIRM DELETE
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 bg-transparent border border-red-900/50 text-red-400 py-2 rounded font-bold hover:bg-red-950/30 transition-colors text-xs"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
