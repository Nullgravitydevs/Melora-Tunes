import { motion, AnimatePresence } from "framer-motion";
import { ClickWheel } from "./ClickWheel";
import { IpodScreen } from "./IpodScreen";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePlayback, Mix } from "@/components/providers/playback-context";
import { JioSaavnSong, searchSongs } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { loadSettings, saveSettings, resetSettings, clearCache } from "@/lib/settings";

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
    viewType: 'menu' | 'player' | 'search' | 'loading' | 'message' | 'cinema' | 'cover-flow' | 'game';
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
    { label: 'Search', type: 'navigation', target: 'search' },
    { label: 'Now Playing', type: 'action', data: { id: 'now-playing', name: 'Now Playing' } },
    { label: "Settings", type: 'navigation', target: 'settings' }
];

const MUSIC_MENU: MenuItem[] = [
    { label: "Playlists", type: 'navigation', target: 'playlists' },
    { label: "Search", type: 'navigation', target: 'search' },
    { label: "Artists", type: 'navigation', target: 'artists' },
    { label: "Albums", type: 'navigation', target: 'albums' },
    { label: "Songs", type: 'navigation', target: 'songs' },
    { label: "Music Quiz", type: 'action', action: () => alert("Starting Music Quiz...") },
];

const COVER_FLOW_LIBRARY = [
    { title: "TFI Stereo", artist: "TFI Team", image: "https://c.saavncdn.com/284/TFI-Stereo-Hindi-2024-20241203054523-500x500.jpg" },
    { title: "Pushpa The Rise", artist: "Devi Sri Prasad", image: "https://c.saavncdn.com/177/Pushpa-The-Rise-Part-1-Telugu-2021-20221010155029-500x500.jpg" },
    { title: "Animal", artist: "Manan Bhardwaj", image: "https://c.saavncdn.com/023/Animal-Hindi-2023-20231124191036-500x500.jpg" },
    { title: "Jawan", artist: "Anirudh Ravichander", image: "https://c.saavncdn.com/214/Jawan-Hindi-2023-20230906161947-500x500.jpg" },
    { title: "Vikram", artist: "Anirudh Ravichander", image: "https://c.saavncdn.com/434/Vikram-Tamil-2022-20220515124001-500x500.jpg" },
    { title: "Kabir Singh", artist: "Sachet-Parampara", image: "https://c.saavncdn.com/807/Kabir-Singh-Hindi-2019-20190614075009-500x500.jpg" },
    { title: "Rockstar", artist: "A.R. Rahman", image: "https://c.saavncdn.com/989/Rockstar-Hindi-2011-20110926115915-500x500.jpg" },
    { title: "Yeh Jawaani Hai Deewani", artist: "Pritam", image: "https://c.saavncdn.com/712/Yeh-Jawaani-Hai-Deewani-Hindi-2013-20221204123547-500x500.jpg" },
];

const COVER_FLOW_ITEMS: MenuItem[] = COVER_FLOW_LIBRARY.map(album => ({
    label: album.title,
    type: 'action',
    data: {
        ...album,
        songs: Array(12).fill(null).map((_, i) => ({
            id: `mock-${i}`,
            name: `Track ${i + 1}`,
            duration: 240
        }))
    }
}));

