"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { JioSaavnSong, getAudioUrl, getSongDetails, searchSongs } from "@/lib/jiosaavn";
import { getHiFiStream, searchHiFi } from '@/lib/hifi-client';
import { KeyVault } from '@/lib/key-vault';
import { AudioPlayer, AudioPlayerRef } from "@/components/ui/audio-player";
import { decodeHtml, cleanTrackTitle } from "@/lib/utils";
import { recordPlay } from "@/lib/stats";
import { loadSettings, saveSettings } from "@/lib/settings";
import { getSkipSegments, SkipSegment } from "@/lib/sponsorblock";
import { useEqualizer } from "@/hooks/useEqualizer";
import { OfflineStore } from "@/lib/offline-store";
import { HistoryStore } from "@/lib/history-store";
import { SignalStore } from "@/lib/signal-store";
import { DiscoveryEngine } from '@/lib/discovery-engine';
import { normalizeIdentity } from '@/lib/discovery-engine';
import { analyzeAudioOffline, AudioAnalysisResult } from '@/lib/audio-analysis';
import { MetadataStore } from '@/lib/metadata-store';
import { DownloadQualityPicker } from "@/components/ui/download-quality-picker";
import { useSettings } from './settings-provider';
import { LibraryContextType } from './library-provider';
import { useLibrary } from './library-provider';
import { useUI } from './ui-context';

// --- Audio Quality Abstraction ---
import { AudioQuality, PlayableSource, PlayableTrack, isPlayableTrack } from "@/lib/types";

// --- Provider Capabilities ---
const PROVIDER_CAPABILITIES: Record<string, AudioQuality[]> = {
    'jiosaavn': ['320', '160', '96'],
    'ytmusic': [],
    'tidal': ['flac', 'hires'],
    'qobuz': ['flac', 'hires']
};


// Internal Toast Interface
interface ToastState {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

// --- Playback State Machine ---
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'buffering' | 'stalled';



// Upgrade helper
// [REFACTORED] Moved to lib/track-utils.ts to resolve circular dependency with DiscoveryEngine
import { ensurePlayableTrack, normalizeSongTitle, cleanArtistName, checkArtistOverlap, deduplicateQueue } from "@/lib/track-utils";
export { ensurePlayableTrack };

export interface Mix {
    id: string;
    title: string;
    color: "orange" | "purple" | "white" | "green" | "red" | "blue" | "cyan" | "pink" | "teal" | "yellow" | "black";
    songs: (JioSaavnSong | PlayableTrack)[];
    currentSongIndex: number;
    pinned?: boolean; // New: Sync with Deck
}


export * from './library-provider';
export * from './ui-context';

export interface PlaybackContextType {
    // State
    activeMixId: string | null;
    isPlaying: boolean;
    playbackState: PlaybackState;
    currentSong: JioSaavnSong | undefined;
    currentTrack: PlayableTrack | undefined;
    currentTrackMetadata: AudioAnalysisResult | null;
    volume: number;
    shuffle: boolean;
    repeat: 'off' | 'one' | 'all';
    duration: number;

    // Actions
    setQueue: (queue: (JioSaavnSong | PlayableTrack)[]) => void;
    loadMix: (mixId: string, forceIndex?: number) => void;
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
    getAnalyser: () => AnalyserNode | null;
    downloadSong: (songOrTrack: JioSaavnSong | PlayableTrack) => Promise<boolean>;
    downloadSongs: (songs: (JioSaavnSong | PlayableTrack)[]) => Promise<boolean>;
    downloadQueue: { song: JioSaavnSong | PlayableTrack; quality: AudioQuality; status: 'pending' | 'downloading' | 'error' | 'done', progress?: number, speed?: number }[];
    startRadio: (songOrQuery: any) => Promise<void>;
    forceCurrentSongQuality: (q: AudioQuality) => void;
}

// --- Queue Cap Helper ---
const MAX_QUEUE_SIZE = 30;
function trimQueue(songs: (JioSaavnSong | PlayableTrack)[], currentIndex: number, cap: number = MAX_QUEUE_SIZE): { songs: (JioSaavnSong | PlayableTrack)[]; adjustedIndex: number } {
    if (songs.length <= cap) return { songs, adjustedIndex: currentIndex };
    const overflow = songs.length - cap;
    // Only trim if we can safely remove songs before the current index
    const safeOverflow = Math.min(overflow, currentIndex);
    if (safeOverflow <= 0) return { songs, adjustedIndex: currentIndex };
    const trimmed = songs.slice(safeOverflow);
    const adjustedIndex = currentIndex - safeOverflow;
    console.log(`[QueueTrim] Trimmed ${safeOverflow} played songs, index ${currentIndex} → ${adjustedIndex} (total: ${trimmed.length})`);
    return { songs: trimmed, adjustedIndex: Math.max(0, adjustedIndex) };
}

export const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
    // --- State ---
    const [activeMixId, setActiveMixId] = useState<string | null>(null);
    const [playingIndex, setPlayingIndex] = useState(0); // [PERF FIX Bug 11] Decoupled active mix index
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
    const [volume, setVolume] = useState(0.8);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
    const [nextSongDetails, setNextSongDetails] = useState<{ url: string, quality: AudioQuality } | null>(null); // New state for preloaded URL
    const [currentTrackMetadata, setCurrentTrackMetadata] = useState<AudioAnalysisResult | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [shuffle, setShuffle] = useState(false);

    // F27: Track active blob URLs to prevent memory leaks
    const activeBlobsRef = useRef<Set<string>>(new Set());
    const registerBlob = useCallback((url: string) => {
        if (url && url.startsWith('blob:')) activeBlobsRef.current.add(url);
    }, []);
    const cleanupBlobs = useCallback((keepUrls: (string | null)[]) => {
        const keeps = new Set(keepUrls.filter(Boolean));
        activeBlobsRef.current.forEach(url => {
            if (!keeps.has(url)) {
                OfflineStore.revokeUrl(url);
                activeBlobsRef.current.delete(url);
            }
        });
    }, []);

    // Downloads State
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [songToDownload, setSongToDownload] = useState<JioSaavnSong | PlayableTrack | null>(null);
    const [songsToDownload, setSongsToDownload] = useState<(JioSaavnSong | PlayableTrack)[] | null>(null);
    const [downloadQueue, setDownloadQueue] = useState<{ song: JioSaavnSong | PlayableTrack; quality: AudioQuality; status: 'pending' | 'downloading' | 'error' | 'done'; progress?: number; speed?: number; }[]>([]);
    const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
    const repeatRef = useRef<'off' | 'one' | 'all'>('off');

    // Settings State (now injected from Provider)
    const {
        qualityPreference, setQualityPreference,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed,
        eq
    } = useSettings();

    // UI State (injected)
    const { toast, showToast } = useUI();

    // Audio Engine internal State (Will extract to AudioEngineProvider)
    const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
    const [activeQuality, setActiveQuality] = useState<AudioQuality | null>(null);

    // Library State (injected)
    const {
        mixes, setMixes, addMix, updateMix, deleteMix, undoDeleteMix, deletedMixBackup, addSongToMix,
        savedAlbums, savedArtists, toggleSaveAlbum, toggleFollowArtist, isAlbumSaved, isArtistFollowed,
        likedSongs, toggleLike, isLiked, recentlyPlayed, addToRecentlyPlayed,
        downloadedState, removeDownload, isDownloaded, refreshDownloadedState
    } = useLibrary();

