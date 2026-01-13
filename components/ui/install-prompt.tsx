"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Check if user has dismissed before
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        // Just collapse if expanded, or fully dismiss if user wants to close
        if (isExpanded) {
            setIsExpanded(false);
        } else {
            localStorage.setItem('pwa-install-dismissed', 'true');
            setShowPrompt(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                layout
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="fixed bottom-6 left-6 z-50"
            >
                {!isExpanded ? (
                    <motion.button
                        layoutId="install-container"
                        onClick={() => setIsExpanded(true)}
                        className="w-14 h-14 bg-black border-2 border-white rounded-full p-2 shadow-2xl flex items-center justify-center hover:scale-105 transition-transform group"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <div className="w-full h-full bg-white rounded-full p-0.5 flex items-center justify-center overflow-hidden border-2 border-black">
                            <img src="/install-icon.png" alt="Install" className="w-full h-full object-cover" />
                        </div>
                    </motion.button>
                ) : (
                    <motion.div
                        layoutId="install-container"
                        className="bg-black border-2 border-white rounded-2xl p-4 shadow-2xl flex flex-col gap-4 w-64"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full p-1 flex items-center justify-center overflow-hidden">
                                    <img src="/install-icon.png" alt="Install" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white text-sm uppercase tracking-wider">Melora</span>
                                    <span className="text-[10px] text-gray-400 font-mono">App Available</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="text-gray-300 text-xs font-mono leading-relaxed">
                            Install for the best full-screen experience and offline playback.
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="flex-1 bg-white text-black py-2 rounded font-bold text-xs hover:bg-gray-200 transition-colors uppercase tracking-wide"
                            >
                                Install App
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem('pwa-install-dismissed', 'true');
                                    setShowPrompt(false);
                                }}
                                className="px-3 border border-gray-700 text-gray-400 rounded font-bold text-xs hover:text-white hover:border-white transition-colors uppercase"
                            >
                                Never
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
