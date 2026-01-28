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
    Monitor,
    Disc,
    Settings
} from "lucide-react";

import { NavItem, PlaylistItem, DiscoveryThemeColors } from "../DiscoveryShared";
import { DiscoveryTheme } from "../DiscoveryLayout";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { PlayableTrack } from "@/lib/types";

type RootView = "home" | "search" | "explore" | "browse" | "library";

interface SidebarProps {
    activeView: string;
    setActiveView: (view: RootView) => void;
    lastView: RootView;
    theme: DiscoveryTheme;
    onThemeChange: (t: DiscoveryTheme) => void;
    playlists: Playlist[];
    likedSongs: (JioSaavnSong | PlayableTrack)[];
    activeMixId: string | null;
    playInstantMix: (mix: Mix) => void;
    setIsLangModalOpen: (val: boolean) => void;
    colors: DiscoveryThemeColors;
    onOpenSettings: () => void;
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
    colors: c,
    onOpenSettings
}: SidebarProps) {

    const playListMix = useCallback((id: string, title: string, songs: (JioSaavnSong | PlayableTrack)[]) => {
        if (!songs || songs.length === 0) return;
        playInstantMix({
            id,
            title,
            color: "blue",
            songs: songs.map(s => ensurePlayableTrack(s)),
            currentSongIndex: 0
        });
    }, [playInstantMix]);

    const createPlaylist = useCallback(() => {
        const name = prompt("Playlist name:");
        if (name?.trim()) PlaylistStore.createPlaylist(name.trim());
    }, []);

    const isViewActive = (view: RootView) => {
        if (activeView === view) return true;
        // Detail view logic
        if (view === "explore" && ["mood-detail", "playlist-detail"].includes(activeView) && lastView === "explore") return true;
        if (view === "browse" && ["collection-detail", "decade-detail", "chart-detail", "playlist-detail"].includes(activeView) && lastView === "browse") return true;
        if (view === "library" && ["playlist-detail"].includes(activeView) && lastView === "library") return true;
        return false;
    };

    return (
        <aside
            className="w-64 flex-shrink-0 flex flex-col border-r h-full transition-colors relative z-20"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            {/* Header */}
            <div className="h-16 flex items-center px-6 mb-2">
                <div className="flex items-center gap-3 opacity-90">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                        <Disc size={16} className="text-black" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">
                        Melora
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 px-3">
                <NavItem icon={<Home size={18} />} label="Home" active={activeView === "home"} onClick={() => setActiveView("home")} />
                <NavItem icon={<Search size={18} />} label="Search" active={activeView === "search"} onClick={() => setActiveView("search")} />
                <NavItem icon={<Compass size={18} />} label="Explore" active={isViewActive("explore")} onClick={() => setActiveView("explore")} />
                <NavItem icon={<ListMusic size={18} />} label="Browse" active={isViewActive("browse")} onClick={() => setActiveView("browse")} />

                <div className="my-3 border-t mx-3" style={{ borderColor: c.border }} />

                <NavItem icon={<Library size={18} />} label="My Library" active={isViewActive("library")} onClick={() => setActiveView("library")} />
            </nav>

            {/* Library Section */}
            <div className="mt-6 px-6 mb-2 flex items-center justify-between group">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: c.text }}>
                    Playlists
                </span>
                <button onClick={createPlaylist} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} style={{ color: c.text }} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5 scrollbar-none">
                <PlaylistItem
                    icon={<Heart size={14} />}
                    title="Liked Songs"
                    subtitle={`${likedSongs?.length || 0} songs`}
                    colors={c}
                    active={activeMixId === "liked-songs"}
                    onClick={() => playListMix("liked-songs", "Liked Songs", likedSongs)}
                />

                {playlists
                    .filter(pl => pl.id !== "discovery-mix")
                    .map(pl => (
                        <PlaylistItem
                            key={pl.id}
                            title={pl.name}
                            subtitle={`${pl.tracks.length} songs`}
                            colors={c}
                            active={activeMixId === pl.id}
                            icon={<Disc size={14} />}
                            onClick={() => playListMix(pl.id, pl.name, pl.tracks)}
                        />
                    ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLangModalOpen(true)}
                        className="p-2 rounded-md hover:bg-white/10 transition-colors"
                        title="Music Languages"
                    >
                        <Globe size={16} className="text-white/60" />
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem("melora-setup-complete");
                            window.dispatchEvent(new CustomEvent("melora-mode-change", { detail: "WELCOME" }));
                        }}
                        className="p-2 rounded-md hover:bg-white/10 transition-colors"
                        title="Switch Mode"
                    >
                        <Monitor size={16} className="text-white/60" />
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="p-2 rounded-md hover:bg-white/10 transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} className="text-white/60" />
                    </button>
                </div>

                <div className="text-[10px] text-white/20 font-mono">
                    v0.1.0-beta
                </div>
            </div>
        </aside>
    );
}
