import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Battery, Wifi, Play, Pause, SkipForward, SkipBack, Volume2, Search, ArrowRight, Star, Heart, Music, Zap, Smile, Ghost, Skull, HardDrive } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { JioSaavnSong, getAlbumDetails } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { CinemaModeMobile as CinemaMode } from "./cinema-mode-mobile";
import { CoverFlow3D as CoverFlow } from "./CoverFlow3D";
import { StickerType } from "./stickers/StickerLayer";



interface IpodScreenProps {
    variant?: 'menu' | 'player' | 'search' | 'loading' | 'message' | 'cinema' | 'cover-flow' | 'lyrics' | 'stickers';
    title: string;
    menuItems: string[]; // List of labels to display
    itemsData?: any[]; // Optional rich data for items (images etc)
    selectedIndex: number;
    currentSong?: JioSaavnSong;
    isPlaying?: boolean;
    progress?: number; // 0-1
    duration?: number; // seconds
    isLoading?: boolean;
    message?: string;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    onSearchSubmit?: (query: string) => void;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    onItemSelect?: (index: number) => void;
    onPlayPause?: () => void;
    onBack?: () => void;
    isFlipped?: boolean;
    trackIndex?: number;
    layout?: 'split' | 'full';
    customHeader?: React.ReactNode;
    controlMode?: 'volume' | 'seek'; // New prop for visual feedback
    shuffle?: boolean;
    repeat?: 'off' | 'one' | 'all';
    isLocked?: boolean;
    lyrics?: string | null;
    scrollDirection?: 'left' | 'right' | null;
    externalTracks?: JioSaavnSong[];
    isLiked?: boolean;
    onToggleLike?: () => void;
    audioQuality?: string; // e.g. 'FLAC', '320kbps'
    backlight?: number; // 0 to 1
    depth?: number;
    onAddSticker?: (type: StickerType, color: string) => void;
    isDownloaded?: (id: string) => boolean;
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0.5,
        zIndex: 1 // Entering item on top
    }),
    center: {
        x: 0,
        opacity: 1,
        zIndex: 0
    },
    exit: (direction: number) => ({
        x: direction < 0 ? "100%" : "-100%", // Exit opposite to enter
        opacity: 0.5,
        zIndex: 0
    })
};

