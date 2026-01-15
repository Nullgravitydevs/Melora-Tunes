"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cassette } from "@/components/ui/cassette";
import { SearchModal } from "@/components/ui/search-modal";
import { Button } from "@/components/ui/button";
import { Plus, Maximize2, Pencil, Camera, Download, Upload, MoreHorizontal, Settings, Smartphone, Palette } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import { JioSaavnSong, getSongDetails } from "@/lib/jiosaavn";
import { DeckStage } from "./deck-stage";
import { ZenStage } from "./zen-stage";
import { BauhausStage } from "./bauhaus-stage";
import { NordicStage } from "./nordic-stage";
import { OpenDeckStage } from "./opendeck-stage";
import { DesktopPlayer, THEMES, ThemeKey } from "@/components/ui/desktop-player";
import { useSearchParams, useRouter } from "next/navigation";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { DesktopSettingsModal } from "@/components/ui/desktop-settings-modal";
import { EditMixModal } from "@/components/ui/edit-mix-modal";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { toPng } from "html-to-image";
import { CinemaModeDesktop } from "../cinema-mode-desktop";
import { QueueModal } from "@/components/ui/queue-modal";
import { LyricsModal } from "@/components/ui/lyrics-modal";
import { DesktopThemeSelector } from "@/components/ui/desktop-theme-selector";

interface StageProps {
    onSwitchToMobile?: () => void;
}

export function WindowsStage({ onSwitchToMobile }: StageProps) {
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
    const [currentTheme, setCurrentTheme] = useState<ThemeKey>('ZEN');
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [editingMix, setEditingMix] = useState<Mix | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

    const playerRef = useRef<HTMLDivElement>(null);
    const { playClick, playClunk, playInsert } = useAudio();

    // Init Theme from LocalStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('melora-theme') as ThemeKey;
        if (savedTheme && THEMES[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, []);

    // THEME SWITCHER LOGIC
    const handleThemeChange = () => {
        playClick();
        const keys = Object.keys(THEMES) as ThemeKey[];
        const currentIndex = keys.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % keys.length;
        const newTheme = keys[nextIndex];
        setCurrentTheme(newTheme);
        localStorage.setItem('melora-theme', newTheme);
    };

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
    }, [searchParams, isLoaded, mixes, router, addMix]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                    if (e.ctrlKey || e.metaKey) {
                        next();
                    } else if (duration > 0) {
                        const newTime = Math.min(progress + 0.05, 1);
                        seek(newTime);
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (e.ctrlKey || e.metaKey) {
                        prev();
                    } else if (duration > 0) {
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
                if (activeMixId !== id) {
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
            id: crypto.randomUUID(),
            title: newMixTitle,
            color: randomColor,
            songs: [],
            currentSongIndex: 0
        };

        addMix(newMix);
        setNewMixTitle("");
        setIsModalOpen(false);
        setSearchTargetMixId(newMix.id);
        setIsSearchOpen(true);
        addToast(`Created mix: ${newMixTitle}`);
    };

    const handleAddSong = (song: JioSaavnSong) => {
        const targetMixId = searchTargetMixId || activeMixId;
        if (targetMixId) {
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

    const [snapshotTarget, setSnapshotTarget] = useState<Mix | null>(null);

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
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedMixes = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedMixes)) {
                    const validMixes = importedMixes.filter(m => {
                        const hasBasicProps = m.id && typeof m.title === 'string' && Array.isArray(m.songs);
                        if (!hasBasicProps) return false;
                        return m.songs.every((s: any) => s.id && typeof s.name === 'string' && typeof s.url === 'string');
                    }).map((m: any) => ({ ...m, title: m.title.slice(0, 50) }));

                    if (validMixes.length === 0) {
                        addToast("No valid mixtapes found", "error");
                        return;
                    }

                    const currentMixes = mixes;
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
        const favMix = mixes.find(m => m.id === 'favorites');
        if (!favMix) {
            const newFav: Mix = {
                id: 'favorites',
                title: 'Favorites ❤️',
                color: 'red',
                songs: [song],
                currentSongIndex: 0
            };
            addMix(newFav);
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


    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

    // --- RENDER CUSTOM LAYOUT STAGES (Studio, Zen, Bauhaus) ---
    // --- RENDER STAGE ---
    const layout = THEMES[currentTheme]?.layout || 'zen';
    const StageComponent =
        layout === 'zen' ? ZenStage :
            layout === 'bauhaus' ? BauhausStage :
                layout === 'nordic' ? NordicStage :
                    layout === 'opendeck' ? OpenDeckStage :
                        DeckStage;

    return (
        <>
            <StageComponent
                currentTheme={currentTheme}
                onThemeChange={handleThemeChange}
                onSelectTheme={(theme: ThemeKey) => {
                    setCurrentTheme(theme);
                    localStorage.setItem('melora-theme', theme);
                }}
                onSwitchToMobile={onSwitchToMobile}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onEditMix={(mix) => setEditingMix(mix)}
                onOpenSearch={(mixId) => {
                    setSearchTargetMixId(mixId);
                    setIsSearchOpen(true);
                }}
                onCreateMix={() => {
                    setNewMixTitle(`Mixtape Vol. ${mixes.length + 1}`);
                    setIsModalOpen(true);
                }}
                onCinemaMode={() => setIsCinemaMode(true)}
                onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
                onSnapshotMix={handleLibrarySnapshot}
            />

            <DesktopThemeSelector
                isOpen={isThemeSelectorOpen}
                onClose={() => setIsThemeSelectorOpen(false)}
                currentTheme={currentTheme}
                onSelectTheme={(theme) => {
                    setCurrentTheme(theme);
                    localStorage.setItem('melora-theme', theme);
                }}
            />

            {/* Cinema Mode */}
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

            {/* Create Mix Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 p-6 rounded-xl shadow-2xl w-full max-w-md border border-zinc-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4 text-white">New Mixtape</h3>
                            <input
                                type="text"
                                value={newMixTitle}
                                onChange={(e) => setNewMixTitle(e.target.value)}
                                placeholder="Mixtape name..."
                                className="w-full px-4 py-3 bg-zinc-800 text-white rounded border border-zinc-700 mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
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
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <DesktopSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Search Modal */}
            {isSearchOpen && (
                <SearchModal
                    isOpen={isSearchOpen}
                    onClose={() => setIsSearchOpen(false)}
                    onAddSong={handleAddSong}
                    favorites={new Set((mixes.find(m => m.id === 'favorites')?.songs || []).map(s => s.id))}
                    onToggleFavorite={handleToggleFavorite}
                />
            )}

            {/* Edit Mix Modal */}
            {editingMix && (
                <EditMixModal
                    isOpen={!!editingMix}
                    mix={editingMix}
                    onClose={() => setEditingMix(null)}
                    onUpdateMix={(updatedMix: Mix) => {
                        updateMix(updatedMix.id, updatedMix);
                        setEditingMix(null);
                        addToast(`Updated "${updatedMix.title}"`);
                    }}
                    onDeleteMix={(mixId: string) => {
                        deleteMix(mixId);
                        setEditingMix(null);
                        addToast("Mixtape deleted");
                    }}
                />
            )}

            {/* Toast Container */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`px-4 py-3 rounded shadow-lg text-white font-bold font-mono text-sm border-l-4 ${toast.type === 'success' ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}
                        >
                            {toast.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
