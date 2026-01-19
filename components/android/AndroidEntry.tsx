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
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong, getLyrics, getAlbumDetails } from "@/lib/jiosaavn";
import { searchUnified, GroupedSong } from "@/lib/unified-search";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { loadSettings, saveSettings, resetSettings, clearCache } from "@/lib/settings";
import { useDebounce } from "@/hooks/use-debounce";

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
    { label: "Search", type: 'navigation', target: 'search' }
];

const SYSTEM_MENU: MenuItem[] = [
    {
        label: "Backup Playlists",
        type: 'action',
        action: () => {
            alert('Backup functionality triggered.'); // Placeholder to be replaced by dynamic logic
        }
    },
    {
        label: "Clear Cache",
        type: 'action',
        action: () => {
            if (confirm('Clear all cached data? Settings will be preserved.')) {
                // clearCache(); imported
                // alert('Cache cleared successfully!');
            }
        }
    },
    {
        label: "Reset All Settings",
        type: 'action',
        action: () => {
            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                // resetSettings();
                // window.location.reload();
            }
        }
    }
];



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
    const {
        play, pause, togglePlay, next, prev,
        volume, setVolume,
        currentSong, isPlaying, progress, duration, seek,
        activeMixId, loadMix, updateMix, activeMix,
        mixes, addMix, deleteMix,
        shuffle, setShuffle, repeat, setRepeat,
        queue, currentIndex,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration,
        stopAtEndOfSong, setStopAtEndOfSong,
        bitrate, setBitrate, setForceLossless,
        likedSongs, toggleLike, isLiked, recentlyPlayed
    } = usePlayback();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStack, setViewStack] = useState<ViewState[]>([
        { id: 'main', title: "Melora", viewType: 'menu', selectedIndex: 0, staticItems: MAIN_MENU }
    ]);
    const [clickSounds, setClickSounds] = useState(true);
    const [ipodTheme, setIpodTheme] = useState<'classic' | 'black' | 'silver' | 'dark' | 'blue' | 'rosegold' | 'blush'>('classic');
    const [controlMode, setControlMode] = useState<'volume' | 'seek'>('volume');
    const [isLocked, setIsLocked] = useState(false); // Hold Switch state
    const inputRef = useRef<HTMLInputElement>(null);
    const stickerConstraintsRef = useRef<HTMLDivElement>(null);
    const iPodBodyRef = useRef<HTMLDivElement>(null);

    // Sticker State
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

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

    // Load stickers from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ipod_stickers_v2');
        if (saved) {
            try { setStickers(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, []);

    // Save stickers to localStorage
    useEffect(() => {
        localStorage.setItem('ipod_stickers_v2', JSON.stringify(stickers));
    }, [stickers]);

    // Add Sticker from Drawer
    const handleAddSticker = useCallback((type: StickerType, color: string) => {
        if (stickers.length >= 3) {
            showToast("No space left! Remove a sticker first.");
            return;
        }

        // Random Zone Logic (Wheel Sides or Chin)
        const zone = Math.random();
        let x, y;

        if (zone < 0.4) {
            // Left of Wheel
            x = 20 + Math.random() * 30;
            y = 400 + Math.random() * 100;
        } else if (zone < 0.8) {
            // Right of Wheel
            x = 280 + Math.random() * 30;
            y = 400 + Math.random() * 100;
        } else {
            // Chin Area - Keep safely inside constraints (Max Y ~570)
            x = 50 + Math.random() * 200;
            y = 530 + Math.random() * 30; // 530-560
        }

        const newSticker: Sticker = {
            id: Date.now() + Math.random(),
            type,
            x,
            y,
            rotation: Math.floor(Math.random() * 41) - 20,
            color,
            isResidue: false
        };
        setStickers(prev => [...prev, newSticker]);
        showToast("Sticker Added!");
    }, [stickers, showToast]);

    const handleUpdateSticker = useCallback((id: number, updates: Partial<Sticker>) => {
        setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, []);

    const handleRemoveSticker = useCallback((id: number) => {
        setStickers(prev => prev.filter(s => s.id !== id));
    }, []);

    const handleClearStickers = useCallback(() => {
        // "Cheat" clean - no residue
        // showToast("Cleaning all stickers...");
        setStickers([]);
        showToast("Case is shiny new!");
    }, [showToast]);

    // Activity & Backlight
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [backlight, setBacklight] = useState(1); // 0 (dim) to 1 (bright)

    useEffect(() => {
        const timeout = 10000; // 10 seconds to dim
        const interval = setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivity;
            if (timeSinceActivity > timeout) {
                setBacklight(Math.max(0, 1 - (timeSinceActivity - timeout) / 5000)); // Slowly dim over 5s
            } else {
                setBacklight(1);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [lastActivity]);

    const registerActivity = useCallback(() => {
        setLastActivity(Date.now());
        setBacklight(1);
    }, []);

    // Global Activity Listener for Backlight
    useEffect(() => {
        const handleInteraction = () => registerActivity();
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('click', handleInteraction);
        window.addEventListener('click', handleInteraction);

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('click', handleInteraction);
        };
    }, [registerActivity]);

    const playClick = useCallback(() => {
        if (clickSounds) {
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) return;

                // Resume or Create Context
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }

                const ctx = audioContextRef.current;

                if (ctx.state === 'suspended') {
                    ctx.resume();
                }

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                // Short, sharp tick
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.01);

                gain.gain.setValueAtTime(0.05, ctx.currentTime); // Low volume
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.01);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + 0.01);
            } catch (e) {
                // Ignore audio context errors
            }
        }
    }, [clickSounds]);

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
    }, [ipodTheme]);

    // Initial State


    // Derived state for current view
    const currentView = viewStack[viewStack.length - 1];

    // Cover Flow Logic: Fetch Tracks Hoisted
    const [cfTracks, setCfTracks] = useState<JioSaavnSong[]>([]);


    // Helper to get albums from Library (Shared logic)
    const getLibraryAlbums = (currentMixes: typeof mixes) => {
        const albumMap = new Map<string, any>();
        currentMixes
            .filter(m => m.title !== "On-the-Go") // Exclude temporary queue
            .forEach(m => m.songs.forEach(s => {
                if (!s.album?.id) return;

                if (!albumMap.has(s.album.id)) {
                    // Create Album Entry
                    const albumImage = s.image?.find((img: any) => img.quality === '500x500')?.link ||
                        s.image?.[0]?.link || '';
                    albumMap.set(s.album.id, {
                        id: s.album.id,
                        title: decodeHtml(s.album.name),
                        artist: decodeHtml(s.primaryArtists),
                        image: albumImage,
                        songs: []
                    });
                }
                // Add Song to Album
                const album = albumMap.get(s.album.id);
                if (!album.songs.some((existing: any) => existing.id === s.id)) {
                    album.songs.push({
                        id: s.id,
                        name: decodeHtml(s.name),
                        duration: s.duration,
                        image: s.image?.find((img: any) => img.quality === '500x500')?.link || s.image?.[0]?.link || '',
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
        // We need access to current state, but using functional updates or refs might be cleaner
        // However, viewStack is state.
        // To avoid stale closures without adding viewStack to dependency (which changes often),
        // we can use the callback form of setViewStack carefully,
        // BUT we need to check 'currentView'. which is derived from viewStack.

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
            // Native alert is acceptable here as Android interface uses them primarily
            alert("Maximum limit of 8 tapes reached. Please delete a tape.");
        }
    };

    const goToRename = (mix: Mix) => {
        setSearchQuery(mix.title); // Pre-fill with current name
        setViewStack(prev => [...prev, {
            id: 'rename',
            title: 'Rename Playlist',
            viewType: 'search', // Reuse search layout for input
            selectedIndex: 0,
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
    const playSongNow = useCallback((song: JioSaavnSong, isHiRes: boolean = false) => {
        if (isHiRes) {
            setForceLossless(true);
            console.log("[iPod] Forcing Hi-Res Lossless Mode");
        }

        // Find or Create On-the-Go Mix
        let otg = mixes.find(m => m.title === "On-the-Go");

        if (!otg) {
            console.log("[iPod] Creating On-the-Go mix for playback");
            const newOtg: Mix = {
                id: 'otg-temp',
                title: "On-the-Go",
                color: "white",
                songs: [song],
                currentSongIndex: 0
            };
            addMix(newOtg);
            loadMix(newOtg.id);
            // Immediately navigate after state update
            setTimeout(() => {
                play();
                goToNowPlaying();
            }, 100);
        } else {
            console.log("[iPod] Appending to On-the-Go mix");
            // Check if song already exists to avoid duplicates (optional, but good UX)
            // For now, allow duplicates as it's a queue
            const newSongs = [...otg.songs, song];
            updateMix(otg.id, { songs: newSongs, currentSongIndex: newSongs.length - 1 });
            loadMix(otg.id);
            play();
            goToNowPlaying();
        }
    }, [mixes, updateMix, loadMix, play, addMix, setForceLossless, goToNowPlaying]);


    // Compute Menu Items Dynamically based on Current View ID & Context
    // Memoized to prevent heavy recalculation on scroll (selectedIndex change)
    const currentMenuItems: MenuItem[] = useMemo(() => {
        if (currentView.staticItems) return currentView.staticItems;

        switch (currentView.id) {
            case 'music': return MUSIC_MENU;
            case 'extras': return [
                { label: "Clock", type: 'navigation', target: 'clock' },
                { label: "Calendar", type: 'navigation', target: 'calendar' },
                { label: "Games", type: 'navigation', target: 'games' },
                { label: "Themes", type: 'navigation', target: 'theme-settings' },
                { label: "Sticker Collection", type: 'action', data: { id: 'sticker-collection' } },
                { label: "Clean All Stickers (Cheat)", type: 'action', action: handleClearStickers },
                { label: "Switch to Studio Deck", type: 'action', action: () => onSwitchToDesktop && onSwitchToDesktop() },
                { label: "Switch to Discovery Mode", type: 'action', action: () => onSwitchToDesktop && onSwitchToDesktop('zen') }, // distinct from glass? logic says 'zen' or 'glass'
            ];
            case 'games': return GAMES_MENU;

            case 'about':
                const songCount = mixes.reduce((acc, m) => acc + m.songs.length, 0);
                return [
                    { label: "Melora iPod Classic", type: 'action', action: () => { } },
                    { label: `Songs: ${songCount}`, type: 'action', action: () => { } },
                    { label: "Capacity: 160 GB", type: 'action', action: () => { } },
                    { label: "Available: 159 GB", type: 'action', action: () => { } },
                    { label: "Version: 2.0.1", type: 'action', action: () => { } },
                    { label: "Serial: A8G9H2J3K4L5", type: 'action', action: () => { } }
                ] as MenuItem[];

            case 'clock':
                return [
                    { label: new Date().toLocaleTimeString(), type: 'action', action: () => { } },
                    { label: new Date().toLocaleDateString(), type: 'action', action: () => { } }
                ] as MenuItem[];

            case 'calendar':
                // Handled by custom view overlay
                return [] as MenuItem[];

            case 'settings':
                // Structured Settings Menu
                return [
                    {
                        label: `Audio Quality: ${bitrate === 'flac' ? 'Lossless' : bitrate + 'kbps'}`,
                        type: 'navigation',
                        target: 'quality-settings'
                    },
                    {
                        label: `Crossfade: ${crossfadeDuration === 0 ? 'Off' : crossfadeDuration + 's'}`,
                        type: 'navigation',
                        target: 'crossfade'
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
                        label: "Backup Playlists",
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

                            alert('Playlists exported successfully!');
                        }
                    },
                    {
                        label: "Clear Cache",
                        type: 'action',
                        action: () => {
                            if (confirm('Clear all cached data? Settings will be preserved.')) {
                                clearCache();
                                alert('Cache cleared successfully!');
                            }
                        }
                    },
                    {
                        label: "Reset All Settings",
                        type: 'action',
                        action: () => {
                            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                                resetSettings();
                                window.location.reload();
                            }
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
                const qualities = ['flac', '320', '160', '96', '48', '12'] as const;
                return qualities.map(q => ({
                    label: `${q === 'flac' ? 'Lossless (FLAC)' : q + ' kbps'} ${q === '320' ? '(High)' : ''}${bitrate === q ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        setBitrate(q);
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

            case 'crossfade':
                return [
                    {
                        label: crossfadeDuration === 0 ? "✓ Off" : "Off",
                        type: 'action',
                        action: () => setCrossfadeDuration(0)
                    },
                    {
                        label: crossfadeDuration === 3 ? "✓ 3 seconds" : "3 seconds",
                        type: 'action',
                        action: () => setCrossfadeDuration(3)
                    },
                    {
                        label: crossfadeDuration === 5 ? "✓ 5 seconds" : "5 seconds",
                        type: 'action',
                        action: () => setCrossfadeDuration(5)
                    }
                ] as MenuItem[];

            case 'playlists':
                // Dynamic Playlists List
                // Filter out "On-the-Go" from the visible list
                const visibleMixes = mixes.filter(m => m.title !== "On-the-Go");

                const playlistItems: MenuItem[] = visibleMixes.map(mix => ({
                    label: mix.title,
                    type: 'navigation',
                    target: `mix-${mix.id}`,
                    data: mix.id
                }));
                playlistItems.unshift({
                    label: "[Create New Playlist]",
                    type: 'action',
                    action: () => createNewPlaylist()
                });
                return playlistItems;

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
                    .forEach(m => m.songs.forEach(s => {
                        // Split multiple artists and clean up
                        s.primaryArtists.split(',').forEach(a => artists.add(a.trim()));
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
                    .forEach(m => m.songs.forEach(s => {
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
                    .flatMap(m => m.songs);

                // Unique by ID
                const uniqueSongs = Array.from(new Map(allSongs.map(s => [s.id, s])).values())
                    .sort((a, b) => a.name.localeCompare(b.name));

                // Shuffle Action
                const shuffleAll = () => {
                    const shuffled = [...uniqueSongs].sort(() => Math.random() - 0.5);
                    // We need a mechanism to play a dynamic queue. 
                    // reusing OTG for now or forcing play
                    playSongNow(shuffled[0]); // Simple "Play first", technically queue should update
                    // ideally we update the "context" to be these shuffled songs.
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

                return queue.map((s, index) => ({
                    label: `${index === currentIndex ? '▶ ' : ''}${decodeHtml(s.name)}`,
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
                })) as MenuItem[];

            default:
                // Handle dynamic IDs
                if (currentView.id.startsWith('mix-')) {
                    const mixId = typeof currentView.data === 'object' ? currentView.data.id : currentView.data;
                    const mix = mixes.find(m => m.id === mixId) || (typeof currentView.data === 'object' ? currentView.data : null);

                    if (!mix) return [{ label: "(Playlist Deleted)", type: 'action', action: () => handleBack() }];

                    const songItems: MenuItem[] = mix.songs.map((s: JioSaavnSong, idx: number) => ({
                        label: decodeHtml(s.name),
                        type: 'action',
                        data: s,
                        action: () => playMixSong(mix.id, idx)
                    }));

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

                            alert(`"${mix.title}" exported successfully!`);
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
                    const songs = currentView.data as JioSaavnSong[];
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
                    const songs = mixes.flatMap(m => m.songs).filter(s => s.album?.id === albumId);
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
                    const song = currentView.data as JioSaavnSong;
                    return [
                        { label: "Play", type: 'action', action: () => playSongNow(song) },
                        { label: "Add to Playlist", type: 'navigation', target: `add-to-${song.id}`, data: song },
                        { label: "Cancel", type: 'action', action: () => handleBack() }
                    ] as MenuItem[];
                }

                // Add to Playlist Menu
                if (currentView.id.startsWith('add-to-')) {
                    const song = currentView.data as JioSaavnSong;
                    return mixes
                        .filter(m => m.title !== "On-the-Go") // Don't allow adding to temporary queue
                        .map(mix => ({
                            label: mix.title,
                            type: 'action',
                            action: () => {
                                // Prevent Duplicates
                                if (mix.songs.some(s => s.id === song.id)) {
                                    handleBack();
                                    handleBack();
                                    return;
                                }

                                const newSongs = [...mix.songs, song];
                                updateMix(mix.id, { songs: newSongs });
                                // Go back twice
                                handleBack();
                                handleBack();
                            }
                        })) as MenuItem[];
                }

                return [];
        }
    }, [currentView.id, currentView.data, currentView.staticItems, mixes, volume, clickSounds, ipodTheme, shuffle, repeat, sleepTimer, crossfadeDuration]);

    // Debounced fetch for Cover Flow tracks
    useEffect(() => {
        if (currentView.viewType === 'cover-flow') {
            const albumData = currentMenuItems[currentView.selectedIndex]?.data;
            if (albumData?.id) {
                const timer = setTimeout(async () => {
                    try {
                        const songs = await getAlbumDetails(albumData.id);
                        setCfTracks(songs);
                    } catch (e) {
                        console.error("CF Fetch Error", e);
                    }
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentView.viewType, currentView.selectedIndex, currentMenuItems]);

    // Actions




    const handleRenameSubmit = (newName: string) => {
        const mixId = currentView.data;
        if (mixId && newName.trim()) {
            updateMix(mixId, { title: newName.trim() });
            handleBack(); // Exit rename view
        }
    };





    const handleScroll = (direction: number) => {
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
            if (newIndex < 0) newIndex = maxIndex;
            if (newIndex > maxIndex) newIndex = 0;

            setViewStack(prev => {
                const newStack = [...prev];
                const active = newStack[newStack.length - 1];
                newStack[newStack.length - 1] = { ...active, selectedIndex: newIndex };
                return newStack;
            });
        }
    };

    const handleSearch = useCallback(async (query: string) => {
        // Reuse for Rename Logic
        if (currentView.id === 'rename') {
            handleRenameSubmit(query);
            return;
        }

        if (!query.trim()) return;
        setIsLoading(true);
        try {
            // Updated to Unified Search
            const results = await searchUnified(query, 'song');
            const songItems: MenuItem[] = results.map((group: GroupedSong) => {
                const bestQ = group.bestQuality;
                const bestSong = group.qualities[bestQ as keyof typeof group.qualities] as JioSaavnSong;

                // Inject the quality into the song object so it's accessible during playback and in UI
                const songWithMeta = {
                    ...bestSong,
                    _quality: bestQ,
                    _qualityTier: bestQ === '24-bit' ? 0 : bestQ === 'FLAC' ? 1 : bestQ === '320kbps' ? 2 : 3,
                    source: group.source // Critical for playback provider
                };

                return {
                    label: decodeHtml(group.name),
                    type: 'action',
                    action: () => {
                        const isHiRes = bestQ === '24-bit' || bestQ === 'FLAC' || group.source === 'tidal';
                        playSongNow(songWithMeta as any, isHiRes);
                    },
                    data: songWithMeta
                };
            });

            setViewStack(prev => {
                const newStack = [...prev];
                const active = newStack[newStack.length - 1];
                if (active.viewType === 'search') {
                    newStack[newStack.length - 1] = { ...active, staticItems: songItems, searchQuery: query };
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
                        alert("Added to On-the-Go");
                    }
                },
                {
                    label: "Add to Playlist...",
                    type: 'navigation',
                    target: 'playlists' // Simplistic fallback for now, ideally shows playlist picker
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
            alert("Added to On-the-Go");
        }
    }, [currentMenuItems, currentView, currentSong, mixes, addMix, updateMix, registerActivity]);

    const handleSelect = useCallback(() => {
        registerActivity();
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
        const item = currentMenuItems[currentView.selectedIndex];
        if (!item) return;

        if (clickSounds) playClick();

        // Special handling for Cinema Mode, Cover Flow and Now Playing from MAIN_MENU
        if (item.data?.id === 'cinema') {
            setViewStack(prev => [...prev, { id: 'cinema', title: 'Cinema Mode', viewType: 'cinema', selectedIndex: 0 }]);
        } else if (item.data?.id === 'cover-flow') {
            const albums = getLibraryAlbums(mixes);
            // Find index of current song's album
            const index = currentSong?.album?.id ? albums.findIndex(a => a.id === currentSong.album.id) : 0;
            setViewStack(prev => [...prev, { id: 'cover-flow', title: 'Cover Flow', viewType: 'cover-flow', selectedIndex: index >= 0 ? index : 0 }]);
        } else if (item.data?.id === 'now-playing') {
            goToNowPlaying();
        } else if (item.data?.id === 'lyrics') {
            if (!currentSong) {
                alert("No song playing!");
                return;
            }
            setIsLoading(true);
            getLyrics(currentSong.id).then(lyrics => {
                setIsLoading(false);
                setViewStack(prev => [...prev, {
                    id: 'lyrics',
                    title: 'Lyrics',
                    viewType: 'lyrics',
                    selectedIndex: 0,
                    data: {
                        id: 'lyrics',
                        message: lyrics || "No lyrics found."
                    }
                }]);
            });
        } else if (item.action) {
            item.action();
        } else if (item.type === 'navigation' && item.target) {
            handleNavigation(item.target, item.data, item.label);
        }
    }, [currentView, controlMode, currentMenuItems, mixes, currentSong, playSongNow, goToNowPlaying, handleNavigation, cfTracks, clickSounds, playClick, registerActivity]);


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
        <div className={`flex flex-col items-center justify-center select-none w-full h-full min-h-screen ${ipodTheme === 'blue' ? 'font-jakarta' : 'font-vietnam'}`}>
            {/* MAIN CONTAINER: Layout Wrapper */}
            <motion.div
                ref={iPodBodyRef}
                className="relative w-[370px] h-[640px] select-none touch-manipulation my-auto transition-all duration-500"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* 2. INNER MASK: The iPod Body (Clipped) */}
                <div
                    className={`absolute inset-0 rounded-[3rem] overflow-hidden z-0 pointer-events-none ${getThemeClasses()}`}
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
                        className="absolute inset-0 rounded-[2.6rem] pointer-events-none z-50"
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
                <button
                    onClick={() => setIsLocked(!isLocked)}
                    className="absolute -top-1 right-8 w-10 h-3 rounded-full bg-zinc-700/80 border border-zinc-600 flex items-center px-0.5 cursor-pointer z-20 shadow-inner"
                    title={isLocked ? "Slide to Unlock" : "Hold Switch"}
                >
                    <div
                        className={`w-4 h-2 rounded-full transition-all duration-200 ${isLocked ? 'ml-auto bg-orange-500' : 'ml-0 bg-zinc-400'}`}
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
                            title={currentView.title}
                            menuItems={currentMenuItems.map(i => i.label)}
                            itemsData={currentMenuItems}
                            selectedIndex={currentView.selectedIndex}
                            currentSong={currentSong}
                            isPlaying={isPlaying}
                            progress={progress}
                            duration={duration}
                            isLoading={isLoading}
                            message={currentView.data?.message || ''}
                            isFlipped={currentView.isFlipped}
                            customHeader={currentView.customHeader}
                            searchQuery={currentView.viewType === 'search' ? currentView.searchQuery : undefined}
                            // Pass handlers for real input
                            onSearchChange={(val) => {
                                setSearchQuery(val);
                                // Sync to viewstack for persistence if needed
                                setViewStack(prev => {
                                    const newStack = [...prev];
                                    newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], searchQuery: val };
                                    return newStack;
                                });
                            }}
                            onSearchSubmit={(val) => handleSearch(val)}
                            inputRef={inputRef}
                            onAddSticker={handleAddSticker}
                            onItemSelect={(index) => {
                                if (isLocked) return;
                                setViewStack(prev => {
                                    const newStack = [...prev];
                                    newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], selectedIndex: index };
                                    return newStack;
                                });
                                setTimeout(() => {
                                    const item = currentMenuItems[index];

                                    // Special handling for Cover Flow Flip
                                    if (currentView.viewType === 'cover-flow') {
                                        setViewStack(prev => {
                                            const newStack = [...prev];
                                            const active = newStack[newStack.length - 1];
                                            newStack[newStack.length - 1] = { ...active, isFlipped: !active.isFlipped };
                                            return newStack;
                                        });
                                        return;
                                    }

                                    if (item) {
                                        // Special handling for Cinema Mode, Cover Flow and Now Playing from MAIN_MENU
                                        if (item.data?.id === 'cinema') {
                                            setViewStack(prev => [...prev, { id: 'cinema', title: 'Cinema Mode', viewType: 'cinema', selectedIndex: 0 }]);
                                        } else if (item.data?.id === 'cover-flow') {
                                            setViewStack(prev => [...prev, { id: 'cover-flow', title: 'Cover Flow', viewType: 'cover-flow', selectedIndex: 0 }]);
                                        } else if (item.data?.id === 'now-playing') {
                                            goToNowPlaying();
                                        } else if (item.data?.id === 'switch-studio') {
                                            if (onSwitchToDesktop) onSwitchToDesktop();
                                        } else if (item.data?.id === 'switch-discovery') {
                                            if (onSwitchToDesktop) onSwitchToDesktop('GLASS');
                                        } else if (item.data?.id === 'sticker-collection') {
                                            setViewStack(prev => [...prev, { id: 'sticker-collection', title: 'Stickers', viewType: 'stickers', selectedIndex: 0 }]);
                                        } else if (item.data?.id === 'brick-game') {
                                            setViewStack(prev => [...prev, { id: 'game-brick', title: 'Brick', viewType: 'loading', selectedIndex: 0 }]);
                                        } else if (item.data?.id === 'game-music-quiz') {
                                            setViewStack(prev => [...prev, { id: 'game-music-quiz', title: 'Music Quiz', viewType: 'loading', selectedIndex: 0 }]);
                                        } else if (item.action) {
                                            item.action();
                                        } else if (currentView.viewType === 'search') {
                                            // FIX: Absolute Playback Force for Search
                                            const song = item.data;
                                            if (song && song.id) {
                                                const q = (song as any)._quality;
                                                const isHiRes = q === '24-bit' || q === 'FLAC' || (song as any).source === 'tidal';
                                                playSongNow(song, isHiRes);
                                            }
                                        } else if (item.type === 'navigation' && item.target) {
                                            handleNavigation(item.target, item.data, item.label);
                                        }
                                    }
                                }, 0);
                            }}
                            onPlayPause={togglePlay}
                            controlMode={controlMode}
                            shuffle={shuffle}
                            repeat={repeat}
                            isLocked={isLocked}
                            onBack={handleBack}
                            // Pass hoisted tracks to Cover Flow
                            externalTracks={cfTracks}
                            // Now Playing enhancements
                            isLiked={currentSong ? isLiked(currentSong.id) : false}
                            onToggleLike={() => currentSong && toggleLike(currentSong)}
                            audioQuality={bitrate}
                            backlight={backlight}
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

                        {/* In-Screen Toast Notification */}
                        <AnimatePresence>
                            {toastMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -40, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="absolute top-2 left-1/2 -translate-x-1/2 w-[95%] bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-xl p-2.5 flex items-center gap-3 z-[50] pointer-events-none"
                                >
                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                                        <MessageSquare size={14} className="text-white fill-white/20" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                            MELORA <span className="text-zinc-600">•</span> NOW
                                        </span>
                                        <span className="text-[11px] font-medium text-white leading-tight truncate w-full drop-shadow-sm pr-1">
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


