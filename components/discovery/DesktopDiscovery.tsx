import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DiscoveryTheme } from "./DiscoveryLayout";
import { getTrending, getTopCharts } from "@/lib/jiosaavn";
import { searchUnified } from "@/lib/unified-search";
import { HistoryStore } from "@/lib/history-store";
import { OfflineStore } from "@/lib/offline-store";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { Search, Home, Library, Heart, Disc, Bell, Plus, Play, Pause, SkipForward, SkipBack, Volume2, Shuffle, Repeat, MoreHorizontal, ChevronRight, Loader2, Download } from "lucide-react";

interface DesktopDiscoveryProps {
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
}

// Animation Config
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

// --- Subcomponents & Helpers ---

function getArt(song: any) {
    if (!song) return '';
    // Handle both new unified format and raw jiosaavn
    const img = song.image || song.art;
    if (Array.isArray(img)) {
        return img[img.length - 1]?.link || img[0]?.link || '';
    }
    return img || '';
}

function NavItem({ icon, label, active, colors, onClick }: any) {
    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors"
            style={{
                backgroundColor: 'transparent',
                color: active ? '#FFFFFF' : '#666666'
            }}
            whileHover={{
                color: '#FFFFFF',
                backgroundColor: 'rgba(255,255,255,0.05)'
            }}
            transition={{ duration: 0.1 }}
        >
            {icon}
            {label}
        </motion.button>
    );
}

function Pill({ label, active, colors }: any) {
    return (
        <button
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{
                backgroundColor: active ? colors.accent : 'transparent',
                color: active ? colors.bg : colors.textMuted,
                borderColor: active ? colors.accent : colors.border
            }}
        >{label}</button>
    );
}

function PlaylistItem({ icon, title, subtitle, active, colors, onClick }: any) {
    return (
        <motion.div
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            style={{
                backgroundColor: 'transparent',
                opacity: active ? 1 : 0.7
            }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', opacity: 1 }}
            onClick={onClick}
            transition={spring}
        >
            {icon ? (
                <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.accent, color: colors.bg }}>{icon}</div>
            ) : (
                <div className="w-9 h-9 rounded-md" style={{ backgroundColor: colors.border }}></div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{title}</p>
                <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>{subtitle}</p>
            </div>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />}
        </motion.div>
    );
}

function MoodPill({ label, active, onClick, colors }: any) {
    // Mood Colors & Icons (Hardcoded for demo, could be dynamic)
    const moodConfig: any = {
        energize: { color: '#F59E0B', icon: '⚡' },
        feelgood: { color: '#EC4899', icon: '✨' },
        relax: { color: '#10B981', icon: '🍃' },
        workout: { color: '#EF4444', icon: '💪' },
        sad: { color: '#6366F1', icon: '🌧️' },
        party: { color: '#8B5CF6', icon: '🎉' },
    };

    const key = label.toLowerCase().replace(' ', '');
    const config = moodConfig[key] || { color: colors.accent, icon: '🎵' };

    return (
        <motion.button
            onClick={onClick}
            className="px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all"
            style={{
                backgroundColor: active
                    ? config.color
                    : 'transparent',
                borderColor: active
                    ? config.color
                    : colors.border,
                color: active
                    ? '#fff'
                    : colors.textMuted,
                boxShadow: active
                    ? `0 4px 12px ${config.color}60`
                    : 'none'
            }}
            whileHover={{ scale: 1.05, borderColor: config.color, color: active ? '#fff' : colors.text }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <span>{config.icon}</span>
            {label}
        </motion.button>
    );
}

function FeatureCard({ title, subtitle, isNew, colors, image, onClick }: any) {
    // Premium Feature Card with background art and hover effects
    const hasImage = !!image;

    return (
        <motion.div
            className="flex-1 h-44 rounded-2xl cursor-pointer relative overflow-hidden group"
            style={{
                backgroundColor: hasImage ? 'transparent' : colors.card,
                border: hasImage ? 'none' : `1px solid ${colors.border}`
            }}
            onClick={onClick}
            whileHover={{
                y: -4,
                boxShadow: hasImage ? '0 10px 40px rgba(0,0,0,0.5)' : 'none',
                borderColor: hasImage ? 'none' : colors.text
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Background Image */}
            {hasImage && (
                <>
                    <img
                        src={image}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 h-full p-5 flex flex-col justify-end">
                {isNew && (
                    <span
                        className="absolute top-4 left-4 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-md"
                        style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.9)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                        }}
                    >
                        New Release
                    </span>
                )}
                <p
                    className="text-[10px] uppercase tracking-widest mb-1.5 font-medium"
                    style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : colors.textMuted }}
                >
                    {isNew ? 'Album' : 'Daily Mix'}
                </p>
                <p
                    className="text-base font-bold leading-tight"
                    style={{ color: hasImage ? '#fff' : colors.text }}
                >
                    {title}
                </p>
                <p
                    className="text-[11px] mt-1"
                    style={{ color: hasImage ? 'rgba(255,255,255,0.6)' : colors.textMuted }}
                >
                    {subtitle}
                </p>
            </div>

            {/* Play Button on Hover */}
            <motion.div
                className="absolute right-4 bottom-4 w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                style={{
                    backgroundColor: '#1DB954',
                    boxShadow: '0 8px 24px rgba(29, 185, 84, 0.4)'
                }}
                initial={{ y: 10, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <Play size={18} fill="#fff" color="#fff" />
            </motion.div>
        </motion.div>
    );
}

