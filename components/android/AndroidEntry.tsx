import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Games removed
// const BrickGame = lazy(() => import("./games/BrickGame").then(m => ({ default: m.BrickGame })));
// const MusicQuiz = lazy(() => import("./games/MusicQuiz").then(m => ({ default: m.MusicQuiz })));

// const GAMES_MENU: MenuItem[] = [
//     { label: "Brick", type: 'action', data: { id: 'brick-game', name: 'Brick' }, action: () => { } },
//     { label: "Music Quiz", type: 'action', data: { id: 'music-quiz', name: 'Music Quiz' }, action: () => { } }
// ];
import { ClickWheel } from "./ClickWheel";
import { IpodScreen } from "./IpodScreen";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong, searchSongs, getLyrics } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
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
    viewType: 'menu' | 'player' | 'search' | 'loading' | 'message' | 'cinema' | 'cover-flow' | 'lyrics';
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
    { label: "Settings", type: 'navigation', target: 'settings' },
    { label: 'Now Playing', type: 'action', data: { id: 'now-playing', name: 'Now Playing' } }
];

const MUSIC_MENU: MenuItem[] = [
    { label: "Playlists", type: 'navigation', target: 'playlists' },
    { label: "Search", type: 'navigation', target: 'search' },
    { label: "Artists", type: 'navigation', target: 'artists' },
    { label: "Albums", type: 'navigation', target: 'albums' },
    { label: "Songs", type: 'navigation', target: 'songs' },
    { label: "Songs", type: 'navigation', target: 'songs' },
    { label: "Current Queue", type: 'navigation', target: 'queue' },
    { label: "Lyrics", type: 'action', data: { id: 'lyrics', name: 'Lyrics' }, action: () => { } }, // Action handled in handleSelect
];



