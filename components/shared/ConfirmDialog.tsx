"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
    open: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

export function ConfirmDialog({
    open,
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = true,
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-neutral-950 border border-white/10 rounded-2xl p-6 max-w-sm w-[90%] shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-white text-sm mb-6">{message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="px-5 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => { onConfirm(); onCancel(); }}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                                    destructive
                                        ? "bg-white text-black hover:bg-white/90"
                                        : "bg-white text-black hover:bg-white/90"
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
