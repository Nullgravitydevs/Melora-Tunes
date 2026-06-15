"use client";

import React, { useState, useCallback, useMemo } from "react";
import { usePlayback } from "@/components/providers/playback-context";
import { AnimatePresence, motion } from "framer-motion";
import {
    Home, Search, Compass, Library, Play, Pause,
    SkipBack, SkipForward
} from "lucide-react";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { decodeHtml } from "@/lib/utils";
import { getArt } from "@/lib/helpers";

import { HomeTab } from "./tabs/HomeTab";
import { SearchTab } from "./tabs/SearchTab";
import { ExploreTab } from "./tabs/ExploreTab";

import { LibraryTab } from "./tabs/LibraryTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { FullPlayerSheet } from "./views/FullPlayerSheet";
import { ArtistView } from "./views/ArtistView";
import { AlbumView } from "./views/AlbumView";
import { PlaylistView } from "./views/PlaylistView";
import { SectionView } from "./views/SectionView";
import { useAudioProgress } from "@/hooks/use-audio-progress";


// ─── Types ───────────────────────────────────────────────
type Tab = "HOME" | "SEARCH" | "EXPLORE" | "LIBRARY" | "SETTINGS";

export interface ViewState {
    id: string;
    data?: any;
}

// ─── Helpers ─────────────────────────────────────────────
// getArt is now imported from @/lib/helpers and re-exported for backward compat
export { getArt } from "@/lib/helpers";

