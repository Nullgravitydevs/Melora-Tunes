"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Music, Play, Plus, ArrowLeft, Download } from "lucide-react";

interface SharedSong {
    id: string;
    name: string;
    artists: string;
}

interface SharedMix {
    id: string;
    title: string;
    songs: SharedSong[];
}

function SharePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [sharedMix, setSharedMix] = useState<SharedMix | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const mixData = searchParams.get('mix');
        if (!mixData) {
            setError('No mix data found');
            return;
        }

        try {
            const decoded = JSON.parse(atob(decodeURIComponent(mixData)));
            setSharedMix(decoded);
        } catch (err) {
            console.error('Failed to decode mix:', err);
            setError('Invalid mix data');
        }
    }, [searchParams]);

    const handleImport = () => {
        if (!sharedMix) return;
        // Store in localStorage for the main app to pick up
        localStorage.setItem('melora-import-mix', JSON.stringify(sharedMix));
        router.push('/');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-4">
                <div className="text-center">
                    <Music className="text-zinc-700 mx-auto mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
                    <p className="text-zinc-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 transition-all"
                    >
                        Go to Melora
                    </button>
                </div>
            </div>
        );
    }

    if (!sharedMix) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                <div className="animate-pulse text-zinc-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-4 mb-8"
                >
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Shared Mix</h1>
                        <p className="text-zinc-500">Someone shared a mixtape with you!</p>
                    </div>
                </motion.div>

                {/* Mix Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden"
                >
                    {/* Mix Header */}
                    <div className="p-6 border-b border-zinc-700">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                                <Music className="text-white" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{sharedMix.title}</h2>
                                <p className="text-zinc-400">{sharedMix.songs.length} songs</p>
                            </div>
                        </div>
                    </div>

                    {/* Song List */}
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                        {sharedMix.songs.map((song, index) => (
                            <div
                                key={song.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors"
                            >
                                <span className="text-sm text-zinc-500 w-6">{index + 1}</span>
                                <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center">
                                    <Music size={16} className="text-zinc-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white truncate">{song.name}</p>
                                    <p className="text-sm text-zinc-500 truncate">{song.artists}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-zinc-700 flex gap-3">
                        <button
                            onClick={handleImport}
                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                            <Download size={18} />
                            Add to My Library
                        </button>
                    </div>
                </motion.div>

                {/* Branding */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-8"
                >
                    <p className="text-zinc-500 text-sm">
                        Powered by <span className="text-white font-semibold">Melora</span>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                <div className="animate-pulse text-zinc-500">Loading...</div>
            </div>
        }>
            <SharePageContent />
        </Suspense>
    );
}
