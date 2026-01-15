import { motion } from "framer-motion";
import { ChevronRight, Battery, Wifi, Play, Pause, SkipForward, SkipBack, Volume2, Search, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";
import { CinemaModeMobile as CinemaMode } from "./cinema-mode-mobile";
import { CoverFlowMobile as CoverFlow } from "./cover-flow-mobile";
import { ParachuteGame } from "./games/ParachuteGame";

interface IpodScreenProps {
    variant?: 'menu' | 'player' | 'search' | 'loading' | 'message' | 'cinema' | 'cover-flow' | 'game' | 'lyrics';
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
}

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
    scrollDirection
}: IpodScreenProps) {

    // Format helper
    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

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
        <div className="w-full h-full bg-black flex flex-col font-sans text-xs overflow-hidden text-white">
            {/* Top Bar - Dark Glass */}
            <div className="h-6 bg-gradient-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700 flex items-center justify-between px-2 shrink-0 z-20 shadow-sm relative">

                {/* Left: Play Status / Back */}
                <div className="flex items-center gap-1.5 min-w-[30%]" onClick={onBack}>
                    <ChevronRight size={12} className="rotate-180 text-zinc-400" />
                    {variant === 'player' && isPlaying ? (
                        <Play size={10} className="fill-blue-400 text-blue-400 animate-pulse" />
                    ) : variant === 'player' ? (
                        <Pause size={10} className="fill-zinc-400 text-zinc-400" />
                    ) : (
                        <span className="font-semibold text-zinc-100 text-[11px] tracking-tight drop-shadow-md truncate">{title}</span>
                    )}
                </div>

                {/* Center: Clock (The classic iPod header look) */}
                <div className="absolute left-1/2 -translate-x-1/2 font-bold text-[10px] text-zinc-300 flex items-center gap-2">
                    {/* Status Icons */}
                    {isLocked && <span className="text-[9px] text-orange-500">🔒</span>}
                    {shuffle && <span className="text-[9px] text-blue-400">🔀</span>}
                    {repeat === 'one' && <span className="text-[9px] text-blue-400">🔂</span>}
                    {repeat === 'all' && <span className="text-[9px] text-blue-400">🔁</span>}
                    <span>{time}</span>
                </div>

                {/* Right: Battery */}
                <div className="flex items-center justify-end min-w-[30%] gap-1.5">
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
                {variant === 'message' ? (
                    <div className="w-full h-full flex items-center justify-center p-6 text-center">
                        <p className="text-sm font-medium text-zinc-400 leading-relaxed">{message}</p>
                    </div>
                ) : variant === 'lyrics' ? (
                    <div className="w-full h-full bg-black overflow-y-auto scrollbar-hide">
                        <div className="p-4 min-h-full flex items-center justify-center">
                            <pre className="whitespace-pre-wrap font-sans text-center text-xs text-zinc-300 leading-loose">
                                {lyrics || "No lyrics available."}
                            </pre>
                        </div>
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
                            isOpen={true}
                            onClose={onBack || (() => { })}
                            selectedIndex={selectedIndex}
                            items={itemsData}
                            isFlipped={isFlipped}
                            trackIndex={trackIndex}
                        />
                    </div>
                ) : variant === 'game' ? (
                    <div className="w-full h-full bg-black">
                        {/* We assume Parachute is the only game for now, or use title to switch */}
                        {title === 'Parachute' && (
                            <ParachuteGame
                                isActive={true}
                                onBack={onBack}
                                scrollDirection={scrollDirection}
                                onSelect={() => onItemSelect?.(0)} // Center button trigger
                            />
                        )}
                    </div>
                ) : variant === 'search' ? (
                    <div className="flex flex-col h-full bg-black">
                        {/* Search Bar */}
                        <div className="h-9 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 shrink-0 shadow-inner">
                            <div className="w-full h-6 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center px-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                <span className="text-zinc-500 mr-2 opacity-70">🔍</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery || ""}
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                    placeholder="Search Music..."
                                    className="bg-transparent w-full text-white text-[11px] font-medium focus:outline-none placeholder:text-zinc-600 caret-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onSearchSubmit?.(searchQuery);
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
                                                    <span className={`truncate text-[11px] ${isSelected ? 'font-semibold text-white' : 'text-zinc-200'}`}>{item}</span>
                                                    {/* Subtitle / Artist */}
                                                    {isSelected && (
                                                        <div className="flex flex-col">
                                                            {itemsData[index]?.data?.primaryArtists && (
                                                                <span className={`truncate text-[9px] ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                                    {itemsData[index].data.primaryArtists}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
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
                                <h2 className="text-white font-bold text-xs truncate leading-snug mb-0.5 drop-shadow-md">{decodeHtml(currentSong?.name || "No Music")}</h2>
                                <p className="text-zinc-300 text-[10px] truncate mb-0.5">{decodeHtml(currentSong?.primaryArtists || "Unknown Artist")}</p>
                                <p className="text-zinc-500 text-[9px] truncate mb-2">{decodeHtml(currentSong?.album?.name || "Melora")}</p>

                                {/* Progress Bar */}
                                <div className="w-full mt-1">
                                    <div className="flex justify-between text-[8px] text-zinc-400 font-mono mb-1 tracking-tight">
                                        <span>{formatTime(progress * duration)}</span>
                                        <span>-{formatTime(duration - (progress * duration))}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800/80 rounded-full border border-zinc-700 relative backdrop-blur-sm">
                                        <div
                                            className={`h-full transition-colors duration-200 ${controlMode === 'seek' ? 'bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-400' : 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500'}`}
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
            </div>
        </div >
    );
}
