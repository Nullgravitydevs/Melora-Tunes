"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cassette } from "@/components/ui/cassette";
import { GlassSearch } from "@/components/shared/GlassSearch";
import { Button } from "@/components/ui/button";
import { Plus, Maximize2, Pencil, Camera, Download, Upload, MoreHorizontal, Settings, Smartphone, Palette } from "lucide-react";
import { useAudio } from "@/hooks/use-audio";
import { JioSaavnSong, getSongDetails } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import dynamic from 'next/dynamic';
const DeckStage = dynamic(() => import("./themes/deck-stage").then(mod => mod.DeckStage), { ssr: false });
import { ZenStage } from "./themes/zen-stage";
import { BauhausStage } from "./themes/bauhaus-stage";
import { NordicStage } from "./themes/nordic-stage";
import { OpenDeckStage } from "./themes/opendeck-stage";
import { BoomboxStage } from "./themes/boombox-stage";
import { SilverFrostStage } from "./themes/silverfrost-stage";
// import { GlassStage } from "./themes/glass-stage"; // REMOVED
import { DiscoveryLayout } from "@/components/desktop/discovery/DiscoveryLayout";

import { DesktopPlayer, THEMES, ThemeKey } from "@/components/ui/desktop-player";
import { useSearchParams, useRouter } from "next/navigation";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { PlayableTrack, isPlayableTrack } from "@/lib/types";
import { DesktopSettingsModal } from "@/components/ui/desktop-settings-modal";
import { EditMixModal } from "@/components/ui/edit-mix-modal";
// import { InstallPrompt } from "@/components/ui/install-prompt";
import { toPng } from "html-to-image";
import { CinemaModeDesktop } from "../cinema-mode-desktop";
import { QueueModal } from "@/components/ui/queue-modal";
import { ShareMixModal } from "@/components/ui/share-mix-modal";
import { DesktopThemeSelector } from "@/components/ui/desktop-theme-selector";
import { ErrorBoundary } from "@/components/ui/error-boundary";


interface StageProps {
    onSwitchToMobile?: () => void;
    initialTheme?: string | null;
    isMobileDevice?: boolean;
}