export function IPod() {
    const {
        play, pause, togglePlay, next, prev,
        volume, setVolume,
        currentSong, isPlaying, progress, duration, seek,
        activeMixId, loadMix, updateMix, activeMix,
        mixes, addMix, deleteMix,
        shuffle, setShuffle, repeat, setRepeat
    } = usePlayback();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStack, setViewStack] = useState<ViewState[]>([
        { id: 'main', title: "TFI Stereo", viewType: 'menu', selectedIndex: 0, staticItems: MAIN_MENU }
    ]);
    const [clickSounds, setClickSounds] = useState(true);
    const [ipodTheme, setIpodTheme] = useState<'classic' | 'black' | 'silver' | 'dark'>('classic');
    const [controlMode, setControlMode] = useState<'volume' | 'seek'>('volume'); // Toggle for Player view
    const inputRef = useRef<HTMLInputElement>(null);

    // Load settings on mount
    useEffect(() => {
        const settings = loadSettings();
        setVolume(settings.volume);
        setClickSounds(settings.clickSounds);
        setIpodTheme(settings.theme);
    }, [setVolume]);

    // Initial State


    // Derived state for current view
    const currentView = viewStack[viewStack.length - 1];

    // Compute Menu Items Dynamically based on Current View ID & Context
    // Removed useMemo to ensure closures (like playSongNow) are always fresh. 
    // This prevents stale state issues where actions use old versions of 'mixes'.
    // Compute Menu Items Dynamically based on Current View ID & Context
    // Memoized to prevent heavy recalculation on scroll (selectedIndex change)
    const currentMenuItems: MenuItem[] = useMemo(() => {
        if (currentView.staticItems) return currentView.staticItems;

        switch (currentView.id) {
            case 'music': return MUSIC_MENU;
            case 'games':
                // Inject logic for Brick Game navigation
                return []; // GAMES_MENU removed

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
                        label: `iPod Theme`,
                        type: 'navigation',
                        target: 'theme-settings'
                    },
                    {
                        label: `Shuffle: ${shuffle ? 'On' : 'Off'}`,
                        type: 'action',
                        action: () => setShuffle(!shuffle)
                    } as any,
                    {
                        label: `Repeat: ${repeat === 'one' ? 'One' : repeat === 'all' ? 'All' : 'Off'}`,
                        type: 'action',
                        action: () => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')
                    },
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
                            link.download = `tfi-stereo-playlists-${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                            URL.revokeObjectURL(url);

                            alert('Playlists exported successfully!');
                        }
                    },
                    {
                        label: "About",
                        type: 'action',
                        action: () => {
                            setViewStack(prev => [...prev, {
                                id: 'about',
                                title: 'About',
                                viewType: 'menu',
                                layout: 'full',
                                selectedIndex: 0,
                                customHeader: (
                                    <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center bg-white text-black border-b border-zinc-200">
                                        <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-xl shadow-lg mb-3 flex items-center justify-center text-white">
                                            <span className="font-bold text-xl">TFI</span>
                                        </div>
                                        <h3 className="text-lg font-bold tracking-tight">TFI Stereo</h3>
                                        <p className="text-[11px] text-zinc-500 font-medium mt-1">Version 2.0.0</p>
                                        <div className="flex items-center gap-1 mt-3">
                                            <span className="text-[10px] text-zinc-400">Made with </span>
                                            <span className="text-[10px] text-red-500">❤️</span>
                                            <span className="text-[10px] text-zinc-400"> by TFIverse</span>
                                        </div>
                                    </div>
                                ),
                                staticItems: [
                                    {
                                        label: "Twitter (@TFI_verse)",
                                        type: 'action',
                                        action: () => window.open('https://x.com/TFI_verse', '_blank')
                                    }
                                ]
                            }]);
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

            case 'ipod-theme':
                // iPod Theme Selection
                const themeNames = {
                    'classic': 'Classic (White)',
                    'black': 'Black',
                    'silver': 'Silver',
                    'dark': 'Dark'
                };
                return (['classic', 'black', 'silver', 'dark'] as const).map(theme => ({
                    label: `${themeNames[theme]}${ipodTheme === theme ? ' ✓' : ''}`,
                    type: 'action',
                    action: () => {
                        setIpodTheme(theme);
                        saveSettings({ theme });
                    }
                }));

            case 'volume-settings':
                // Volume adjustment screen
                return [{
                    label: `Volume: ${Math.round(volume * 100)}%`,
                    type: 'action',
                    action: () => { } // Use scroll wheel to adjust
                }];

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
                mixes.forEach(m => m.songs.forEach(s => {
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
                }));
            }


            case 'cover-flow': {
                // Aggregate Albums from User Library (Mixes)
                const albumMap = new Map<string, any>();

                mixes.forEach(m => m.songs.forEach(s => {
                    if (!s.album?.id) return;

                    if (!albumMap.has(s.album.id)) {
                        // Create Album Entry with proper image from song's image array
                        const albumImage = s.image?.find(img => img.quality === '500x500')?.link ||
                            s.image?.[0]?.link ||
                            '';
                        albumMap.set(s.album.id, {
                            title: decodeHtml(s.album.name),
                            artist: decodeHtml(s.primaryArtists),
                            image: albumImage,
                            songs: []
                        });
                    }
                    // Add Song to Album (with duplicate check)
                    const album = albumMap.get(s.album.id);
                    const songExists = album.songs.some((existingSong: any) => existingSong.id === s.id);

                    if (!songExists) {
                        album.songs.push({
                            id: s.id,
                            name: decodeHtml(s.name),
                            duration: s.duration,
                            image: s.image?.find(img => img.quality === '500x500')?.link || s.image?.[0]?.link || '',
                            primaryArtists: s.primaryArtists
                        });
                    }
                }));

                const userAlbums = Array.from(albumMap.values())
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map(a => ({
                        label: a.title,
                        type: 'action',
                        data: a
                    }));

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
                mixes.forEach(m => m.songs.forEach(s => {
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
                }));
            }

            case 'songs': {
                const allSongs = mixes.flatMap(m => m.songs);
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

                items.unshift({ label: "Shuffle Songs", type: 'action', action: shuffleAll });

                if (items.length === 1) return [{ label: "(No Songs Found)", type: 'action', action: () => handleBack() }];

                return items;
            }

            case 'rename':
                return [{ label: "Cancel", type: 'action', action: () => handleBack() }];

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

                    // Find all songs by this artist
                    const artistSongs = mixes.flatMap(m => m.songs).filter(s =>
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

                    return albumItems;
                }

                // Artist -> All Songs
                if (currentView.id.startsWith('artist-allsongs-')) {
                    const songs = currentView.data as JioSaavnSong[];
                    return songs.map(s => ({
                        label: decodeHtml(s.name),
                        type: 'action',
                        data: s,
                        action: () => playSongNow(s)
                    }));
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
                    }));
                }

                // Song Options
                if (currentView.id.startsWith('song-')) {
                    const song = currentView.data as JioSaavnSong;
                    return [
                        { label: "Play Now", type: 'action', action: () => playSongNow(song) },
                        { label: "Add to Playlist...", type: 'navigation', target: `add-to-${song.id}`, data: song },
                        { label: "Cancel", type: 'action', action: () => handleBack() }
                    ];
                }

                // Add to Playlist Menu
                if (currentView.id.startsWith('add-to-')) {
                    const song = currentView.data as JioSaavnSong;
                    return mixes.map(mix => ({
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
                    }));
                }

                return [];
        }
    }, [currentView.id, currentView.data, currentView.staticItems, mixes, volume, clickSounds, ipodTheme]); // Added volume, clickSounds, ipodTheme for real-time updates

    // Actions
    const createNewPlaylist = () => {
        const newId = Date.now().toString();
        const newMix: Mix = {
            id: newId,
            title: `Mix ${mixes.length + 1}`,
            color: "purple",
            songs: [],
            currentSongIndex: 0
        };
        addMix(newMix);
        // Navigate immediately - PASS FULL MIX OBJECT to avoid race condition
        handleNavigation(`mix-${newId}`, newMix, newMix.title);
        // Immediately trigger Rename
        setTimeout(() => goToRename(newMix), 100);
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

    const handleRenameSubmit = (newName: string) => {
        const mixId = currentView.data;
        if (mixId && newName.trim()) {
            updateMix(mixId, { title: newName.trim() });
            handleBack(); // Exit rename view
        }
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
    const handleNavigation = (target: string, data?: any, titleOverride?: string) => {
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
    };

    const goToNowPlaying = () => {
        setViewStack(prev => [...prev, { id: 'now-playing', title: 'Now Playing', viewType: 'player', selectedIndex: 0 }]);
    };

    const handleSearch = async (query: string) => {
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
    };

    const playSongNow = (song: JioSaavnSong) => {
        // If we have an active mix, checks if it's the "On-the-Go" one or another
        // Actually, for "Play Now" behavior from search, users typically expect it to JUST play that song,
        // effectively replacing the queue or starting a new one.
        // But to keep it iPod-like, we use "On-the-Go".

        // 1. Check if "On-the-Go" exists (Case insensitive check for robustness)
        const otgMix = mixes.find(m => m.title.trim().toLowerCase() === "on-the-go");

        if (otgMix) {
            // Reuse existing OTG
            // Check for duplicate
            const existingIndex = otgMix.songs.findIndex(s => s.id === song.id);

            if (existingIndex !== -1) {
                // Song Exists -> Just Play It
                updateMix(otgMix.id, { currentSongIndex: existingIndex });
            } else {
                // Append
                const newSongs = [...otgMix.songs, song];
                updateMix(otgMix.id, { songs: newSongs, currentSongIndex: newSongs.length - 1 });
            }

            loadMix(otgMix.id); // Switch context to OTG
            if (!isPlaying) play();
        } else {
            // Create new OTG
            const newMixId = Date.now().toString();
            const newMix: Mix = {
                id: newMixId,
                title: "On-the-Go",
                color: "orange",
                songs: [song],
                currentSongIndex: 0
            };
            addMix(newMix);
            loadMix(newMixId);
            if (!isPlaying) play(); // Ensure play for new mix
        }
        goToNowPlaying();
    };


    const handleSelect = () => {
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
            if (selectedItem.action) {
                selectedItem.action();
            } else if (selectedItem.type === 'navigation' && selectedItem.target) {
                handleNavigation(selectedItem.target, selectedItem.data, selectedItem.label);
            }
        }
    };




    const handleBack = () => {
        // If in cover-flow and flipped, unflip first before going back
        if (currentView.viewType === 'cover-flow' && currentView.isFlipped) {
            setViewStack(prev => {
                const newStack = [...prev];
                newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], isFlipped: false };
                return newStack;
            });
            return; // Don't navigate back yet
        }

        // Otherwise, normal back navigation
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, prev.length - 1));
        }
    };

    // Theme-based styling
    const getThemeClasses = () => {
        switch (ipodTheme) {
            case 'black':
                // Glossy Black (U2 Edition / Video style)
                // Using a top-down gradient to mimic light hitting the top
                return 'bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#050505] border-[#111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]';
            case 'silver':
                // Anodized Aluminum (Classic 6G/7G style)
                return 'bg-gradient-to-b from-[#e8e8e8] via-[#d4d4d4] to-[#b0b0b0] border-[#a0a0a0] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]';
            case 'dark':
                // Modern Matte Dark
                return 'bg-gradient-to-b from-[#333] to-[#181818] border-[#222] shadow-inner';
            case 'classic':
            default:
                // Classic Polycarbonate White (Glossy)
                return 'bg-gradient-to-b from-[#ffffff] via-[#f7f7f7] to-[#e0e0e0] border-[#d1d1d1] shadow-[inset_0_2px_4px_rgba(255,255,255,1)]';
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-zinc-900 p-4 overflow-hidden pointer-events-none">

            {/* iPod Case */}
            <motion.div
                className={`relative w-full max-w-[450px] aspect-[1/1.65] ${getThemeClasses()} rounded-[3.5rem] shadow-2xl flex flex-col items-center p-6 border-[6px] ring-1 ring-black/5 will-change-transform contain-layout pointer-events-auto`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
                {/* Metallic Sheen (CSS only, no heavy blends) */}
                <div className="absolute inset-0 rounded-[2.6rem] bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

                {/* Screen Area (Top 48%) - Made Bigger */}
                <div
                    className="w-full h-[48%] bg-black rounded-lg border-[3px] border-[#333] shadow-inner mb-4 overflow-hidden relative z-10"
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
                        trackIndex={currentView.trackIndex}
                        layout={currentView.layout}
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
                </div>

                {/* Branding */}
                <div className="w-full flex justify-center items-center mb-6 relative z-10">
                    <span className="text-zinc-500/80 text-[10px] font-bold tracking-[0.2em] font-sans">TFI STEREO</span>
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
                            if (currentView.viewType === 'game') {
                                // Performance: Dispatch Custom Event to bypass React Render Cycle for Games
                                window.dispatchEvent(new CustomEvent('ipod-scroll', { detail: direction }));
                            } else {
                                handleScroll(direction);
                            }
                        }}
                        onSelect={handleSelect}
                        onMenu={handleBack}
                        onPlayPause={togglePlay}
                        onNext={next}
                        onPrev={prev}
                    />
                </div>
            </motion.div>
        </div>

    );
}