function TrackRow({ index, track, colors, isPlaying, onPlay }: any) {
    return (
        <motion.div
            className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer group relative"
            style={{ backgroundColor: isPlaying ? colors.accentSoft : 'transparent' }}
            whileHover={{
                backgroundColor: colors.accentSoft,
                x: 2
            }}
            onClick={onPlay}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            {/* Index / Playing Indicator */}
            <span
                className="w-8 text-xs font-medium text-center"
                style={{ color: isPlaying ? '#1DB954' : colors.textMuted }}
            >
                {isPlaying ? (
                    <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                        ▶
                    </motion.span>
                ) : (
                    <span className="group-hover:hidden">{index}</span>
                )}
                {!isPlaying && (
                    <Play
                        size={14}
                        className="hidden group-hover:block mx-auto"
                        style={{ color: colors.text }}
                    />
                )}
            </span>

            {/* Album Art Thumbnail */}
            <div
                className="w-10 h-10 rounded-lg mr-3 overflow-hidden flex-shrink-0 shadow-md"
                style={{ backgroundColor: colors.border }}
            >
                {track.art ? (
                    <img
                        src={track.art}
                        alt={track.title}
                        className="w-full h-full object-cover"
                    />
                ) : null}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-sm font-medium truncate"
                    style={{ color: isPlaying ? '#1DB954' : colors.text }}
                >
                    {track.title}
                </p>
            </div>

            {/* Artist */}
            <span
                className="w-36 text-xs truncate px-2"
                style={{ color: colors.textMuted }}
            >
                {track.artist}
            </span>

            {/* Quality Badge */}
            {track.quality && (
                <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                        backgroundColor: track.quality === 'flac' || track.quality === 'hires' ? '#10B981' :
                            track.quality === '320' ? '#3B82F6' : '#6B7280',
                        color: '#fff'
                    }}
                >
                    {track.quality === 'hires' ? 'Hi-Res' : track.quality === 'flac' ? 'FLAC' : track.quality}
                </span>
            )}

            {/* Duration */}
            <span
                className="w-14 text-xs text-right"
                style={{ color: colors.textMuted }}
            >
                {track.duration}
            </span>

            {/* Like Button */}
            <Heart
                size={14}
                className="ml-3 cursor-pointer transition-colors hover:scale-110"
                style={{ color: isPlaying ? '#F43F5E' : colors.textMuted }}
                fill={isPlaying ? '#F43F5E' : 'transparent'}
            />
        </motion.div>
    );
}