    // --- State Persistence ---
    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (hasRestoredRef.current || mixes.length === 0) return;
        try {
            const savedState = localStorage.getItem('melora_playback_state');
            if (savedState) {
                const { savedMixId, savedIndex } = JSON.parse(savedState);
                if (savedMixId && mixes.some(m => m.id === savedMixId)) {
                    setActiveMixId(savedMixId);
                    setPlayingIndex(savedIndex || 0);
                }
            }
        } catch (e) {}
        hasRestoredRef.current = true;
    }, [mixes]);

    useEffect(() => {
        if (activeMixId) {
            localStorage.setItem('melora_playback_state', JSON.stringify({ savedMixId: activeMixId, savedIndex: playingIndex }));
        }
    }, [activeMixId, playingIndex]);

    // Audio Hooks/Refs
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const loadRequestId = useRef(0); // Async guard
    const abortControllerRef = useRef<AbortController | null>(null);
    const analysisAbortRef = useRef<AbortController | null>(null); // [V2 Fix 3] Cancel AudioAnalysis on skip
    const mixesRef = useRef<Mix[]>([]);
    const activeMixIdRef = useRef<string | null>(null);
    const generationLocks = useRef<Map<string, boolean>>(new Map()); // [Phase 4: Mutex] Per-mix lock
    const currentStreamKeyRef = useRef<string | null>(null); // Track which key provided the current stream
    const toastOnceRef = useRef(false); // [FIX Bug 10] Prevent toast spam
    const currentSongUrlRef = useRef<string | null>(null); // Track latest URL for sync comparison
    const lastLoadedSongIdRef = useRef<string | null>(null); // [FIX] Prevent re-loading same song after trimQueue
    // [DESYNC FIX V5] Explicit load trigger counter — ONLY bumped by intentional navigation
    // (next/prev/playIndex/loadMix). Autoplay's updateMix does NOT bump this,
    // so queue replacements never trigger phantom LoadSong effect fires.
    const [loadTrigger, setLoadTrigger] = useState(0);

    // Synchronize Refs with State for async callbacks (like Next/Prev)
    useEffect(() => { mixesRef.current = mixes; }, [mixes]);
    useEffect(() => { activeMixIdRef.current = activeMixId; }, [activeMixId]);
    const nextPreloadRequestId = useRef(0); // [FIX Bug 15] Preload race condition guard
    const loadMixRequestId = useRef(0); // [FIX 2] loadMix race condition guard
    const downgradeToastRef = useRef<string | null>(null); // [FIX Bug 20] Throttle downgrade toasts
    const isNextSequentialRef = useRef(false); // [Phase 1: Gapless] Transition flag
    const playingIndexRef = useRef(0);
    const playbackStartedFromRef = useRef<number | null>(null);
    const lastPreloadedIdRef = useRef<string | null>(null); // [PERF] Track which song ID was preloaded to skip redundant preloads
    const nextSongDetailsRef = useRef<{ url: string, quality: AudioQuality } | null>(null); // [FIX] Ref for loadSongUrl closure

    // [DESYNC FIX] Playback Load Mutex ensures only one URL resolution happens at a time
    const loadMutexRef = useRef(false);

    // Playback State
    useEffect(() => { playingIndexRef.current = playingIndex; }, [playingIndex]);
    useEffect(() => { currentSongUrlRef.current = currentSongUrl; }, [currentSongUrl]);
    useEffect(() => { nextSongDetailsRef.current = nextSongDetails; }, [nextSongDetails]);
    useEffect(() => { repeatRef.current = repeat; }, [repeat]);

    // [Phase 2: Gapless] Resolver URL Cache — prevents re-resolution on prev/next
    const resolverCacheRef = useRef<Map<string, { url: string; quality: AudioQuality; expiry: number }>>(new Map());
    const getCachedUrl = useCallback((trackId: string, quality: AudioQuality): { url: string; quality: AudioQuality } | null => {
        const key = `${trackId}:${quality}`;
        const entry = resolverCacheRef.current.get(key);
        if (entry && Date.now() < entry.expiry) {
            console.log(`[Resolver] Cache HIT: ${key}`);
            return { url: entry.url, quality: entry.quality };
        }
        if (entry) resolverCacheRef.current.delete(key); // Expired
        return null;
    }, []);
    const setCachedUrl = useCallback((trackId: string, quality: AudioQuality, url: string) => {
        const key = `${trackId}:${quality}`;
        resolverCacheRef.current.set(key, { url, quality, expiry: Date.now() + 5 * 60 * 1000 }); // 5 min TTL
    }, []);

    // [Phase 2: Gapless] Clear stale nextSongDetails on mix change
    useEffect(() => {
        setNextSongDetails(null);
        lastPreloadedIdRef.current = null; // [PERF] Reset preload tracking on mix change
    }, [activeMixId]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            // ... any local timeouts
        };
    }, []);

    // GitHub Release Update Checker — runs once on mount
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const { checkForUpdate, isUpdateDismissed } = await import('@/lib/update-checker');
                const update = await checkForUpdate();
                if (update && !isUpdateDismissed(update.version)) {
                    showToast(`Update ${update.version} available! Visit GitHub to download.`, 'info');
                }
            } catch { /* silent fail */ }
        }, 5000); // Delay 5s after mount so it doesn't block startup
        return () => clearTimeout(timer);
    }, [showToast]);

    // Headphone / Output Device Disconnect Auto-Pause
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

        let previousOutputCount = 0;

        const handleDeviceChange = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const outputDevices = devices.filter(d => d.kind === 'audiooutput');
                const currentOutputCount = outputDevices.length;

                // If the number of output devices decreases, assume a disconnect (e.g. headphones unplugged)
                if (previousOutputCount > 0 && currentOutputCount < previousOutputCount && isPlaying) {
                    audioPlayerRef.current?.pause();
                    showToast("Audio output disconnected, paused playback.", "info");
                }

                previousOutputCount = currentOutputCount;
            } catch (err) {
                console.warn("Could not enumerate devices for auto-pause", err);
            }
        };

        // Initialize count
        navigator.mediaDevices.enumerateDevices().then(devices => {
            previousOutputCount = devices.filter(d => d.kind === 'audiooutput').length;
        }).catch(() => { });

        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }, [isPlaying, showToast]);


    // [PERF FIX #2] Memoize derived state and inject local playingIndex to prevent massive LibraryContext re-renders
    const activeMix = useMemo(() => {
        const found = mixes.find(m => m.id === activeMixId);
        if (!found) return undefined;
        return { ...found, currentSongIndex: playingIndex };
    }, [mixes, activeMixId, playingIndex]);
    const rawCurrentItem = useMemo(() => activeMix?.songs[activeMix.currentSongIndex], [activeMix]);
    // Explicit return type to force narrowing
    const currentSong: JioSaavnSong | undefined = useMemo(
        () => isPlayableTrack(rawCurrentItem) ? rawCurrentItem.song : rawCurrentItem,
        [rawCurrentItem]
    );

    // Define currentTrack derived value correctly
    // If raw item is PlayableTrack, use it. If not, upgrade it with current Global Preference.
    const currentTrack = useMemo(() => {
        if (!rawCurrentItem) return undefined;
        if (isPlayableTrack(rawCurrentItem)) return rawCurrentItem;
        return ensurePlayableTrack(rawCurrentItem, qualityPreference as AudioQuality);
    }, [rawCurrentItem, qualityPreference]);

    // Background Audio & MediaSession Integration
    useEffect(() => {
        if ('mediaSession' in navigator && currentSong) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: decodeHtml(currentSong.name || (currentSong as any).title || 'Unknown Title'),
                artist: decodeHtml(currentSong.primaryArtists || (currentSong as any).artist || 'Unknown Artist'),
                album: decodeHtml((currentSong.album as any)?.name || ''),
                artwork: [
                    { src: currentSong.image?.[0]?.link || '', sizes: '96x96', type: 'image/jpeg' },
                    { src: currentSong.image?.[1]?.link || currentSong.image?.[0]?.link || '', sizes: '256x256', type: 'image/jpeg' },
                    { src: currentSong.image?.[2]?.link || currentSong.image?.[0]?.link || '', sizes: '512x512', type: 'image/jpeg' }
                ].filter(a => a.src)
            });

            navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            navigator.mediaSession.setActionHandler('previoustrack', () => setPlayingIndex(p => Math.max(0, p - 1)));
            navigator.mediaSession.setActionHandler('nexttrack', () => setPlayingIndex(p => p + 1));
        }
    }, [currentSong]);

    // --- Audio Playback Effects ---

    // [PERF FIX #4] Wrap in useCallback
    const togglePin = useCallback((mixId: string) => {
        const MAX_PINNED_MIXES = 8;
        const SYSTEM_MIX_IDS = new Set(['discovery-mix', 'search-results', 'quick-play', 'otg-tape', 'queue-mix', 'now-playing-queue']);

        const mixToToggle = mixesRef.current.find(m => m.id === mixId);
        if (!mixToToggle) return;

        const isSystemMix = SYSTEM_MIX_IDS.has(mixToToggle.id);
        const newPinned = !mixToToggle.pinned;

        if (!isSystemMix && newPinned) {
            const currentPinnedCount = mixesRef.current.filter(
                item => item.pinned && !SYSTEM_MIX_IDS.has(item.id)
            ).length;

            if (currentPinnedCount >= MAX_PINNED_MIXES) {
                showToast(`Deck rack full (${MAX_PINNED_MIXES}/${MAX_PINNED_MIXES}). Unpin one tape first.`, 'error');
                return;
            }
        }

        setMixes(prev => prev.map(m => {
            if (m.id === mixId) {
                return { ...m, pinned: newPinned };
            }
            return m;
        }));

        showToast(newPinned ? `Pinned "${mixToToggle.title}" to Deck` : `Unpinned "${mixToToggle.title}"`, 'success');
    }, [showToast, setMixes]);

    // Sync active mix song to currentSong - REMOVED (Computed state)

    // --- Autoplay & Pre-fetch Logic ---
    const autoplayFetchedRef = useRef<string | null>(null);
    const songStartTimeRef = useRef(Date.now());

    // [PERF FIX #3] Store progress in a ref so the autoplay effect doesn't re-run ~4x/sec.
    const progressRef = useRef(0);
    useEffect(() => { progressRef.current = progress; }, [progress]);
    const durationRef = useRef(0);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    // ── 2D: Queue Trimmer ──
    // Keeps only `keepBehind` songs before current position to prevent memory bloat.
    // Returns trimmed array and adjusted index.
    const trimQueue = useCallback((songs: any[], currentIndex: number, keepBehind: number = 5) => {
        if (currentIndex <= keepBehind) {
            // Not enough songs behind to trim
            return { songs, adjustedIndex: currentIndex };
        }
        const trimCount = currentIndex - keepBehind;
        const trimmedSongs = songs.slice(trimCount);
        const adjustedIndex = currentIndex - trimCount;
        console.log(`[TrimQueue] Removed ${trimCount} old songs (was ${songs.length}, now ${trimmedSongs.length}, idx: ${currentIndex} → ${adjustedIndex})`);
        return { songs: trimmedSongs, adjustedIndex };
    }, []);

    useEffect(() => {
        if (!activeMixId || !isPlaying || durationRef.current <= 0 || !currentSong) return;

        // Reset fetcher if song changed
        if (autoplayFetchedRef.current !== currentSong.id) {
            autoplayFetchedRef.current = null;
            progressRef.current = 0;
            songStartTimeRef.current = Date.now();
        }

        const checkAutoplay = () => {
            // Only use generationLock to prevent concurrent fetches — no time guard
            if (autoplayFetchedRef.current || generationLocks.current.get(activeMixId)) return;

            const activeMix = mixesRef.current.find(m => m.id === activeMixId);
            if (!activeMix) return;

            // [FIX] Disable autoplay for the offline downloads queue
            if (activeMixId === 'downloads-queue') return;

            const currentIndex = playingIndexRef.current;
            const songsRemaining = activeMix.songs.length - currentIndex - 1;

            // Simple rule: fetch when ≤ 5 songs remain. No progress gate, no queue size gate.
            if (songsRemaining > 5) return;

            console.log(`[Autoplay] Fetching discovery songs for: ${currentSong.name} (queue: ${activeMix.songs.length}, remaining: ${songsRemaining})`);
            autoplayFetchedRef.current = currentSong.id;
            generationLocks.current.set(activeMixId, true);

            const seed = ensurePlayableTrack(currentSong);
            const inferredRegion = activeMix.title.includes('Mix') ? activeMix.title.replace(' Mix', '').toLowerCase() : undefined;
            const queueIds = activeMix.songs.map(s => isPlayableTrack(s) ? s.id : ensurePlayableTrack(s).id);

            DiscoveryEngine.generateSessionMix(seed, inferredRegion, queueIds)
                .then((newMix) => {
                    generationLocks.current.delete(activeMixId);

                    // PHASE 1E - Async Queue Safety: MUST re-read the absolute latest mix state
                    // because 1-3 seconds elapsed since the fetch started
                    const latestMix = mixesRef.current.find(m => m.id === activeMixIdRef.current);
                    if (latestMix && latestMix.id === activeMixIdRef.current) {

                        const newSongs = newMix.songs
                            .map(s => ensurePlayableTrack(s, qualityPreference as AudioQuality))
                            .filter(sTrack => {
                                // Basic ID dedupe
                                if (sTrack.id === seed.id || (sTrack.song?.id === seed.song?.id && sTrack.song)) return false;

                                // Semantic dedupe (Phase 1D)
                                const sName = normalizeSongTitle(sTrack.title || (sTrack.song as any)?.name || (sTrack.song as any)?.title || '');
                                const sRawArtist = sTrack.artist || sTrack.song?.primaryArtists || '';

                                return !latestMix.songs.some(existing => {
                                    const eTrack = isPlayableTrack(existing) ? existing : ensurePlayableTrack(existing);

                                    // Hard ID match
                                    if (eTrack.id === sTrack.id) return true;

                                    // Semantic match
                                    const eName = normalizeSongTitle(eTrack.title || (eTrack.song as any)?.name || (eTrack.song as any)?.title || '');
                                    if (eName !== sName) return false;

                                    const eRawArtist = eTrack.artist || eTrack.song?.primaryArtists || '';
                                    return checkArtistOverlap(eRawArtist, sRawArtist);
                                });
                            });

                        if (newSongs.length > 0) {
                            // REPLACE everything after current position with discovery songs
                            // Use playingIndexRef which is always up to date
                            const keepUpTo = playingIndexRef.current + 1;
                            const kept = latestMix.songs.slice(0, keepUpTo);
                            const merged = [...kept, ...newSongs];
                            console.log(`[Autoplay] Replaced queue after index ${playingIndexRef.current} with ${newSongs.length} discovery tracks (total: ${merged.length})`);

                            // [V2 Fix 2] Trim queue — keep only 5 songs behind current position
                            const { songs: trimmedSongs, adjustedIndex } = trimQueue(merged, playingIndexRef.current, 30);

                            // [DESYNC FIX V3] ALWAYS refresh lastLoadedSongIdRef BEFORE updateMix.
                            // When updateMix fires, React re-renders with new mixes but OLD playingIndex,
                            // causing currentSong to temporarily point to a wrong song.
                            // Setting lastLoadedSongIdRef ensures the LoadSong effect's guard catches
                            // this phantom fire and skips it.
                            const currentItem = trimmedSongs[adjustedIndex];
                            if (currentItem) {
                                const currentItemId = isPlayableTrack(currentItem) ? currentItem.id : (currentItem as any).id;
                                lastLoadedSongIdRef.current = currentItemId;
                            }

                            if (adjustedIndex !== playingIndexRef.current) {
                                playingIndexRef.current = adjustedIndex;
                                setPlayingIndex(adjustedIndex);
                            }
                            updateMix(latestMix.id, { songs: trimmedSongs, currentSongIndex: adjustedIndex });

                            // [LOOPHOLE FIX #7] Reset so autoplay can trigger again for next batch
                            autoplayFetchedRef.current = null;
                        } else {
                            console.warn("[Autoplay] Discovery Engine returned no new unique songs.");
                        }
                    }
                })
                .catch(err => {
                    console.error("[Autoplay] Failed:", err);
                    generationLocks.current.delete(activeMixId);
                });
        };

        // Check every 10 seconds instead of 5 to reduce heavy background CPU load
        const interval = setInterval(checkAutoplay, 10000);
        // Also check immediately
        checkAutoplay();

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMixId, isPlaying, currentSong, updateMix, qualityPreference]);

    const loadMix = useCallback((mixId: string, forceIndex?: number) => {
        // FIX 2: Request ID to prevent race condition on rapid taps
        const requestId = ++loadMixRequestId.current;
        console.log("[loadMix] Called with:", mixId, "forceIndex:", forceIndex, "current:", activeMixId, "requestId:", requestId);

        // Eject: If loading empty mixId, pause and clear
        if (!mixId || mixId === "") {
            console.log("[loadMix] Ejecting - stopping playback");
            setIsPlaying(false);
            setPlaybackState('idle');
            setActiveMixId(null);
            setCurrentSongUrl(null);
            audioPlayerRef.current?.pause();
            return;
        }

        // If same mix, check if we need to jump to a new index or just resume
        if (activeMixId === mixId) {
            const targetMix = mixesRef.current.find(m => m.id === mixId);
            // Default to 0 if nothing is playing, or current if it is
            const startIndex = forceIndex !== undefined ? forceIndex : (targetMix?.currentSongIndex ?? 0);

            if (startIndex !== playingIndex) {
                console.log(`[loadMix] Same mix, jumping to index: ${startIndex}`);
                setIsPlaying(false);
                setPlaybackState('loading');
                setCurrentSongUrl(null);
                setNextSongDetails(null); // [FIX] Clear stale prebuffer
                isNextSequentialRef.current = false; // [FIX] Prevent stale gapless promotion
                audioPlayerRef.current?.pause();
                audioPlayerRef.current?.seekTo(0);
                playingIndexRef.current = startIndex;
                lastLoadedSongIdRef.current = null; // Allow LoadSong effect to fire
                setLoadTrigger(c => c + 1); // [V5] Explicit trigger

                setTimeout(() => {
                    if (loadMixRequestId.current === requestId) setIsPlaying(true);
                }, 150);
            } else {
                console.log("[loadMix] Same mix, same index, resuming");
                // If we are at index 0 and audio is not playing, force start from 0
                if (!isPlaying && startIndex === 0) {
                    audioPlayerRef.current?.seekTo(0);
                }
                setIsPlaying(true);
            }
            return;
        }

        // New mix - stop current, load new
        console.log("[loadMix] Switching to new mix:", mixId);
        setIsPlaying(false); // Stop current
        setPlaybackState('loading');
        setCurrentSongUrl(null); // Clear old URL
        setNextSongDetails(null); // [FIX] Clear stale prebuffer URL
        isNextSequentialRef.current = false; // [FIX] Prevent stale gapless promotion
        audioPlayerRef.current?.pause(); // Explicitly pause audio engine
        if (audioPlayerRef.current) {
            audioPlayerRef.current.seekTo(0); // Reset progress
        }
        // [FIX] Cancel any in-flight AudioAnalysis
        if (analysisAbortRef.current) analysisAbortRef.current.abort();

        // Respect the mix's currentSongIndex instead of always starting from 0
        const targetMix = mixesRef.current.find(m => m.id === mixId);
        const startIndex = forceIndex !== undefined ? forceIndex : (targetMix?.currentSongIndex ?? 0);
        console.log("[loadMix] Starting from index:", startIndex);
        playingIndexRef.current = startIndex;
        lastLoadedSongIdRef.current = null; // Allow LoadSong effect to fire
        setLoadTrigger(c => c + 1); // [V5] Explicit trigger

        setActiveMixId(mixId);

        // FIX 2: Guard setTimeout with requestId to prevent ghost playback
        setTimeout(() => {
            if (loadMixRequestId.current === requestId) {
                setIsPlaying(true);
            }
        }, 150);
    }, [activeMixId]);

    const playInstantMix = useCallback((mix: Mix) => {
        if (!mix.songs.length) return;
        console.log("[playInstantMix] Atomic play for:", mix.title);
        setPlaybackState('loading');

        // 1. Normalize songs FIRST
        const normalizedSongs = mix.songs.map(s =>
            isPlayableTrack(s) ? s : ensurePlayableTrack(s, qualityPreference as AudioQuality)
        );

        const targetIndex = mix.currentSongIndex || 0;
        const originalTargetTrack = normalizedSongs[targetIndex];

        // 1b. Deduplicate queue to prevent repeating search results
        // Use deduplicateQueue from track-utils
        const deduplicatedSongs = deduplicateQueue(normalizedSongs);
        const newTargetIndex = deduplicatedSongs.findIndex((s: any) => s.id === originalTargetTrack?.id) || 0;
        const safeTargetIndex = newTargetIndex !== -1 ? newTargetIndex : 0;

        const safeMix: Mix = {
            ...mix,
            songs: deduplicatedSongs,
            currentSongIndex: safeTargetIndex
        };

        // 2. Use ephemeral "Now Playing" queue instead of Discovery Mix
        const NOW_PLAYING_ID = safeMix.id || 'now-playing-queue';
        setMixes(prev => {
            // Remove old now-playing queue if exists
            const filtered = prev.filter(m => m.id !== NOW_PLAYING_ID);

            const nowPlayingMix: Mix = {
                id: NOW_PLAYING_ID,
                title: safeMix.title || "Now Playing",
                color: "blue",
                songs: deduplicatedSongs,
                currentSongIndex: safeTargetIndex,
                pinned: false
            };

            return [...filtered, nowPlayingMix];
        });

        // 3. Set active mix
        setActiveMixId(NOW_PLAYING_ID);
        playingIndexRef.current = safeTargetIndex;
        lastLoadedSongIdRef.current = null; // Allow LoadSong to fire
        setLoadTrigger(c => c + 1); // [V5] Explicit trigger

        // 4. HARD RESET PLAYER — pause immediately, clear URL
        setIsPlaying(false);
        setCurrentSongUrl(null);
        audioPlayerRef.current?.pause();
        audioPlayerRef.current?.seekTo(0);

        // 5. Instantly fake playback state for UI responsiveness
        setTimeout(() => setIsPlaying(true), 10);
        setShuffle(false);
    }, [qualityPreference]);



    const play = useCallback(async () => {
        console.log("[play] Called, activeMixId:", activeMixId);
        if (!activeMixId) return;

        // Ensure we have a playable track with sources
        const trackToPlay = currentTrack || await ensurePlayableTrack(currentSong, qualityPreference);

        if (trackToPlay && trackToPlay.preferredQuality !== qualityPreference) {
            // Logic: If user wants HI-RES/FLAC but we got 320/160
            if ((qualityPreference === 'hires' || qualityPreference === 'flac') &&
                (trackToPlay.preferredQuality === '320' || trackToPlay.preferredQuality === '160')) {
                showToast(`Optimized streaming quality (${trackToPlay.preferredQuality}kbps)`, 'info');
            }
        }

        // Track is ready to play — no longer inject into Discovery Mix
        // Songs stay in their original tape/queue context

        setIsPlaying(true);
        setPlaybackState('playing');
        audioPlayerRef.current?.play();
    }, [activeMixId, currentSong, currentTrack, qualityPreference, showToast]);

    const pause = useCallback(() => {
        console.log("[pause] Called");
        setIsPlaying(false);
        setPlaybackState('paused');
        audioPlayerRef.current?.pause();
    }, []);

    const togglePlay = useCallback(() => {
        console.log("[togglePlay] isPlaying:", isPlaying);
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, pause, play]);

    // --- Offline Management ---
    useEffect(() => {
        // Hydrate downloaded state on mount (Fix 9)
        refreshDownloadedState();
    }, [refreshDownloadedState]);

    // --- HELPER: Try JioSaavn ---
    const tryJioSaavn = async (song: JioSaavnSong, quality: AudioQuality): Promise<{ url: string, quality: AudioQuality } | null> => {
        try {
            const qMap: Record<string, '320' | '160' | '96'> = { '320': '320', '160': '160', '96': '96' };
            if (!qMap[quality]) return null;

            // JIT Repair: If encryptedMediaUrl is missing, fetch fresh details
            let targetSong = song;
            if (!song.encryptedMediaUrl) {
                console.log(`[JioSaavn] Missing encrypted URL for ${song.name}. Fetching fresh details...`);
                try {
                    // Method A: Direct ID Refresh
                    const freshDetails = await getSongDetails(song.id);
                    if (freshDetails && freshDetails.encryptedMediaUrl) {
                        console.log(`[JioSaavn] Metadata Repaired: Found encrypted URL via ID.`);
                        targetSong = freshDetails;
                    } else {
                        // Method B: Aggressive Search Repair
                        console.warn(`[JioSaavn] ID Repair Failed. Attempting Search Repair for "${song.name}"...`);
                        const query = `${song.name} ${song.primaryArtists || ""}`;
                        const searchResults = await searchSongs(query);

                        if (searchResults && searchResults.length > 0) {
                            // Use first match that has a URL
                            const match = searchResults.find(s => s.encryptedMediaUrl);
                            if (match) {
                                console.log(`[JioSaavn] Search Repair Success: Switched to ${match.id}`);
                                targetSong = match;
                            } else {
                                console.warn(`[JioSaavn] Search Repair Failed: No results with media.`);
                            }
                        } else {
                            console.warn(`[JioSaavn] Search Repair Failed: No results.`);
                        }
                    }
                } catch (e) {
                    console.warn(`[JioSaavn] Repair exception:`, e);
                }
            }

            let url = getAudioUrl(targetSong, qMap[quality]);

            // If still empty, maybe it really is missing?
            if (!url && !targetSong.encryptedMediaUrl) {
                // Try one last fetch if we haven't already
                // (This logic needs the import).
                return null;
            }

            if (url) return { url, quality };
        } catch (e) { /* ignore */ }
        return null;
    };

    // --- HELPER: Map HiFi stream quality to AudioQuality ---
    const mapHiFiQuality = (streamQuality: string | undefined): AudioQuality => {
        if (!streamQuality) return 'flac';
        const q = streamQuality.toUpperCase();
        if (q === 'HI_RES_LOSSLESS' || q === 'HI_RES') return 'hires';
        if (q === 'LOSSLESS') return 'flac';
        if (q === 'HIGH') return '320'; // Tidal HIGH = 320kbps AAC
        return 'flac'; // Safe default for unknown HiFi qualities
    };

    // --- HELPER: Try HiFi (Tidal/Qobuz) ---
    const tryHiFi = async (track: PlayableTrack, allowSearch = true, signal?: AbortSignal): Promise<{ url: string, quality: AudioQuality, keyName?: string } | null> => {
        // 1. Try existing sources first
        const hifiSource = track.sources.find(s => s.provider === 'tidal' || s.provider === 'qobuz');
        if (hifiSource) {
            try {
                const stream = await getHiFiStream(hifiSource.songId, hifiSource.provider as 'tidal' | 'qobuz', signal);
                if (stream?.url) {
                    return { url: stream.url, quality: mapHiFiQuality(stream.quality), keyName: stream.keyName };
                }
            } catch (e) {
                console.warn("[HiFi] Source failed:", e);
            }
        }

        // 2. Search Fallback
        if (allowSearch) {
            try {
                // Clean the query: strip (From "Movie") tags, language tags, HTML entities
                // and use only the first artist for better Tidal matching
                const cleanTitle = track.title
                    .replace(/\(From\s+[""&].*?\)/gi, '')  // Remove (From "Movie") tags
                    .replace(/\((Telugu|Hindi|Tamil|Kannada|Malayalam|Bengali|Punjabi|Marathi|Gujarati)\)/gi, '') // Remove language tags
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/\s*-\s*(Telugu|Hindi|Tamil|Kannada|Malayalam|Bengali|Punjabi|Marathi|Gujarati)\s*$/gi, '') // Remove trailing " - Telugu"
                    .replace(/\s{2,}/g, ' ')               // Collapse multiple spaces
                    .trim();
                const firstArtist = (track.artist || '').split(',')[0].trim();
                const query = `${cleanTitle} ${firstArtist}`;
                console.log(`[HiFi] Search query: "${query}"`);
                const searchResult = await searchHiFi(query);
                if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
                    // SAFETY: Don't blindly use tracks[0] — verify title matches!
                    // Normalize title for comparison
                    const normalize = (s: string) => s.toLowerCase()
                        .replace(/\(.*?\)/g, '')           // Remove parentheticals
                        .replace(/[^a-z0-9\s]/g, '')       // Remove special chars
                        .replace(/\s+/g, ' ').trim();
                    const origWords = new Set(normalize(cleanTitle).split(' ').filter(w => w.length > 1));

                    let bestMatch = null;
                    let bestScore = 0;

                    for (const candidate of searchResult.tracks) {
                        const candidateNorm = normalize(candidate.title || '');
                        const candidateWords = candidateNorm.split(' ').filter(w => w.length > 1);
                        // Count how many original words appear in the candidate
                        const matchingWords = candidateWords.filter(w => origWords.has(w)).length;
                        const score = origWords.size > 0 ? matchingWords / origWords.size : 0;

                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = candidate;
                        }
                    }

                    // Only use match if at least 70% of original words match
                    if (bestMatch && bestScore >= 0.7) {
                        console.log(`[HiFi] Best match: "${bestMatch.title}" (score: ${(bestScore * 100).toFixed(0)}%)`);
                        const stream = await getHiFiStream(bestMatch.id, bestMatch.source, signal);
                        if (stream?.url) {
                            return { url: stream.url, quality: mapHiFiQuality(stream.quality), keyName: stream.keyName };
                        }
                    } else {
                        console.warn(`[HiFi] No good title match found. Best: "${bestMatch?.title}" (${(bestScore * 100).toFixed(0)}%) — skipping HiFi`);
                    }
                }
            } catch (e) {
                console.warn("[HiFi] Search failed:", e);
            }
        }
        return null;
    };

    // --- MASTER RESOLVER (Melora Explicit Truth) ---
    const resolvePlayableUrl = useCallback(async (track: PlayableTrack, signal?: AbortSignal): Promise<{ url: string, quality: AudioQuality, keyName?: string } | null> => {
        const songName = track.title;
        // 1. Strict Request: Use explicit preference if set, otherwise default to context qualityPreference
        // The track.preferredQuality is populated by the Caller (e.g. Search Click or PlaybackEngine defaults)
        const targetQ = track.preferredQuality || '320';

        console.log(`[Resolver] Explicit Request: ${songName} @ ${targetQ}`);

        // Define Degradation Paths
        const pathMap: Record<AudioQuality, AudioQuality[]> = {
            'hires': ['hires', 'flac', '320', '160', '96'], // Full cascade
            'flac': ['flac', '320', '160', '96'],
            '320': ['320', '160', '96'],
            '160': ['160', '96'],
            '96': ['96']
        };
        // If unknown quality, fallback to 320 path
        const degradationPath = pathMap[targetQ] || pathMap['320'];

        // --- PHASE 1: CACHE CHECK ---
        const cached = getCachedUrl(track.id, targetQ);
        if (cached) {
            return cached;
        }

        // --- PHASE 2: OFFLINE (Exact -> Lower) ---
        for (const q of degradationPath) {
            if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
            try {
                if (await OfflineStore.isDownloaded(track.id, q)) {
                    const url = await OfflineStore.getSongUrl(track.id, q);
                    if (url) {
                        console.log(`[Resolver] ✓ Offline hit (${q})`);
                        // Toast only if downgrade
                        if (q !== targetQ && !toastOnceRef.current) {
                            showToast(`Playing offline optimized (${q})`, 'info');
                            toastOnceRef.current = true;
                        }
                        registerBlob(url);
                        return { url, quality: q };
                    }
                }
            } catch { /* ignore */ }
        }

        // --- PHASE 2.5: OFFLINE FALLBACK (Any Available) ---
        // If the user requested 320kbps globally, but downloaded the song in FLAC manually,
        // we should play the downloaded FLAC to save data rather than streaming 320kbps online.
        try {
            if (await OfflineStore.isDownloaded(track.id)) {
                // Find out what quality is available
                // We'll iterate through all known qualities from best to worst
                const allQualities: AudioQuality[] = ['hires', 'flac', '320', '160', '96'];
                for (const availableQ of allQualities) {
                    if (await OfflineStore.isDownloaded(track.id, availableQ)) {
                        const url = await OfflineStore.getSongUrl(track.id, availableQ);
                        if (url) {
                            console.log(`[Resolver] ✓ Offline fallback hit (${availableQ})`);
                            if (!toastOnceRef.current) {
                                showToast(`Playing offline available quality (${availableQ})`, 'info');
                                toastOnceRef.current = true;
                            }
                            registerBlob(url);
                            return { url, quality: availableQ };
                        }
                    }
                }
            }
        } catch { /* ignore */ }

        // --- PHASE 2: ONLINE (Exact -> Lower) ---
        let hiFiResolved = false; // [FIX Bug 4] Lock to prevent overwrite
        let hiFiAttempted = false; // Prevent double firing if HiFi fails on hires, then loops to flac
        let hiFiResult: { url: string, quality: AudioQuality, keyName?: string } | null = null;

        for (const q of degradationPath) {
            if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
            // Check if this quality step requires HiFi or JioSaavn
            // HiFi: hires, flac
            // JioSaavn: 320, 160, 96
            const isHiFi = q === 'hires' || q === 'flac';

            let result: { url: string, quality: AudioQuality, keyName?: string } | null = null;

            // Optimization: If Hi-Res already succeeded in a previous loop cycle (e.g. strict match),
            // but we are still looping? Actually, if it succeeded, we return.
            // But if Hi-Res succeeded but returned 'flac' when we asked 'hires', we might loop to 'flac'.
            // If we are now at 'flac' and hiFiResolved is true, we should reuse that result?
            // Simpler: If Hi-Fi succeeded, we are good.
            if (hiFiResolved) break;

            if (isHiFi) {
                // Try HiFi Source only once per tracking cycle
                if (!hiFiAttempted) {
                    hiFiAttempted = true;
                    hiFiResult = await tryHiFi(track, true, signal); // Allow search
                }
                result = hiFiResult;

                // Verify result matches q (search might return diff quality)
                if (result && result.quality !== q && degradationPath.indexOf(result.quality) === -1) {
                    // Mismatch logic...
                    result = null;
                }

                if (result?.url) {
                    hiFiResolved = true;
                    // Strict return here? YES.
                    // If we found ANY HiFi stream, we trust it over JioSaavn.
                    // Even if we asked for HiRes and got FLAC, and checks passed.
                }
            } else {
                // Try JioSaavn
                // [FIX Bug 4] Do NOT downgrade to Saavn if we already found HiFi (shouldn't happen due to break, but safety)
                if (!hiFiResolved && track.song) {
                    result = await tryJioSaavn(track.song, q);
                }
            }

            if (result) {
                console.log(`[Resolver] ✓ Online Success: ${result.quality}`);
                setCachedUrl(track.id, result.quality, result.url); // Cache for reuse

                // --- TRUTH TOAST ---
                if (result.quality !== targetQ && !toastOnceRef.current) {
                    // [FIX Bug 20] Throttle duplicate downgrade toasts
                    const songName = track.title;
                    const key = `${songName}:${targetQ}:${result.quality}`;

                    if (downgradeToastRef.current !== key) {
                        downgradeToastRef.current = key;
                        showToast(`Optimized streaming quality (${result.quality})`, 'info');
                        toastOnceRef.current = true;
                    }
                }

                return result;
            }
        }

        // --- PHASE 3: LAST RESORT (Hail Mary) ---
        // If specific ID/Quality lookup failed, the ID might be dead.
        // Try to find ANY version of this song that works.
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            console.log(`[Resolver] Phase 3: Hail Mary for "${songName}"...`);
            const query = `${songName} ${track.song?.primaryArtists || ''}`;
            const results = await searchSongs(query);

            if (results && results.length > 0) {
                // Find first with media
                const match = results.find(s => s.encryptedMediaUrl);
                if (match) {
                    // Normalize names to verify it's not a totally different song
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const n1 = normalize(match.name);
                    const n2 = normalize(songName);

                    // Allow substring match or fuzzy match
                    if (n1.includes(n2) || n2.includes(n1)) {
                        console.log(`[Resolver] ✓ Hail Mary Success: Swapped ID ${track.id} -> ${match.id}`);
                        // Use standard 160kbps for safety
                        const url = getAudioUrl(match, '160');
                        if (url) {
                            if (!toastOnceRef.current) {
                                showToast("Source repaired automatically", 'info');
                                toastOnceRef.current = true;
                            }
                            return { url, quality: '160' };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[Resolver] Hail Mary failed:", e);
        }

        console.error(`[Resolver] ✗ All Resolvers Failed`);
        return null;
    }, [showToast]);

    const downloadSong = useCallback(async (songOrTrack: JioSaavnSong | PlayableTrack) => {
        setSongToDownload(songOrTrack);
        setSongsToDownload(null);
        setDownloadModalOpen(true);
        return true;
    }, []);

    const downloadSongs = useCallback(async (songs: (JioSaavnSong | PlayableTrack)[]) => {
        if (!songs.length) return false;
        setSongsToDownload(songs);
        setSongToDownload(null);
        setDownloadModalOpen(true);
        return true;
    }, []);

    const executeDownload = useCallback(async (songOrTrack: JioSaavnSong | PlayableTrack, overrideQuality?: AudioQuality) => {
        const currentQualityPreference = qualityPreference as AudioQuality;
        let track = ensurePlayableTrack(songOrTrack, currentQualityPreference);
        if (overrideQuality) {
            track = { ...track, preferredQuality: overrideQuality, isExplicitPreference: true };
        }

        const songMetadata = track.song;
        if (!songMetadata) {
            console.error("[Download] Failed: Missing song metadata in PlayableTrack");
            return false;
        }

        try {
            const targetQuality = track.preferredQuality;
            console.log(`[Download] Attempting strict download: ${songMetadata.name} at ${targetQuality} (ID: ${track.id})`);

            const result = await resolvePlayableUrl(track);

            if (!result || result.quality !== targetQuality) {
                // Determine if we should fail or fallback? For now, user chose strict quality.
                // Actually, if we're downloading a batch, we don't want to spam toasts.
                // We'll let handleDownloadBatch handle spam or just suppress individual toasts if needed.
                console.error(`[Download] Strict failure. Quality mismatch.`);
                return false;
            }

            if (result.url) {
                const songToSave = { ...songMetadata, id: track.id };

                // [F16/F17] Wrap in tagging proxy if it's a remote URL
                let finalDownloadUrl = result.url;
                if (result.url.startsWith('http')) {
                    const params = new URLSearchParams({
                        url: result.url,
                        title: songMetadata.name || '',
                        artist: songMetadata.primaryArtists || '',
                        album: songMetadata.album?.name || '',
                        art: songMetadata.image?.[songMetadata.image.length - 1]?.link || ''
                    });
                    finalDownloadUrl = `/api/audiophile-download?${params.toString()}`;
                }

                let lastTime = Date.now();
                let lastLoaded = 0;

                await OfflineStore.saveSong(songToSave, finalDownloadUrl, targetQuality, (loaded, total) => {
                    const now = Date.now();
                    // Update UI every 250ms for smooth progress
                    if (now - lastTime >= 250 || loaded === total) {
                        const bytesSinceLast = loaded - lastLoaded;
                        const timeDelta = (now - lastTime) / 1000;
                        const speed = timeDelta > 0 ? bytesSinceLast / timeDelta : 0; // bytes per second

                        lastTime = now;
                        lastLoaded = loaded;

                        setDownloadQueue(prev => prev.map(job => {
                            const jId = job.song.id || (job.song as any).song?.id;
                            if (jId === track.id) {
                                return { ...job, progress: total ? (loaded / total) * 100 : 0, speed };
                            }
                            return job;
                        }));
                    }
                });

                refreshDownloadedState();
                return true;
            }
            return false;
        } catch (e) {
            console.error("[Download] Error:", e);
            return false;
        }
    }, [resolvePlayableUrl, qualityPreference, refreshDownloadedState]);

    const handleDownloadBatch = useCallback(async (songs: (JioSaavnSong | PlayableTrack)[], quality: AudioQuality) => {
        // Build jobs
        const jobs = songs.map(s => ({ song: s, quality, status: 'pending' as const }));

        // Append to existing queue
        setDownloadQueue(prev => [...prev, ...jobs]);

        // We shouldn't process them if a processing loop is already running.
        // A simple way is to check the current queue's 'downloading' status or we can just linearly process our new batch.
        // For absolute simplicity without rewriting everything into a global manager, we'll process inline but update the state.

        showToast(`Added ${songs.length} songs to download queue...`, 'info');
        let successCount = 0;

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            const songIdMatch = song.id || (song as any).song?.id;

            // Mark this specific song as 'downloading'
            setDownloadQueue(prev => prev.map(job => {
                const jId = job.song.id || (job.song as any).song?.id;
                return jId === songIdMatch ? { ...job, status: 'downloading' } : job;
            }));

            const success = await executeDownload(song, quality);
            if (success) successCount++;

            // Mark this specific song as 'done' or 'error'
            setDownloadQueue(prev => prev.map(job => {
                const jId = job.song.id || (job.song as any).song?.id;
                return jId === songIdMatch ? { ...job, status: success ? 'done' : 'error' } : job;
            }));

            // Wait a tick to allow the UI to catch up? No, executeDownload handles its own async waiting.
        }

        // Remove done/error items after a delay
        setTimeout(() => {
            setDownloadQueue(prev => {
                const active = prev.filter(j => j.status !== 'done' && j.status !== 'error');
                return active;
            });
        }, 5000); // 5 sec lingering

        if (successCount === songs.length) {
            showToast(`Successfully downloaded all ${successCount} songs`, 'success');
        } else {
            showToast(`Downloaded ${successCount} of ${songs.length} songs`, 'info');
        }
    }, [executeDownload, showToast]);

    const loadSongUrl = useCallback(async (
        songOrTrack: JioSaavnSong | PlayableTrack | undefined,
        overrideQuality?: AudioQuality,
        isSequentialTransition: boolean = false
    ) => {
        setPlaybackState('loading');

        if (loadMutexRef.current) {
            console.log("[LoadSong] Blocked by execution mutex — load already in progress");
            return;
        }

        loadMutexRef.current = true; // Lock execution

        // Initialize abort controller for this specific load
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        if (!songOrTrack) {
            loadMutexRef.current = false;
            return;
        }

        try {

            // [Phase 1: True Gapless] Preloaded Transition Bypass
            // READ FROM REF — loadSongUrl's closure captures stale state; ref is always current
            const preloadedDetails = nextSongDetailsRef.current;

            if (isSequentialTransition && preloadedDetails?.url) {
                console.log(`[Gapless] Promoting Preloaded URL: ${preloadedDetails.url.substring(0, 50)}...`);
                setCurrentSongUrl(preloadedDetails.url);
                setNextSongDetails(null); // Clear preload
                nextSongDetailsRef.current = null;
                // We must still run the rest of the metadata / analytics updates, but SKIP the URL resolution.
            } else if (!isSequentialTransition) {
                // Cold path: Only clean up if this is NOT a sequential transition
                // Sequential transitions must keep the audio element alive while JIT resolves
                setCurrentSongUrl((prevUrl) => {
                    if (prevUrl && prevUrl.startsWith('blob:')) {
                        OfflineStore.revokeUrl(prevUrl);
                    }
                    return null;
                });
            } else {
                // Sequential transition with no preload — force Cold Path to prevent stale source lock
                console.warn('[Gapless] Sequential transition with no preload — Forcing JIT fallback path');
                isSequentialTransition = false;
                setCurrentSongUrl((prevUrl) => {
                    if (prevUrl && prevUrl.startsWith('blob:')) {
                        OfflineStore.revokeUrl(prevUrl);
                    }
                    return null;
                });
            }

            currentStreamKeyRef.current = null; // Reset key ref

            const requestId = ++loadRequestId.current;
            const targetQualityPreference = (overrideQuality as AudioQuality) || (qualityPreference as AudioQuality);

            // Ensure we have a PlayableTrack
            let track = ensurePlayableTrack(songOrTrack, targetQualityPreference);

            // --- PREFERENCE LOGIC ---
            // 1. If overrideQuality is passed (e.g. user toggled setting while playing), force it.
            if (overrideQuality) {
                track = { ...track, preferredQuality: targetQualityPreference, isExplicitPreference: true };
            }
            // 2. If it's a PlayableTrack (from Unified Search or Queue) and we DID NOT just convert it from a raw song
            //    AND it has a specific preference that differs from global default...
            //    WE SHOULD RESPECT IT if it was explicitly chosen.
            //    However, distinguishing "explicitly chosen" vs "defaulted" is hard without a flag.
            //    Use heuristic: If the track source list implies verified qualities, rely on track preference.
            //    Actually, simpler: If provided object IS PlayableTrack, assume its preferredQuality is intentional.
            // 2. PlayableTrack (Queue / Search)
            else if (isPlayableTrack(songOrTrack)) {
                // Fix 5: Explicit Preference Flag
                if (songOrTrack.isExplicitPreference) {
                    track = songOrTrack; // Respect manual choice — full object preserved
                } else {
                    // Trust the quality already set on the track (e.g. from ensurePlayableTrack at click time)
                    // Only fall back to global quality if track has no quality set.
                    track = { ...songOrTrack, preferredQuality: songOrTrack.preferredQuality || targetQualityPreference };
                }
            } else {
                // Raw song: Apply global targetQualityPreference
                track = { ...track, preferredQuality: targetQualityPreference };
            }

            const songSource = `${track.title} (${track.id}) [${track.preferredQuality}]`;

            setActiveQuality(track.preferredQuality); // Set optimistic quality badge to prevent UI flicker

            // 3. FETCH URL (Unified via Resolver now)
            try {
                // 4. Fallback to Stream API for non-standard tracks (e.g. video types)
                const isVideo = track.song?.type === 'video';

                if (isVideo) {
                    // Video logic placeholder
                }

                let result: { url: string; quality: AudioQuality; keyName?: string } | null = null;

                if (isSequentialTransition && preloadedDetails?.url) {
                    // Since we already promoted the URL, pass the accurate offline quality
                    result = { url: preloadedDetails.url, quality: preloadedDetails.quality };
                    console.log(`[Gapless] Skipping JIT Resolve. Using preloaded stream (${result.quality}).`);
                } else {
                    console.log(`[Playback] Resolving JIT URL for: ${track.title} (Preferred: ${track.preferredQuality})`);
                    result = await resolvePlayableUrl(track, signal);
                    // Guard: If request ID changed during await, discard result
                    if (signal.aborted || loadRequestId.current !== requestId) return;
                }

                if (result && result.url) {
                    const activeMix = mixesRef.current.find(m => m.id === activeMixIdRef.current);
                    if (activeMix) {
                        const stagedIndex = playingIndexRef.current;
                        let resolvedIndex = -1;

                        for (let i = Math.max(0, stagedIndex); i < activeMix.songs.length; i++) {
                            const item = isPlayableTrack(activeMix.songs[i]) ? activeMix.songs[i] : ensurePlayableTrack(activeMix.songs[i]);
                            if (item.id === track.id) {
                                resolvedIndex = i;
                                break;
                            }
                        }

                        if (resolvedIndex === -1) {
                            for (let i = Math.max(0, stagedIndex - 1); i >= 0; i--) {
                                const item = isPlayableTrack(activeMix.songs[i]) ? activeMix.songs[i] : ensurePlayableTrack(activeMix.songs[i]);
                                if (item.id === track.id) {
                                    resolvedIndex = i;
                                    break;
                                }
                            }
                        }

                        if (resolvedIndex >= 0) {
                            playingIndexRef.current = resolvedIndex;
                            setPlayingIndex(resolvedIndex);
                        } else {
                            playingIndexRef.current = stagedIndex;
                            setPlayingIndex(stagedIndex);
                        }
                    }
                    lastLoadedSongIdRef.current = track.id || track.song?.id || null;

                    console.log(`[Playback] Loaded: ${result.quality} | ${result.url.substring(0, 50)}...`);
                    // Check for silent downgrade (Bug #10)
                    // 'flac' and 'hires' are equivalent lossless tiers — don't hard-warn
                    const QUALITY_RANKS: Record<string, number> = { '128': 1, '160': 2, '320': 3, 'aac': 3, 'lossless': 4, 'flac': 4, 'hires': 5 };
                    const prefRank = QUALITY_RANKS[track.preferredQuality] || 0;
                    const resRank = QUALITY_RANKS[result.quality] || 0;

                    if (resRank < prefRank) {
                        console.warn(`[Playback] Quality Downgrade: Requested ${track.preferredQuality}, got ${result.quality}`);
                        // Only toast if it's a severe downgrade (e.g. hires to 320) or if explicitly requested tracking
                        if (prefRank >= 4 && resRank < 4) {
                            showToast(`Playing at lower quality (${result.quality})`, 'info');
                        } else if (track.preferredQuality === 'hires' && result.quality === 'flac') {
                            showToast('Hi-Res not available — playing Lossless (FLAC)', 'info');
                        }
                    } else if (resRank > prefRank) {
                        console.log(`[Playback] Quality Upgrade: Requested ${track.preferredQuality}, got ${result.quality}`);
                    }
                    if (result.url !== currentSongUrlRef.current) {
                        console.log(`[LoadSong] Setting URL: ${result.url.substring(0, 50)}...`);
                        // Use imperative DOM API for Gapless transition
                        audioPlayerRef.current?.playNext(result.url);

                        setCurrentSongUrl(result.url);
                        setActiveQuality(result.quality);
                        setIsPlaying(true); // Sync Fix: Ensure playback resumes

                        // F27: Cleanup unused blobs on track switch
                        cleanupBlobs([result.url, nextSongDetailsRef.current?.url || null]);

                        if (result.keyName) {
                            currentStreamKeyRef.current = result.keyName;
                            // KeyVault.recordUsage(result.keyName); // Optional stats
                        }

                        // --- AUDIO ANALYSIS (BPM & KEY) ---
                        setCurrentTrackMetadata(null); // Reset while loading

                        // [V2 Fix 3] Cancel any in-flight analysis from previous song
                        if (analysisAbortRef.current) analysisAbortRef.current.abort();

                        const cachedMeta = await MetadataStore.getMetadata(track.id);
                        if (cachedMeta) {
                            console.log(`[AudioAnalysis] Found cached metadata for ${track.title}: BPM ${cachedMeta.bpm}, Key ${cachedMeta.key}`);
                            setCurrentTrackMetadata({ bpm: cachedMeta.bpm, key: cachedMeta.key });
                        } else if (result.url) {
                            // Kick off background analysis (non-blocking, abortable)
                            const ac = new AbortController();
                            analysisAbortRef.current = ac;
                            analyzeAudioOffline(result.url, ac.signal).then(analysis => {
                                if (analysis && !ac.signal.aborted) {
                                    console.log(`[AudioAnalysis] Completed for ${track.title}: BPM ${analysis.bpm}, Key ${analysis.key}`);
                                    MetadataStore.saveMetadata(track.id, analysis);
                                    // Only update state if this is still the active track
                                    if (currentSongUrlRef.current === result.url) {
                                        setCurrentTrackMetadata(analysis);
                                    }
                                }
                            }).catch(() => { }); // Silently catch abort errors
                        }

                    }
                } else {
                    throw new Error("All qualities failed");
                }
            } catch (error: any) {
                if (abortControllerRef.current?.signal.aborted || loadRequestId.current !== requestId || error?.name === 'AbortError') return;

                console.warn(`[Playback] Load Failed for ${songSource}:`, error);
                setPlaybackState('error');

                // Don't call handlePlaybackError here - it creates circular dependency.
                // Instead, set an empty URL which will trigger audio element error,
                // which in turn calls handlePlaybackError.
                audioPlayerRef.current?.playNext('');
                setCurrentSongUrl(''); // Empty string triggers error in AudioPlayer
            }
        } finally {
            loadMutexRef.current = false;
        }

    }, [qualityPreference, resolvePlayableUrl, showToast]);


    const setQualityPreferenceHandler = useCallback((newQualityPreference: AudioQuality) => {
        setQualityPreference(newQualityPreference);

        // [FIX Bug 16] Reload using currentTrack to preserve source metadata
        if (currentTrack) {
            loadSongUrl(currentTrack, newQualityPreference);
        }
    }, [currentTrack, loadSongUrl, setQualityPreference]);

    const forceCurrentSongQuality = useCallback((q: AudioQuality) => {
        if (currentTrack) {
            loadSongUrl(currentTrack, q);
        }
    }, [currentTrack, loadSongUrl]);

    // Effect to load URL when song changes
    // MOVED: To line 1390+ to respect currentTrack scope


    // Sleep Timer Countdown
    useEffect(() => {
        if (!sleepTimer) return;

        const interval = setInterval(() => {
            const remaining = sleepTimer.endTime - Date.now();

            if (remaining <= 0) {
                pause();
                setSleepTimer(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sleepTimer, pause]);



    const next = useCallback(() => {
        const currentRepeat = repeatRef.current;
        // forceLossless removed - quality is now controlled by qualityPreference setting only

        // Use Refs for latest state to prevent closure staleness on rapid clicks
        const currentActiveMixId = activeMixIdRef.current;
        const currentMixes = mixesRef.current;

        loadMutexRef.current = false; // Force unlock mutex on explicit skip

        if (!currentActiveMixId) {
            console.warn("[NEXT] No activeMixId (Ref)");
            return;
        }

        const activeMix = currentMixes.find(m => m.id === currentActiveMixId);
        if (!activeMix) {
            console.warn("[NEXT] Active mix not found in Ref state");
            return;
        }

        console.log("[NEXT] Called", {
            mix: activeMix.title,
            idx: playingIndexRef.current,
            len: activeMix.songs.length
        });

        // End of Song Check
        if (stopAtEndOfSong) {
            pause();
            setStopAtEndOfSong(false); // Reset flag
            return;
        }

        // 1. Repeat One Logic
        if (currentRepeat === 'one') {
            audioPlayerRef.current?.seekTo(0);
            audioPlayerRef.current?.play(); // Force play restart
            return;
        }

        const len = activeMix.songs.length;
        if (len === 0) return;

        let nextIndex = playingIndexRef.current;

        // 2. Shuffle Logic
        if (shuffle) {
            if (currentRepeat === 'off' && len <= 1) {
                console.log("Shuffle + Repeat Off with single-track queue. Stopping.");
                setIsPlaying(false);
                setPlaybackState('idle');
                return;
            }

            // Pick random index different from current
            let randomIndex = Math.floor(Math.random() * len);
            // Prevent replaying same index when repeat is off
            if (currentRepeat === 'off' && len > 1) {
                while (randomIndex === nextIndex) {
                    randomIndex = Math.floor(Math.random() * len);
                }
            } else if (randomIndex === nextIndex && len > 1) {
                randomIndex = (randomIndex + 1) % len;
            }
            nextIndex = randomIndex;
        } else {
            // 3. Normal Logic
            nextIndex = nextIndex + 1;

            // --- RADIO INFINITE QUEUE CHECK ---
            const isRadio = activeMix.id.startsWith('radio-');
            if (isRadio && nextIndex >= len - 2 && !generationLocks.current.get(activeMix.id)) {
                console.log(`[Radio] Nearing end of station ${activeMix.id}, appending via DiscoveryEngine...`);
                generationLocks.current.set(activeMix.id, true);

                // [Phase 3: Radio Unification] Route to Discovery Engine
                DiscoveryEngine.generateSessionMix(
                    ensurePlayableTrack(activeMix.songs[activeMix.songs.length - 1], qualityPreference as AudioQuality), // seed 
                    undefined, // region
                    activeMix.songs.map(s => s.id) // queue IDs to prevent dupes
                ).then(newMix => {
                    const newSongs = newMix.songs;
                    if (newSongs && newSongs.length > 0) {
                        // [DESYNC FIX] Sync read from latest mixes ref instead of functional updater
                        // so we can update refs before triggering state
                        const latestMix = mixesRef.current.find(m => m.id === activeMix.id);
                        if (latestMix) {
                            const existingKeys = new Set(
                                latestMix.songs.map((s: any) => {
                                    const track = isPlayableTrack(s) ? s : ensurePlayableTrack(s);
                                    return normalizeIdentity(track.title || track.song?.name || '', track.artist || track.song?.primaryArtists || '');
                                })
                            );
                            const uniqueNew = newSongs.filter(s => {
                                const track = isPlayableTrack(s) ? s : ensurePlayableTrack(s);
                                const key = normalizeIdentity(track.title || track.song?.name || '', track.artist || track.song?.primaryArtists || '');
                                if (existingKeys.has(key)) return false;
                                existingKeys.add(key);
                                return true;
                            });

                            const appended = [...latestMix.songs, ...uniqueNew];
                            const { songs: trimmedSongs, adjustedIndex } = trimQueue(appended, playingIndexRef.current, 30);

                            // [DESYNC FIX V3] ALWAYS refresh lastLoadedSongIdRef BEFORE updateMix
                            const currentItem = trimmedSongs[adjustedIndex];
                            if (currentItem) {
                                const currentItemId = isPlayableTrack(currentItem) ? currentItem.id : (currentItem as any).id;
                                lastLoadedSongIdRef.current = currentItemId;
                            }

                            if (adjustedIndex !== playingIndexRef.current) {
                                playingIndexRef.current = adjustedIndex;
                                setPlayingIndex(adjustedIndex);
                            }

                            updateMix(latestMix.id, { songs: trimmedSongs, currentSongIndex: adjustedIndex });
                        }
                    }
                }).catch(e => console.error("Radio extend failed", e))
                    .finally(() => { generationLocks.current.delete(activeMix.id); });
            }

            // 4. Repeat All / Off Logic
            if (nextIndex >= len) {
                // If autoplay is currently generating for this mix, don't advance — wait for it to append
                if (generationLocks.current.get(activeMix.id)) {
                    console.log("[NEXT] End of playlist but autoplay is generating — waiting...");
                    return; // Don't stop, don't loop — autoplay will append songs
                }

                if (currentRepeat === 'off') {
                    // Stop playback at end — do NOT reset index (prevents loop-back)
                    console.log("End of playlist (Repeat Off). Stopping.");
                    setIsPlaying(false);
                    setPlaybackState('idle');
                    return;
                } else {
                    // Repeat All -> Loop
                    nextIndex = 0;
                }
            }
        }

        const nextItem = activeMix.songs[nextIndex];
        const nextTitle = isPlayableTrack(nextItem) ? nextItem.title : nextItem.name;

        console.log("[Next] Advancing to:", nextTitle);

        if (!nextSongDetailsRef.current) {
            console.warn("[Gapless] Preload missing — forcing immediate resolve without nulling audio");
        }

        // [DESYNC FIX V5] Abort in-flight loads and clear guard so LoadSong fires
        if (abortControllerRef.current) abortControllerRef.current.abort();
        if (analysisAbortRef.current) analysisAbortRef.current.abort(); // [PERF] Cancel background analysis
        ++loadRequestId.current;
        lastLoadedSongIdRef.current = null; // Allow LoadSong to fire for the new song

        // Tag the next load as sequential (for gapless promotion)
        isNextSequentialRef.current = true;
        playingIndexRef.current = nextIndex; // Sync ref IMMEDIATELY — prevents stale reads on rapid next()
        setLoadTrigger(c => c + 1); // [V5] Explicit trigger — only this bumps LoadSong effect

        // [SignalStore] Record Skip/Next Action
        if (currentTrack) {
            const durationPlayed = audioPlayerRef.current?.getCurrentTime() || 0;
            // Pass duration to let store decide if it's Early/Late skip
            SignalStore.addSignal(currentTrack, 'SKIP', 'discovery', durationPlayed);
        }

        // Use timeout to allow state to settle? Not strictly needed if `updateMix` triggers effect.
        if (!isPlaying) setIsPlaying(true);
    }, [shuffle, isPlaying, updateMix, stopAtEndOfSong, pause, currentTrack]);

    const prev = useCallback(() => {
        // Use Refs for latest state
        const currentActiveMixId = activeMixIdRef.current;
        const currentMixes = mixesRef.current;

        loadMutexRef.current = false; // Force unlock mutex on explicit skip

        if (!currentActiveMixId) return;
        const activeMix = currentMixes.find(m => m.id === currentActiveMixId);
        if (!activeMix) return;

        // If played > 3s, restart song
        if (audioPlayerRef.current && (audioPlayerRef.current.getCurrentTime() || 0) > 3) {
            audioPlayerRef.current.seekTo(0);
            return;
        }

        // [DESYNC FIX V5] Abort in-flight loads and clear guard
        if (abortControllerRef.current) abortControllerRef.current.abort();
        if (analysisAbortRef.current) analysisAbortRef.current.abort(); // [PERF] Cancel background analysis
        ++loadRequestId.current;
        lastLoadedSongIdRef.current = null; // Allow LoadSong to fire for the new song

        // Shuffle Previous
        let prevIndex = playingIndexRef.current;
        const len = activeMix.songs.length;

        if (len === 0) return;

        if (shuffle) {
            let randomIndex = Math.floor(Math.random() * len);
            if (randomIndex === prevIndex) randomIndex = (randomIndex - 1 + len) % len;
            prevIndex = randomIndex;
        } else {
            prevIndex = prevIndex - 1;
            if (prevIndex < 0) prevIndex = len - 1;
        }

        playingIndexRef.current = prevIndex; // Sync ref IMMEDIATELY
        setLoadTrigger(c => c + 1); // [V5] Explicit trigger
        setIsPlaying(true);
    }, [shuffle, updateMix]);

    // Play specific index in queue
    const playIndex = useCallback((index: number) => {
        if (!activeMix || index < 0 || index >= activeMix.songs.length) return;

        // [DESYNC FIX V5] Abort in-flight loads and clear guard
        if (abortControllerRef.current) abortControllerRef.current.abort();
        loadMutexRef.current = false; // Force unlock mutex on explicit play
        ++loadRequestId.current;
        lastLoadedSongIdRef.current = null; // Allow LoadSong to fire

        playingIndexRef.current = index; // Sync ref IMMEDIATELY
        setLoadTrigger(c => c + 1); // [V5] Explicit trigger
        setIsPlaying(true);
    }, [activeMix]);

    // Lazarus Loop: Simplified (3 Strikes Rule)
    const retryCount = useRef(0);
    const handlePlaybackError = useCallback((msg: string) => {
        // Guard: If no song is loaded or URL is explicitly empty, ignore errors.
        if (!currentSong) return;

        // CRITICAL FIX: Ignore "Empty src" errors. These happen during transition or when resolver hasn't finished.
        // Also ignore "The element has no supported sources" if we are still resolving.
        if (msg.includes("Empty src") || msg.includes("no supported sources")) {
            // console.warn("[Lazarus] Ignoring transient empty src error.");
            return;
        }

        console.warn(`[Lazarus] Playback Error for ${currentSong?.name}: ${msg}`);

        // "3 Strikes" Rule
        if (retryCount.current < 3) {
            retryCount.current++;
            console.log(`[Lazarus] Auto-Retry (${retryCount.current}/3)...`);

            // Only show toast on first retry
            if (retryCount.current === 1) showToast("Refreshing Stream...", 'info');

            // Quick retry - simple reload
            setTimeout(() => {
                // Fix: Erase encryptedMediaUrl on retry to force JIT repair lookup
                const failedSong = { ...currentSong, encryptedMediaUrl: '' };
                loadSongUrl(failedSong, undefined);
                setPlaybackState('loading');
            }, 1000);

        } else {
            // STOP. Don't loop forever.
            console.error("[Lazarus] 3 Strikes. Moving to next song.");
            setIsPlaying(false);
            setPlaybackState('error');
            retryCount.current = 0; // Reset for next song

            if (!navigator.onLine) {
                showToast("You are offline. Playback paused.", 'error');
                return; // PAUSE playback, do not burn through the queue
            }

            showToast("Song unavailable. Skipping...", 'error');

            // Wait a moment then skip
            setTimeout(() => {
                next();
            }, 1500);
        }
    }, [currentSong, loadSongUrl, next, showToast]);

    // Reset retry count on song change
    useEffect(() => {
        retryCount.current = 0;

        // Add to History (with 5s delay to filter skips)
        if (currentSong && isPlaying) {
            const timer = setTimeout(() => {
                // Fix: Save the full PlayableTrack (rawCurrentItem) to persist FLAC preference
                const trackToSave = rawCurrentItem ? ensurePlayableTrack(rawCurrentItem) : ensurePlayableTrack(currentSong);
                HistoryStore.addToHistory(trackToSave);
                addToRecentlyPlayed(trackToSave); // [FIX Bug 18] Pass PlayableTrack

                // Signal: Verified Play (>10s)
                // Pass arbitrary >10 duration to satisfy signature, though verified play implies positive weight anyway
                SignalStore.addSignal(trackToSave, 'PLAY', 'discovery', 30);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [currentSong?.id, isPlaying, rawCurrentItem]);

    const seek = useCallback((amount: number) => {
        // amount is 0-1 fraction from progress bars, or seconds from iPod scrub
        // Detect: if amount > 1, treat as seconds; otherwise treat as fraction
        if (amount > 1) {
            audioPlayerRef.current?.seekTo(amount, 'seconds');
        } else {
            audioPlayerRef.current?.seekTo(amount); // Default: fraction
        }
    }, []);

    // --- OS Media Session API Integration ---
    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        if (currentSong) {
            const song = currentSong as any;
            const getArt = () => {
                if (song.image) {
                    if (Array.isArray(song.image)) {
                        const highestRes = song.image[song.image.length - 1] as any;
                        return highestRes?.link || highestRes?.url || (typeof highestRes === 'string' ? highestRes : "");
                    }
                    if (typeof song.image === 'string') {
                        return song.image;
                    }
                }
                return "";
            };

            const artUrl = getArt();
            const albumName = typeof song.album === 'object'
                ? (song.album?.name || "Melora Tunes")
                : (song.album || "Melora Tunes");

            navigator.mediaSession.metadata = new MediaMetadata({
                title: decodeHtml(song.name || song.title || "Unknown Title"),
                artist: decodeHtml(song.primaryArtists || song.artist || "Unknown Artist"),
                album: decodeHtml(albumName),
                artwork: artUrl ? [
                    { src: artUrl, sizes: '500x500', type: 'image/jpeg' }
                ] : []
            });
        } else {
            navigator.mediaSession.metadata = null;
        }
    }, [currentSong]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }, [isPlaying]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.setActionHandler('play', () => {
                play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                pause();
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                prev();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                next();
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined) {
                    seek(details.seekTime);
                }
            });
        } catch (error) {
            console.warn("Failed to set MediaSession action handlers:", error);
        }

        return () => {
            if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
            try {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('seekto', null);
            } catch (e) {}
        };
    }, [play, pause, next, prev, seek]);

    const getAnalyser = useCallback(() => {
        return audioPlayerRef.current?.getAnalyser() || null;
    }, []);

    // We also need to ensure currentSong matches what's actually playing if we are in a mix
    // The state `currentSong` is set by effects, but let's trust it.

    // Ensure currentSong derived from mix is unwrapped if needed?
    // Actually currentSong is state. We need to make sure wherever setCurrentSong is called, we unwrap.
    // Check `loadMix`, `next`, `prev` etc.
    // We already fixed `next` logic earlier.


    // [FIX Bug 5] Reset load request ID when switching mixes to prevent old mix's pending load from overwriting new mix state
    useEffect(() => {
        loadMutexRef.current = false; // Force unlock on mix change
        loadRequestId.current++;
        nextPreloadRequestId.current++; // [FIX Bug 15] Also reset preload guard
    }, [activeMixId]);

    // Fix nextSongUrl logic to be async-safe
    useEffect(() => {
        // Optimization: Only preload if current song is actually loaded/playing.
        // This prevents race conditions where we preload while still struggling to resolve current song.
        if (!currentSongUrl) {
            setNextSongDetails(null);
            return;
        }

        const activeMixForNext = mixes.find(m => m.id === activeMixId);
        if (!activeMixForNext) {
            setNextSongDetails(null);
            return;
        }

        // Use playingIndexRef to guarantee we calculate next relative to what is ACTUALLY playing
        const currentIndex = playingIndexRef.current;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= activeMixForNext.songs.length) {
            setNextSongDetails(null);
            nextSongDetailsRef.current = null;
            return;
        }

        const nextItem = activeMixForNext.songs[nextIndex];
        if (!nextItem) {
            setNextSongDetails(null);
            return;
        }

        // [PERF FIX] Skip preload if the next song hasn't actually changed
        const nextItemId = isPlayableTrack(nextItem) ? nextItem.id : (nextItem as any).id;
        if (nextSongDetailsRef.current && lastPreloadedIdRef.current === nextItemId) {
            return; // Already preloaded this exact song
        }

        let cancelled = false;
        const requestId = ++nextPreloadRequestId.current; // [FIX Bug 15]

        const abortControllerParams = new AbortController();
        const signal = abortControllerParams.signal;

        const loadNext = async () => {
            try {
                // [GAPLESS FIX] Enforce maximum 320kbps for background preloads
                // This prevents the engine from aggressively downloading 40MB+ FLAC files in the background,
                // saving massive bandwidth and protecting the user/app from JioSaavn/Tidal API bans.
                const userPref = currentTrack?.preferredQuality || (qualityPreference as AudioQuality);
                const targetQ = (userPref === 'hires' || userPref === 'flac') ? '320' : userPref;
                const track = ensurePlayableTrack(nextItem, targetQ);

                // Use Resolver
                const result = await resolvePlayableUrl(track, signal);

                // [FIX Bug 15] Preload Guard — also check nextPreloadRequestId to protect against async races
                if (cancelled || signal.aborted || requestId !== nextPreloadRequestId.current) {
                    console.log(`[Gapless] Preload aborted for ${track.title} (stale request)`);
                    return;
                }

                if (result?.url && result?.quality) {
                    setNextSongDetails({ url: result.url, quality: result.quality });
                    lastPreloadedIdRef.current = nextItemId; // [PERF] Remember what we preloaded
                    // Pass it imperatively down to AudioPlayer's internal queue
                    audioPlayerRef.current?.prebuffer(result.url);
                }
            } catch (e: any) {
                if (e.name !== 'AbortError') console.warn("Failed to preload next song", e);
            }
        };

        loadNext();

        return () => {
            cancelled = true;
            abortControllerParams.abort();
        };
    }, [activeMixId, mixes, qualityPreference, resolvePlayableUrl, currentSong?.id, currentSongUrl, currentTrack]); // Added currentTrack dep





    // [FIX] Keep a ref to currentTrack for other consumers
    const currentTrackRef = useRef(currentTrack);
    currentTrackRef.current = currentTrack;

    // [DESYNC FIX V2] Store loadSongUrl and qualityPreference in refs so the LoadSong
    // effect only re-fires when currentSongId changes — NOT when quality/function identity changes.
    // This prevents the cascading phantom loads caused by quality switches.
    const loadSongUrlRef = useRef(loadSongUrl);
    loadSongUrlRef.current = loadSongUrl;
    const qualityPrefRef = useRef(qualityPreference);
    qualityPrefRef.current = qualityPreference;

    // [DESYNC FIX V5] LoadSong effect — triggered ONLY by explicit loadTrigger counter.
    // This replaces the old currentSongId dependency which was race-prone:
    // autoplay's updateMix() changed mixes → currentSong → currentSongId → phantom fires.
    // Now, only next()/prev()/playIndex()/loadMix() bump the trigger.
    const currentSongId = currentSong?.id; // Keep for preload effect dependency
    const loadSongEffectRequestId = useRef(0);
    useEffect(() => {
        if (loadTrigger === 0) return; // Skip initial mount (loadMix handles first load)

        // Increment request counter — any previous in-flight loads are now stale
        const thisRequestId = ++loadSongEffectRequestId.current;

        // Resolve the ACTUAL current track from refs (always current, not stale state)
        const currentMixes = mixesRef.current;
        const mix = currentMixes.find(m => m.id === activeMixIdRef.current);
        if (!mix) return;

        const idx = playingIndexRef.current;
        const item = mix.songs[idx];
        if (!item) return;

        const qPref = qualityPrefRef.current as AudioQuality;
        const track = isPlayableTrack(item) ? item : ensurePlayableTrack(item, qPref);
        const trackId = track.id || track.song?.id || null;

        // Guard: skip if exactly the same song is already loaded
        if (lastLoadedSongIdRef.current === trackId) {
            return;
        }

        // Defer by 1 frame to let React batch settle (handles rapid next/prev clicks)
        const timerId = setTimeout(() => {
            // Check if this effect is still the authoritative one
            if (loadSongEffectRequestId.current !== thisRequestId) {
                console.log(`[LoadSong Effect] Stale request (${thisRequestId} vs ${loadSongEffectRequestId.current}), skipping`);
                return;
            }

            // Re-resolve from refs AGAIN after the frame delay (state may have settled)
            const latestMixes = mixesRef.current;
            const latestMix = latestMixes.find(m => m.id === activeMixIdRef.current);
            if (!latestMix) return;
            const latestIdx = playingIndexRef.current;
            const latestItem = latestMix.songs[latestIdx];
            if (!latestItem) return;
            const latestQPref = qualityPrefRef.current as AudioQuality;
            const latestTrack = isPlayableTrack(latestItem) ? latestItem : ensurePlayableTrack(latestItem, latestQPref);
            const latestTrackId = latestTrack.id || latestTrack.song?.id || null;

            // Final guard check after settling
            if (lastLoadedSongIdRef.current === latestTrackId) {
                return;
            }

            toastOnceRef.current = false; // Reset toast guard on new song

            // Check if this transition was initiated by next()
            const isSequential = isNextSequentialRef.current;
            isNextSequentialRef.current = false; // consume flag

            console.log(`[LoadSong Effect] Loading: ${latestTrack.title || latestTrack.song?.name} (idx: ${latestIdx}, guard: ${latestTrackId})`);
            // Use ref to call loadSongUrl — prevents stale closure
            loadSongUrlRef.current(latestTrack, undefined, isSequential);

            // SponsorBlock: Fetch segments if it looks like a YouTube ID
            const ytId = latestTrack.song?.id;
            setSkipSegments([]);
            if (ytId && ytId.length === 11 && !ytId.includes('-') && !ytId.includes(' ')) {
                getSkipSegments(ytId).then(segs => {
                    if (segs.length > 0) console.log(`Loaded ${segs.length} skip segments`);
                    setSkipSegments(segs);
                });
            } else if (latestTrack.song?.type === 'video') {
                getSkipSegments(ytId || latestTrack.id).then(setSkipSegments);
            }
        }, 0);

        return () => clearTimeout(timerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadTrigger]); // [V5] ONLY fire on explicit trigger — NOT on currentSongId changes


    // Normalize queue for UI
    const normalizedQueue = useMemo(() => {
        return (activeMix?.songs || []).map(s =>
            isPlayableTrack(s) ? s.song : s
        );
    }, [activeMix]);

    const currentIndex = activeMix?.currentSongIndex || 0;

    // We also need to ensure currentSong matches what's actually playing if we are in a mix

    // FIX 3: Use constant ID to prevent memory leak from infinite mixes
    const QUEUE_MIX_ID = 'queue-mix';
    const setQueue = useCallback((newQueue: (JioSaavnSong | PlayableTrack)[]) => {
        if (!newQueue || newQueue.length === 0) {
            setIsPlaying(false);
            setPlaybackState('idle');
            setActiveMixId(null);
            setCurrentSongUrl(null);
            audioPlayerRef.current?.pause();
            return;
        }

        const mix: Mix = {
            id: QUEUE_MIX_ID,
            title: 'Queue',
            color: 'blue',
            songs: newQueue.map(s => ensurePlayableTrack(s)),
            currentSongIndex: 0
        };

        playInstantMix(mix);
    }, [playInstantMix]);

    // [PERF FIX #1] Memoize the queue derivation to stabilize reference
    const filteredQueue = useMemo(() => normalizedQueue.filter((s): s is JioSaavnSong => !!s), [normalizedQueue]);
    const activeMixCurrentIndex = activeMix?.currentSongIndex || 0;

    const addToQueue = useCallback((song: JioSaavnSong | PlayableTrack) => {
        if (!activeMixId) return;
        addSongToMix(activeMixId, song);
        showToast("Added to queue", "success");
    }, [activeMixId, addSongToMix, showToast]);

    const startRadio = useCallback(async (songOrQuery: any) => {
        const query = typeof songOrQuery === 'string' ? songOrQuery : (songOrQuery.primaryArtists || songOrQuery.artist || songOrQuery.name);
        if (!query) return;

        showToast(`Starting Radio for ${decodeHtml(query)}...`, 'info');
        try {
            // [Phase 3] Use DiscoveryEngine properly
            const seedTrack = isPlayableTrack(songOrQuery) ? songOrQuery : ensurePlayableTrack(songOrQuery, qualityPreference as AudioQuality);
            const mix = await DiscoveryEngine.generateSessionMix(seedTrack);

            // Adjust metadata to match radio mode flags
            mix.id = `radio-${Date.now()}`;
            mix.title = `${decodeHtml(query)} Radio`;

            playInstantMix(mix);
        } catch {
            showToast("Failed to start radio", "error");
        }
    }, [playInstantMix, qualityPreference, showToast]);

    // [PERF FIX #1] Memoize context value to prevent ALL consumers re-rendering on every state change.
    // Without this, every progress tick (~4/s) creates a new object and re-renders the entire app.
    const playbackValue = useMemo(() => ({
        activeMixId, isPlaying, currentSong, currentTrack, currentTrackMetadata, volume, duration, shuffle, repeat,
        setQueue, loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,
        isLoaded, activeMix,
        queue: filteredQueue, currentIndex: activeMixCurrentIndex, playIndex,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration,
        qualityPreference, setQualityPreference: setQualityPreferenceHandler,
        togglePin, activeQuality,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed,
        eq, playInstantMix, addToQueue, startRadio,
        playbackState, getAnalyser, downloadSong, downloadSongs, downloadQueue, forceCurrentSongQuality
    }), [
        activeMixId, isPlaying, currentSong, currentTrack, currentTrackMetadata, volume, duration, shuffle, repeat,
        setQueue, loadMix, play, pause, togglePlay, next, prev, seek,
        setVolume, setShuffle, setRepeat,
        isLoaded, activeMix,
        filteredQueue, activeMixCurrentIndex, playIndex,
        sleepTimer, setSleepTimer, crossfadeDuration, setCrossfadeDuration,
        qualityPreference, setQualityPreferenceHandler,
        togglePin, activeQuality,
        stopAtEndOfSong, setStopAtEndOfSong,
        notificationsEnabled, setNotificationsEnabled,
        playbackSpeed, setPlaybackSpeed,
        eq, playInstantMix, addToQueue, startRadio,
        playbackState, getAnalyser, downloadSong, downloadSongs, downloadQueue, forceCurrentSongQuality
    ]);
    return (
        <PlaybackContext.Provider value={playbackValue}>
            {children}

            {/* Global Audio Element */}
            <AudioPlayer
                ref={audioPlayerRef}
                playing={isPlaying}
                volume={volume}
                speed={playbackSpeed}
                crossfadeDuration={crossfadeDuration}
                eqBands={eq.isEnabled ? eq.bands : undefined} // Only pass bands if enabled
                onEnded={() => {
                    // [SignalStore] Full Listen
                    if (currentTrack) {
                        SignalStore.addSignal(currentTrack, 'PLAY', 'discovery', duration);
                        if (currentTrack.song) {
                            recordPlay(currentTrack.song, duration);
                        }
                    }
                    next();
                }}
                onPlaying={() => setPlaybackState('playing')}
                onWaiting={() => setPlaybackState('buffering')}
                onStalled={() => setPlaybackState('stalled')}
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
                onError={(msg: string) => handlePlaybackError(msg)}
            />
            {/* Minimal Toast UI moved to ui-context */}

            {/* Global Download Quality Picker */}
            <DownloadQualityPicker
                isOpen={downloadModalOpen}
                song={songToDownload}
                songs={songsToDownload}
                onClose={() => setDownloadModalOpen(false)}
                onDownload={(s, q) => {
                    executeDownload(s, q).then(success => {
                        if (success) showToast("Download complete", "success");
                        else showToast("Download failed", "error");
                    });
                }}
                onDownloadBatch={(songs, q) => handleDownloadBatch(songs, q)}
                defaultQualityPreference={qualityPreference as AudioQuality}
            />
        </PlaybackContext.Provider>
    );
}

export function usePlayback() {
    const context = useContext(PlaybackContext);
    if (context === undefined) throw new Error("usePlayback must be used within a PlaybackProvider");
    return context;
}