export function IpodScreen({
    variant = 'menu',
    title,
    menuItems,
    itemsData = [],
    selectedIndex,
    currentSong,
    isPlaying = false,
    progress = 0,
    duration = 0,
    isLoading = false,
    message = "",
    searchQuery = "",
    onItemSelect,
    onPlayPause,
    onBack,
    onSearchChange,
    onSearchSubmit,
    inputRef,
    isFlipped,
    trackIndex,
    layout = 'split',
    customHeader,
    controlMode,
    shuffle,
    repeat,
    isLocked,
    lyrics,
    scrollDirection,
    externalTracks = [],
    isLiked = false,
    onToggleLike,
    onAddSticker,
    depth = 0,
    isDownloaded = () => false,
    backlight,
    audioQuality // Added missing prop
}: IpodScreenProps) {

    // ... (Existing Hook Logic) ...

    // Animation Direction Logic
    const [direction, setDirection] = useState(0);
    const prevDepth = useRef(depth);

    useEffect(() => {
        if (depth > prevDepth.current) {
            setDirection(1); // Forward
        } else if (depth < prevDepth.current) {
            setDirection(-1); // Backward
        } else {
            // Same depth (e.g. search updating), no slide usually, or neutral
            // but we might switch variant at same depth. 
            setDirection(0);
        }
        prevDepth.current = depth;
    }, [depth]);


    // Format helper
    const formatTime = useMemo(() => (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Helper to get image from item data if available
    const getItemImage = (index: number) => {
        const item = itemsData[index];
        // If item is a song (from search results context usually)
        if (item?.data?.image) {
            const img = item.data.image;
            return Array.isArray(img) ? img[0]?.link : img; // Low res for list
        }
        return null;
    };

    // Live Clock & Battery
    const [time, setTime] = useState("");
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [isCharging, setIsCharging] = useState(false);

    useEffect(() => {
        // Clock
        const updateTime = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            setTime(`${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000); // Every second

        // Battery
        let batteryRemoveListener: (() => void) | null = null;

        if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
            (navigator as any).getBattery().then((battery: any) => {
                const updateBattery = () => {
                    setBatteryLevel(Math.floor(battery.level * 100));
                    setIsCharging(battery.charging);
                };
                updateBattery();

                battery.addEventListener('levelchange', updateBattery);
                battery.addEventListener('chargingchange', updateBattery);

                batteryRemoveListener = () => {
                    battery.removeEventListener('levelchange', updateBattery);
                    battery.removeEventListener('chargingchange', updateBattery);
                };
            });
        }

        return () => {
            clearInterval(interval);
            if (batteryRemoveListener) batteryRemoveListener();
        };
    }, []);

    // Scroll to selected item in Search view
    useEffect(() => {
        if (variant === 'search' && selectedIndex >= 0) {
            const el = document.getElementById(`search-item-${selectedIndex}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, variant]);

    return (
        <div
            className="w-full h-full bg-black flex flex-col font-sans text-xs overflow-hidden text-white transition-all duration-1000 relative"
            style={{ filter: `brightness(${0.4 + (backlight ?? 1) * 0.6})` }}
        >
            {/* Lock Overlay */}
            <AnimatePresence>
                {isLocked && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                    >
                        <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2">
                            <span className="text-2xl">🔒</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar - Dark Glass */}
            <div className="h-6 bg-gradient-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700 flex items-center justify-between px-2 shrink-0 z-20 shadow-sm relative">

                {/* Left: Play Status / Back */}
                <div className="flex items-center gap-1.5 min-w-[30%] overflow-hidden" onClick={onBack}>
                    <ChevronRight size={12} className="rotate-180 text-zinc-400 shrink-0" />
                    {isPlaying ? (
                        <Play size={10} className="fill-blue-400 text-blue-400 animate-pulse shrink-0" />
                    ) : (
                        <Pause size={10} className="fill-zinc-400 text-zinc-400 shrink-0" />
                    )}
                </div>

                {/* Center: Title & Status Icons */}
                <div className="absolute left-1/2 -translate-x-1/2 font-bold text-[10px] text-zinc-300 flex items-center gap-2 max-w-[40%]">
                    <span className="font-semibold text-zinc-100 text-[11px] tracking-tight drop-shadow-md truncate">{title}</span>
                    {isLocked && <span className="text-[9px] text-orange-500 shrink-0">🔒</span>}
                    {shuffle && <span className="text-[9px] text-blue-400 shrink-0">🔀</span>}
                    {repeat === 'one' && <span className="text-[9px] text-blue-400 shrink-0">🔂</span>}
                    {repeat === 'all' && <span className="text-[9px] text-blue-400 shrink-0">🔁</span>}
                </div>

                {/* Right: Clock & Battery */}
                <div className="flex items-center justify-end min-w-[30%] gap-1.5">
                    <span className="text-[10px] text-zinc-400 font-mono mr-1">{time}</span>
                    {/* Signal Bars (Just visual decoration like original) */}
                    <div className="flex gap-0.5 items-end h-2 opacity-50">
                        <div className="w-0.5 h-1 bg-zinc-400 rounded-[0.5px]"></div>
                        <div className="w-0.5 h-1.5 bg-zinc-400 rounded-[0.5px]"></div>
                        <div className="w-0.5 h-2 bg-zinc-400 rounded-[0.5px]"></div>
                    </div>

                    {/* Battery Body */}
                    <div className="relative">
                        {isCharging && <div className="absolute -left-3 top-[-1px] text-[10px] text-green-400">⚡</div>}
                        <div className="w-5 h-2.5 border border-zinc-400 rounded-[1px] p-[1px] relative flex shadow-inner">
                            <div
                                className={`h-full transition-all duration-500 ${batteryLevel < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${batteryLevel}%` }}
                            />
                        </div>
                        {/* Battery Tip */}
                        <div className="absolute -right-[2px] top-0.5 w-[2px] h-1.5 bg-zinc-400 rounded-r-[1px]"></div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-black">
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                    <motion.div
                        key={variant + (title || "view")} // Use Variant + Title as ID instead of full hierarchy for smoother/stable transitions
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex-1 w-full h-full overflow-hidden relative"
                    >
                        {variant === 'message' ? (
                            <div className="w-full h-full flex items-center justify-center p-6 text-center">
                                <p className="text-sm font-medium text-zinc-400 leading-relaxed">{message}</p>
                            </div>
                        ) : variant === 'cinema' ? (
                            <div className="w-full h-full bg-black">
                                <CinemaMode
                                    isOpen={true}
                                    onClose={onBack || (() => { })}
                                    currentSong={currentSong || null}
                                />
                            </div>
                        ) : variant === 'cover-flow' ? (
                            <div className="w-full h-full bg-black">
                                <CoverFlow
                                    selectedIndex={selectedIndex}
                                    items={itemsData.map((item: any) => ({
                                        id: item?.data?.id || item?.id || String(Math.random()),
                                        image: item?.data?.image || item?.image || '',
                                        title: item?.data?.title || item?.label || 'Unknown',
                                        artist: item?.data?.artist || ''
                                    }))}
                                    isFlipped={isFlipped}
                                    trackIndex={trackIndex}
                                    onSelect={onItemSelect || (() => { })}
                                    scrollDirection={scrollDirection}
                                    tracks={externalTracks}
                                />
                            </div>

                        ) : variant === 'search' ? (
                            <div className="flex flex-col h-full bg-black">
                                {/* Search Bar */}
                                <div className="h-9 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 shrink-0 shadow-inner">
                                    <div className="w-full h-6 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center px-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                        <span className="text-zinc-500 mr-2 opacity-70">🔍</span>
                                        <input
                                            key="search-input"
                                            ref={inputRef}
                                            type="text"
                                            value={searchQuery || ""}
                                            onChange={(e) => onSearchChange?.(e.target.value)}
                                            placeholder="Search Music..."
                                            className="bg-transparent w-full text-white text-[11px] font-medium focus:outline-none placeholder:text-zinc-600 caret-blue-500"
                                            onKeyDown={(e) => {
                                                e.stopPropagation(); // Prevent global listeners
                                                if (e.key === 'Enter') {
                                                    onSearchSubmit?.(e.currentTarget.value);
                                                }
                                            }}
                                        />
                                        {/* Explicit Submit Button */}
                                        <button
                                            onClick={() => onSearchSubmit?.(searchQuery)}
                                            className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all"
                                        >
                                            <ArrowRight size={10} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" id="search-results-container">
                                    {isLoading ? (
                                        <div className="p-8 flex flex-col items-center justify-center opacity-50">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-500 border-t-transparent"></div>
                                        </div>
                                    ) : menuItems.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-600 text-[10px] uppercase tracking-wider font-semibold">No Results Found</div>
                                    ) : (
                                        menuItems.map((item, index) => {
                                            const isSelected = index === selectedIndex;
                                            const img = getItemImage(index);

                                            return (
                                                <div
                                                    key={`${item || 'item'}-${index}`}
                                                    id={`search-item-${index}`}
                                                    onClick={() => onItemSelect?.(index)}
                                                    className={`h-14 flex items-center justify-between px-3 font-medium border-b border-zinc-900 transition-colors cursor-pointer active:brightness-110 ${isSelected
                                                        ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-inner"
                                                        : "bg-black text-zinc-300"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                        {/* Thumbnail */}
                                                        <div className={`w-10 h-10 rounded-md shrink-0 bg-zinc-800 overflow-hidden shadow-sm border border-white/10 ${isSelected ? 'border-white/30' : ''}`}>
                                                            {img ? (
                                                                <img src={img} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">♪</div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">

                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className={`truncate text-[11px] ${isSelected ? 'font-semibold text-white' : 'text-zinc-200'} flex-1`}>
                                                                    {item}
                                                                </span>
                                                                {/* Explicit Quality Badges - Matches Unified Search Logic */}
                                                                {(itemsData[index]?.data?._quality === '24-bit' || itemsData[index]?.data?.source === 'tidal') && (
                                                                    <span className="shrink-0 text-[7px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded-sm font-bold border border-amber-500/30 shadow-[0_0_5px_rgba(245,158,11,0.2)]">
                                                                        Hi-Res
                                                                    </span>
                                                                )}
                                                                {itemsData[index]?.data?._quality === 'FLAC' && (
                                                                    <span className="shrink-0 text-[7px] bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded-sm font-bold border border-purple-500/30">
                                                                        FLAC
                                                                    </span>
                                                                )}
                                                                {itemsData[index]?.data?._quality === '320kbps' && (
                                                                    <span className="shrink-0 text-[7px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded-sm font-bold border border-emerald-500/30">
                                                                        HQ
                                                                    </span>
                                                                )}
                                                                {/* OFFLINE TAG */}
                                                                {itemsData[index]?.data?.id && isDownloaded(itemsData[index].data.id) && (
                                                                    <span className="shrink-0 text-[7px] flex items-center gap-0.5 bg-green-500/20 text-green-400 px-1 py-0.5 rounded-sm font-bold border border-green-500/30">
                                                                        <HardDrive size={6} />
                                                                        OFFLINE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Subtitle / Artist - Always visible for modern feel */}
                                                            <div className="flex flex-col">
                                                                {itemsData[index]?.data?.primaryArtists && (
                                                                    <span className={`truncate text-[9px] ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                                        {itemsData[index].data.primaryArtists}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={12} className={`shrink-0 ml-2 ${isSelected ? "text-blue-200" : "text-zinc-700"}`} />
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : isLoading ? (
                            // Default Loading State for non-search views
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-800 border-t-blue-500"></div>
                                <span className="text-[10px] text-zinc-500 font-medium animate-pulse">Loading...</span>
                            </div>
                        ) : variant === 'menu' ? (
                            // --- MENU VIEW (Split or Full) ---
                            <div className="flex h-full bg-black">
                                {/* Menu List */}
                                <div className={`${layout === 'full' ? 'w-full' : 'w-1/2'} flex flex-col bg-black ${layout === 'split' ? 'border-r border-zinc-800' : ''} relative overflow-hidden`}>
                                    {customHeader}
                                    {(() => {
                                        const VISIBLE_COUNT = 9;
                                        const half = Math.floor(VISIBLE_COUNT / 2);
                                        let start = selectedIndex - half;
                                        if (start < 0) start = 0;
                                        let end = start + VISIBLE_COUNT;
                                        if (end > menuItems.length) {
                                            end = menuItems.length;
                                            start = Math.max(0, end - VISIBLE_COUNT);
                                        }

                                        const visibleItems = menuItems.slice(start, end);

                                        return visibleItems.map((item, i) => {
                                            const realIndex = start + i;
                                            const isSelected = realIndex === selectedIndex;
                                            return (
                                                <div
                                                    key={realIndex} // Use realIndex for stability
                                                    onClick={() => onItemSelect?.(realIndex)}
                                                    className={`h-9 flex items-center justify-between px-3 font-medium text-[11px] cursor-pointer active:brightness-110 ${isSelected
                                                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md sticky top-0 z-10"
                                                        : "bg-black text-white border-b border-zinc-900"
                                                        }`}
                                                >
                                                    <span className="truncate font-semibold">{item}</span>
                                                    <ChevronRight size={12} className={isSelected ? "text-white" : "text-zinc-600"} />
                                                </div>
                                            );
                                        });
                                    })()}
                                    {/* Scroll Indicator removed per user request */}
                                </div>
                                {/* Right: Preview / Album Art Placeholder (Only in Split Mode) */}
                                {layout === 'split' && (
                                    <div className="w-1/2 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-3 relative z-10 overflow-hidden">
                                        {/* If we had "focused item" metadata, we could show it here. For now static or current song art */}
                                        {/* Reflection Effect */}
                                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                        {/* Top Bar: Status */}
                                        <div className="h-6 flex items-center justify-between px-1.5 bg-gradient-to-b from-white/20 to-transparent shrink-0 relative z-20">
                                            <div className="flex items-center gap-1">
                                                {/* Back Button - Visible & Interactive */}
                                                {variant !== 'menu' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onBack?.();
                                                        }}
                                                        className="p-0.5 hover:bg-white/20 rounded cursor-pointer active:scale-95 transition-transform"
                                                    >
                                                        <div className="flex items-center gap-0.5 text-[9px] font-medium opacity-90">
                                                            <span className="text-[10px]">‹</span>
                                                            <span>Menu</span>
                                                        </div>
                                                    </button>
                                                )}
                                                {variant === 'menu' && (
                                                    <div className="flex items-center gap-1">
                                                        {isPlaying ? <Play size={8} fill="currentColor" /> : <Pause size={8} fill="currentColor" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {currentSong?.image ? (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                key={currentSong.id} // Animate on change
                                                className="relative w-full aspect-square shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                                            >
                                                <img
                                                    src={Array.isArray(currentSong.image) ? currentSong.image[0]?.link : currentSong.image as string}
                                                    alt="Art"
                                                    className="w-full h-full object-cover rounded-md border border-white/10"
                                                />
                                                {/* Glass sheen on art */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-md pointer-events-none" />
                                            </motion.div>
                                        ) : (
                                            <div className="w-3/4 aspect-square bg-zinc-800 rounded-lg shadow-inner flex items-center justify-center text-zinc-600 border border-zinc-700">
                                                <span className="text-2xl">♪</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : variant === 'lyrics' ? (
                            // --- LYRICS VIEW ---
                            <div className="h-full w-full bg-black flex flex-col items-center">
                                {/* Header (Song Name) */}
                                <div className="w-full text-center py-1 mt-1 border-b border-zinc-800 bg-black z-10 shrink-0">
                                    <h3 className="text-[10px] font-bold text-white truncate px-4">
                                        {decodeHtml(currentSong?.name || "Lyrics")}
                                    </h3>
                                    <p className="text-[8px] text-zinc-500 truncate px-4">
                                        {decodeHtml(currentSong?.primaryArtists || "")}
                                    </p>
                                </div>

                                {/* Lyrics Content */}
                                <div className="flex-1 w-full overflow-y-auto px-4 py-3 text-center no-scrollbar">
                                    <div className="whitespace-pre-wrap font-medium text-[11px] leading-relaxed text-zinc-300">
                                        {lyrics ? lyrics : (
                                            <div className="h-full flex flex-col items-center justify-center gap-2 opacity-50 mt-12">
                                                <span className="text-2xl">📝</span>
                                                <span>No lyrics available</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-10"></div> {/* Padding bottom for scroll */}
                                </div>
                            </div>

                        ) : variant === 'stickers' ? (
                            // --- STICKER COLLECTION VIEW ---
                            <div className="h-full w-full bg-zinc-900 flex flex-col p-2">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                    <span className="text-xs font-bold text-white">Sticker Collection</span>
                                    <span className="text-[10px] text-zinc-500 ml-auto">Select to Add</span>
                                </div>
                                {/* Grid */}
                                <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-4 no-scrollbar">
                                    {[
                                        { type: 'star', color: '#fbbf24', label: 'Star', bg: 'bg-amber-500/10', icon: Star },
                                        { type: 'heart', color: '#f43f5e', label: 'Heart', bg: 'bg-rose-500/10', icon: Heart },
                                        { type: 'music', color: '#a855f7', label: 'Tune', bg: 'bg-purple-500/10', icon: Music },
                                        { type: 'zap', color: '#f59e0b', label: 'Bolt', bg: 'bg-orange-500/10', icon: Zap },
                                        { type: 'smile', color: '#22c55e', label: 'Happy', bg: 'bg-green-500/10', icon: Smile },
                                        { type: 'ghost', color: '#e2e8f0', label: 'Boo', bg: 'bg-zinc-500/10', icon: Ghost },
                                        { type: 'skull', color: '#94a3b8', label: 'Edgy', bg: 'bg-slate-500/10', icon: Skull }
                                    ].map((s, i) => (
                                        <button
                                            key={s.type}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${selectedIndex === i ? 'scale-110 drop-shadow-lg' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                            onClick={() => onAddSticker && onAddSticker(s.type as StickerType, s.color)}
                                        >
                                            <div className="relative">
                                                {/* Shadow for realism */}
                                                <s.icon size={32} className="text-black/20 absolute top-0.5 left-0.5 blur-[1px]" />
                                                <s.icon size={32} fill={s.color} stroke={s.color} className="relative z-10" />
                                            </div>
                                            {selectedIndex === i && <span className="text-[9px] font-medium text-white/90 mt-1">{s.label}</span>}
                                        </button>
                                    ))}
                                </div>
                                {/* Footer Hint */}
                                <div className="mt-auto pt-2 text-[8px] text-center text-zinc-500 border-t border-white/5">
                                    Pro Tip: Peel stickers off slowly to avoid residue!
                                </div>
                            </div>
                        ) : (
                            // --- PLAYER VIEW ---
                            <div className="h-full w-full relative flex flex-col">
                                {/* Full Background Blur */}
                                {currentSong?.image && (
                                    <div className="absolute inset-0 z-0 overflow-hidden opacity-40">
                                        <img
                                            src={Array.isArray(currentSong.image) ? currentSong.image[2]?.link : currentSong.image as string}
                                            alt="BG"
                                            className="w-full h-full object-cover blur-xl scale-125"
                                        />
                                        <div className="absolute inset-0 bg-black/50" />
                                    </div>
                                )}

                                <div className="flex-1 flex flex-row p-3 gap-3 items-center z-10">
                                    {/* Left: Large Art */}
                                    <motion.div
                                        className="w-[48%] aspect-square bg-zinc-900 shadow-2xl relative shrink-0 rounded-md overflow-hidden border border-white/10"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    >
                                        {currentSong?.image ? (
                                            <img
                                                src={Array.isArray(currentSong.image) ? currentSong.image[0]?.link : currentSong.image as string} // Force Index 0 (Highest Quality)
                                                alt="Art"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white bg-zinc-800">♪</div>
                                        )}
                                        {/* Gloss */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                                    </motion.div>

                                    {/* Right: Metadata & Info */}
                                    <div className="flex-1 flex flex-col justify-center text-left overflow-hidden min-w-0">
                                        {/* Song Title with Quality Badge */}
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <h2 className="text-white font-bold text-xs truncate leading-snug drop-shadow-md flex-1 min-w-0">
                                                {decodeHtml(currentSong?.name || "No Music")}
                                            </h2>
                                            {audioQuality === 'hires' ? (
                                                <span className="shrink-0 text-[7px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-bold border border-amber-500/30">
                                                    Hi-Res
                                                </span>
                                            ) : audioQuality === 'FLAC' || audioQuality === 'flac' ? (
                                                <span className="shrink-0 text-[7px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-bold border border-blue-500/30">
                                                    FLAC
                                                </span>
                                            ) : audioQuality === '320kbps' || audioQuality === '320' ? (
                                                <span className="shrink-0 text-[7px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold border border-emerald-500/30">
                                                    HQ
                                                </span>
                                            ) : (audioQuality === '160' || audioQuality === '96') ? (
                                                <span className="shrink-0 text-[7px] bg-zinc-500/20 text-zinc-400 px-1 py-0.5 rounded font-bold border border-zinc-500/30">
                                                    SD
                                                </span>
                                            ) : null}
                                            {/* Offline Tag (Player) */}
                                            {currentSong && isDownloaded(currentSong.id) && (
                                                <span className="shrink-0 text-[7px] flex items-center gap-0.5 bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-bold border border-green-500/30 ml-1.5">
                                                    <HardDrive size={6} />
                                                    OFFLINE
                                                </span>
                                            )}
                                        </div>

                                        {/* Artist with Like Button */}
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-zinc-300 text-[10px] truncate flex-1 min-w-0">
                                                {decodeHtml(currentSong?.primaryArtists || "Unknown Artist")}
                                            </p>
                                            <button
                                                onClick={onToggleLike}
                                                className={`shrink-0 text-sm transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-zinc-600'}`}
                                            >
                                                {isLiked ? '❤️' : '🤍'}
                                            </button>
                                        </div>

                                        <p className="text-zinc-500 text-[9px] truncate mb-2">{decodeHtml(currentSong?.album?.name || "Melora")}</p>

                                        {/* Progress Bar */}
                                        <div className="w-full mt-1">
                                            <div className="flex justify-between text-[8px] text-zinc-400 font-mono mb-1 tracking-tight">
                                                <span>{formatTime(progress * duration)}</span>
                                                <span>-{formatTime(duration - (progress * duration))}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-zinc-800/80 rounded-full border border-zinc-700 relative backdrop-blur-sm">
                                                <div
                                                    className={`h-full rounded-full transition-colors duration-200 ${controlMode === 'seek' ? 'bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-400' : 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500'}`}
                                                    style={{ width: `${progress * 100}%` }}
                                                >
                                                    <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_5px_white]" />
                                                </div>

                                                {/* Diamond Scrubber Handle */}
                                                {controlMode === 'seek' && (
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white shadow-lg border border-zinc-300 rotate-45 z-10"
                                                        style={{ left: `calc(${progress * 100}% - 6px)` }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    );
}
