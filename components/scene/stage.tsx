"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cassette } from "@/components/ui/cassette";
import { DesktopPlayer } from "@/components/ui/desktop-player";
import { SearchModal } from "@/components/ui/search-modal";
import { QueueModal } from "@/components/ui/queue-modal";
import { LyricsModal } from "@/components/ui/lyrics-modal";
import { Plus, Maximize2, Pencil, Camera, Download, Upload, MoreHorizontal, Settings, Smartphone } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import { JioSaavnSong, getSongDetails } from "@/lib/jiosaavn";
import { CinemaModeDesktop } from "./cinema-mode-desktop";
import { EditMixModal } from "@/components/ui/edit-mix-modal";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { DesktopSettingsModal } from "@/components/ui/desktop-settings-modal";
import { useSearchParams, useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { usePlayback, Mix } from "@/components/providers/playback-context";

interface StageProps {
    onSwitchToMobile?: () => void;
}

export function Stage({ onSwitchToMobile }: StageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        setMixes, loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        addMix, updateMix, deleteMix, isLoaded,
        shuffle, setShuffle, repeat, setRepeat
    } = usePlayback();

    // UI State (Local)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTargetMixId, setSearchTargetMixId] = useState<string | null>(null);
    const [newMixTitle, setNewMixTitle] = useState("");
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [editingMix, setEditingMix] = useState<Mix | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

    const playerRef = useRef<HTMLDivElement>(null);
    const { playClick, playClunk, playInsert } = useAudio(); // Keep for UI sounds not covered by playback actions

    const activeMix = mixes.find(m => m.id === activeMixId);

    const addToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Handle Shared Mix URL
    useEffect(() => {
        const sharedMixData = searchParams.get('mix');
        if (sharedMixData && isLoaded) {
            try {
                const decoded = atob(sharedMixData);
                const { title, color, songIds } = JSON.parse(decoded);

                // Check if already imported
                const exists = mixes.some(m => m.title === `${title} (Imported)` && m.songs.length === songIds.length);
                if (exists) {
                    addToast(`Mix "${title}" already imported.`, "success");
                    router.replace('/', { scroll: false });
                    return;
                }

                addToast("Importing shared mix...", "success");

                // Fetch song details
                Promise.all(songIds.map((id: string) => getSongDetails(id)))
                    .then((songs) => {
                        const validSongs = songs.filter((s): s is JioSaavnSong => s !== null);

                        const newMix: Mix = {
                            id: crypto.randomUUID(),
                            title: `${title} (Imported)`,
                            color: color || 'orange',
                            songs: validSongs,
                            currentSongIndex: 0
                        };

                        addMix(newMix);
                        addToast(`Imported mix: ${title}`);

                        // Clear URL param
                        router.replace('/', { scroll: false });
                    })
                    .catch(err => {
                        console.error("Failed to import mix", err);
                        addToast("Failed to import shared mix", "error");
                        router.replace('/', { scroll: false });
                    });

            } catch (e) {
                console.error("Invalid share data", e);
                addToast("Invalid share link", "error");
            }
        }
    }, [searchParams, isLoaded, mixes, router, addMix]); // Added missing deps

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or if modal is open
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                isModalOpen ||
                isSearchOpen ||
                isCinemaMode ||
                editingMix
            ) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (activeMixId) {
                        togglePlay();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (duration > 0) {
                        const newTime = Math.min(progress + 0.05, 1);
                        seek(newTime);
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (duration > 0) {
                        const newTime = Math.max(progress - 0.05, 0);
                        seek(newTime);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(Math.min(volume + 0.1, 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(Math.max(volume - 0.1, 0));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeMixId, isModalOpen, isSearchOpen, isCinemaMode, editingMix, progress, duration, volume, togglePlay, seek, setVolume]);


    const handleSeek = (amount: number) => {
        seek(amount);
    };

    // Keep mixesRef for drag handler closure if needed, but context `loadMix` is stable enough usually.
    // Actually framer-motion drag handlers might capture stale state if not careful.
    // The `mixes` array changes. `handleDragEnd` depends on `mixes` if we lookup by ID.
    // Let's use `mixes` directly in dependency array.

    const handleDragEnd = useCallback((event: any, info: any, id?: string) => {
        if (playerRef.current && id) {
            const playerRect = playerRef.current.getBoundingClientRect();
            const dropPoint = info.point;

            if (
                dropPoint.x >= playerRect.left &&
                dropPoint.x <= playerRect.right &&
                dropPoint.y >= playerRect.top &&
                dropPoint.y <= playerRect.bottom
            ) {
                // Determine if we need to glitch
                // Only glitch if swapping mixes
                if (activeMixId !== id) {
                    // playInsert(); // loadMix handles this now
                    // Glitch removed

                    loadMix(id);
                }
            }
        }
    }, [activeMixId, loadMix]);


    const createMix = () => {
        if (!newMixTitle.trim()) return;
        if (mixes.length >= 10) {
            addToast("Max limit reached (10 cassettes)", "error");
            return;
        }
        playClick();
        const colors: Mix["color"][] = ["orange", "purple", "white", "green", "red"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newMix: Mix = {
            id: crypto.randomUUID(), // Changed from Date.now to UUID context convention
            title: newMixTitle,
            color: randomColor,
            songs: [],
            currentSongIndex: 0
        };

        addMix(newMix);
        setNewMixTitle("");
        setIsModalOpen(false);
        // Do we auto-select? Original Code: setActiveMixId(newMix.id); setIsSearchOpen(true);
        // This implies we select it for Editing/Adding songs, NOT necessarilly playing.
        // But context only has `activeMixId` (the playing one).
        // Open search to add songs to the new mix
        // Don't auto-load the mix - let user insert it manually
        setSearchTargetMixId(newMix.id);
        setIsSearchOpen(true);
        addToast(`Created mix: ${newMixTitle}`);
    };

    const handleAddSong = (song: JioSaavnSong) => {
        const targetMixId = searchTargetMixId || activeMixId;
        if (targetMixId) {
            // We need to fetch current mix to append
            const current = mixes.find(m => m.id === targetMixId);
            if (current) {
                updateMix(targetMixId, { songs: [...current.songs, song] });
                playClick();
                addToast(`Added "${song.name}" to mix`);
            }
        }
    };

    const handleUpdateMix = (updatedMix: Mix) => {
        updateMix(updatedMix.id, updatedMix);
        addToast("Mixtape updated successfully!");
    };

    const handleShareMix = (mix: Mix) => {
        const songIds = mix.songs.map(s => s.id);
        const shareData = {
            title: mix.title,
            color: mix.color,
            songIds: songIds
        };

        const encoded = btoa(JSON.stringify(shareData));
        const url = `${window.location.origin}?mix=${encoded}`;

        navigator.clipboard.writeText(url).then(() => {
            addToast("Share link copied to clipboard!");
        });
    };

    const handleDeleteMix = (mixId: string) => {
        deleteMix(mixId);
        setEditingMix(null);
        addToast("Mixtape deleted");
    };

    // Removed handleNext, handlePrev, handlePlayPause -> use context directly

    const [snapshotTarget, setSnapshotTarget] = useState<Mix | null>(null);

    const handleShareSnapshot = async () => {
        // ... (Keep existing snapshot logic, but use 'activeMix' instead of 'currentCassette')
        // Actually the Player uses currentCassette.
        // We will refer to activeMix.
        const element = document.getElementById("cassette-player-node");
        if (!element) return;

        try {
            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                backgroundColor: 'transparent'
            });

            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `Melora-Mix-${activeMix?.title || "Tape"}.png`;
            link.click();

            const text = encodeURIComponent(`Check out my mix on Melora! 📼🎶\n\n${window.location.href}`);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");

            addToast("Snapshot downloaded! Attach it to your tweet! 📸");
        } catch (err) {
            console.error("Snapshot failed", err);
            addToast("Failed to create snapshot", "error");
        }
    };

    const handleLibrarySnapshot = async (mix: Mix) => {
        setSnapshotTarget(mix);
        setTimeout(async () => {
            const element = document.getElementById("snapshot-studio-node");
            if (!element) return;
            try {
                const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: 'transparent' });
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `Melora-Mix-${mix.title}.png`;
                link.click();
                const text = encodeURIComponent(`Check out my mix "${mix.title}" on Melora! 📼🎶\n\n${window.location.href}`);
                window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
                addToast("Snapshot downloaded! 📸");
            } catch (err) {
                console.error("Library snapshot failed", err);
                addToast("Failed to snapshot mix", "error");
            } finally {
                setSnapshotTarget(null);
            }
        }, 500);
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mixes));
        const downloadAnchorNode = document.createElement('a');
        if (downloadAnchorNode) {
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "melora-backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        addToast("Mixtapes exported successfully!");
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (Keep import logic but use setMixes from context or addMix loop)
        // Since setMixes is available, we can keep the logic mostly same.
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedMixes = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedMixes)) {
                    // Validation logic ...
                    const validMixes = importedMixes.filter(m => {
                        const hasBasicProps = m.id && typeof m.title === 'string' && Array.isArray(m.songs);
                        if (!hasBasicProps) return false;
                        return m.songs.every((s: any) => s.id && typeof s.name === 'string' && typeof s.url === 'string'); // simplified check
                    }).map((m: any) => ({ ...m, title: m.title.slice(0, 50) }));

                    if (validMixes.length === 0) {
                        addToast("No valid mixtapes found", "error");
                        return;
                    }

                    // Context doesn't have a bulk 'addMixes' or 'setMixes' (it has setMixes but we need to merge)
                    // We can use setMixes from context.
                    // But we need to check limits.
                    // Copy the merged logic:

                    const currentMixes = mixes; // from context
                    const existingIds = new Set(currentMixes.map(m => m.id));
                    const uniqueNewMixes = validMixes.filter((m: Mix) => !existingIds.has(m.id));

                    const availableSlots = 10 - currentMixes.length;
                    if (availableSlots <= 0) {
                        addToast("Library full!", "error");
                        return;
                    }

                    const toAdd = uniqueNewMixes.slice(0, availableSlots);
                    setMixes([...currentMixes, ...toAdd]);
                    addToast(`Imported ${toAdd.length} mixtapes!`);
                }
            } catch (err) {
                console.error("Import failed", err);
                addToast("Failed to parse file", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleToggleFavorite = (song: JioSaavnSong) => {
        // Redo logic using context updateMix or specialized handling
        // Favorites ID = 'favorites'
        const favMix = mixes.find(m => m.id === 'favorites');
        if (!favMix) {
            const newFav: Mix = {
                id: 'favorites',
                title: 'Favorites ❤️',
                color: 'red',
                songs: [song],
                currentSongIndex: 0
            };
            addMix(newFav); // Helper adds to end? We usually want favorites at top. context addMix adds to end.
            // Maybe fine.
            addToast("Added to Favorites ❤️");
        } else {
            const exists = favMix.songs.some(s => s.id === song.id);
            const newSongs = exists
                ? favMix.songs.filter(s => s.id !== song.id)
                : [...favMix.songs, song];

            updateMix('favorites', { songs: newSongs });
            addToast(exists ? "Removed from Favorites" : "Added to Favorites ❤️");
        }
    };


    return (
        <div ref={containerRef} className="min-h-screen w-full bg-retro-black relative overflow-hidden p-2 md:p-8 flex flex-col items-center">
            <AnimatePresence>
                {isCinemaMode && (
                    <CinemaModeDesktop
                        isOpen={isCinemaMode}
                        onClose={() => {
                            setIsCinemaMode(false);
                            if (document.fullscreenElement) document.exitFullscreen().catch(err => console.error(err));
                        }}
                        currentSong={currentSong || null}
                        isPlaying={isPlaying}
                        className="fixed inset-0 z-[9999]"
                        showCloseButton={true}
                        onPlayPause={togglePlay}
                        onNext={next}
                        onPrev={prev}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingMix && (
                    <EditMixModal
                        isOpen={!!editingMix}
                        onClose={() => setEditingMix(null)}
                        mix={editingMix}
                        onUpdateMix={handleUpdateMix}
                        onShareMix={handleShareMix}
                        onDeleteMix={handleDeleteMix}
                    />
                )}
            </AnimatePresence>

            {/* Create Mix Modal (Restored) */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-retro-black border border-retro-gray/20 p-8 rounded-lg max-w-md w-full shadow-2xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                            <h2 className="text-2xl font-bold text-white mb-6 font-retro tracking-tight flex items-center gap-2">
                                <Plus size={24} className="text-purple-500" /> NEW MIXTAPE
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-retro-gray text-xs font-bold mb-2 uppercase tracking-widest">Mix Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newMixTitle}
                                        onChange={(e) => setNewMixTitle(e.target.value)}
                                        placeholder="e.g. Summer Vibes '84"
                                        className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-lg"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (!newMixTitle.trim()) return;
                                                // Create new mix
                                                const newMix: Mix = {
                                                    id: Date.now().toString(),
                                                    title: newMixTitle,
                                                    color: (['orange', 'purple', 'green', 'red'] as const)[Math.floor(Math.random() * 4)],
                                                    songs: [],
                                                    currentSongIndex: 0
                                                };
                                                addMix(newMix);
                                                setIsModalOpen(false);
                                                setNewMixTitle("");
                                                addToast(`Created mixtape "${newMix.title}"`);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-retro-gray hover:text-white transition-colors font-bold text-sm tracking-wide"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!newMixTitle.trim()) return;
                                            const newMix: Mix = {
                                                id: Date.now().toString(),
                                                title: newMixTitle,
                                                color: (['orange', 'purple', 'green', 'red'] as const)[Math.floor(Math.random() * 4)],
                                                songs: [],
                                                currentSongIndex: 0
                                            };
                                            addMix(newMix);
                                            setIsModalOpen(false);
                                            setNewMixTitle("");
                                            addToast(`Created mixtape "${newMix.title}"`);
                                        }}
                                        disabled={!newMixTitle.trim()}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm tracking-wide flex items-center gap-2"
                                    >
                                        CREATE CASSETTE
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <DesktopSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <QueueModal
                isOpen={isQueueOpen}
                onClose={() => setIsQueueOpen(false)}
                queue={activeMix?.songs || []}
                currentIndex={activeMix?.currentSongIndex || 0}
            />

            <LyricsModal
                isOpen={isLyricsOpen}
                onClose={() => setIsLyricsOpen(false)}
                song={currentSong || null}
            />

            {
                isSearchOpen && (
                    <SearchModal
                        isOpen={isSearchOpen}
                        onClose={() => setIsSearchOpen(false)}
                        onAddSong={handleAddSong}
                        favorites={new Set((mixes.find(m => m.id === 'favorites')?.songs || []).map(s => s.id))}
                        onToggleFavorite={handleToggleFavorite}
                    />
                )
            }

            {/* Toast Container */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`px-4 py-3 rounded shadow-lg text-white font-bold font-mono text-sm border-l-4 ${toast.type === 'success' ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'
                                }`}
                        >
                            {toast.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Main Content Transformation Wrapper */}
            <div className="w-full flex flex-col items-center origin-top scale-[0.6] sm:scale-75 md:scale-100 transition-transform">
                <header className="w-full max-w-6xl flex justify-between items-center mb-12 z-10 relative pointer-events-none">
                    <motion.div
                        className="flex items-center gap-3 pointer-events-auto cursor-move"
                        drag
                        dragConstraints={containerRef as any}
                        dragMomentum={false}
                    >
                        <img src="/cassette-icon.png" alt="Cassette" className="w-10 h-10 pointer-events-none" />
                        <h1 className="text-4xl font-retro text-retro-white tracking-tighter pointer-events-none">
                            Mel<span className="text-retro-white">ora</span>
                        </h1>
                    </motion.div>

                    <motion.div
                        className="flex gap-4 items-center pointer-events-auto cursor-move"
                        drag
                        dragConstraints={containerRef as any}
                        dragMomentum={false}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Backup & Restore Controls */}
                        <div className="flex gap-2 mr-2">
                            <button
                                onClick={handleExport}
                                className="p-2 text-retro-gray hover:text-retro-white hover:bg-white/10 rounded-full transition-colors"
                                title="Backup Library"
                            >
                                <Download size={20} />
                            </button>
                            <div className="relative">
                                <button
                                    className="p-2 text-retro-gray hover:text-retro-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Restore Library"
                                >
                                    <Upload size={20} />
                                </button>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Restore Library"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                playClick();
                                setIsSettingsOpen(true);
                            }}
                            className="flex items-center gap-2 bg-retro-black border border-retro-gray/50 text-retro-white px-3 py-2 rounded hover:bg-white/10 transition-colors shadow-lg"
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>

                        {onSwitchToMobile && (
                            <button
                                onClick={() => {
                                    playClick();
                                    onSwitchToMobile?.();
                                }}
                                className="flex items-center gap-2 bg-retro-black border border-retro-gray/50 text-retro-white px-3 py-2 rounded hover:bg-white/10 transition-colors shadow-lg"
                                title="Switch to iPod Mode"
                            >
                                <Smartphone size={20} />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setIsCinemaMode(true);
                                document.documentElement.requestFullscreen().catch(err => console.error("Fullscreen failed:", err));
                            }}
                            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-500 transition-colors shadow-lg"
                        >
                            <Maximize2 size={16} /> <span className="hidden md:inline">CINEMA MODE</span>
                        </button>

                        <button
                            onClick={() => {
                                setNewMixTitle(`Mixtape Vol. ${mixes.length + 1}`);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-500 transition-colors shadow-lg"
                        >
                            <Plus size={16} /> <span className="hidden md:inline">CREATE MIX</span>
                        </button>
                    </motion.div>
                </header>

                {/* Player Visual */}
                <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full max-w-6xl flex-1">
                    {/* Mixes Grid */}
                    <div className="flex-1 h-full relative min-h-[400px] w-full">
                        <motion.h2
                            className="text-retro-gray text-xl mb-4 font-retro opacity-50 w-fit cursor-move"
                            drag
                            dragConstraints={containerRef as any}
                            dragMomentum={false}
                        >
                            YOUR MIXTAPES
                        </motion.h2>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            {mixes.map((mix) => {
                                if (mix.id === activeMixId) return null;
                                return (
                                    <motion.div
                                        key={mix.id}
                                        className="relative group cursor-grab active:cursor-grabbing"
                                        drag
                                        dragConstraints={containerRef as any}
                                        dragMomentum={false}
                                        onDragEnd={(e, info) => handleDragEnd(e, info, mix.id)}
                                        whileDrag={{ zIndex: 100, scale: 1.05 }}
                                    >
                                        <Cassette
                                            id={mix.id}
                                            title={mix.title}
                                            color={mix.color}
                                            songCount={mix.songs.length}
                                            className="hover:z-50"
                                            drag={false} // Disable internal drag, let parent wrapper handle it
                                        />
                                        {/* Realistic "Tape Tabs" Actions */}
                                        <div className="absolute -top-3 right-4 flex gap-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 ease-out z-[40]" onPointerDown={(e) => e.stopPropagation()}>

                                            {/* Edit Tab (Yellow Masking Tape) */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingMix(mix); }}
                                                className="relative group/btn flex items-center justify-center w-8 h-10 bg-[#fef3c7] shadow-md border-b-2 border-[#dce0c0] hover:-translate-y-1 transition-transform duration-200 origin-bottom rotate-[-2deg] rounded-t-sm"
                                                title="Edit Mix"
                                            >
                                                <div className="absolute top-0 w-full h-1 bg-black/5 opacity-20"></div> {/* Tape Texture */}
                                                <Pencil size={16} className="text-blue-900 opacity-80" strokeWidth={2.5} />
                                            </button>

                                            {/* Share Tab (White Label) */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleLibrarySnapshot(mix); }}
                                                className="relative group/btn flex items-center justify-center w-8 h-10 bg-[#f4f4f5] shadow-md border-b-2 border-[#d4d4d8] hover:-translate-y-1 transition-transform duration-200 origin-bottom rotate-[1deg] rounded-t-sm"
                                                title="Share Snapshot"
                                            >
                                                <div className="absolute top-0 w-full h-1 bg-black/5 opacity-20"></div>
                                                <Camera size={16} className="text-zinc-800 opacity-80" strokeWidth={2.5} />
                                            </button>

                                            {/* Add Songs Tab (Green Sticker) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSearchTargetMixId(mix.id);
                                                    setIsSearchOpen(true);
                                                }}
                                                className="relative group/btn flex items-center justify-center w-8 h-10 bg-[#dcfce7] shadow-md border-b-2 border-[#bbf7d0] hover:-translate-y-1 transition-transform duration-200 origin-bottom rotate-[-1deg] rounded-t-sm"
                                                title="Add Songs"
                                            >
                                                <div className="absolute top-0 w-full h-1 bg-black/5 opacity-20"></div>
                                                <Plus size={16} className="text-green-900 opacity-80" strokeWidth={3} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-shrink-0 z-20 pointer-events-none">
                        <motion.div
                            ref={playerRef}
                            className="cursor-move pointer-events-auto"
                            drag
                            dragConstraints={containerRef as any}
                            dragMomentum={false}
                        >
                            <motion.div
                                id="cassette-player-node"

                                transition={{ duration: 0.2 }}
                            >
                                <DesktopPlayer
                                    isPlaying={isPlaying}
                                    hasCassette={!!activeMix}
                                    cassetteTitle={activeMix?.title}
                                    cassetteColor={activeMix?.color}
                                    currentSong={currentSong}
                                    onPlayToggle={togglePlay}
                                    onNext={next}
                                    onPrev={prev}
                                    volume={volume}
                                    onVolumeChange={setVolume}
                                    progress={progress}
                                    onSeek={handleSeek}
                                    shuffle={shuffle}
                                    onShuffleToggle={() => setShuffle(!shuffle)}
                                    repeat={repeat}
                                    onRepeatToggle={() => {
                                        const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                                        setRepeat(nextRepeat);
                                    }}
                                    onOpenQueue={() => setIsQueueOpen(true)}
                                    onOpenLyrics={() => setIsLyricsOpen(true)}
                                    className="scale-90 md:scale-100 origin-center"
                                    drag={false} // Disable internal drag, wrapper handles it
                                    onEject={() => {
                                        playClick();
                                        loadMix(""); // Clear active mix
                                    }}
                                />
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

                <div id="snapshot-studio-node" className="absolute top-[-9999px] left-[-9999px] w-[800px] h-[600px] bg-gradient-to-br from-retro-black to-zinc-900 flex items-center justify-center p-12">
                    {snapshotTarget && (
                        <div className="transform scale-150">
                            <Cassette
                                id={snapshotTarget.id}
                                title={snapshotTarget.title}
                                color={snapshotTarget.color}
                                songCount={snapshotTarget.songs.length}
                                className="shadow-2xl"
                            />
                            <div className="mt-8 text-center">
                                <h2 className="text-4xl font-retro text-retro-white mb-2">{snapshotTarget.title}</h2>
                                <p className="text-retro-gray font-mono">MELORA • {snapshotTarget.songs.length} SONGS</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
