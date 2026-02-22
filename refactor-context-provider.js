const fs = require('fs');
const path = require('path');

const contextFile = path.join(__dirname, 'components/providers/playback-context.tsx');
let content = fs.readFileSync(contextFile, 'utf8');

const typeReplacement = `export interface LibraryContextType {
    mixes: Mix[];
    setMixes: (mixes: Mix[]) => void;
    addMix: (mix: Mix) => boolean;
    updateMix: (mixId: string, updates: Partial<Mix>) => void;
    deleteMix: (mixId: string) => void;
    undoDeleteMix: () => void;
    deletedMixBackup: { mix: Mix; index: number } | null;
    addSongToMix: (mixId: string, song: JioSaavnSong | PlayableTrack) => void;
    
    savedAlbums: any[];
    savedArtists: any[];
    toggleSaveAlbum: (album: any) => void;
    toggleFollowArtist: (artist: any) => void;
    isAlbumSaved: (id: string) => boolean;
    isArtistFollowed: (id: string) => boolean;

    likedSongs: JioSaavnSong[];
    toggleLike: (song: JioSaavnSong | PlayableTrack) => void;
    isLiked: (songId: string) => boolean;

    recentlyPlayed: JioSaavnSong[];

    downloadSong: (song: JioSaavnSong | PlayableTrack) => Promise<boolean>;
    removeDownload: (songId: string, quality?: AudioQuality) => Promise<void>;
    isDownloaded: (songId: string, quality?: AudioQuality) => boolean;
}

export interface UIContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    toast: ToastState | null;
}

export interface PlaybackContextType {
    // State
    activeMixId: string | null;
    isPlaying: boolean;
    playbackState: PlaybackState;
    currentSong: JioSaavnSong | undefined;
    currentTrack: PlayableTrack | undefined;
    volume: number;
    shuffle: boolean;
    repeat: 'off' | 'one' | 'all';
    duration: number;

    // Actions
    setQueue: (queue: (JioSaavnSong | PlayableTrack)[]) => void;
    loadMix: (mixId: string) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    seek: (amount: number) => void;
    setVolume: (vol: number) => void;
    setShuffle: (val: boolean) => void;
    setRepeat: (val: 'off' | 'one' | 'all') => void;

    isLoaded: boolean;
    activeMix: Mix | undefined;

    // Queue
    queue: JioSaavnSong[];
    currentIndex: number;
    playIndex: (index: number) => void;

    sleepTimer: { endTime: number; duration: number } | null;
    setSleepTimer: (timer: { endTime: number; duration: number } | null) => void;

    crossfadeDuration: number;
    setCrossfadeDuration: (duration: number) => void;

    qualityPreference: AudioQuality;
    setQualityPreference: (q: AudioQuality) => void;

    togglePin: (mixId: string) => void;
    
    stopAtEndOfSong: boolean;
    setStopAtEndOfSong: (val: boolean) => void;

    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => void;

    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;

    eq: ReturnType<typeof useEqualizer>;

    playInstantMix: (mix: Mix) => void;
    addToQueue: (song: JioSaavnSong | PlayableTrack) => void;
    activeQuality: AudioQuality | null;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);
export const UIContext = createContext<UIContextType | undefined>(undefined);
export const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);`;

const typeRegex = /interface\s+PlaybackContextType\s*\{[\s\S]*?\}\s*const\s+PlaybackContext\s*=\s*createContext<PlaybackContextType\s*\|\s*undefined>\(undefined\);/m;
content = content.replace(typeRegex, typeReplacement);

const memoReplacement = `    const libraryValue = useMemo(() => ({
        mixes, setMixes, addMix, updateMix, deleteMix, undoDeleteMix, deletedMixBackup, addSongToMix,
        savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isAlbumSaved, isArtistFollowed,
        likedSongs, toggleLike, isLiked, recentlyPlayed,
        downloadSong, removeDownload, isDownloaded
    }), [
        mixes, setMixes, addMix, updateMix, deleteMix, undoDeleteMix, deletedMixBackup, addSongToMix,
        savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isAlbumSaved, isArtistFollowed,
        likedSongs, toggleLike, isLiked, recentlyPlayed,
        downloadSong, removeDownload, isDownloaded
    ]);

    const uiValue = useMemo(() => ({
        showToast, toast
    }), [showToast, toast]);

    const playbackValue = useMemo(() => ({
        activeMixId, isPlaying, currentSong, currentTrack, volume, duration, shuffle, repeat,
        setQueue, loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,
        isLoaded, activeMix,
        queue: filteredQueue, currentIndex: activeMixCurrentIndex, playIndex,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration,
        qualityPreference, setQualityPreference,
        togglePin, activeQuality,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed,
        eq, playInstantMix, addToQueue,
        playbackState
    }), [
        activeMixId, isPlaying, currentSong, currentTrack, volume, duration, shuffle, repeat,
        setQueue, loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,
        isLoaded, activeMix,
        filteredQueue, activeMixCurrentIndex, playIndex,
        sleepTimer, setSleepTimer, crossfadeDuration, setCrossfadeDuration,
        qualityPreference, setQualityPreference,
        togglePin, activeQuality,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed,
        eq, playInstantMix, addToQueue,
        playbackState
    ]);`;

