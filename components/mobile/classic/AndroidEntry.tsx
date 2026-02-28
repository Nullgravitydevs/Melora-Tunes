import { lazy, Suspense } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";

// --- HOOKS ---


const BrickGame = lazy(() => import("./games/BrickGame").then(m => ({ default: m.BrickGame })));
const MusicQuiz = lazy(() => import("./games/MusicQuiz").then(m => ({ default: m.MusicQuiz })));
const Calendar = lazy(() => import("./extras/Calendar").then(m => ({ default: m.Calendar })));

const GAMES_MENU: MenuItem[] = [
    { label: "Brick", type: 'navigation', target: 'game-brick', data: { id: 'brick-game', name: 'Brick' } },
    { label: "Music Quiz", type: 'navigation', target: 'game-music-quiz', data: { id: 'music-quiz', name: 'Music Quiz' } }
];
import { ClickWheel } from "./ClickWheel";
import { IpodScreen } from "./IpodScreen";
import { ChevronRight, Battery, Wifi, Play, Pause, SkipForward, SkipBack, Volume2, Search, ArrowRight, Star, Heart, Music, Zap, Smile, Ghost, Skull, Trash2, ShoppingBag, MessageSquare } from "lucide-react";
import { StickerLayer, Sticker, StickerType } from './stickers/StickerLayer';
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { shuffleArray, getArt } from "@/lib/helpers";
import { PlayableTrack, PlayableSource } from "@/lib/types";
import { searchSongs, JioSaavnSong, getAlbumDetails, getLyricsWithFallback } from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { loadSettings, saveSettings, resetSettings, clearCache } from "@/lib/settings";
import { useDebounce } from "@/hooks/use-debounce";
import { useIpodAudio } from "@/hooks/use-ipod-audio";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAudioProgress } from "@/hooks/use-audio-progress";


interface MenuItem {
    label: string;
    type: 'navigation' | 'action' | 'toggle';
    target?: string; // For navigation
    action?: () => void;
    data?: any; // For dynamic items
}

interface ViewState {
    id: string; // Unique ID for the view context (e.g., 'main', 'playlists', 'mix-123')
    title: string;
    viewType: 'menu' | 'player' | 'search' | 'loading' | 'message' | 'cinema' | 'cover-flow' | 'lyrics' | 'stickers';
    data?: any; // Context data (e.g., mixId)
    selectedIndex: number;
    staticItems?: MenuItem[]; // For purely static menus
    searchQuery?: string;
    isFlipped?: boolean; // For Cover Flow flip state
    trackIndex?: number; // For Cover Flow track selection when flipped
    layout?: 'split' | 'full';
    customHeader?: React.ReactNode;
}

const MAIN_MENU: MenuItem[] = [
    { label: "Music", type: 'navigation', target: 'music' },
    { label: 'Cover Flow', type: 'action', data: { id: 'cover-flow', name: 'Cover Flow' } },
    { label: 'Cinema Mode', type: 'action', data: { id: 'cinema', name: 'Cinema Mode' } },
    { label: "Extras", type: 'navigation', target: 'extras' },
    { label: "Games", type: 'navigation', target: 'games' },
    { label: "Settings", type: 'navigation', target: 'settings' },
    { label: 'Now Playing', type: 'action', data: { id: 'now-playing', name: 'Now Playing' } }
];


const MUSIC_MENU: MenuItem[] = [
    { label: "Playlists", type: 'navigation', target: 'playlists' },
    { label: "Artists", type: 'navigation', target: 'artists' },
    { label: "Albums", type: 'navigation', target: 'albums' },
    { label: "Songs", type: 'navigation', target: 'songs' },
    { label: "Liked Songs", type: 'navigation', target: 'liked-songs' },
    { label: "Recently Played", type: 'navigation', target: 'recently-played' },
    { label: "Queue", type: 'navigation', target: 'queue' },
    { label: "Search", type: 'navigation', target: 'search' }
];

// SYSTEM_MENU removed — dead code. Actual system settings built dynamically in currentMenuItems.



interface AndroidEntryProps {
    onSwitchToDesktop?: (theme?: string) => void;
}