export function DesktopDiscovery({ theme, onThemeChange }: DesktopDiscoveryProps) {
    const isMidnight = theme === 'midnight';
    const { playInstantMix, currentSong, isPlaying, togglePlay, next, prev, progress, duration, seek, volume, setVolume, shuffle, setShuffle, repeat, setRepeat, toggleLike, isLiked, likedSongs, activeMixId } = usePlayback();

    const [activeView, setActiveView] = useState('home');
    const [activeTab, setActiveTab] = useState('playlist');
    const [activeMood, setActiveMood] = useState<string | null>(null);

    // MINIMALIST PALETTE (Project Linear)
    const c = {
        bg: '#000000', // PURE BLACK
        surface: '#000000', // No surface differentiation
        card: '#0a0a0a', // Subtle card bg
        cardHover: '#141414',
        text: '#FFFFFF',
        textMuted: '#666666',
        border: 'rgba(255,255,255,0.08)', // Sharp minimal border
        accent: '#FFFFFF', // High contrast accent
        accentSoft: 'rgba(255,255,255,0.08)', // Subtle hover
    };

    const moods = ['Energize', 'Feel Good', 'Relax', 'Workout', 'Sad', 'Party'];

    // Data State
    const [trending, setTrending] = useState<any[]>([]);
    const [charts, setCharts] = useState<any[]>([]);
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Library State
    const [downloads, setDownloads] = useState<any[]>([]);

    // Playlist State
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Trending
                const trendingSongs = await getTrending();

                // 2. Fetch Charts
                const topCharts = await getTopCharts();

                // 3. Load Recent from HistoryStore
                const history = HistoryStore.getHistory();
                setRecent(history.map(h => ({
                    id: h.track.id,
                    title: h.track.song.name,
                    artist: h.track.song.primaryArtists,
                    art: getArt(h.track.song),
                    original: h.track
                })));

                // 4. Load Downloads
                const downloadedSongs = await OfflineStore.getAllDownloadedSongs();
                setDownloads(downloadedSongs.map(s => ({
                    id: s.id,
                    title: s.name,
                    artist: s.primaryArtists,
                    art: getArt(s),
                    original: { song: s, sources: [] } // Minimal PlayableTrack wrapper
                })));

                setTrending(trendingSongs.slice(0, 10)); // Top 10 trending

                // Map charts to feature cards - filtered for playlists/charts
                const usefulCharts = topCharts
                    .filter((c: any) => c.image) // Must have image
                    .slice(0, 3) // Take top 3
                    .map((c: any) => ({
                        id: c.id,
                        title: c.title || c.name,
                        subtitle: c.subtitle || `${c.language || 'Global'} • ${c.type}`,
                        image: c.image || c.image?.[2]?.link,
                        isNew: c.isNew || false
                    }));

                setCharts(usefulCharts);
            } catch (e) {
                console.error("Discovery Load Failed:", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Listen for history updates
        const onHistoryUpdate = () => {
            const history = HistoryStore.getHistory();
            setRecent(history.map(h => ({
                id: h.track.id,
                title: h.track.song.name,
                artist: h.track.song.primaryArtists,
                art: getArt(h.track.song),
                original: h.track
            })));
        };

        window.addEventListener('melora-history-update', onHistoryUpdate);

        // Load playlists
        setPlaylists(PlaylistStore.getPlaylists());
        const onPlaylistUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener('melora-playlists-update', onPlaylistUpdate);

        return () => {
            window.removeEventListener('melora-history-update', onHistoryUpdate);
            window.removeEventListener('melora-playlists-update', onPlaylistUpdate);
        };
    }, []);



    const handlePlay = (song: any, allSongs: any[] = []) => {
        if (!song) return;

        // If playing a list (e.g. from track row), ensure context
        const songList = allSongs.length > 0 ? allSongs : [song];
        const startIndex = songList.findIndex(s => s.id === song.id);

        const newMix: Mix = {
            id: `discovery-${Date.now()}`,
            title: "Discovery Mix",
            color: 'blue',
            songs: songList,
            currentSongIndex: startIndex >= 0 ? startIndex : 0
        };

        playInstantMix(newMix);
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setActiveView('search');

        try {
            const results = await searchUnified(query);
            // Map to UI format
            const mapped = results.map(item => ({
                id: item.id,
                title: item.song.name,
                artist: item.song.primaryArtists,
                duration: item.song.duration ? Math.floor(item.song.duration / 60) + ':' + (item.song.duration % 60).toString().padStart(2, '0') : '--:--',
                art: getArt(item.song),
                // Keep original item for playback
                original: item
            }));
            setSearchResults(mapped);
        } catch (e) {
            console.error("Search Failed:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            performSearch(e.currentTarget.value);
        }
    };

    const renderContent = () => {
        switch (activeView) {
            case 'search':
                return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search Input at Top */}
                        <div className="p-4 border-b" style={{ borderColor: c.border }}>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: c.card }}>
                                <Search size={18} style={{ color: c.textMuted }} />
                                <input
                                    type="text"
                                    placeholder="Search songs, artists, albums..."
                                    className="bg-transparent border-none outline-none text-sm w-full"
                                    style={{ color: c.text }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-xs opacity-50 hover:opacity-100">Clear</button>
                                )}
                            </div>
                        </div>
                        {isSearching ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                <Loader2 size={32} className="animate-spin text-green-500" />
                                <p className="text-sm opacity-50">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h2 className="text-xl font-bold">Top Results</h2>
                                    <span className="text-xs opacity-50">{searchResults.length} songs</span>
                                </div>
                                {searchResults.map((item, i) => {
                                    const quality = item.original?.sources?.[0]?.quality || item.original?.preferredQuality || '320';
                                    return (
                                        <TrackRow
                                            key={item.id}
                                            index={i + 1}
                                            track={{
                                                ...item,
                                                quality // Pass quality for badge
                                            }}
                                            colors={c}
                                            isPlaying={currentSong?.id === item.id && isPlaying}
                                            onPlay={() => handlePlay(item.original, searchResults.map(r => r.original))}
                                        />
                                    );
                                })}
                            </div>
                        ) : searchQuery ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">No results found</h2>
                                    <p className="text-sm mt-2">Try a different search term.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center opacity-50">
                                    <Search size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xl font-bold">Search Melora</h2>
                                    <p className="text-sm mt-2">Find songs from JioSaavn, HiFi, and more.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'explore':
                const genres = [
                    { id: 'pop', name: 'Pop', color: '#EC4899', icon: '🎤' },
                    { id: 'hiphop', name: 'Hip Hop', color: '#F59E0B', icon: '🔥' },
                    { id: 'rock', name: 'Rock', color: '#EF4444', icon: '🎸' },
                    { id: 'electronic', name: 'Electronic', color: '#8B5CF6', icon: '🎧' },
                    { id: 'rnb', name: 'R&B', color: '#6366F1', icon: '💜' },
                    { id: 'classical', name: 'Classical', color: '#10B981', icon: '🎻' },
                    { id: 'jazz', name: 'Jazz', color: '#14B8A6', icon: '🎷' },
                    { id: 'indie', name: 'Indie', color: '#F97316', icon: '🌻' },
                ];

                const exploreGenre = async (genre: any) => {
                    const results = await searchUnified(genre.name, 'song');
                    if (results.length > 0) {
                        const mix: Mix = {
                            id: `genre-${genre.id}`,
                            title: `${genre.name} Mix`,
                            color: 'purple',
                            songs: results,
                            currentSongIndex: 0
                        };
                        playInstantMix(mix);
                    } else {
                        alert(`No songs found for ${genre.name}`);
                    }
                };

                return (
                    <div className="flex-1 px-6 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {/* Genres Grid */}
                        <h2 className="text-xl font-bold mb-4">Browse Genres</h2>
                        <div className="grid grid-cols-4 gap-3 mb-8">
                            {genres.map(genre => (
                                <motion.div
                                    key={genre.id}
                                    className="h-24 rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
                                    style={{ backgroundColor: genre.color }}
                                    whileHover={{ scale: 1.03, boxShadow: `0 8px 24px ${genre.color}50` }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => exploreGenre(genre)}
                                >
                                    <span className="text-3xl mb-1">{genre.icon}</span>
                                    <span className="text-sm font-bold text-white">{genre.name}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* New Releases */}
                        <h2 className="text-xl font-bold mb-4">New Releases</h2>
                        <div className="grid grid-cols-5 gap-4 mb-8">
                            {trending.slice(0, 5).map((song, i) => (
                                <motion.div
                                    key={song.id || i}
                                    className="rounded-xl overflow-hidden cursor-pointer group"
                                    style={{ backgroundColor: c.card }}
                                    whileHover={{ y: -4 }}
                                    onClick={() => handlePlay(song, trending)}
                                >
                                    <div className="aspect-square relative overflow-hidden">
                                        <img src={getArt(song)} alt={song.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                                                <Play size={20} fill="white" className="ml-0.5 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-semibold truncate">{song.name}</p>
                                        <p className="text-xs truncate" style={{ color: c.textMuted }}>{song.primaryArtists}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Top Charts */}
                        <h2 className="text-xl font-bold mb-4">Top Charts</h2>
                        <div className="flex gap-4">
                            {charts.map(chart => (
                                <FeatureCard
                                    key={chart.id}
                                    title={chart.title}
                                    subtitle={chart.subtitle}
                                    colors={c}
                                    image={chart.image}
                                    isNew={false}
                                />
                            ))}
                        </div>
                    </div>
                );
            case 'library':
                return (
                    <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        <h2 className="text-xl font-bold mb-4 px-2 flex items-center gap-2">
                            <Download size={20} />
                            Downloads
                        </h2>
                        {downloads.length === 0 ? (
                            <div className="text-center opacity-50 py-10">
                                <Heart size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No downloaded songs yet.</p>
                            </div>
                        ) : (
                            downloads.map((item, i) => (
                                <TrackRow
                                    key={item.id}
                                    index={i + 1}
                                    track={item}
                                    colors={c}
                                    isPlaying={false}
                                    onPlay={() => handlePlay(item.original, downloads.map(d => d.original))}
                                />
                            ))
                        )}
                    </div>
                );
            case 'home':
            default:
                return (
                    <>
                        {/* Header: Search + Mood Pills */}
                        <header className="p-4 flex items-center gap-4" style={{ backgroundColor: c.bg }}>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border flex-1 max-w-md" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <Search size={14} style={{ color: c.textMuted }} />
                                <input
                                    type="text"
                                    placeholder="Search by artists, songs or albums"
                                    className="bg-transparent border-none outline-none text-xs w-full"
                                    style={{ color: c.text }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                />
                            </div>
                            <div className="flex gap-2">
                                {moods.map(mood => (
                                    <MoodPill key={mood} label={mood} active={activeMood === mood.toLowerCase().replace(' ', '')} onClick={() => setActiveMood(mood.toLowerCase().replace(' ', ''))} colors={c} />
                                ))}
                            </div>
                        </header>

                        {/* === HERO SECTION === */}
                        {loading ? (
                            <div className="mx-4 mb-5 h-48 rounded-2xl bg-gray-800 animate-pulse" />
                        ) : trending[0] ? (
                            <div className="relative mx-4 mb-5 h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-2xl">
                                {/* Blurred Background */}
                                <img
                                    src={getArt(trending[0])}
                                    alt="Featured"
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                                />
                                {/* Gradient Overlay - REMOVED, SHARP IMAGE */}
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                {/* Content */}
                                <div className="relative z-10 h-full flex items-center p-8 gap-8">
                                    {/* Album Art */}
                                    <motion.div
                                        className="w-40 h-40 rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-shrink-0"
                                        whileHover={{ scale: 1.05, rotate: 2 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <img
                                            src={getArt(trending[0])}
                                            alt={trending[0].name}
                                            className="w-full h-full object-cover"
                                        />
                                    </motion.div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col items-start gap-2">
                                        <motion.span
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/20 backdrop-blur-md text-white/90"
                                        >
                                            Trending Now
                                        </motion.span>
                                        <motion.h2
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-5xl font-black text-white leading-tight drop-shadow-2xl line-clamp-1"
                                        >
                                            {trending[0].name}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-lg text-white/80 font-medium mb-4 line-clamp-1"
                                        >
                                            {trending[0].primaryArtists} <span className="opacity-50 mx-2">•</span> {trending[0].year || '2024'}
                                        </motion.p>

                                        <div className="flex gap-3">
                                            <motion.button
                                                className="h-12 px-8 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
                                                style={{ backgroundColor: '#1DB954', color: '#fff' }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    if (currentSong?.id === trending[0].id && isPlaying) {
                                                        togglePlay();
                                                    } else {
                                                        handlePlay(trending[0], trending);
                                                    }
                                                }}
                                            >
                                                {currentSong?.id === trending[0].id && isPlaying ? (
                                                    <><Pause size={18} fill="#fff" /> PAUSE</>
                                                ) : (
                                                    <><Play size={18} fill="#fff" /> PLAY NOW</>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md text-white hover:bg-white/10"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Heart size={20} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Fallback Hero */
                            <div className="relative mx-4 mb-5 h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2670')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                                <div className="relative z-10 h-full flex flex-col justify-center px-10 items-start">
                                    <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">Welcome to Melora</h1>
                                    <p className="text-xl text-white/80 mb-6">Discover your next favorite track.</p>
                                    <button className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                                        Start Listening
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Featured Cards Row */}
                        <div className="px-4 flex gap-4 mb-5">
                            {charts.map((chart) => (
                                <FeatureCard
                                    key={chart.id}
                                    title={chart.title}
                                    subtitle={chart.subtitle}
                                    colors={c}
                                    image={chart.image}
                                    isNew={chart.id === 'chart2'}
                                />
                            ))}
                        </div>



                        {/* Track List - Using Real Trending Data */}
                        <div className="flex-1 px-4 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                            <div className="flex items-center text-[10px] font-bold uppercase tracking-widest mb-2 px-2" style={{ color: c.textMuted }}>
                                <span className="w-8">#</span>
                                <span className="flex-1">Title</span>
                                <span className="w-32">Artist</span>
                                <span className="w-16 text-right">Time</span>
                            </div>
                            {loading ? (
                                // Loading skeletons
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center px-3 py-2.5 gap-3 animate-pulse">
                                        <div className="w-8 h-4 rounded bg-gray-700" />
                                        <div className="w-10 h-10 rounded-lg bg-gray-700" />
                                        <div className="flex-1 h-4 rounded bg-gray-700" />
                                        <div className="w-20 h-4 rounded bg-gray-700" />
                                    </div>
                                ))
                            ) : trending.length > 0 ? (
                                trending.slice(0, 10).map((song, i) => {
                                    const trackData = {
                                        id: song.id,
                                        title: song.name,
                                        artist: song.primaryArtists,
                                        duration: song.duration ? Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0') : '--:--',
                                        art: getArt(song)
                                    };
                                    return (
                                        <TrackRow
                                            key={song.id}
                                            index={i + 1}
                                            track={trackData}
                                            colors={c}
                                            isPlaying={currentSong?.id === song.id && isPlaying}
                                            onPlay={() => handlePlay(song, trending)}
                                        />
                                    );
                                })
                            ) : (
                                <p className="text-center text-sm opacity-50 mt-8">No trending songs available</p>
                            )}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500 relative" style={{ backgroundColor: '#000', color: c.text }}>

            {/* === AMBIENT BACKGROUND GLOWS REMOVED === */}

            {/* === TOP SECTION (Sidebar + Main + Right Panel) === */}
            <div className="flex-1 flex overflow-hidden z-10 relative">

                {/* --- LEFT SIDEBAR (GLASS) --- */}
                <aside
                    className="w-56 flex-shrink-0 flex flex-col border-r p-4 transition-colors"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ backgroundColor: c.accent }}></div>
                        <span className="text-lg font-bold tracking-tight">Melora</span>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-1">
                        <NavItem icon={<Home size={18} />} label="Home" active={activeView === 'home'} colors={c} onClick={() => setActiveView('home')} />
                        <NavItem icon={<Search size={18} />} label="Search" active={activeView === 'search'} colors={c} onClick={() => setActiveView('search')} />
                        <NavItem icon={<Library size={18} />} label="Explore" active={activeView === 'explore'} colors={c} onClick={() => setActiveView('explore')} />
                        <NavItem icon={<Download size={18} />} label="Downloads" active={activeView === 'library'} colors={c} onClick={() => setActiveView('library')} />
                    </nav>

                    <div className="mt-8 mb-3 flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: c.textMuted }}>Library</span>
                        <Plus
                            size={14}
                            style={{ color: c.textMuted }}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => {
                                const name = prompt('Playlist name:');
                                if (name?.trim()) {
                                    PlaylistStore.createPlaylist(name.trim());
                                }
                            }}
                        />
                    </div>



                    {/* Playlist List */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden mask-gradient-b">
                        <PlaylistItem
                            icon={<Heart size={14} />}
                            title="Liked Songs"
                            subtitle={`${likedSongs?.length || 0} songs`}
                            colors={c}
                            active={activeMixId === 'liked-songs'}
                            onClick={() => {
                                if (likedSongs && likedSongs.length > 0) {
                                    const mix: Mix = {
                                        id: 'liked-songs',
                                        title: 'Liked Songs',
                                        color: 'pink',
                                        songs: likedSongs.map(s => ensurePlayableTrack(s)),
                                        currentSongIndex: 0
                                    };
                                    playInstantMix(mix);
                                }
                            }}
                        />
                        {playlists.map(pl => (
                            <PlaylistItem
                                key={pl.id}
                                title={pl.name}
                                subtitle={`${pl.tracks.length} songs`}
                                colors={c}
                                active={activeMixId === pl.id}
                                onClick={() => {
                                    if (pl.tracks.length > 0) {
                                        const mix: Mix = {
                                            id: pl.id,
                                            title: pl.name,
                                            color: 'blue',
                                            songs: pl.tracks,
                                            currentSongIndex: 0
                                        };
                                        playInstantMix(mix);
                                    }
                                }}
                            />
                        ))}
                        {playlists.length === 0 && (
                            <p className="text-[10px] text-center opacity-50 mt-4">No playlists yet</p>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <div className="pt-4 mt-2 border-t flex justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity" style={{ borderColor: c.border }}>
                        <button onClick={() => onThemeChange('midnight')} className={`w-4 h-4 rounded-full bg-black border ${theme === 'midnight' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border-gray-600'}`} />
                        <button onClick={() => onThemeChange('polar')} className={`w-4 h-4 rounded-full bg-white border ${theme === 'polar' ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'border-gray-300'}`} />
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {renderContent()}
                </main>

                {/* --- RIGHT PANEL (Recent Played - GLASS) --- */}
                <aside
                    className="w-64 flex-shrink-0 border-l p-4 flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: c.surface,
                        borderColor: c.border
                    }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold">Recent Played</span>
                        <span className="text-[10px] cursor-pointer hover:underline font-medium" style={{ color: c.textMuted }}>See All</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {recent.length === 0 && (
                            <p className="text-xs text-center opacity-50 mt-4">No recent songs</p>
                        )}
                        {recent.slice(0, 20).map(item => (
                            <motion.div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer group relative"
                                style={{ backgroundColor: 'transparent' }}
                                whileHover={{
                                    backgroundColor: c.accentSoft,
                                    x: 2
                                }}
                                onClick={() => handlePlay(item.original)}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                                {/* Album Art with Play Overlay */}
                                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                                    {item.art ? (
                                        <img
                                            src={item.art}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full" style={{ backgroundColor: c.border }} />
                                    )}
                                    {/* Play overlay on hover */}
                                    <motion.div
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Play size={16} fill="#fff" color="#fff" />
                                    </motion.div>
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{item.title}</p>
                                    <p className="text-[10px] truncate" style={{ color: c.textMuted }}>{item.artist}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </aside>
            </div>

            {/* === BOTTOM PLAYER BAR (GLASS) === */}
            <footer
                className="h-20 border-t flex items-center justify-between px-6 z-20 relative"
                style={{
                    backgroundColor: c.surface, // Solid black
                    borderColor: c.border,
                    boxShadow: 'none' // Remove floaty shadow
                }}
            >
                {/* Now Playing */}
                <div className="flex items-center gap-4 w-72">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg relative group transition-transform hover:scale-105" style={{ backgroundColor: c.border }}>
                        {currentSong && getArt(currentSong) && (
                            <>
                                <img src={getArt(currentSong)} alt={currentSong.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center cursor-pointer" onClick={() => setActiveView('home')}>
                                    <ChevronRight className="-rotate-90 text-white" size={20} />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate hover:underline cursor-pointer">{currentSong?.name || 'Not Playing'}</p>
                        <p className="text-xs truncate opacity-70 hover:opacity-100 cursor-pointer">{currentSong?.primaryArtists || '--'}</p>
                    </div>
                    {currentSong && (
                        <Heart
                            size={16}
                            style={{ color: isLiked(currentSong.id) ? '#F43F5E' : c.textMuted }}
                            fill={isLiked(currentSong.id) ? '#F43F5E' : 'transparent'}
                            className="cursor-pointer hover:scale-110 transition-transform ml-2"
                            onClick={() => toggleLike(currentSong)}
                        />
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-6 blocks">
                        <Shuffle
                            size={16}
                            style={{ color: shuffle ? '#1DB954' : c.textMuted }}
                            className="cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => setShuffle(!shuffle)}
                        />
                        <SkipBack
                            size={20}
                            style={{ color: c.text }}
                            className="cursor-pointer hover:scale-110 transition-transform hover:text-white"
                            onClick={prev}
                        />
                        <motion.button
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#fff', color: '#000' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" className="ml-0.5" />}
                        </motion.button>
                        <SkipForward
                            size={20}
                            style={{ color: c.text }}
                            className="cursor-pointer hover:scale-110 transition-transform hover:text-white"
                            onClick={next}
                        />
                        <Repeat
                            size={16}
                            style={{ color: repeat !== 'off' ? '#1DB954' : c.textMuted }}
                            className="cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                        />
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 w-[32rem]">
                        <span className="text-[10px] w-8 text-right font-medium opacity-60">
                            {Math.floor(progress / 60)}:{(Math.floor(progress) % 60).toString().padStart(2, '0')}
                        </span>
                        <div
                            className="flex-1 h-1 rounded-full cursor-pointer relative group flex items-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = (e.clientX - rect.left) / rect.width;
                                seek(pct);
                            }}
                        >
                            <div
                                className="h-full rounded-full transition-all group-hover:bg-[#1DB954]"
                                style={{ backgroundColor: isMidnight ? '#fff' : c.accent, width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                            />
                            {/* Thumb on hover */}
                            <div
                                className="absolute h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `${duration > 0 ? (progress / duration) * 100 : 0}%`, transform: 'translateX(-50%)' }}
                            />
                        </div>
                        <span className="text-[10px] w-8 font-medium opacity-60">
                            {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32 justify-end">
                    <Volume2 size={16} style={{ color: c.textMuted }} />
                    <div
                        className="w-24 h-1 rounded-full cursor-pointer relative group"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const vol = (e.clientX - rect.left) / rect.width;
                            setVolume(Math.max(0, Math.min(1, vol)));
                        }}
                    >
                        <div className="h-full rounded-full group-hover:bg-[#1DB954]" style={{ backgroundColor: isMidnight ? '#fff' : c.accent, width: `${volume * 100}%` }}></div>
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `${volume * 100}%`, transform: 'translateX(-50%)' }}
                        />
                    </div>
                </div>
            </footer>
        </div>
    );
}