const memoRegex = /const\s+value\s*=\s*useMemo\(\(\)\s*=>\s*\(\{[\s\S]*?\}\),\s*\[[\s\S]*?\]\);/m;
content = content.replace(memoRegex, memoReplacement);

const returnReplacement = `    return (
        <UIContext.Provider value={uiValue}>
            <LibraryContext.Provider value={libraryValue}>
                <PlaybackContext.Provider value={playbackValue}>
                    {children}

                    {/* Global Audio Element */}
                    <AudioPlayer
                        ref={audioPlayerRef}
                        url={currentSongUrl}
                        nextUrl={nextSongUrl}
                        playing={isPlaying}
                        volume={volume}
                        speed={playbackSpeed}
                        crossfadeDuration={crossfadeDuration}
                        eqBands={eq.isEnabled ? eq.bands : undefined} // Only pass bands if enabled
                        onEnded={() => {
                            // [SignalStore] Full Listen
                            if (currentTrack) {
                                SignalStore.addSignal(currentTrack, 'PLAY', 'discovery', duration);
                            }
                            next();
                        }}
                        onPlaying={() => setPlaybackState('playing')}
                        onProgress={({ played, playedSeconds }) => {
                            setProgress(played);
                            window.dispatchEvent(new CustomEvent('melora-audio-progress', { detail: { played, playedSeconds } }));

                            // SponsorBlock Check
                            if (skipSegments.length > 0 && duration > 0) {
                                for (const seg of skipSegments) {
                                    // Check if inside segment (with slight buffer at start to allow seek)
                                    if (playedSeconds >= seg.segment[0] && playedSeconds < seg.segment[1]) {
                                        const seekRatio = seg.segment[1] / duration;
                                        if (seekRatio < 1) {
                                            audioPlayerRef.current?.seekTo(seekRatio);
                                            break; // Only skip one at a time
                                        }
                                    }
                                }
                            }
                        }}
                        onDuration={setDuration}
                        // [FIX Bug 17] Use currentTrack props for UI consistency (fixes compound ID flashing)
                        title={cleanTrackTitle(decodeHtml(currentTrack?.song?.name || ""))}
                        artist={decodeHtml(currentTrack?.song?.primaryArtists || "")}
                        album={decodeHtml(currentTrack?.song?.album?.name || "")}
                        artwork={currentTrack?.song?.image?.[0]?.link}
                        onError={(msg) => handlePlaybackError(msg)}
                    />

                    {/* Minimal Toast UI */}
                    {
                        toast && (
                            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-zinc-800/90 text-white text-xs font-bold rounded-full border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 transition-all">
                                {toast.type === 'error' && <span className="text-red-400">⚠️</span>}
                                {toast.type === 'info' && <span className="text-amber-400">ℹ️</span>}
                                {toast.message}
                            </div>
                        )
                    }
                </PlaybackContext.Provider>
            </LibraryContext.Provider>
        </UIContext.Provider>
    );`;

const returnRegex = /return\s*\(\s*<PlaybackContext\.Provider\s+value=\{value\}>[\s\S]*?<\/PlaybackContext\.Provider\s*>\s*\);/m;
content = content.replace(returnRegex, returnReplacement);

const hooksReplacement = `export function usePlayback() {
    const context = useContext(PlaybackContext);
    if (context === undefined) throw new Error("usePlayback must be used within a PlaybackProvider");
    return context;
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (context === undefined) throw new Error("useLibrary must be used within a PlaybackProvider (LibraryContext)");
    return context;
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) throw new Error("useUI must be used within a PlaybackProvider (UIContext)");
    return context;
}`;

const hooksRegex = /export\s+function\s+usePlayback\(\)\s*\{[\s\S]*?return\s+context;\s*\}/m;
content = content.replace(hooksRegex, hooksReplacement);

fs.writeFileSync(contextFile, content, 'utf8');
console.log('Provider successfully rewritten!');