interface AndroidEntryProps {
    onSwitchToDesktop?: () => void;
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
        bitrate, setBitrate
    } = usePlayback();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStack, setViewStack] = useState<ViewState[]>([
        { id: 'main', title: "Melora", viewType: 'menu', selectedIndex: 0, staticItems: MAIN_MENU }
    ]);
    const [clickSounds, setClickSounds] = useState(true);
    const [ipodTheme, setIpodTheme] = useState<'classic' | 'black' | 'silver' | 'dark' | 'blue' | 'rosegold' | 'blush'>('classic');
    const [controlMode, setControlMode] = useState<'volume' | 'seek'>('volume'); // Toggle for Player view
    const inputRef = useRef<HTMLInputElement>(null);

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
    const playSongNow = useCallback((song: JioSaavnSong) => {
        // Simplified: Add to On-the-Go and play it
        // Need access to 'mixes' and 'play' etc.
        // 'mixes' is from hook, 'play' is from hook.
        // If we don't include them in dep array, they might be stale?
        // usePlayback hook values ideally shouldn't change identity too often except simple values.
        // But 'mixes' might.

        // Ideally we shouldn't use useCallback here if dependencies change often, OR we accept it.
        // Re-creating this function is fine if it doesn't cause child re-renders.
        // But it's passed to map functions.
        const otg = mixes.find(m => m.title === "On-the-Go");
        if (otg) {
            updateMix(otg.id, { songs: [song], currentSongIndex: 0 });
            loadMix(otg.id);
            play();
            // We can't call goToNowPlaying() here if it's memoized without adding it to deps
            setViewStack(prev => [...prev, { id: 'now-playing', title: 'Now Playing', viewType: 'player', selectedIndex: 0 }]);
        }
    }, [mixes, updateMix, loadMix, play]);


    // Compute Menu Items Dynamically based on Current View ID & Context
    // Memoized to prevent heavy recalculation on scroll (selectedIndex change)
    const currentMenuItems: MenuItem[] = useMemo(() => {
        if (currentView.staticItems) return currentView.staticItems;

        switch (currentView.id) {
            case 'music': return MUSIC_MENU;
            case 'games':
                return [] as MenuItem[]; // Games unavailable

            case 'settings':
                // Dynamic Settings Menu
                return [
                    {
                        label: `Volume: ${Math.round(volume * 100)}%`,
                        type: 'navigation',
                        target: 'volume-settings'
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
                        label: sleepTimer
                            ? `Sleep Timer: ${Math.ceil((sleepTimer.endTime - Date.now()) / 60000)}min`
                            : "Sleep Timer: Off",
                        type: 'navigation',
                        target: 'sleep-timer'
                    },
                    {
                        label: `Crossfade: ${crossfadeDuration === 0 ? 'Off' : crossfadeDuration + 's'}`,
                        type: 'navigation',
                        target: 'crossfade'
                    },
                    {
                        label: `iPod Theme`,
                        type: 'navigation',
                        target: 'theme-settings'
                    },
                    {
                        label: `Audio Quality: ${bitrate}kbps`,
                        type: 'navigation',
                        target: 'quality-settings'
                    },
                    ...(onSwitchToDesktop ? [{
                        label: "Switch to Studio Deck",
                        type: 'action',
                        action: onSwitchToDesktop
                    }] : []),
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
                const qualities = ['320', '160', '96', '48', '12'] as const;
                return qualities.map(q => ({
                    label: `${q} kbps ${q === '320' ? '(High)' : ''}${bitrate === q ? ' ✓' : ''}`,
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
                    newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], trackIndex: newTrackIndex };
                    return newStack;
                });
            } else {
                // Navigate through albums (existing logic)
                const items = currentMenuItems;
                const maxIndex = Math.max(0, items.length - 1);
                if (maxIndex === 0 && items.length === 0) return;

                let newIndex = currentView.selectedIndex + direction;
                if (newIndex < 0) newIndex = maxIndex;
                if (newIndex > maxIndex) newIndex = 0;

                setViewStack(prev => {
                    const newStack = [...prev];
                    newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], selectedIndex: newIndex };
                    return newStack;
                });
            }
        } else {
            // Use Computed Items for scrolling (Results or Menu)
            const items = currentMenuItems;
            const maxIndex = Math.max(0, items.length - 1);
            if (maxIndex === 0 && items.length === 0) return;

            let newIndex = currentView.selectedIndex + direction;
            if (newIndex < 0) newIndex = maxIndex;
            if (newIndex > maxIndex) newIndex = 0;

            setViewStack(prev => {
                const newStack = [...prev];
                newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], selectedIndex: newIndex };
                return newStack;
            });
        }
    };

    // --- Actions Actions ---

    // Updated Navigation Handler


    const handleSearch = useCallback(async (query: string) => {
        // Reuse for Rename Logic
        if (currentView.id === 'rename') {
            handleRenameSubmit(query);
            return;
        }

        if (!query.trim()) return;
        setIsLoading(true);
        try {
            const results = await searchSongs(query);
            const songItems: MenuItem[] = results.map((song: JioSaavnSong) => ({
                label: decodeHtml(song.name),
                type: 'navigation',
                target: `song-${song.id}`,
                data: song
            }));

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
            inputRef.current?.blur();
        }
    }, [currentView.id, handleRenameSubmit, setIsLoading, searchSongs, setViewStack, inputRef]);




    const handleSelect = useCallback(() => {
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
                const activeAlbum = currentMenuItems[currentView.selectedIndex]?.data;
                const trackIndex = currentView.trackIndex || 0;
                if (activeAlbum?.songs && activeAlbum.songs[trackIndex]) {
                    // Play whole album starting from track
                    // Need to construct a Mix object or just play list
                    // For now simplicity: just play song
                    // Ideally we should play context.
                    // Let's create a temporary mix for this album
                    const albumMixId = `album-${activeAlbum.title}`;
                    // Check if exists or create
                    // Simplified: Just play song
                    playSongNow(activeAlbum.songs[trackIndex]);
                }
            } else {
                // Flip the album
                setViewStack(prev => {
                    const newStack = [...prev];
                    const active = newStack[newStack.length - 1];
                    newStack[newStack.length - 1] = { ...active, isFlipped: !active.isFlipped, trackIndex: 0 };
                    return newStack;
                });
            }
            return;
        }

        // Default Menu Selection
        const selectedItem = currentMenuItems[currentView.selectedIndex];
        if (selectedItem) {
            // Special handling for Cinema Mode, Cover Flow and Now Playing from MAIN_MENU
            if (selectedItem.data?.id === 'cinema') {
                setViewStack(prev => [...prev, { id: 'cinema', title: 'Cinema Mode', viewType: 'cinema', selectedIndex: 0 }]);
            } else if (selectedItem.data?.id === 'cover-flow') {
                const albums = getLibraryAlbums(mixes);
                // Find index of current song's album
                const index = currentSong?.album?.id ? albums.findIndex(a => a.id === currentSong.album.id) : 0;
                setViewStack(prev => [...prev, { id: 'cover-flow', title: 'Cover Flow', viewType: 'cover-flow', selectedIndex: index >= 0 ? index : 0 }]);
            } else if (selectedItem.data?.id === 'now-playing') {
                goToNowPlaying();
            } else if (selectedItem.data?.id === 'lyrics') {
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
            } else if (selectedItem.type === 'navigation' && selectedItem.target) {
                handleNavigation(selectedItem.target, selectedItem.data, selectedItem.label);
            }
        }
    }, [currentView, controlMode, currentMenuItems, mixes, currentSong, playSongNow, goToNowPlaying, handleNavigation]);






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
            <motion.div
                className={`relative w-full max-w-[370px] aspect-[9/16] rounded-[3rem] ${getThemeClasses()} p-5 flex flex-col ring-1 ring-black/10 select-none touch-manipulation my-auto transition-all duration-500`}
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Metallic Sheen (CSS only, no heavy blends) */}
                <div className="absolute inset-0 rounded-[2.6rem] bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

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

                {/* Screen Area (Top 48%) - Dynamic Border/Background */}
                <div
                    className={`w-full h-[48%] rounded-lg border-[3px] mb-4 overflow-hidden relative z-10 ${getScreenClasses()}`}
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
                        onItemSelect={(index) => {
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
                                    } else if (item.action) {
                                        item.action();
                                    } else if (item.type === 'navigation' && item.target) {
                                        handleNavigation(item.target, item.data, item.label);
                                    }
                                }
                            }, 0);
                        }}
                        onPlayPause={togglePlay}
                        controlMode={controlMode} // Pass seek/volume state
                        shuffle={shuffle}
                        repeat={repeat}
                        onBack={handleBack}
                    />


                    {/* Render Game View if Active - Lazy loaded for performance */}

                </div>

                {/* Branding */}
                <div className="w-full flex justify-center items-center mb-6 relative z-10">
                    <span className={`text-[10px] font-bold tracking-[0.2em] font-sans ${ipodTheme === 'black' || ipodTheme === 'dark' ? 'text-white/20' : 'text-zinc-500/80'}`}>MELORA</span>
                </div>
                {/* Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none" />


                {/* Click Wheel Area (Bottom) */}
                <div className="flex-1 w-full flex items-start justify-center relative z-10">
                    <ClickWheel
                        theme={ipodTheme}
                        enableSounds={clickSounds}
                        onScroll={(direction) => {
                            handleScroll(direction);
                        }}
                        onSelect={() => {
                            handleSelect();
                        }}
                        onMenu={() => {
                            handleBack();
                        }}
                        onPlayPause={togglePlay}
                        onNext={next}
                        onPrev={prev}
                    >
                    </ClickWheel>
                </div>
            </motion.div>
        </div>

    );
}