// ─── Main Entry ──────────────────────────────────────────
export function DiscoveryEntry() {
    const [activeTab, setActiveTab] = useState<Tab>("HOME");
    const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(["HOME"]));
    const [viewStack, setViewStack] = useState<ViewState[]>([]);
    const [showFullPlayer, setShowFullPlayer] = useState(false);
    const { currentSong, isPlaying, togglePlay, next, prev, activeQuality } = usePlayback();
    const { progress } = useAudioProgress();

    const navigate = useCallback((view: ViewState) => {
        setViewStack((s) => [...s, view]);
    }, []);

    const goBack = useCallback(() => {
        setViewStack((s) => s.slice(0, -1));
    }, []);

    const switchTab = useCallback((tab: Tab) => {
        setActiveTab(tab);
        setMountedTabs(prev => { const next = new Set(prev); next.add(tab); return next; });
        setViewStack([]);
    }, []);

    const songName = useMemo(() => currentSong ? decodeHtml((currentSong as any).name || (currentSong as any).title || "") : "", [currentSong]);
    const songArtist = useMemo(() => currentSong ? decodeHtml((currentSong as any).primaryArtists || (currentSong as any).artist || "") : "", [currentSong]);
    const songArt = useMemo(() => currentSong ? getArt(currentSong) : "", [currentSong]);
    const topView = viewStack[viewStack.length - 1];

    return (
        <div className="w-full h-[100dvh] bg-black text-white flex flex-col font-sans overflow-hidden relative select-none">
            {/* Noise overlay */}
            <svg className="pointer-events-none fixed inset-0 z-[200] w-full h-full opacity-[0.012]" aria-hidden="true">
                <filter id="mdn"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" /></filter>
                <rect width="100%" height="100%" filter="url(#mdn)" />
            </svg>

            {/* Overlay views */}
            <AnimatePresence>
                {topView && topView.id !== "settings" && (
                    <motion.div
                        key={topView.id + viewStack.length}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="absolute inset-0 z-[100] bg-black"
                    >
                        {topView.id === "artist" && <ArtistView artist={topView.data} onBack={goBack} onNavigate={navigate} />}
                        {topView.id === "album" && <AlbumView album={topView.data} onBack={goBack} onNavigate={navigate} />}
                        {topView.id === "playlist" && <PlaylistView playlist={topView.data} onBack={goBack} onNavigate={navigate} />}
                        {topView.id === "section" && <SectionView section={topView.data} onBack={goBack} onNavigate={navigate} />}
                    </motion.div>
                )}
                {topView?.id === "settings" && (
                    <motion.div
                        key="settings-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 400) goBack(); }}
                        className="absolute inset-0 z-[100] bg-black rounded-t-3xl overflow-hidden touch-none"
                        style={{ touchAction: "none" }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-0 cursor-grab active:cursor-grabbing">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        <div className="overflow-y-auto h-[calc(100%-20px)] overscroll-contain" style={{ touchAction: "pan-y" }}>
                            <SettingsTab />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full player */}
            <FullPlayerSheet isOpen={showFullPlayer} onClose={() => setShowFullPlayer(false)} onNavigate={navigate} />

            {/* Tab content — lazy-mounted: tabs only render after first visit */}
            <div className="flex-1 overflow-y-auto pb-40 no-scrollbar z-10">
                <div className={activeTab === "HOME" ? "" : "hidden"}><HomeTab onNavigate={navigate} /></div>
                {mountedTabs.has("SEARCH") && <div className={activeTab === "SEARCH" ? "" : "hidden"}><SearchTab onNavigate={navigate} /></div>}
                {mountedTabs.has("EXPLORE") && <div className={activeTab === "EXPLORE" ? "" : "hidden"}><ExploreTab onNavigate={navigate} /></div>}
                {mountedTabs.has("LIBRARY") && <div className={activeTab === "LIBRARY" ? "" : "hidden"}><LibraryTab onNavigate={navigate} /></div>}
                {mountedTabs.has("SETTINGS") && <div className={activeTab === "SETTINGS" ? "" : "hidden"}><SettingsTab /></div>}
            </div>

            {/* Bottom dock */}
            <div className="absolute bottom-0 left-0 w-full z-50">
                {/* Mini player */}
                {currentSong && (
                    <div className="mx-3 mb-2">
                        <div
                            className="bg-neutral-950/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_-4px_30px_rgba(0,0,0,0.5)]"
                            onClick={() => setShowFullPlayer(true)}
                        >
                            <div className="h-[2px] bg-white/[0.04] w-full">
                                <div className="h-full bg-white/60 transition-all duration-300" style={{ width: `${(progress || 0) * 100}%` }} />
                            </div>
                            <div className="flex items-center p-2.5 gap-3">
                                <div className="w-11 h-11 rounded-[10px] bg-white/[0.04] overflow-hidden flex-shrink-0">
                                    {songArt && <img src={songArt} className="w-full h-full object-cover" alt="" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-white truncate leading-tight">{songName}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-[11px] text-white/40 truncate font-medium">{songArtist}</p>
                                        {activeQuality && <QualityBadge quality={activeQuality} variant="mini" />}
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={prev} className="w-9 h-9 flex items-center justify-center text-white/50 active:text-white active:scale-90 transition-all">
                                        <SkipBack size={16} fill="currentColor" />
                                    </button>
                                    <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-black active:scale-90 transition-transform">
                                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                    </button>
                                    <button onClick={next} className="w-9 h-9 flex items-center justify-center text-white/50 active:text-white active:scale-90 transition-all">
                                        <SkipForward size={16} fill="currentColor" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab bar */}
                <div className="bg-black/90 backdrop-blur-2xl border-t border-white/[0.04]">
                    <div className="flex items-start justify-around pt-2.5 pb-7">
                        <TabBtn icon={Home} label="Home" active={activeTab === "HOME"} onClick={() => switchTab("HOME")} />
                        <TabBtn icon={Search} label="Search" active={activeTab === "SEARCH"} onClick={() => switchTab("SEARCH")} />
                        <TabBtn icon={Compass} label="Explore" active={activeTab === "EXPLORE"} onClick={() => switchTab("EXPLORE")} />
                        <TabBtn icon={Library} label="Library" active={activeTab === "LIBRARY"} onClick={() => switchTab("LIBRARY")} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} aria-label={label} role="tab" aria-selected={active} className={`flex flex-col items-center gap-1 transition-all duration-200 min-w-[56px] ${active ? "text-white" : "text-white/30"}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
            <span className={`text-[10px] font-medium tracking-wide ${active ? "opacity-100" : "opacity-60"}`}>{label}</span>
        </button>
    );
}