export function WindowsStage({ onSwitchToMobile, initialTheme, isMobileDevice }: StageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    const encodeToBase64Utf8 = (payload: unknown) => {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        let binary = "";
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    };

    const persistTheme = (theme: ThemeKey) => {
        localStorage.setItem('melora-theme', theme);
        if (THEMES[theme]?.layout !== 'glass') {
            localStorage.setItem('melora-deck-theme', theme);
        }
    };

    // Orientation Logic
    const [showRotateOverlay, setShowRotateOverlay] = useState(false);

    useEffect(() => {
        if (!isMobileDevice) return;
        const checkOrientation = () => {
            const isPortrait = window.innerWidth < window.innerHeight;
            setShowRotateOverlay(isPortrait);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, [isMobileDevice]);

    const {
        mixes, activeMixId, isPlaying, currentSong, volume, progress, duration,
        setMixes, loadMix, play, pause, togglePlay, next, prev, seek, setVolume,
        addMix, updateMix, deleteMix, isLoaded,
        shuffle, setShuffle, repeat, setRepeat,
        queue, currentIndex,
        notificationsEnabled,
        likedSongs, toggleLike
    } = usePlayback();

    // UI State (Local)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTargetMixId, setSearchTargetMixId] = useState<string | null>(null);
    const [newMixTitle, setNewMixTitle] = useState("");
    const [currentTheme, setCurrentTheme] = useState<ThemeKey>('BOOMBOX');
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [editingMix, setEditingMix] = useState<Mix | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

    const playerRef = useRef<HTMLDivElement>(null);
    const { playClick, playClunk, playInsert } = useAudio();

    const [isMounted, setIsMounted] = useState(false);
    // const [isWelcome, setIsWelcome] = useState(false); // DISABLED & REMOVED

    useEffect(() => {
        setIsMounted(true);
        if (initialTheme && THEMES[initialTheme as ThemeKey]) {
            setCurrentTheme(initialTheme as ThemeKey);
            if (THEMES[initialTheme as ThemeKey]?.layout !== 'glass') {
                localStorage.setItem('melora-deck-theme', initialTheme as ThemeKey);
            }
            return;
        }

        // Auto-load last used deck or default to BOOMBOX
        const savedDeckTheme = localStorage.getItem('melora-deck-theme') as ThemeKey;
        const savedGlobalTheme = localStorage.getItem('melora-theme') as ThemeKey;
        if (savedDeckTheme && THEMES[savedDeckTheme] && THEMES[savedDeckTheme].layout !== 'glass') {
            setCurrentTheme(savedDeckTheme);
        } else if (savedGlobalTheme && THEMES[savedGlobalTheme] && THEMES[savedGlobalTheme].layout !== 'glass') {
            setCurrentTheme(savedGlobalTheme);
            localStorage.setItem('melora-deck-theme', savedGlobalTheme);
        } else {
            setCurrentTheme('BOOMBOX');
            localStorage.setItem('melora-deck-theme', 'BOOMBOX');
        }
    }, [initialTheme]);

    // Keyboard Shortcuts for Deck Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    next();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    prev();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setVolume(volume > 0 ? 0 : 1); // Mute/Unmute
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, next, prev, volume, setVolume]);

    // THEME SWITCHER LOGIC
    const handleThemeChange = () => {
        playClick();
        const keys = Object.keys(THEMES) as ThemeKey[];
        const currentIndex = keys.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % keys.length;
        const newTheme = keys[nextIndex];
        setCurrentTheme(newTheme);
        persistTheme(newTheme);
    };

    const activeMix = mixes.find(m => m.id === activeMixId);

    const addToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareMix, setShareMix] = useState<Mix | null>(null);

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
        playClick();
        // [CLEANUP] No more random colors - Theme handles visual, data uses fixed default
        const newMix: Mix = {
            id: crypto.randomUUID(),
            title: newMixTitle,
            color: 'purple',
            songs: [],
            currentSongIndex: 0
        };

        if (addMix(newMix)) {
            setNewMixTitle("");
            setIsModalOpen(false);
            setSearchTargetMixId(newMix.id);
            setIsSearchOpen(true);
            addToast(`Mix Created Successfully: ${newMixTitle}`);
        } else {
            addToast("Failed to create mixtape", "error");
        }
    };

    const handleAddSong = (song: JioSaavnSong | PlayableTrack) => {
        const targetMixId = searchTargetMixId || activeMixId;
        if (targetMixId) {
            const current = mixes.find(m => m.id === targetMixId);
            if (current) {
                // Allowed duplicates - User requested feature
                const newQuality = isPlayableTrack(song) ? song.preferredQuality : '320';


                updateMix(targetMixId, { songs: [...current.songs, song] });
                playClick();
                const songName = isPlayableTrack(song) ? (song.title || song.song?.name || "Unknown Track") : song.name;
                addToast(`Added "${decodeHtml(songName)}" (${newQuality})`);
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

        const encoded = encodeToBase64Utf8(shareData);
        const url = `${window.location.origin}/share?mix=${encodeURIComponent(encoded)}`;

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
                        return m.songs.every((s: any) => {
                            // Handle both PlayableTrack (flat) and JioSaavnSong (nested)
                            const title = (s as any).title || s.song?.name || (s as any).name || "Unknown Track";
                            if (isPlayableTrack(s)) {
                                return s.id && s.song && s.song.name;
                            }
                            return s.id && typeof s.name === 'string' && typeof s.url === 'string';
                        });
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
        toggleLike(song);
        const exists = likedSongs.some(s => s.id === song.id);
        addToast(exists ? "Removed from Favorites" : "Added to Favorites ❤️");
    };

    // Strictly enforce NO DECK on mobile
    const resolvedLayout = THEMES[currentTheme]?.layout || 'zen';
    const effectiveLayout = (isMobileDevice && (
        resolvedLayout === 'studio' ||
        resolvedLayout === 'opendeck' ||
        resolvedLayout === 'boombox' ||
        resolvedLayout === 'zen' ||
        resolvedLayout === 'bauhaus' ||
        resolvedLayout === 'nordic' ||
        resolvedLayout === 'silverfrost'
    ))
        ? 'glass'
        : resolvedLayout;

    const StageComponent =
        effectiveLayout === 'zen' ? ZenStage :
            effectiveLayout === 'bauhaus' ? BauhausStage :
                effectiveLayout === 'nordic' ? NordicStage :
                    effectiveLayout === 'opendeck' ? OpenDeckStage :
                        effectiveLayout === 'boombox' ? BoomboxStage :
                            effectiveLayout === 'silverfrost' ? SilverFrostStage :
                                effectiveLayout === 'glass' ? DiscoveryLayout :
                                    DeckStage;

    if (!isMounted) return null; // Prevent hydration mismatch/flash


    const handleSelectMode = (mode: ThemeKey) => {
        setCurrentTheme(mode);
    };

    if (!isMounted) return null; // Prevent hydration mismatch/flash

    // Welcome Screen Removed (Redundant)

    return (
        <>
            <ErrorBoundary>
                {/* Rotate Overlay Removed - Decks are Desktop Only now */}

                <StageComponent
                    currentTheme={currentTheme}
                    onThemeChange={handleThemeChange}
                    // Pass isMobileDevice to DeckStage for Guardrails
                    isMobileDevice={isMobileDevice}
                    onSelectTheme={(theme: ThemeKey) => {
                        setCurrentTheme(theme);
                        persistTheme(theme);
                    }}
                    // onSwitchToMobile removed
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onEditMix={(mix) => setEditingMix(mix)}
                    onOpenSearch={(mixId) => {
                        setSearchTargetMixId(mixId);
                        setIsSearchOpen(true);
                    }}
                    onCreateMix={() => {
                        const existingNums = new Set<number>();
                        let customCount = 0;

                        mixes.forEach(m => {
                            const match = m.title.match(/Mixtape Vol\. (\d+)/);
                            if (match) {
                                existingNums.add(parseInt(match[1]));
                            } else {
                                customCount++;
                            }
                        });

                        // Assign hypothetical numbers to custom text titles
                        // filling the lowest available gaps first
                        for (let i = 0; i < customCount; i++) {
                            let placeholder = 1;
                            while (existingNums.has(placeholder)) {
                                placeholder++;
                            }
                            existingNums.add(placeholder);
                        }

                        // Find first available slot for the NEW tape
                        let nextNum = 1;
                        while (existingNums.has(nextNum)) {
                            nextNum++;
                        }

                        setNewMixTitle(`Mixtape Vol. ${nextNum}`);
                        setIsModalOpen(true);
                    }}
                    onCinemaMode={() => setIsCinemaMode(true)}
                    onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
                    onSnapshotMix={handleLibrarySnapshot}
                    onShowQueue={() => setIsQueueOpen(true)}
                    onShareMix={(mix) => {
                        setShareMix(mix);
                        setIsShareOpen(true);
                    }}
                />
            </ErrorBoundary>

            <DesktopThemeSelector
                isOpen={isThemeSelectorOpen}
                onClose={() => setIsThemeSelectorOpen(false)}
                currentTheme={currentTheme}
                onSelectTheme={(theme) => {
                    setCurrentTheme(theme);
                    persistTheme(theme);
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
                                        // [CLEANUP] No more random colors
                                        const newMix: Mix = {
                                            id: Date.now().toString(),
                                            title: newMixTitle,
                                            color: 'purple',
                                            songs: [],
                                            currentSongIndex: 0
                                        };
                                        if (addMix(newMix)) {
                                            setIsModalOpen(false);
                                            setNewMixTitle("");
                                            addToast(`Created mixtape "${newMix.title}"`);
                                        } else {
                                            addToast("Failed to create mixtape", "error");
                                        }
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
                currentLayout={
                    THEMES[currentTheme]?.layout === 'glass' ? 'discovery' : 'deck'
                }
                onSwitchLayout={(mode) => {
                    // Modal handles dispatch. We just close.
                    setIsSettingsOpen(false);
                }}
            />



            {/* Queue Modal */}
            <QueueModal
                isOpen={isQueueOpen}
                onClose={() => setIsQueueOpen(false)}
                queue={queue}
                currentIndex={currentIndex}
                onJumpTo={(index) => {
                    // Jump to a specific song in the queue
                    const mix = mixes.find(m => m.id === activeMixId);
                    if (mix) {
                        updateMix(mix.id, { currentSongIndex: index });
                    }
                }}
            />

            {/* Share Mix Modal */}
            <ShareMixModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                mix={shareMix}
            />

            {/* Premium Glass Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 z-[100]">
                        <GlassSearch
                            onClose={() => { setIsSearchOpen(false); setSearchTargetMixId(null); }}
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Mix Modal */}
            {
                editingMix && (
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