export function AndroidEntry({ onSwitchToDesktop }: AndroidEntryProps) {
    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                .font-vietnam { font-family: 'Be Vietnam Pro', sans-serif; }
                .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
            `}</style>
            <AndroidEntryContent onSwitchToDesktop={onSwitchToDesktop} />
        </>
    );
}

function AndroidEntryContent({ onSwitchToDesktop }: AndroidEntryProps) {
    const { play, pause, togglePlay, next, prev, volume, setVolume, currentSong, isPlaying, duration, seek, activeMixId, loadMix, activeMix, shuffle, setShuffle, repeat, setRepeat, queue, currentIndex, sleepTimer, setSleepTimer, stopAtEndOfSong, setStopAtEndOfSong, playInstantMix, activeQuality, qualityPreference, setQualityPreference, eq, playbackSpeed, setPlaybackSpeed } = usePlayback();
    const { updateMix, mixes, addMix, deleteMix, likedSongs, toggleLike, isLiked, recentlyPlayed, isDownloaded, removeDownload } = useLibrary();
    const { downloadSong } = usePlayback();
    const { progress } = useAudioProgress();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStack, setViewStack] = useState<ViewState[]>([
        { id: 'main', title: "Melora Tunes", viewType: 'menu', selectedIndex: 0, staticItems: MAIN_MENU }
    ]);
    const [clickSounds, setClickSounds] = useState(true);
    const [ipodTheme, setIpodTheme] = useState<'classic' | 'black' | 'silver' | 'dark' | 'blue' | 'rosegold' | 'blush'>('classic');
    const [controlMode, setControlMode] = useState<'volume' | 'seek'>('volume');
    const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
    const volumeOverlayTimer = useRef<NodeJS.Timeout | null>(null);
    // Crossfade removed — feature not connected to audio engine. UI removed to avoid misleading users.
    const [isLocked, setIsLocked] = useState(false); // Hold Switch state
    const inputRef = useRef<HTMLInputElement>(null);
    const stickerConstraintsRef = useRef<HTMLDivElement>(null);
    const iPodBodyRef = useRef<HTMLDivElement>(null);
    const scrollDirectionRef = useRef<'left' | 'right' | null>(null);
    const accumulatedWheelDelta = useRef(0); // Global wheel accumulator

    // Sticker State
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [isStickersLoaded, setIsStickersLoaded] = useState(false);
    const [isBodyReady, setIsBodyReady] = useState(false); // Track when iPodBodyRef is available
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Audio constants
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [clockTick, setClockTick] = useState(0); // Triggers clock re-render
    // Audio Hook
    const { playLock, playClick, playScroll } = useIpodAudio();

    const isMobile = useIsMobile();

    // Mode switching handler
    const handleSwitchMode = (mode: string) => {
        window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: mode }));
    };

    const toggleLock = () => {
        setIsLocked(!isLocked);
        playLock();
    };

    const showToast = useCallback((msg: string) => {
        // Clear existing timer if any - preventing premature close of new toast
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }

        setToastMessage(msg);

        // Set fresh timer
        toastTimerRef.current = setTimeout(() => {
            setToastMessage(null);
            toastTimerRef.current = null;
        }, 4500);
    }, []);

    // Load stickers from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('ipod_stickers_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // stickers loaded
                setStickers(parsed);
            } catch (e) { console.error(e); }
        } else {
            // no saved stickers
        }
        setIsStickersLoaded(true);
    }, []); // Run once on mount

    // Track when body ref is ready to force re-render for StickerLayer
    useEffect(() => {
        if (iPodBodyRef.current && !isBodyReady) {
            setIsBodyReady(true);
        }
    }, [isBodyReady]); // Added dependency array



    // Add Sticker from Drawer
    const handleAddSticker = useCallback((type: StickerType, color: string) => {
        // Limit set to 5 as requested by user
        const activeCount = stickers.filter(s => !s.isResidue).length;
        if (activeCount >= 5) {
            showToast("Max 5 stickers! Peel one off first.");
            return;
        }
        const zone = Math.random();
        let x, y;

        if (zone < 0.4) {
            // Left of Wheel (Pct: x 0.05-0.15, y 0.6-0.8)
            x = 0.05 + Math.random() * 0.1;
            y = 0.6 + Math.random() * 0.2;
        } else if (zone < 0.8) {
            // Right of Wheel (Pct: x 0.75-0.85, y 0.6-0.8)
            x = 0.75 + Math.random() * 0.1;
            y = 0.6 + Math.random() * 0.2;
        } else {
            // Chin Area (Pct: x 0.15-0.75, y 0.85-0.9)
            x = 0.15 + Math.random() * 0.6;
            y = 0.85 + Math.random() * 0.05;
        }

        const newSticker: Sticker = {
            id: Date.now() + Math.random(),
            type,
            xPct: x,
            yPct: y,
            rotation: Math.floor(Math.random() * 41) - 20,
            color,
            isResidue: false
        };


        setStickers(prev => {
            const next = [...prev, newSticker];
            localStorage.setItem('ipod_stickers_v2', JSON.stringify(next));
            return next;
        });
        showToast("Sticker Added!");
    }, [stickers, showToast]);

    const handleUpdateSticker = useCallback((id: number, updates: Partial<Sticker>) => {
        setStickers(prev => {
            const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
            // sticker update saved
            localStorage.setItem('ipod_stickers_v2', JSON.stringify(next)); // Instant Save
            return next;
        });
    }, []);

    const handleRemoveSticker = useCallback((id: number) => {
        setStickers(prev => {
            const next = prev.filter(s => s.id !== id);
            localStorage.setItem('ipod_stickers_v2', JSON.stringify(next));
            return next;
        });
    }, []);

    const handleClearStickers = useCallback(() => {
        // "Cheat" clean - no residue
        setStickers([]);
        localStorage.removeItem('ipod_stickers_v2'); // FORCE SYNC to disk
        showToast("Case is shiny new!");
    }, [showToast]);

    // [PERF FIX #5] Activity & Backlight — Use refs instead of state to avoid re-renders.
    // mousemove fires dozens of times per second; using state caused the entire 2066-line
    // component to re-render on every mouse movement.
    const lastActivityRef = useRef(Date.now());
    const [backlight, setBacklight] = useState(1); // 0 (dim) to 1 (bright)

    useEffect(() => {
        const timeout = 10000; // 10 seconds to dim
        const interval = setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivityRef.current;
            if (timeSinceActivity > timeout) {
                const newBacklight = Math.max(0, 1 - (timeSinceActivity - timeout) / 5000);
                setBacklight(prev => {
                    // Only update state if value actually changed (avoids unnecessary re-renders)
                    const rounded = Math.round(newBacklight * 100) / 100;
                    const prevRounded = Math.round(prev * 100) / 100;
                    return rounded !== prevRounded ? rounded : prev;
                });
            } else {
                setBacklight(prev => prev === 1 ? prev : 1);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []); // No deps — uses ref, not state

    const registerActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        setBacklight(prev => prev === 1 ? prev : 1); // Only re-render if backlight was dimmed
    }, []);

    // Global Activity Listener for Backlight
    useEffect(() => {
        let throttleTimer: NodeJS.Timeout | null = null;
        const throttledRegister = () => {
            if (!throttleTimer) {
                registerActivity();
                throttleTimer = setTimeout(() => { throttleTimer = null; }, 500);
            }
        };
        window.addEventListener('mousemove', throttledRegister, { passive: true });
        window.addEventListener('keydown', throttledRegister, { passive: true });
        window.addEventListener('click', throttledRegister, { passive: true });

        return () => {
            window.removeEventListener('mousemove', throttledRegister);
            window.removeEventListener('keydown', throttledRegister);
            window.removeEventListener('click', throttledRegister);
            if (throttleTimer) clearTimeout(throttleTimer);

            // Cleanup timeouts
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [registerActivity]);

    // playClick removed - ClickWheel handles its own audio via hook

    // Load settings on mount
    useEffect(() => {
        const settings = loadSettings();
        setVolume(settings.volume);
        setClickSounds(settings.clickSounds);
        setIpodTheme(settings.theme);
    }, [setVolume]);



    // Dynamic Meta Theme Color for Mobile Browsers
    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        // Save previous color to restore on unmount
        const previousColor = metaThemeColor?.getAttribute('content') || '#000000';

        let color = '#000000';
        switch (ipodTheme) {
            case 'silver': color = '#d1d5db'; break;
            case 'classic': color = '#f5f5f5'; break;
            case 'blue': color = '#1676f3'; break;
            case 'rosegold': color = '#e5b1a3'; break;
            case 'blush': color = '#f9dce7'; break;
            case 'dark': color = '#101922'; break;
            case 'black': color = '#111111'; break;
        }
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        } else {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = color;
            document.head.appendChild(meta);
        }

        // Restore previous theme-color when iPod unmounts (switching to Discovery)
        return () => {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', previousColor);
        };
    }, [ipodTheme]);

    // Initial State


    // Derived state for current view
    const currentView = viewStack[viewStack.length - 1];

    // Live clock update when user is on the clock view
    useEffect(() => {
        if (currentView.id !== 'clock') return;
        const interval = setInterval(() => setClockTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [currentView.id]);

    // Clear lyrics when leaving the lyrics view (proper React pattern, not setTimeout hack)
    useEffect(() => {
        if (currentView.viewType !== 'lyrics' && lyrics !== null) {
            setLyrics(null);
        }
    }, [currentView.viewType, lyrics]);

    // Cover Flow Logic: Fetch Tracks Hoisted
    const [cfTracks, setCfTracks] = useState<JioSaavnSong[]>([]);


    // Helper to get albums from Library (Shared logic)
    const getLibraryAlbums = (currentMixes: typeof mixes) => {
        const albumMap = new Map<string, any>();
        currentMixes
            // .filter(m => m.title !== "On-the-Go") // REMOVED: Include On-the-Go so it shows in Cover Flow
            .forEach(m => m.songs.forEach(item => {
                const s = ('song' in item ? item.song : item) as any; // Normalize PlayableTrack
                if (!s.album?.id && !s.id) return;

                const albumId = s.album?.id || `unknown-${s.id}`;
                const albumName = s.album?.name || "Unknown Album";

                if (!albumMap.has(albumId)) {
                    // Create Album Entry — use shared getArt helper
                    const albumImage = getArt(s);
                    albumMap.set(albumId, {
                        id: albumId,
                        title: decodeHtml(albumName),
                        artist: decodeHtml(s.primaryArtists),
                        image: albumImage,
                        songs: []
                    });
                }
                // Add Song to Album
                const album = albumMap.get(albumId);
                if (!album.songs.some((existing: any) => existing.id === s.id)) {
                    album.songs.push({
                        id: s.id,
                        name: decodeHtml(s.name),
                        duration: s.duration,
                        image: getArt(s),
                        primaryArtists: s.primaryArtists
                    });
                }
            }));

        return Array.from(albumMap.values())
            .sort((a, b) => a.title.localeCompare(b.title));
    };

    // Compute Menu Items Dynamically based on Current View ID & Context
    // Removed useMemo to ensure closures (like playSongNow) are always fresh.
    // This prevents stale state issues where actions use old versions of 'mixes'.
    // --- Actions Actions ---

    // Updated Navigation Handler
    const handleNavigation = useCallback((target: string, data?: any, titleOverride?: string) => {
        let newView: ViewState = {
            id: target,
            title: titleOverride || target.charAt(0).toUpperCase() + target.slice(1),
            selectedIndex: 0,
            viewType: 'menu',
            data: data
        };

        if (target === 'search') {
            newView.viewType = 'search';
            newView.title = 'Search';
            newView.searchQuery = "";
            newView.staticItems = []; // Results go here
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }

        setViewStack(prev => [...prev, newView]);
    }, []);

    const goToNowPlaying = useCallback(() => {
        setViewStack(prev => [...prev, { id: 'now-playing', title: 'Now Playing', viewType: 'player', selectedIndex: 0 }]);
    }, []);

    const handleBack = useCallback(() => {
        setViewStack(prev => {
            if (prev.length <= 1) return prev;
            const current = prev[prev.length - 1];

            // Cover Flow Logic
            if (current.viewType === 'cover-flow' && current.isFlipped) {
                const newStack = [...prev];
                newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], isFlipped: false };
                return newStack;
            }

            return prev.slice(0, prev.length - 1);
        });
    }, []);

    const createNewPlaylist = () => {
        const newId = Date.now().toString();
        const newMix: Mix = {
            id: newId,
            title: `Mix ${mixes.length + 1}`,
            color: "purple",
            songs: [],
            currentSongIndex: 0
        };
        if (addMix(newMix)) {
            // Navigate immediately - PASS FULL MIX OBJECT to avoid race condition
            handleNavigation(`mix-${newId}`, newMix, newMix.title);
            // Immediately trigger Rename
            setTimeout(() => goToRename(newMix), 100);
        } else {
            showToast("Maximum limit of 8 tapes reached!");
        }
    };

    const goToRename = (mix: Mix) => {
        setSearchQuery(mix.title); // Pre-fill with current name
        setViewStack(prev => [...prev, {
            id: 'rename',
            title: 'Rename Tape',
            viewType: 'search', // Reuse search layout for input
            selectedIndex: 0,
            searchQuery: mix.title, // Initialize with mix name
            data: mix.id,
            staticItems: [{ label: "Press Enter to Save", type: 'action', action: () => { } }]
        }]);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleDeletePlaylist = (id: string) => {
        deleteMix(id);
        handleBack(); // Pop the mix view. The 'playlists' view under it will re-render with the mix gone.
    };

    const playMixSong = (mixId: string, idx: number) => {
        loadMix(mixId);
        updateMix(mixId, { currentSongIndex: idx });
        // Ensure play
        if (!isPlaying) play();
        goToNowPlaying();
    };

    // Play single song immediate (e.g. from songs list)
    // Play single song immediate (e.g. from songs list)
    const playSongNow = useCallback(async (songOrTrack: JioSaavnSong | PlayableTrack, isHiRes: boolean = false) => {
        if (isHiRes) {
            setQualityPreference('flac');
            // Hi-Res Lossless Mode enabled
        }

        let playableSong: JioSaavnSong | PlayableTrack;
        let isTrack = 'song' in songOrTrack;

        if (isTrack) {
            // Already a PlayableTrack (Unified Search Result)
            playableSong = songOrTrack as PlayableTrack;
            // No need for JIT resolution as sources are already populated
            // playing unified track
        } else {
            // Legacy / Standard Song
            let song = songOrTrack as any;
            playableSong = { ...song };
            const songData = song as any;

            // JUST-IN-TIME RESOLUTION FOR HIFI TRACKS (Legacy data shim)
            // If track is from Tidal/Qobuz and has no URL, find a fallback stream
            if ((songData.source === 'tidal' || songData.source === 'qobuz') && !song.url && !song.encryptedMediaUrl) {
                try {
                    // showToast("Resolving Hi-Res Stream..."); // Silent resolution
                    // JIT resolving stream
                    const fallbackResults = await searchUnified(`${song.name} ${song.primaryArtists}`, undefined, 'song');

                    // Prefer best match (Unified Search returns merged tracks)
                    const bestMatch = fallbackResults[0];

                    const bmName = bestMatch.song?.name?.toLowerCase() || '';
                    const sName = song.name.toLowerCase();
                    const isNameSimilar = bmName.includes(sName) || sName.includes(bmName);

                    if (isNameSimilar) {
                        // resolved fallback track
                        // UPGRADE to PlayableTrack!
                        playableSong = bestMatch;
                    } else {
                        console.warn("[iPod] Fallback mismatch");
                        showToast("Stream Unavailable");
                        return;
                    }
                } catch (e) {
                    console.error("Failed to resolve Hi-Res stream", e);
                    showToast("Stream Unavailable");
                    return; // Abort
                }
            }
        }

        // Play the song directly — playInstantMix creates its own queue
        const playMix: Mix = {
            id: 'ipod-play',
            title: "Now Playing",
            color: "white",
            songs: [playableSong],
            currentSongIndex: 0
        };

        // ATOMIC PLAYBACK - No Race Conditions
        playInstantMix(playMix);
        goToNowPlaying();
    }, [mixes, playInstantMix, setQualityPreference, goToNowPlaying]);

    const handleShowLyrics = useCallback(async (song: JioSaavnSong) => {
        if (!song) {
            showToast("No song selected!");
            return;
        }
        setIsLoading(true);
        try {
            const fetchedLyrics = await getLyricsWithFallback(song);
            setLyrics(fetchedLyrics);
            setViewStack(prev => [...prev, {
                id: 'lyrics',
                title: 'Lyrics',
                viewType: 'lyrics',
                selectedIndex: 0,
                data: {
                    id: 'lyrics',
                    message: fetchedLyrics || "No lyrics found."
                }
            }]);
        } catch (error) {
            console.error("Failed to fetch lyrics:", error);
            setLyrics("Failed to load lyrics.");
            setViewStack(prev => [...prev, {
                id: 'lyrics',
                title: 'Lyrics',
                viewType: 'lyrics',
                selectedIndex: 0,
                data: {
                    id: 'lyrics',
                    message: "Failed to load lyrics."
                }
            }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Compute Menu Items Dynamically based on Current View ID & Context
    // Memoized to prevent heavy recalculation on scroll (selectedIndex change)
    const currentMenuItems: MenuItem[] = useMemo(() => {
        if (currentView.staticItems) return currentView.staticItems;

        switch (currentView.id) {
            case 'music': return MUSIC_MENU;
            case 'extras': return [
                { label: "Clock", type: 'navigation', target: 'clock' },
                { label: "Calendar", type: 'navigation', target: 'calendar' },
                { label: "Sleep Timer", type: 'navigation', target: 'sleep-timer' },
                { label: "Games", type: 'navigation', target: 'games' },
                { label: "Themes", type: 'navigation', target: 'theme-settings' },
                { label: "Sticker Collection", type: 'action', data: { id: 'sticker-collection' } },
                { label: "Clean All Stickers (Cheat)", type: 'action', action: handleClearStickers },
                { label: "Switch to Discovery Mobile", type: 'action', action: () => handleSwitchMode('DISCOVERY') },
            ];
            case 'games': return GAMES_MENU;

            case 'about': {
                const songCount = mixes.reduce((acc, m) => acc + m.songs.length, 0);
                const uniqueSongCount = new Set(mixes.flatMap(m => m.songs.map(s => ('song' in s ? (s as any).song : s) as any).map((x: any) => x?.id).filter(Boolean))).size;
                const playlistCount = mixes.filter(m => m.title !== 'On-the-Go').length;
                const likedCount = likedSongs.length;
                return [
                    { label: "✦ Melora iPod Classic", type: 'action', action: () => { } },
                    { label: `Songs: ${uniqueSongCount}`, type: 'action', action: () => { } },
                    { label: `Playlists: ${playlistCount}`, type: 'action', action: () => { } },
                    { label: `Liked: ${likedCount}`, type: 'action', action: () => { } },
                    { label: `Quality: ${qualityPreference === 'flac' ? 'Lossless' : qualityPreference + 'kbps'}`, type: 'action', action: () => { } },
                    { label: "Model: MC293LL", type: 'action', action: () => { } },
                    { label: "Version: 3.0.0", type: 'action', action: () => { } },
                    { label: "Serial: MLR-" + navigator.userAgent.slice(-8).replace(/\W/g, '').toUpperCase(), type: 'action', action: () => { } }
                ] as MenuItem[];
            }

            case 'clock': {
                // clockTick dependency ensures this refreshes every second
                const _tick = clockTick; // eslint-disable-line @typescript-eslint/no-unused-vars
                const now = new Date();
                return [
                    { label: `__CLOCK_FACE__`, type: 'action', action: () => { }, data: { isClock: true, time: now } },
                    { label: now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), type: 'action', action: () => { } }
                ] as MenuItem[];
            }

            case 'calendar':
                // Handled by custom view overlay
                return [] as MenuItem[];

            case 'settings':
                // Structured Settings Menu
                return [
                    {
                        label: `Audio Quality: ${qualityPreference === 'flac' ? 'Lossless' : qualityPreference === 'hires' ? 'Hi-Res' : qualityPreference + 'kbps'}`,
                        type: 'navigation',
                        target: 'quality-settings'
                    },
                    {
                        label: `Shuffle: ${shuffle ? 'On' : 'Off'}`,
                        type: 'action',
                        action: () => setShuffle(!shuffle)
                    },
                    {
                        label: `Repeat: ${repeat === 'off' ? 'Off' : repeat === 'one' ? 'One' : 'All'}`,
                        type: 'action',
                        action: () => {
                            const modes: ('off' | 'one' | 'all')[] = ['off', 'all', 'one'];
                            const idx = modes.indexOf(repeat);
                            setRepeat(modes[(idx + 1) % modes.length]);
                        }
                    },
                    {
                        label: `Playback Speed: ${playbackSpeed}x`,
                        type: 'navigation',
                        target: 'speed-settings'
                    },
                    {
                        label: "EQ",
                        type: 'navigation',
                        target: 'eq-settings'
                    },
                    {
                        label: `Click Sounds: ${clickSounds ? 'On' : 'Off'}`,
                        type: 'action',
                        action: () => {
                            const newValue = !clickSounds;
                            setClickSounds(newValue);
                            saveSettings({ clickSounds: newValue });
                        }
                    },
                    {
                        label: "About",
                        type: 'navigation',
                        target: 'about'
                    },
                    {
                        label: "System",
                        type: 'navigation',
                        target: 'system-settings'
                    },
                ] as MenuItem[];

            case 'system-settings':
                return [
                    {
                        label: "Backup Tapes",
                        type: 'action',
                        action: () => {
                            // Export all playlists as JSON
                            const playlistsData = {
                                version: '2.0.0',
                                exportDate: new Date().toISOString(),
                                playlists: mixes.map(mix => ({
                                    id: mix.id,
                                    title: mix.title,
                                    color: mix.color,
                                    songs: mix.songs
                                }))
                            };

                            const dataStr = JSON.stringify(playlistsData, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `melora-playlists-${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                            URL.revokeObjectURL(url);

                            showToast('Tapes exported successfully!');
                        }
                    },
                    {
                        label: "Clear Cache",
                        type: 'action',
                        action: () => {
                            clearCache();
                            showToast('Cache cleared!');
                        }
                    },
                    {
                        label: "Reset All Settings",
                        type: 'action',
                        action: () => {
                            resetSettings();
                            showToast('Settings reset. Reloading...');
                            setTimeout(() => window.location.reload(), 1000);
                        }
                    }
                ] as MenuItem[];

            case 'theme-settings':
                // iPod Theme Selection
                const themeNames = {
                    'classic': 'Classic (White)',
                    'black': 'Black',
                    'silver': 'Silver',
                    'dark': 'Dark',
                    'blue': 'Blue (Mini)',
                    'rosegold': 'Rose Gold (Luxury)',
                    'blush': 'Floral Blush'
                };
                return (['classic', 'black', 'silver', 'dark', 'blue', 'rosegold', 'blush'] as const).map(theme => ({
                    label: `${themeNames[theme]}${ipodTheme === theme ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        setIpodTheme(theme);
                        saveSettings({ theme });
                    }
                })) as MenuItem[];

            case 'quality-settings':
                const qualities = ['flac', '320', '160', '96'] as const;
                return qualities.map(q => ({
                    label: `${q === 'flac' ? 'Lossless (FLAC)' : q + ' kbps'} ${q === '320' ? '(High)' : ''}${qualityPreference === q ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        setQualityPreference(q);
                        saveSettings({ qualityPreference: q });
                    }
                })) as MenuItem[];

            case 'volume-settings':
                // Volume adjustment screen
                return [{
                    label: `Volume: ${Math.round(volume * 100)}%`,
                    type: 'action',
                    action: () => { } // Use scroll wheel to adjust
                }] as MenuItem[];

            case 'sleep-timer':
                return [
                    {
                        label: stopAtEndOfSong ? "✓ End of Song" : (sleepTimer ? "✓ Timer Active" : "Off"),
                        type: 'action',
                        action: () => {
                            setSleepTimer(null);
                            setStopAtEndOfSong(false);
                        }
                    },
                    {
                        label: "15 minutes",
                        type: 'action',
                        action: () => setSleepTimer({ endTime: Date.now() + 15 * 60 * 1000, duration: 15 })
                    },
                    {
                        label: "30 minutes",
                        type: 'action',
                        action: () => setSleepTimer({ endTime: Date.now() + 30 * 60 * 1000, duration: 30 })
                    },
                    {
                        label: "1 hour",
                        type: 'action',
                        action: () => setSleepTimer({ endTime: Date.now() + 60 * 60 * 1000, duration: 60 })
                    },
                    {
                        label: "End of Song",
                        type: 'action',
                        action: () => {
                            setSleepTimer(null);
                            setStopAtEndOfSong(true);
                        }
                    }
                ] as MenuItem[];



            case 'speed-settings':
                return ([0.5, 0.75, 1, 1.25, 1.5, 2] as const).map(speed => ({
                    label: `${speed}x${playbackSpeed === speed ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        setPlaybackSpeed(speed);
                        showToast(`Speed: ${speed}x`);
                    }
                })) as MenuItem[];

            case 'eq-settings': {
                const presets = eq.presets || ['Off', 'Bass Boost', 'Treble Boost', 'Vocal', 'Electronic', 'Acoustic', 'Late Night'];
                const currentPreset = eq.currentPreset || 'Off';
                return presets.map((preset: string) => ({
                    label: `${preset}${currentPreset === preset ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        eq.setPreset(preset);
                        showToast(`EQ: ${preset}`);
                    }
                })) as MenuItem[];
            }

            case 'playlists': {
                // Dynamic Playlists List — show On-the-Go if it has songs
                const otgMix = mixes.find(m => m.title === 'On-the-Go');
                const visibleMixes = mixes.filter(m => m.title !== "On-the-Go");

                const playlistItems: MenuItem[] = visibleMixes.map(mix => ({
                    label: mix.title,
                    type: 'navigation',
                    target: `mix-${mix.id}`,
                    data: mix.id
                }));
                // Show On-the-Go if it exists and has songs
                if (otgMix && otgMix.songs.length > 0) {
                    playlistItems.unshift({
                        label: `On-the-Go (${otgMix.songs.length})`,
                        type: 'navigation',
                        target: `mix-${otgMix.id}`,
                        data: otgMix.id
                    });
                }
                playlistItems.unshift({
                    label: "[Create New Tape]",
                    type: 'action',
                    action: () => createNewPlaylist()
                });
                return playlistItems;
            }

            case 'search':
                return currentView.staticItems || [];

            case 'liked-songs': {
                if (likedSongs.length === 0) {
                    return [{ label: "(No Liked Songs)", type: 'action', action: () => handleBack() }];
                }
                return likedSongs.map(s => ({
                    label: `♥ ${decodeHtml(s.name)}`,
                    type: 'action',
                    data: s,
                    action: () => playSongNow(s)
                })) as MenuItem[];
            }

            case 'recently-played': {
                if (recentlyPlayed.length === 0) {
                    return [{ label: "(No Recent Songs)", type: 'action', action: () => handleBack() }];
                }
                return recentlyPlayed.map(s => ({
                    label: decodeHtml(s.name),
                    type: 'action',
                    data: s,
                    action: () => playSongNow(s)
                })) as MenuItem[];
            }

            case 'artists': {
                const artists = new Set<string>();
                mixes
                    .filter(m => m.title !== "On-the-Go") // Exclude temporary queue
                    .forEach(m => m.songs.forEach(item => {
                        const s = ('song' in item ? item.song : item) as any;
                        // Split multiple artists and clean up
                        s?.primaryArtists?.split(',').forEach((a: string) => artists.add(a.trim()));
                    }));
                const sortedArtists = Array.from(artists).sort();

                if (sortedArtists.length === 0) return [{ label: "(No Artists Found)", type: 'action', action: () => handleBack() }];

                return sortedArtists.map(artist => ({
                    label: decodeHtml(artist),
                    type: 'navigation',
                    target: `artist-${artist}`,
                    data: artist
                })) as MenuItem[];
            }


            case 'cover-flow': {
                const userAlbums = getLibraryAlbums(mixes).map(a => ({
                    label: a.title,
                    type: 'action',
                    data: a
                })) as MenuItem[];

                // If user has music, show it. Otherwise show message.
                if (userAlbums.length > 0) return userAlbums;

                return [{
                    label: "No Music Added",
                    type: 'action',
                    action: () => alert("Use Search to add music first!")
                }];
            }

            case 'albums': {
                const albums = new Map<string, { id: string, name: string }>();
                mixes
                    .filter(m => m.title !== "On-the-Go") // Exclude temporary queue
                    .forEach(m => m.songs.forEach(item => {
                        const s = ('song' in item ? item.song : item) as any;
                        if (s.album?.id) {
                            albums.set(s.album.id, { id: s.album.id, name: s.album.name });
                        }
                    }));
                const sortedAlbums = Array.from(albums.values()).sort((a, b) => a.name.localeCompare(b.name));

                if (sortedAlbums.length === 0) return [{ label: "(No Albums Found)", type: 'action', action: () => handleBack() }];

                return sortedAlbums.map(album => ({
                    label: decodeHtml(album.name),
                    type: 'navigation',
                    target: `album-${album.id}`,
                    data: album
                })) as MenuItem[];
            }

            case 'songs': {
                // Songs View - Flat list of all songs from all mixes (EXCEPT On-the-Go/Queue)
                const allSongs = mixes
                    .filter(m => m.title !== "On-the-Go") // Exclude temporary queue
                    .flatMap(m => m.songs)
                    .map(item => ('song' in item ? item.song : item) as any);

                // Unique by ID
                const uniqueSongs = Array.from(new Map(allSongs.map(s => [s.id, s])).values())
                    .sort((a, b) => a.name.localeCompare(b.name));

                // Shuffle Action — play entire shuffled queue
                const shuffleAll = () => {
                    if (uniqueSongs.length === 0) return;
                    const shuffled = shuffleArray(uniqueSongs);
                    const shuffleMix: Mix = {
                        id: 'shuffle-all',
                        title: 'Shuffle All',
                        color: 'white',
                        songs: shuffled,
                        currentSongIndex: 0
                    };
                    playInstantMix(shuffleMix);
                    goToNowPlaying();
                };

                const items: MenuItem[] = uniqueSongs.map(s => ({
                    label: decodeHtml(s.name),
                    type: 'action',
                    data: s,
                    action: () => playSongNow(s)
                }));

                items.unshift({ label: "Shuffle All Songs", type: 'action', action: shuffleAll });

                if (items.length === 1) return [{ label: "(No Songs Found)", type: 'action', action: () => handleBack() }];

                return items as MenuItem[];
            }

            case 'rename':
                return [{ label: "Cancel", type: 'action', action: () => handleBack() }];

            case 'queue':
                // Current Queue View
                if (!queue || queue.length === 0) {
                    return [{ label: "(Queue Empty)", type: 'action', action: () => handleBack() }];
                }

                return queue.map((s, index) => {
                    const item: any = s;
                    const name = item.song?.name || item.name || 'Unknown';
                    return {
                        label: `${index === currentIndex ? '▶ ' : ''}${decodeHtml(name)}`,
                        type: 'action',
                        action: () => {
                            // If clicking current song, go to Now Playing
                            if (index === currentIndex) {
                                goToNowPlaying();
                            } else {
                                // Jump to that song in queue
                                // We need a way to skip to index. 
                                // Since updateMix handles index update:
                                if (activeMixId) {
                                    updateMix(activeMixId, { currentSongIndex: index });
                                }
                            }
                        }
                    };
                }) as MenuItem[];

            default:
                // Handle dynamic IDs
                if (currentView.id.startsWith('mix-')) {
                    const mixId = typeof currentView.data === 'object' ? currentView.data.id : currentView.data;
                    const mix = mixes.find(m => m.id === mixId) || (typeof currentView.data === 'object' ? currentView.data : null);

                    if (!mix) return [{ label: "(Playlist Deleted)", type: 'action', action: () => handleBack() }];

                    const songItems: MenuItem[] = mix.songs.map((item: JioSaavnSong | PlayableTrack, idx: number) => {
                        const s = ('song' in item ? item.song : item) as any;
                        return {
                            label: decodeHtml(s.name),
                            type: 'action',
                            data: s,
                            action: () => playMixSong(mix.id, idx)
                        }
                    });

                    songItems.push({
                        label: "[Share Playlist]",
                        type: 'action',
                        action: () => {
                            // Export this playlist as JSON
                            const playlistData = {
                                version: '2.0.0',
                                exportDate: new Date().toISOString(),
                                playlist: {
                                    id: mix.id,
                                    title: mix.title,
                                    color: mix.color,
                                    songs: mix.songs
                                }
                            };

                            const dataStr = JSON.stringify(playlistData, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${mix.title.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                            URL.revokeObjectURL(url);

                            showToast(`"${mix.title}" exported!`);
                        }
                    });
                    songItems.push({ label: "[Rename Playlist]", type: 'action', action: () => goToRename(mix) });
                    songItems.push({ label: "[Delete Playlist]", type: 'action', action: () => handleDeletePlaylist(mix.id) });
                    return songItems;
                }

                // Artist Drill-down (Root -> Albums)
                if (currentView.id.startsWith('artist-') && !currentView.id.includes('album-')) {
                    const artistName = currentView.id.replace('artist-', '');

                    // Find all songs by this artist (Excluding OTG)
                    const artistSongs = mixes
                        .filter(m => m.title !== "On-the-Go")
                        .flatMap(m => m.songs)
                        .map(item => ('song' in item ? item.song : item) as any)
                        .filter(s =>
                            s.primaryArtists.toLowerCase().includes(artistName.toLowerCase())
                        );

                    // Group by Album
                    const albums = new Map<string, { id: string, name: string }>();
                    artistSongs.forEach(s => {
                        if (s.album?.id) albums.set(s.album.id, { id: s.album.id, name: s.album.name });
                    });

                    // Menu Items
                    const albumItems: MenuItem[] = Array.from(albums.values())
                        .map(a => ({
                            label: decodeHtml(a.name),
                            type: 'navigation',
                            target: `album-${a.id}`, // Reuse Album view
                            data: a
                        }));

                    // "All Songs" option
                    albumItems.unshift({
                        label: "All Songs",
                        type: 'navigation',
                        target: `artist-allsongs-${artistName}`,
                        data: artistSongs
                    });

                    return albumItems as MenuItem[];
                }

                // Artist -> All Songs
                if (currentView.id.startsWith('artist-allsongs-')) {
                    const songs = currentView.data as any[];
                    return songs.map(s => ({
                        label: decodeHtml(s.name),
                        type: 'action',
                        data: s,
                        action: () => playSongNow(s)
                    })) as MenuItem[];
                }

                // Album Drill-down
                if (currentView.id.startsWith('album-')) {
                    const albumId = currentView.id.replace('album-', '');
                    const songs = mixes.flatMap(m => m.songs)
                        .map(item => ('song' in item ? item.song : item) as any)
                        .filter(s => s.album?.id === albumId);
                    const uniqueSongs = Array.from(new Map(songs.map(s => [s.id, s])).values());

                    return uniqueSongs.map(s => ({
                        label: decodeHtml(s.name),
                        type: 'action',
                        data: s,
                        action: () => playSongNow(s)
                    })) as MenuItem[];
                }

                // Song Options
                if (currentView.id.startsWith('song-')) {
                    const song = currentView.data as any;
                    return [
                        { label: "Play", type: 'action', action: () => playSongNow(song) },
                        { label: "Add to Playlist", type: 'navigation', target: `add-to-${song.id}`, data: song },
                        { label: "Cancel", type: 'action', action: () => handleBack() }
                    ] as MenuItem[];
                }

                // Add to Playlist Menu
                if (currentView.id.startsWith('add-to-')) {
                    const song = currentView.data as any;
                    return mixes
                        .filter(m => m.title !== "On-the-Go") // Don't allow adding to temporary queue
                        .map(mix => ({
                            label: mix.title,
                            type: 'action',
                            action: () => {
                                // Prevent Duplicates
                                if (mix.songs.some(s => s.id === song.id)) {
                                    // Go back 2 levels safely using functional update
                                    setViewStack(prev => prev.length > 2 ? prev.slice(0, -2) : prev.slice(0, 1));
                                    showToast("Already in playlist");
                                    return;
                                }

                                const newSongs = [...mix.songs, song];
                                updateMix(mix.id, { songs: newSongs });
                                // Go back 2 levels safely
                                setViewStack(prev => prev.length > 2 ? prev.slice(0, -2) : prev.slice(0, 1));
                                showToast(`Added to ${mix.title}`);
                            }
                        })) as MenuItem[];
                }

                return [];
        }
    }, [currentView.id, currentView.data, currentView.staticItems, mixes, volume, clickSounds, ipodTheme, shuffle, repeat, sleepTimer, clockTick]);

    // Debounced fetch for Cover Flow tracks
    useEffect(() => {
        if (currentView.viewType !== 'cover-flow') return;

        const albumData = currentMenuItems[currentView.selectedIndex]?.data;
        if (!albumData?.id) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const timer = setTimeout(async () => {
            if (signal.aborted) return;
            try {
                const songs = await getAlbumDetails(albumData.id);
                if (!signal.aborted) {
                    setCfTracks(songs);
                }
            } catch (e) {
                if (!signal.aborted) console.error("CF Fetch Error", e);
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [currentView.viewType, currentView.selectedIndex, currentMenuItems]);

    // Actions




    const handleRenameSubmit = useCallback((newName: string) => {
        const mixId = currentView.data;
        if (mixId && newName.trim()) {
            updateMix(mixId, { title: newName.trim() });
            handleBack(); // Exit rename view
        }
    }, [currentView.data, updateMix, handleBack]);





    const handleScroll = (direction: number) => {
        // Update Scroll Direction Ref for Animations
        scrollDirectionRef.current = direction > 0 ? 'right' : 'left';

        // Dispatch custom event for games/calendar/extras that listen independently
        window.dispatchEvent(new CustomEvent('ipod-scroll', { detail: direction }));

        // Volume Settings Screen
        if (currentView.id === 'volume-settings') {
            const newVol = Math.max(0, Math.min(1, volume + (direction * 0.05)));
            setVolume(newVol);
            saveSettings({ volume: newVol });
            return;
        }

        if (currentView.viewType === 'player' || currentView.viewType === 'cinema') {
            // Volume vs Scrub Control
            if (controlMode === 'seek') {
                // Scrubbing (Seek)
                if (duration > 0) {
                    const seekAmount = 5; // Seconds per scroll tick
                    const newTime = Math.max(0, Math.min(duration, (progress * duration) + (direction * seekAmount)));
                    seek(newTime);
                }
            } else {
                // Volume Control (Default)
                const newVol = Math.max(0, Math.min(1, volume + (direction * 0.05)));
                setVolume(newVol);
                saveSettings({ volume: newVol });
                // Flash volume overlay
                setShowVolumeOverlay(true);
                if (volumeOverlayTimer.current) clearTimeout(volumeOverlayTimer.current);
                volumeOverlayTimer.current = setTimeout(() => setShowVolumeOverlay(false), 1500);
            }
        } else if (currentView.viewType === 'cover-flow') {
            // Cover Flow has two scroll modes:
            // 1. Not flipped: scroll through albums
            // 2. Flipped: scroll through tracks

            if (currentView.isFlipped) {
                // Navigate through tracks in the flipped album
                const activeAlbum = currentMenuItems[currentView.selectedIndex]?.data;
                if (!activeAlbum?.songs) return;

                const songs = activeAlbum.songs;
                const currentTrackIndex = currentView.trackIndex || 0;

                let newTrackIndex = currentTrackIndex + direction;
                // Wrap around
                if (newTrackIndex < 0) newTrackIndex = songs.length - 1;
                if (newTrackIndex >= songs.length) newTrackIndex = 0;

                setViewStack(prev => {
                    const newStack = [...prev];
                    const active = newStack[newStack.length - 1];
                    newStack[newStack.length - 1] = { ...active, trackIndex: newTrackIndex };
                    return newStack;
                });
            } else {
                const items = currentMenuItems;
                const maxIndex = Math.max(0, items.length - 1);
                if (maxIndex === 0 && items.length === 0) return;

                let newIndex = currentView.selectedIndex + direction;
                if (newIndex < 0) newIndex = maxIndex;
                if (newIndex > maxIndex) newIndex = 0;

                setViewStack(prev => {
                    const newStack = [...prev];
                    const active = newStack[newStack.length - 1];
                    newStack[newStack.length - 1] = { ...active, selectedIndex: newIndex };
                    return newStack;
                });
            }
        } else {
            const items = currentMenuItems;
            const maxIndex = Math.max(0, items.length - 1);
            if (maxIndex === 0 && items.length === 0) return;

            let newIndex = currentView.selectedIndex + direction;
            // Clamp at ends (no wrap) for menus
            if (newIndex < 0) newIndex = 0;
            if (newIndex > maxIndex) newIndex = maxIndex;

            setViewStack(prev => {
                const newStack = [...prev];
                const active = newStack[newStack.length - 1];
                newStack[newStack.length - 1] = { ...active, selectedIndex: newIndex };
                return newStack;
            });
        }
    };

    const handleSearch = useCallback(async (query: string) => {
        // Validation moved to caller or handled here
        if (!query.trim()) return;

        // Don't rename here, rename is handled by submit handlers now.
        if (currentView.id === 'rename') return;

        setIsLoading(true);
        try {
            // Updated to Unified Search - map low qualities to '320' for search filter
            const searchQuality = (qualityPreference === '160' || qualityPreference === '96') ? '320' : qualityPreference;
            const results = await searchUnified(query, undefined, 'song', searchQuality as any);
            const songItems: MenuItem[] = results.map((track: PlayableTrack) => {
                // Determine best badge for UI
                let badge: string | undefined = undefined;
                let sourceProvider: string = 'jiosaavn';

                // Check highest quality source
                if (track.sources.some(s => s.quality === 'hires')) {
                    badge = '24-bit';
                    sourceProvider = 'qobuz';
                } else if (track.sources.some(s => s.quality === 'flac')) {
                    badge = 'FLAC';
                    sourceProvider = 'qobuz';
                } else if (track.sources.some(s => s.quality === '320')) {
                    badge = '320kbps';
                }

                const isTidal = track.sources.some(s => s.provider === 'tidal');

                // Inject metadata for IpodScreen badges
                const shimmedData = {
                    ...track,
                    name: track.song?.name,
                    primaryArtists: track.song?.primaryArtists,
                    image: track.song?.image,
                    _quality: badge,
                    _qualityTier: badge === '24-bit' ? 0 : badge === 'FLAC' ? 1 : badge === '320kbps' ? 2 : 3,
                    source: isTidal ? 'tidal' : sourceProvider
                };

                return {
                    label: decodeHtml(track.song?.name || "Unknown"),
                    type: 'action',
                    action: () => {
                        const isHiRes = badge === '24-bit' || badge === 'FLAC';
                        playSongNow(track, isHiRes);
                    },
                    data: shimmedData
                };
            });

            setViewStack(prev => {
                // GUARD: If user navigated away, don't update stack (Fixes Freeze/Crash)
                const current = prev[prev.length - 1];
                if (current.viewType !== 'search') return prev;

                const newStack = [...prev];
                const active = newStack[newStack.length - 1];
                // Only update items, query is already updated by input handler
                if (active.viewType === 'search') {
                    newStack[newStack.length - 1] = { ...active, staticItems: songItems };
                }
                return newStack;
            });
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsLoading(false);
        }
    }, [currentView.id, handleRenameSubmit, setIsLoading, setViewStack, inputRef, playSongNow, registerActivity]);




    const handleLongSelect = useCallback(() => {
        registerActivity();
        const item = currentMenuItems[currentView.selectedIndex];
        let songToAdd: JioSaavnSong | null = null;

        if (currentView.viewType === 'player' && currentSong) {
            // Context Menu Logic
            const song = currentSong;
            const contextMenu: MenuItem[] = [
                {
                    label: "Add to On-the-Go",
                    type: 'action',
                    action: () => {
                        let otg = mixes.find(m => m.title === "On-the-Go");
                        if (!otg) {
                            const newOtg: Mix = { id: 'otg-temp', title: "On-the-Go", color: "white", songs: [song], currentSongIndex: 0 };
                            addMix(newOtg);
                        } else {
                            updateMix(otg.id, { songs: [...otg.songs, song] });
                        }
                        handleBack(); // Close menu
                        showToast("Added to On-the-Go");
                    }
                },
                {
                    label: "Add to Playlist...",
                    type: 'navigation',
                    target: `add-to-${song.id}`,
                    data: song
                },
                {
                    label: "Show Lyrics",
                    type: 'action',
                    action: () => {
                        handleShowLyrics(song);
                        handleBack(); // Close menu
                    }
                },
                {
                    label: `Shuffle: ${shuffle ? 'On' : 'Off'}`,
                    type: 'action',
                    action: () => {
                        setShuffle(!shuffle);
                        handleBack();
                        showToast(`Shuffle ${!shuffle ? 'On' : 'Off'}`);
                    }
                },
                {
                    label: `Repeat: ${repeat === 'off' ? 'Off' : repeat === 'one' ? 'One' : 'All'}`,
                    type: 'action',
                    action: () => {
                        const modes: ('off' | 'one' | 'all')[] = ['off', 'all', 'one'];
                        const idx = modes.indexOf(repeat);
                        const next = modes[(idx + 1) % modes.length];
                        setRepeat(next);
                        handleBack();
                        showToast(`Repeat: ${next === 'off' ? 'Off' : next === 'one' ? 'One' : 'All'}`);
                    }
                },
                {
                    label: isDownloaded(song.id) ? "✓ Downloaded" : "Download",
                    type: 'action',
                    action: async () => {
                        if (isDownloaded(song.id)) {
                            handleBack();
                            showToast("Already downloaded");
                            return;
                        }
                        handleBack();
                        showToast("Downloading...");
                        const ok = await downloadSong(song);
                        showToast(ok ? "Downloaded!" : "Download failed");
                    }
                },
                {
                    label: "Cancel",
                    type: 'action',
                    action: () => handleBack()
                }
            ];

            setViewStack(prev => [...prev, {
                id: 'context-menu',
                title: cleanTrackTitle(song.name),
                viewType: 'menu',
                selectedIndex: 0,
                staticItems: contextMenu
            }]);
            return;

        } else if (item?.data?.id) {
            // Check if it's a song data item
            songToAdd = item.data;
        }

        if (songToAdd) {
            let otg = mixes.find(m => m.title === "On-the-Go");
            if (!otg) {
                const newOtg: Mix = {
                    id: 'otg-temp',
                    title: "On-the-Go",
                    color: "white",
                    songs: [songToAdd],
                    currentSongIndex: 0
                };
                addMix(newOtg);
            } else {
                updateMix(otg.id, { songs: [...otg.songs, songToAdd] });
            }
            showToast("Added to On-the-Go");
        }
    }, [currentMenuItems, currentView, currentSong, mixes, addMix, updateMix, registerActivity, handleShowLyrics, showToast]);

    const handleSelect = useCallback((indexOverride?: number) => {
        registerActivity();

        // Dispatch custom event for games/calendar/extras that listen independently
        window.dispatchEvent(new CustomEvent('ipod-select'));

        // Special handling for Player View: Toggle Scrub/Volume
        if (currentView.viewType === 'player' || currentView.viewType === 'cinema') {
            if (controlMode === 'volume') {
                setControlMode('seek');
            } else {
                setControlMode('volume');
            }
            return;
        }

        // Special handling for Cover Flow
        if (currentView.viewType === 'cover-flow') {
            if (currentView.isFlipped) {
                // Play selected track from the flipped album
                const trackIndex = currentView.trackIndex || 0;

                // Prioritize fetched tracks (Hi-Res/Details)
                if (cfTracks.length > 0 && cfTracks[trackIndex]) {
                    const song = cfTracks[trackIndex];
                    const isHiRes = (song as any).quality === 'FLAC' || (song as any)._quality === 'FLAC';
                    playSongNow(song, isHiRes || true);
                } else {
                    // Fallback to local album data if available
                    const activeAlbum = currentMenuItems[currentView.selectedIndex]?.data;
                    if (activeAlbum?.songs && activeAlbum.songs[trackIndex]) {
                        playSongNow(activeAlbum.songs[trackIndex]);
                    }
                }
            } else {
                // Flip Album
                setViewStack(prev => {
                    const newStack = [...prev];
                    const active = newStack[newStack.length - 1];
                    newStack[newStack.length - 1] = { ...active, isFlipped: true, trackIndex: 0 };
                    return newStack;
                });
            }
            if (clickSounds) playClick();
            return;
        }

        // 2. Normal Menu Handling
        const selectedIdx = indexOverride ?? currentView.selectedIndex;
        const item = currentMenuItems[selectedIdx];
        if (!item) return;

        if (clickSounds) playClick();

        // Special handling for Cinema Mode, Cover Flow and Now Playing from MAIN_MENU
        if (currentView.id === 'rename') {
            handleRenameSubmit(currentView.searchQuery || "");
            return;
        }

        if (item.data?.id === 'cinema') {
            setViewStack(prev => [...prev, { id: 'cinema', title: 'Cinema Mode', viewType: 'cinema', selectedIndex: 0 }]);
        } else if (item.data?.id === 'cover-flow') {
            const albums = getLibraryAlbums(mixes);
            // Find index of current song's album
            const index = currentSong?.album?.id ? albums.findIndex(a => a.id === currentSong.album.id) : 0;
            setViewStack(prev => [...prev, { id: 'cover-flow', title: 'Cover Flow', viewType: 'cover-flow', selectedIndex: index >= 0 ? index : 0 }]);
        } else if (item.data?.id === 'sticker-collection') {
            setViewStack(prev => [...prev, { id: 'stickers', title: 'Stickers', viewType: 'stickers', selectedIndex: 0 }]);
        } else if (item.data?.id === 'now-playing') {
            goToNowPlaying();
        } else if (item.data?.id === 'lyrics') {
            if (!currentSong) {
                showToast("No song playing!");
                return;
            }
            handleShowLyrics(currentSong);
        } else if (item.action) {
            item.action();
        } else if (item.type === 'navigation' && item.target) {
            handleNavigation(item.target, item.data, item.label);
        }
    }, [currentView, controlMode, currentMenuItems, mixes, currentSong, playSongNow, goToNowPlaying, handleNavigation, cfTracks, clickSounds, playClick, registerActivity, handleShowLyrics]);

    // Global Wheel Handler (For Scrolling over Screen)
    const handleGlobalWheel = (e: React.WheelEvent) => {
        if (isLocked) return;

        const DELTA_THRESHOLD = 50; // Sensitivity
        accumulatedWheelDelta.current += e.deltaY;

        if (Math.abs(accumulatedWheelDelta.current) > DELTA_THRESHOLD) {
            const direction = accumulatedWheelDelta.current > 0 ? 1 : -1;
            handleScroll(direction);

            // Audio Feedback
            if (clickSounds) playScroll();

            accumulatedWheelDelta.current = 0;
        }
    };

    // Refs for resize handler to avoid constant re-registration
    const viewStackRef = useRef(viewStack);
    const mixesRef = useRef(mixes);
    const currentSongRef = useRef(currentSong);
    useEffect(() => { viewStackRef.current = viewStack; }, [viewStack]);
    useEffect(() => { mixesRef.current = mixes; }, [mixes]);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    // Auto-Rotation for Cover Flow
    useEffect(() => {
        const handleResize = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            const currentId = viewStackRef.current[viewStackRef.current.length - 1]?.id;

            if (isLandscape) {
                const compatibleViews = ['main', 'music', 'extras', 'settings', 'playlists', 'artists', 'albums', 'now-playing'];
                if (compatibleViews.includes(currentId)) {
                    const albums = getLibraryAlbums(mixesRef.current);
                    const song = currentSongRef.current;
                    const index = song?.album?.id ? albums.findIndex(a => a.id === song.album.id) : 0;

                    setViewStack(prev => [...prev, {
                        id: 'cover-flow',
                        title: 'Cover Flow',
                        viewType: 'cover-flow',
                        selectedIndex: index >= 0 ? index : 0
                    }]);
                }
            } else {
                if (currentId === 'cover-flow') {
                    handleBack();
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleBack]); // handleBack is stable (useCallback with [])



    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isLocked) return;

            switch (event.key) {
                case 'ArrowUp':
                    handleScroll(-1);
                    break;
                case 'ArrowDown':
                    handleScroll(1);
                    break;
                case 'Enter':
                    handleSelect();
                    break;
                case 'Backspace':
                    handleBack();
                    break;
                case ' ': // Spacebar for Play/Pause
                    event.preventDefault(); // Prevent scrolling
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    prev();
                    break;
                case 'ArrowRight':
                    next();
                    break;
                case 'Escape': // Escape for Back
                    handleBack();
                    break;
                case 'm': // 'm' for Menu (Back)
                    handleBack();
                    break;
                case 'p': // 'p' for Play/Pause
                    togglePlay();
                    break;
                case 'n': // 'n' for Next
                    next();
                    break;
                case 'b': // 'b' for Previous
                    prev();
                    break;
                case 's': // 's' for Select
                    handleSelect();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLocked, handleScroll, handleSelect, handleBack, togglePlay, prev, next]);


    // Theme-based styling
    const getThemeClasses = () => {
        switch (ipodTheme) {
            case 'black':
                // Glossy Black (U2 / Video)
                return 'bg-gradient-to-b from-[#2a2a2a] via-[#111] to-[#050505] border-[#1a1a1a] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]';
            case 'silver':
                // EXACT MATCH: Modern iPod Silver Aluminum Edition
                return 'bg-gradient-to-br from-[#e5e7eb] via-[#d1d5db] to-[#9ca3af] border-[#e5e7eb] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]';
            case 'blue':
                // iPod Mini Blue Edition
                return 'bg-[linear-gradient(to_right,#0a4da5_0%,#1676f3_15%,#2b87ff_50%,#1676f3_85%,#0a4da5_100%)] border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_40px_rgba(0,0,0,0.3)]';
            case 'rosegold':
                // Rose Gold Luxury Edition
                return 'bg-[linear-gradient(135deg,#f4d0c5_0%,#e5b1a3_25%,#f9e3dc_45%,#d49a89_65%,#e5b1a3_100%)] bg-[length:200%_200%] border-white/30 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),inset_0_1px_3px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(0,0,0,0.3)]';
            case 'blush':
                // Floral Blush iPod Edition
                return 'bg-[#f9dce7] border-white/40 border-[8px] shadow-2xl shadow-[inset_0_0_40px_rgba(242,54,132,0.1),0_10px_30px_rgba(0,0,0,0.05)]';
            case 'dark':
                // Modern Matte Dark - Deep and flat
                return 'bg-[#101922] border-[#1e2329] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.05)]';
            case 'classic':
            default:
                // Classic Polycarbonate White (Glossy) - Clean ceramic look
                return 'bg-gradient-to-b from-[#ffffff] via-[#f5f5f5] to-[#e8e8e8] border-[#dcdcdc] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)]';
        }
    };

    const getScreenClasses = () => {
        switch (ipodTheme) {
            case 'blue':
                return 'border-[#083a7a] bg-[#bcd4e6] shadow-[inset_2px_2px_10px_rgba(0,0,0,0.2)]';
            case 'rosegold':
                return 'border-none bg-black shadow-[inset_0_2px_15px_rgba(0,0,0,0.3)]';
            case 'blush':
                return 'border-white/30 bg-white/20 shadow-inner';
            case 'dark':
                return 'border-[#1e2329] bg-black shadow-inner';
            default:
                return 'border-[#333] bg-black shadow-inner';
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center select-none w-full h-[100dvh] overflow-hidden bg-black p-3 md:p-0 ${ipodTheme === 'blue' ? 'font-jakarta' : 'font-vietnam'}`}>
            {/* MAIN CONTAINER: Layout Wrapper */}
            <motion.div
                ref={iPodBodyRef}
                className="relative w-full h-full md:w-[370px] md:h-[640px] select-none touch-manipulation my-auto transition-all duration-500"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onWheel={handleGlobalWheel}
            >
                {/* 2. INNER MASK: The iPod Body (Clipped) */}
                <div
                    className={`absolute inset-0 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden z-0 pointer-events-none ${getThemeClasses()}`}
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Glass Glare Reflection */}
                    <div
                        className="absolute inset-0 md:rounded-[2.6rem] pointer-events-none z-50"
                        style={{
                            background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)'
                        }}
                    />

                    {/* Floral Decorations (Blush Theme Only) */}
                    {ipodTheme === 'blush' && (
                        <>
                            <div className="absolute top-0 left-0 w-32 h-32 opacity-60 pointer-events-none z-0">
                                <svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" fill="#f23684" fillOpacity="0.2" r="15"></circle>
                                    <circle cx="45" cy="15" fill="#f23684" fillOpacity="0.1" r="10"></circle>
                                    <circle cx="15" cy="45" fill="#f23684" fillOpacity="0.15" r="12"></circle>
                                </svg>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 rotate-90 opacity-60 pointer-events-none z-0">
                                <svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" fill="#f23684" fillOpacity="0.2" r="15"></circle>
                                    <circle cx="45" cy="15" fill="#f23684" fillOpacity="0.1" r="10"></circle>
                                    <circle cx="15" cy="45" fill="#f23684" fillOpacity="0.15" r="12"></circle>
                                </svg>
                            </div>
                            <div className="absolute bottom-[-10px] right-[-10px] w-24 h-24 rotate-180 opacity-40 pointer-events-none z-0">
                                <svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" fill="#f23684" fillOpacity="0.2" r="15"></circle>
                                    <circle cx="45" cy="15" fill="#f23684" fillOpacity="0.1" r="10"></circle>
                                </svg>
                            </div>
                        </>
                    )}

                    {/* Global Glass Reflection (Moved inside Mask) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none" />
                </div>

                {/* Toast Notification Overlay */}


                {/* Sticker Constraints Area (Hidden) - Only bottom 52% allowed */}
                <div ref={stickerConstraintsRef} className="absolute top-[48%] left-0 right-0 bottom-4 pointer-events-none z-0" />

                {/* Sticker Layer - Unmasked (Siblings to Body) - Z-Index 60 (Above Glass) */}
                <StickerLayer
                    stickers={stickers}
                    onUpdate={handleUpdateSticker}
                    onRemove={handleRemoveSticker}
                    isLocked={isLocked}
                    constraintsRef={stickerConstraintsRef}
                    iPodBodyRef={iPodBodyRef}
                    onNotify={showToast}
                />

                {/* Sticker Layer - Masked Container - REMOVED WRAPPER to prevent clipping */}
                {/* <div className="absolute inset-0 rounded-[2.6rem] overflow-hidden pointer-events-none z-[5]"> ... </div> */}
                {/* 3. EXTERNAL ELEMENTS (Unclipped) */}
                {/* Hold Switch Button */}
                {/* Hold Switch Button - Realistic Metallic Design */}
                <button
                    onClick={toggleLock}
                    className="absolute -top-[5px] right-6 w-10 h-[14px] rounded-full bg-gradient-to-b from-zinc-300 to-zinc-400 border border-zinc-500 shadow-[0_1px_3px_rgba(0,0,0,0.4)] flex items-center p-[1px] cursor-pointer z-30 overflow-hidden active:brightness-95 transition-all"
                    title={isLocked ? "Slide to Unlock" : "Hold Switch"}
                >
                    {/* Orange Underlay (Warning Color) */}
                    <div className={`absolute inset-0 bg-[#ff3b30] transition-opacity duration-300 ${isLocked ? 'opacity-100 w-full' : 'opacity-0'}`} />

                    {/* Metallic Toggle Nub */}
                    <div
                        className={`relative z-10 w-5 h-full rounded-full bg-gradient-to-b from-zinc-100 to-zinc-300 border border-zinc-400 shadow-sm transition-all duration-300 ease-out ${isLocked ? 'translate-x-[18px]' : 'translate-x-0'}`}
                    />
                </button>

                {/* 4. INTERFACE LAYER (Relative, on top) */}
                <div className="relative z-10 w-full h-full flex flex-col p-5 pointer-events-none">
                    {/* Screen Area (Top 48%) - Dynamic Border/Background */}
                    <div
                        className={`w-full h-[48%] rounded-lg border-[3px] mb-4 overflow-hidden relative z-10 pointer-events-auto ${getScreenClasses()}`}
                        onClick={() => {
                            // If in search mode, tapping screen focuses input
                            if (currentView.viewType === 'search') inputRef.current?.focus();
                        }}
                    >
                        <IpodScreen
                            variant={currentView.viewType || 'menu'}
                            lyrics={lyrics}
                            title={currentView.title}
                            menuItems={currentMenuItems.map(i => i.label)}
                            itemsData={currentView.staticItems ? currentView.staticItems : currentMenuItems.map(i => i.data)}
                            selectedIndex={currentView.selectedIndex}
                            currentSong={currentSong || undefined}
                            isPlaying={isPlaying}
                            progress={progress}
                            duration={duration}
                            isLoading={isLoading}
                            searchQuery={currentView.searchQuery}
                            inputRef={inputRef}
                            onPlayPause={togglePlay}
                            onBack={handleBack}
                            audioQuality={activeQuality || undefined}
                            onSearchChange={(q) => {
                                // 1. Immediate UI Update (Fixes Lag)
                                setViewStack(prev => {
                                    const newStack = [...prev];
                                    const active = newStack[newStack.length - 1];
                                    // Only update if changed to avoid ref thrashing
                                    if (active.searchQuery !== q) {
                                        newStack[newStack.length - 1] = { ...active, searchQuery: q };
                                    }
                                    return newStack;
                                });

                                // 2. Debounced API Call (Only if not Rename)
                                if (currentView.id !== 'rename') {
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                    searchTimeoutRef.current = setTimeout(() => {
                                        handleSearch(q);
                                    }, 500); // 500ms debounce
                                }
                            }}
                            onSearchSubmit={(q) => {
                                if (currentView.id === 'rename') {
                                    handleRenameSubmit(q);
                                } else {
                                    // Immediate trigger on Enter
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                    handleSearch(q);
                                }
                            }}
                            // Props continue below...
                            onItemSelect={(index) => {
                                if (isLocked) return;
                                // Update selection first, then delegate to unified handleSelect
                                setViewStack(prev => {
                                    const newStack = [...prev];
                                    const active = newStack[newStack.length - 1];
                                    newStack[newStack.length - 1] = { ...active, selectedIndex: index };
                                    return newStack;
                                });
                                handleSelect(index);
                            }}
                            isFlipped={currentView.isFlipped}
                            trackIndex={currentView.trackIndex}
                            layout={controlMode === 'volume' ? 'split' : 'full'}
                            controlMode={controlMode}
                            shuffle={shuffle}
                            repeat={repeat}
                            isLocked={isLocked}
                            scrollDirection={scrollDirectionRef.current}
                            externalTracks={cfTracks}
                            isLiked={currentSong ? isLiked(currentSong.id) : false}
                            onToggleLike={() => currentSong && toggleLike(currentSong)}
                            depth={viewStack.length}
                            onAddSticker={handleAddSticker}
                            isDownloaded={(id) => isDownloaded(id)}
                            volume={volume}
                            showVolumeOverlay={showVolumeOverlay}
                        />

                        {/* Render Game View if Active - Lazy loaded for performance */}
                        <Suspense fallback={null}>
                            {
                                currentView.id === 'game-brick' && (
                                    <div className="absolute inset-0 z-30 bg-black">
                                        <BrickGame onBack={handleBack} />
                                    </div>
                                )
                            }
                            {
                                currentView.id === 'game-music-quiz' && (
                                    <div className="absolute inset-0 z-30 bg-black">
                                        <MusicQuiz onBack={handleBack} />
                                    </div>
                                )
                            }
                            {
                                currentView.id === 'calendar' && (
                                    <div className="absolute inset-0 z-30 bg-white">
                                        <Calendar onBack={handleBack} />
                                    </div>
                                )
                            }
                        </Suspense>
                    </div>

                    {/* Modern Dynamic Notification System */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[280px] pointer-events-none">
                        <AnimatePresence>
                            {toastMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-3 overflow-hidden"
                                >
                                    {/* App Icon */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                                        <Music size={20} className="text-white fill-white/20" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">MELORA</span>
                                            <span className="text-[9px] text-white/30">now</span>
                                        </div>
                                        <span className="text-[12px] font-medium text-white leading-tight truncate w-full drop-shadow-sm pr-1">
                                            {toastMessage}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Branding */}
                    <div className="w-full flex justify-center items-center mb-6 relative z-10">
                        <span className={`text-[10px] font-bold tracking-[0.2em] font-sans ${ipodTheme === 'black' || ipodTheme === 'dark' ? 'text-white/20' : 'text-zinc-500/80'}`}>MELORA</span>
                    </div>

                    {/* Click Wheel Area (Bottom) - Remove pointer-events-auto from container to allow clicking stickers on sides */}
                    <div className="flex-1 w-full flex items-start justify-center relative z-10 pointer-events-none">
                        <div className="pointer-events-auto">
                            <ClickWheel
                                theme={ipodTheme}
                                enableSounds={clickSounds && !isLocked}
                                onScroll={(direction) => {
                                    if (isLocked) return;
                                    handleScroll(direction);
                                }}
                                onSelect={() => {
                                    if (isLocked) return;
                                    if (currentView.id === 'game-brick' || currentView.id === 'game-music-quiz') return; // Game handles clicks
                                    handleSelect();
                                }}
                                onLongSelect={() => {
                                    if (isLocked) return;
                                    handleLongSelect();
                                }}
                                onMenu={() => {
                                    if (isLocked) return;
                                    handleBack();
                                }}
                                onPlayPause={() => {
                                    if (isLocked) return;
                                    togglePlay();
                                }}
                                onNext={() => {
                                    if (isLocked) return;
                                    next();
                                }}
                                onPrev={() => {
                                    if (isLocked) return;
                                    prev();
                                }}
                            />
                        </div>
                    </div>

                    {/* Sticker Drawer (Overlay) */}


                </div>
            </motion.div>
        </div>
    );
}


