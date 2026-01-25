import React, { useCallback } from "react";
import {
    Home,
    Search,
    Compass,
    ListMusic,
    Library,
    Plus,
    Heart,
    Globe,
    Monitor
} from "lucide-react";

import { NavItem, PlaylistItem } from "../DiscoveryShared";
import { DiscoveryTheme } from "../DiscoveryLayout";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { Mix, ensurePlayableTrack } from "@/components/providers/playback-context";

type RootView = 'home' | 'search' | 'explore' | 'browse' | 'library';

interface SidebarProps {
    activeView: string;
    setActiveView: (view: RootView) => void;
    lastView: RootView;
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
    playlists: Playlist[];
    likedSongs: any[];
    activeMixId: string | null;
    playInstantMix: (mix: Mix) => void;
    setIsLangModalOpen: (val: boolean) => void;
    colors: {
        surface: string;
        border: string;
        textMuted: string;
        bg: string;
    };
}

export function Sidebar({
    activeView,
    setActiveView,
    lastView,
    theme,
    onThemeChange,
    playlists,
    likedSongs,
    activeMixId,
    playInstantMix,
    setIsLangModalOpen,
    colors: c
}: SidebarProps) {

    const playLikedSongs = useCallback(() => {
        if (!likedSongs || likedSongs.length === 0) return;

        playInstantMix({
            id: 'liked-songs',
            title: 'Liked Songs',
            color: 'pink',
            songs: likedSongs.map(s => ensurePlayableTrack(s)),
            currentSongIndex: 0
        });
    }, [likedSongs, playInstantMix]);

    const playPlaylist = useCallback((pl: Playlist) => {
        if (!pl.tracks || pl.tracks.length === 0) return;

        playInstantMix({
            id: pl.id,
            title: pl.name,
            color: 'blue',
            songs: pl.tracks,
            currentSongIndex: 0
        });
    }, [playInstantMix]);

    const createPlaylist = useCallback(() => {
        const name = prompt('Playlist name:');
        if (name?.trim()) {
            PlaylistStore.createPlaylist(name.trim());
        }
    }, []);

    return (
        <aside
            className="w-60 flex-shrink-0 flex flex-col border-r p-5 transition-colors"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            {/* Logo */}
            <div className="flex items-center mb-8 pl-1">
                <span className="text-2xl font-bold tracking-tighter uppercase text-white">
                    Melora Tunes
                </span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1">
                <NavItem
                    icon={<Home size={20} />}
                    label="Home"
                    active={activeView === 'home'}
                    onClick={() => setActiveView('home')}
                />
                <NavItem
                    icon={<Search size={20} />}
                    label="Search"
                    active={activeView === 'search'}
                    onClick={() => setActiveView('search')}
                />
                <NavItem
                    icon={<Compass size={20} />}
                    label="Explore"
                    active={
                        activeView === 'explore' ||
                        activeView === 'mood-detail' ||
                        (activeView === 'playlist-detail' && lastView === 'explore')
                    }
                    onClick={() => setActiveView('explore')}
                />
                <NavItem
                    icon={<ListMusic size={20} />}
                    label="Browse"
                    active={
                        activeView === 'browse' ||
                        activeView === 'collection-detail' ||
                        activeView === 'decade-detail' ||
                        activeView === 'chart-detail' ||
                        (activeView === 'playlist-detail' && lastView === 'browse')
                    }
                    onClick={() => setActiveView('browse')}
                />

                <div className="my-2 border-t border-white/5" />

                <NavItem
                    icon={<Library size={20} />}
                    label="Library"
                    active={
                        activeView === 'library' ||
                        (activeView === 'playlist-detail' && lastView === 'library')
                    }
                    onClick={() => setActiveView('library')}
                />
            </nav>

            {/* Library Header */}
            <div className="mt-8 mb-3 flex items-center justify-between px-2">
                <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: c.textMuted }}
                >
                    Library
                </span>
                <Plus
                    size={14}
                    style={{ color: c.textMuted }}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                    onClick={createPlaylist}
                />
            </div>

            {/* Playlist List */}
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                <PlaylistItem
                    icon={<Heart size={14} />}
                    title="Liked Songs"
                    subtitle={`${likedSongs?.length || 0} songs`}
                    colors={c}
                    active={activeMixId === 'liked-songs'}
                    onClick={playLikedSongs}
                />

                {playlists
                    .filter(pl => pl.id !== 'discovery-mix')
                    .map(pl => (
                        <PlaylistItem
                            key={pl.id}
                            title={pl.name}
                            subtitle={`${pl.tracks.length} songs`}
                            colors={c}
                            active={activeMixId === pl.id}
                            onClick={() => playPlaylist(pl)}
                        />
                    ))}

                {playlists.length === 0 && (
                    <p className="text-[10px] text-center opacity-50 mt-4">
                        No playlists yet
                    </p>
                )}
            </div>

            {/* Footer Controls */}
            <div
                className="pt-4 mt-2 border-t flex justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity"
                style={{ borderColor: c.border }}
            >
                <button
                    onClick={() => setIsLangModalOpen(true)}
                    className="w-4 h-4 rounded flex items-center justify-center border border-gray-500 hover:border-white text-gray-500 hover:text-white transition-colors"
                    title="Music Languages"
                >
                    <Globe size={10} />
                </button>

                <button
                    onClick={() => {
                        localStorage.removeItem('melora-setup-complete');
                        window.dispatchEvent(
                            new CustomEvent('melora-mode-change', { detail: 'WELCOME' })
                        );
                    }}
                    className="w-4 h-4 rounded flex items-center justify-center border border-gray-500 hover:border-white text-gray-500 hover:text-white transition-colors"
                    title="Switch Mode"
                >
                    <Monitor size={10} />
                </button>

                <button
                    onClick={() => onThemeChange('midnight')}
                    className={`w-4 h-4 rounded-full bg-black border ${theme === 'midnight'
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                            : 'border-gray-600'
                        }`}
                />

                <button
                    onClick={() => onThemeChange('polar')}
                    className={`w-4 h-4 rounded-full bg-white border ${theme === 'polar'
                            ? 'ring-2 ring-black ring-offset-2 ring-offset-white'
                            : 'border-gray-300'
                        }`}
                />
            </div>
        </aside>
    );
}
