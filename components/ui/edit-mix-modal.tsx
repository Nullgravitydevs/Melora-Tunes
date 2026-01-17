"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ArrowUp, ArrowDown, Save, Share2 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

import { Mix } from "@/components/providers/playback-context";

interface EditMixModalProps {
    isOpen: boolean;
    onClose: () => void;
    mix: Mix | null;
    onUpdateMix: (updatedMix: Mix) => void;
    onShareMix?: (mix: Mix) => void;
    onDeleteMix?: (mixId: string) => void;
}

export function EditMixModal({ isOpen, onClose, mix, onUpdateMix, onShareMix, onDeleteMix }: EditMixModalProps) {
    const [editedSongs, setEditedSongs] = useState<JioSaavnSong[]>([]);
    const [editedTitle, setEditedTitle] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (mix && isOpen) {
            setEditedSongs(mix.songs);
            setEditedTitle(mix.title);
        }
        // Reset delete confirmation when modal opens
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
            onUpdateMix({
                ...mix,
                title: editedTitle,
                songs: editedSongs
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

    if (!isOpen || !mix) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/90 backdrop-blur-md p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-white/10"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div className="flex-1">
                                <input
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="text-2xl font-bold text-white bg-transparent border-b border-white/20 focus:border-cyan-400 outline-none w-full pb-1"
                                    placeholder="Mixtape Name"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className="p-2 text-cyan-400 hover:bg-white/10 rounded-full transition-colors"
                                    title="Share Mixtape"
                                >
                                    <Share2 size={20} />
                                </button>
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-6">
                            {editedSongs.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 italic">
                                    No songs in this mix yet.
                                </div>
                            ) : (
                                editedSongs.map((song, index) => (
                                    <div
                                        key={`${song.id}-${index}`}
                                        className="flex items-center justify-between bg-white/5 p-3 rounded border border-white/5 hover:border-white/20 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="font-bold text-sm truncate text-gray-200">{decodeHtml(song.name)}</p>
                                            <p className="text-xs text-gray-400 truncate">{decodeHtml(song.primaryArtists)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                className="p-1 text-gray-500 hover:text-cyan-400 disabled:opacity-30 transition-colors"
                                                title="Move Up"
                                            >
                                                <ArrowUp size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === editedSongs.length - 1}
                                                className="p-1 text-gray-500 hover:text-cyan-400 disabled:opacity-30 transition-colors"
                                                title="Move Down"
                                            >
                                                <ArrowDown size={18} />
                                            </button>
                                            <div className="w-px h-6 bg-white/10 mx-1" />
                                            <button
                                                onClick={() => handleDelete(index)}
                                                className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                                title="Remove Song"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-green-500/20"
                                >
                                    <Save size={20} /> SAVE CHANGES
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 bg-white/10 text-white rounded font-bold hover:bg-white/20 transition-colors"
                                >
                                    CANCEL
                                </button>
                            </div>
                            {onDeleteMix && (
                                <div className="border-t border-white/10 pt-3 mt-3">
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={handleDeleteClick}
                                            className="w-full text-red-500 hover:text-red-400 text-sm font-bold py-2 hover:bg-red-500/10 rounded transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} /> DELETE MIXTAPE
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <p className="text-sm text-center text-gray-400 font-semibold">Are you sure you want to delete this mixtape?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleDeleteClick}
                                                    className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition-colors"
                                                >
                                                    YES, DELETE
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="flex-1 bg-white/10 text-white py-2 rounded font-bold hover:bg-white/20 transition-colors"
                                                >
                                                    CANCEL
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
